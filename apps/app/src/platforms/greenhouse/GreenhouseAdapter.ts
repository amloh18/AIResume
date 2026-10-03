import { ApplicationPlatform, FormInfo, VerificationResult } from '../base/ApplicationPlatform';

export class GreenhouseAdapter implements ApplicationPlatform {
  readonly name = 'greenhouse';

  canHandle(url: string): boolean {
    return (
      url.includes('greenhouse.io') ||
      url.includes('boards.greenhouse.io') ||
      url.includes('grnh.se')
    );
  }

  async detectForm(domContext: any): Promise<FormInfo> {
    return {
      detected: true,
      platform: 'greenhouse',
      formSelector: '#application_form',
      fields: [
        { name: 'first_name', type: 'text', required: true, selector: '#first_name', label: 'First Name' },
        { name: 'last_name', type: 'text', required: true, selector: '#last_name', label: 'Last Name' },
        { name: 'email', type: 'email', required: true, selector: '#email', label: 'Email' },
        { name: 'phone', type: 'tel', required: false, selector: '#phone', label: 'Phone' },
        { name: 'resume', type: 'file', required: true, selector: 'input[data-qa="resume"]', label: 'Resume/CV' },
      ],
      isStandard: true,
    };
  }

  async verifySubmission(pageContent: { url: string; text: string }): Promise<VerificationResult> {
    const text = pageContent.text.toLowerCase();
    const url = pageContent.url;

    const isSuccessText =
      text.includes('thank you for applying') ||
      text.includes('application submitted') ||
      text.includes('we have received your application');

    const isConfirmationUrl = url.includes('/confirmation') || url.includes('/thank_you');

    if (isSuccessText || isConfirmationUrl) {
      // Extract application reference ID if present
      const idMatch = pageContent.text.match(
        /(?:(?:application|confirmation|submission)\s+)?(?:reference|id|number|code|#)\s*(?:is|:|#|-)?\s*([a-zA-Z0-9_-]{4,30})/i
      );

      return {
        confirmed: true,
        confidence: 0.98,
        confirmationId: idMatch ? idMatch[1] : undefined,
        confirmationUrl: url,
        confirmationText: 'Application submitted successfully to Greenhouse.',
      };
    }

    return {
      confirmed: false,
      confidence: 0,
      error: 'Confirmation message not detected on post-submission page.',
    };
  }
}

export const greenhouseAdapter = new GreenhouseAdapter();
