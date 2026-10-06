import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

export interface DryRunField {
  label: string;
  type: string;
  required: boolean;
  detected: boolean;
  mapped: boolean;
  mappedValue?: string;
  skipped: boolean;
  skipReason?: string;
}

export interface DryRunResult {
  success: boolean;
  /**
   * True when the field list was **inferred from the ATS type** rather than read from the live page.
   *
   * `performDryRun` never loads `applicationUrl`: there is no browser and no DOM here. It maps a
   * hard-coded field list per ATS type, so `fields` describes what that ATS *usually* asks for — not
   * what this employer's form actually contains. Callers must label it as a preview and must not present
   * `fieldsDetected` / `wouldSubmit` as observations about the real page.
   */
  simulated: boolean;
  atsType: string;
  applicationUrl: string;
  fieldsDetected: number;
  fieldsMapped: number;
  fieldsSkipped: number;
  fields: DryRunField[];
  resumeAttached: boolean;
  coverLetterAttached: boolean;
  errors: string[];
  warnings: string[];
  wouldSubmit: boolean;
  screenshotUrl?: string;
}

export class ApplicationDryRunService {
  /**
   * Perform a dry-run of an application
   * Detects form fields, maps them to candidate data, but does NOT submit
   */
  async performDryRun(params: {
    applicationId: mongoose.Types.ObjectId | string;
    userId: mongoose.Types.ObjectId | string;
    jobId: mongoose.Types.ObjectId | string;
    applicationUrl: string;
    candidateData: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      linkedin?: string;
      portfolio?: string;
      resumeUrl?: string;
      coverLetterText?: string;
    };
  }): Promise<DryRunResult> {
    const { applicationUrl, candidateData } = params;
    
    logger.info(`[DRY-RUN] Starting dry-run for application ${params.applicationId}`);

    const result: DryRunResult = {
      success: false,
      // Nothing in this service reads the live page, so every result it produces is a simulation.
      simulated: true,
      atsType: 'unknown',
      applicationUrl,
      fieldsDetected: 0,
      fieldsMapped: 0,
      fieldsSkipped: 0,
      fields: [],
      resumeAttached: !!candidateData.resumeUrl,
      coverLetterAttached: !!candidateData.coverLetterText,
      errors: [],
      warnings: [
        `Preview only: the form at ${applicationUrl} was not loaded. Fields are inferred from the detected ATS type.`,
      ],
      wouldSubmit: false,
    };

    try {
      // A string match on the URL — no request is made and nothing is fetched.
      result.atsType = this.detectATSType(applicationUrl);
      logger.info(`[DRY-RUN] Detected ATS type: ${result.atsType}`);

      /*
        Inferred, not detected. `detectFieldsForATS` returns a hard-coded list per ATS type, so the
        `fieldsDetected` counter was reporting the size of a constant rather than anything found on the
        employer's form.
      */
      const detectedFields = this.detectFieldsForATS(result.atsType);
      result.fieldsDetected = detectedFields.length;

      // Map fields to candidate data
      for (const field of detectedFields) {
        const mappedField = this.mapField(field, candidateData);
        result.fields.push(mappedField);

        if (mappedField.mapped) {
          result.fieldsMapped++;
        } else if (mappedField.skipped) {
          result.fieldsSkipped++;
        }
      }

      // Check for required fields that couldn't be mapped
      const unmappedRequired = result.fields.filter(
        f => f.required && !f.mapped && !f.skipped
      );

      if (unmappedRequired.length > 0) {
        result.warnings.push(
          `${unmappedRequired.length} required fields could not be mapped`
        );
      }

      // Determine if we would submit
      result.wouldSubmit = result.fieldsSkipped === 0 && 
                          result.errors.length === 0 &&
                          result.resumeAttached;

      result.success = true;
      logger.info(`[DRY-RUN] Dry-run complete: ${result.fieldsMapped} fields mapped, ${result.fieldsSkipped} skipped`);

    } catch (error: any) {
      result.errors.push(error.message);
      logger.error(`[DRY-RUN] Dry-run failed:`, error);
    }

    return result;
  }

  /**
   * Detect ATS type from application URL
   */
  private detectATSType(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('greenhouse.io') || urlLower.includes('boards.greenhouse')) {
      return 'greenhouse';
    }
    if (urlLower.includes('lever.co') || urlLower.includes('jobs.lever')) {
      return 'lever';
    }
    if (urlLower.includes('ashbyhq.com') || urlLower.includes('jobs.ashby')) {
      return 'ashby';
    }
    if (urlLower.includes('myworkdayjobs.com') || urlLower.includes('workday')) {
      return 'workday';
    }
    if (urlLower.includes('workable.com')) {
      return 'workable';
    }
    if (urlLower.includes('icims.com')) {
      return 'icims';
    }
    if (urlLower.includes('smartrecruiters.com')) {
      return 'smartrecruiters';
    }
    
    return 'unknown';
  }

  /**
   * Detect common fields for an ATS type
   */
  private detectFieldsForATS(atsType: string): Array<{
    label: string;
    type: string;
    required: boolean;
  }> {
    // Common fields across most ATS systems
    const commonFields = [
      { label: 'First Name', type: 'text', required: true },
      { label: 'Last Name', type: 'text', required: true },
      { label: 'Email', type: 'email', required: true },
      { label: 'Phone', type: 'tel', required: false },
      { label: 'Resume', type: 'file', required: true },
      { label: 'Cover Letter', type: 'file', required: false },
      { label: 'LinkedIn', type: 'url', required: false },
      { label: 'Portfolio/Website', type: 'url', required: false },
    ];

    // ATS-specific fields
    const atsSpecific: Record<string, Array<{ label: string; type: string; required: boolean }>> = {
      greenhouse: [
        { label: 'Current Company', type: 'text', required: false },
        { label: 'Location', type: 'text', required: false },
        { label: 'Work Authorization', type: 'select', required: false },
      ],
      lever: [
        { label: 'Location', type: 'text', required: false },
        { label: 'LinkedIn', type: 'url', required: false },
      ],
      ashby: [
        { label: 'Location', type: 'text', required: false },
        { label: 'Website', type: 'url', required: false },
      ],
      workday: [
        { label: 'Address', type: 'textarea', required: false },
        { label: 'Work Authorization', type: 'select', required: false },
        { label: 'Equal Opportunity', type: 'select', required: false },
      ],
    };

    return [...commonFields, ...(atsSpecific[atsType] || [])];
  }

  /**
   * Map a detected field to candidate data
   */
  private mapField(
    field: { label: string; type: string; required: boolean },
    candidateData: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      linkedin?: string;
      portfolio?: string;
      resumeUrl?: string;
      coverLetterText?: string;
    }
  ): DryRunField {
    const labelLower = field.label.toLowerCase();
    
    let mapped = false;
    let mappedValue: string | undefined;
    let skipped = false;
    let skipReason: string | undefined;

    // Map based on field label
    if (labelLower.includes('first name') || labelLower.includes('firstname')) {
      mappedValue = candidateData.firstName;
      mapped = true;
    } else if (labelLower.includes('last name') || labelLower.includes('lastname')) {
      mappedValue = candidateData.lastName;
      mapped = true;
    } else if (labelLower.includes('email')) {
      mappedValue = candidateData.email;
      mapped = true;
    } else if (labelLower.includes('phone') || labelLower.includes('mobile')) {
      mappedValue = candidateData.phone;
      mapped = !!candidateData.phone;
      if (!mapped) {
        skipped = true;
        skipReason = 'Phone number not provided';
      }
    } else if (labelLower.includes('linkedin')) {
      mappedValue = candidateData.linkedin;
      mapped = !!candidateData.linkedin;
      if (!mapped) {
        skipped = true;
        skipReason = 'LinkedIn URL not provided';
      }
    } else if (labelLower.includes('portfolio') || labelLower.includes('website')) {
      mappedValue = candidateData.portfolio;
      mapped = !!candidateData.portfolio;
      if (!mapped) {
        skipped = true;
        skipReason = 'Portfolio URL not provided';
      }
    } else if (labelLower.includes('resume') || labelLower.includes('cv')) {
      mappedValue = candidateData.resumeUrl;
      mapped = !!candidateData.resumeUrl;
      if (!mapped) {
        skipped = true;
        skipReason = 'Resume not attached';
      }
    } else if (labelLower.includes('cover letter')) {
      mappedValue = candidateData.coverLetterText ? '[Cover Letter Text]' : undefined;
      mapped = !!candidateData.coverLetterText;
      if (!mapped) {
        skipped = true;
        skipReason = 'Cover letter not provided';
      }
    } else {
      // Unknown field
      skipped = true;
      skipReason = `Unknown field: ${field.label}`;
    }

    return {
      label: field.label,
      type: field.type,
      required: field.required,
      detected: true,
      mapped,
      mappedValue,
      skipped,
      skipReason,
    };
  }
}

export const applicationDryRunService = new ApplicationDryRunService();
