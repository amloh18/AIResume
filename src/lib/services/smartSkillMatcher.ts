'use strict';

/**
 * Smart Skill Matcher
 * Comprehensive skill matching with:
 * - Semantic matching (exact, dictionary, fuzzy)
 * - Skill category weighting (critical, important, nice-to-have)
 * - Skill gap analysis (what user has vs what JD needs)
 * - Role family matching (flexible title matching)
 * - Coverage scoring (not just 1-2 skills, but overall fit)
 */

import { checkSemanticMatch, normalizeForMatching } from './semantic-matcher-service';

// ── Skill categories with default weights ──────────────────────────────────
export const SKILL_CATEGORIES = {
  CORE: { weight: 1.0, label: 'Core / Required' },
  IMPORTANT: { weight: 0.7, label: 'Important' },
  NICE_TO_HAVE: { weight: 0.4, label: 'Nice to Have' },
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORIES;

// ── Role families for flexible title matching ──────────────────────────────
const ROLE_FAMILIES: Record<string, string[]> = {
  software_engineer: [
    'software engineer', 'software developer', 'sr. software engineer', 'senior software engineer',
    'staff software engineer', 'principal software engineer', 'lead software engineer',
    'full stack developer', 'full stack engineer', 'full-stack developer', 'full-stack engineer',
    'backend developer', 'backend engineer', 'frontend developer', 'frontend engineer',
    'web developer', 'app developer', 'applications developer',
  ],
  data_scientist: [
    'data scientist', 'senior data scientist', 'staff data scientist',
    'machine learning engineer', 'ml engineer', 'ai engineer',
    'data analyst', 'senior data analyst', 'analytics engineer',
    'research scientist', 'applied scientist',
  ],
  product_manager: [
    'product manager', 'senior product manager', 'staff product manager',
    'product owner', 'group product manager', 'director of product',
    'technical product manager', 'product lead',
  ],
  designer: [
    'ui designer', 'ux designer', 'product designer', 'senior designer',
    'ux/ui designer', 'visual designer', 'interaction designer',
    'design lead', 'head of design', 'creative director',
  ],
  devops: [
    'devops engineer', 'site reliability engineer', 'sre',
    'platform engineer', 'infrastructure engineer', 'cloud engineer',
    'systems engineer', 'release engineer',
  ],
  data_engineer: [
    'data engineer', 'senior data engineer', 'etl developer',
    'analytics engineer', 'data platform engineer',
  ],
  project_manager: [
    'project manager', 'senior project manager', 'program manager',
    'scrum master', 'delivery manager', 'engagement manager',
  ],
  marketing: [
    'marketing manager', 'digital marketing', 'growth marketer',
    'content marketer', 'seo specialist', 'marketing specialist',
    'brand manager', 'performance marketer',
  ],
  sales: [
    'sales manager', 'account executive', 'account manager',
    'business development', 'sales representative', 'sales lead',
    'enterprise sales', 'solutions consultant',
  ],
  qa: [
    'qa engineer', 'quality assurance', 'test engineer',
    'sdet', 'automation engineer', 'qa lead', 'qa analyst',
  ],
  security: [
    'security engineer', 'cybersecurity', 'information security',
    'application security', 'security analyst', 'penetration tester',
  ],
};

// ── Expanded synonym dictionary for skill matching ─────────────────────────
const SKILL_SYNONYMS: Record<string, string[]> = {
  // Languages
  'javascript': ['javascript', 'js', 'ecmascript', 'es6', 'es2015', 'es2020'],
  'typescript': ['typescript', 'ts'],
  'python': ['python', 'py', 'pandas', 'numpy', 'scipy', 'django', 'flask', 'fastapi'],
  'java': ['java', 'spring', 'spring boot', 'spring framework', 'jvm'],
  'go': ['golang', 'go', 'go lang'],
  'rust': ['rust', 'rustlang'],
  'c++': ['c++', 'cpp', 'c plus plus', 'cxx'],
  'c#': ['c#', 'csharp', 'c sharp', 'dotnet', '.net', '.net core'],
  'ruby': ['ruby', 'ruby on rails', 'rails', 'ror'],
  'php': ['php', 'laravel', 'symfony'],
  'swift': ['swift', 'swiftui'],
  'kotlin': ['kotlin', 'kotlin multiplatform'],
  'scala': ['scala', 'akka', 'spark'],
  'r': ['r programming', 'r language', 'r studio'],

  // Frontend
  'react': ['react', 'reactjs', 'react.js', 'redux', 'next.js', 'nextjs', 'remix'],
  'vue': ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs', 'vuex', 'pinia'],
  'angular': ['angular', 'angularjs', 'angular.js', 'ng', 'rxjs'],
  'svelte': ['svelte', 'sveltekit'],
  'html': ['html', 'html5', 'hypertext markup'],
  'css': ['css', 'css3', 'cascading style sheets', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'styled-components', 'css modules'],
  'next.js': ['next.js', 'nextjs', 'next', 'app router', 'pages router'],

  // Backend
  'node.js': ['node.js', 'nodejs', 'node', 'express', 'express.js', 'fastify', 'nestjs'],
  'django': ['django', 'django rest framework', 'drf'],
  'flask': ['flask', 'flask-restful'],
  'ruby on rails': ['ruby on rails', 'rails', 'ror'],
  'spring': ['spring', 'spring boot', 'spring framework', 'spring mvc', 'spring security'],
  'graphql': ['graphql', 'graphql', 'apollo', 'relay', 'gql'],
  'rest': ['rest', 'restful', 'rest api', 'restful api', 'rest apis', 'web api'],

  // Databases
  'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'mssql', 'microsoft sql server', 'sql server', 'oracle', 'mariadb', 'sqlite'],
  'nosql': ['nosql', 'non-relational', 'document database'],
  'mongodb': ['mongodb', 'mongo', 'mongoose'],
  'postgresql': ['postgresql', 'postgres', 'psql', 'pg'],
  'redis': ['redis', 'redis cache', 'redis cluster'],
  'elasticsearch': ['elasticsearch', 'elastic', 'kibana', 'elastic stack', 'opensearch'],
  'dynamodb': ['dynamodb', 'dynamo'],
  'cassandra': ['cassandra', 'cassandra db'],
  'firebase': ['firebase', 'firestore', 'firebase realtime database'],

  // Cloud & DevOps
  'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation', 'ecs', 'eks', 'rds', 'dynamodb', 'sqs', 'sns', 'cloudwatch'],
  'azure': ['azure', 'microsoft azure', 'azure devops', 'azure functions', 'azure kubernetes'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform', 'bigquery', 'cloud run', 'cloud functions', 'gke'],
  'docker': ['docker', 'docker compose', 'dockerfile', 'containerization'],
  'kubernetes': ['kubernetes', 'k8s', 'helm', 'istio', 'kustomize'],
  'ci/cd': ['ci/cd', 'ci cd', 'continuous integration', 'continuous deployment', 'continuous delivery', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis ci', 'argocd', 'flux'],
  'terraform': ['terraform', 'infrastructure as code', 'iac', 'pulumi'],
  'linux': ['linux', 'ubuntu', 'centos', 'red hat', 'rhel', 'debian', 'bash', 'shell scripting', 'shell script'],

  // Data & ML
  'machine learning': ['machine learning', 'ml', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'scikit-learn', 'sklearn', 'keras', 'xgboost', 'lightgbm'],
  'data science': ['data science', 'data scientist', 'statistical analysis', 'hypothesis testing', 'a/b testing'],
  'data engineering': ['data engineering', 'etl', 'data pipeline', 'apache spark', 'spark', 'kafka', 'airflow', 'dbt', 'snowflake', 'databricks'],
  'ai': ['ai', 'artificial intelligence', 'nlp', 'natural language processing', 'computer vision', 'llm', 'large language model', 'generative ai', 'gen ai'],
  'analytics': ['analytics', 'data analysis', 'data analytics', 'business intelligence', 'bi', 'tableau', 'power bi', 'looker'],

  // Tools & Practices
  'git': ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'source control'],
  'agile': ['agile', 'scrum', 'kanban', 'sprint', 'sprint planning', 'jira', 'atlassian'],
  'testing': ['testing', 'unit testing', 'integration testing', 'e2e testing', 'end-to-end testing', 'cypress', 'playwright', 'jest', 'mocha', 'pytest', 'junit', 'test driven development', 'tdd', 'bdd', 'test automation'],
  'microservices': ['microservices', 'micro-service', 'service oriented architecture', 'soa', 'distributed systems'],
  'api': ['api', 'rest api', 'restful api', 'web api', 'grpc', 'websocket', 'websockets'],
  'security': ['security', 'authentication', 'authorization', 'oauth', 'oauth2', 'jwt', 'ssl', 'tls', 'encryption', 'owasp', 'xss', 'csrf', 'sql injection'],

  // Soft skills
  'leadership': ['leadership', 'leading teams', 'team lead', 'tech lead', 'engineering manager', 'managing', 'mentoring', 'mentoring engineers'],
  'communication': ['communication', 'presenting', 'public speaking', 'negotiation', 'stakeholder management', 'interpersonal skills', 'written communication', 'verbal communication'],
  'problem solving': ['problem solving', 'problem-solving', 'analytical skills', 'critical thinking', 'troubleshooting'],
  'project management': ['project management', 'managing projects', 'pm', 'program management', 'delivery management', 'roadmap planning'],
  'teamwork': ['teamwork', 'collaboration', 'cross-functional', 'cross-functional collaboration', 'team player'],
};

// ── Core matching functions ────────────────────────────────────────────────

/**
 * Extract all skills from a CV's UnifiedCVDataStructure
 * Returns flattened, normalized skill strings
 */
export function extractUserSkills(cvData: any): string[] {
  const skills = new Set<string>();

  // From skills section (array of { category, skills: string[] })
  if (Array.isArray(cvData.skills)) {
    for (const cat of cvData.skills) {
      if (cat.name) skills.add(cat.name.toLowerCase());
      if (cat.keywords) {
        for (const kw of cat.keywords) skills.add(kw.toLowerCase());
      }
      if (Array.isArray(cat.skills)) {
        for (const s of cat.skills) skills.add(s.toLowerCase());
      }
    }
  }

  // From work experience highlights
  if (Array.isArray(cvData.work)) {
    for (const exp of cvData.work) {
      if (exp.summary) {
        const terms = extractTechTerms(exp.summary);
        for (const t of terms) skills.add(t);
      }
      if (Array.isArray(exp.highlights)) {
        for (const h of exp.highlights) {
          const terms = extractTechTerms(h);
          for (const t of terms) skills.add(t);
        }
      }
    }
  }

  // Legacy field name support
  if (Array.isArray(cvData.experience)) {
    for (const exp of cvData.experience) {
      if (exp.summary) {
        const terms = extractTechTerms(exp.summary);
        for (const t of terms) skills.add(t);
      }
      if (Array.isArray(exp.highlights)) {
        for (const h of exp.highlights) {
          const terms = extractTechTerms(h);
          for (const t of terms) skills.add(t);
        }
      }
    }
  }

  // From projects
  if (Array.isArray(cvData.projects)) {
    for (const proj of cvData.projects) {
      if (Array.isArray(proj.keywords)) {
        for (const kw of proj.keywords) skills.add(kw.toLowerCase());
      }
      if (Array.isArray(proj.highlights)) {
        for (const h of proj.highlights) {
          const terms = extractTechTerms(h);
          for (const t of terms) skills.add(t);
        }
      }
    }
  }

  // From education courses
  if (Array.isArray(cvData.education)) {
    for (const edu of cvData.education) {
      if (Array.isArray(edu.courses)) {
        for (const c of edu.courses) skills.add(c.toLowerCase());
      }
    }
  }

  return Array.from(skills);
}

/**
 * Extract tech terms from a text string
 */
function extractTechTerms(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeForMatching(text);
  const terms = new Set<string>();

  // Check all known skill synonyms
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    for (const syn of synonyms) {
      if (normalized.includes(syn)) {
        terms.add(canonical);
        break;
      }
    }
  }

  return Array.from(terms);
}

