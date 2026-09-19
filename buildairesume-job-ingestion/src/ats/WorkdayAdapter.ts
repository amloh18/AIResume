import {
  BaseATSAdapter,
  ATSField,
  ATSDetectionResult,
  FillResult,
  SubmissionResult,
} from './BaseATSAdapter';
import { logger } from '../utils/logger';

type Page = any;

/**
 * Workday ATS Adapter
 * Handles application forms on Workday job boards (myworkdayjobs.com)
 *
 * Workday forms are multi-step with:
 * - Standard fields (name, email, phone, address)
 * - Resume upload
 * - Custom questions (text, select, radio, checkbox)
 * - Workday uses Shadow DOM in some components
 */
export class WorkdayAdapter extends BaseATSAdapter {
  readonly atsType = 'workday';
  readonly displayName = 'Workday ATS';

  private readonly selectors = {
    form: 'form, [data-automation-id="applicationForm"], .application-form',
    submitButton: 'button[data-automation-id="bottom-navigation-next-button"], button[data-automation-id="submit"], button[type="submit"]',

    firstName: 'input[data-automation-id="legalNameSection_firstName"], input[name="firstName"], input[placeholder*="First" i]',
    lastName: 'input[data-automation-id="legalNameSection_lastName"], input[name="lastName"], input[placeholder*="Last" i]',
    email: 'input[data-automation-id="email"], input[name="email"], input[type="email"]',
    phone: 'input[data-automation-id="phone-number"], input[name="phone"], input[type="tel"]',
    resume: 'input[data-automation-id="file-upload-input-ref"], input[type="file"][accept*="pdf"]',
    coverLetter: 'input[data-automation-id="cover-letter-upload"], input[type="file"][accept*="cover"]',

    linkedin: 'input[data-automation-id="linkedInUrl"], input[placeholder*="LinkedIn" i]',
    location: 'input[data-automation-id="addressSection_city"], input[placeholder*="city" i]',

    customText: 'input[type="text"], textarea',
    customSelect: 'select',
    customRadio: 'input[type="radio"]',
    customCheckbox: 'input[type="checkbox"]',

    captcha: 'iframe[src*="captcha"], .g-recaptcha, [class*="captcha"], iframe[src*="turnstile"]',
    successMessage: '[data-automation-id="success-message"], .success-message, [class*="success"], [class*="thank"]',
  };

  detectATS(url: string): ATSDetectionResult {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('myworkdayjobs.com') || urlLower.includes('workday.com')) {
      return { detected: true, atsType: 'workday', confidence: 1.0, applyUrl: url };
    }

    if (urlLower.includes('/wday/')) {
      return { detected: true, atsType: 'workday', confidence: 0.95, applyUrl: url };
    }

