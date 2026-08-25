export interface FormFieldInfo {
  name: string;
  type: 'text' | 'email' | 'tel' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea';
  required: boolean;
  selector: string;
  label?: string;
}

export interface FormInfo {
  detected: boolean;
  platform: string;
  formSelector: string;
  fields: FormFieldInfo[];
  isStandard: boolean;
}

export interface ApplicationContext {
  applicationId: string;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    linkedInUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    workAuthorization?: string;
    requiresSponsorship?: boolean;
    location?: string;
  };
  cvFilePath?: string;
  coverLetterFilePath?: string;
}

export interface VerificationResult {
  confirmed: boolean;
  confidence: number;
  confirmationId?: string;
  confirmationUrl?: string;
  confirmationText?: string;
  error?: string;
}

export interface ApplicationPlatform {
  readonly name: string;

  /**
   * Evaluates if this platform adapter can handle the given job application URL
   */
  canHandle(applicationUrl: string): boolean;

  /**
   * Inspects and detects form fields from DOM structure
   */
  detectForm(domContext: any): Promise<FormInfo>;

  /**
   * Verifies submission evidence from page response / redirect
   */
  verifySubmission(domContext: any): Promise<VerificationResult>;
}
