import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication, CV } from '@/models';
import { SkillGapAnalysisService } from '@/lib/services/skillGapAnalysisService';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();

    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    console.log('🔍 Skill Gap Analysis - Request details:', {
      jobId,
      userId,
      jobIdType: typeof jobId,
      userIdType: typeof userId
    });

    // Validate jobId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      console.error('❌ Invalid jobId format:', jobId);
      return NextResponse.json(
        { success: false, error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    // Normalize userId to ObjectId to ensure consistent querying (matches jobs API pattern)
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Fetch job application - convert both jobId and userId to ObjectId
    const job = await JobApplication.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      userId: normalizedUserId
    }).lean();

    if (!job) {
      console.error('❌ Job not found:', {
        jobId,
        userId,
        searchedWith: { _id: jobId, userId: userId }
      });
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log('✅ Job found:', {
      jobId: job._id,
      jobTitle: job.jobTitle || job.title,
      company: job.company,
      hasDescription: !!(job.jobDescription || job.description)
    });

    // Check if job has description
    const jobDescription = job.jobDescription || job.description || '';
    if (!jobDescription.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job description is required for skill gap analysis' },
        { status: 400 }
      );
    }

    // Fetch master CV
    let masterCV = await CV.findOne({
      userId: normalizedUserId,
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } },
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { isMaster: true }
      ]
    }).sort({ createdAt: -1 }).lean() as any;

    // Fallback: use oldest CV if no master CV found
    if (!masterCV) {
      masterCV = await CV.findOne({
        userId: normalizedUserId
      }).sort({ createdAt: 1 }).lean() as any;
    }

    if (!masterCV || !masterCV.cvData) {
      return NextResponse.json(
        { success: false, error: 'Master CV not found. Please create a master CV first.' },
        { status: 404 }
      );
    }

    // Check if cached analysis exists and is valid
    const currentJobDescriptionHash = SkillGapAnalysisService.generateJobDescriptionHash(jobDescription);
    const masterCVUpdatedAt = masterCV.updatedAt || masterCV.createdAt || new Date();

    if (job.skillGapAnalysis && typeof job.skillGapAnalysis === 'object' && 'lastAnalyzed' in job.skillGapAnalysis) {
      const cachedAnalysis = job.skillGapAnalysis as any;
      if (SkillGapAnalysisService.isCacheValid(
        cachedAnalysis,
        currentJobDescriptionHash,
        masterCVUpdatedAt
      )) {
        console.log('✅ Using cached skill gap analysis');
        return NextResponse.json({
          success: true,
          analysis: cachedAnalysis,
          cached: true
        });
      }
    }

    // Perform new analysis
    console.log('🔄 Computing new skill gap analysis');
    const analysis = await SkillGapAnalysisService.analyzeSkillGap(
      jobDescription,
      masterCV.cvData,
      job.jobTitle || job.title,
      job.company
    );

    // Add master CV timestamp for cache validation
    analysis.masterCVUpdatedAt = masterCVUpdatedAt;

    // Update job application with analysis
    await JobApplication.updateOne(
      { _id: new mongoose.Types.ObjectId(jobId), userId: normalizedUserId },
      { 
        $set: { 
          skillGapAnalysis: analysis 
        } 
      }
    );

    return NextResponse.json({
      success: true,
      analysis: analysis,
      cached: false
    });
  } catch (error) {
    console.error('Error in skill gap analysis:', error);
    
    // Check if it's a quota exceeded error (429)
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze skill gap';
    const isQuotaExceeded = errorMessage.includes('429') || 
                           errorMessage.includes('quota exceeded') || 
                           errorMessage.includes('RESOURCE_EXHAUSTED');
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        quotaExceeded: isQuotaExceeded
      },
      { status: isQuotaExceeded ? 429 : 500 }
    );
  }
}

