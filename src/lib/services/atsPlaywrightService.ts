/**
 * ATS Playwright Automation Service
 *
 * Deterministic browser automation for filling ATS application forms.
 *
 * GOLDEN RULES:
 * - CAPTCHA detected → STOP → NEEDS_USER_ACTION
 * - Submission requires reliable evidence (success text, confirmation URL, confirmation ID)
 * - Never mark as submitted merely because a button was clicked
 * - Each application uses an isolated browser context
 * - Always clean up in finally block
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// Playwright types — loaded dynamically at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;
type Browser = any;
type BrowserContext = any;

export interface ATSField {
  name: string;
  type: string;
  required: boolean;
  selector: string;
  label: string;
  value?: string;
}

export interface ATSDetectionResult {
  atsType: string;
  formDetected: boolean;
  fields: ATSField[];
  hasCAPTCHA: boolean;
  captchaType?: string;
  screenshot?: Buffer;
}

export interface ATSFillResult {
  fieldsFilled: number;
  fieldsSkipped: number;
  skippedFields: Array<{ name: string; reason: string }>;
  errors: string[];
}

export interface ATSSubmissionResult {
  success: boolean;
  confirmed: boolean;
  confirmationId?: string;
  confirmationUrl?: string;
  confirmationText?: string;
  error?: string;
  hasCAPTCHA: boolean;
  screenshot?: Buffer;
  /** Evidence that submission actually occurred */
  evidence: {
    submitButtonClicked: boolean;
    navigationOccurred: boolean;
    successTextFound: boolean;
    confirmationUrlMatched: boolean;
    responseStatus?: number;
  };
}

/**
 * Detect CAPTCHA on page
 * Returns true if any CAPTCHA/anti-bot challenge is detected
 */
export async function detectCAPTCHA(page: Page): Promise<{ detected: boolean; type?: string }> {
  const captchaSelectors = [
    { selector: 'iframe[src*="recaptcha"]', type: 'reCAPTCHA' },
    { selector: '.g-recaptcha', type: 'reCAPTCHA' },
    { selector: '#captcha', type: 'CAPTCHA' },
    { selector: '[class*="captcha"]', type: 'CAPTCHA' },
    { selector: 'iframe[src*="hcaptcha"]', type: 'hCaptcha' },
    { selector: '.h-captcha', type: 'hCaptcha' },
    { selector: 'iframe[src*="turnstile"]', type: 'Turnstile' },
    { selector: '[class*="turnstile"]', type: 'Turnstile' },
    { selector: '[data-sitekey]', type: 'Unknown CAPTCHA' },
  ];

  for (const { selector, type } of captchaSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        return { detected: true, type };
      }
    } catch {
      // Selector query failed — continue
    }
  }

  return { detected: false };
}

/**
 * Detect Greenhouse form fields
 */
export async function detectGreenhouseFields(page: Page): Promise<ATSDetectionResult> {
  const fields: ATSField[] = [];
  let hasCAPTCHA = false;
  let captchaType: string | undefined;

  // Check for CAPTCHA first
  const captchaResult = await detectCAPTCHA(page);
  if (captchaResult.detected) {
    hasCAPTCHA = true;
    captchaType = captchaResult.type;
  }

  // Greenhouse standard field selectors
  const greenhouseSelectors: Array<{ name: string; type: string; selector: string; label: string; required: boolean }> = [
    { name: 'first_name', type: 'text', selector: '#first_name', label: 'First Name', required: true },
    { name: 'last_name', type: 'text', selector: '#last_name', label: 'Last Name', required: true },
    { name: 'email', type: 'email', selector: '#email', label: 'Email', required: true },
    { name: 'phone', type: 'tel', selector: '#phone', label: 'Phone', required: false },
    { name: 'resume', type: 'file', selector: 'input[data-qa="resume"]', label: 'Resume/CV', required: true },
    { name: 'cover_letter', type: 'file', selector: 'input[data-qa="cover_letter"]', label: 'Cover Letter', required: false },
    { name: 'linkedin', type: 'url', selector: 'input[data-qa="linkedin"]', label: 'LinkedIn', required: false },
    { name: 'portfolio', type: 'url', selector: 'input[data-qa="portfolio"]', label: 'Portfolio', required: false },
  ];

  for (const fieldDef of greenhouseSelectors) {
    try {
      const el = await page.$(fieldDef.selector);
      if (el) {
        fields.push({
          name: fieldDef.name,
          type: fieldDef.type,
          required: fieldDef.required,
          selector: fieldDef.selector,
          label: fieldDef.label,
        });
      }
    } catch {
      // Selector query failed — continue
    }
  }

  // Also detect custom fields by looking for labels
  try {
    const customFields = await page.$$eval('label', (labels: any[]) => {
      return labels.map((label: any) => {
        const forAttr = label.getAttribute('for');
        const text = label.textContent?.trim() || '';
        return { for: forAttr, text };
      }).filter((f: any) => f.for && f.text);
    });

    for (const cf of customFields) {
      if (!fields.find((f) => f.selector === `#${cf.for}`)) {
        fields.push({
          name: cf.text.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          type: 'text',
          required: false,
          selector: `#${cf.for}`,
          label: cf.text,
        });
      }
    }
  } catch {
    // Custom field detection failed — continue with standard fields
  }

  return {
    atsType: 'greenhouse',
    formDetected: fields.length > 0,
    fields,
    hasCAPTCHA,
    captchaType,
  };
}

