// Enhanced job parsing utility
// Extracts job data from various job board pages

export interface ParsedJobData {
  title?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  jobUrl?: string;
  description?: string;
  jobDescription?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  type?: string;
  remote?: boolean;
  sponsorship?: 'yes' | 'no' | 'unknown';
  deadline?: string;
  source?: string;
  extractedAt?: string;
}

class JobParser {
  private extractTextContent(element: Element | null): string {
    if (!element) return '';
    return element.textContent?.trim() || '';
  }

  private extractSalary(text: string): ParsedJobData['salary'] | undefined {
    if (!text) return undefined;
    
    // Match patterns like $100k, $100,000, $50-100k, $100K-$150K, etc.
    const patterns = [
      // Range patterns: $100k-$150k, $100,000 - $150,000
      /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?))?\s*(k|K|thousand|million|M)?/i,
      // With period: $100k/year, $50-100k per year
      new RegExp(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-\s*(\d+(?:,\d{3})*(?:\.\d+)?))?\s*(k|K|thousand|million|M)?\s*(?:per|\/)\s*(year|month|hour|yr|mo|hr|annually|annum)/i.source),
      // Without dollar sign: 100k-150k, 100,000 - 150,000
      new RegExp(/(?:^|\s)(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-\s*(\d+(?:,\d{3})*(?:\.\d+)?))?\s*(k|K|thousand|million|M)?\s*(?:per|\/)?\s*(year|month|hour|yr|mo|hr|annually|annum)?/i.source),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Clean and parse numbers (remove commas)
        let minStr = match[1]?.replace(/,/g, '') || '0';
        let maxStr = match[2]?.replace(/,/g, '') || minStr;
        
        let min = parseFloat(minStr);
        let max = parseFloat(maxStr);
        
        if (isNaN(min)) continue;
        if (isNaN(max)) max = min;

        // Handle k/million multipliers
        const multiplier = match[3]?.toLowerCase();
        if (multiplier === 'k' || multiplier === 'thousand') {
          min *= 1000;
          max *= 1000;
        } else if (multiplier === 'million' || multiplier === 'm') {
          min *= 1000000;
          max *= 1000000;
        }

        // Determine period
        let period: 'hourly' | 'monthly' | 'yearly' = 'yearly';
        const periodMatch = match[4] || match[5] || '';
        if (periodMatch) {
          const periodLower = periodMatch.toLowerCase();
          if (periodLower.includes('hour') || periodLower.includes('hr')) {
            period = 'hourly';
          } else if (periodLower.includes('month') || periodLower.includes('mo')) {
            period = 'monthly';
          } else if (periodLower.includes('year') || periodLower.includes('yr') || periodLower.includes('annual')) {
            period = 'yearly';
          }
        }

        // Validate reasonable salary ranges
        if (min > 0 && min < 1000000 && max >= min) {
          return {
            min: Math.round(min),
            max: Math.round(max),
            currency: 'USD',
            period,
          };
        }
      }
    }

    return undefined;
  }

  private detectRemote(text: string): boolean {
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    const remoteIndicators = [
      'remote',
      'work from home',
      'wfh',
      'virtual',
      'distributed',
      'anywhere',
      'fully remote',
      'remote work',
      'work remotely',
      'remote position',
      'remote role',
      'telecommute',
      'telecommuting',
    ];
    
    // Check for negative indicators (hybrid, on-site, etc.)
    const negativeIndicators = [
      'on-site',
      'onsite',
      'on site',
      'office-based',
      'in-office',
      'hybrid (',
      'hybrid:',
      'not remote',
      'no remote',
    ];
    
    // If negative indicators found, likely not fully remote
    if (negativeIndicators.some(indicator => textLower.includes(indicator))) {
      return false;
    }
    
    return remoteIndicators.some(indicator => textLower.includes(indicator));
  }

  parseLinkedIn(document: Document): ParsedJobData {
    const data: ParsedJobData = {
      source: 'linkedin',
      extractedAt: new Date().toISOString(),
    };

    // Title selectors
    const titleSelectors = [
      'h1[data-test-id="job-title"]',
      '.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title-link',
      'h1',
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.title = this.extractTextContent(element);
        data.jobTitle = data.title;
        break;
      }
    }

    // Company selectors
    const companySelectors = [
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
    ];

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.company = this.extractTextContent(element);
        break;
      }
    }

    // Location selectors
    const locationSelectors = [
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__subtitle-item',
    ];

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const locationText = this.extractTextContent(element);
        if (locationText && !locationText.includes('·')) {
          data.location = locationText;
          break;
        }
      }
    }

    // Description selectors
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-description',
      '.jobs-box__html-content',
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.description = this.extractTextContent(element);
        data.jobDescription = data.description;
        break;
      }
    }

    // Extract salary from description
    if (data.description) {
      data.salary = this.extractSalary(data.description);
      data.remote = this.detectRemote(data.description);
    }

    // URL
    data.jobUrl = window.location.href;

    return data;
  }

  parseIndeed(document: Document): ParsedJobData {
    const data: ParsedJobData = {
      source: 'indeed',
      extractedAt: new Date().toISOString(),
    };

    // Title
    const titleElement = document.querySelector('h1[data-testid="job-title"]');
    if (titleElement) {
      data.title = this.extractTextContent(titleElement);
      data.jobTitle = data.title;
    }

    // Company
    const companyElement = document.querySelector('[data-testid="company-name"]');
    if (companyElement) {
      data.company = this.extractTextContent(companyElement);
    }

    // Location
    const locationElement = document.querySelector('[data-testid="job-location"]');
    if (locationElement) {
      data.location = this.extractTextContent(locationElement);
    }

    // Description
    const descriptionElement = document.querySelector('[data-testid="job-description"]');
    if (descriptionElement) {
      data.description = this.extractTextContent(descriptionElement);
      data.jobDescription = data.description;
      
      // Extract salary and remote status
      data.salary = this.extractSalary(data.description);
      data.remote = this.detectRemote(data.description);
    }

    // URL
    data.jobUrl = window.location.href;

    return data;
  }

  parseGeneric(document: Document, hostname: string): ParsedJobData {
    const data: ParsedJobData = {
      source: hostname,
      extractedAt: new Date().toISOString(),
    };

    // Try common selectors
    const titleSelectors = ['h1', '[data-testid="job-title"]', '[data-test="job-title"]', '.job-title'];
    const companySelectors = ['[data-testid="company-name"]', '[data-test="company-name"]', '.company-name'];
    const locationSelectors = ['[data-testid="job-location"]', '[data-test="job-location"]', '.job-location'];
    const descriptionSelectors = ['[data-testid="job-description"]', '[data-test="job-description"]', '.job-description'];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.title = this.extractTextContent(element);
        data.jobTitle = data.title;
        break;
      }
    }

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.company = this.extractTextContent(element);
        break;
      }
    }

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.location = this.extractTextContent(element);
        break;
      }
    }

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        data.description = this.extractTextContent(element);
        data.jobDescription = data.description;
        data.salary = this.extractSalary(data.description);
        data.remote = this.detectRemote(data.description);
        break;
      }
    }

    data.jobUrl = window.location.href;

    return data;
  }

  parseCurrentPage(): ParsedJobData {
    try {
      const hostname = window.location.hostname.toLowerCase();

      if (hostname.includes('linkedin')) {
        return this.parseLinkedIn(document);
      } else if (hostname.includes('indeed')) {
        return this.parseIndeed(document);
      } else {
        return this.parseGeneric(document, hostname);
      }
    } catch (error) {
      console.error('Error parsing job page:', error);
      // Return minimal data on error
      return {
        jobUrl: window.location.href,
        source: window.location.hostname,
        extractedAt: new Date().toISOString(),
      };
    }
  }
  
  // Extract contact information from job description
  extractContacts(description: string): Array<{ name?: string; email?: string; phone?: string }> {
    const contacts: Array<{ name?: string; email?: string; phone?: string }> = [];
    
    if (!description) return contacts;
    
    // Email pattern
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const emails = description.match(emailPattern);
    if (emails) {
      emails.forEach(email => {
        contacts.push({ email: email.trim() });
      });
    }
    
    // Phone pattern (US format: (XXX) XXX-XXXX, XXX-XXX-XXXX, etc.)
    const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    const phones = description.match(phonePattern);
    if (phones) {
      phones.forEach(phone => {
        contacts.push({ phone: phone.trim() });
      });
    }
    
    return contacts;
  }
}

export const jobParser = new JobParser();

