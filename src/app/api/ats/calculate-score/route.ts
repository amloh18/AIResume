import { NextRequest, NextResponse } from 'next/server';

interface ATSRequest {
  cvText?: string;
  jobDescription?: string;
  cvData?: any; // Optional structured CV data
  cvId?: string; // CV ID to fetch CV data or save the score
  jobId?: string; // Job ID to fetch job data or for reference
  userId?: string; // User ID for authentication
}

interface ATSResponse {
  score: number;
  breakdown: {
    keywordMatch: number;
    experienceEducation: number;
    actionVerbs: number;
  };
  details: {
    matchedKeywords: string[];
    missingKeywords: string[];
    experienceYears: number;
    educationLevel: string;
    actionVerbMatches: string[];
  };
  suggestions: string[];
}

// Common job-related keywords by category
const KEYWORD_CATEGORIES = {
  technical: [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
    'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby'
  ],
  softSkills: [
    'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
    'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation',
    'negotiation', 'customer service', 'project management'
  ],
  industries: [
    'finance', 'healthcare', 'ecommerce', 'education', 'marketing', 'sales', 'consulting', 'manufacturing',
    'retail', 'technology', 'media', 'nonprofit', 'government', 'real estate', 'transportation'
  ]
};

// Action verbs commonly used in job descriptions
const ACTION_VERBS = [
  'develop', 'design', 'implement', 'manage', 'lead', 'coordinate', 'analyze', 'create', 'build',
  'maintain', 'optimize', 'improve', 'enhance', 'deliver', 'execute', 'plan', 'organize', 'supervise',
  'train', 'mentor', 'collaborate', 'communicate', 'present', 'negotiate', 'resolve', 'troubleshoot',
  'deploy', 'test', 'debug', 'document', 'research', 'evaluate', 'assess', 'recommend', 'strategize'
];