/**
 * Fill Greenhouse form fields deterministically
 */
export async function fillGreenhouseFields(
  page: Page,
  fields: ATSField[],
  candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    resumePdf?: Buffer;
    resumeFileName?: string;
    coverLetterPdf?: Buffer;
    coverLetterFileName?: string;
  }
): Promise<ATSFillResult> {
  const result: ATSFillResult = {
    fieldsFilled: 0,
    fieldsSkipped: 0,
    skippedFields: [],
    errors: [],
  };

  const fieldMap: Record<string, string | undefined> = {
    first_name: candidateData.firstName,
    last_name: candidateData.lastName,
    email: candidateData.email,
    phone: candidateData.phone,
    linkedin: candidateData.linkedin,
    portfolio: candidateData.portfolio,
  };

  for (const field of fields) {
    try {
      const value = fieldMap[field.name];
      if (value) {
        await page.fill(field.selector, value);
        result.fieldsFilled++;
      } else if (field.type === 'file') {
        // File uploads handled separately
        result.skippedFields.push({ name: field.name, reason: 'File upload handled separately' });
        result.fieldsSkipped++;
      } else if (field.required) {
        result.errors.push(`Required field "${field.label}" has no value`);
      } else {
        result.skippedFields.push({ name: field.name, reason: 'Optional field, no value provided' });
        result.fieldsSkipped++;
      }
    } catch (error: any) {
      result.errors.push(`Failed to fill "${field.label}": ${error.message}`);
    }
  }

  // Handle file uploads
  try {
    const resumeInput = await page.$('input[data-qa="resume"], input[type="file"][name*="resume"], input[type="file"][accept*="pdf"]');
    if (resumeInput && candidateData.resumePdf && candidateData.resumeFileName) {
      // Write temp file and upload

      const tmpFile = path.join(os.tmpdir(), candidateData.resumeFileName);
      fs.writeFileSync(tmpFile, candidateData.resumePdf);
      await resumeInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload resume: ${error.message}`);
  }

  try {
    const coverLetterInput = await page.$('input[data-qa="cover_letter"], input[type="file"][name*="cover"]');
    if (coverLetterInput && candidateData.coverLetterPdf && candidateData.coverLetterFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.coverLetterFileName);
      fs.writeFileSync(tmpFile, candidateData.coverLetterPdf);
      await coverLetterInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload cover letter: ${error.message}`);
  }

  return result;
}

/**
 * Verify Greenhouse submission
 * Checks for success text, confirmation URL, or confirmation ID
 */
