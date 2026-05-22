// @ts-nocheck
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import UsageLog, { UsageAction } from '@/models/UsageLog';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import { getPlanLimits, PlanLimits } from '@/lib/utils/subscription-helpers';

/**
 * EntitlementService - Unified Meter/Quota/Gate System
 * 
 * This service provides a unified approach to checking user entitlements:
 * 1. METER: Throughput limits per period (e.g., 1 job activation/month for free)
 * 2. QUOTA: Inventory limits (e.g., 3 active jobs for free)
 * 3. GATE: Feature access (e.g., DOCX export requires Pro)
 * 
 * @see public/credit plan.md - Phase 2
 */

export interface EntitlementResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number;
    requiresUpgrade?: boolean;
    suggestedAction?: 'upgrade' | 'archive' | 'wait';
}

export interface MeterResult extends EntitlementResult {
    periodStart: Date;
    resetAt?: Date;
}

export interface QuotaResult extends EntitlementResult {
    currentCount: number;
    canArchiveToFree?: boolean;
}

export interface GateResult extends EntitlementResult {
    feature: string;
}

// Meter limits by plan (per month unless otherwise specified)
const METER_LIMITS: Record<string, Record<string, number>> = {
    free: {
        JOB_ACTIVATION: -1,      // Unlimited
        PDF_DOWNLOAD: -1,       // Unlimited
        AI_FIX: 10,             // Limited AI surgeon runs
        CV_CREATION: -1,        // Unlimited CV creation
        COVER_LETTER_AI: 0      // Pro only feature
    },
    pro_monthly: {
        JOB_ACTIVATION: -1,
        PDF_DOWNLOAD: -1,
        AI_FIX: -1,
        CV_CREATION: -1,
        COVER_LETTER_AI: -1
    },
    pro_quarterly: {
        JOB_ACTIVATION: -1,
        PDF_DOWNLOAD: -1,
        AI_FIX: -1,
        CV_CREATION: -1,
        COVER_LETTER_AI: -1
    },
    pro_yearly: {
        JOB_ACTIVATION: -1,
        PDF_DOWNLOAD: -1,
        AI_FIX: -1,
        CV_CREATION: -1,
        COVER_LETTER_AI: -1
    },
    pro_lifetime: {
        JOB_ACTIVATION: -1,
        PDF_DOWNLOAD: -1,
        AI_FIX: -1,
        CV_CREATION: -1,
        COVER_LETTER_AI: -1
    }
};

// Quota limits by plan (concurrent inventory)
const QUOTA_LIMITS: Record<string, Record<string, number>> = {
    free: {
        ACTIVE_JOBS: -1,         // Unlimited jobs
        DRAFTS: -1,              // Unlimited drafts
        JOURNEY_CVS: -1          // Unlimited journey CVs
    },
    pro_monthly: {
        ACTIVE_JOBS: -1,
        DRAFTS: -1,
        JOURNEY_CVS: -1
    },
    pro_quarterly: {
        ACTIVE_JOBS: -1,
        DRAFTS: -1,
        JOURNEY_CVS: -1
    },
    pro_yearly: {
        ACTIVE_JOBS: -1,
        DRAFTS: -1,
        JOURNEY_CVS: -1
    },
    pro_lifetime: {
        ACTIVE_JOBS: -1,
        DRAFTS: -1,
        JOURNEY_CVS: -1
    }
};

