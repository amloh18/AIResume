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
 * Greenhouse ATS Adapter
 * Handles application forms on Greenhouse job boards
 * 
 * Supports:
 * - Field detection (text, email, phone, file uploads)
 * - Deterministic form filling
 * - CAPTCHA detection (safe halt)
 * - Form submission detection
 */
export class GreenhouseAdapter extends BaseATSAdapter {
  readonly atsType = 'greenhouse';
  readonly displayName = 'Greenhouse ATS';

  // Common Greenhouse selectors
  private readonly selectors = {
    // Form containers
    form: '#application_form, form[id*="application"], .application-form',
    submitButton: 'input[type="submit"], button[type="submit"], .submit-button',
    
    // Common fields
    firstName: '#first_name, [name="job_application[first_name]"], input[placeholder*="First" i]',
    lastName: '#last_name, [name="job_application[last_name]"], input[placeholder*="Last" i]',
    email: '#email, [name="job_application[email]"], input[type="email"]',
    phone: '#phone, [name="job_application[phone]"], input[type="tel"]',
    
    // File uploads
    resumeUpload: '#resume, input[name="job_application[resume]"], input[type="file"][accept*="pdf"]',
    coverLetterUpload: '#cover_letter, input[name="job_application[cover_letter]"], input[type="file"][accept*="pdf"]',
    
    // LinkedIn
    linkedin: 'input[name*="linkedin" i], input[placeholder*="LinkedIn" i]',
    
    // Location
    location: 'input[name*="location" i], input[placeholder*="Location" i]',
    
    // Custom questions
    customText: 'input[type="text"], textarea',
    customSelect: 'select',
    customCheckbox: 'input[type="checkbox"]',
    
    // CAPTCHA indicators
    captcha: 'iframe[src*="recaptcha"], .g-recaptcha, #captcha, [class*="captcha"]',
    
    // Success indicators
    successMessage: '.success-message, .confirmation, [class*="success"], [class*="thank"]',
  };

  /**
   * Detect if URL is a Greenhouse job board
   */
  detectATS(url: string): ATSDetectionResult {
    const urlLower = url.toLowerCase();
    
    // Direct Greenhouse URLs
    if (urlLower.includes('boards.greenhouse.io') || 
        urlLower.includes('greenhouse.io/')) {
      return {
        detected: true,
        atsType: 'greenhouse',
        confidence: 1.0,
        applyUrl: url,
      };
    }
    
    // Greenhouse embedded via company domain
    if (urlLower.includes('/jobs/') && urlLower.includes('greenhouse')) {
      return {
        detected: true,
        atsType: 'greenhouse',
        confidence: 0.9,
        applyUrl: url,
      };
    }
    
    return { detected: false, atsType: 'unknown', confidence: 0 };
  }