export async function verifyGreenhouseSubmission(page: Page): Promise<ATSSubmissionResult['evidence']> {
  const evidence: ATSSubmissionResult['evidence'] = {
    submitButtonClicked: false,
    navigationOccurred: false,
    successTextFound: false,
    confirmationUrlMatched: false,
  };

  try {
    const text = await page.textContent('body') || '';
    const url = page.url();
    const lowerText = text.toLowerCase();

    // Check for success text
    const successPhrases = [
      'thank you for applying',
      'application submitted',
      'we have received your application',
      'your application has been submitted',
      'application received',
    ];
    evidence.successTextFound = successPhrases.some((phrase) => lowerText.includes(phrase));

    // Check for confirmation URL
    evidence.confirmationUrlMatched = url.includes('/confirmation') || url.includes('/thank_you') || url.includes('/success');

    // Extract confirmation ID if present
    const idMatch = text.match(
      /(?:(?:application|confirmation|submission)\s+)?(?:reference|id|number|code|#)\s*(?:is|:|#|-)?\s*([a-zA-Z0-9_-]{4,30})/i
    );

    return evidence;
  } catch {
    return evidence;
  }
}

/**
 * Submit Greenhouse form
 * Returns submission result with evidence
 */
export async function submitGreenhouseForm(page: Page): Promise<ATSSubmissionResult> {
  const evidence: ATSSubmissionResult['evidence'] = {
    submitButtonClicked: false,
    navigationOccurred: false,
    successTextFound: false,
    confirmationUrlMatched: false,
  };

  // Check for CAPTCHA before submission
  const captchaCheck = await detectCAPTCHA(page);
  if (captchaCheck.detected) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: true,
      error: `CAPTCHA detected (${captchaCheck.type}) — manual intervention required`,
      evidence,
    };
  }

  try {
    // Find and click submit button
    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'input[data-qa="submit-button"]',
      'button[data-qa="submit-button"]',
      '.submit-btn',
    ];

    let submitButton: any = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: false,
        error: 'Submit button not found',
        evidence,
      };
    }

    // Record URL before click for navigation detection
    const urlBefore = page.url();

    // Click submit
    await submitButton.click();
    evidence.submitButtonClicked = true;

    // Wait for navigation or response
    try {
      await page.waitForNavigation({ timeout: 10000 });
      evidence.navigationOccurred = true;
    } catch {
      // No navigation — might be AJAX submission
    }

    // Wait a moment for page to settle
    await page.waitForTimeout(2000);

    // Verify submission
    const verificationEvidence = await verifyGreenhouseSubmission(page);
    Object.assign(evidence, verificationEvidence);

    // Check for CAPTCHA after submission attempt
    const postSubmitCaptcha = await detectCAPTCHA(page);
    if (postSubmitCaptcha.detected) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: true,
        error: `CAPTCHA appeared after submission attempt (${postSubmitCaptcha.type})`,
        evidence,
      };
    }

    // Determine confirmation
    const confirmed = evidence.successTextFound || evidence.confirmationUrlMatched;

    // Extract confirmation ID
    let confirmationId: string | undefined;
    try {
      const text = await page.textContent('body') || '';
      const idMatch = text.match(
        /(?:(?:application|confirmation|submission)\s+)?(?:reference|id|number|code|#)\s*(?:is|:|#|-)?\s*([a-zA-Z0-9_-]{4,30})/i
      );
      if (idMatch) confirmationId = idMatch[1];
    } catch {
      // ID extraction failed
    }

    return {
      success: confirmed,
      confirmed,
      confirmationId,
      confirmationUrl: page.url(),
      hasCAPTCHA: false,
      evidence,
    };
  } catch (error: any) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: false,
      error: error.message,
      evidence,
    };
  }
}

// ==========================================
// LEVER
// ==========================================

/**
 * Detect Lever form fields
 */
