import { ApplicationPlatform, FormInfo, VerificationResult } from '../base/ApplicationPlatform';

export class AshbyAdapter implements ApplicationPlatform {
  readonly name = 'ashby';

  canHandle(url: string): boolean {
    return url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com');
  }

  async detectForm(domContext: any): Promise<FormInfo> {
    return {
      detected: true,
      platform: 'ashby',
      formSelector: 'form[data-testid="application-form"]',
      fields: [
        { name: 'name', type: 'text', required: true, selector: 'input[name="name"]', label: 'Name' },
        { name: 'email', type: 'email', required: true, selector: 'input[name="email"]', label: 'Email' },
        { name: 'resume', type: 'file', required: true, selector: 'input[type="file"]', label: 'Resume' },
      ],
      isStandard: true,
    };
  }

  async verifySubmission(pageContent: { url: string; text: string }): Promise<VerificationResult> {
    const text = pageContent.text.toLowerCase();
    const url = pageContent.url;

    if (text.includes('application submitted') || text.includes('thank you for applying') || url.includes('/success')) {
      return {
        confirmed: true,
        confidence: 0.98,
        confirmationUrl: url,
        confirmationText: 'Application submitted successfully to Ashby.',
      };
    }

    return {
      confirmed: false,
      confidence: 0,
      error: 'Ashby submission confirmation not detected.',
    };
  }
}

export const ashbyAdapter = new AshbyAdapter();
