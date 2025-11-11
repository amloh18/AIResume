import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getConnection from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvData, isMaster } = await request.json();

    if (!cvData) {
      return NextResponse.json({ error: 'CV data is required' }, { status: 400 });
    }

    await getConnection();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // CRITICAL FIX: Check if Master CV already exists - prevent duplicate creation
    // Master CV should only be created via ai-career-report convert-to-master endpoint
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
      // Update existing master CV instead of creating new one
      existingMasterCV.cvData = cvData;
      existingMasterCV.markModified('cvData');
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        lastModified: new Date()
      };
      existingMasterCV.markModified('metadata');
      await existingMasterCV.save();
      
      return NextResponse.json({ 
        success: true, 
        cv: {
          id: existingMasterCV._id,
          title: existingMasterCV.title,
          isMaster: existingMasterCV.metadata.isMaster
        },
        message: 'Master CV updated successfully'
      });
    }

    // Create Master CV
    const masterCV = new CV({
      userId: user._id,
      title: 'Master CV',
      cvData,
      journeyId: null, // Master CV is not tied to any specific journey
      templateId: 'default', // Use default template
      status: 'draft',
      metadata: {
        isMaster: true, // Set isMaster in metadata, not top-level
        lastModified: new Date(),
        tags: ['master-cv'],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    await masterCV.save();

    // Update user's subscription and usage
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'subscription.planKey': 'free',
        'subscription.status': 'active',
        'subscription.startDate': new Date(),
        'usage.journeysCreated': 0
      }
    });

    return NextResponse.json({ 
      success: true, 
      cv: {
        id: masterCV._id,
        title: masterCV.title,
        isMaster: masterCV.metadata.isMaster
      }
    });

  } catch (error) {
    console.error('Error creating master CV:', error);
    return NextResponse.json(
      { error: 'Failed to create master CV' },
      { status: 500 }
    );
  }
}
