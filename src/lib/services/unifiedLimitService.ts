import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import Job from '@/models/Job';
import Template from '@/models/Template';
import { getAdminPricingPlan } from '@/models/admin-models';
import mongoose from 'mongoose';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LimitResult {
    allowed: boolean;
    current: number;
    limit: number;
    frozenCount?: number;
    reason?: string;
    requiresUpgrade?: boolean;
    suggestedAction?: 'upgrade' | 'switch_template' | 'archive_job';
}

export interface AccessResult {
    hasAccess: boolean;
    tier: 'free' | 'premium';
    reason?: string;
    requiresUpgrade?: boolean;
}

export interface EditCheckResult {
    allowed: boolean;
    state: 'editable' | 'frozen' | 'read-only';
    reason?: string;
    suggestedAction?: 'upgrade' | 'switch_template' | 'archive_job';
}

export interface CreditResult {
    available: boolean;
    creditsRemaining: number;
    limit: number;
    nextResetDate?: Date;
    reason?: string;
}

export type DocumentType = 'master' | 'journey' | 'standalone';
export type CreditAction = 'ai_generation' | 'cv_create' | 'job_create' | 'ats_scan' | 'download';

// ============================================================================
// UNIFIED LIMIT SERVICE
// ============================================================================

class UnifiedLimitService {

    // --------------------------------------------------------------------------
    // PLAN LIMITS CONFIGURATION
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // PLAN LIMITS CONFIGURATION
    // --------------------------------------------------------------------------

    // DEPRECATED: Use getPlanLimits from subscription-helpers instead
    // This local method is kept as a private helper that wraps the shared utility
    private getPlanLimits(planKey: string) {
        // Import dynamically to avoid circular dependencies if any
        // In a real refactor, we would import at top level, but for now we follow the structure
        const { getPlanLimits } = require('@/lib/utils/subscription-helpers');
        const limits = getPlanLimits(planKey);

        // Adapt shared limits to local interface if needed
        // Shared uses 'maxJobs', local used 'activeJobs'
        // Shared uses 'maxCVs', local used 'masterCV/journeyCV/standaloneCV' generically or specifically

        return {
            masterCV: limits.maxCVs,
            journeyCV: limits.journeyCVs, // Note: Shared has journeyCVs separate
            standaloneCV: limits.maxCVs,
            activeJobs: limits.maxJobs,
            archivedJobs: -1, // Always unlimited
            aiCredits: limits.surgeonRuns === -1 ? -1 : 5, // Approximate mapping, or fetch specific credit limit if added to shared
            templates: limits.premiumTemplates ? 'all' : 'free'
        };
    }

    // --------------------------------------------------------------------------
    // CV LIMIT CHECKS
    // --------------------------------------------------------------------------

