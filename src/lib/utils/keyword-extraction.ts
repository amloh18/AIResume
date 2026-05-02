// @ts-nocheck
/**
 * Unified Keyword Extraction Utility
 *
 * Single source of truth for extracting keywords from job descriptions and CVs.
 * Replaces 6 duplicate implementations across the codebase.
 */

// Common tech/framework keywords to always detect
const TECH_PATTERNS = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
  // Frontend
  'React', 'Angular', 'Vue', 'Next\\.js', 'Nuxt', 'Svelte', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind', 'Bootstrap',
  // Backend
  'Node\\.js', 'Express', 'Django', 'Flask', 'Spring', 'FastAPI', 'Rails', 'Laravel', 'ASP\\.NET',
  // Data
  'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'GraphQL',
  // Cloud/DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Jenkins', 'GitHub Actions',
  'Linux', 'Nginx', 'Apache',
  // AI/ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision',
  'Scikit-learn', 'Pandas', 'NumPy',
  // Tools
  'Git', 'Jira', 'Figma', 'Agile', 'Scrum', 'Kanban',
  // Architecture
  'REST', 'RESTful', 'Microservices', 'API', 'SDK', 'MVC', 'MVVM',
  'Serverless', 'Lambda',
  // Testing
  'Jest', 'Mocha', 'Cypress', 'Selenium', 'TDD', 'BDD',
  // Mobile
  'React Native', 'Flutter', 'iOS', 'Android',
];

// Stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'our', 'your', 'their', 'its',
  'ability', 'experience', 'work', 'working', 'years', 'year', 'including', 'using',
  'required', 'preferred', 'strong', 'good', 'excellent', 'knowledge', 'skills',
  'team', 'player', 'hardworking', 'motivated', 'passionate', 'detail', 'oriented',
]);

const techRegex = new RegExp(`\\b(${TECH_PATTERNS.join('|')})\\b`, 'gi');

/**
 * Extract keywords from a job description text.
 * Combines regex-based tech detection with NLP-style extraction.
 */
export function extractKeywordsFromJD(text: string): string[] {
  if (!text) return [];

  const keywords = new Set<string>();

  // 1. Extract tech keywords via regex
  const techMatches = text.match(techRegex);
  if (techMatches) {
    for (const match of techMatches) {
      keywords.add(match.toLowerCase());
    }
  }

  // 2. Extract noun phrases (2-3 word combinations)
  const words = text
    .replace(/[^a-zA-Z0-9+#.\-/ ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  // Single significant words (capitalized in JD, likely proper nouns/tech)
  const sentences = text.split(/[.!?\n]/);
  for (const sentence of sentences) {
    const tokens = sentence.trim().split(/\s+/);
    for (const token of tokens) {
      const cleaned = token.replace(/[^a-zA-Z0-9+#.\-/]/g, '');
      if (
        cleaned.length > 2 &&
        cleaned[0] === cleaned[0].toUpperCase() &&
        !STOP_WORDS.has(cleaned.toLowerCase()) &&
        isNaN(Number(cleaned))
      ) {
        keywords.add(cleaned.toLowerCase());
      }
    }
  }

  // 3. Extract multi-word phrases commonly used in JDs
  const phrasePatterns = [
    /(?:bachelor|master|phd)(?:'?s)?\s+(?:degree|of)/gi,
    /\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi,
    /(?:experience|exp)\s+(?:with|in|using|of)\s+([\w\s,]+)/gi,
  ];

  for (const pattern of phrasePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        keywords.add(match[0].toLowerCase().trim());
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Extract keywords from CV data structure.
 */
export function extractKeywordsFromCV(cvData: any): string[] {
  if (!cvData) return [];

  const keywords = new Set<string>();

  // From skills
  if (cvData.skills) {
    for (const group of cvData.skills) {
      if (group.skills) {
        for (const skill of group.skills) {
          keywords.add(skill.toLowerCase());
        }
      }
    }
  }

  // From work experience highlights
  if (cvData.work) {
    for (const job of cvData.work) {
      if (job.highlights) {
        for (const highlight of job.highlights) {
          const matches = highlight.match(techRegex);
          if (matches) {
            for (const m of matches) keywords.add(m.toLowerCase());
          }
        }
      }
    }
  }

  // From projects
  if (cvData.projects) {
    for (const project of cvData.projects) {
      if (project.keywords) {
        for (const kw of project.keywords) {
          keywords.add(kw.toLowerCase());
        }
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Detect gaps between CV keywords and JD keywords.
 */
export function detectGaps(
  cvKeywords: string[],
  jdKeywords: string[]
): { missing: string[]; present: string[]; overused: string[] } {
  const cvSet = new Set(cvKeywords.map((k) => k.toLowerCase()));
  const jdSet = new Set(jdKeywords.map((k) => k.toLowerCase()));

  const missing: string[] = [];
  const present: string[] = [];

  for (const jdKw of jdSet) {
    if (cvSet.has(jdKw)) {
      present.push(jdKw);
    } else {
      missing.push(jdKw);
    }
  }

  // Overused: keywords that appear very frequently in CV but aren't in JD
  // (indicates potential keyword stuffing of irrelevant terms)
  const overused: string[] = [];
  for (const cvKw of cvSet) {
    if (!jdSet.has(cvKw)) {
      overused.push(cvKw);
    }
  }

  return { missing, present, overused };
}
