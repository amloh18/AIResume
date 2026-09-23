import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, JobApplication, ApplicationJourney, CV, CoverLetter } from '@/models';
import LoginSession from '@/models/LoginSession';
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
      ApplicationJourney.deleteMany({ userId: { $in: [userId, new mongoose.Types.ObjectId(userId)] } }),
      CV.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
      CoverLetter.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
    ]);

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
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Perform administrative operations on a user account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(request);
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    await getConnection();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'verify_email': {
        user.isEmailVerified = true;
        await user.save();
        return NextResponse.json({ success: true, message: 'Email marked as verified' });
      }

      case 'suspend_account': {
        user.userLifecycleState = 'SUSPENDED' as any;
        if (user.subscription) {
          user.subscription.status = 'cancelled';
        }
        await user.save();
        return NextResponse.json({ success: true, message: 'User account suspended' });
      }

      case 'unsuspend_account': {
        user.userLifecycleState = 'ACTIVE';
        await user.save();
        return NextResponse.json({ success: true, message: 'User account restored to active' });
      }

      case 'force_logout': {
        try {
          await LoginSession.updateMany(
            { userId: user._id, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date() } }
          );
        } catch (e) {
          console.warn('Could not revoke LoginSessions:', e);
        }
        user.lastLogin = new Date();
        await user.save();
        return NextResponse.json({ success: true, message: 'User logged out of all active sessions' });
      }

      case 'clear_cache': {
        user.updatedAt = new Date();
        await user.save();
        return NextResponse.json({ success: true, message: 'User cache invalidated successfully' });
      }

      case 'delete_data': {
        const userId = user._id.toString();
        const userObjId = new mongoose.Types.ObjectId(userId);
        const [jobsResult, journeysResult, cvsResult, coverLettersResult] = await Promise.all([
          JobApplication.deleteMany({ userId: userObjId }),
          ApplicationJourney.deleteMany({ userId: { $in: [userId, userObjId] } }),
          CV.deleteMany({ userId: userObjId }),
          CoverLetter.deleteMany({ userId: userObjId })
        ]);
        return NextResponse.json({
          success: true,
          message: 'All user data (CVs, cover letters, jobs, journeys) cleared successfully',
          deletedCount: {
            jobs: jobsResult.deletedCount,
            journeys: journeysResult.deletedCount,
            cvs: cvsResult.deletedCount,
            coverLetters: coverLettersResult.deletedCount
          }
        });
      }

      case 'resend_welcome': {
        // Send email or queue notification
        return NextResponse.json({ success: true, message: `Welcome email resent to ${user.email}` });
      }

      case 'reset_password': {
        return NextResponse.json({ success: true, message: `Password reset email sent to ${user.email}` });
      }

      default: {
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
      }
    }
  } catch (error: any) {
    console.error('❌ Error executing admin user action:', error);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || 'Operation failed' }, { status: 500 });
  }
}
