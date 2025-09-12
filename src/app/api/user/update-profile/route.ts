import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
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

    await connectDB();

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

    // Update CV data with profile information
    let cv = await CV.findOne({ userId: user._id, isMaster: true });
    
    if (!cv) {
      // Create new master CV if it doesn't exist
      cv = new CV({
        userId: user._id,
        title: 'Master CV',
        cvData: {
          basics: {
            name: `${user.firstName} ${user.lastName}`,
            label: jobTitle || 'Professional',
            summary: professionalSummary || `${user.firstName} ${user.lastName} is a professional with experience in their field.`,
            location: location ? {
              city: location.split(',')[0]?.trim() || '',
              region: location.split(',')[1]?.trim() || ''
            } : undefined
          },
          work: [],
          education: [],
          skills: [],
          projects: []
        },
        status: 'draft',
        version: 1,
        isMaster: true,
        styling: {
          primaryColor: '#84cc16',
          secondaryColor: '#22c55e',
          fontFamily: 'Inter',
          fontSize: 'medium',
          spacing: 1.5
        },
        metadata: {
          lastModified: new Date(),
          tags: [],
          isPublic: false,
          viewCount: 0,
          downloadCount: 0,
          starred: false
        }
      });
    } else {
      // Update existing CV data
      if (!cv.cvData.basics) {
        cv.cvData.basics = {};
      }
      
      if (jobTitle) cv.cvData.basics.label = jobTitle;
      if (professionalSummary) cv.cvData.basics.summary = professionalSummary;
      if (location) {
        cv.cvData.basics.location = {
          city: location.split(',')[0]?.trim() || '',
          region: location.split(',')[1]?.trim() || ''
        };
      }
    }

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
