/**
 * State Recovery Service
 * 
 * This service checks for and repairs inconsistent state in the database.
 * It should be run periodically via a cron job to ensure data consistency.
 */

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/database';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import User from '@/models/User';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import { getAdminPricingPlan } from '@/models/admin-models';
import subscriptionService from './subscriptionService';
import creditService from './creditService';

export interface StateIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  resourceId?: string;
  fixable: boolean;
  fix?: () => Promise<void>;
}

/**
 * Upper bound on journey documents this recovery run will create.
 *
 * The journey repair below had never once succeeded, so its first working run
 * would otherwise create one journey per `created` job application in a single
 * pass — unbounded work against a remote Atlas cluster from inside a web
 * process. Capping keeps that first run predictable; the remainder is picked up
 * by the next run of the same cron.
 */
const MAX_JOURNEY_REPAIRS_PER_RUN = 50;

export interface RecoveryResult {
  checked: number;
  issuesFound: number;
  issuesFixed: number;
  issuesRequiringManualIntervention: number;
  issues: StateIssue[];
  summary: {
    usersChecked: number;
    invoicesChecked: number;
    transactionsChecked: number;
    jobsChecked: number;
  };
}

class StateRecoveryService {
  /**
   * Run full state recovery check
   */
  async runRecovery(): Promise<RecoveryResult> {
    await connectToDatabase();

    const result: RecoveryResult = {
      checked: 0,
      issuesFound: 0,
      issuesFixed: 0,
      issuesRequiringManualIntervention: 0,
      issues: [],
      summary: {
        usersChecked: 0,
        invoicesChecked: 0,
        transactionsChecked: 0,
        jobsChecked: 0,
      },
    };

    console.log('🔍 Starting state recovery check...');

    // Check 1: Users with subscriptions but no invoices
    const subscriptionIssues = await this.checkSubscriptionInvoices();
    result.issues.push(...subscriptionIssues);
    result.issuesFound += subscriptionIssues.length;
    result.summary.usersChecked = subscriptionIssues.length;

    // Check 2: Invoices without corresponding transactions
    const invoiceIssues = await this.checkInvoiceTransactions();
    result.issues.push(...invoiceIssues);
    result.issuesFound += invoiceIssues.length;
    result.summary.invoicesChecked = invoiceIssues.length;

    // Check 3: Jobs without journeys (if status is 'created')
    const jobIssues = await this.checkJobJourneys();
    result.issues.push(...jobIssues);
    result.issuesFound += jobIssues.length;
    result.summary.jobsChecked = jobIssues.length;

    // Check 4: Credits out of sync with subscription
    const creditIssues = await this.checkCreditSync();
    result.issues.push(...creditIssues);
    result.issuesFound += creditIssues.length;

    // Check 5: Expired subscriptions not marked as expired
    const expiryIssues = await this.checkExpiredSubscriptions();
    result.issues.push(...expiryIssues);
    result.issuesFound += expiryIssues.length;

    // Attempt to fix fixable issues
    for (const issue of result.issues) {
      if (issue.fixable && issue.fix) {
        try {
          await issue.fix();
          result.issuesFixed++;
        } catch (error: any) {
          console.error(`Failed to fix issue ${issue.type}:`, error);
          result.issuesRequiringManualIntervention++;
        }
      } else {
        result.issuesRequiringManualIntervention++;
      }
    }

    result.checked = result.issues.length;

    console.log(`✅ State recovery check completed: ${result.issuesFound} issues found, ${result.issuesFixed} fixed, ${result.issuesRequiringManualIntervention} require manual intervention`);

    return result;
  }

