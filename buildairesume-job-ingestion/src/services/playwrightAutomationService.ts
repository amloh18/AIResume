import { getATSAdapter, detectATSType, BaseATSAdapter } from '../ats';
import { ATSField, FillResult, SubmissionResult } from '../ats/BaseATSAdapter';
import { logger } from '../utils/logger';

type Browser = any;
type BrowserContext = any;
type Page = any;

export interface AutomationConfig {
  headless: boolean;
  timeout: number;
  screenshotOnError: boolean;
  humanDelay: boolean;
  maxRetries: number;
}

export interface AutomationResult {
  success: boolean;
  atsType: string;
  fieldsDetected: number;
  fieldsFilled: number;
  fieldsSkipped: number;
  filledFields: Array<{
    label: string;
    filled: boolean;
    method: 'deterministic' | 'ai' | 'skipped' | 'error';
    value?: string;
    error?: string;
  }>;
  submitted: boolean;
  submissionResult?: SubmissionResult;
  screenshots: string[];
  errors: string[];
  duration: number;
}

export interface CandidateData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  resumePath?: string;
  coverLetterPath?: string;
  customAnswers?: Record<string, string>;
}

/**
 * Playwright automation service for filling ATS application forms
 */
export class PlaywrightAutomationService {
  private browser: Browser | null = null;
  private config: AutomationConfig;

  constructor(config?: Partial<AutomationConfig>) {
    this.config = {
      headless: true,
      timeout: 30000,
      screenshotOnError: true,
      humanDelay: true,
      maxRetries: 2,
      ...config,
    };
  }

  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    const { chromium } = require('playwright');
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
    
