import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { createErrorResponse } from '@/lib/db-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    const user = await User.findById(userId).select(
      'email firstName lastName username avatar phone location website linkedin github summary company jobTitle industry experience isEmailVerified createdAt updatedAt'
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        summary: user.summary,
        company: user.company,
        jobTitle: user.jobTitle,
        industry: user.industry,
        experience: user.experience,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Get user profile error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { success: false, message: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Allowed fields for profile update
    const allowedFields = [
      'firstName', 'lastName', 'username', 'avatar', 'phone', 
      'location', 'website', 'linkedin', 'github', 'summary',
      'company', 'jobTitle', 'industry', 'experience'
    ];

    const updateData: any = {};
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    // Check username uniqueness if provided
    if (updateData.username) {
      const existingUser = await User.findOne({ 
        username: updateData.username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -emailVerificationExpires -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        summary: user.summary,
        company: user.company,
        jobTitle: user.jobTitle,
        industry: user.industry,
        experience: user.experience,
        isEmailVerified: user.isEmailVerified,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Update user profile error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
