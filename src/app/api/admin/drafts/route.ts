import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/admin/drafts
 * List all drafts with pagination and filters
 * Admin authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 401 });
    }

    await getConnection();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status'); // 'anonymous', 'linked', 'converted', 'expired'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query: any = { isForMasterCV: true };

    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (status === 'anonymous') {
      query.userId = { $exists: false };
    } else if (status === 'linked') {
      query.userId = { $exists: true };
      query.convertedAt = { $exists: false };
    } else if (status === 'converted') {
      query.convertedAt = { $exists: true };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get drafts with user population
    const drafts = await TemporaryCVDraft.find(query)
      .populate('userId', 'email firstName lastName')
      .populate('convertedBy', 'email firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await TemporaryCVDraft.countDocuments(query);

    // Format response
    const formattedDrafts = drafts.map((draft: any) => ({
      id: draft._id.toString(),
      userId: draft.userId?._id?.toString() || null,
      userEmail: draft.userId?.email || null,
      userName: draft.userId ? `${draft.userId.firstName || ''} ${draft.userId.lastName || ''}`.trim() : null,
      sessionId: draft.sessionId,
      currentStep: draft.currentStep,
      cvDataPreview: {
        name: draft.cvData?.basics?.name || 'N/A',
        workCount: draft.cvData?.work?.length || 0,
        educationCount: draft.cvData?.education?.length || 0,
        projectsCount: draft.cvData?.projects?.length || 0
      },
      hasAiAnalysis: !!draft.aiAnalysis,
      status: draft.convertedAt ? 'converted' : (draft.userId ? 'linked' : 'anonymous'),
      convertedAt: draft.convertedAt || null,
      convertedBy: draft.convertedBy ? {
        id: draft.convertedBy._id.toString(),
        email: draft.convertedBy.email,
        name: `${draft.convertedBy.firstName || ''} ${draft.convertedBy.lastName || ''}`.trim()
      } : null,
      conversionMethod: draft.conversionMethod || null,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      expiresAt: draft.expiresAt,
      lastAccessedAt: draft.lastAccessedAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedDrafts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Admin drafts list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