    logger.info('[Playwright] Browser initialized');
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('[Playwright] Browser closed');
    }
  }

  /**
   * Automate an application form
   */
  async automateApplication(
    applicationUrl: string,
    candidateData: CandidateData,
    options?: {
      dryRun?: boolean;
      screenshotOnError?: boolean;
    }
  ): Promise<AutomationResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const errors: string[] = [];
    
    const result: AutomationResult = {
      success: false,
      atsType: 'unknown',
      fieldsDetected: 0,
      fieldsFilled: 0,
      fieldsSkipped: 0,
      filledFields: [],
      submitted: false,
      screenshots,
      errors,
      duration: 0,
    };

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Detect ATS type
      const atsDetection = detectATSType(applicationUrl);
      result.atsType = atsDetection.atsType;
      
      if (atsDetection.confidence < 0.8) {
        errors.push(`Low confidence ATS detection: ${atsDetection.atsType} (${atsDetection.confidence})`);
        return result;
      }

      // Get adapter
      const adapter = getATSAdapter(applicationUrl);
      if (!adapter) {
        errors.push(`No adapter found for ATS type: ${atsDetection.atsType}`);
        return result;
      }

      // Create isolated browser context
      context = await this.browser!.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      page = await context.newPage();
      
      // Navigate to application URL
      logger.info(`[Playwright] Navigating to ${applicationUrl}`);
      await page.goto(applicationUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Check for CAPTCHA
      const hasCAPTCHA = await adapter.detectCAPTCHA(page);
      if (hasCAPTCHA) {
        errors.push('CAPTCHA detected - manual intervention required');
        const screenshot = await this.takeScreenshot(page, 'captcha_detected');
        if (screenshot) screenshots.push(screenshot);
        return result;
      }

      // Detect fields
      logger.info('[Playwright] Detecting form fields...');
      const fields = await adapter.detectFields(page);
      result.fieldsDetected = fields.length;
      
      if (fields.length === 0) {
        errors.push('No form fields detected');
        return result;
      }

      // Fill fields deterministically
      logger.info(`[Playwright] Filling ${fields.length} fields...`);
      
      for (const field of fields) {
        const value = this.mapFieldToValue(field, candidateData);
        
        if (!value) {
          result.fieldsSkipped++;
          result.filledFields.push({
            label: field.label,
            filled: false,
            method: 'skipped',
            error: 'No value available',
          });
          continue;
        }

        // Handle file uploads specially
        if (field.type === 'file') {
          const filePath = field.label.toLowerCase().includes('cover') 
            ? candidateData.coverLetterPath 
            : candidateData.resumePath;
          
          if (filePath) {
            const uploaded = await adapter.uploadFile(page, field, filePath);
            result.filledFields.push({
              label: field.label,
              filled: uploaded,
              method: 'deterministic',
              value: filePath,
            });
            if (uploaded) result.fieldsFilled++;
          } else {
            result.fieldsSkipped++;
            result.filledFields.push({
              label: field.label,
              filled: false,
              method: 'skipped',
              error: 'No file path provided',
            });
          }
          continue;
        }

        // Fill text/select fields
        const filled = await adapter.fillField(page, field, value);
        result.filledFields.push({
          label: field.label,
          filled,
          method: 'deterministic',
          value,
          error: filled ? undefined : 'Failed to fill field',
        });
        
        if (filled) {
          result.fieldsFilled++;
        } else {
          result.fieldsSkipped++;
        }

        // Add human-like delay
        if (this.config.humanDelay) {
          await this.randomDelay(100, 500);
        }
      }

      // Dry run mode - don't submit
      if (options?.dryRun) {
        result.success = true;
        result.submitted = false;
        const screenshot = await this.takeScreenshot(page, 'dry_run_complete');
        if (screenshot) screenshots.push(screenshot);
        return result;
      }

      // Submit form
      logger.info('[Playwright] Submitting form...');
      const submissionResult = await adapter.submitForm(page);
      result.submissionResult = submissionResult;
      result.submitted = submissionResult.submitted;
      result.success = submissionResult.success;

      // Take final screenshot
      const finalScreenshot = await this.takeScreenshot(page, 'after_submit');
      if (finalScreenshot) screenshots.push(finalScreenshot);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      logger.error('[Playwright] Automation error:', error);
      
      // Take error screenshot
      if (this.config.screenshotOnError && page) {
        const errorScreenshot = await this.takeScreenshot(page, 'error');
        if (errorScreenshot) screenshots.push(errorScreenshot);
      }
    } finally {
      // Clean up context (browser isolation)
      if (context) {
        await context.close();
      }
      
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Map a field to its value based on candidate data
   */
  private mapFieldToValue(field: ATSField, candidateData: CandidateData): string | null {
    const labelLower = field.label.toLowerCase();
    
    // Standard field mapping
    if (labelLower.includes('first name') || labelLower.includes('firstname')) {
      return candidateData.firstName;
    }
    if (labelLower.includes('last name') || labelLower.includes('lastname')) {
      return candidateData.lastName;
    }
    if (labelLower.includes('email')) {
      return candidateData.email;
    }
    if (labelLower.includes('phone') || labelLower.includes('mobile')) {
      return candidateData.phone || null;
    }
    if (labelLower.includes('linkedin')) {
      return candidateData.linkedin || null;
    }
    if (labelLower.includes('portfolio') || labelLower.includes('website')) {
      return candidateData.portfolio || null;
    }
    
    // Custom answer mapping
    if (candidateData.customAnswers && candidateData.customAnswers[field.label]) {
      return candidateData.customAnswers[field.label];
    }
    
    // Try to match by selector
    if (candidateData.customAnswers) {
      for (const [key, value] of Object.entries(candidateData.customAnswers)) {
        if (field.selector.includes(key.toLowerCase())) {
          return value;
        }
      }
    }
    
    return null;
  }

  /**
   * Take a screenshot
   */
  private async takeScreenshot(page: Page, context: string): Promise<string | null> {
    try {
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });
      // In production, upload to R2 and return URL
      return `data:image/png;base64,${screenshot.toString('base64')}`;
    } catch (error) {
      logger.warn(`[Playwright] Failed to take screenshot for ${context}:`, { error: String(error) });
      return null;
    }
  }

  /**
   * Random delay for human-like behavior
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
