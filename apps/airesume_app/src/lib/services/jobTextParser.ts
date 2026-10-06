/**
 * Regex-based job description parser.
 * Extracts structured job data from pasted text without requiring AI/LLM.
 * Returns best-effort extractions; fields may be empty if not found.
 */

export interface ParsedJobFields {
  title: string;
  company: string;
  location: string;
  salary: { min?: number; max?: number; currency?: string; period?: string } | null;
  experience: string;
  jobType: string;
  remote: boolean;
  skills: string[];
  description: string;
  url: string;
}

const SKILL_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'nosql',
  'react', 'react.js', 'reactjs', 'next.js', 'nextjs', 'next', 'vue', 'vue.js', 'vuejs',
  'angular', 'angularjs', 'svelte', 'node.js', 'nodejs', 'node', 'express', 'express.js',
  'django', 'flask', 'fastapi', 'spring', 'spring boot', 'rails', 'ruby on rails',
  'laravel', 'symfony', '.net', 'dotnet', 'asp.net',
  'aws', 'amazon web services', 'gcp', 'google cloud', 'azure', 'docker', 'kubernetes', 'k8s',
  'terraform', 'ansible', 'jenkins', 'ci/cd', 'devops',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'mongo', 'redis', 'elasticsearch', 'dynamodb',
  'graphql', 'rest', 'restful', 'api', 'grpc',
  'machine learning', 'ml', 'deep learning', 'nlp', 'natural language processing',
  'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
  'html', 'css', 'sass', 'less', 'tailwind', 'tailwindcss', 'bootstrap',
  'git', 'github', 'gitlab', 'bitbucket',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
  'jira', 'confluence', 'notion', 'slack', 'linear',
  'linux', 'unix', 'bash', 'shell',
  'agile', 'scrum', 'kanban',
  'blockchain', 'web3', 'solidity', 'ethereum',
  'unity', 'unreal engine', 'game development',
  'ios', 'android', 'flutter', 'react native', 'xamarin',
  'power bi', 'tableau', 'looker', 'snowflake', 'bigquery', 'redshift',
  'spark', 'hadoop', 'kafka', 'airflow', 'dbt',
];

const LOCATION_PATTERNS = [
  // "Location: Bangalore" or "Location: Bangalore, India"
  /(?:location|office|based in|located in|work from|workplace)\s*[:\-–]\s*(.+?)(?:\n|$|\.)/i,
  // "Bangalore, India" or "San Francisco, CA"
  /([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2,})?)/g,
];

const SALARY_PATTERNS = [
  // "$120,000 - $150,000 per year"
  /(?:salary|compensation|pay|ctc|stipend)\s*[:\-–]?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*[-–to]+\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+(year|month|hour|annum|pa|monthly|hourly|yr|hr))?/i,
  // "$120K - $150K"
  /\$?\s*([\d,]+)k\s*[-–to]+\s*\$?\s*([\d,]+)k/i,
  // "₹8-12 LPA" or "₹8,00,000 - ₹12,00,000"
  /₹\s*([\d,]+(?:\.\d+)?)\s*[-–to]+\s*₹\s*([\d,]+(?:\.\d+)?)\s*(?:lpa|lakhs?|per\s+annum)?/i,
  // "8-12 LPA"
  /([\d]+(?:\.\d+)?)\s*[-–to]+\s*([\d]+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i,
  // Single value: "$120,000/year" or "₹10 LPA"
  /(?:salary|compensation|pay)\s*[:\-–]?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:\/|per\s+)(year|month|hour|annum|pa)/i,
];

const EXPERIENCE_PATTERNS = [
  // "5+ years" or "3-5 years of experience"
  /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience)?/i,
  // "Experience: 5 years"
  /experience\s*[:\-–]\s*(\d+)\+?\s*(?:years?|yrs?)/i,
  // "5 to 8 years"
  /(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience)?/i,
  // "Entry Level" / "Senior Level"
  /(entry|junior|mid|senior|lead|principal|staff)\s*(?:level)?/i,
];

const JOB_TYPE_PATTERNS = [
  /\b(full[\s-]?time|ft)\b/i,
  /\b(part[\s-]?time|pt)\b/i,
  /\b(contract|contractor|freelance|consultant)\b/i,
  /\b(internship|intern)\b/i,
  /\b(permanent|fulltime)\b/i,
  /\b(remote)\b/i,
  /\b(hybrid)\b/i,
  /\b(onsite|on[\s-]?site|in[\s-]?office)\b/i,
];

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