// Education keywords and their levels
const EDUCATION_LEVELS = {
  'phd': 5,
  'doctorate': 5,
  'master': 4,
  'mba': 4,
  'bachelor': 3,
  'bachelor\'s': 3,
  'associate': 2,
  'diploma': 2,
  'certificate': 1,
  'high school': 0
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 ATS API - Starting calculation request - V2');
    const body: ATSRequest = await request.json();
    let { cvText, jobDescription, cvData, cvId, jobId, userId } = body;

    console.log('🔍 ATS API - Request data:', {
      cvTextLength: cvText?.length || 0,
      jobDescriptionLength: jobDescription?.length || 0,
      hasCvText: !!cvText,
      hasJobDescription: !!jobDescription,
      hasCvData: !!cvData,
      hasCvId: !!cvId,
      hasJobId: !!jobId,
      hasUserId: !!userId
    });

    // If we only have IDs, fetch the data from database
    if ((!cvText || !jobDescription) && (cvId || jobId)) {
      console.log('🔍 ATS API - Fetching data from database using IDs');
      
      try {
        const { CV, JobApplication } = await import('@/models');
        console.log('🔍 ATS API - Models imported:', {
          hasCV: !!CV,
          hasJobApplication: !!JobApplication,
          CVType: typeof CV,
          JobApplicationType: typeof JobApplication
        });
        
        // Test database connection
        if (!CV || !JobApplication) {
          throw new Error('Failed to import database models');
        }
        
        // Fetch CV data if cvId is provided
        if (cvId && !cvText) {
          console.log('🔍 ATS API - Fetching CV data for ID:', cvId);
          const cvDoc = await CV.findById(cvId);
          if (cvDoc) {
            cvData = cvDoc.cvData;
            console.log('🔍 ATS API - CV document found:', {
              hasData: !!cvDoc.cvData,
              dataKeys: cvDoc.cvData ? Object.keys(cvDoc.cvData) : [],
              basics: cvDoc.cvData?.basics ? Object.keys(cvDoc.cvData.basics) : [],
              workCount: cvDoc.cvData?.work?.length || 0,
              educationCount: cvDoc.cvData?.education?.length || 0,
              skillsCount: cvDoc.cvData?.skills?.length || 0,
              title: cvDoc.title,
              status: cvDoc.status,
              isMaster: cvDoc.isMaster
            });
            
            // Log a sample of the CV data structure to understand what we're working with
            if (cvDoc.cvData) {
              console.log('🔍 ATS API - CV data sample:', {
                basicsName: cvDoc.cvData.basics?.name,
                basicsEmail: cvDoc.cvData.basics?.email,
                basicsSummary: cvDoc.cvData.basics?.summary?.substring(0, 100),
                firstWorkEntry: cvDoc.cvData.work?.[0] ? {
                  position: cvDoc.cvData.work[0].position,
                  name: cvDoc.cvData.work[0].name,
                  summary: cvDoc.cvData.work[0].summary?.substring(0, 50)
                } : 'No work entries',
                firstEducationEntry: cvDoc.cvData.education?.[0] ? {
                  institution: cvDoc.cvData.education[0].institution,
                  studyType: cvDoc.cvData.education[0].studyType,
                  area: cvDoc.cvData.education[0].area
                } : 'No education entries'
              });
            }
            
            cvText = convertCVToText(cvDoc.cvData);
            console.log('✅ ATS API - CV data fetched, text length:', cvText.length);
            
            if (cvText.length === 0) {
              console.log('⚠️ ATS API - CV text is empty after conversion. Full CV data structure:');
              console.log(JSON.stringify(cvDoc.cvData, null, 2));
            } else {
              console.log('🔍 ATS API - CV text preview:', cvText.substring(0, 200) + '...');
            }
          } else {
            console.log('❌ ATS API - CV not found for ID:', cvId);
            return NextResponse.json(
              { error: 'CV not found' },
              { status: 404 }
            );
          }
        }
        
        // Fetch job data if jobId is provided
        if (jobId && !jobDescription) {
          console.log('🔍 ATS API - Fetching job data for ID:', jobId);
          const jobDoc = await JobApplication.findById(jobId);
          if (jobDoc) {
            jobDescription = jobDoc.jobDescription || '';
            console.log('✅ ATS API - Job data fetched:', {
              jobTitle: jobDoc.jobTitle,
              company: jobDoc.company,
              hasJobDescription: !!jobDoc.jobDescription,
              descriptionLength: jobDescription.length,
              jobDescriptionPreview: jobDescription.substring(0, 100) + '...'
            });
          } else {
            console.log('❌ ATS API - Job not found for ID:', jobId);
            return NextResponse.json(
              { error: 'Job not found' },
              { status: 404 }
            );
          }
        }
      } catch (error) {
        console.error('❌ ATS API - Error fetching data from database:', error);
        return NextResponse.json(
          { error: 'Failed to fetch CV or job data' },
          { status: 500 }
        );
      }
    }

    if (!cvText || !jobDescription) {
      console.log('❌ ATS API - Missing required fields after data fetch:', {
        cvText: !!cvText,
        jobDescription: !!jobDescription,
        cvTextLength: cvText?.length || 0,
        jobDescriptionLength: jobDescription?.length || 0,
        cvId: cvId,
        jobId: jobId,
        cvDataProvided: !!cvData,
        cvDataStructure: cvData ? Object.keys(cvData) : 'No cvData'
      });
      
      // Additional debugging for CV data
      if (cvId && !cvText) {
        console.log('🔍 ATS API - CV ID provided but no text generated. Investigating CV data...');
        if (cvData) {
          console.log('🔍 ATS API - CV data structure analysis:', {
            hasBasics: !!cvData.basics,
            basicsKeys: cvData.basics ? Object.keys(cvData.basics) : 'No basics',
            hasWork: !!cvData.work,
            workLength: cvData.work ? cvData.work.length : 0,
            hasEducation: !!cvData.education,
            educationLength: cvData.education ? cvData.education.length : 0,
            hasSkills: !!cvData.skills,
            skillsLength: cvData.skills ? cvData.skills.length : 0,
            fullStructure: JSON.stringify(cvData, null, 2).substring(0, 500) + '...'
          });
        } else {
          console.log('🔍 ATS API - No CV data found in document');
        }
      }
      
      // Provide more specific error messages
      if (!cvText && !jobDescription) {
        return NextResponse.json(
          { error: 'Both CV and job data are missing or empty' },
          { status: 400 }
        );
      } else if (!cvText) {
        return NextResponse.json(
          { error: 'CV data is missing or empty. Please ensure your CV has content before calculating ATS score.' },
          { status: 400 }
        );
      } else if (!jobDescription) {
        return NextResponse.json(
          { error: 'Job description is missing or empty' },
          { status: 400 }
        );
      }
    }

    console.log('✅ ATS API - Validation passed, starting calculation');

    // Normalize text for analysis
    const normalizedCV = cvText.toLowerCase();
    const normalizedJob = jobDescription.toLowerCase();

    // 1. Keyword Matching (60% weight)
    const keywordScore = calculateKeywordMatch(normalizedCV, normalizedJob);

    // 2. Experience & Education (30% weight)
    const experienceScore = calculateExperienceEducation(normalizedCV, normalizedJob, cvData);

    // 3. Action Verb Matching (10% weight)
    const actionVerbScore = calculateActionVerbMatch(normalizedCV, normalizedJob);

    // Calculate final score
    const finalScore = Math.round(
      keywordScore.score * 0.6 + 
      experienceScore.score * 0.3 + 
      actionVerbScore.score * 0.1
    );

    // Generate suggestions
    const suggestions = generateSuggestions(keywordScore, experienceScore, actionVerbScore);

    const response: ATSResponse = {
      score: finalScore,
      breakdown: {
        keywordMatch: Math.round(keywordScore.score),
        experienceEducation: Math.round(experienceScore.score),
        actionVerbs: Math.round(actionVerbScore.score)
      },
      details: {
        matchedKeywords: keywordScore.matched,
        missingKeywords: keywordScore.missing,
        experienceYears: experienceScore.years,
        educationLevel: experienceScore.education,
        actionVerbMatches: actionVerbScore.matches
      },
      suggestions
    };

    console.log('✅ ATS API - Calculation completed successfully:', {
      finalScore,
      keywordScore: Math.round(keywordScore.score),
      experienceScore: Math.round(experienceScore.score),
      actionVerbScore: Math.round(actionVerbScore.score)
    });

    // Save ATS score to CV if cvId is provided
    if (cvId) {
      try {
        const { CV } = await import('@/models');
        const mongoose = await import('mongoose');
        
        await CV.findByIdAndUpdate(cvId, {
          $set: {
            'metadata.atsScore': finalScore,
            'metadata.atsScoreDate': new Date(),
            'metadata.atsScoreJobId': jobId ? new mongoose.Types.ObjectId(jobId) : undefined
          }
        });
        
        console.log('✅ ATS API - Score saved to CV:', cvId);
      } catch (error) {
        console.error('❌ ATS API - Failed to save score to CV:', error);
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('ATS Score calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate ATS score' },
      { status: 500 }
    );
  }
}

