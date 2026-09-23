
import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { triggerService } from '@/lib/services/triggerEmailService';
import { subHours, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
    // 1. Security Check — fails closed when CRON_SECRET is unset.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    try {
        await getConnection();
        const now = new Date();
        const results = {
            emptyAccount: 0,
            inactivity7: 0,
            inactivity30: 0
        };

        // ---------------------------------------------------------
        // 1. Empty Account Reminder (Created 24-48h ago, 0 CVs)
        // ---------------------------------------------------------
        const oneDayAgo = subHours(now, 24);
        const twoDaysAgo = subHours(now, 48);

        const emptyAccountUsers = await User.find({
            createdAt: { $gte: twoDaysAgo, $lte: oneDayAgo },
            'usage.cvCreatedCount': 0
        }).select('email firstName lastName');

        for (const user of emptyAccountUsers) {
            const sent = await triggerService.trigger('3-empty-account-reminder', user, {}, true);
            if (sent) results.emptyAccount++;
        }

        // ---------------------------------------------------------
        // 2. Inactivity Nudge (Last login 7-8 days ago)
        // ---------------------------------------------------------
        const sevenDaysAgo = subDays(now, 7);
        const eightDaysAgo = subDays(now, 8);

        const inactive7Users = await User.find({
            lastLogin: { $gte: eightDaysAgo, $lte: sevenDaysAgo }
        }).select('email firstName lastName');

        for (const user of inactive7Users) {
            const sent = await triggerService.trigger('24-inactivity-nudge', user, {}, true);
            if (sent) results.inactivity7++;
        }

        // ---------------------------------------------------------
        // 3. Account Risk Warning (Last login 30-31 days ago)
        // ---------------------------------------------------------
        const thirtyDaysAgo = subDays(now, 30);
        const thirtyOneDaysAgo = subDays(now, 31);

        const inactive30Users = await User.find({
            lastLogin: { $gte: thirtyOneDaysAgo, $lte: thirtyDaysAgo }
        }).select('email firstName lastName');

        for (const user of inactive30Users) {
            const sent = await triggerService.trigger('25-account-risk-warning', user, {}, true);
            if (sent) results.inactivity30++;
        }

        return NextResponse.json({
            success: true,
            processed: results,
            message: 'Triggers processed successfully'
        });

    } catch (error: any) {
        console.error('Trigger processing error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
