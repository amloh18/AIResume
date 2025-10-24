/**
 * Enhanced ATS Service with Robust Keyword Extraction
 * Focuses on Nouns, Noun Phrases, and Action Verbs
 */

export interface ProfileLevel {
  title: string;
  yearsExperience: number;
  description: string;
}

export interface EnhancedATSResult {
  score: number;
  profileLevel: ProfileLevel;
  breakdown: {
    hardSkillsMatch: number;      // 40% weight
    jobTitleCompanyMatch: number;  // 25% weight
    experienceContentMatch: number; // 25% weight
    formattingReadability: number; // 10% weight
  };
  details: {
    matchedKeywords: Array<{keyword: string, type: 'noun' | 'verb' | 'adjective', priority: 'high' | 'medium' | 'low'}>;
    missingKeywords: Array<{keyword: string, type: 'noun' | 'verb' | 'adjective', priority: 'high' | 'medium' | 'low'}>;
    experienceYears: number;
    educationLevel: string;
    actionVerbMatches: string[];
    hardSkillsMatched: string[];
    hardSkillsMissing: string[];
    jobTitlesFound: string[];
    companiesFound: string[];
  };
  suggestions: string[];
}

/**
 * Determine profile level based on years of experience
 */
export function getProfileLevel(yearsExperience: number): ProfileLevel {
  if (yearsExperience === 0) {
    return {
      title: 'Entry-Level / New Graduate',
      yearsExperience: 0,
      description: 'Focus on education, projects, internships, and transferable skills'
    };
  } else if (yearsExperience >= 1 && yearsExperience <= 3) {
    return {
      title: 'Starter Professional',
      yearsExperience,
      description: '2-4 achievements per role, emphasize growth and learning'
    };
  } else if (yearsExperience >= 4 && yearsExperience <= 9) {
    return {
      title: 'Mid-Level Professional',
      yearsExperience,
      description: '3-5 achievements per role, focus on impact and leadership'
    };
  } else if (yearsExperience >= 10 && yearsExperience <= 15) {
    return {
      title: 'Experienced Professional',
      yearsExperience,
      description: '4-6 achievements per recent role, demonstrate strategic thinking'
    };
  } else {
    return {
      title: 'Senior/Executive Professional',
      yearsExperience,
      description: '4-6 high-level achievements per recent role, focus on leadership and business impact'
    };
  }
}

/**
 * Extract nouns and noun phrases (highest priority for ATS)
 * These include: hard skills, job titles, tools, technologies, certifications
 */
export function extractNounsAndPhrases(text: string): Array<{keyword: string, priority: 'high' | 'medium' | 'low'}> {
  const normalizedText = text.toLowerCase();
  const results: Array<{keyword: string, priority: 'high' | 'medium' | 'low'}> = [];
  
  // High-priority patterns: Technologies, Tools, Programming Languages
  const technicalSkills = [
    // Programming Languages
    'python', 'java', 'javascript', 'typescript', 'c\\+\\+', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'scala',
    'r programming', 'matlab', 'perl', 'shell scripting', 'bash',
    // Web Technologies
    'react', 'angular', 'vue\\.js', 'node\\.js', 'express', 'django', 'flask', 'spring boot', 'asp\\.net',
    'html5?', 'css3?', 'sass', 'less', 'webpack', 'next\\.js', 'nuxt', 'gatsby',
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'oracle', 'sql server',
    'nosql', 'elasticsearch', 'neo4j', 'firebase',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions',
    'terraform', 'ansible', 'chef', 'puppet', 'circleci', 'travis ci',
    // Data Science & ML
    'machine learning', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
    'pandas', 'numpy', 'matplotlib', 'tableau', 'power bi', 'looker', 'qlik',
    'data analysis', 'data visualization', 'statistical analysis', 'predictive modeling', 'nlp', 'computer vision',
    // Methodologies & Frameworks
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd', 'microservices', 'restful api',
    'graphql', 'soap', 'mvc', 'mvvm', 'clean architecture',
    // Business Tools
    'salesforce', 'sap', 'oracle', 'jira', 'confluence', 'slack', 'microsoft office', 'excel', 'powerpoint',
    'google analytics', 'hubspot', 'marketo', 'adobe analytics',
    // Certifications
    'aws certified', 'pmp', 'cissp', 'cfa', 'cpa', 'six sigma', 'itil', 'scrum master', 'product owner'
  ];
  
  technicalSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      results.push({
        keyword: skill.replace(/\\b|\\\./g, ''),
        priority: 'high'
      });
    }
  });
  
  // Extract multi-word technical phrases (2-4 words)
  const multiWordPattern = /\b([a-z]+(?:[-\s][a-z]+){1,3})\b/g;
  const multiWordMatches = normalizedText.match(multiWordPattern) || [];
  
  // Filter for technical-sounding phrases
  const technicalPhrases = multiWordMatches.filter(phrase => {
    const words = phrase.split(/[-\s]+/);
    // Include if it has words like "system", "platform", "service", "management", etc.
    const technicalWords = ['system', 'platform', 'service', 'management', 'analysis', 'development',
      'architecture', 'infrastructure', 'engineering', 'operations', 'analytics', 'intelligence',
      'processing', 'framework', 'library', 'software', 'application', 'database', 'network', 'security'];
    
    return words.some(word => technicalWords.includes(word)) && words.length >= 2;
  });
  
  // Add unique technical phrases
  const uniquePhrases = [...new Set(technicalPhrases)];
  uniquePhrases.slice(0, 20).forEach(phrase => {
    if (!results.some(r => r.keyword === phrase)) {
      results.push({
        keyword: phrase,
        priority: 'medium'
      });
    }
  });
  
  return results;
}