export async function detectLeverFields(page: Page): Promise<ATSDetectionResult> {
  const fields: ATSField[] = [];
  let hasCAPTCHA = false;
  let captchaType: string | undefined;

  const captchaResult = await detectCAPTCHA(page);
  if (captchaResult.detected) {
    hasCAPTCHA = true;
    captchaType = captchaResult.type;
  }

  const leverSelectors: Array<{ name: string; type: string; selector: string; label: string; required: boolean }> = [
    { name: 'name', type: 'text', selector: 'input[name="name"]', label: 'Full Name', required: true },
    { name: 'email', type: 'email', selector: 'input[name="email"]', label: 'Email', required: true },
    { name: 'phone', type: 'tel', selector: 'input[name="phone"]', label: 'Phone', required: false },
    { name: 'resume', type: 'file', selector: 'input[name="resume"]', label: 'Resume/CV', required: true },
    { name: 'cover_letter', type: 'file', selector: 'input[name="cover_letter"]', label: 'Cover Letter', required: false },
    { name: 'linkedin', type: 'url', selector: 'input[name="urls[LinkedIn]"]', label: 'LinkedIn', required: false },
    { name: 'portfolio', type: 'url', selector: 'input[name="urls[Portfolio]"]', label: 'Portfolio', required: false },
  ];

  for (const fieldDef of leverSelectors) {
    try {
      const el = await page.$(fieldDef.selector);
      if (el) {
        fields.push({
          name: fieldDef.name,
          type: fieldDef.type,
          required: fieldDef.required,
          selector: fieldDef.selector,
          label: fieldDef.label,
        });
      }
    } catch {
      // Selector query failed — continue
    }
  }

  // Detect custom / unknown fields
  try {
    const customFields = await page.$$eval('div.field', (divs: any[]) => {
      return divs.map((div: any) => {
        const label = div.querySelector('label');
        const input = div.querySelector('input, textarea, select');
        if (!label || !input) return null;
        return {
          name: input.getAttribute('name') || '',
          label: label.textContent?.trim() || '',
          type: input.tagName.toLowerCase() === 'textarea' ? 'textarea' : input.getAttribute('type') || 'text',
          required: input.hasAttribute('required'),
        };
      }).filter(Boolean);
    });

    for (const cf of customFields) {
      if (cf && !fields.find((f) => f.selector === `input[name="${cf.name}"]`)) {
        fields.push({
          name: cf.name,
          type: cf.type === 'textarea' ? 'textarea' : 'text',
          required: cf.required,
          selector: `input[name="${cf.name}"], textarea[name="${cf.name}"]`,
          label: cf.label,
        });
      }
    }
  } catch {
    // Custom field detection failed
  }

  return {
    atsType: 'lever',
    formDetected: fields.length > 0,
    fields,
    hasCAPTCHA,
    captchaType,
  };
}

/**
 * Fill Lever form fields
 */
export async function fillLeverFields(
  page: Page,
  fields: ATSField[],
  candidateData: {
    fullName: string;
    email: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    resumePdf?: Buffer;
    resumeFileName?: string;
    coverLetterPdf?: Buffer;
    coverLetterFileName?: string;
  }
): Promise<ATSFillResult> {
  const result: ATSFillResult = {
    fieldsFilled: 0,
    fieldsSkipped: 0,
    skippedFields: [],
    errors: [],
  };

  const fieldMap: Record<string, string | undefined> = {
    name: candidateData.fullName,
    email: candidateData.email,
    phone: candidateData.phone,
    linkedin: candidateData.linkedin,
    portfolio: candidateData.portfolio,
    'urls[LinkedIn]': candidateData.linkedin,
    'urls[Portfolio]': candidateData.portfolio,
  };

  for (const field of fields) {
    try {
      const value = fieldMap[field.name] || fieldMap[field.selector.replace('input[name="', '').replace('"]', '')];
      if (value) {
        await page.fill(field.selector, value);
        result.fieldsFilled++;
      } else if (field.type === 'file') {
        result.skippedFields.push({ name: field.name, reason: 'File upload handled separately' });
        result.fieldsSkipped++;
      } else if (field.required) {
        result.errors.push(`Required field "${field.label}" has no value`);
      } else {
        result.skippedFields.push({ name: field.name, reason: 'Optional field, no value provided' });
        result.fieldsSkipped++;
      }
    } catch (error: any) {
      result.errors.push(`Failed to fill "${field.label}": ${error.message}`);
    }
  }

  // File uploads
  try {
    const resumeInput = await page.$('input[name="resume"]');
    if (resumeInput && candidateData.resumePdf && candidateData.resumeFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.resumeFileName);
      fs.writeFileSync(tmpFile, candidateData.resumePdf);
      await resumeInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload resume: ${error.message}`);
  }

  try {
    const coverInput = await page.$('input[name="cover_letter"]');
    if (coverInput && candidateData.coverLetterPdf && candidateData.coverLetterFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.coverLetterFileName);
      fs.writeFileSync(tmpFile, candidateData.coverLetterPdf);
      await coverInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload cover letter: ${error.message}`);
  }

  return result;
}

/**
 * Submit Lever form
 */
