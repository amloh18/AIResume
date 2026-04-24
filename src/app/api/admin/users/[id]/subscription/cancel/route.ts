import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { withAdminAuth, requireAdmin } from '@/lib/middleware/admin-auth';
import { ActivityLogService } from '@/lib/services/activityLogService';

export const POST = withAdminAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        await getConnection();
        
        const session = await requireAdmin(request);
        const adminUser = session.user as any;
        const adminContext = {
            adminUserId: adminUser.id || session.user.id as string,
            adminEmail: adminUser.email || session.user.email || undefined
        };

        const { id: userId } = await params;
        const body = await request.json();
        const { when, note } = body;

        // Validate inputs
        if (!when || !['now', 'period_end'].includes(when)) {
            return NextResponse.json(
                { success: false, error: 'Invalid cancellation timing. Must be "now" or "period_end"' },
                { status: 400 }
            );
        }

        if (!note || typeof note !== 'string' || note.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Cancellation reason is required' },
                { status: 400 }
            );
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Update subscription status
        const previousStatus = user.subscription?.status;
        const previousPlan = user.currentPlanKey;

        if (when === 'now') {
            // Cancel immediately - set to free plan
            user.currentPlanKey = 'free';
            if (user.subscription) {
                user.subscription.status = 'cancelled';
                user.subscription.cancelledAt = new Date();
            }
        } else {
            // Cancel at period end
            if (user.subscription) {
                user.subscription.status = 'cancelled';
                user.subscription.cancelAtPeriodEnd = true;
                user.subscription.cancelledAt = new Date();
            }
        }

        await user.save();

        // Log the cancellation activity
        await ActivityLogService.logAdminAction({
            adminUserId: adminContext.adminUserId,
            adminEmail: adminContext.adminEmail,
            action: 'subscription_cancelled',
            actionType: 'user_management',
            targetUserId: user._id.toString(),
            resourceType: 'user',
            resourceId: user._id.toString(),
            status: 'success',
            metadata: {
                when,
                note: note.trim(),
                previousStatus,
                previousPlan,
                newPlan: user.currentPlanKey,
                cancelledBy: 'admin'
            }
        });

        return NextResponse.json({
            success: true,
            message: when === 'now' ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end',
            user: {
                _id: user._id,
                email: user.email,
                currentPlanKey: user.currentPlanKey,
                subscription: user.subscription
            }
        });

    } catch (error: any) {
        console.error('Error cancelling subscription:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to cancel subscription', details: error.message },
            { status: 500 }
        );
    }
});