/**
 * Extract action verbs (high priority for experience matching)
 */
export function extractActionVerbs(text: string): string[] {
  const actionVerbs = [
    // Leadership & Management
    'led', 'managed', 'directed', 'supervised', 'coordinated', 'oversaw', 'guided', 'mentored',
    'coached', 'trained', 'delegated', 'orchestrated', 'spearheaded', 'championed',
    // Achievement & Results
    'achieved', 'accomplished', 'attained', 'delivered', 'exceeded', 'surpassed', 'maximized',
    'optimized', 'enhanced', 'improved', 'increased', 'boosted', 'elevated', 'strengthened',
    // Creation & Development
    'developed', 'created', 'designed', 'built', 'engineered', 'architected', 'established',
    'launched', 'initiated', 'pioneered', 'innovated', 'introduced', 'implemented',
    // Analysis & Strategy
    'analyzed', 'assessed', 'evaluated', 'researched', 'investigated', 'identified',
    'determined', 'diagnosed', 'forecasted', 'projected', 'strategized', 'planned',
    // Execution & Operations
    'executed', 'performed', 'operated', 'maintained', 'administered', 'processed',
    'handled', 'managed', 'conducted', 'facilitated', 'streamlined', 'automated',
    // Collaboration & Communication
    'collaborated', 'partnered', 'liaised', 'communicated', 'presented', 'negotiated',
    'consulted', 'advised', 'influenced', 'persuaded', 'advocated',
    // Problem Solving
    'resolved', 'solved', 'troubleshot', 'debugged', 'fixed', 'remediated', 'mitigated',
    // Reduction & Efficiency
    'reduced', 'decreased', 'minimized', 'cut', 'eliminated', 'saved', 'consolidated'
  ];
  
  const normalizedText = text.toLowerCase();
  const found = actionVerbs.filter(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(normalizedText);
  });
  
  return [...new Set(found)];
}

/**
 * Extract job titles from text
 */
export function extractJobTitles(text: string): string[] {
  const commonTitles = [
    'engineer', 'developer', 'architect', 'manager', 'director', 'analyst', 'scientist',
    'specialist', 'consultant', 'designer', 'lead', 'senior', 'principal', 'staff',
    'coordinator', 'administrator', 'technician', 'associate', 'assistant', 'executive',
    'officer', 'head', 'chief', 'vice president', 'president', 'founder', 'owner'
  ];
  
  const normalizedText = text.toLowerCase();
  const foundTitles: string[] = [];
  
  // Look for compound titles (e.g., "software engineer", "data scientist")
  const words = normalizedText.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const twoWords = `${words[i]} ${words[i + 1]}`;
    const threeWords = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : '';
    
    // Check if the phrase contains a title word
    if (commonTitles.some(title => twoWords.includes(title))) {
      foundTitles.push(twoWords);
    }
    if (threeWords && commonTitles.some(title => threeWords.includes(title))) {
      foundTitles.push(threeWords);
    }
  }
  
  return [...new Set(foundTitles)];
}

/**
 * Enhanced keyword extraction with proper prioritization
 */