export async function submitLeverForm(page: Page): Promise<ATSSubmissionResult> {
  const evidence: ATSSubmissionResult['evidence'] = {
    submitButtonClicked: false,
    navigationOccurred: false,
    successTextFound: false,
    confirmationUrlMatched: false,
  };

  const captchaCheck = await detectCAPTCHA(page);
  if (captchaCheck.detected) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: true,
      error: `CAPTCHA detected (${captchaCheck.type}) — manual intervention required`,
      evidence,
    };
  }

  try {
    const submitSelectors = [
      'button[data-qa="btn-submit"]',
      'button[type="submit"]',
      'input[type="submit"]',
      '.btn-submit',
    ];

    let submitButton: any = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: false,
        error: 'Submit button not found',
        evidence,
      };
    }

    const urlBefore = page.url();
    await submitButton.click();
    evidence.submitButtonClicked = true;

    try {
      await page.waitForNavigation({ timeout: 10000 });
      evidence.navigationOccurred = true;
    } catch {
      // No navigation — AJAX submission
    }

    await page.waitForTimeout(2000);

    // Verify submission
    try {
      const text = await page.textContent('body') || '';
      const url = page.url();
      const lowerText = text.toLowerCase();

      const successPhrases = [
        'thank you for applying',
        'application submitted',
        'we have received your application',
        'your application has been submitted',
      ];
      evidence.successTextFound = successPhrases.some((phrase) => lowerText.includes(phrase));
      evidence.confirmationUrlMatched = url.includes('/thank') || url.includes('/success') || url.includes('/applied');
    } catch {
      // Verification failed
    }

    const postSubmitCaptcha = await detectCAPTCHA(page);
    if (postSubmitCaptcha.detected) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: true,
        error: `CAPTCHA appeared after submission attempt (${postSubmitCaptcha.type})`,
        evidence,
      };
    }

    const confirmed = evidence.successTextFound || evidence.confirmationUrlMatched;

    let confirmationId: string | undefined;
    try {
      const text = await page.textContent('body') || '';
      const idMatch = text.match(/(?:application|confirmation|reference)\s*(?:id|number|#)?\s*[:=]?\s*([a-zA-Z0-9_-]{4,30})/i);
      if (idMatch) confirmationId = idMatch[1];
    } catch {
      // ID extraction failed
    }

    return {
      success: confirmed,
      confirmed,
      confirmationId,
      confirmationUrl: page.url(),
      hasCAPTCHA: false,
      evidence,
    };
  } catch (error: any) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: false,
      error: error.message,
      evidence,
    };
  }
}

// ==========================================
// ASHBY
// ==========================================

/**
 * Detect Ashby form fields
 */
export async function detectAshbyFields(page: Page): Promise<ATSDetectionResult> {
  const fields: ATSField[] = [];
  let hasCAPTCHA = false;
  let captchaType: string | undefined;

  const captchaResult = await detectCAPTCHA(page);
  if (captchaResult.detected) {
    hasCAPTCHA = true;
    captchaType = captchaResult.type;
  }

  const ashbySelectors: Array<{ name: string; type: string; selector: string; label: string; required: boolean }> = [
    { name: 'name', type: 'text', selector: 'input[name="name"]', label: 'Full Name', required: true },
    { name: 'email', type: 'email', selector: 'input[name="email"]', label: 'Email', required: true },
    { name: 'phone', type: 'tel', selector: 'input[name="phone"]', label: 'Phone', required: false },
    { name: 'resume', type: 'file', selector: 'input[name="resume"]', label: 'Resume/CV', required: true },
    { name: 'cover_letter', type: 'file', selector: 'input[name="cover_letter"]', label: 'Cover Letter', required: false },
    { name: 'linkedin', type: 'url', selector: 'input[name="linkedInUrl"]', label: 'LinkedIn', required: false },
    { name: 'portfolio', type: 'url', selector: 'input[name="website"]', label: 'Website', required: false },
  ];

  for (const fieldDef of ashbySelectors) {
    try {
      const el = await page.$(fieldDef.selector);
      if (el) {
        fields.push({
          name: fieldDef.name,
          type: fieldDef.type,
          required: fieldDef.required,
          selector: fieldDef.selector,
          label: fieldDef.label,
        });
      }
    } catch {
      // Selector query failed — continue
    }
  }

  // Detect additional fields
  try {
    const customFields = await page.$$eval('div[class*="field"], div[class*="form-group"]', (divs: any[]) => {
      return divs.map((div: any) => {
        const label = div.querySelector('label');
        const input = div.querySelector('input, textarea, select');
        if (!label || !input) return null;
        return {
          name: input.getAttribute('name') || '',
          label: label.textContent?.trim() || '',
          type: input.tagName.toLowerCase() === 'textarea' ? 'textarea' : input.getAttribute('type') || 'text',
          required: input.hasAttribute('required'),
        };
      }).filter(Boolean);
    });

    for (const cf of customFields) {
      if (cf && !fields.find((f) => f.selector === `input[name="${cf.name}"]`)) {
        fields.push({
          name: cf.name,
          type: cf.type === 'textarea' ? 'textarea' : 'text',
          required: cf.required,
          selector: `input[name="${cf.name}"], textarea[name="${cf.name}"]`,
          label: cf.label,
        });
      }
    }
  } catch {
    // Custom field detection failed
  }

  return {
    atsType: 'ashby',
    formDetected: fields.length > 0,
    fields,
    hasCAPTCHA,
    captchaType,
  };
}

