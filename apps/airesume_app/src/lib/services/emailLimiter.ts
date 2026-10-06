import { getAdminEmailCampaign } from '@/models/admin-models';

/**
 * Gets the total number of emails sent today.
 */
export async function getDailyEmailCount(): Promise<number> {
    try {
        const EmailCampaign = await getAdminEmailCampaign();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const result = await EmailCampaign.aggregate([
            {
                $match: {
                    sentAt: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$sentCount' }
                }
            }
        ]);

        return result[0]?.total || 0;
    } catch (error) {
        console.error('Failed to calculate daily email volume:', error);
        return 0;
    }
}

/**
 * Checks if email sending is allowed under the daily limits.
 * Daily Limit: 1000
 * System Reservation: 100 (10% of slots reserved for critical system transactional emails)
 */
export async function checkEmailLimitAllowed(type: 'system' | 'campaign', count: number = 1): Promise<{ allowed: boolean; reason?: string }> {
    const totalSent = await getDailyEmailCount();
    const dailyCap = 1000;
    const systemReserved = 100;
    const campaignCap = dailyCap - systemReserved; // 900

    if (type === 'system') {
        if (totalSent + count > dailyCap) {
            return {
                allowed: false,
                reason: `Daily system limit exceeded. Attempted send would exceed maximum daily SMTP capacity of ${dailyCap} messages.`
            };
        }
    } else {
        if (totalSent + count > campaignCap) {
            return {
                allowed: false,
                reason: `Campaign dispatch quota exceeded. Standard marketing cap is set at ${campaignCap} to preserve ${systemReserved} slots for login and system delivery.`
            };
        }
    }

    return { allowed: true };
}