class EntitlementService {
    /**
     * Get the user's current plan key
     */
    private async getUserPlan(userId: string): Promise<{
        planKey: string;
        periodStart: Date;
        isActive: boolean;
        limits: PlanLimits;
    }> {
        await connectToDatabase();

        const user = await User.findById(userId);
        if (!user) {
            return {
                planKey: 'free',
                periodStart: new Date(),
                isActive: true,
                limits: getPlanLimits('free')
            };
        }

        const planKey = user.currentPlanKey || 'free';
        const periodStart = user.subscription?.currentPeriodStart ||
            user.credits?.lastResetDate ||
            new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        // Check if subscription is active
        let isActive = true;
        if (planKey !== 'free' && user.subscription) {
            const now = new Date();
            if (user.subscription.currentPeriodEnd) {
                isActive = new Date(user.subscription.currentPeriodEnd) > now;
            } else if (user.subscription.accessExpiresAt) {
                isActive = new Date(user.subscription.accessExpiresAt) > now;
            }
        }

        return {
            planKey: isActive ? planKey : 'free', // Fall back to free if expired
            periodStart: new Date(periodStart),
            isActive,
            limits: getPlanLimits(isActive ? planKey : 'free')
        };
    }

    /**
     * METER CHECK - Throughput limits per period
     * 
     * Checks if user can perform an action based on their monthly usage.
     * Uses UsageLog for accurate counting.
     */
    async checkMeter(userId: string, action: UsageAction): Promise<MeterResult> {
        try {
            await connectToDatabase();

            const { planKey, periodStart, limits } = await this.getUserPlan(userId);
            const meterLimits = METER_LIMITS[planKey] || METER_LIMITS.free;
            const limit = meterLimits[action];

            // -1 means unlimited
            if (limit === -1) {
                return {
                    allowed: true,
                    currentUsage: -1,
                    limit: -1,
                    periodStart
                };
            }

            // Count non-refunded usage since period start
            const usageCount = await UsageLog.countDocuments({
                userId,
                action,
                createdAt: { $gte: periodStart },
                'metadata.refunded': { $ne: true }
            });

            const allowed = usageCount < limit;

            return {
                allowed,
                currentUsage: usageCount,
                limit,
                periodStart,
                reason: allowed ? undefined : `Monthly limit of ${limit} ${action.toLowerCase().replace('_', ' ')}s reached.`,
                requiresUpgrade: !allowed,
                suggestedAction: allowed ? undefined : 'upgrade'
            };
        } catch (error) {
            console.error('EntitlementService.checkMeter error:', error);
            return {
                allowed: false,
                reason: 'Error checking meter',
                periodStart: new Date()
            };
        }
    }

    /**
     * QUOTA CHECK - Inventory limits (concurrent)
     * 
     * Checks if user can have more of a resource based on their current inventory.
     * Unlike meters, quotas free up when items are archived/deleted.
     */
    async checkQuota(userId: string, resource: 'ACTIVE_JOBS' | 'DRAFTS' | 'JOURNEY_CVS'): Promise<QuotaResult> {
        try {
            await connectToDatabase();

            const { planKey, limits } = await this.getUserPlan(userId);
            const quotaLimits = QUOTA_LIMITS[planKey] || QUOTA_LIMITS.free;
            const limit = quotaLimits[resource];

            // -1 means unlimited
            if (limit === -1) {
                return {
                    allowed: true,
                    currentCount: -1,
                    limit: -1
                };
            }

            // Count current inventory based on resource type
            let currentCount = 0;

            if (resource === 'ACTIVE_JOBS') {
                currentCount = await JobApplication.countDocuments({
                    userId,
                    $or: [
                        { isArchived: { $exists: false } },
                        { isArchived: false }
                    ]
                });
            } else if (resource === 'DRAFTS') {
                currentCount = await CV.countDocuments({
                    userId,
                    status: 'draft'
                });
            } else if (resource === 'JOURNEY_CVS') {
                currentCount = await CV.countDocuments({
                    userId,
                    cvType: 'journey',
                    documentState: { $ne: 'frozen' }
                });
            }

            const allowed = currentCount < limit;

            return {
                allowed,
                currentCount,
                limit,
                reason: allowed ? undefined : `Inventory full (${currentCount}/${limit}). Archive items to make space.`,
                requiresUpgrade: !allowed,
                suggestedAction: allowed ? undefined : 'archive',
                canArchiveToFree: currentCount > 0
            };
        } catch (error) {
            console.error('EntitlementService.checkQuota error:', error);
            return {
                allowed: false,
                currentCount: 0,
                reason: 'Error checking quota'
            };
        }
    }

