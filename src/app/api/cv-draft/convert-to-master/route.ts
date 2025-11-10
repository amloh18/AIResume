import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import CV from '@/models/CV';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Convert temporary CV draft to Master CV after authentication
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find the draft for this user
    const draft = await TemporaryCVDraft.findOne({ 
      userId: session.user.id, 
      isForMasterCV: true 
    }).sort({ updatedAt: -1 });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'No CV draft found' },
        { status: 404 }
      );
    }

    // Find user
    const user = await User.findById(session.user.id);
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

    if (existingMasterCV) {
      // Update existing Master CV instead of creating new one
      existingMasterCV.cvData = draft.cvData;
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        aiAnalysis: draft.aiAnalysis,
        lastModified: new Date()
      };
      await existingMasterCV.save();

      // Mark draft as converted (don't delete immediately - keep for admin tracking)
      draft.convertedAt = new Date();
      draft.conversionMethod = 'user';
      await draft.save();

      return NextResponse.json({
        success: true,
        cv: existingMasterCV,
        message: 'Master CV updated successfully'
      });
    }

    // Create new Master CV
    const masterCV = new CV({
      userId: user._id,
      title: `${draft.cvData.basics?.name || 'User'}'s Master CV`,
      cvData: draft.cvData,
      templateId: 'default',
      status: 'draft',
      metadata: {
        isMaster: true,
        tags: ['master-cv', 'ai-career-report'],
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

    // Mark draft as converted (don't delete immediately - keep for admin tracking)
    draft.convertedAt = new Date();
    draft.conversionMethod = 'user';
    await draft.save();

    console.log('✅ Converted draft to Master CV:', {
      draftId: draft._id.toString(),
      cvId: masterCV._id.toString(),
      userId: user._id.toString()
    });

    return NextResponse.json({
      success: true,
      cv: masterCV,
      message: 'Master CV created successfully'
    });

  } catch (error: any) {
    console.error('❌ Convert to Master CV error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert draft to Master CV' },
      { status: 500 }
    );
  }
}

