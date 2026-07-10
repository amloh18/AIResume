import { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
  richData?: any;
}

/**
 * Utility to repair truncated or invalid JSON strings returned by LLM
 */
function repairTruncatedJson(str: string): string {
  str = str.trim();
  
  // Try parsing first
  try {
    JSON.parse(str);
    return str;
  } catch (_) {}

  // 1. Handle unclosed string
  let quotesCount = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
      quotesCount++;
    }
  }
  if (quotesCount % 2 !== 0) {
    str += '"';
  }

  // 2. Clear out any trailing commas or half-written object keys/values that will break JSON
  let prevStr = "";
  while (str !== prevStr) {
    prevStr = str;
    str = str.trim()
      .replace(/,\s*$/, '') // trailing comma
      .replace(/:\s*$/, '') // trailing colon
      .replace(/,\s*"\w*"\s*$/, '') // incomplete property key
      .replace(/,\s*\{\s*$/, '') // incomplete object
      .replace(/,\s*\[\s*$/, ''); // incomplete array
  }

  // 3. Track braces and brackets
  const stack: string[] = [];
  let inString = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      stack.push('{');
    } else if (char === '[') {
      stack.push('[');
    } else if (char === '}') {
      if (stack[stack.length - 1] === '{') {
        stack.pop();
      }
    } else if (char === ']') {
      if (stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  // 4. Close remaining structural brackets
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === '{') {
      str = str.trim().replace(/,\s*$/, '');
      str += '}';
    } else if (current === '[') {
      str = str.trim().replace(/,\s*$/, '');
      str += ']';
    }
  }

  return str;
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
    if (!this.browser) {
      throw new Error('Browser not initialized');
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
      await page.waitForNavigation({ timeout });
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout });
      
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
      location: location || undefined,
      salary,
      description: description || 'Description not available',
      requirements,
      skills,
      jobType: jobType || undefined,
      experience: experience || undefined,
      education: education || undefined,
      postedDate: postedDate || undefined,
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

  /**
   * Parse job description text using LLM (Gemini)
   * Extracts structured job data from raw text or URL
   */
  public async parseJobDescription(
    textOrUrl: string,
    isUrl: boolean = false
  ): Promise<JobDetails> {
    try {
      let jobText = textOrUrl;
      
      // If URL, try to fetch content first
      if (isUrl) {
        try {
          const page = await this.createPage();
          await page.goto(textOrUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          await this.waitForContent(page);
          jobText = await page.evaluate(() => document.body.innerText);
          await page.close();
        } catch (error) {
          console.warn('Failed to fetch URL, using LLM parsing directly:', error);
          // Continue with URL as text for LLM to parse
        }
      }

      const { callAIWithFallback } = await import('@/lib/utils/ai-api-helper');
      const systemPrompt = `You are an expert job description analyst. Extracts structured data from any JD, however vague. Keep all text fields, descriptions, and list items extremely concise (under 120 characters each) to fit output token limits. Return ONLY valid JSON, no markdown, no code fences. Fill in all fields, handling missing information gracefully by setting defaults or marked as unknown.`;
      
      let userPrompt = '';
      try {
        const filePath = path.join(process.cwd(), 'public/job_refine.md');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const sectionHeader = '## full job details extraction prompt';
        if (fileContent.includes(sectionHeader)) {
          const index = fileContent.indexOf(sectionHeader);
          let rawPrompt = fileContent.substring(index + sectionHeader.length).trim();
          
          // Extract the double-quoted string containing the prompt block
          const firstQuote = rawPrompt.indexOf('"');
          const lastQuote = rawPrompt.lastIndexOf('"');
          if (firstQuote !== -1 && lastQuote !== -1 && firstQuote < lastQuote) {
            rawPrompt = rawPrompt.substring(firstQuote + 1, lastQuote);
          }
          
          // Replace placeholders
          userPrompt = rawPrompt
            .replace('{{RAW_JD}}', jobText)
            .replace('{{SOURCE_URL}}', isUrl ? textOrUrl : 'manual')
            .replace('{{MASTER_CV_DATA}}', 'None provided');
        } else {
          throw new Error('Could not find full job details extraction prompt section in job_refine.md');
        }
      } catch (fileError) {
        console.error('Failed to load dynamic job parse prompt from file, using fallback:', fileError);
        userPrompt = `Extract structured job data from the following job description: ${jobText}`;
      }
 
      const result = await callAIWithFallback({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.1,
        maxTokens: 8192, // Use model maximum to prevent truncation issues
        responseMimeType: 'application/json'
      });
 
      if (!result || !result.content) {
        throw new Error('AI API returned empty or invalid response');
      }
  
      let jsonText = result.content;
      jsonText = jsonText
        .replace(/```json[\s\S]*?\n/g, '')
        .replace(/```[\s\S]*?\n/g, '')
        .replace(/```/g, '')
        .trim();
      
      let parsed: any;
      try {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object boundaries found in response');
        }
        
        // Apply JSON repair to handle potential truncation gracefully
        const repairedJson = repairTruncatedJson(jsonMatch[0]);
        parsed = JSON.parse(repairedJson);
      } catch (parseErr) {
        console.error('Failed parsing, attempting aggressive repair. Raw text:', jsonText);
        try {
          const repairedJson = repairTruncatedJson(jsonText);
          parsed = JSON.parse(repairedJson);
        } catch (innerErr) {
          console.error('Could not repair JSON at all:', innerErr);
          throw innerErr;
        }
      }
      
      // Store rich data under a custom symbol or return as part of the object
      const mappedDetails: JobDetails = {
        title: parsed.role?.job_title?.value || parsed.tracker_enrichment?.tracker_card_data?.display_title || '',
        company: parsed.company?.company_name?.value || parsed.tracker_enrichment?.tracker_card_data?.display_company || '',
        location: parsed.location?.location_raw || parsed.tracker_enrichment?.tracker_card_data?.display_location || undefined,
        salary: parsed.compensation ? {
          min: parsed.compensation.salary_min || parsed.compensation.salary_min_inferred || undefined,
          max: parsed.compensation.salary_max || parsed.compensation.salary_max_inferred || undefined,
          currency: parsed.compensation.salary_currency || 'USD',
          period: parsed.compensation.salary_period === 'annual' ? 'year' : parsed.compensation.salary_period === 'monthly' ? 'month' : parsed.compensation.salary_period === 'hourly' ? 'hour' : 'year'
        } : undefined,
        description: jobText,
        requirements: (parsed.role_content?.requirements_must_have || []).map((r: any) => r.text)
          .concat((parsed.role_content?.requirements_nice_to_have || []).map((r: any) => r.text)),
        benefits: (parsed.compensation?.benefits || []).map((b: any) => b.detail || b.category),
        jobType: parsed.employment_terms?.employment_type?.value || undefined,
        experience: parsed.role?.seniority_level?.value || undefined,
        education: parsed.skills?.education_requirements?.degree_level || undefined,
        skills: (parsed.skills?.skills_technical || []).map((s: any) => s.skill),
        postedDate: parsed.application_info?.posting_date || undefined,
        applicationDeadline: parsed.application_info?.application_deadline || undefined,
        sourceUrl: parsed.application_info?.apply_url || (isUrl ? textOrUrl : 'manual'),
        richData: parsed // Include the entire structured result
      };

      return mappedDetails;
    } catch (error) {
      console.error('Error parsing job description with LLM:', error);
      throw new Error(`Failed to parse job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
