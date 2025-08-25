import { Browser, Page } from 'puppeteer';

// Try to import puppeteer, but don't fail if it's not available
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('Puppeteer not available:', error);
}

export interface JobDetails {
  title: string;
  company: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  description: string;
  requirements?: string[];
  benefits?: string[];
  jobType?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  postedDate?: string;
  applicationDeadline?: string;
  sourceUrl: string;
}

export class JobParserService {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!puppeteer) {
      throw new Error('Puppeteer is not available. Job parsing functionality is disabled.');
    }
    
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });
    }
    return this.browser;
  }

  private async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    return page;
  }

  private async waitForContent(page: Page, timeout: number = 10000): Promise<void> {
    try {
      // Wait for the page to load
      await page.waitForLoadState('networkidle', { timeout });
      
      // Wait for some content to appear
      await page.waitForFunction(() => {
        const body = document.body;
        return body && body.textContent && body.textContent.length > 100;
      }, { timeout });
    } catch (error) {
      console.log('Timeout waiting for content, proceeding anyway...');
    }
  }

  private async extractJobDetails(page: Page, url: string): Promise<JobDetails> {
    // Generic selectors that work across multiple job sites
    const selectors = {
      title: [
        'h1[data-testid="jobsearch-JobInfoHeader-title"]', // Indeed
        'h1.job-title',
        'h1.title',
        'h1',
        '[data-testid="job-title"]',
        '.job-title',
        '.title',
        'h1[class*="title"]',
        'h1[class*="job"]'
      ],
      company: [
        '[data-testid="jobsearch-JobInfoHeader-companyName"]', // Indeed
        '.company-name',
        '.company',
        '[data-testid="company-name"]',
        '.employer',
        '.organization',
        '[class*="company"]',
        '[class*="employer"]'
      ],
      location: [
        '[data-testid="jobsearch-JobInfoHeader-location"]', // Indeed
        '.location',
        '.job-location',
        '[data-testid="location"]',
        '[class*="location"]',
        '.address'
      ],
      salary: [
        '[data-testid="attribute_snippet_compensation"]', // Indeed
        '.salary',
        '.compensation',
        '[data-testid="salary"]',
        '[class*="salary"]',
        '[class*="compensation"]'
      ],
      description: [
        '[data-testid="jobDescriptionText"]', // Indeed
        '.job-description',
        '.description',
        '[data-testid="description"]',
        '.job-details',
        '.details',
        '[class*="description"]',
        '[class*="details"]'
      ]
    };

    // Extract basic information
    const title = await this.extractText(page, selectors.title);
    const company = await this.extractText(page, selectors.company);
    const location = await this.extractText(page, selectors.location);
    const salaryText = await this.extractText(page, selectors.salary);
    const description = await this.extractText(page, selectors.description);

    // Parse salary information
    const salary = this.parseSalary(salaryText);

    // Extract additional information
    const requirements = await this.extractRequirements(page);
    const skills = await this.extractSkills(page);
    const jobType = await this.extractJobType(page);
    const experience = await this.extractExperience(page);
    const education = await this.extractEducation(page);
    const postedDate = await this.extractPostedDate(page);

    return {
      title: title || 'Job Title Not Found',
      company: company || 'Company Not Found',
      location,
      salary,
      description: description || 'Description not available',
      requirements,
      skills,
      jobType,
      experience,
      education,
      postedDate,
      sourceUrl: url
    };
  }

  private async extractText(page: Page, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent?.trim(), element);
          if (text && text.length > 0) {
            return text;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  private parseSalary(salaryText: string | null): JobDetails['salary'] {
    if (!salaryText) return undefined;

    // Common salary patterns
    const patterns = [
      // $50,000 - $80,000 a year
      /\$([\d,]+)\s*-\s*\$([\d,]+)\s*(a year|per year|annually)/i,
      // $50k - $80k
      /\$([\d,]+)k\s*-\s*\$([\d,]+)k/i,
      // $50,000/year
      /\$([\d,]+)\/(year|annum)/i,
      // $50/hour
      /\$([\d,]+)\/hour/i,
      // $50,000
      /\$([\d,]+)/i
    ];

    for (const pattern of patterns) {
      const match = salaryText.match(pattern);
      if (match) {
        const min = parseInt(match[1].replace(/,/g, ''));
        const max = match[2] ? parseInt(match[2].replace(/,/g, '')) : min;
        
        return {
          min,
          max,
          currency: 'USD',
          period: salaryText.includes('hour') ? 'hour' : 'year'
        };
      }
    }

    return undefined;
  }

  private async extractRequirements(page: Page): Promise<string[]> {
    const requirementSelectors = [
      '.requirements',
      '.qualifications',
      '.requirements-list',
      '[data-testid="requirements"]',
      '[class*="requirement"]',
      '[class*="qualification"]'
    ];

    for (const selector of requirementSelectors) {
      try {
        const elements = await page.$$(`${selector} li, ${selector} p`);
        if (elements.length > 0) {
          const requirements = await Promise.all(
            elements.map(el => page.evaluate(e => e.textContent?.trim(), el))
          );
          return requirements.filter(req => req && req.length > 0);
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  private async extractSkills(page: Page): Promise<string[]> {
    const skillSelectors = [
      '.skills',
      '.skills-list',
      '.technologies',
      '[data-testid="skills"]',
      '[class*="skill"]',
      '[class*="technology"]'
    ];

    for (const selector of skillSelectors) {
      try {
        const elements = await page.$$(`${selector} li, ${selector} span, ${selector} div`);
        if (elements.length > 0) {
          const skills = await Promise.all(
            elements.map(el => page.evaluate(e => e.textContent?.trim(), el))
          );
          return skills.filter(skill => skill && skill.length > 0);
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  private async extractJobType(page: Page): Promise<string | null> {
    const typeSelectors = [
      '.job-type',
      '.employment-type',
      '[data-testid="job-type"]',
      '[class*="type"]'
    ];

    return await this.extractText(page, typeSelectors);
  }

  private async extractExperience(page: Page): Promise<string | null> {
    const experienceSelectors = [
      '.experience',
      '.experience-required',
      '[data-testid="experience"]',
      '[class*="experience"]'
    ];

    return await this.extractText(page, experienceSelectors);
  }

  private async extractEducation(page: Page): Promise<string | null> {
    const educationSelectors = [
      '.education',
      '.education-required',
      '[data-testid="education"]',
      '[class*="education"]'
    ];

    return await this.extractText(page, educationSelectors);
  }

  private async extractPostedDate(page: Page): Promise<string | null> {
    const dateSelectors = [
      '.posted-date',
      '.date-posted',
      '[data-testid="posted-date"]',
      '[class*="date"]',
      '[class*="posted"]'
    ];

    return await this.extractText(page, dateSelectors);
  }

  public async parseJobFromUrl(url: string): Promise<JobDetails> {
    const page = await this.createPage();
    
    try {
      console.log(`🌐 Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('⏳ Waiting for content to load...');
      await this.waitForContent(page);

      console.log('🔍 Extracting job details...');
      const jobDetails = await this.extractJobDetails(page, url);

      console.log('✅ Job details extracted successfully');
      return jobDetails;

    } catch (error) {
      console.error('❌ Error parsing job:', error);
      throw new Error(`Failed to parse job from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let jobParserService: JobParserService | null = null;

export const getJobParserService = (): JobParserService => {
  if (!jobParserService) {
    jobParserService = new JobParserService();
  }
  return jobParserService;
};

export const closeJobParserService = async (): Promise<void> => {
  if (jobParserService) {
    await jobParserService.close();
    jobParserService = null;
  }
}; 