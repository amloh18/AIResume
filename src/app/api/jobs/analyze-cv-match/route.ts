import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { CV } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';
import { callGeminiWithFallback } from '@/lib/utils/gemini-api-helper';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ CV Match Analysis API - Invalid token type');
          return NextResponse.json(
            { error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
        console.log('✅ CV Match Analysis API - Extension token verified for user:', userId);
      } catch (error) {
        console.log('❌ CV Match Analysis API - Invalid extension token:', error);
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ CV Match Analysis API - No valid authentication found');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ CV Match Analysis API - Web session verified for user:', userId);
    }
    
    const body = await request.json();
    const { jobDescription, jobTitle, company } = body;
    
    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }
    
    // Fetch master CV with metadata.aiAnalysis
    // Find master CV - support multiple identification methods for compatibility
    let masterCV = await CV.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } },
        { 'metadata.isMaster': true }
      ]
    }).sort({ createdAt: -1 }).lean() as any;
    
    // FALLBACK: If no master CV found, use oldest CV by creation date
    if (!masterCV) {
      console.log('🔍 CV Match Analysis API - No master CV found, using oldest CV as fallback');
      const allCVs = await CV.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ createdAt: 1 }).lean() as any[];
      
      if (allCVs && allCVs.length > 0) {
        masterCV = allCVs[0];
      }
    }
    
    if (!masterCV || !masterCV.metadata?.aiAnalysis) {
      return NextResponse.json(
        { error: 'Master CV or AI analysis not found. Please create a master CV on cvcircle.io' },
        { status: 404 }
      );
    }
    
    // Use AI to analyze match
    const matchResult = await analyzeCVMatchWithAI(
      masterCV.metadata.aiAnalysis,
      masterCV.cvData,
      jobDescription,
      jobTitle,
      company
    );
    
    return NextResponse.json(matchResult);
  } catch (error) {
    console.error('Error analyzing CV match:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CV match' },
      { status: 500 }
    );
  }
}