    return { detected: false, atsType: 'unknown', confidence: 0 };
  }

  async detectFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      await this.waitForPage(page, 20000);

      if (await this.detectCAPTCHA(page)) {
        logger.warn('[Workday] CAPTCHA detected - stopping field detection');
        return fields;
      }

      fields.push(...await this.detectStandardFields(page));
      fields.push(...await this.detectCustomFields(page));
      fields.push(...await this.detectFileFields(page));

      logger.info(`[Workday] Detected ${fields.length} fields`);
    } catch (error) {
      logger.error('[Workday] Error detecting fields:', error);
    }

    return fields;
  }

  private async detectStandardFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    const standardMap: Array<{ label: string; selector: string; type: ATSField['type']; required: boolean }> = [
      { label: 'First Name', selector: this.selectors.firstName, type: 'text', required: true },
      { label: 'Last Name', selector: this.selectors.lastName, type: 'text', required: true },
      { label: 'Email', selector: this.selectors.email, type: 'email', required: true },
      { label: 'Phone', selector: this.selectors.phone, type: 'tel', required: false },
      { label: 'LinkedIn', selector: this.selectors.linkedin, type: 'url', required: false },
      { label: 'Location', selector: this.selectors.location, type: 'text', required: false },
    ];

    for (const field of standardMap) {
      if (await this.elementExists(page, field.selector)) {
        fields.push({ ...field });
      }
    }

    return fields;
  }

  private async detectCustomFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      const textInputs = await page.$$eval(
        'input[type="text"], textarea',
        (elements: any[]) =>
          elements.map((el: any) => {
            const label =
              el.getAttribute('aria-label') ||
              el.getAttribute('placeholder') ||
              el.getAttribute('data-automation-id') ||
              el.closest('label')?.textContent?.trim() ||
              '';
            const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
            const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : el.getAttribute('data-automation-id') ? `[data-automation-id="${el.getAttribute('data-automation-id')}"]` : null;
            return { label, required, selector, tagName: el.tagName.toLowerCase(), type: el.getAttribute('type') || 'text' };
          })
      );

      const standardNames = ['firstName', 'lastName', 'email', 'phone', 'linkedInUrl', 'addressSection_city', 'file-upload-input-ref', 'cover-letter-upload'];

      for (const input of textInputs) {
        if (!input.selector || !input.label) continue;
        if (standardNames.some((n) => input.selector.includes(n))) continue;
        fields.push({
          label: input.label,
          type: input.tagName === 'textarea' ? 'textarea' : 'text',
          required: input.required,
          selector: input.selector,
        });
      }

      const selectElements = await page.$$eval('select', (elements: any[]) =>
        elements.map((el: any) => {
          const label = el.getAttribute('aria-label') || el.getAttribute('data-automation-id') || el.closest('label')?.textContent?.trim() || '';
          const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
          const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : null;
          const options = Array.from(el.options).map((opt: any) => opt.text);
          return { label, required, selector, options };
        })
      );

      for (const select of selectElements) {
        if (select.selector && select.label) {
          fields.push({ label: select.label, type: 'select', required: select.required, selector: select.selector, options: select.options });
        }
      }
    } catch (error) {
      logger.warn('[Workday] Error detecting custom fields:', { error: String(error) });
    }

    return fields;
  }

  private async detectFileFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      const fileInputs = await page.$$eval('input[type="file"]', (elements: any[]) =>
        elements.map((el: any) => {
          const label = el.getAttribute('aria-label') || el.getAttribute('data-automation-id') || el.closest('label')?.textContent?.trim() || el.accept || 'File';
          const required = el.hasAttribute('required');
          const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : el.getAttribute('data-automation-id') ? `[data-automation-id="${el.getAttribute('data-automation-id')}"]` : null;
          const accept = el.accept || '';
          return { label, required, selector, accept };
        })
      );

      for (const input of fileInputs) {
        if (input.selector) {
          const isResume = input.label.toLowerCase().includes('resume') || input.label.toLowerCase().includes('cv') || input.accept.includes('pdf');
          const isCoverLetter = input.label.toLowerCase().includes('cover');
          fields.push({
            label: isResume ? 'Resume' : isCoverLetter ? 'Cover Letter' : input.label,
            type: 'file',
            required: input.required,
            selector: input.selector,
          });
        }
      }
    } catch (error) {
      logger.warn('[Workday] Error detecting file fields:', { error: String(error) });
    }

    return fields;
  }

  async fillField(page: Page, field: ATSField, value: string): Promise<boolean> {
    try {
      await this.scrollToElement(page, field.selector);

      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'url':
        case 'number':
        case 'date':
        case 'textarea':
          return await this.safeFill(page, field.selector, value);
        case 'select':
          return await this.safeSelect(page, field.selector, value);
        case 'checkbox':
          if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes') {
            return await this.safeClick(page, field.selector);
          }
          return true;
        case 'radio': {
          const radioSelector = `${field.selector}[value="${value}"]`;
          return await this.safeClick(page, radioSelector);
        }
        default:
          logger.warn(`[Workday] Unsupported field type: ${field.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`[Workday] Error filling field ${field.label}:`, error);
      return false;
    }
  }

  async uploadFile(page: Page, field: ATSField, filePath: string): Promise<boolean> {
    try {
      await this.scrollToElement(page, field.selector);
      const inputElement = await page.$(field.selector);
      if (inputElement) {
        await inputElement.setInputFiles(filePath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[Workday] Error uploading file to ${field.label}:`, error);
      return false;
    }
  }

  async submitForm(page: Page): Promise<SubmissionResult> {
    try {
      const beforeScreenshot = await this.takeScreenshot(page, 'before_submit');

      const submitButton = await page.$(this.selectors.submitButton);
      if (!submitButton) {
        return { success: false, submitted: false, error: 'Submit button not found', screenshotUrl: beforeScreenshot };
      }

      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        return { success: false, submitted: false, error: 'Submit button is disabled', screenshotUrl: beforeScreenshot };
      }

      await submitButton.click();

      // Workday may have multi-step forms - wait for navigation
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

      // Check for success on current or next page
      const hasSuccess = await this.elementExists(page, this.selectors.successMessage);

      // Also check for confirmation page URL change
      const currentUrl = page.url();
      const isConfirmationPage = currentUrl.includes('confirmation') || currentUrl.includes('success') || currentUrl.includes('complete');

      const afterScreenshot = await this.takeScreenshot(page, 'after_submit');

      return {
        success: true,
        submitted: hasSuccess || isConfirmationPage,
        confirmationMessage: hasSuccess
          ? (await this.getElementText(page, this.selectors.successMessage)) || 'Application submitted'
          : isConfirmationPage
            ? 'Application submitted successfully'
            : undefined,
        screenshotUrl: afterScreenshot,
      };
    } catch (error) {
      const screenshot = await this.takeScreenshot(page, 'submit_error');
      return {
        success: false,
        submitted: false,
        error: error instanceof Error ? error.message : 'Submit failed',
        screenshotUrl: screenshot,
      };
    }
  }

  async detectCAPTCHA(page: Page): Promise<boolean> {
    try {
      const hasRecaptcha = await this.elementExists(page, this.selectors.captcha);
      const hasCaptchaIframe = await page.$$eval('iframe', (iframes: any[]) =>
        iframes.some((iframe: any) => {
          const src = iframe.src || '';
          return src.includes('captcha') || src.includes('recaptcha') || src.includes('hcaptcha') || src.includes('turnstile');
        })
      );
      const hasHCaptcha = await this.elementExists(page, '.h-captcha, [data-hcaptcha]');
      const hasTurnstile = await this.elementExists(page, '.cf-turnstile, [data-sitekey]');
      return hasRecaptcha || hasCaptchaIframe || hasHCaptcha || hasTurnstile;
    } catch {
      return false;
    }
  }
}
