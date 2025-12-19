import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';
import * as crypto from 'crypto';

/**
 * Generate a hash of CV content for cache invalidation
 */
function generateContentHash(cvData: any, jobData?: any): string {
  const contentToHash = {
    basics: cvData?.basics,
    work: cvData?.work,
    education: cvData?.education,
    skills: cvData?.skills,
    projects: cvData?.projects,
    certificates: cvData?.certificates,
    languages: cvData?.languages,
    volunteer: cvData?.volunteer,
    // Include job data in hash if present
    jobDescription: jobData?.description || jobData?.jobDescription || jobData?.jd || null,
    jobTitle: jobData?.title || jobData?.jobTitle || null
  };
  
  return crypto
    .createHash('md5')
    .update(JSON.stringify(contentToHash))
    .digest('hex');
}

/**
 * Generate a hash of job data for separate tracking
 */
function generateJobDataHash(jobData?: any): string | null {
  if (!jobData) return null;
  
  const jobContent = {
    description: jobData?.description || jobData?.jobDescription || jobData?.jd || null,
    title: jobData?.title || jobData?.jobTitle || null,
    company: jobData?.company || null
  };
  
  // Only generate hash if there's meaningful job data
  if (!jobContent.description && !jobContent.title) return null;
  
  return crypto
    .createHash('md5')
    .update(JSON.stringify(jobContent))
    .digest('hex');
}

/**
 * Check if cached analysis is still valid
 */
function isCacheValid(
  cachedAnalysis: any,
  currentContentHash: string,
  targetRole: string,
  seniorityLevel: string
): boolean {
  if (!cachedAnalysis) return false;
  if (!cachedAnalysis.contentHash) return false;
  if (!cachedAnalysis.analyzedAt) return false;
  
  // Check if content has changed
  if (cachedAnalysis.contentHash !== currentContentHash) {
    console.log('🔄 Surgeon analysis cache invalid: content changed');
    return false;
  }
  
  // Check if role context has changed
  if (cachedAnalysis.targetRole !== targetRole || cachedAnalysis.seniorityLevel !== seniorityLevel) {
    console.log('🔄 Surgeon analysis cache invalid: role context changed');
    return false;
  }
  
  // Cache is valid for 24 hours max
  const cacheAge = Date.now() - new Date(cachedAnalysis.analyzedAt).getTime();
  const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
  if (cacheAge > maxCacheAge) {
    console.log('🔄 Surgeon analysis cache invalid: expired (>24h)');
    return false;
  }
  
  return true;
}

/**
 * GET - Fetch cached surgeon analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetRole = searchParams.get('targetRole') || '';
    const seniorityLevel = searchParams.get('seniorityLevel') || '';
    const jobDataParam = searchParams.get('jobData');
    
    let jobData = null;
    if (jobDataParam) {
      try {
        jobData = JSON.parse(jobDataParam);
      } catch {
        // Ignore parse errors
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const cvId = toObjectId(id);
    const cv = await CV.findOne({ _id: cvId, userId }).lean() as any;
    
    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    const cachedAnalysis = cv.metadata?.surgeonAnalysis;
    
    if (!cachedAnalysis) {
      return NextResponse.json({
        success: true,
        cached: false,
        analysis: null,
        message: 'No cached analysis found'
      });
    }

    // Generate current content hash for validation
    const currentContentHash = generateContentHash(cv.cvData, jobData);
    
    // Check if cache is valid
    const isValid = isCacheValid(cachedAnalysis, currentContentHash, targetRole, seniorityLevel);
    
    if (!isValid) {
      return NextResponse.json({
        success: true,
        cached: false,
        analysis: null,
        message: 'Cache invalidated - content or context changed'
      });
    }

    console.log('✅ Returning cached surgeon analysis for CV:', id);
    
    return NextResponse.json({
      success: true,
      cached: true,
      analysis: {
        score: cachedAnalysis.score,
        fixes: cachedAnalysis.fixes || [],
        annotations: cachedAnalysis.annotations || [],
        analyzedAt: cachedAnalysis.analyzedAt
      }
    });

  } catch (error: any) {
    console.error('Get surgeon analysis error:', error);
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

/**
 * POST - Save surgeon analysis to cache
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const { id } = await params;
    const body = await request.json();
    const { 
      userId, 
      score, 
      fixes, 
      annotations,
      targetRole,
      seniorityLevel,
      jobData
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (score === undefined || !Array.isArray(fixes) || !Array.isArray(annotations)) {
      return NextResponse.json(
        { success: false, error: 'Score, fixes, and annotations are required' },
        { status: 400 }
      );
    }

    const cvId = toObjectId(id);
    const cv = await CV.findOne({ _id: cvId, userId });
    
    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Generate content hash for future cache validation
    const contentHash = generateContentHash(cv.cvData, jobData);
    const jobDataHash = generateJobDataHash(jobData);

    // Save surgeon analysis to metadata
    const surgeonAnalysis = {
      score,
      fixes,
      annotations,
      targetRole: targetRole || '',
      seniorityLevel: seniorityLevel || '',
      analyzedAt: new Date(),
      contentHash,
      jobDataHash
    };

    cv.metadata = cv.metadata || {} as any;
    (cv.metadata as any).surgeonAnalysis = surgeonAnalysis;
    cv.markModified('metadata.surgeonAnalysis');
    
    await cv.save();

    console.log('✅ Saved surgeon analysis to CV:', id, { score, fixCount: fixes.length });

    return NextResponse.json({
      success: true,
      message: 'Surgeon analysis saved successfully',
      data: {
        analyzedAt: surgeonAnalysis.analyzedAt,
        contentHash
      }
    });

  } catch (error: any) {
    console.error('Save surgeon analysis error:', error);
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

/**
 * DELETE - Clear cached surgeon analysis
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const cvId = toObjectId(id);
    const cv = await CV.findOne({ _id: cvId, userId });
    
    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Clear surgeon analysis
    if (cv.metadata) {
      (cv.metadata as any).surgeonAnalysis = undefined;
      cv.markModified('metadata.surgeonAnalysis');
      await cv.save();
    }

    console.log('✅ Cleared surgeon analysis cache for CV:', id);

    return NextResponse.json({
      success: true,
      message: 'Surgeon analysis cache cleared'
    });

  } catch (error: any) {
    console.error('Clear surgeon analysis error:', error);
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