function calculateKeywordMatch(cvText: string, jobText: string) {
  const allKeywords = [
    ...KEYWORD_CATEGORIES.technical,
    ...KEYWORD_CATEGORIES.softSkills,
    ...KEYWORD_CATEGORIES.industries
  ];

  // Extract keywords from job description
  const jobKeywords = allKeywords.filter(keyword => 
    jobText.includes(keyword)
  );

  // Find matches in CV
  const matchedKeywords = jobKeywords.filter(keyword => 
    cvText.includes(keyword)
  );

  const missingKeywords = jobKeywords.filter(keyword => 
    !cvText.includes(keyword)
  );

  const score = jobKeywords.length > 0 
    ? (matchedKeywords.length / jobKeywords.length) * 100 
    : 100;

  return {
    score: Math.min(score, 100),
    matched: matchedKeywords,
    missing: missingKeywords
  };
}

function calculateExperienceEducation(cvText: string, jobText: string, cvData?: any) {
  let experienceYears = 0;
  let educationLevel = 'Not specified';

  // First, try to calculate experience from structured CV data (work history)
  if (cvData && cvData.work && Array.isArray(cvData.work)) {
    console.log('🔍 ATS - Calculating experience from work history:', cvData.work.length, 'jobs');
    
    let totalMonths = 0;
    const currentDate = new Date();
    
    cvData.work.forEach((job: any, index: number) => {
      console.log(`🔍 ATS - Processing job ${index + 1}:`, {
        company: job.name || job.company,
        position: job.position,
        startDate: job.startDate,
        endDate: job.endDate
      });
      
      if (job.startDate) {
        const startDate = new Date(job.startDate);
        let endDate = currentDate; // Default to current date
        
        // If there's an end date, use it
        if (job.endDate && job.endDate !== 'Present' && job.endDate !== 'Current') {
          endDate = new Date(job.endDate);
        }
        
        // Calculate months of experience for this job
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        
        if (monthsDiff > 0) {
          totalMonths += monthsDiff;
          console.log(`🔍 ATS - Job ${index + 1} duration: ${monthsDiff} months`);
        }
      }
    });
    
    // Convert months to years (round to nearest 0.5)
    experienceYears = Math.round((totalMonths / 12) * 2) / 2;
    console.log('🔍 ATS - Total calculated experience:', experienceYears, 'years');
  }

  // If no structured data or calculation failed, fall back to text pattern matching
  if (experienceYears === 0) {
    console.log('🔍 ATS - Falling back to text pattern matching');
    const experiencePatterns = [
      /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/gi,
      /experience[:\s]*(\d+)\s*(?:years?|yrs?)/gi,
      /(\d+)\s*(?:years?|yrs?)\s*(?:in\s*)?(?:the\s*)?(?:field|industry|role)/gi
    ];

    for (const pattern of experiencePatterns) {
      const match = cvText.match(pattern);
      if (match) {
        const years = parseInt(match[1]);
        if (years > experienceYears) {
          experienceYears = years;
        }
      }
    }
    console.log('🔍 ATS - Text pattern experience:', experienceYears, 'years');
  }

  // Extract education level
  for (const [level, score] of Object.entries(EDUCATION_LEVELS)) {
    if (cvText.includes(level)) {
      educationLevel = level.charAt(0).toUpperCase() + level.slice(1);
      break;
    }
  }

  // Calculate score based on experience and education
  let score = 0;

  // Experience scoring (0-15 years = 0-100%)
  if (experienceYears >= 0) {
    score += Math.min((experienceYears / 15) * 100, 100) * 0.7;
  }

  // Education scoring
  const educationScore = Object.values(EDUCATION_LEVELS).reduce((max, current) => 
    Math.max(max, current), 0
  );
  const currentEducation = Object.entries(EDUCATION_LEVELS).find(([level]) => 
    cvText.includes(level)
  );
  
  if (currentEducation) {
    score += (currentEducation[1] / educationScore) * 100 * 0.3;
  }

  console.log('🔍 ATS - Final experience calculation:', {
    experienceYears,
    educationLevel,
    score: Math.min(score, 100)
  });

  return {
    score: Math.min(score, 100),
    years: experienceYears,
    education: educationLevel
  };
}

