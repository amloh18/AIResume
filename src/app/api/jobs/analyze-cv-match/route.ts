// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import mongoose from 'mongoose';
import { callGeminiWithFallback } from '@/lib/utils/gemini-api-helper';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limiter';
import crypto from 'crypto';
import { setCorsHeaders, handleCorsPreflight } from '@/lib/utils/cors-helpers';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

// In-memory cache for CV match results (in production, use Redis)
const matchCache = new Map<string, { result: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(matchCache.entries())) {
    if (now > value.expiresAt) {
      matchCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

/**
 * Generate cache key from job description
 */
function generateCacheKey(userId: string, jobDescription: string, jobTitle?: string, company?: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}-${jobDescription}-${jobTitle || ''}-${company || ''}`)
    .digest('hex')
    .substring(0, 16);
  return `cv-match-${userId}-${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    // Authenticate request (supports both session and JWT token)
    const auth = await authenticateRequest(request);
    if (!auth) {
      // Check if this was an extension request to return proper error format
      const authHeader = request.headers.get('authorization');
      const isExtension = authHeader && authHeader.startsWith('Bearer ');
      
      if (isExtension) {
        return setCorsHeaders(
          NextResponse.json(
            formatExtensionError(
              ExtensionErrorCode.AUTH_INVALID,
              'Authentication required. Please sign in again.'
            ),
            { status: 401 }
          ),
          request
        );
      }
      
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
        request
      );
    }
    
    const userId = auth.userId;
    const source = auth.source;
    
    // Rate limiting for extension requests
    if (source === 'extension') {
      const rateLimitResult = await rateLimiter.checkLimit(
        { userId, path: '/api/jobs/analyze-cv-match' },
        rateLimitConfigs.ai // Use AI rate limit config (20 requests per hour)
      );
      
      if (!rateLimitResult.allowed) {
        console.log('❌ CV Match Analysis API - Rate limit exceeded for user:', userId);
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.RATE_LIMIT_EXCEEDED,
            `Too many CV match requests. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`,
            undefined,
            true,
            Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          ),
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitConfigs.ai.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
            }
          }
        );
      }
    }
    
    const body = await request.json();
    const { jobDescription, jobTitle, company } = body;
    
    if (!jobDescription) {
      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.JOB_VALIDATION_FAILED,
            'Job description is required'
          ),
          { status: 400 }
        );
      }
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
      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.CV_NOT_FOUND,
            'Master CV or AI analysis not found. Please create a master CV on cvcircle.io'
          ),
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Master CV or AI analysis not found. Please create a master CV on cvcircle.io' },
        { status: 404 }
      );
    }
    
    // Check cache first
    const cacheKey = generateCacheKey(userId, jobDescription, jobTitle, company);
    const cached = matchCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiresAt) {
      console.log('✅ CV Match Analysis API - Returning cached result');
      if (source === 'extension') {
        return setCorsHeaders(
          NextResponse.json(formatExtensionSuccess(cached.result)),
          request
        );
      }
      return setCorsHeaders(
        NextResponse.json(cached.result),
        request
      );
    }
    
    // Use AI to analyze match with timeout
    let matchResult;
    try {
      matchResult = await Promise.race([
        analyzeCVMatchWithAI(
          masterCV.metadata.aiAnalysis,
          masterCV.cvData,
          jobDescription,
          jobTitle,
          company
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('CV match analysis timed out')), 30000) // 30 second timeout
        )
      ]) as any;
      
      // Cache the result
      matchCache.set(cacheKey, {
        result: matchResult,
        expiresAt: Date.now() + CACHE_TTL_MS
      });
      
      if (source === 'extension') {
        return setCorsHeaders(
          NextResponse.json(formatExtensionSuccess(matchResult)),
          request
        );
      }
      return setCorsHeaders(
        NextResponse.json(matchResult),
        request
      );
    } catch (timeoutError: any) {
      console.error('❌ CV Match Analysis API - Timeout or error:', timeoutError);
      
      if (source === 'extension') {
        return setCorsHeaders(
          NextResponse.json(
            formatExtensionError(
              timeoutError.message?.includes('timeout') 
                ? ExtensionErrorCode.CV_MATCH_TIMEOUT
                : ExtensionErrorCode.CV_MATCH_FAILED,
              timeoutError.message || 'Failed to analyze CV match',
              undefined,
              true // Retryable
            ),
            { status: 500 }
          ),
          request
        );
      }
      
      return setCorsHeaders(
        NextResponse.json(
          { error: timeoutError.message || 'Failed to analyze CV match' },
          { status: 500 }
        ),
        request
      );
    }
  } catch (error: any) {
    console.error('Error analyzing CV match:', error);
    
    // Determine source from request
    const authHeader = request.headers.get('authorization');
    const isExtension = authHeader && authHeader.startsWith('Bearer ');
    
    if (isExtension) {
      return setCorsHeaders(
        NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.CV_MATCH_FAILED,
            error.message || 'Failed to analyze CV match',
            undefined,
            true // Retryable
          ),
          { status: 500 }
        ),
        request
      );
    }
    
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to analyze CV match' },
        { status: 500 }
      ),
      request
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
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
      model: 'gemini-2.0-flash-lite-preview-02-05'
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

