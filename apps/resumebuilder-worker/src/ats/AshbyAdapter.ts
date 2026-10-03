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
 * Ashby ATS Adapter
 * Handles application forms on Ashby job boards (jobs.ashbyhq.com)
 *
 * Ashby forms are modern React-based with:
 * - Standard fields (name, email, phone, resume, cover letter)
 * - Custom questions (text, select, radio, file)
 * - Social links
 */
export class AshbyAdapter extends BaseATSAdapter {
  readonly atsType = 'ashby';
  readonly displayName = 'Ashby ATS';

  private readonly selectors = {
    form: 'form, .ashby-application-form, [class*="application-form"]',
    submitButton: 'button[type="submit"], button[data-testid="submit-application"], .ashby-btn-submit',

    firstName: 'input[name="firstName"], input[data-testid="input-firstName"], input[placeholder*="First" i]',
    lastName: 'input[name="lastName"], input[data-testid="input-lastName"], input[placeholder*="Last" i]',
    email: 'input[name="email"], input[data-testid="input-email"], input[type="email"]',
    phone: 'input[name="phone"], input[data-testid="input-phone"], input[type="tel"]',
    resume: 'input[name="resumeFile"], input[data-testid="input-resume"], input[type="file"][accept*="pdf"]',
    coverLetter: 'input[name="coverLetterFile"], input[data-testid="input-coverLetter"], input[type="file"][accept*="cover"]',

    linkedin: 'input[name="linkedInUrl"], input[data-testid="input-linkedInUrl"], input[placeholder*="LinkedIn" i]',
    github: 'input[name="githubUrl"], input[data-testid="input-githubUrl"], input[placeholder*="GitHub" i]',

    location: 'input[name="location"], input[data-testid="input-location"], input[placeholder*="location" i]',

    customText: 'input[type="text"], textarea',
    customSelect: 'select',
    customRadio: 'input[type="radio"]',

    captcha: 'iframe[src*="captcha"], .g-recaptcha, [class*="captcha"], iframe[src*="turnstile"]',
    successMessage: '.ashby-application-success, [data-testid="application-success"], [class*="success"], [class*="thank"]',
  };

  detectATS(url: string): ATSDetectionResult {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('jobs.ashbyhq.com') || urlLower.includes('ashbyhq.com')) {
      return { detected: true, atsType: 'ashby', confidence: 1.0, applyUrl: url };
    }

    if (urlLower.includes('/ashby') && urlLower.includes('/jobs/')) {
      return { detected: true, atsType: 'ashby', confidence: 0.9, applyUrl: url };
    }

    return { detected: false, atsType: 'unknown', confidence: 0 };
  }

  async detectFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      await this.waitForPage(page, 15000);

      if (await this.detectCAPTCHA(page)) {
        logger.warn('[Ashby] CAPTCHA detected - stopping field detection');
        return fields;
      }

      fields.push(...await this.detectStandardFields(page));
      fields.push(...await this.detectCustomFields(page));
      fields.push(...await this.detectFileFields(page));

      logger.info(`[Ashby] Detected ${fields.length} fields`);
    } catch (error) {
      logger.error('[Ashby] Error detecting fields:', error);
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
      { label: 'GitHub', selector: this.selectors.github, type: 'url', required: false },
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
              el.getAttribute('data-testid') ||
              el.closest('label')?.textContent?.trim() ||
              '';
            const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
            const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : null;
            return { label, required, selector, tagName: el.tagName.toLowerCase(), type: el.getAttribute('type') || 'text' };
          })
      );

      const standardNames = ['firstName', 'lastName', 'email', 'phone', 'location', 'linkedInUrl', 'githubUrl', 'resumeFile', 'coverLetterFile'];

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
          const label = el.getAttribute('aria-label') || el.getAttribute('data-testid') || el.closest('label')?.textContent?.trim() || '';
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
      logger.warn('[Ashby] Error detecting custom fields:', { error: String(error) });
    }

    return fields;
  }

  private async detectFileFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      const fileInputs = await page.$$eval('input[type="file"]', (elements: any[]) =>
        elements.map((el: any) => {
          const label = el.getAttribute('aria-label') || el.getAttribute('data-testid') || el.closest('label')?.textContent?.trim() || el.accept || 'File';
          const required = el.hasAttribute('required');
          const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : null;
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
      logger.warn('[Ashby] Error detecting file fields:', { error: String(error) });
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
          logger.warn(`[Ashby] Unsupported field type: ${field.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`[Ashby] Error filling field ${field.label}:`, error);
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
      logger.error(`[Ashby] Error uploading file to ${field.label}:`, error);
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
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const hasSuccess = await this.elementExists(page, this.selectors.successMessage);
      const afterScreenshot = await this.takeScreenshot(page, 'after_submit');

      return {
        success: true,
        submitted: hasSuccess,
        confirmationMessage: hasSuccess
          ? (await this.getElementText(page, this.selectors.successMessage)) || 'Application submitted'
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
