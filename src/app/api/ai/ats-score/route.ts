import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { JobApplication } from '@/models';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import { getCVWithTemplate } from '@/lib/cv-template-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { cvId, jobId, userId, journeyId } = await req.json();

    console.log('🔍 ATS AI API - Request received:', { cvId, jobId, userId });

    if (!cvId) {
      return NextResponse.json(
        { success: false, error: 'CV ID is required' },
        { status: 400 }
      );
    }

    // Load CV data directly from database
    console.log('🔍 ATS AI API - Loading CV data for:', cvId);
    
    // First check if CV exists and user has access
    const cvDoc = await CV.findOne({
      _id: cvId,
      ...(userId ? { userId: userId } : {})
    });
    
    if (!cvDoc) {
      console.log('❌ ATS AI API - CV not found:', cvId);
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }
    
    // Get CV with template data
    const cvData = await getCVWithTemplate(cvId);
    if (!cvData) {
      console.log('❌ ATS AI API - CV data not found after template fetch:', cvId);
      return NextResponse.json(
        { success: false, error: 'CV data not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ ATS AI API - CV data loaded successfully');
    console.log('🔍 ATS AI API - CV data structure:', {
      hasCvData: !!cvData.cvData,
      hasBasics: !!cvData.cvData?.basics,
      hasWork: !!cvData.cvData?.work,
      hasEducation: !!cvData.cvData?.education,
      hasSkills: !!cvData.cvData?.skills
    });

    // Load job data if provided
    let jobData = null;
    if (jobId) {
      try {
        console.log('🔍 ATS AI API - Loading job data for:', jobId);
        if (!userId) {
          console.warn('⚠️ ATS AI API - No userId provided, skipping job data fetch');
        } else {
          jobData = await JobApplication.findOne({
            _id: jobId,
            userId: userId
          });
          
          if (jobData) {
            console.log('✅ ATS AI API - Job data loaded successfully');
          } else {
            console.warn('⚠️ ATS AI API - Job not found, proceeding without job data');
          }
        }
      } catch (error) {
        console.warn('⚠️ ATS AI API - Job not found, proceeding with general ATS analysis:', error);
      }
    }

    // Calculate ATS score using simple text-based analysis
    console.log('🔍 ATS AI API - Starting ATS calculation');
    
    // Extract the actual CV data from the template structure
    const actualCvData = cvData.cvData;
    if (!actualCvData) {
      console.log('❌ ATS AI API - No CV data found in template structure');
      return NextResponse.json(
        { success: false, error: 'CV data is empty or invalid' },
        { status: 400 }
      );
    }
    
    console.log('🔍 ATS AI API - CV data extracted:', {
      hasBasics: !!actualCvData.basics,
      hasWork: !!actualCvData.work,
      hasEducation: !!actualCvData.education,
      hasSkills: !!actualCvData.skills
    });
    
    // Convert CV data to text for analysis
    const cvText = convertCVToText(actualCvData);
    console.log('📄 ATS AI API - CV text length:', cvText.length);
    
    if (!cvText || cvText.trim().length === 0) {
      console.log('❌ ATS AI API - CV text is empty');
      return NextResponse.json(
        { success: false, error: 'CV content is empty. Please add content to your CV.' },
        { status: 400 }
      );
    }
    
    // Extract job description
    let jobDescription = '';
    if (jobData) {
      jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || '';
      console.log('📄 ATS AI API - Job description length:', jobDescription.length);
    }
    
    // Simple ATS score calculation
    const atsScore = calculateSimpleATSScore(cvText, jobDescription);
    console.log('✅ ATS AI API - ATS calculation completed:', { score: atsScore });

    // Save ATS score to journey database if journeyId is provided
    if (journeyId && userId) {
      try {
        console.log('🔍 ATS AI API - Saving ATS score to journey database:', { journeyId, atsScore });
        
        // Create ATS score history entry
        const atsHistoryEntry = {
          score: atsScore,
          calculatedAt: new Date(),
          cvVersion: cvDoc.version?.toString() || '1'
        };

        // Update journey with new ATS score and history
        const updatedJourney = await ApplicationJourney.findByIdAndUpdate(
          journeyId,
          {
            $set: {
              atsScore: atsScore,
              lastWorkedOn: new Date()
            },
            $push: {
              atsScoreHistory: atsHistoryEntry
            }
          },
          { new: true }
        );

        if (updatedJourney) {
          console.log('✅ ATS AI API - ATS score saved to journey database successfully');
        } else {
          console.warn('⚠️ ATS AI API - Journey not found for ID:', journeyId);
        }
      } catch (error) {
        console.error('❌ ATS AI API - Failed to save ATS score to journey:', error);
        // Don't fail the request if saving to journey fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score: atsScore,
        missingKeywords: [],
        strengths: ['Professional experience', 'Education background'],
        suggestions: atsScore < 70 ? ['Consider adding more relevant keywords', 'Include quantifiable achievements'] : ['Great job! Your CV looks well-optimized']
      }
    });

  } catch (error: any) {
    console.error('❌ ATS AI API - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to calculate ATS score' 
      },
      { status: 500 }
    );
  }
}

