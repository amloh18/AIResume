import { logger } from '../utils/logger';

// Playwright types (will be available at runtime)
type Page = any;
type Browser = any;
type BrowserContext = any;

export interface ATSField {
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'file' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'number';
  required: boolean;
  selector: string;
  options?: string[]; // For select fields
  placeholder?: string;
  helpText?: string;
}

export interface ATSDetectionResult {
  detected: boolean;
  atsType: string;
  confidence: number;
  formUrl?: string;
  applyUrl?: string;
}

export interface FillResult {
  success: boolean;
  fieldsDetected: number;
  fieldsFilled: number;
  fieldsSkipped: number;
  fieldsFailed: number;
  errors: string[];
  filledFields: Array<{
    label: string;
    selector: string;
    filled: boolean;
    method: 'deterministic' | 'ai' | 'skipped' | 'error';
    value?: string;
    error?: string;
  }>;
}

export interface SubmissionResult {
  success: boolean;
  submitted: boolean;
  error?: string;
  confirmationMessage?: string;
  screenshotUrl?: string;
}

/**
 * Base class for ATS adapters
 * Provides common functionality for form detection, filling, and submission
 */
export abstract class BaseATSAdapter {
  abstract readonly atsType: string;
  abstract readonly displayName: string;

  /**
   * Detect if a URL belongs to this ATS
   */
  abstract detectATS(url: string): ATSDetectionResult;

  /**
   * Navigate to the application form and detect fields
   */
  abstract detectFields(page: Page): Promise<ATSField[]>;

  /**
   * Fill a single field with a value
   */
  abstract fillField(page: Page, field: ATSField, value: string): Promise<boolean>;

  /**
   * Upload a file to a file input
   */
  abstract uploadFile(page: Page, field: ATSField, filePath: string): Promise<boolean>;

  /**
   * Submit the application form
   */
  abstract submitForm(page: Page): Promise<SubmissionResult>;

  /**
   * Check if the form has a CAPTCHA
   */
  abstract detectCAPTCHA(page: Page): Promise<boolean>;

  /**
   * Take a screenshot of the current state
   */
  protected async takeScreenshot(page: Page, context: string): Promise<string | undefined> {
    try {
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });
      // In production, upload to R2 and return URL
      // For now, return base64 for debugging
      return `data:image/png;base64,${screenshot.toString('base64')}`;
    } catch (error) {
      logger.warn(`Failed to take screenshot for ${context}:`, { error: String(error) });
      return undefined;
    }
  }

  /**
   * Wait for page to load with timeout
   */
  protected async waitForPage(page: Page, timeout: number = 30000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Fall back to domcontentloaded
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    }
  }

  /**
   * Safely click an element
   */
  protected async safeClick(page: Page, selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await page.click(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely fill an input field
   */
  protected async safeFill(page: Page, selector: string, value: string, timeout: number = 5000): Promise<boolean> {
    try {
      await page.fill(selector, value, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely select an option from a dropdown
   */
  protected async safeSelect(page: Page, selector: string, value: string, timeout: number = 5000): Promise<boolean> {
    try {
      await page.selectOption(selector, { label: value }, { timeout });
      return true;
    } catch {
      // Try by value
      try {
        await page.selectOption(selector, { value }, { timeout });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Check if element exists
   */
  protected async elementExists(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get element text content
   */
  protected async getElementText(page: Page, selector: string): Promise<string | null> {
    try {
      return await page.textContent(selector);
    } catch {
      return null;
    }
  }

  /**
   * Type text character by character with delay (human-like)
   */
  protected async humanType(page: Page, selector: string, text: string, delay: number = 50): Promise<void> {
    await page.click(selector);
    await page.keyboard.type(text, { delay });
  }

  /**
   * Scroll element into view
   */
  protected async scrollToElement(page: Page, selector: string): Promise<void> {
    try {
      await page.evaluate((sel: string) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);
    } catch {
      // Ignore scroll errors
    }
  }
}