  /**
   * Check for users with active subscriptions but no invoices
   */
  private async checkSubscriptionInvoices(): Promise<StateIssue[]> {
    const issues: StateIssue[] = [];

    try {
      const usersWithSubscriptions = await User.find({
        'subscription.status': 'active',
        'subscription.planKey': { $ne: 'free' }
      }).select('_id subscription');

      for (const user of usersWithSubscriptions) {
        const invoices = await Invoice.find({ userId: mixedIdFilter(user._id) });
        
        if (invoices.length === 0) {
          issues.push({
            type: 'subscription_without_invoice',
            severity: 'medium',
            description: `User ${user._id} has active subscription (${user.subscription?.planKey}) but no invoices`,
            userId: user._id.toString(),
            fixable: false, // Cannot automatically create invoices without payment data
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking subscription invoices:', error);
    }

    return issues;
  }

  /**
   * Check for invoices without corresponding transactions
   */
  private async checkInvoiceTransactions(): Promise<StateIssue[]> {
    const issues: StateIssue[] = [];

    try {
      const invoices = await Invoice.find({ status: 'paid' });

      for (const invoice of invoices) {
        const transactions = await Transaction.find({ invoiceId: invoice._id.toString() });
        
        if (transactions.length === 0 && invoice.status === 'paid') {
          issues.push({
            type: 'invoice_without_transaction',
            severity: 'high',
            description: `Invoice ${invoice._id} is marked as paid but has no transactions`,
            resourceId: invoice._id.toString(),
            userId: invoice.userId?.toString(),
            fixable: false, // Cannot automatically create transactions without payment data
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking invoice transactions:', error);
    }

    return issues;
  }

  /**
   * `userId` is stored inconsistently across models: `JobApplication.userId` is
   * `Schema.Types.Mixed` (so both ObjectId and string forms exist in the wild),
   * while `ApplicationJourney.userId` is declared `String`. Returning every form
   * that could match stops a lookup from silently missing real documents — which
   * is exactly how the check below used to report the same job forever.
   */
  private ownerIdCandidates(userId: unknown): (string | mongoose.Types.ObjectId)[] {
    if (!userId) return [];
    const asString = String(userId);
    const candidates: (string | mongoose.Types.ObjectId)[] = [asString];
    if (mongoose.Types.ObjectId.isValid(asString)) {
      candidates.push(new mongoose.Types.ObjectId(asString));
    }
    return candidates;
  }

  /**
   * Check for job applications sitting in the `created` state with no
   * ApplicationJourney.
   *
   * Contract note — this check used to be written against a schema that does not
   * exist, in five separate ways:
   *
   *  1. it filtered on `jobApplicationId`, which is not a path on
   *     `ApplicationJourney`. `strictQuery` defaults to `false`, so the filter was
   *     still forwarded to MongoDB and could never match anything — meaning every
   *     `created` job looked journey-less on every single run;
   *  2. it wrote `status: 'created'`, which is not in the journey status enum
   *     (`in-progress | completed | paused | processing_documents |
   *     creation_failed | ready`);
   *  3. it wrote `currentStep: 'application_submitted'` against a `Number` path
   *     bounded `min: 1, max: 5`;
   *  4. its steps used a `step` key, but the subdocument requires `stepId`
   *     (Number) and `name` (String), both `required`;
   *  5. it omitted `jobTitle` and `company`, both `required`.
   *
   * The `create()` therefore threw on every run, so the repair never worked and
   * the run was reported as "requires manual intervention" indefinitely. Fixing
   * only (2)-(5) would have been worse: with the existence check still unable to
   * match, the first successful create would have been followed by an unbounded
   * stream of duplicates. The linkage below uses the same `{ userId, jobId }` key
   * as the canonical creation path in `src/app/api/application-journey/route.ts`.
   */
  private async checkJobJourneys(): Promise<StateIssue[]> {
    const issues: StateIssue[] = [];

    try {
      const jobsWithoutJourneys = await JobApplication.find({
        status: 'created',
        // A journey requires `jobId`; without one there is nothing to link to.
        jobId: { $exists: true, $nin: [null, ''] },
      }).select('_id userId jobId jobTitle company createdAt');

      for (const job of jobsWithoutJourneys) {
        if (issues.length >= MAX_JOURNEY_REPAIRS_PER_RUN) {
          console.warn(
            `⚠️ State recovery: journey repair capped at ${MAX_JOURNEY_REPAIRS_PER_RUN} per run; ` +
              `remaining 'created' jobs will be handled on a subsequent run.`
          );
          break;
        }

        const ownerIds = this.ownerIdCandidates(job.userId);
        if (ownerIds.length === 0) continue;

        const journey = await ApplicationJourney.findOne({
          jobId: job.jobId,
          userId: { $in: ownerIds },
        }).select('_id');

        if (journey) continue;

        issues.push({
          type: 'job_without_journey',
          severity: 'low',
          description: `Job ${job._id} has status 'created' but no application journey`,
          resourceId: job._id.toString(),
          userId: job.userId?.toString(),
          fixable: true,
          fix: async () => {
            // Re-check immediately before writing: the scan and the fix are not
            // atomic, and two overlapping recovery runs would otherwise both
            // create a journey for the same job.
            const alreadyExists = await ApplicationJourney.exists({
              jobId: job.jobId,
              userId: { $in: ownerIds },
            });
            if (alreadyExists) return;

            await ApplicationJourney.create({
              journeyId: `journey_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              userId: ownerIds[0],
              jobId: job.jobId,
              status: 'in-progress',
              currentStep: 1,
              totalSteps: 5,
              jobTitle: job.jobTitle,
              company: job.company,
              journeyType: 'standard',
              steps: [
                { stepId: 1, name: 'Job Analysis', status: 'active', data: {} },
                { stepId: 2, name: 'CV Tailoring', status: 'pending', data: {} },
                { stepId: 3, name: 'Cover Letter', status: 'pending', data: {} },
                { stepId: 4, name: 'ATS Check', status: 'pending', data: {} },
                { stepId: 5, name: 'Application Ready', status: 'pending', data: {} },
              ],
              metadata: {
                createdAt: job.createdAt || new Date(),
                updatedAt: new Date(),
                lastAccessedAt: new Date(),
                tags: [],
                notes: '',
              },
            });
            console.log(`✅ Created journey for job ${job._id}`);
          },
        });
      }
    } catch (error: any) {
      console.error('Error checking job journeys:', error);
    }

    return issues;
  }

  /**
   * Check for credits out of sync with subscription
   */
  private async checkCreditSync(): Promise<StateIssue[]> {
    const issues: StateIssue[] = [];

    try {
      const usersWithSubscriptions = await User.find({
        'subscription.status': 'active',
        'subscription.planKey': { $in: ['focused_monthly', 'focused_quarterly', 'focused_yearly'] }
      }).select('_id subscription currentPlanKey');

      for (const user of usersWithSubscriptions) {
        const creditStatus = await creditService.getCreditStatus(user._id.toString());
        
        // For pro plans, credits should be unlimited (-1)
        // If user has limited credits but is on a pro plan, there's a mismatch
        if (creditStatus && creditStatus.jobCredits !== -1 && creditStatus.jobCredits !== undefined) {
          issues.push({
            type: 'credit_subscription_mismatch',
            severity: 'medium',
            description: `User ${user._id} has pro subscription but credits are not unlimited`,
            userId: user._id.toString(),
            fixable: true,
            fix: async () => {
              // Re-initialize credits for the plan
              await creditService.initializeCredits(user._id.toString(), user.subscription?.planKey || 'free');
              console.log(`✅ Re-initialized credits for user ${user._id}`);
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking credit sync:', error);
    }

    return issues;
  }

  /**
   * Check for expired subscriptions not marked as expired
   */
  private async checkExpiredSubscriptions(): Promise<StateIssue[]> {
    const issues: StateIssue[] = [];

    try {
      const now = new Date();
      const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

      // Find subscriptions that should be expired
      const expiredSubscriptions = await User.find({
        'subscription.status': 'active',
        $or: [
          {
            'subscription.accessExpiresAt': {
              $exists: true,
              $lt: new Date(now.getTime() - GRACE_PERIOD_MS)
            }
          },
          {
            'subscription.currentPeriodEnd': {
              $exists: true,
              $lt: new Date(now.getTime() - GRACE_PERIOD_MS)
            },
            'subscription.autoRenew': false
          }
        ]
      }).select('_id subscription currentPlanKey');

      for (const user of expiredSubscriptions) {
        issues.push({
          type: 'expired_subscription_not_marked',
          severity: 'high',
          description: `User ${user._id} has expired subscription but status is still 'active'`,
          userId: user._id.toString(),
          fixable: true,
          fix: async () => {
            // Use subscription service to mark as expired
            await subscriptionService.checkAndUpdateExpiredSubscriptions();
            console.log(`✅ Marked expired subscription for user ${user._id}`);
          },
        });
      }
    } catch (error: any) {
      console.error('Error checking expired subscriptions:', error);
    }

    return issues;
  }

  /**
   * Get recovery statistics
   */
  async getStatistics(): Promise<{
    totalIssues: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const result = await this.runRecovery();
    
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    for (const issue of result.issues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    }
    
    return {
      totalIssues: result.issuesFound,
      byType,
      bySeverity,
    };
  }
}

export default new StateRecoveryService();