function calculateActionVerbMatch(cvText: string, jobText: string) {
  // Extract action verbs from job description
  const jobActionVerbs = ACTION_VERBS.filter(verb => 
    jobText.includes(verb)
  );

  // Find matches in CV
  const matchedVerbs = jobActionVerbs.filter(verb => 
    cvText.includes(verb)
  );

  const score = jobActionVerbs.length > 0 
    ? (matchedVerbs.length / jobActionVerbs.length) * 100 
    : 100;

  return {
    score: Math.min(score, 100),
    matches: matchedVerbs
  };
}

function generateSuggestions(keywordScore: any, experienceScore: any, actionVerbScore: any) {
  const suggestions: string[] = [];

  // Keyword suggestions
  if (keywordScore.missing.length > 0) {
    suggestions.push(
      `Add these keywords to your CV: ${keywordScore.missing.slice(0, 5).join(', ')}`
    );
  }

  // Experience suggestions
  if (experienceScore.years < 2) {
    suggestions.push('Consider highlighting more specific experience and achievements');
  }

  // Action verb suggestions
  if (actionVerbScore.matches.length < 3) {
    suggestions.push('Use more action verbs from the job description in your CV');
  }

  // General suggestions
  if (suggestions.length === 0) {
    suggestions.push('Your CV looks well-aligned with the job description!');
  }

  return suggestions;
}

