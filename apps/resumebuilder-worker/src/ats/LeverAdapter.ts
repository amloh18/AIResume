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
 * Lever ATS Adapter
 * Handles application forms on Lever job boards (jobs.lever.co)
 *
 * Lever forms are typically single-page with:
 * - Standard fields (name, email, phone, resume, cover letter)
 * - Custom questions (text, select, radio, checkbox)
 * - Social links (LinkedIn, GitHub, portfolio)
 */
export class LeverAdapter extends BaseATSAdapter {
  readonly atsType = 'lever';
  readonly displayName = 'Lever ATS';

  private readonly selectors = {
    form: 'form, .application-form, [data-qa="application-form"]',
    submitButton: 'button[data-qa="btn-submit"], input[type="submit"], button[type="submit"], .postings-btn-submit',

    firstName: 'input[name="name"], input[data-qa="input-name"], #first_name',
    email: 'input[name="email"], input[data-qa="input-email"], input[type="email"]',
    phone: 'input[name="phone"], input[data-qa="input-phone"], input[type="tel"]',
    resume: 'input[name="resume"], input[data-qa="input-resume"], input[type="file"][accept*="pdf"]',
    coverLetter: 'input[name="comments"], input[data-qa="input-comments"], input[type="file"][accept*="cover"]',

    linkedin: 'input[name="urls[LinkedIn]"], input[data-qa="input-linkedin"], input[placeholder*="LinkedIn" i]',
    github: 'input[name="urls[GitHub]"], input[data-qa="input-github"], input[placeholder*="GitHub" i]',
    portfolio: 'input[name="urls[Portfolio]"], input[data-qa="input-portfolio"], input[placeholder*="portfolio" i]',

    location: 'input[name="location"], input[data-qa="input-location"], input[placeholder*="location" i]',

    customText: 'input[type="text"], textarea',
    customSelect: 'select',
    customRadio: 'input[type="radio"]',
    customCheckbox: 'input[type="checkbox"]',

    captcha: 'iframe[src*="captcha"], .g-recaptcha, #captcha, [class*="captcha"], iframe[src*="turnstile"]',
    successMessage: '.applicationconfirmation, .success-message, [data-qa="application-success"], [class*="success"], [class*="thank"]',
  };

  detectATS(url: string): ATSDetectionResult {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('jobs.lever.co') || urlLower.includes('lever.co/')) {
      return { detected: true, atsType: 'lever', confidence: 1.0, applyUrl: url };
    }

    if (urlLower.includes('/lever') && urlLower.includes('/jobs/')) {
      return { detected: true, atsType: 'lever', confidence: 0.9, applyUrl: url };
    }

    return { detected: false, atsType: 'unknown', confidence: 0 };
  }

  async detectFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      await this.waitForPage(page, 15000);

      if (await this.detectCAPTCHA(page)) {
        logger.warn('[Lever] CAPTCHA detected - stopping field detection');
        return fields;
      }

      fields.push(...await this.detectStandardFields(page));
      fields.push(...await this.detectCustomFields(page));
      fields.push(...await this.detectFileFields(page));

      logger.info(`[Lever] Detected ${fields.length} fields`);
    } catch (error) {
      logger.error('[Lever] Error detecting fields:', error);
    }

    return fields;
  }

  private async detectStandardFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    const standardMap: Array<{ label: string; selector: string; type: ATSField['type']; required: boolean }> = [
      { label: 'Name', selector: this.selectors.firstName, type: 'text', required: true },
      { label: 'Email', selector: this.selectors.email, type: 'email', required: true },
      { label: 'Phone', selector: this.selectors.phone, type: 'tel', required: false },
      { label: 'LinkedIn', selector: this.selectors.linkedin, type: 'url', required: false },
      { label: 'GitHub', selector: this.selectors.github, type: 'url', required: false },
      { label: 'Portfolio', selector: this.selectors.portfolio, type: 'url', required: false },
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
              el.closest('label')?.textContent?.trim() ||
              el.closest('.application-question')?.querySelector('label')?.textContent?.trim() ||
              '';
            const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
            const selector = el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : null;
            return { label, required, selector, tagName: el.tagName.toLowerCase(), type: el.getAttribute('type') || 'text' };
          })
      );

      const standardNames = ['name', 'email', 'phone', 'location', 'resume', 'comments', 'urls[LinkedIn]', 'urls[GitHub]', 'urls[Portfolio]'];

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
          const label = el.getAttribute('aria-label') || el.closest('label')?.textContent?.trim() || '';
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

      const radioGroups = await page.$$eval('input[type="radio"]', (elements: any[]) => {
        const groups: Record<string, { label: string; required: boolean; selector: string; options: string[] }> = {};
        elements.forEach((el: any) => {
          const name = el.name;
          if (!name) return;
          if (!groups[name]) {
            const label = el.closest('.application-question')?.querySelector('label')?.textContent?.trim() || name;
            const required = el.hasAttribute('required');
            groups[name] = { label, required, selector: `[name="${name}"]`, options: [] };
          }
          const val = el.value || el.nextSibling?.textContent?.trim() || '';
          if (val && !groups[name].options.includes(val)) {
            groups[name].options.push(val);
          }
        });
        return Object.values(groups);
      });

      for (const radio of radioGroups) {
        fields.push({ label: radio.label, type: 'radio', required: radio.required, selector: radio.selector, options: radio.options });
      }
    } catch (error) {
      logger.warn('[Lever] Error detecting custom fields:', { error: String(error) });
    }

    return fields;
  }

  private async detectFileFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];

    try {
      const fileInputs = await page.$$eval('input[type="file"]', (elements: any[]) =>
        elements.map((el: any) => {
          const label = el.getAttribute('aria-label') || el.closest('label')?.textContent?.trim() || el.accept || 'File';
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
      logger.warn('[Lever] Error detecting file fields:', { error: String(error) });
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
          logger.warn(`[Lever] Unsupported field type: ${field.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`[Lever] Error filling field ${field.label}:`, error);
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
      logger.error(`[Lever] Error uploading file to ${field.label}:`, error);
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
