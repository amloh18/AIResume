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

    // Check if Master CV already exists (limit: 1 per user)
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
      return NextResponse.json(
        { 
          error: 'Master CV already exists. You can only have one Master CV. Please edit your existing Master CV instead.',
          existingMasterCVId: existingMasterCV._id
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create Master CV
    const masterCV = new CV({
      userId: user._id,
      title: 'Master CV',
      cvData,
      isMaster: true,
      journeyId: null, // Master CV is not tied to any specific journey
      templateId: 'default', // Use default template
      status: 'draft'
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
        isMaster: masterCV.isMaster
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