/**
 * Extract skills/keywords from a job description or job listing
 */
export function extractJobSkills(job: {
  description?: string;
  keywords?: string[];
  title?: string;
}): string[] {
  const skills = new Set<string>();

  // From keywords array
  if (Array.isArray(job.keywords)) {
    for (const kw of job.keywords) skills.add(kw.toLowerCase());
  }

  // From description text
  if (job.description) {
    const terms = extractTechTerms(job.description);
    for (const t of terms) skills.add(t);
  }

  // From title (extract role-relevant terms)
  if (job.title) {
    const terms = extractTechTerms(job.title);
    for (const t of terms) skills.add(t);
  }

  return Array.from(skills);
}

// ── Skill matching ─────────────────────────────────────────────────────────

export interface SkillMatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  matchCount: number;
  missingCount: number;
  totalJobSkills: number;
  totalUserSkills: number;
  matchRatio: number;        // % of JD skills the user has (0-1)
  coverageRatio: number;     // % of user skills that match the JD (0-1)
  matchScore: number;        // Weighted composite score (0-100)
  matchedDetails: Array<{
    jobSkill: string;
    userSkill?: string;
    confidence: number;
    matchType: 'exact' | 'dictionary' | 'fuzzy' | 'none';
  }>;
}

/**
 * Match user skills against job skills using semantic matching
 * Returns comprehensive match results
 */
