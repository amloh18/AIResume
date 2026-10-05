import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User, CV } from '@/models';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    const body = await request.json();
    const { jobTitle, location, professionalSummary, allowMessage, allowVideoCall } = body;

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Master CV is ONLY identified by ai-career-report creation
    // Find master CV created via ai-career-report
    let cv = await CV.findOne({
      userId: user._id,
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } }
      ]
    }).sort({ createdAt: -1 });

    // FALLBACK: If no ai-career-report master CV found, use oldest CV by creation date
    if (!cv) {
      console.log('🔍 Update Profile - No ai-career-report master CV found, using oldest CV as fallback');
      const allCVs = await CV.find({
        userId: user._id
      }).sort({ createdAt: 1 }); // Sort ascending (oldest first)

      if (allCVs && allCVs.length > 0) {
        cv = allCVs[0]; // Get the oldest CV
        console.log('🔍 Update Profile - Using oldest CV as master CV fallback:', {
          id: cv._id,
          title: cv.title,
          createdAt: cv.createdAt
        });
      }
    }
    
    if (!cv) {
      // CRITICAL: Don't create master CV here - it should be created by ai-career-report
      // Return error to prevent duplicate master CV creation
      return NextResponse.json(
        { 
          success: false, 
          error: 'Master CV not found. Please create your Master CV through the AI Career Report first.',
          shouldCreateMasterCV: true
        },
        { status: 404 }
      );
    }
    
    // Update existing CV data - ensure basics section is fully preserved
    if (!cv.cvData) {
      cv.cvData = {};
    }
    if (!cv.cvData.basics) {
      cv.cvData.basics = {};
    }
    
    // Preserve all existing basics fields while updating
    cv.cvData.basics = {
      ...cv.cvData.basics,
      name: cv.cvData.basics.name || `${user.firstName} ${user.lastName}`,
      label: jobTitle || cv.cvData.basics.label || '',
      summary: professionalSummary || cv.cvData.basics.summary || '',
      location: location ? {
        ...cv.cvData.basics.location,
        city: location.split(',')[0]?.trim() || cv.cvData.basics.location?.city || '',
        region: location.split(',')[1]?.trim() || cv.cvData.basics.location?.region || ''
      } : (cv.cvData.basics.location || {})
    };
    
    // Mark cvData as modified for Mongoose Mixed type
    cv.markModified('cvData');

    await cv.save();

    // Update user profile settings (you can add these fields to User model later)
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        jobTitle: cv.cvData.basics?.label,
        location: cv.cvData.basics?.location ? 
          `${cv.cvData.basics.location.city}, ${cv.cvData.basics.location.region}` : 
          undefined,
        professionalSummary: cv.cvData.basics?.summary,
        allowMessage,
        allowVideoCall
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
