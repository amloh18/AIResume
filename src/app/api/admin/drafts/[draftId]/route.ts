import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import CV from '@/models/CV';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/admin/drafts/[draftId]
 * Get full draft details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let adminUser: MyJwtPayload;
    try {
      adminUser = jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 401 });
    }

    await getConnection();

    const draft = await TemporaryCVDraft.findById(params.draftId)
      .populate('userId', 'email firstName lastName _id')
      .populate('convertedBy', 'email firstName lastName _id')
      .lean();

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: draft._id.toString(),
        userId: draft.userId?._id?.toString() || null,
        user: draft.userId ? {
          id: draft.userId._id.toString(),
          email: draft.userId.email,
          name: `${draft.userId.firstName || ''} ${draft.userId.lastName || ''}`.trim()
        } : null,
        sessionId: draft.sessionId,
        cvData: draft.cvData,
        aiAnalysis: draft.aiAnalysis,
        currentStep: draft.currentStep,
        jobId: draft.jobId?.toString() || null,
        jobData: draft.jobData,
        completedSteps: draft.completedSteps,
        activeSection: draft.activeSection,
        availableSections: draft.availableSections,
        convertedAt: draft.convertedAt || null,
        convertedBy: draft.convertedBy ? {
          id: draft.convertedBy._id.toString(),
          email: draft.convertedBy.email,
          name: `${draft.convertedBy.firstName || ''} ${draft.convertedBy.lastName || ''}`.trim()
        } : null,
        conversionMethod: draft.conversionMethod || null,
        adminNotes: draft.adminNotes || null,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        expiresAt: draft.expiresAt,
        lastAccessedAt: draft.lastAccessedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Admin draft detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch draft' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/drafts/[draftId]
 * Convert draft to Master CV (admin override)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let adminUser: MyJwtPayload;
    try {
      adminUser = jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 401 });
    }

    await getConnection();

    const draft = await TemporaryCVDraft.findById(params.draftId);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    if (!draft.userId) {
      return NextResponse.json(
        { success: false, error: 'Draft is not linked to a user. Cannot convert.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(draft.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if Master CV already exists
    const existingMasterCV = await CV.findOne({
      userId: user._id,
      $or: [
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { isMaster: true },
        { isMaster: 'true' }
      ]
    });

    let masterCV;
    if (existingMasterCV) {
      // Update existing Master CV
      existingMasterCV.cvData = draft.cvData;
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        aiAnalysis: draft.aiAnalysis,
        lastModified: new Date()
      };
      await existingMasterCV.save();
      masterCV = existingMasterCV;
    } else {
      // Create new Master CV
      masterCV = new CV({
        userId: user._id,
        title: `${draft.cvData.basics?.name || 'User'}'s Master CV`,
        cvData: draft.cvData,
        templateId: 'default',
        status: 'draft',
        metadata: {
          isMaster: true,
          tags: ['master-cv', 'ai-career-report', 'admin-converted'],
          isPublic: false,
          aiAnalysis: draft.aiAnalysis,
          createdVia: 'ai-career-report',
          lastModified: new Date(),
          viewCount: 0,
          downloadCount: 0,
          starred: false
        }
      });
      await masterCV.save();
    }

    // Mark draft as converted
    draft.convertedAt = new Date();
    draft.convertedBy = new mongoose.Types.ObjectId(adminUser.id);
    draft.conversionMethod = 'admin';
    await draft.save();

    console.log('✅ Admin converted draft to Master CV:', {
      draftId: draft._id.toString(),
      cvId: masterCV._id.toString(),
      userId: user._id.toString(),
      adminId: adminUser.id
    });

    return NextResponse.json({
      success: true,
      cv: masterCV,
      message: 'Master CV created/updated successfully by admin'
    });

  } catch (error: any) {
    console.error('❌ Admin convert draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert draft' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/drafts/[draftId]
 * Delete draft (admin cleanup)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
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

    const result = await TemporaryCVDraft.deleteOne({ _id: params.draftId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Admin delete draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete draft' },
      { status: 500 }
    );
  }
}