export function matchSkills(
  userSkills: string[],
  jobSkills: string[]
): SkillMatchResult {
  const matchedSkills = new Set<string>();
  const missingSkills = new Set<string>(jobSkills);
  const matchedDetails: SkillMatchResult['matchedDetails'] = [];

  // Build a single text blob of all user skills for matching
  const userSkillsText = userSkills.join(' ');

  for (const jobSkill of jobSkills) {
    const result = checkSemanticMatch(jobSkill, userSkillsText);

    if (result.matched) {
      matchedSkills.add(jobSkill);
      missingSkills.delete(jobSkill);
      matchedDetails.push({
        jobSkill,
        userSkill: result.foundTerm,
        confidence: result.confidenceScore,
        matchType: result.matchType,
      });
    } else {
      matchedDetails.push({
        jobSkill,
        matchType: 'none',
        confidence: 0,
      });
    }
  }

  const matchCount = matchedSkills.size;
  const missingCount = missingSkills.size;
  const totalJobSkills = jobSkills.length;
  const totalUserSkills = userSkills.length;

  // What % of JD skills does the user have?
  const matchRatio = totalJobSkills > 0 ? matchCount / totalJobSkills : 0.5;

  // What % of user skills are relevant to this job?
  const coverageRatio = totalUserSkills > 0 ? matchCount / Math.min(totalUserSkills, totalJobSkills * 2) : 0.5;

  // Weighted match score: prioritize matchRatio but factor in coverage
  // If user has 8/10 JD skills = 80%, but also has 20 other skills that match = bonus
  const matchScore = Math.round(
    (matchRatio * 70 + coverageRatio * 30) * 100
  );

  return {
    matchedSkills: Array.from(matchedSkills),
    missingSkills: Array.from(missingSkills),
    matchCount,
    missingCount,
    totalJobSkills,
    totalUserSkills,
    matchRatio,
    coverageRatio,
    matchScore: Math.min(100, Math.max(0, matchScore)),
    matchedDetails,
  };
}

