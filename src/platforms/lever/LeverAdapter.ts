import { ApplicationPlatform, FormInfo, VerificationResult } from '../base/ApplicationPlatform';

export class LeverAdapter implements ApplicationPlatform {
  readonly name = 'lever';

  canHandle(url: string): boolean {
    return url.includes('lever.co') || url.includes('jobs.lever.co');
  }

  async detectForm(domContext: any): Promise<FormInfo> {
    return {
      detected: true,
      platform: 'lever',
      formSelector: '.application-form',
      fields: [
        { name: 'name', type: 'text', required: true, selector: 'input[name="name"]', label: 'Full Name' },
        { name: 'email', type: 'email', required: true, selector: 'input[name="email"]', label: 'Email' },
        { name: 'phone', type: 'tel', required: false, selector: 'input[name="phone"]', label: 'Phone' },
        { name: 'resume', type: 'file', required: true, selector: 'input[name="resume"]', label: 'Resume' },
      ],
      isStandard: true,
    };
  }

  async verifySubmission(pageContent: { url: string; text: string }): Promise<VerificationResult> {
    const text = pageContent.text.toLowerCase();
    const url = pageContent.url;

    const isSuccessText =
      text.includes('application submitted') ||
      text.includes('thank you for applying') ||
      text.includes('your application has been sent');

    const isConfirmationUrl = url.includes('/thanks') || url.includes('/confirmation');

    if (isSuccessText || isConfirmationUrl) {
      return {
        confirmed: true,
        confidence: 0.98,
        confirmationUrl: url,
        confirmationText: 'Application submitted successfully to Lever.',
      };
    }

    return {
      confirmed: false,
      confidence: 0,
      error: 'Lever submission confirmation not detected.',
    };
  }
}

export const leverAdapter = new LeverAdapter();