  /**
   * Detect all form fields on a Greenhouse application page
   */
  async detectFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];
    
    try {
      // Wait for form to load
      await this.waitForPage(page, 15000);
      
      // Check for CAPTCHA first
      if (await this.detectCAPTCHA(page)) {
        logger.warn('[Greenhouse] CAPTCHA detected - stopping field detection');
        return fields;
      }

      // Detect standard fields
      const standardFields = await this.detectStandardFields(page);
      fields.push(...standardFields);
      
      // Detect custom text fields
      const customTextFields = await this.detectCustomTextFields(page);
      fields.push(...customTextFields);
      
      // Detect custom select fields
      const customSelectFields = await this.detectCustomSelectFields(page);
      fields.push(...customSelectFields);
      
      // Detect file upload fields
      const fileFields = await this.detectFileFields(page);
      fields.push(...fileFields);
      
      logger.info(`[Greenhouse] Detected ${fields.length} fields`);
      
    } catch (error) {
      logger.error('[Greenhouse] Error detecting fields:', error);
    }
    
    return fields;
  }

  /**
   * Detect standard Greenhouse fields
   */
  private async detectStandardFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];
    
    // First Name
    if (await this.elementExists(page, this.selectors.firstName)) {
      fields.push({
        label: 'First Name',
        type: 'text',
        required: true,
        selector: this.selectors.firstName,
      });
    }
    
    // Last Name
    if (await this.elementExists(page, this.selectors.lastName)) {
      fields.push({
        label: 'Last Name',
        type: 'text',
        required: true,
        selector: this.selectors.lastName,
      });
    }
    
    // Email
    if (await this.elementExists(page, this.selectors.email)) {
      fields.push({
        label: 'Email',
        type: 'email',
        required: true,
        selector: this.selectors.email,
      });
    }
    
    // Phone
    if (await this.elementExists(page, this.selectors.phone)) {
      fields.push({
        label: 'Phone',
        type: 'tel',
        required: false,
        selector: this.selectors.phone,
      });
    }
    
    // LinkedIn
    if (await this.elementExists(page, this.selectors.linkedin)) {
      fields.push({
        label: 'LinkedIn',
        type: 'url',
        required: false,
        selector: this.selectors.linkedin,
      });
    }
    
    // Location
    if (await this.elementExists(page, this.selectors.location)) {
      fields.push({
        label: 'Location',
        type: 'text',
        required: false,
        selector: this.selectors.location,
      });
    }
    
    return fields;
  }

  /**
   * Detect custom text/textarea fields
   */
  private async detectCustomTextFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];
    
    try {
      // Find all text inputs and textareas that aren't standard fields
      const textInputs = await page.$$eval(
        'input[type="text"], textarea',
        (elements: any[]) => {
          return elements.map((el: any) => {
            const label = el.getAttribute('aria-label') ||
                         el.getAttribute('placeholder') ||
                         el.closest('label')?.textContent?.trim() ||
                         '';
            const required = el.hasAttribute('required') ||
                            el.getAttribute('aria-required') === 'true';
            const selector = el.id ? `#${el.id}` : 
                           el.name ? `[name="${el.name}"]` : 
                           null;
            
            return {
              label,
              required,
              selector,
              tagName: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || 'text',
            };
          });
        }
      );
      
      for (const input of textInputs) {
        // Skip standard fields (already detected)
        if (input.selector && (
          input.selector.includes('first_name') ||
          input.selector.includes('last_name') ||
          input.selector.includes('email') ||
          input.selector.includes('phone') ||
          input.selector.includes('linkedin') ||
          input.selector.includes('location')
        )) {
          continue;
        }
        
        if (input.selector && input.label) {
          fields.push({
            label: input.label,
            type: input.tagName === 'textarea' ? 'textarea' : 'text',
            required: input.required,
            selector: input.selector,
          });
        }
      }
    } catch (error) {
      logger.warn('[Greenhouse] Error detecting custom text fields:', { error: String(error) });
    }
    
    return fields;
  }

  /**
   * Detect custom select/dropdown fields
   */
  private async detectCustomSelectFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];
    
    try {
      const selectElements = await page.$$eval('select', (elements: any[]) => {
        return elements.map((el: any) => {
          const label = el.getAttribute('aria-label') ||
                       el.closest('label')?.textContent?.trim() ||
                       '';
          const required = el.hasAttribute('required') ||
                          el.getAttribute('aria-required') === 'true';
          const selector = el.id ? `#${el.id}` : 
                         el.name ? `[name="${el.name}"]` : 
                         null;
          const options = Array.from(el.options).map((opt: any) => opt.text);
          
          return {
            label,
            required,
            selector,
            options,
          };
        });
      });
      
      for (const select of selectElements) {
        if (select.selector && select.label) {
          fields.push({
            label: select.label,
            type: 'select',
            required: select.required,
            selector: select.selector,
            options: select.options,
          });
        }
      }
    } catch (error) {
      logger.warn('[Greenhouse] Error detecting select fields:', { error: String(error) });
    }
    
    return fields;
  }

  /**
   * Detect file upload fields
   */
  private async detectFileFields(page: Page): Promise<ATSField[]> {
    const fields: ATSField[] = [];
    
    try {
      const fileInputs = await page.$$eval('input[type="file"]', (elements: any[]) => {
        return elements.map((el: any) => {
          const label = el.getAttribute('aria-label') ||
                       el.closest('label')?.textContent?.trim() ||
                       el.accept ||
                       'File';
          const required = el.hasAttribute('required');
          const selector = el.id ? `#${el.id}` : 
                         el.name ? `[name="${el.name}"]` : 
                         null;
          const accept = el.accept || '';
          
          return {
            label,
            required,
            selector,
            accept,
          };
        });
      });
      
      for (const input of fileInputs) {
        if (input.selector) {
          const isResume = input.label.toLowerCase().includes('resume') ||
                          input.label.toLowerCase().includes('cv') ||
                          input.accept.includes('pdf');
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
      logger.warn('[Greenhouse] Error detecting file fields:', { error: String(error) });
    }
    
    return fields;
  }

  /**
   * Fill a single field with a value
   */
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
          return await this.safeFill(page, field.selector, value);
          
        case 'textarea':
          return await this.safeFill(page, field.selector, value);
          
        case 'select':
          return await this.safeSelect(page, field.selector, value);
          
        case 'checkbox':
          if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes') {
            return await this.safeClick(page, field.selector);
          }
          return true;
          
        case 'radio':
          // Find radio button with matching value
          const radioSelector = `${field.selector}[value="${value}"]`;
          return await this.safeClick(page, radioSelector);
          
        default:
          logger.warn(`[Greenhouse] Unsupported field type: ${field.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`[Greenhouse] Error filling field ${field.label}:`, error);
      return false;
    }
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(page: Page, field: ATSField, filePath: string): Promise<boolean> {
    try {
      await this.scrollToElement(page, field.selector);
      
      // Set input files
      const inputElement = await page.$(field.selector);
      if (inputElement) {
        await inputElement.setInputFiles(filePath);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`[Greenhouse] Error uploading file to ${field.label}:`, error);
      return false;
    }
  }

  /**
   * Submit the application form
   */
  async submitForm(page: Page): Promise<SubmissionResult> {
    try {
      // Take screenshot before submit
      const beforeScreenshot = await this.takeScreenshot(page, 'before_submit');
      
      // Find and click submit button
      const submitButton = await page.$(this.selectors.submitButton);
      if (!submitButton) {
        return {
          success: false,
          submitted: false,
          error: 'Submit button not found',
          screenshotUrl: beforeScreenshot,
        };
      }
      
      // Check if button is disabled
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        return {
          success: false,
          submitted: false,
          error: 'Submit button is disabled',
          screenshotUrl: beforeScreenshot,
        };
      }
      
      // Click submit
      await submitButton.click();
      
      // Wait for response
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      
      // Check for success
      const hasSuccess = await this.elementExists(page, this.selectors.successMessage);
      
      // Take screenshot after submit
      const afterScreenshot = await this.takeScreenshot(page, 'after_submit');
      
      return {
        success: true,
        submitted: hasSuccess,
        confirmationMessage: hasSuccess ? 
          await this.getElementText(page, this.selectors.successMessage) || 'Application submitted' :
          undefined,
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

  /**
   * Check if the page has a CAPTCHA
   */
  async detectCAPTCHA(page: Page): Promise<boolean> {
    try {
      // Check for reCAPTCHA
      const hasRecaptcha = await this.elementExists(page, this.selectors.captcha);
      
      // Check for iframe-based CAPTCHA
      const hasCaptchaIframe = await page.$$eval('iframe', (iframes: any[]) => {
        return iframes.some((iframe: any) => {
          const src = iframe.src || '';
          return src.includes('captcha') || 
                 src.includes('recaptcha') || 
                 src.includes('hcaptcha') ||
                 src.includes('turnstile');
        });
      });
      
      // Check for hCaptcha
      const hasHCaptcha = await this.elementExists(page, '.h-captcha, [data-hcaptcha]');
      
      // Check for Cloudflare Turnstile
      const hasTurnstile = await this.elementExists(page, '.cf-turnstile, [data-sitekey]');
      
      return hasRecaptcha || hasCaptchaIframe || hasHCaptcha || hasTurnstile;
      
    } catch {
      return false;
    }
  }
}
