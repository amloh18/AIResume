import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import Invoice from '@/models/Invoice';
import InvoiceItem from '@/models/InvoiceItem';
import { getAdminPricingPlan } from '@/models/admin-models';
import { ActivityLogService } from '@/lib/services/activityLogService';
import creditService from '@/lib/services/creditService';
import { invalidateConfigCache } from '@/lib/config/adminConfig';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { createTransaction } from '@/lib/services/transactionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let adminContext: { adminUserId?: string; adminEmail?: string; adminRole?: string } | null = null;

  try {
    // Verify admin authentication using NextAuth session
    const session = await requireAdmin(request);
    const adminUser = session.user as any;
    adminContext = {
      adminUserId: adminUser.id || session.user.id as string,
      adminEmail: adminUser.email || session.user.email || undefined,
      adminRole: adminUser.role || 'admin'
    };

    await getConnection();

    const { id } = await params;
    const userId = id;
    const body = await request.json();
    const { planKey, interval, reason } = body;

    // Validate input
    if (!planKey) {
      return NextResponse.json(
        { success: false, error: 'Plan key is required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the plan
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Calculate end date based on interval
    const startDate = new Date();
    let endDate = new Date();
    let currentPeriodEnd = new Date();

    if (interval === 'monthly' || planKey === 'pro_monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (interval === 'quarterly' || planKey === 'pro_quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    } else if (interval === 'yearly' || planKey === 'pro_yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else if (planKey === 'pro_lifetime') {
      // Lifetime plan lasts essentially forever
      endDate = new Date('2099-12-31');
      currentPeriodEnd = new Date('2099-12-31');
    } else if (planKey === 'free') {
      // Free plan doesn't expire
      endDate = new Date('2099-12-31');
      currentPeriodEnd = new Date('2099-12-31');
    }

    // Update user subscription
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        currentPlanKey: planKey,
        subscription: {
          planKey: planKey,
          status: 'active',
          startDate: startDate,
          endDate: endDate,
          currentPeriodStart: startDate,
          currentPeriodEnd: currentPeriodEnd,
          provider: 'admin',
          interval: interval || (planKey === 'pro_lifetime' ? 'one-time' : 'monthly'),
          seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
          storageUsed: 0
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user subscription' },
        { status: 500 }
      );
    }

    // Handle credits on plan change
    const oldPlanKey = user.currentPlanKey || 'free';
    const isUpgrade = planKey !== oldPlanKey;
    
    if (isUpgrade) {
      // Initialize credits for new plan
      await creditService.initializeCredits(userId, planKey);
    } else {
      // If same plan, just ensure credits are initialized
      const creditStatus = await creditService.getCreditStatus(userId);
      if (!creditStatus || creditStatus.jobCredits === 0) {
        await creditService.initializeCredits(userId, planKey);
      }
    }

    // Create invoice for admin-granted subscription
    // Only create invoice if plan is not free (free plans don't need invoices)
    if (planKey !== 'free') {
      try {
        // Get plan pricing - use 0 for admin-granted plans or get from country pricing
        const amount = 0; // Admin-granted plans are typically free
        const currency = 'USD'; // Default currency
        
        const invoice = await Invoice.create({
          userId: userId,
          subtotal: amount,
          taxAmount: 0,
          amount: amount,
          currency: currency,
          status: 'paid',
          planName: plan.name,
          planId: plan._id,
          billingCycle: interval || (planKey === 'pro_lifetime' ? 'one-time' : 'monthly'),
          paymentMethodType: 'admin',
          paymentMethodLast4: 'ADMIN',
          paidAt: new Date(),
          invoiceDate: new Date(),
          dueDate: endDate,
          description: `${plan.name} - ${interval || 'monthly'} subscription (Admin granted)`,
          metadata: {
            adminUserId: adminContext.adminUserId,
            adminEmail: adminContext.adminEmail,
            reason: reason || 'Admin granted subscription',
            previousPlan: oldPlanKey
          }
        });

        // Create invoice items
        await InvoiceItem.create({
          invoiceId: invoice._id,
          description: `${plan.name} - ${interval || 'monthly'} subscription`,
          quantity: 1,
          unitPrice: amount,
          amount: amount,
          type: 'subscription'
        });

        // Create transaction record for admin-granted subscription
        await createTransaction({
          invoiceId: invoice._id.toString(),
          amount: amount,
          status: 'success',
          gatewayReferenceId: `admin_${userId}_${Date.now()}`,
          gateway: 'admin',
          metadata: {
            adminUserId: adminContext.adminUserId,
            adminEmail: adminContext.adminEmail,
            reason: reason || 'Admin granted subscription',
            planKey: planKey,
            interval: interval
          }
        });

        console.log(`✅ Invoice created for admin-granted subscription: ${invoice.invoiceNumber}`);
      } catch (invoiceError) {
        // Log error but don't fail the subscription upgrade
        console.error('Error creating invoice for admin-granted subscription:', invoiceError);
      }
    }

    const responseTime = Date.now() - startTime;

    // Invalidate config cache since plan usage may have changed
    invalidateConfigCache();

    // Log admin action
    if (adminContext) {
      await ActivityLogService.logAdminAction({
        adminUserId: adminContext.adminUserId!,
        adminEmail: adminContext.adminEmail,
        action: `granted_plan_${planKey}`,
        targetUserId: userId,
        actionType: 'subscription_upgrade',
        resourceType: 'user',
        resourceId: userId,
        status: 'success',
        metadata: {
          planKey,
          interval,
          reason,
          previousPlan: user.currentPlanKey
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan granted successfully',
      subscription: {
        planKey: updatedUser.currentPlanKey,
        status: updatedUser.subscription?.status,
        startDate: updatedUser.subscription?.startDate,
        endDate: updatedUser.subscription?.endDate,
        currentPeriodEnd: updatedUser.subscription?.currentPeriodEnd,
        provider: updatedUser.subscription?.provider,
        interval: updatedUser.subscription?.interval
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Error granting plan:', error);

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

    // Log failed admin action
    if (adminContext) {
      try {
        const { id } = await params;
        await ActivityLogService.logAdminAction({
          adminUserId: adminContext.adminUserId!,
          adminEmail: adminContext.adminEmail,
          action: 'grant_plan_failed',
          targetUserId: id,
          actionType: 'subscription_upgrade',
          resourceType: 'user',
          resourceId: id,
          status: 'failed',
          metadata: {
            error: error.message
          }
        });
      } catch (logError) {
        // Don't fail if logging fails
        console.error('Failed to log admin action:', logError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

