import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, JobApplication, ApplicationJourney, CV, CoverLetter } from '@/models';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import mongoose from 'mongoose';

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and all their associated data
 * Admin authentication required
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication and get session
    const session = await requireAdmin(request);
    const adminUser = session.user as any;
    
    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find user first to get email for logging
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    const userEmail = user.email;

    console.log(`🗑️ Admin deleting user: ${userEmail} (${userId})`);

    // Delete all associated data
    const [jobsResult, journeysResult, cvsResult, coverLettersResult] = await Promise.all([
      JobApplication.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
      ApplicationJourney.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
      CV.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
      CoverLetter.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
    ]);

    console.log(`✅ Deleted associated data for ${userEmail}:`, {
      jobs: jobsResult.deletedCount,
      journeys: journeysResult.deletedCount,
      cvs: cvsResult.deletedCount,
      coverLetters: coverLettersResult.deletedCount
    });

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Log admin action
    try {
      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      
      await ActivityLogService.logAdminAction({
        adminUserId: adminUser.id || session.user.id as string,
        adminEmail: adminUser.email || session.user.email || undefined,
        action: 'user_deleted',
        actionType: 'user_management',
        targetUserId: userId,
        resourceType: 'user',
        resourceId: userId,
        status: 'success',
        metadata: {
          deletedUserEmail: userEmail,
          deletedJobs: jobsResult.deletedCount,
          deletedJourneys: journeysResult.deletedCount,
          deletedCVs: cvsResult.deletedCount,
          deletedCoverLetters: coverLettersResult.deletedCount
        }
      });
    } catch (logError) {
      console.error('Failed to log user deletion:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`✅ User ${userEmail} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedData: {
        jobs: jobsResult.deletedCount,
        journeys: journeysResult.deletedCount,
        cvs: cvsResult.deletedCount,
        coverLetters: coverLettersResult.deletedCount
      }
    });

  } catch (error: any) {
    console.error('❌ Error deleting user:', error);
    
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
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