// Helper function to convert CV data to text
function convertCVToText(cvData: any): string {
  if (!cvData) {
    console.log('🔍 ATS AI API - convertCVToText: No CV data provided');
    return '';
  }
  
  let cvText = '';
  
  console.log('🔍 ATS AI API - convertCVToText: Starting conversion with data structure:', {
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
  
  const result = cvText.trim();
  console.log('🔍 ATS AI API - convertCVToText: Conversion completed, text length:', result.length);
  return result;
}

// Helper function to calculate simple ATS score
function calculateSimpleATSScore(cvText: string, jobDescription: string): number {
  if (!cvText || cvText.trim().length === 0) {
    return 0;
  }
  
  let structureScore = 0;
  let contentScore = 0;
  let matchScore = 0;
  
  // Check for essential CV structure elements (30% weight)
  const hasName = /[A-Za-z]{2,}/.test(cvText);
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cvText);
  const hasPhone = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(cvText);
  const hasExperience = /(experience|worked|job|position|role|career)/i.test(cvText);
  const hasEducation = /(education|degree|university|college|bachelor|master|phd)/i.test(cvText);
  const hasSkills = /(skills|technologies|programming|software|tools)/i.test(cvText);
  
  // Structure score: max 30 points
  if (hasName) structureScore += 5;
  if (hasEmail) structureScore += 5;
  if (hasPhone) structureScore += 3;
  if (hasExperience) structureScore += 7;
  if (hasEducation) structureScore += 5;
  if (hasSkills) structureScore += 5;
  
  // Content quality score (20% weight) - based on content length and depth
  const wordCount = cvText.split(/\s+/).length;
  if (wordCount > 50) contentScore += 5;
  if (wordCount > 150) contentScore += 5;
  if (wordCount > 300) contentScore += 5;
  if (wordCount > 500) contentScore += 5;
  
  // If job description is provided, do keyword matching (50% weight)
  if (jobDescription && jobDescription.trim().length > 0) {
    const jobKeywords = extractKeywords(jobDescription);
    const cvKeywords = extractKeywords(cvText);
    
    if (jobKeywords.length > 0) {
      const matchingKeywords = cvKeywords.filter(keyword => 
        jobKeywords.some(jobKeyword => 
          jobKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(jobKeyword.toLowerCase())
        )
      );
      
      // Calculate match percentage based on job keywords found in CV
      const matchPercentage = matchingKeywords.length / jobKeywords.length;
      matchScore = Math.round(matchPercentage * 50); // Max 50 points
      
      console.log('🔍 ATS Score Calculation:', {
        jobKeywords: jobKeywords.length,
        cvKeywords: cvKeywords.length,
        matchingKeywords: matchingKeywords.length,
        matchPercentage: Math.round(matchPercentage * 100) + '%',
        matchScore
      });
    }
  } else {
    // If no job description, give a baseline match score of 25 (50% of max)
    matchScore = 25;
  }
  
  const finalScore = structureScore + contentScore + matchScore;
  return Math.min(100, Math.max(0, Math.round(finalScore)));
}

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
    .slice(0, 50); // Limit to 50 keywords
}