// ── Role title matching ────────────────────────────────────────────────────

export interface TitleMatchResult {
  score: number;
  matchType: 'exact' | 'family' | 'related' | 'none';
  matchedFamily?: string;
}

/**
 * Match job title against user's preferred titles using role families
 * Returns a score 0-100
 */
export function matchTitles(
  userTitles: string[],
  jobTitle: string
): TitleMatchResult {
  const normalizedJob = jobTitle.toLowerCase().trim();
  const normalizedUserTitles = userTitles.map((t) => t.toLowerCase().trim());

  // 1. Exact substring match (highest confidence)
  for (const userTitle of normalizedUserTitles) {
    if (normalizedJob.includes(userTitle) || userTitle.includes(normalizedJob)) {
      return { score: 100, matchType: 'exact' };
    }
  }

  // 2. Role family match
  for (const [family, roles] of Object.entries(ROLE_FAMILIES)) {
    const jobInFamily = roles.some((r) => normalizedJob.includes(r));
    const userInFamily = normalizedUserTitles.some((ut) =>
      roles.some((r) => ut.includes(r))
    );

    if (jobInFamily && userInFamily) {
      // Both are in the same role family — high match
      return { score: 85, matchType: 'family', matchedFamily: family };
    }

    if (jobInFamily || userInFamily) {
      // One is in the family — moderate match
      return { score: 60, matchType: 'related', matchedFamily: family };
    }
  }

  // 3. Word-level overlap (partial credit)
  const jobWords = new Set(normalizedJob.split(/\s+/));
  const userWords = new Set(normalizedUserTitles.flatMap((t) => t.split(/\s+/)));
  const overlap = Array.from(jobWords).filter((w) => w.length > 2 && userWords.has(w));

  if (overlap.length > 0) {
    const ratio = overlap.length / Math.max(jobWords.size, 1);
    return { score: Math.round(40 + ratio * 30), matchType: 'related' };
  }

  // 4. Semantic similarity via Levenshtein
  for (const userTitle of normalizedUserTitles) {
    const words1 = userTitle.split(/\s+/);
    const words2 = normalizedJob.split(/\s+/);
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1.length > 3 && w2.length > 3) {
          const dist = Math.abs(w1.length - w2.length); // simplified
          if (dist <= 2 && w1.slice(0, 3) === w2.slice(0, 3)) {
            return { score: 50, matchType: 'related' };
          }
        }
      }
    }
  }

  return { score: 25, matchType: 'none' };
}

