import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import CV from '@/models/CV';
import User from '@/models/User';
import mongoose from 'mongoose';
import { requireAdmin } from '@/lib/middleware/admin-auth';

/**
 * POST /api/admin/drafts/convert
 * Bulk convert drafts to Master CVs
 * Support for user ID or session ID targeting
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    const session = await requireAdmin(request);
    const adminUser = session.user as any;

    await getConnection();

    const body = await request.json();
    const { userId, sessionId, draftIds } = body;

    if (!userId && !sessionId && !draftIds) {
      return NextResponse.json(
        { success: false, error: 'userId, sessionId, or draftIds is required' },
        { status: 400 }
      );
    }

    // Build query
    const query: any = { isForMasterCV: true, convertedAt: { $exists: false } };

    if (draftIds && Array.isArray(draftIds)) {
      query._id = { $in: draftIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    } else if (sessionId) {
      query.sessionId = sessionId;
    }

    // Find drafts
    const drafts = await TemporaryCVDraft.find(query);

    if (drafts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No drafts found to convert',
        converted: 0
      });
    }

    const results = [];
    const errors = [];

    for (const draft of drafts) {
      try {
        if (!draft.userId) {
          errors.push({
            draftId: draft._id.toString(),
            error: 'Draft is not linked to a user'
          });
          continue;
        }

        // Find user
        const user = await User.findById(draft.userId);
        if (!user) {
          errors.push({
            draftId: draft._id.toString(),
            error: 'User not found'
          });
          continue;
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
        draft.convertedBy = new mongoose.Types.ObjectId(adminUser.id || session.user.id);
        draft.conversionMethod = 'admin';
        await draft.save();

        results.push({
          draftId: draft._id.toString(),
          cvId: masterCV._id.toString(),
          userId: user._id.toString(),
          success: true
        });
      } catch (error: any) {
        errors.push({
          draftId: draft._id.toString(),
          error: error.message || 'Failed to convert'
        });
      }
    }

    return NextResponse.json({
      success: true,
      converted: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Admin bulk convert error:', error);
    
    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert drafts' },
      { status: 500 }
    );
  }
}