function convertCVToText(cvData: any): string {
  if (!cvData) {
    console.log('🔍 ATS API - convertCVToText: No CV data provided');
    return '';
  }
  
  let cvText = '';
  
  console.log('🔍 ATS API - convertCVToText: Starting conversion with data structure:', {
    hasBasics: !!cvData.basics,
    hasWork: !!cvData.work,
    hasEducation: !!cvData.education,
    hasSkills: !!cvData.skills,
    dataKeys: Object.keys(cvData)
  });
  
  // Basic Information (JSON Resume format)
  if (cvData.basics) {
    const { name, label, email, phone, summary, location } = cvData.basics;
    if (name) cvText += `${name} `;
    if (label) cvText += `${label} `;
    if (email) cvText += `${email} `;
    if (phone) cvText += `${phone} `;
    if (summary) cvText += `${summary} `;
    if (location?.city) cvText += `${location.city} `;
    if (location?.region) cvText += `${location.region} `;
  }
  
  // Work Experience (JSON Resume format)
  if (cvData.work && Array.isArray(cvData.work)) {
    cvData.work.forEach((job: any) => {
      if (job.position) cvText += `${job.position} `;
      if (job.name) cvText += `${job.name} `;
      if (job.summary) cvText += `${job.summary} `;
      if (job.highlights && Array.isArray(job.highlights)) {
        job.highlights.forEach((highlight: string) => {
          if (highlight) cvText += `${highlight} `;
        });
      }
    });
  }
  
  // Education (JSON Resume format)
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any) => {
      if (edu.studyType) cvText += `${edu.studyType} `;
      if (edu.area) cvText += `${edu.area} `;
      if (edu.institution) cvText += `${edu.institution} `;
    });
  }
  
  // Skills (JSON Resume format)
  if (cvData.skills && Array.isArray(cvData.skills)) {
    cvData.skills.forEach((skill: any) => {
      if (skill.name) cvText += `${skill.name} `;
      if (skill.keywords && Array.isArray(skill.keywords)) {
        skill.keywords.forEach((keyword: string) => {
          if (keyword) cvText += `${keyword} `;
        });
      }
    });
  }
  
  // Projects (JSON Resume format)
  if (cvData.projects && Array.isArray(cvData.projects)) {
    cvData.projects.forEach((project: any) => {
      if (project.name) cvText += `${project.name} `;
      if (project.description) cvText += `${project.description} `;
      if (project.highlights && Array.isArray(project.highlights)) {
        project.highlights.forEach((highlight: string) => {
          if (highlight) cvText += `${highlight} `;
        });
      }
    });
  }
  
  // Certificates (JSON Resume format)
  if (cvData.certificates && Array.isArray(cvData.certificates)) {
    cvData.certificates.forEach((cert: any) => {
      if (cert.name) cvText += `${cert.name} `;
      if (cert.issuer) cvText += `${cert.issuer} `;
    });
  }
  
  // Awards (JSON Resume format)
  if (cvData.awards && Array.isArray(cvData.awards)) {
    cvData.awards.forEach((award: any) => {
      if (award.title) cvText += `${award.title} `;
      if (award.awarder) cvText += `${award.awarder} `;
      if (award.summary) cvText += `${award.summary} `;
    });
  }
  
  // Publications (JSON Resume format)
  if (cvData.publications && Array.isArray(cvData.publications)) {
    cvData.publications.forEach((pub: any) => {
      if (pub.name) cvText += `${pub.name} `;
      if (pub.publisher) cvText += `${pub.publisher} `;
      if (pub.summary) cvText += `${pub.summary} `;
    });
  }
  
  // Languages (JSON Resume format)
  if (cvData.languages && Array.isArray(cvData.languages)) {
    cvData.languages.forEach((lang: any) => {
      if (lang.language) cvText += `${lang.language} `;
      if (lang.fluency) cvText += `${lang.fluency} `;
    });
  }
  
  // Volunteer work (JSON Resume format)
  if (cvData.volunteer && Array.isArray(cvData.volunteer)) {
    cvData.volunteer.forEach((vol: any) => {
      if (vol.organization) cvText += `${vol.organization} `;
      if (vol.position) cvText += `${vol.position} `;
      if (vol.summary) cvText += `${vol.summary} `;
    });
  }
  
  const result = cvText.trim();
  console.log('🔍 ATS API - convertCVToText: Conversion completed, text length:', result.length);
  return result;
}
