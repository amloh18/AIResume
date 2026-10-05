import { NextRequest, NextResponse } from 'next/server';
import { SkillGapAnalysisService } from '@/lib/services/skillGapAnalysisService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

// In-memory cache for skill gap analysis (cleared on server restart)
// Key: hash of jobDescription + cvData hash, Value: { analysis, timestamp }
const analysisCache = new Map<string, { analysis: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
const MAX_CACHE_SIZE = 100; // Limit cache size to prevent memory issues

// Generate a hash for CV data to detect changes
function generateCVHash(cvData: UnifiedCVDataStructure): string {
  // Create a simple hash from key CV fields
  const cvString = JSON.stringify({
    summary: cvData.basics?.summary || '',
    skills: cvData.skills || [],
    work: cvData.work?.map((w: any) => ({
      position: w.position,
      name: w.name,
      summary: w.summary
    })) || [],
    education: cvData.education?.map((e: any) => ({
      studyType: e.studyType,
      area: e.area,
      institution: e.institution
    })) || []
  });
  return createHash('sha256').update(cvString).digest('hex').substring(0, 16);
}

// Clean up old cache entries
function cleanupCache() {
  if (analysisCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(analysisCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => analysisCache.delete(key));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cvData, jobData }: { 
      cvData: UnifiedCVDataStructure; 
      jobData?: any;
    } = body;

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    // Normalize job description field
    const jobDescription = jobData?.jobDescription || jobData?.description || jobData?.jd || '';
    
    if (!jobDescription.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job description is required for skill gap analysis' },
        { status: 400 }
      );
    }

    // Generate cache key from job description and CV data
    const jobDescriptionHash = SkillGapAnalysisService.generateJobDescriptionHash(jobDescription);
    const cvHash = generateCVHash(cvData);
    const cacheKey = `${jobDescriptionHash}:${cvHash}`;

    // Check cache
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL_MS) {
        console.log('✅ Using cached skill gap analysis (age:', Math.round(age / 1000), 's)');
        return NextResponse.json({
          success: true,
          analysis: cached.analysis,
          cached: true
        });
      } else {
        // Cache expired, remove it
        analysisCache.delete(cacheKey);
      }
    }

    // Perform skill gap analysis
    console.log('🔄 Computing new skill gap analysis (cache miss)');
    const analysis = await SkillGapAnalysisService.analyzeSkillGap(
      jobDescription,
      cvData,
      jobData?.title || jobData?.jobTitle,
      jobData?.company
    );

    // Store in cache
    cleanupCache(); // Clean up before adding new entry
    analysisCache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      analysis,
      cached: false
    });
  } catch (error) {
    console.error('Error in skill gap analysis API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze skill gap' 
      },
      { status: 500 }
    );
  }
}