export function extractEnhancedKeywords(jobDescription: string): {
  hardSkills: Array<{keyword: string, priority: 'high' | 'medium' | 'low'}>;
  actionVerbs: string[];
  jobTitles: string[];
  allKeywords: string[];
} {
  const hardSkills = extractNounsAndPhrases(jobDescription);
  const actionVerbs = extractActionVerbs(jobDescription);
  const jobTitles = extractJobTitles(jobDescription);
  
  // Combine all for overall matching
  const allKeywords = [
    ...hardSkills.map(s => s.keyword),
    ...actionVerbs,
    ...jobTitles
  ];
  
  return {
    hardSkills,
    actionVerbs,
    jobTitles,
    allKeywords: [...new Set(allKeywords)]
  };
}

/**
 * Calculate experience years from work history
 */
export function calculateExperienceYears(workExperience: any[]): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalMonths = 0;
  const currentDate = new Date();
  
  workExperience.forEach(job => {
    try {
      const startDate = job.startDate ? new Date(job.startDate) : new Date();
      const endDate = job.endDate && job.endDate !== 'Present' 
        ? new Date(job.endDate) 
        : currentDate;
      
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
        + (endDate.getMonth() - startDate.getMonth());
      
      totalMonths += Math.max(0, months);
    } catch (error) {
      console.error('Error calculating experience for job:', job, error);
    }
  });
  
  return Math.round(totalMonths / 12);
}

/**
 * Calculate enhanced ATS score with proper weighting
 */
export function calculateEnhancedATSScore(
  cvData: any,
  jobData: any
): EnhancedATSResult {
  const cvText = JSON.stringify(cvData).toLowerCase();
  const jobDescription = (jobData?.description || jobData?.jobDescription || '').toLowerCase();
  
  // Extract keywords from job description
  const jobKeywords = extractEnhancedKeywords(jobDescription);
  
  // Extract keywords from CV
  const cvKeywords = extractEnhancedKeywords(cvText);
  
  // 1. Hard Skills Match (40% of score)
  const hardSkillsMatched = jobKeywords.hardSkills.filter(skill =>
    cvKeywords.hardSkills.some(cvSkill => 
      cvSkill.keyword === skill.keyword ||
      cvText.includes(skill.keyword)
    )
  );
  const hardSkillsMissing = jobKeywords.hardSkills.filter(skill =>
    !hardSkillsMatched.some(matched => matched.keyword === skill.keyword)
  );
  const hardSkillsScore = jobKeywords.hardSkills.length > 0
    ? (hardSkillsMatched.length / jobKeywords.hardSkills.length) * 100
    : 85;
  
  // 2. Job Title & Company Match (25% of score)
  const jobTitle = (jobData?.title || jobData?.jobTitle || '').toLowerCase();
  const company = (jobData?.company || '').toLowerCase();
  const cvBasicsText = JSON.stringify(cvData?.basics || {}).toLowerCase();
  const cvWorkText = JSON.stringify(cvData?.work || []).toLowerCase();
  
  let jobTitleScore = 0;
  // Check if CV mentions similar job titles
  const jobTitlesFound = jobKeywords.jobTitles.filter(title =>
    cvBasicsText.includes(title) || cvWorkText.includes(title)
  );
  jobTitleScore = jobTitlesFound.length > 0 ? 80 : 50;
  
  // Boost if exact job title match
  if (jobTitle && (cvBasicsText.includes(jobTitle) || cvWorkText.includes(jobTitle))) {
    jobTitleScore = 100;
  }
  
  // Check company match (bonus)
  let companyScore = 0;
  if (company && cvWorkText.includes(company)) {
    companyScore = 100;
  }
  
  const jobTitleCompanyScore = (jobTitleScore * 0.7 + companyScore * 0.3);
  
  // 3. Experience Content Match (25% of score)
  const actionVerbsMatched = jobKeywords.actionVerbs.filter(verb =>
    cvKeywords.actionVerbs.includes(verb)
  );
  const experienceContentScore = jobKeywords.actionVerbs.length > 0
    ? (actionVerbsMatched.length / jobKeywords.actionVerbs.length) * 100
    : 75;
  
  // 4. Formatting & Readability (10% of score)
  let formattingScore = 85; // Base score
  
  // Check for standard sections
  if (cvData?.basics?.name) formattingScore += 3;
  if (cvData?.basics?.email) formattingScore += 3;
  if (cvData?.work && cvData.work.length > 0) formattingScore += 3;
  if (cvData?.skills && cvData.skills.length > 0) formattingScore += 3;
  if (cvData?.education && cvData.education.length > 0) formattingScore += 3;
  
  formattingScore = Math.min(100, formattingScore);
  
  // Calculate overall score with proper weighting
  const overallScore = Math.round(
    (hardSkillsScore * 0.40) +
    (jobTitleCompanyScore * 0.25) +
    (experienceContentScore * 0.25) +
    (formattingScore * 0.10)
  );
  
  // Get profile level
  const experienceYears = calculateExperienceYears(cvData?.work || []);
  const profileLevel = getProfileLevel(experienceYears);
  
  // Prepare matched and missing keywords with types
  const matchedKeywords = [
    ...hardSkillsMatched.map(s => ({keyword: s.keyword, type: 'noun' as const, priority: s.priority})),
    ...actionVerbsMatched.map(v => ({keyword: v, type: 'verb' as const, priority: 'high' as const}))
  ];
  
  const missingKeywords = [
    ...hardSkillsMissing.slice(0, 15).map(s => ({keyword: s.keyword, type: 'noun' as const, priority: s.priority})),
    ...jobKeywords.actionVerbs.filter(v => !actionVerbsMatched.includes(v)).slice(0, 10)
      .map(v => ({keyword: v, type: 'verb' as const, priority: 'high' as const}))
  ];
  
  // Generate suggestions
  const suggestions = generateEnhancedSuggestions({
    overallScore,
    hardSkillsScore,
    jobTitleCompanyScore,
    experienceContentScore,
    hardSkillsMissing,
    actionVerbsMatched,
    profileLevel
  });
  
  return {
    score: overallScore,
    profileLevel,
    breakdown: {
      hardSkillsMatch: Math.round(hardSkillsScore),
      jobTitleCompanyMatch: Math.round(jobTitleCompanyScore),
      experienceContentMatch: Math.round(experienceContentScore),
      formattingReadability: Math.round(formattingScore)
    },
    details: {
      matchedKeywords,
      missingKeywords,
      experienceYears,
      educationLevel: getHighestEducationLevel(cvData?.education || []),
      actionVerbMatches: actionVerbsMatched,
      hardSkillsMatched: hardSkillsMatched.map(s => s.keyword),
      hardSkillsMissing: hardSkillsMissing.map(s => s.keyword),
      jobTitlesFound,
      companiesFound: company ? [company] : []
    },
    suggestions
  };
}

