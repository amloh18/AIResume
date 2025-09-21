import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvText, jobDescription, cvData, jobData, cvId, comprehensive } = await request.json();

    if (!cvText || !jobDescription) {
      return NextResponse.json({ error: 'CV text and job description are required' }, { status: 400 });
    }

    // Enhanced ATS analysis logic
    const result = await performComprehensiveATSAnalysis({
      cvText,
      jobDescription,
      cvData,
      jobData,
      cvId,
      userId: session.user.id
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Comprehensive ATS analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform comprehensive ATS analysis' },
      { status: 500 }
    );
  }
}

async function performComprehensiveATSAnalysis({
  cvText,
  jobDescription,
  cvData,
  jobData,
  cvId,
  userId
}: {
  cvText: string;
  jobDescription: string;
  cvData: any;
  jobData: any;
  cvId?: string;
  userId: string;
}) {
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  const cvKeywords = extractKeywords(cvText);
  
  // Calculate keyword matches
  const matchedKeywords = jobKeywords.filter(keyword => 
    cvKeywords.some(cvKeyword => 
      cvKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(cvKeyword.toLowerCase())
    )
  );
  
  const missingKeywords = jobKeywords.filter(keyword => 
    !matchedKeywords.some(matched => 
      matched.toLowerCase() === keyword.toLowerCase()
    )
  ).slice(0, 15); // Limit to top 15 missing keywords

  // Calculate experience years
  const experienceYears = calculateExperienceYears(cvData.work || []);
  
  // Extract education level
  const educationLevel = getHighestEducationLevel(cvData.education || []);
  
  // Find action verbs
  const actionVerbs = [
    'achieved', 'managed', 'led', 'developed', 'created', 'implemented', 
    'improved', 'increased', 'reduced', 'optimized', 'designed', 'built',
    'delivered', 'executed', 'coordinated', 'supervised', 'analyzed',
    'established', 'maintained', 'collaborated', 'facilitated', 'streamlined'
  ];
  
  const actionVerbMatches = actionVerbs.filter(verb =>
    cvText.toLowerCase().includes(verb.toLowerCase())
  );

  // Extract skills
  const jobSkills = extractSkills(jobDescription);
  const cvSkills = extractSkills(cvText);
  
  const skillsMatched = jobSkills.filter(skill =>
    cvSkills.some(cvSkill => 
      cvSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(cvSkill.toLowerCase())
    )
  );
  
  const skillsMissing = jobSkills.filter(skill =>
    !skillsMatched.some(matched => 
      matched.toLowerCase() === skill.toLowerCase()
    )
  ).slice(0, 10);

  // Calculate scores
  const keywordMatchScore = Math.min(100, (matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100);
  const experienceScore = Math.min(100, (experienceYears / 5) * 100); // Assume 5+ years is optimal
  const actionVerbScore = Math.min(100, (actionVerbMatches.length / 10) * 100);
  const skillsScore = Math.min(100, (skillsMatched.length / Math.max(jobSkills.length, 1)) * 100);
  const formattingScore = 85; // Assume good formatting for now

  // Overall score calculation
  const overallScore = Math.round(
    (keywordMatchScore * 0.3) +
    (experienceScore * 0.2) +
    (actionVerbScore * 0.15) +
    (skillsScore * 0.25) +
    (formattingScore * 0.1)
  );

  // Generate suggestions
  const suggestions = generateSuggestions({
    keywordMatchScore,
    experienceScore,
    actionVerbScore,
    skillsScore,
    missingKeywords,
    skillsMissing,
    actionVerbMatches
  });

  // Generate optimizations
  const optimizations = await generateOptimizations({
    cvData,
    jobData,
    missingKeywords,
    skillsMissing,
    userId
  });

  return {
    score: overallScore,
    breakdown: {
      keywordMatch: Math.round(keywordMatchScore),
      experienceEducation: Math.round(experienceScore),
      actionVerbs: Math.round(actionVerbScore),
      skills: Math.round(skillsScore),
      formatting: Math.round(formattingScore)
    },
    details: {
      matchedKeywords: matchedKeywords.slice(0, 20),
      missingKeywords,
      experienceYears,
      educationLevel,
      actionVerbMatches,
      skillsMatched: skillsMatched.slice(0, 15),
      skillsMissing,
      formatIssues: []
    },
    suggestions,
    optimizations
  };
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 50); // Limit to top 50 keywords
}