    /**
     * GATE CHECK - Feature access (boolean)
     * 
     * Checks if a feature is unlocked for the user's plan.
     */
    async checkGate(userId: string, feature: 'DOCX_DOWNLOAD' | 'DEEP_DIVE' | 'PREMIUM_TEMPLATES' | 'COVER_LETTER_AI' | 'INTERVIEW_COACH' | 'JOB_TRACKER'): Promise<GateResult> {
        try {
            const { planKey, limits, isActive } = await this.getUserPlan(userId);

            // Map features to plan limits
            const featureGates: Record<string, keyof PlanLimits | boolean> = {
                'DOCX_DOWNLOAD': 'docxExport',
                'PREMIUM_TEMPLATES': 'premiumTemplates',
                'COVER_LETTER_AI': 'coverLetterAI',
                'INTERVIEW_COACH': 'interviewCoach',
                'JOB_TRACKER': 'jobTracker',
                'DEEP_DIVE': planKey !== 'free' && isActive // Deep dive requires any paid plan
            };

            const gateCheck = featureGates[feature];
            let allowed = false;

            if (typeof gateCheck === 'boolean') {
                allowed = gateCheck;
            } else if (typeof gateCheck === 'string') {
                allowed = !!limits[gateCheck];
            }

            return {
                allowed,
                feature,
                reason: allowed ? undefined : `${feature.replace('_', ' ')} requires an upgrade.`,
                requiresUpgrade: !allowed,
                suggestedAction: allowed ? undefined : 'upgrade'
            };
        } catch (error) {
            console.error('EntitlementService.checkGate error:', error);
            return {
                allowed: false,
                feature,
                reason: 'Error checking feature access'
            };
        }
    }

    /**
     * CONSUME METER - Log a spend event
     * 
     * Records that a user has consumed a meter unit.
     * Call this AFTER the action is successfully completed.
     */
    async consumeMeter(
        userId: string,
        action: UsageAction,
        resourceId?: string,
        metadata?: { format?: 'pdf' | 'docx' }
    ): Promise<boolean> {
        try {
            await connectToDatabase();

            const { planKey } = await this.getUserPlan(userId);

            await UsageLog.create({
                userId,
                action,
                resourceId,
                metadata: {
                    ...metadata,
                    planAtTime: planKey
                }
            });

            return true;
        } catch (error) {
            console.error('EntitlementService.consumeMeter error:', error);
            return false;
        }
    }

    /**
     * REFUND METER - Mark a usage as refunded (Retry Guarantee)
     * 
     * If an action failed after being logged, this refunds the usage.
     */
    async refundMeter(
        userId: string,
        action: UsageAction,
        resourceId: string,
        reason: string
    ): Promise<boolean> {
        try {
            await connectToDatabase();

            const result = await UsageLog.findOneAndUpdate(
                {
                    userId,
                    action,
                    resourceId,
                    'metadata.refunded': { $ne: true }
                },
                {
                    $set: {
                        'metadata.refunded': true,
                        'metadata.refundReason': reason
                    }
                },
                { sort: { createdAt: -1 } } // Most recent first
            );

            return !!result;
        } catch (error) {
            console.error('EntitlementService.refundMeter error:', error);
            return false;
        }
    }