function getHighestEducationLevel(education: any[]): string {
  if (!education || education.length === 0) return 'Not specified';
  
  const levels = ['PhD', 'Doctorate', 'Master', 'MBA', 'Bachelor', 'Associate', 'Diploma'];
  
  for (const level of levels) {
    if (education.some(edu => 
      edu.studyType?.toLowerCase().includes(level.toLowerCase()) ||
      edu.area?.toLowerCase().includes(level.toLowerCase())
    )) {
      return level;
    }
  }
  
  return education[0]?.studyType || 'Not specified';
}

function generateEnhancedSuggestions({
  overallScore,
  hardSkillsScore,
  jobTitleCompanyScore,
  experienceContentScore,
  hardSkillsMissing,
  actionVerbsMatched,
  profileLevel
}: any): string[] {
  const suggestions: string[] = [];
  
  // Profile-specific advice
  suggestions.push(`Profile Level: ${profileLevel.title} - ${profileLevel.description}`);
  
  // Hard skills advice
  if (hardSkillsScore < 70 && hardSkillsMissing.length > 0) {
    const topMissing = hardSkillsMissing.slice(0, 5).map((s: any) => s.keyword).join(', ');
    suggestions.push(`🎯 Add these high-priority skills to your CV: ${topMissing}`);
  } else if (hardSkillsScore >= 70) {
    suggestions.push('✅ Strong hard skills match! Your technical skills align well with the job.');
  }
  
  // Job title advice
  if (jobTitleCompanyScore < 60) {
    suggestions.push('📋 Update your professional summary to include keywords from the target job title');
  }
  
  // Experience content advice
  if (experienceContentScore < 60) {
    suggestions.push('💼 Use more action verbs (led, developed, achieved) to describe your accomplishments');
    if (actionVerbsMatched.length < 5) {
      suggestions.push('📈 Quantify your achievements with metrics (%, $, numbers) to demonstrate impact');
    }
  }
  
  // Overall advice
  if (overallScore >= 80) {
    suggestions.push('🎉 Excellent! Your CV is well-optimized for this role.');
  } else if (overallScore >= 60) {
    suggestions.push('⚡ Good progress! A few more optimizations will push you past 80%.');
  } else {
    suggestions.push('🔧 Your CV needs significant optimization to match this job description.');
  }
  
  return suggestions.slice(0, 6);
}

