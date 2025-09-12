import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, CV, JobApplication, CoverLetter, Subscription } from '@/models';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Prevent admin from deleting themselves
    if (params.userId === session.user?.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is an admin
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 400 }
      );
    }

    // Start a transaction to delete all user data
    const session_db = await User.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        // Delete user's CVs
        await CV.deleteMany({ userId: params.userId }, { session: session_db });
        
        
        // Delete user's job applications
        await JobApplication.deleteMany({ userId: params.userId }, { session: session_db });
        
        // Delete user's cover letters
        await CoverLetter.deleteMany({ userId: params.userId }, { session: session_db });
        
        // Cancel user's subscriptions
        await Subscription.updateMany(
          { userId: params.userId, status: 'active' },
          { 
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: 'User account deleted by admin'
          },
          { session: session_db }
        );
        
        // Finally delete the user
        await User.findByIdAndDelete(params.userId, { session: session_db });
      });
    } finally {
      await session_db.endSession();
    }

    return NextResponse.json({ 
      message: 'User and all associated data deleted successfully',
      deletedUserId: params.userId
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