function extractTitle(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // First non-empty line is often the title
  if (lines.length > 0) {
    const firstLine = lines[0];
    // If first line is very long, it's probably not a title
    if (firstLine.length < 80) {
      return firstLine.replace(/^["']|["']$/g, '');
    }
  }

  // Try to find a title-like line
  for (const line of lines.slice(0, 5)) {
    if (line.length < 60 && !line.match(/^(location|salary|experience|company|about|we are|join|looking)/i)) {
      return line.replace(/^["']|["']$/g, '');
    }
  }

  return '';
}

function extractCompany(text: string): string {
  // "Company: Acme Corp" or "at Acme Corp" or "About Acme Corp"
  const patterns = [
    /(?:company|organization|employer)\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /(?:at|for)\s+([A-Z][A-Za-z\s&.]+?)(?:\n|,|\(|\.)/,
    /(?:about)\s+([A-Z][A-Za-z\s&.]+?)(?:\n|\()/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 1 && company.length < 60) {
        return company;
      }
    }
  }

  // Look for a line that looks like a company name (short, capitalized, no common job words)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const jobWords = /^(job|role|position|location|salary|experience|about|requirements|qualifications|responsibilities|benefits|apply|description|we are|looking|join|the|our)/i;

  for (const line of lines.slice(0, 8)) {
    if (line.length > 1 && line.length < 40 && !jobWords.test(line) && /^[A-Z]/.test(line)) {
      return line;
    }
  }

  return '';
}

function extractLocation(text: string): string {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const loc = match[1].trim();
      if (loc.length > 1 && loc.length < 80) {
        return loc;
      }
    }
  }
  return '';
}

function extractSalary(text: string): ParsedJobFields['salary'] {
  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const min = parseFloat((match[1] || '').replace(/,/g, ''));
      const max = parseFloat((match[2] || '').replace(/,/g, ''));
      if (!isNaN(min) || !isNaN(max)) {
        const periodMatch = (match[3] || match[0] || '').toLowerCase();
        let period = 'yearly';
        if (periodMatch.includes('month')) period = 'monthly';
        else if (periodMatch.includes('hour')) period = 'hourly';

        let currency = 'USD';
        if (text.includes('₹') || text.toLowerCase().includes('inr') || text.toLowerCase().includes('lpa') || text.toLowerCase().includes('lakhs')) {
          currency = 'INR';
        } else if (text.includes('£') || text.toLowerCase().includes('gbp')) {
          currency = 'GBP';
        } else if (text.includes('€') || text.toLowerCase().includes('eur')) {
          currency = 'EUR';
        }

        return {
          min: isNaN(min) ? undefined : min,
          max: isNaN(max) ? undefined : max,
          currency,
          period,
        };
      }
    }
  }
  return null;
}

function extractExperience(text: string): string {
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1]}-${match[2]} years`;
      }
      if (match[1] && isNaN(parseInt(match[1]))) {
        return match[1]; // "senior", "entry", etc.
      }
      if (match[1]) {
        return `${match[1]}+ years`;
      }
    }
  }
  return '';
}

function extractJobType(text: string): string {
  const types: string[] = [];
  for (const pattern of JOB_TYPE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      types.push(match[1].toLowerCase());
    }
  }
  return types.join(', ') || 'full-time';
}

function extractRemote(text: string): boolean {
  return /\b(remote|work from home|wfh|distributed|anywhere)\b/i.test(text);
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) {
      found.push(skill);
    }
  }
  return [...new Set(found)];
}

function extractUrl(text: string): string {
  const matches = text.match(URL_PATTERN);
  if (matches && matches.length > 0) {
    // Prefer job-board URLs
    const jobBoardUrl = matches.find((u) =>
      /linkedin|indeed|naukri|glassdoor|greenhouse|lever|workable|ashby|adzuna|ziprecruiter|monster|wellfound/i.test(u)
    );
    return jobBoardUrl || matches[0];
  }
  return '';
}

function cleanDescription(text: string): string {
  return text
    .replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

/**
 * Parse a job description text using regex patterns.
 * No AI/LLM required — works instantly.
 */
export function parseJobText(text: string): ParsedJobFields {
  if (!text || !text.trim()) {
    return {
      title: '',
      company: '',
      location: '',
      salary: null,
      experience: '',
      jobType: 'full-time',
      remote: false,
      skills: [],
      description: '',
      url: '',
    };
  }

  return {
    title: extractTitle(text),
    company: extractCompany(text),
    location: extractLocation(text),
    salary: extractSalary(text),
    experience: extractExperience(text),
    jobType: extractJobType(text),
    remote: extractRemote(text),
    skills: extractSkills(text),
    description: cleanDescription(text),
    url: extractUrl(text),
  };
}