    async checkMasterCVLimit(userId: string): Promise<LimitResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { allowed: false, current: 0, limit: 0, reason: 'User not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);
            const editableMasterCVs = await CV.countDocuments({
                userId,
                cvType: 'master',
                documentState: 'editable'
            });

            const frozenMasterCVs = await CV.countDocuments({
                userId,
                cvType: 'master',
                documentState: { $in: ['frozen', 'read-only'] }
            });

            if (limits.masterCV === -1) {
                return { allowed: true, current: editableMasterCVs, limit: -1, frozenCount: frozenMasterCVs };
            }

            const allowed = editableMasterCVs < limits.masterCV;

            return {
                allowed,
                current: editableMasterCVs,
                limit: limits.masterCV,
                frozenCount: frozenMasterCVs,
                reason: allowed ? undefined : `You have reached your limit of ${limits.masterCV} Master CV. Upgrade for unlimited CVs.`,
                requiresUpgrade: !allowed
            };
        } catch (error) {
            console.error('Error checking master CV limit:', error);
            return { allowed: false, current: 0, limit: 0, reason: 'Error checking limit' };
        }
    }

    async checkJourneyCVLimit(userId: string): Promise<LimitResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { allowed: false, current: 0, limit: 0, reason: 'User not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);
            const editableJourneyCVs = await CV.countDocuments({
                userId,
                cvType: 'journey',
                documentState: 'editable'
            });

            const frozenJourneyCVs = await CV.countDocuments({
                userId,
                cvType: 'journey',
                documentState: { $in: ['frozen', 'read-only'] }
            });

            if (limits.journeyCV === -1) {
                return { allowed: true, current: editableJourneyCVs, limit: -1, frozenCount: frozenJourneyCVs };
            }

            const allowed = editableJourneyCVs < limits.journeyCV;

            return {
                allowed,
                current: editableJourneyCVs,
                limit: limits.journeyCV,
                frozenCount: frozenJourneyCVs,
                reason: allowed ? undefined : `You have reached your limit of ${limits.journeyCV} Journey CV. Upgrade for unlimited CVs.`,
                requiresUpgrade: !allowed
            };
        } catch (error) {
            console.error('Error checking journey CV limit:', error);
            return { allowed: false, current: 0, limit: 0, reason: 'Error checking limit' };
        }
    }

    async checkStandaloneCVLimit(userId: string): Promise<LimitResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { allowed: false, current: 0, limit: 0, reason: 'User not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);
            const editableStandaloneCVs = await CV.countDocuments({
                userId,
                cvType: 'standalone',
                documentState: 'editable'
            });

            const frozenStandaloneCVs = await CV.countDocuments({
                userId,
                cvType: 'standalone',
                documentState: { $in: ['frozen', 'read-only'] }
            });

            if (limits.standaloneCV === -1) {
                return { allowed: true, current: editableStandaloneCVs, limit: -1, frozenCount: frozenStandaloneCVs };
            }

            const allowed = editableStandaloneCVs < limits.standaloneCV;

            return {
                allowed,
                current: editableStandaloneCVs,
                limit: limits.standaloneCV,
                frozenCount: frozenStandaloneCVs,
                reason: allowed ? undefined : `You have reached your limit of ${limits.standaloneCV} Standalone CV. Upgrade for unlimited CVs.`,
                requiresUpgrade: !allowed
            };
        } catch (error) {
            console.error('Error checking standalone CV limit:', error);
            return { allowed: false, current: 0, limit: 0, reason: 'Error checking limit' };
        }
    }

    // Generic CV limit check
    async checkCVLimit(userId: string, cvType: DocumentType): Promise<LimitResult> {
        switch (cvType) {
            case 'master':
                return this.checkMasterCVLimit(userId);
            case 'journey':
                return this.checkJourneyCVLimit(userId);
            case 'standalone':
                return this.checkStandaloneCVLimit(userId);
            default:
                return { allowed: false, current: 0, limit: 0, reason: 'Invalid CV type' };
        }
    }

    // --------------------------------------------------------------------------
    // JOB LIMIT CHECKS
    // --------------------------------------------------------------------------

    async checkJobLimit(userId: string): Promise<LimitResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { allowed: false, current: 0, limit: 0, reason: 'User not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);

            // Count only active (non-archived) jobs
            const activeJobs = await Job.countDocuments({
                userId,
                isArchived: false
            });

            if (limits.activeJobs === -1) {
                return { allowed: true, current: activeJobs, limit: -1 };
            }

            const allowed = activeJobs < limits.activeJobs;

            return {
                allowed,
                current: activeJobs,
                limit: limits.activeJobs,
                reason: allowed ? undefined : `You have ${activeJobs}/${limits.activeJobs} active jobs. Archive a job to add more, or upgrade.`,
                requiresUpgrade: !allowed,
                suggestedAction: 'archive_job'
            };
        } catch (error) {
            console.error('Error checking job limit:', error);
            return { allowed: false, current: 0, limit: 0, reason: 'Error checking limit' };
        }
    }

    // --------------------------------------------------------------------------
    // TEMPLATE ACCESS CHECKS
    // --------------------------------------------------------------------------

    async checkTemplateAccess(userId: string, templateId: string): Promise<AccessResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { hasAccess: false, tier: 'free', reason: 'User not found' };
            }

            const template = await Template.findById(templateId);
            if (!template) {
                return { hasAccess: false, tier: 'free', reason: 'Template not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);

            // Free templates always accessible
            if (template.tier === 'free') {
                return { hasAccess: true, tier: 'free' };
            }

            // Premium templates
            if (template.tier === 'premium') {
                if (limits.templates === 'all') {
                    return { hasAccess: true, tier: 'premium' };
                } else {
                    return {
                        hasAccess: false,
                        tier: 'premium',
                        reason: 'Premium template requires Pro plan',
                        requiresUpgrade: true
                    };
                }
            }

            return { hasAccess: true, tier: 'free' };
        } catch (error) {
            console.error('Error checking template access:', error);
            return { hasAccess: false, tier: 'free', reason: 'Error checking access' };
        }
    }

    // --------------------------------------------------------------------------
    // DOCUMENT STATE MANAGEMENT
    // --------------------------------------------------------------------------

    async canEditDocument(userId: string, cvId: string): Promise<EditCheckResult> {
        try {
            await connectToDatabase();

            const cv = await CV.findOne({ _id: cvId, userId });
            if (!cv) {
                return { allowed: false, state: 'frozen', reason: 'CV not found' };
            }

            const user = await User.findById(userId);
            if (!user) {
                return { allowed: false, state: 'frozen', reason: 'User not found' };
            }

            // Check document state
            if (cv.documentState === 'frozen') {
                return {
                    allowed: false,
                    state: 'frozen',
                    reason: `This ${cv.cvType} CV is frozen. ${cv.frozenReason === 'plan_downgrade' ? 'Upgrade to edit it.' : 'Your plan expired. Please upgrade.'}`,
                    suggestedAction: 'upgrade'
                };
            }

            if (cv.documentState === 'read-only') {
                // Check if it's because of premium template
                const template = await Template.findById(cv.templateId);
                if (template?.tier === 'premium') {
                    const limits = this.getPlanLimits(user.currentPlanKey);
                    if (limits.templates !== 'all') {
                        return {
                            allowed: false,
                            state: 'read-only',
                            reason: 'This CV uses a Premium template. Switch to a Free template or upgrade to edit.',
                            suggestedAction: 'switch_template'
                        };
                    }
                }
            }

            return { allowed: true, state: 'editable' };
        } catch (error) {
            console.error('Error checking edit permission:', error);
            return { allowed: false, state: 'frozen', reason: 'Error checking permission' };
        }
    }

    async freezeExcessDocuments(userId: string, reason: 'plan_downgrade' | 'limit_exceeded' | 'pass_expired' = 'plan_downgrade'): Promise<void> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) return;

            const limits = this.getPlanLimits(user.currentPlanKey);

            // Freeze excess CVs by type
            for (const cvType of ['master', 'journey', 'standalone'] as DocumentType[]) {
                const limit = cvType === 'master' ? limits.masterCV :
                    cvType === 'journey' ? limits.journeyCV :
                        limits.standaloneCV;

                if (limit === -1) continue; // Unlimited

                // Get all CVs of this type, sorted by most recent first
                const cvs = await CV.find({ userId, cvType }).sort({ updatedAt: -1 });

                // Keep the most recent {limit} as editable, freeze the rest
                const cvsToFreeze = cvs.slice(limit);

                if (cvsToFreeze.length > 0) {
                    await CV.updateMany(
                        { _id: { $in: cvsToFreeze.map(cv => cv._id) } },
                        {
                            $set: {
                                documentState: 'frozen',
                                frozenAt: new Date(),
                                frozenReason: reason
                            }
                        }
                    );
                }
            }

            console.log(`✅ Frozen excess documents for user ${userId} (reason: ${reason})`);
        } catch (error) {
            console.error('Error freezing excess documents:', error);
        }
    }

    async thawDocuments(userId: string, cvIds?: string[]): Promise<void> {
        try {
            await connectToDatabase();

            const query: any = { userId };
            if (cvIds && cvIds.length > 0) {
                query._id = { $in: cvIds };
            }

            await CV.updateMany(
                query,
                {
                    $set: {
                        documentState: 'editable',
                        frozenAt: null,
                        frozenReason: null
                    }
                }
            );

            console.log(`✅ Thawed documents for user ${userId}`);
        } catch (error) {
            console.error('Error thawing documents:', error);
        }
    }

    // --------------------------------------------------------------------------
    // CREDIT MANAGEMENT
    // --------------------------------------------------------------------------

    async checkCreditAvailability(userId: string, action: CreditAction = 'ai_generation'): Promise<CreditResult> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                return { available: false, creditsRemaining: 0, limit: 0, reason: 'User not found' };
            }

            const limits = this.getPlanLimits(user.currentPlanKey);

            // Paid plans have unlimited credits
            if (limits.aiCredits === -1) {
                return { available: true, creditsRemaining: -1, limit: -1 };
            }

            // Free plan - check actual credits
            const currentCredits = user.credits?.aiCredits ?? 0;
            const available = currentCredits > 0;

            // Calculate next reset date
            let nextResetDate: Date | undefined;
            if (user.credits?.resetSchedule === 'monthly') {
                const lastReset = user.credits.lastResetDate || new Date();
                nextResetDate = new Date(lastReset);
                nextResetDate.setMonth(nextResetDate.getMonth() + 1);
                nextResetDate.setDate(1);
                nextResetDate.setHours(0, 0, 0, 0);
            }

            return {
                available,
                creditsRemaining: currentCredits,
                limit: limits.aiCredits,
                nextResetDate,
                reason: available ? undefined : `You've used all ${limits.aiCredits} credits this month. Resets ${nextResetDate?.toLocaleDateString()}.`
            };
        } catch (error) {
            console.error('Error checking credit availability:', error);
            return { available: false, creditsRemaining: 0, limit: 0, reason: 'Error checking credits' };
        }
    }

    async spendCredit(userId: string, action: CreditAction = 'ai_generation'): Promise<boolean> {
        try {
            await connectToDatabase();

            const check = await this.checkCreditAvailability(userId, action);
            if (!check.available || (check.limit !== -1 && check.creditsRemaining <= 0)) {
                return false;
            }

            const user = await User.findById(userId);
            if (!user) return false;

            // Don't decrement for unlimited plans
            if (check.limit === -1) {
                // Just increment usage tracking
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'credits.totalUsage.aiGenerations': 1 }
                });
                return true;
            }

            // Decrement credit for free plan
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    'credits.aiCredits': -1,
                    'credits.jobCredits': -1, // Keep in sync for backward compatibility
                    'credits.totalUsage.aiGenerations': 1
                }
            });

            return true;
        } catch (error) {
            console.error('Error spending credit:', error);
            return false;
        }
    }

    async refundCredit(userId: string, reason: string = 'poor_quality'): Promise<boolean> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) return false;

            // Check daily refund limit (1 per day)
            const lastRefund = user.credits?.lastRefundDate;
            const now = new Date();

            if (lastRefund) {
                const isSameDay = lastRefund.toDateString() === now.toDateString();
                if (isSameDay) {
                    console.log('❌ Refund denied: Already refunded today');
                    return false;
                }
            }

            // Refund the credit
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    'credits.aiCredits': 1,
                    'credits.jobCredits': 1, // Keep in sync
                    'credits.creditRefundCount': 1
                },
                $set: {
                    'credits.lastRefundDate': now
                }
            });

            console.log(`✅ Credit refunded for user ${userId} (reason: ${reason})`);
            return true;
        } catch (error) {
            console.error('Error refunding credit:', error);
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // PLAN TRANSITION HANDLERS
    // --------------------------------------------------------------------------

    async handlePlanDowngrade(userId: string, fromPlan: string, toPlan: string): Promise<void> {
        try {
            console.log(`📉 Handling plan downgrade: ${fromPlan} → ${toPlan} for user ${userId}`);

            // Freeze excess documents when downgrading to free
            if (toPlan === 'free') {
                await this.freezeExcessDocuments(userId, 'plan_downgrade');
            }

            // Reset credits to free tier limits
            if (toPlan === 'free') {
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        'credits.aiCredits': 5,
                        'credits.jobCredits': 5,
                        'credits.lastResetDate': new Date(),
                        'credits.resetSchedule': 'monthly'
                    }
                });
            }

            console.log(`✅ Plan downgrade complete for user ${userId}`);
        } catch (error) {
            console.error('Error handling plan downgrade:', error);
        }
    }

    async handlePlanUpgrade(userId: string, fromPlan: string, toPlan: string): Promise<void> {
        try {
            console.log(`📈 Handling plan upgrade: ${fromPlan} → ${toPlan} for user ${userId}`);

            // Thaw all frozen documents
            await this.thawDocuments(userId);

            // Set unlimited credits
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'credits.aiCredits': -1,
                    'credits.jobCredits': -1,
                    'credits.resetSchedule': 'never'
                }
            });

            console.log(`✅ Plan upgrade complete for user ${userId}`);
        } catch (error) {
            console.error('Error handling plan upgrade:', error);
        }
    }

    async handleDayPassExpiration(userId: string): Promise<void> {
        try {
            console.log(`⏰ Handling Day Pass expiration for user ${userId}`);

            // Freeze excess documents (keep 1 Master, 1 Journey, 1 Standalone)
            await this.freezeExcessDocuments(userId, 'pass_expired');

            // Set 48-hour grace period for downloads
            const gracePeriodEnd = new Date();
            gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 48);

            await User.findByIdAndUpdate(userId, {
                $set: {
                    'gracePeriod.isActive': true,
                    'gracePeriod.reason': 'day_pass_download_window',
                    'gracePeriod.expiresAt': gracePeriodEnd,
                    'currentPlanKey': 'free', // Revert to free plan
                    'credits.aiCredits': 5,
                    'credits.jobCredits': 5
                }
            });

            console.log(`✅ Day Pass expiration handled for user ${userId}`);
        } catch (error) {
            console.error('Error handling Day Pass expiration:', error);
        }
    }
}

export default new UnifiedLimitService();