/**
 * Fill Ashby form fields
 */
export async function fillAshbyFields(
  page: Page,
  fields: ATSField[],
  candidateData: {
    fullName: string;
    email: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    resumePdf?: Buffer;
    resumeFileName?: string;
    coverLetterPdf?: Buffer;
    coverLetterFileName?: string;
  }
): Promise<ATSFillResult> {
  const result: ATSFillResult = {
    fieldsFilled: 0,
    fieldsSkipped: 0,
    skippedFields: [],
    errors: [],
  };

  const fieldMap: Record<string, string | undefined> = {
    name: candidateData.fullName,
    email: candidateData.email,
    phone: candidateData.phone,
    linkedInUrl: candidateData.linkedin,
    website: candidateData.portfolio,
  };

  for (const field of fields) {
    try {
      const value = fieldMap[field.name];
      if (value) {
        await page.fill(field.selector, value);
        result.fieldsFilled++;
      } else if (field.type === 'file') {
        result.skippedFields.push({ name: field.name, reason: 'File upload handled separately' });
        result.fieldsSkipped++;
      } else if (field.required) {
        result.errors.push(`Required field "${field.label}" has no value`);
      } else {
        result.skippedFields.push({ name: field.name, reason: 'Optional field, no value provided' });
        result.fieldsSkipped++;
      }
    } catch (error: any) {
      result.errors.push(`Failed to fill "${field.label}": ${error.message}`);
    }
  }

  // File uploads
  try {
    const resumeInput = await page.$('input[name="resume"]');
    if (resumeInput && candidateData.resumePdf && candidateData.resumeFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.resumeFileName);
      fs.writeFileSync(tmpFile, candidateData.resumePdf);
      await resumeInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload resume: ${error.message}`);
  }

  try {
    const coverInput = await page.$('input[name="cover_letter"]');
    if (coverInput && candidateData.coverLetterPdf && candidateData.coverLetterFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.coverLetterFileName);
      fs.writeFileSync(tmpFile, candidateData.coverLetterPdf);
      await coverInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload cover letter: ${error.message}`);
  }

  return result;
}

/**
 * Submit Ashby form
 */
export async function submitAshbyForm(page: Page): Promise<ATSSubmissionResult> {
  const evidence: ATSSubmissionResult['evidence'] = {
    submitButtonClicked: false,
    navigationOccurred: false,
    successTextFound: false,
    confirmationUrlMatched: false,
  };

  const captchaCheck = await detectCAPTCHA(page);
  if (captchaCheck.detected) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: true,
      error: `CAPTCHA detected (${captchaCheck.type}) — manual intervention required`,
      evidence,
    };
  }

  try {
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[data-testid="submit"]',
      '.submit-btn',
    ];

    let submitButton: any = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: false,
        error: 'Submit button not found',
        evidence,
      };
    }

    const urlBefore = page.url();
    await submitButton.click();
    evidence.submitButtonClicked = true;

    try {
      await page.waitForNavigation({ timeout: 10000 });
      evidence.navigationOccurred = true;
    } catch {
      // No navigation — AJAX submission
    }

    await page.waitForTimeout(2000);

    // Verify submission
    try {
      const text = await page.textContent('body') || '';
      const url = page.url();
      const lowerText = text.toLowerCase();

      const successPhrases = [
        'thank you for applying',
        'application submitted',
        'we have received your application',
        'your application has been submitted',
        'thanks for your interest',
      ];
      evidence.successTextFound = successPhrases.some((phrase) => lowerText.includes(phrase));
      evidence.confirmationUrlMatched = url.includes('/thank') || url.includes('/success') || url.includes('/applied');
    } catch {
      // Verification failed
    }

    const postSubmitCaptcha = await detectCAPTCHA(page);
    if (postSubmitCaptcha.detected) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: true,
        error: `CAPTCHA appeared after submission attempt (${postSubmitCaptcha.type})`,
        evidence,
      };
    }

    const confirmed = evidence.successTextFound || evidence.confirmationUrlMatched;

    let confirmationId: string | undefined;
    try {
      const text = await page.textContent('body') || '';
      const idMatch = text.match(/(?:application|confirmation|reference)\s*(?:id|number|#)?\s*[:=]?\s*([a-zA-Z0-9_-]{4,30})/i);
      if (idMatch) confirmationId = idMatch[1];
    } catch {
      // ID extraction failed
    }

    return {
      success: confirmed,
      confirmed,
      confirmationId,
      confirmationUrl: page.url(),
      hasCAPTCHA: false,
      evidence,
    };
  } catch (error: any) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: false,
      error: error.message,
      evidence,
    };
  }
}

