import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { CV } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await getConnection();
    
    const resolvedParams = await params;
    const { userId: paramUserId } = resolvedParams;
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Master CV Report API - Invalid token type');
          return NextResponse.json(
            { error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
        
        // Verify userId matches if paramUserId is provided
        if (paramUserId && userId !== paramUserId) {
          console.log('❌ Master CV Report API - User ID mismatch');
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
        
        console.log('✅ Master CV Report API - Extension token verified for user:', userId);
      } catch (error) {
        console.log('❌ Master CV Report API - Invalid extension token:', error);
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ Master CV Report API - No valid authentication found');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      
      // Verify userId matches if paramUserId is provided
      if (paramUserId && userId !== paramUserId) {
        console.log('❌ Master CV Report API - User ID mismatch');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      console.log('✅ Master CV Report API - Web session verified for user:', userId);
    }
    
    // Use paramUserId if provided, otherwise use authenticated userId
    const targetUserId = paramUserId || userId;
    
    // Find master CV - support multiple identification methods for compatibility
    let masterCV = await CV.findOne({
      userId: new mongoose.Types.ObjectId(targetUserId),
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } },
        { 'metadata.isMaster': true }
      ]
    }).sort({ createdAt: -1 }).lean() as any;
    
    // FALLBACK: If no master CV found, use oldest CV by creation date
    if (!masterCV) {
      console.log('🔍 Master CV Report API - No master CV found, using oldest CV as fallback');
      const allCVs = await CV.find({
        userId: new mongoose.Types.ObjectId(targetUserId)
      }).sort({ createdAt: 1 }).lean() as any[];
      
      if (allCVs && allCVs.length > 0) {
        masterCV = allCVs[0];
        console.log('🔍 Master CV Report API - Using oldest CV as fallback:', {
          id: masterCV._id,
          title: masterCV.title,
          createdAt: masterCV.createdAt
        });
      }
    }
    
    if (!masterCV) {
      return NextResponse.json(
        { error: 'Master CV not found. Please create a master CV on cvcircle.io' },
        { status: 404 }
      );
    }
    
    if (!masterCV.metadata?.aiAnalysis) {
      return NextResponse.json(
        { error: 'Master CV or AI analysis not found. Please create a master CV with AI career report on cvcircle.io' },
        { status: 404 }
      );
    }
    
    // Extract skills from cvData.skills array (which has categories)
    const allSkills: string[] = [];
    if (masterCV.cvData?.skills && Array.isArray(masterCV.cvData.skills)) {
      masterCV.cvData.skills.forEach((skillCategory: any) => {
        if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
          allSkills.push(...skillCategory.skills);
        }
      });
    }
    
    // Calculate experience years from work history
    const workHistory = masterCV.cvData?.work || [];
    let totalYears = 0;
    if (workHistory.length > 0) {
      // Calculate total years from all work experiences
      // Dates are in format "YYYY-MM" (e.g., "2022-11")
      workHistory.forEach((job: any) => {
        if (job.startDate) {
          const start = new Date(job.startDate + '-01'); // Add day for proper parsing
          const end = job.endDate && job.endDate !== 'Present' 
            ? new Date(job.endDate + '-01')
            : new Date();
          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          totalYears += Math.max(0, years);
        }
      });
      totalYears = Math.round(totalYears * 10) / 10; // Round to 1 decimal place
    }
    
    // Get experience level from aiAnalysis
    const experienceLevel = masterCV.metadata.aiAnalysis.experienceLevel?.level || 'mid';
    
    // Extract industries from work history if available
    const industries: string[] = [];
    if (workHistory.length > 0) {
      workHistory.forEach((job: any) => {
        if (job.company && !industries.includes(job.company)) {
          // You could extract industry from company name or add industry field to work history
          // For now, we'll leave it empty as per the plan
        }
      });
    }
    
    // Return structured CV report with metadata.aiAnalysis
    return NextResponse.json({
      userId: masterCV.userId.toString(),
      skills: allSkills,
      experience: {
        years: totalYears || (masterCV.metadata.aiAnalysis.experienceLevel ? 5 : 0), // Fallback to 5 if not calculated
        level: experienceLevel.toLowerCase() as 'entry' | 'mid' | 'senior' | 'executive',
        industries: industries // Extract from work history if needed
      },
      education: masterCV.cvData?.education?.[0] ? {
        degree: masterCV.cvData.education[0].studyType || '',
        field: masterCV.cvData.education[0].area || '',
        institution: masterCV.cvData.education[0].institution || ''
      } : undefined,
      certifications: masterCV.cvData?.certificates?.map((cert: any) => cert.name || '').filter((name: string) => name) || [],
      // Include full aiAnalysis for advanced matching
      aiAnalysis: masterCV.metadata.aiAnalysis,
      // Include cvData for comprehensive matching
      cvData: masterCV.cvData
    });
  } catch (error: any) {
    console.error('Error fetching master CV report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