function extractSkills(text: string): string[] {
  const commonSkills = [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'html', 'css',
    'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'leadership',
    'communication', 'teamwork', 'problem-solving', 'project management',
    'data analysis', 'machine learning', 'artificial intelligence'
  ];

  return commonSkills.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

function calculateExperienceYears(workExperience: any[]): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalMonths = 0;
  const currentYear = new Date().getFullYear();
  
  workExperience.forEach(job => {
    const startYear = job.startDate ? parseInt(job.startDate.split('-')[0] || job.startDate.split('/')[2] || currentYear.toString()) : currentYear;
    const endYear = job.endDate && job.endDate !== 'Present' 
      ? parseInt(job.endDate.split('-')[0] || job.endDate.split('/')[2] || currentYear.toString())
      : currentYear;
    
    totalMonths += Math.max(0, (endYear - startYear) * 12);
  });
  
  return Math.round(totalMonths / 12);
}

function getHighestEducationLevel(education: any[]): string {
  if (!education || education.length === 0) return 'Not specified';
  
  const levels = ['PhD', 'Doctorate', 'Master', 'Bachelor', 'Associate', 'Diploma', 'Certificate'];
  
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

function generateSuggestions({
  keywordMatchScore,
  experienceScore,
  actionVerbScore,
  skillsScore,
  missingKeywords,
  skillsMissing,
  actionVerbMatches
}: any): string[] {
  const suggestions = [];
  
  if (keywordMatchScore < 70) {
    suggestions.push(`Include more relevant keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  
  if (skillsScore < 60) {
    suggestions.push(`Add missing skills: ${skillsMissing.slice(0, 3).join(', ')}`);
  }
  
  if (actionVerbScore < 50) {
    suggestions.push('Use more action verbs to describe your achievements (e.g., "achieved", "managed", "led")');
  }
  
  if (experienceScore < 40) {
    suggestions.push('Highlight relevant experience and quantify your achievements with numbers');
  }
  
  suggestions.push('Ensure your CV is ATS-friendly with standard section headings');
  suggestions.push('Use bullet points to improve readability');
  
  return suggestions.slice(0, 6);
}

async function generateOptimizations({
  cvData,
  jobData,
  missingKeywords,
  skillsMissing,
  userId
}: any) {
  // In a real implementation, this would use AI to generate optimized content
  // For now, we'll return structured optimization suggestions
  
  const optimizedSummary = generateOptimizedSummary(cvData, jobData, missingKeywords);
  const workExperienceOptimizations = generateWorkExperienceOptimizations(cvData.work || [], jobData, missingKeywords);
  
  return {
    summary: optimizedSummary,
    workExperience: workExperienceOptimizations,
    skills: skillsMissing.slice(0, 5),
    keywords: missingKeywords.slice(0, 10)
  };
}

function generateOptimizedSummary(cvData: any, jobData: any, missingKeywords: string[]): string {
  const name = cvData.basics?.name || 'Professional';
  const title = cvData.basics?.label || jobData.title || 'Professional';
  const keywords = missingKeywords.slice(0, 5).join(', ');
  
  return `Experienced ${title} with proven expertise in ${keywords}. Demonstrated ability to deliver high-quality results and drive business growth through innovative solutions and strategic thinking. Strong background in ${cvData.basics?.label || 'technology'} with excellent communication and leadership skills.`;
}

function generateWorkExperienceOptimizations(workExperience: any[], jobData: any, missingKeywords: string[]): Array<{index: number, optimizedText: string}> {
  return workExperience.slice(0, 2).map((job, index) => ({
    index,
    optimizedText: `${job.summary || 'Responsible for key initiatives'} Leveraged ${missingKeywords.slice(0, 3).join(', ')} to achieve measurable results. Collaborated with cross-functional teams to deliver projects on time and within budget, resulting in improved efficiency and customer satisfaction.`
  }));
}