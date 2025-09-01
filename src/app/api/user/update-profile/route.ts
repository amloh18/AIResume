import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, CVData } from '@/models';

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
    let cvData = await CVData.findOne({ userId: user._id });
    
    if (!cvData) {
      // Create new CV data if it doesn't exist
      cvData = new CVData({
        userId: user._id,
        basics: {
          name: `${user.firstName} ${user.lastName}`,
          label: jobTitle || 'Professional',
          summary: professionalSummary || `${user.firstName} ${user.lastName} is a professional with experience in their field.`,
          location: location ? {
            city: location.split(',')[0]?.trim() || '',
            region: location.split(',')[1]?.trim() || ''
          } : undefined
        }
      });
    } else {
      // Update existing CV data
      if (!cvData.basics) {
        cvData.basics = {};
      }
      
      if (jobTitle) cvData.basics.label = jobTitle;
      if (professionalSummary) cvData.basics.summary = professionalSummary;
      if (location) {
        cvData.basics.location = {
          city: location.split(',')[0]?.trim() || '',
          region: location.split(',')[1]?.trim() || ''
        };
      }
    }

    await cvData.save();

    // Update user profile settings (you can add these fields to User model later)
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        jobTitle: cvData.basics?.label,
        location: cvData.basics?.location ? 
          `${cvData.basics.location.city}, ${cvData.basics.location.region}` : 
          undefined,
        professionalSummary: cvData.basics?.summary,
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
