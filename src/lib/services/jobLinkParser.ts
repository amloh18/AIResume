export interface ParsedJobData {
  title: string;
  company: string;
  location?: string;
  description?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  requirements?: string[];
  skills?: string[];
  sponsorship?: boolean;
  sourceUrl: string;
}

export class JobLinkParser {
  static async parseJobUrl(url: string): Promise<ParsedJobData> {
    try {
      console.log('🔍 JobLinkParser - Parsing URL:', url);
      
      // Basic validation
      if (!url || !url.startsWith('http')) {
        throw new Error('Invalid URL provided');
      }

      // Extract domain to determine parsing strategy
      const domain = new URL(url).hostname.toLowerCase();
      
      let parsedData: ParsedJobData = {
        title: '',
        company: '',
        sourceUrl: url,
        sponsorship: false
      };

      // Use fallback parsing based on URL patterns
      parsedData = this.fallbackParse(url, domain);

      console.log('✅ JobLinkParser - Parsed data:', parsedData);
      return parsedData;

    } catch (error) {
      console.error('❌ JobLinkParser - Error parsing URL:', error);
      throw new Error('Failed to parse job URL. Please enter job details manually.');
    }
  }

  private static fallbackParse(url: string, domain: string): ParsedJobData {
    const parsedData: ParsedJobData = {
      title: '',
      company: '',
      sourceUrl: url,
      sponsorship: false
    };

    // LinkedIn job parsing
    if (domain.includes('linkedin.com')) {
      const urlParts = url.split('/');
      const jobIndex = urlParts.findIndex(part => part === 'jobs');
      if (jobIndex !== -1 && urlParts[jobIndex + 1]) {
        // Extract job title from URL (basic approach)
        const jobTitlePart = urlParts[jobIndex + 1];
        parsedData.title = jobTitlePart
          .split('-')
          .slice(0, -1) // Remove the job ID at the end
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Indeed job parsing
    if (domain.includes('indeed.com')) {
      const urlParts = url.split('/');
      const jobIndex = urlParts.findIndex(part => part === 'jobs');
      if (jobIndex !== -1 && urlParts[jobIndex + 1]) {
        const jobTitlePart = urlParts[jobIndex + 1];
        parsedData.title = jobTitlePart
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Glassdoor job parsing
    if (domain.includes('glassdoor.com')) {
      const urlParts = url.split('/');
      const jobIndex = urlParts.findIndex(part => part === 'Job');
      if (jobIndex !== -1 && urlParts[jobIndex + 1]) {
        const jobTitlePart = urlParts[jobIndex + 1];
        parsedData.title = jobTitlePart
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Generic company extraction from domain
    if (!parsedData.company) {
      parsedData.company = this.extractCompanyFromDomain(domain);
    }

    return parsedData;
  }

  private static extractCompanyFromDomain(domain: string): string {
    // Remove common subdomains and TLDs
    const company = domain
      .replace(/^www\./, '')
      .replace(/\.com$/, '')
      .replace(/\.co\.uk$/, '')
      .replace(/\.org$/, '')
      .replace(/\.net$/, '')
      .replace(/\.io$/, '')
      .replace(/\.ai$/, '')
      .replace(/\.tech$/, '');

    // Handle job board domains
    if (company.includes('linkedin')) return 'LinkedIn';
    if (company.includes('indeed')) return 'Indeed';
    if (company.includes('glassdoor')) return 'Glassdoor';
    if (company.includes('monster')) return 'Monster';
    if (company.includes('careerbuilder')) return 'CareerBuilder';

    // Capitalize company name
    return company.charAt(0).toUpperCase() + company.slice(1);
  }
}