    /**
     * SYNC DOCUMENT STATES - Handle plan changes
     * 
     * When a user's plan changes (upgrade/downgrade), update document states.
     * This implements the "Cinderella Rule" from the credit plan.
     */
    async syncDocumentStates(userId: string): Promise<void> {
        try {
            await connectToDatabase();

            const { planKey, isActive } = await this.getUserPlan(userId);

            // Pro plans with active subscription: Unlock all documents
            if (planKey !== 'free' && isActive) {
                await CV.updateMany(
                    { userId, documentState: { $in: ['frozen', 'read-only'] } },
                    {
                        $set: {
                            documentState: 'editable',
                            frozenReason: null,
                            frozenAt: null
                        }
                    }
                );
                return;
            }

            // Free plan or expired subscription: Apply freezing logic
            const quotaLimits = QUOTA_LIMITS.free;

            // Get all CVs sorted by last modified (most recent kept editable)
            const allCVs = await CV.find({ userId }).sort({ updatedAt: -1 });

            let masterCount = 0;
            let journeyCount = 0;
            let standaloneCount = 0;

            for (const cv of allCVs) {
                let shouldFreeze = false;

                if (cv.cvType === 'master') {
                    if (masterCount >= 1) shouldFreeze = true;
                    masterCount++;
                } else if (cv.cvType === 'journey') {
                    if (quotaLimits.JOURNEY_CVS !== -1 && journeyCount >= quotaLimits.JOURNEY_CVS) shouldFreeze = true;
                    journeyCount++;
                } else {
                    // Standalone CVs are unlimited under current Free plan limits
                    standaloneCount++;
                }

                // Update if state changed
                if (shouldFreeze && cv.documentState !== 'frozen') {
                    await CV.updateOne(
                        { _id: cv._id },
                        {
                            $set: {
                                documentState: 'frozen',
                                frozenReason: 'plan_downgrade',
                                frozenAt: new Date()
                            }
                        }
                    );
                } else if (!shouldFreeze && cv.documentState === 'frozen') {
                    await CV.updateOne(
                        { _id: cv._id },
                        {
                            $set: {
                                documentState: 'editable',
                                frozenReason: null,
                                frozenAt: null
                            }
                        }
                    );
                }
            }
        } catch (error) {
            console.error('EntitlementService.syncDocumentStates error:', error);
        }
    }

    /**
     * GET USER ENTITLEMENT SUMMARY
     * 
     * Returns a complete picture of user's current entitlements.
     */
    async getUserEntitlementSummary(userId: string): Promise<{
        plan: string;
        isActive: boolean;
        meters: Record<string, { used: number; limit: number }>;
        quotas: Record<string, { current: number; limit: number }>;
        gates: Record<string, boolean>;
    }> {
        const { planKey, isActive, periodStart, limits } = await this.getUserPlan(userId);

        // Get meter usage
        const meterActions: UsageAction[] = ['JOB_ACTIVATION', 'PDF_DOWNLOAD', 'AI_FIX', 'CV_CREATION'];
        const meterLimits = METER_LIMITS[planKey] || METER_LIMITS.free;
        const meters: Record<string, { used: number; limit: number }> = {};

        for (const action of meterActions) {
            const count = await UsageLog.countDocuments({
                userId,
                action,
                createdAt: { $gte: periodStart },
                'metadata.refunded': { $ne: true }
            });
            meters[action] = { used: count, limit: meterLimits[action] };
        }

        // Get quota counts
        const quotaLimits = QUOTA_LIMITS[planKey] || QUOTA_LIMITS.free;
        const activeJobCount = await JobApplication.countDocuments({
            userId,
            $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
        });
        const draftCount = await CV.countDocuments({ userId, status: 'draft' });
        const journeyCVCount = await CV.countDocuments({
            userId,
            cvType: 'journey',
            documentState: { $ne: 'frozen' }
        });

        return {
            plan: planKey,
            isActive,
            meters,
            quotas: {
                ACTIVE_JOBS: { current: activeJobCount, limit: quotaLimits.ACTIVE_JOBS },
                DRAFTS: { current: draftCount, limit: quotaLimits.DRAFTS },
                JOURNEY_CVS: { current: journeyCVCount, limit: quotaLimits.JOURNEY_CVS }
            },
            gates: {
                DOCX_DOWNLOAD: limits.docxExport,
                PREMIUM_TEMPLATES: limits.premiumTemplates,
                COVER_LETTER_AI: limits.coverLetterAI,
                INTERVIEW_COACH: limits.interviewCoach,
                JOB_TRACKER: limits.jobTracker
            }
        };
    }
}

export default new EntitlementService();
