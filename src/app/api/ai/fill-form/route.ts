import { NextRequest, NextResponse } from 'next/server';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface FormFillRequest {
  cvData: UnifiedCVDataStructure;
  jobData: any;
  section: 'basics' | 'work' | 'skills' | 'summary' | 'all';
}

export async function POST(request: NextRequest) {
  try {
    const body: FormFillRequest = await request.json();
    const { cvData, jobData, section } = body;

    if (!cvData || !jobData) {
      return NextResponse.json(
        { error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    const jobDescription = jobData.description || jobData.jobDescription || '';
    const jobTitle = jobData.title || jobData.jobTitle || '';
    const companyName = jobData.company || jobData.companyName || '';

    // Extract keywords and requirements from job
    const keywords = extractKeywords(jobDescription);
    const requirements = extractRequirements(jobDescription);

    let filledData: Partial<UnifiedCVDataStructure> = {};

    switch (section) {
      case 'basics':
        filledData = fillBasics(cvData, jobData, keywords);
        break;
      case 'summary':
        filledData = fillSummary(cvData, jobData, keywords, requirements);
        break;
      case 'skills':
        filledData = fillSkills(cvData, keywords);
        break;
      case 'work':
        filledData = fillWorkExperience(cvData, jobData, keywords);
        break;
      case 'all':
        filledData = {
          ...fillBasics(cvData, jobData, keywords),
          ...fillSummary(cvData, jobData, keywords, requirements),
          ...fillSkills(cvData, keywords),
          ...fillWorkExperience(cvData, jobData, keywords)
        };
        break;
    }

    return NextResponse.json({
      success: true,
      filledData,
      suggestions: generateFormFillSuggestions(filledData, keywords)
    });

  } catch (error) {
    console.error('Form fill error:', error);
    return NextResponse.json(
      { error: 'Failed to fill form' },
      { status: 500 }
    );
  }
}

function extractKeywords(jobDescription: string): string[] {
  const keywords = [
    // Technical skills
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
    'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby',
    'html', 'css', 'sass', 'less', 'webpack', 'babel', 'jest', 'cypress', 'selenium', 'jenkins',
    'terraform', 'ansible', 'elasticsearch', 'redis', 'postgresql', 'mysql', 'firebase', 'heroku',
    // Soft skills
    'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
    'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation',
    'negotiation', 'customer service', 'project management', 'critical thinking', 'adaptability',
    'initiative', 'self-motivated', 'results-driven', 'strategic thinking', 'innovation'
  ];

  return keywords.filter(keyword => 
    jobDescription.toLowerCase().includes(keyword)
  );
}

function extractRequirements(jobDescription: string): string[] {
  const requirements: string[] = [];
  const lines = jobDescription.split('\n');
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('requirement') || 
        lowerLine.includes('qualification') || 
        lowerLine.includes('must have') || 
        lowerLine.includes('should have') ||
        lowerLine.includes('experience with') ||
        lowerLine.includes('knowledge of') ||
        lowerLine.includes('proficiency in')) {
      requirements.push(line.trim());
    }
  }
  
  return requirements;
}

function fillBasics(cvData: UnifiedCVDataStructure, jobData: any, keywords: string[]): Partial<UnifiedCVDataStructure> {
  const jobTitle = jobData.title || jobData.jobTitle || '';
  const companyName = jobData.company || jobData.companyName || '';
  
  let basics = { ...cvData.basics };

  // Fill label/title if empty
  if (!basics.label || basics.label.trim() === '') {
    basics.label = jobTitle || 'Professional';
  }

  // Enhance summary with job-specific keywords
  if (basics.summary) {
    const enhancedSummary = enhanceSummaryWithKeywords(basics.summary, keywords);
    basics.summary = enhancedSummary;
  }

  return { basics };
}

function fillSummary(cvData: UnifiedCVDataStructure, jobData: any, keywords: string[], requirements: string[]): Partial<UnifiedCVDataStructure> {
  const jobTitle = jobData.title || jobData.jobTitle || '';
  const companyName = jobData.company || jobData.companyName || '';
  
  let summary = cvData.basics?.summary || '';

  // Create a targeted summary if none exists
  if (!summary || summary.trim() === '') {
    summary = generateTargetedSummary(jobTitle, companyName, keywords, requirements);
  } else {
    // Enhance existing summary
    summary = enhanceSummaryWithKeywords(summary, keywords);
  }

  return {
    basics: {
      ...cvData.basics,
      summary
    }
  };
}

function fillSkills(cvData: UnifiedCVDataStructure, keywords: string[]): Partial<UnifiedCVDataStructure> {
  let skills = [...(cvData.skills || [])];

  // Add missing keywords as skills
  const existingSkillNames = skills.map(skill => skill.name?.toLowerCase() || '');
  const missingKeywords = keywords.filter(keyword => 
    !existingSkillNames.includes(keyword.toLowerCase())
  );

  // Add missing keywords as new skills
  missingKeywords.slice(0, 10).forEach(keyword => {
    skills.push({
      name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      level: 'Intermediate',
      category: getSkillCategory(keyword)
    });
  });

  return { skills };
}

function fillWorkExperience(cvData: UnifiedCVDataStructure, jobData: any, keywords: string[]): Partial<UnifiedCVDataStructure> {
  let work = [...(cvData.work || [])];

  // Enhance existing work experience with keywords
  work = work.map(job => {
    if (job.summary) {
      job.summary = enhanceWorkDescription(job.summary, keywords);
    }
    
    // Enhance highlights without bullet points
    if (job.highlights && Array.isArray(job.highlights)) {
      job.highlights = job.highlights.map(highlight => 
        enhanceHighlight(highlight, keywords)
      );
    }
    
    return job;
  });

  return { work };
}

function enhanceSummaryWithKeywords(summary: string, keywords: string[]): string {
  let enhanced = summary;
  
  // Add missing keywords naturally
  const missingKeywords = keywords.filter(keyword => 
    !summary.toLowerCase().includes(keyword)
  );

  if (missingKeywords.length > 0) {
    const relevantKeywords = missingKeywords.slice(0, 3);
    const keywordPhrases = relevantKeywords.map(keyword => {
      switch (keyword) {
        case 'javascript': return 'JavaScript development';
        case 'python': return 'Python programming';
        case 'react': return 'React.js development';
        case 'node.js': return 'Node.js backend development';
        case 'sql': return 'SQL database management';
        case 'mongodb': return 'MongoDB database systems';
        case 'aws': return 'AWS cloud services';
        case 'docker': return 'Docker containerization';
        case 'kubernetes': return 'Kubernetes orchestration';
        case 'machine learning': return 'machine learning algorithms';
        case 'ai': return 'artificial intelligence';
        case 'data analysis': return 'data analysis';
        case 'frontend': return 'frontend development';
        case 'backend': return 'backend development';
        case 'full stack': return 'full-stack development';
        case 'devops': return 'DevOps practices';
        case 'agile': return 'Agile methodologies';
        case 'scrum': return 'Scrum framework';
        case 'git': return 'Git version control';
        case 'api': return 'API development';
        case 'rest': return 'RESTful APIs';
        case 'graphql': return 'GraphQL APIs';
        case 'typescript': return 'TypeScript development';
        case 'angular': return 'Angular framework';
        case 'vue': return 'Vue.js development';
        case 'php': return 'PHP development';
        case 'c++': return 'C++ programming';
        case 'c#': return 'C# development';
        case 'ruby': return 'Ruby programming';
        case 'leadership': return 'leadership';
        case 'communication': return 'communication';
        case 'teamwork': return 'teamwork';
        case 'problem solving': return 'problem solving';
        case 'analytical': return 'analytical thinking';
        case 'project management': return 'project management';
        default: return keyword;
      }
    });
    
    if (keywordPhrases.length > 0) {
      const keywordSentence = `with expertise in ${keywordPhrases.join(', ')}`;
      enhanced = enhanced.replace(/\.$/, `, ${keywordSentence}.`);
    }
  }
  
  return enhanced;
}

function generateTargetedSummary(jobTitle: string, companyName: string, keywords: string[], requirements: string[]): string {
  const relevantKeywords = keywords.slice(0, 5);
  const keywordPhrases = relevantKeywords.map(keyword => 
    keyword.charAt(0).toUpperCase() + keyword.slice(1)
  );

  let summary = `Experienced professional with expertise in ${keywordPhrases.join(', ')}`;
  
  if (jobTitle) {
    summary += `, seeking a ${jobTitle} position`;
  }
  
  if (companyName) {
    summary += ` at ${companyName}`;
  }
  
  summary += '. Proven track record of delivering high-quality solutions and driving successful project outcomes.';
  
  return summary;
}

function enhanceWorkDescription(description: string, keywords: string[]): string {
  let enhanced = description;
  
  // Add relevant keywords to work description
  const missingKeywords = keywords.filter(keyword => 
    !description.toLowerCase().includes(keyword)
  );

  if (missingKeywords.length > 0) {
    const relevantKeywords = missingKeywords.slice(0, 2);
    const keywordPhrases = relevantKeywords.map(keyword => 
      keyword.charAt(0).toUpperCase() + keyword.slice(1)
    );
    
    enhanced += ` Utilized ${keywordPhrases.join(', ')} to enhance project outcomes.`;
  }
  
  return enhanced;
}

function enhanceHighlight(highlight: string, keywords: string[]): string {
  // Remove any bullet point prefixes and clean the text
  let cleaned = highlight.replace(/^[-•*]\s*/, '').trim();
  
  // Add relevant keywords if missing
  const missingKeywords = keywords.filter(keyword => 
    !cleaned.toLowerCase().includes(keyword)
  );

  if (missingKeywords.length > 0) {
    const relevantKeyword = missingKeywords[0];
    const keywordPhrase = relevantKeyword.charAt(0).toUpperCase() + relevantKeyword.slice(1);
    
    if (!cleaned.includes(keywordPhrase)) {
      cleaned += ` using ${keywordPhrase}`;
    }
  }
  
  return cleaned;
}

function getSkillCategory(keyword: string): string {
  const technicalKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
    'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby'
  ];
  
  const softSkillKeywords = [
    'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
    'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation',
    'negotiation', 'customer service', 'project management'
  ];
  
  if (technicalKeywords.includes(keyword.toLowerCase())) {
    return 'Technical';
  } else if (softSkillKeywords.includes(keyword.toLowerCase())) {
    return 'Soft Skills';
  } else {
    return 'Other';
  }
}

function generateFormFillSuggestions(filledData: Partial<UnifiedCVDataStructure>, keywords: string[]): string[] {
  const suggestions: string[] = [];
  
  // Check if summary was enhanced
  if (filledData.basics?.summary) {
    suggestions.push('Summary enhanced with job-specific keywords');
  }
  
  // Check if skills were added
  if (filledData.skills && filledData.skills.length > 0) {
    const newSkills = filledData.skills.filter(skill => 
      keywords.some(keyword => skill.name?.toLowerCase().includes(keyword.toLowerCase()))
    );
    if (newSkills.length > 0) {
      suggestions.push(`Added ${newSkills.length} relevant skills to your CV`);
    }
  }
  
  // Check if work experience was enhanced
  if (filledData.work && filledData.work.length > 0) {
    suggestions.push('Work experience descriptions enhanced with relevant keywords');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Form filled successfully with job-specific optimizations');
  }
  
  return suggestions;
}