// ── Composite scoring ──────────────────────────────────────────────────────

export interface SmartMatchResult {
  overallScore: number;
  skillMatch: SkillMatchResult;
  titleMatch: TitleMatchResult;
  breakdown: {
    skills: number;    // 0-100
    title: number;     // 0-100
    location: number;  // 0-100
    recency: number;   // 0-100
  };
}

/**
 * Compute a smart match score combining skill matching + title matching
 * Used by both the bulk discovery pipeline and the detailed match endpoint
 */
export function computeSmartMatch(
  userSkills: string[],
  jobSkills: string[],
  userTitles: string[],
  jobTitle: string,
  jobLocation: string,
  userLocations: string[],
  jobRemote: boolean,
  userRemoteOnly: boolean,
  postedDate?: Date
): SmartMatchResult {
  const skillMatch = matchSkills(userSkills, jobSkills);
  const titleMatch = matchTitles(userTitles, jobTitle);

  // Location score
  let locationScore = 50;
  if (userRemoteOnly && jobRemote) locationScore = 100;
  else if (userRemoteOnly && !jobRemote) locationScore = 10;
  else if (jobRemote) locationScore = 90;
  else {
    const normalizedJobLoc = jobLocation.toLowerCase();
    if (userLocations.some((l) => normalizedJobLoc.includes(l.toLowerCase()))) {
      locationScore = 100;
    }
  }

  // Recency score
  let recencyScore = 50;
  if (postedDate) {
    const daysSince = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) recencyScore = 100;
    else if (daysSince <= 3) recencyScore = 90;
    else if (daysSince <= 7) recencyScore = 80;
    else if (daysSince <= 14) recencyScore = 65;
    else if (daysSince <= 30) recencyScore = 45;
    else recencyScore = 25;
  }

  const overallScore = Math.round(
    skillMatch.matchScore * 0.4 +
    titleMatch.score * 0.3 +
    locationScore * 0.2 +
    recencyScore * 0.1
  );

  return {
    overallScore: Math.min(98, Math.max(10, overallScore)),
    skillMatch,
    titleMatch,
    breakdown: {
      skills: skillMatch.matchScore,
      title: titleMatch.score,
      location: locationScore,
      recency: recencyScore,
    },
  };
}