// ==========================================
// WORKABLE
// ==========================================

/**
 * Detect Workable form fields
 */
export async function detectWorkableFields(page: Page): Promise<ATSDetectionResult> {
  const fields: ATSField[] = [];
  let hasCAPTCHA = false;
  let captchaType: string | undefined;

  const captchaResult = await detectCAPTCHA(page);
  if (captchaResult.detected) {
    hasCAPTCHA = true;
    captchaType = captchaResult.type;
  }

  const workableSelectors: Array<{ name: string; type: string; selector: string; label: string; required: boolean }> = [
    { name: 'name', type: 'text', selector: 'input[name="name"]', label: 'Full Name', required: true },
    { name: 'email', type: 'email', selector: 'input[name="email"]', label: 'Email', required: true },
    { name: 'phone', type: 'tel', selector: 'input[name="phone"]', label: 'Phone', required: false },
    { name: 'resume', type: 'file', selector: 'input[name="resume"]', label: 'Resume/CV', required: true },
    { name: 'cover_letter', type: 'file', selector: 'input[name="cover_letter"]', label: 'Cover Letter', required: false },
  ];

  for (const fieldDef of workableSelectors) {
    try {
      const el = await page.$(fieldDef.selector);
      if (el) {
        fields.push({
          name: fieldDef.name,
          type: fieldDef.type,
          required: fieldDef.required,
          selector: fieldDef.selector,
          label: fieldDef.label,
        });
      }
    } catch {
      // Selector query failed — continue
    }
  }

  // Detect additional fields
  try {
    const customFields = await page.$$eval('div[class*="field"], div[class*="form-group"]', (divs: any[]) => {
      return divs.map((div: any) => {
        const label = div.querySelector('label');
        const input = div.querySelector('input, textarea, select');
        if (!label || !input) return null;
        return {
          name: input.getAttribute('name') || '',
          label: label.textContent?.trim() || '',
          type: input.tagName.toLowerCase() === 'textarea' ? 'textarea' : input.getAttribute('type') || 'text',
          required: input.hasAttribute('required'),
        };
      }).filter(Boolean);
    });

    for (const cf of customFields) {
      if (cf && !fields.find((f) => f.selector === `input[name="${cf.name}"]`)) {
        fields.push({
          name: cf.name,
          type: cf.type === 'textarea' ? 'textarea' : 'text',
          required: cf.required,
          selector: `input[name="${cf.name}"], textarea[name="${cf.name}"]`,
          label: cf.label,
        });
      }
    }
  } catch {
    // Custom field detection failed
  }

  return {
    atsType: 'workable',
    formDetected: fields.length > 0,
    fields,
    hasCAPTCHA,
    captchaType,
  };
}

/**
 * Fill Workable form fields
 */