async function analyzeCVMatchWithAI(
  aiAnalysis: any,
  cvData: any,
  jobDescription: string,
  jobTitle?: string,
  company?: string
) {
  // Extract skills from cvData.skills array (which has categories)
  const allSkills: string[] = [];
  if (cvData?.skills && Array.isArray(cvData.skills)) {
    cvData.skills.forEach((skillCategory: any) => {
      if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
        allSkills.push(...skillCategory.skills);
      }
    });
  }
  
  // Get experience level from aiAnalysis
  const experienceLevel = aiAnalysis.experienceLevel?.level || 'mid';
  
  // Calculate experience years from work history
  // Dates are in format "YYYY-MM" (e.g., "2022-11")
  let experienceYears = 0;
  if (cvData?.work && Array.isArray(cvData.work) && cvData.work.length > 0) {
    cvData.work.forEach((job: any) => {
      if (job.startDate) {
        const start = new Date(job.startDate + '-01'); // Add day for proper parsing
        const end = job.endDate && job.endDate !== 'Present' 
          ? new Date(job.endDate + '-01')
          : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        experienceYears += Math.max(0, years);
      }
    });
    experienceYears = Math.round(experienceYears * 10) / 10; // Round to 1 decimal place
  }
  
  // Prepare CV data for AI comparison
  const cvProfile = {
    skills: allSkills,
    experience: {
      years: experienceYears,
      level: experienceLevel.toLowerCase(),
      workHistory: cvData?.work || []
    },
    education: cvData?.education || [],
    certifications: cvData?.certificates?.map((cert: any) => cert.name) || [],
    summary: cvData?.basics?.summary || '',
    projects: cvData?.projects || [],
    // Include AI analysis insights
    aiAnalysis: {
      experienceLevel: aiAnalysis.experienceLevel,
      careerPath: aiAnalysis.careerPath,
      impactScore: aiAnalysis.impactScore,
      industrySpecialization: aiAnalysis.industrySpecialization
    }
  };
  
  // Create AI prompt for comparison
  const prompt = `You are a career matching expert. Compare this CV profile against the job description and provide a detailed match analysis.

CV PROFILE:
${JSON.stringify(cvProfile, null, 2)}

JOB DETAILS:
Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}
Description:
${jobDescription}

Provide a comprehensive JSON response with the following structure:
{
  "matchScore": <number 0-100>,
  "isTopApplicant": <boolean - true if matchScore >= 80>,
  "matchedSkills": <array of skills that match>,
  "missingSkills": <array of required skills not in CV>,
  "experienceMatch": <boolean>,
  "educationMatch": <boolean>,
  "summary": <brief text summary of the match>,
  "skillMatchScore": <number 0-100 - percentage of required skills matched>,
  "experienceMatchScore": <number 0-100>,
  "educationMatchScore": <number 0-100>,
  "skillGapAnalysis": {
    "critical": <array of must-have skills missing>,
    "important": <array of nice-to-have skills missing>,
    "recommendations": <array of improvement suggestions>
  },
  "cvRecommendations": <array of specific CV improvement tips>
}

Be thorough and accurate. Consider:
- Skill relevance and depth
- Experience level alignment
- Education requirements
- Industry fit
- Soft skills mentioned in job description
- Quantifiable achievements`;

  try {
    const result = await callGeminiWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
      model: 'gemini-2.5-flash-lite'
    });
    
    const text = result.content;
    
    // Parse JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }
    
    const matchResult = JSON.parse(jsonMatch[0]);
    
    // Validate and structure the response
    return {
      matchScore: Math.min(100, Math.max(0, matchResult.matchScore || 0)),
      isTopApplicant: (matchResult.matchScore || 0) >= 80,
      matchedSkills: matchResult.matchedSkills || [],
      missingSkills: matchResult.missingSkills || [],
      experienceMatch: matchResult.experienceMatch || false,
      educationMatch: matchResult.educationMatch || false,
      summary: matchResult.summary || 'Match analysis completed',
      skillMatchScore: matchResult.skillMatchScore || 0,
      experienceMatchScore: matchResult.experienceMatchScore || 0,
      educationMatchScore: matchResult.educationMatchScore || 0,
      skillGapAnalysis: matchResult.skillGapAnalysis || {
        critical: [],
        important: [],
        recommendations: []
      },
      cvRecommendations: matchResult.cvRecommendations || []
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    // Fallback to basic keyword matching if AI fails
    return fallbackKeywordMatching(cvProfile, jobDescription);
  }
}

// Fallback function if AI fails
function fallbackKeywordMatching(cvProfile: any, jobDescription: string) {
  const jobLower = jobDescription.toLowerCase();
  const cvSkills = (cvProfile.skills || []).map((s: string) => s.toLowerCase());
  
  // Extract skills from job description (basic keyword matching)
  const commonSkills = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
    'node.js', 'express', 'django', 'aws', 'docker', 'kubernetes', 'sql',
    'mongodb', 'postgresql', 'git', 'agile', 'scrum', 'ci/cd', 'devops',
    'html', 'css', 'redux', 'graphql', 'rest', 'api', 'microservices',
    'machine learning', 'ml', 'ai', 'data science', 'analytics', 'tableau',
    'project management', 'leadership', 'communication', 'teamwork'
  ];
  
  const jobSkills = commonSkills.filter(skill => jobLower.includes(skill));
  const matchedSkills = jobSkills.filter(skill => 
    cvSkills.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
  );
  const missingSkills = jobSkills.filter(skill => !matchedSkills.includes(skill));
  
  const skillMatchScore = jobSkills.length > 0 
    ? (matchedSkills.length / jobSkills.length) * 100 
    : 0;
  
  return {
    matchScore: Math.round(skillMatchScore * 0.7), // Weighted score
    isTopApplicant: skillMatchScore >= 80,
    matchedSkills,
    missingSkills,
    experienceMatch: true, // Assume match for fallback
    educationMatch: true,
    summary: `Matched ${matchedSkills.length} of ${jobSkills.length} required skills`,
    skillMatchScore: Math.round(skillMatchScore),
    experienceMatchScore: 50,
    educationMatchScore: 50,
    skillGapAnalysis: {
      critical: [],
      important: missingSkills,
      recommendations: missingSkills.map(skill => `Consider learning ${skill}`)
    },
    cvRecommendations: []
  };
}