export async function fillWorkableFields(
  page: Page,
  fields: ATSField[],
  candidateData: {
    fullName: string;
    email: string;
    phone?: string;
    resumePdf?: Buffer;
    resumeFileName?: string;
    coverLetterPdf?: Buffer;
    coverLetterFileName?: string;
  }
): Promise<ATSFillResult> {
  const result: ATSFillResult = {
    fieldsFilled: 0,
    fieldsSkipped: 0,
    skippedFields: [],
    errors: [],
  };

  const fieldMap: Record<string, string | undefined> = {
    name: candidateData.fullName,
    email: candidateData.email,
    phone: candidateData.phone,
  };

  for (const field of fields) {
    try {
      const value = fieldMap[field.name];
      if (value) {
        await page.fill(field.selector, value);
        result.fieldsFilled++;
      } else if (field.type === 'file') {
        result.skippedFields.push({ name: field.name, reason: 'File upload handled separately' });
        result.fieldsSkipped++;
      } else if (field.required) {
        result.errors.push(`Required field "${field.label}" has no value`);
      } else {
        result.skippedFields.push({ name: field.name, reason: 'Optional field, no value provided' });
        result.fieldsSkipped++;
      }
    } catch (error: any) {
      result.errors.push(`Failed to fill "${field.label}": ${error.message}`);
    }
  }

  // File uploads
  try {
    const resumeInput = await page.$('input[name="resume"]');
    if (resumeInput && candidateData.resumePdf && candidateData.resumeFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.resumeFileName);
      fs.writeFileSync(tmpFile, candidateData.resumePdf);
      await resumeInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload resume: ${error.message}`);
  }

  try {
    const coverInput = await page.$('input[name="cover_letter"]');
    if (coverInput && candidateData.coverLetterPdf && candidateData.coverLetterFileName) {

      const tmpFile = path.join(os.tmpdir(), candidateData.coverLetterFileName);
      fs.writeFileSync(tmpFile, candidateData.coverLetterPdf);
      await coverInput.setInputFiles(tmpFile);
      fs.unlinkSync(tmpFile);
      result.fieldsFilled++;
    }
  } catch (error: any) {
    result.errors.push(`Failed to upload cover letter: ${error.message}`);
  }

  return result;
}

/**
 * Submit Workable form
 */
export async function submitWorkableForm(page: Page): Promise<ATSSubmissionResult> {
  const evidence: ATSSubmissionResult['evidence'] = {
    submitButtonClicked: false,
    navigationOccurred: false,
    successTextFound: false,
    confirmationUrlMatched: false,
  };

  const captchaCheck = await detectCAPTCHA(page);
  if (captchaCheck.detected) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: true,
      error: `CAPTCHA detected (${captchaCheck.type}) — manual intervention required`,
      evidence,
    };
  }

  try {
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '.btn-submit',
      'button[data-testid="submit"]',
    ];

    let submitButton: any = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: false,
        error: 'Submit button not found',
        evidence,
      };
    }

    const urlBefore = page.url();
    await submitButton.click();
    evidence.submitButtonClicked = true;

    try {
      await page.waitForNavigation({ timeout: 10000 });
      evidence.navigationOccurred = true;
    } catch {
      // No navigation — AJAX submission
    }

    await page.waitForTimeout(2000);

    // Verify submission
    try {
      const text = await page.textContent('body') || '';
      const url = page.url();
      const lowerText = text.toLowerCase();

      const successPhrases = [
        'thank you for applying',
        'application submitted',
        'we have received your application',
        'your application has been submitted',
        'thanks for your interest',
      ];
      evidence.successTextFound = successPhrases.some((phrase) => lowerText.includes(phrase));
      evidence.confirmationUrlMatched = url.includes('/thank') || url.includes('/success') || url.includes('/applied');
    } catch {
      // Verification failed
    }

    const postSubmitCaptcha = await detectCAPTCHA(page);
    if (postSubmitCaptcha.detected) {
      return {
        success: false,
        confirmed: false,
        hasCAPTCHA: true,
        error: `CAPTCHA appeared after submission attempt (${postSubmitCaptcha.type})`,
        evidence,
      };
    }

    const confirmed = evidence.successTextFound || evidence.confirmationUrlMatched;

    let confirmationId: string | undefined;
    try {
      const text = await page.textContent('body') || '';
      const idMatch = text.match(/(?:application|confirmation|reference)\s*(?:id|number|#)?\s*[:=]?\s*([a-zA-Z0-9_-]{4,30})/i);
      if (idMatch) confirmationId = idMatch[1];
    } catch {
      // ID extraction failed
    }

    return {
      success: confirmed,
      confirmed,
      confirmationId,
      confirmationUrl: page.url(),
      hasCAPTCHA: false,
      evidence,
    };
  } catch (error: any) {
    return {
      success: false,
      confirmed: false,
      hasCAPTCHA: false,
      error: error.message,
      evidence,
    };
  }
}
