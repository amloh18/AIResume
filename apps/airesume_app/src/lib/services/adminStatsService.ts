/**
 * adminStatsService — single source of truth for admin analytics.
 *
 * Every admin surface (overview page, revenue page, AI settings page) reads
 * through these functions so numbers never disagree between screens. All
 * queries run against existing collections (Invoice, Transaction,
 * Subscription, User, CV, CoverLetter, ApplicationJourney, Job, JobApplication,
 * ActivityLog, EmailCampaign, Newsletter) — no duplicate aggregates are
 * maintained anywhere.
 *
 * Every function degrades gracefully: if one collection fails (e.g. missing
 * indexes on a fresh env), that slice returns zeros instead of failing the
 * whole dashboard.
 */

import mongoose from 'mongoose';

async function getModels() {
  const { getConnection } = await import('@/lib/database');
  await getConnection();
  const models = await import('@/models');
  return models;
}

/** Safe parallel runner: one failing slice must not sink the dashboard. */
async function settle<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[adminStatsService] ${label} failed:`, error);
    return fallback;
  }
}

export interface RevenueStats {
  /** Sum of successfully paid invoice amounts, all time (USD). */
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueToday: number;
  /** active subscriptions normalized to a monthly value. */
  mrr: number;
  /** MRR * 12, purely indicative. */
  arr: number;
  paidInvoiceCount: number;
  refundedAmount: number;
  averageOrderValue: number;
  /** Last 12 months, oldest → newest. */
  monthly: Array<{ month: string; revenue: number; invoices: number }>;
  byPlan: Array<{ plan: string; revenue: number; count: number }>;
  byGateway: Array<{ gateway: string; revenue: number; count: number }>;
}

export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  activeSubscriptions: number;
  planDistribution: Array<{ plan: string; count: number }>;
  subscriptionStatuses: Array<{ status: string; count: number }>;
}

export interface ProductUsageStats {
  cvsCreated: number;
  coverLettersCreated: number;
  journeysCreated: number;
  jobsTracked: number;
  applications: number;
  cvsLast30Days: number;
  journeysLast30Days: number;
  applicationsLast30Days: number;
}

export interface AIUsageStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalTokens: number;
  totalCost: number;
  callsLast30Days: number;
  costLast30Days: number;
  byModel: Array<{ model: string; calls: number; tokens: number; cost: number }>;
  daily: Array<{ day: string; calls: number; cost: number }>;
}

export interface EmailStats {
  campaignsTotal: number;
  campaignsSent: number;
  emailsSentTotal: number;
  emailsSentLast30Days: number;
  newsletterSubscribers: number;
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const { Invoice, Transaction, Subscription } = await getModels();

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const paidFilter = { status: { $in: ['paid', 'partially_refunded'] } };

  const [totals, thisMonth, lastMonth, today, monthlyAgg, byPlanAgg, byGatewayAgg, refundedAgg, mrr] =
    await Promise.all([
      settle(
        Invoice.aggregate([
          { $match: paidFilter },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        [],
        'revenue totals'
      ),
      settle(
        Invoice.aggregate([
          { $match: { ...paidFilter, paidAt: { $gte: startOfThisMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        [],
        'revenue this month'
      ),
      settle(
        Invoice.aggregate([
          { $match: { ...paidFilter, paidAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        [],
        'revenue last month'
      ),
      settle(
        Invoice.aggregate([
          { $match: { ...paidFilter, paidAt: { $gte: startOfToday } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        [],
        'revenue today'
      ),
      settle(
        Invoice.aggregate([
          { $match: { ...paidFilter, paidAt: { $gte: twelveMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
              revenue: { $sum: '$amount' },
              invoices: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        [],
        'revenue monthly'
      ),
      settle(
        Invoice.aggregate([
          { $match: paidFilter },
          { $group: { _id: '$planName', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
        ]),
        [],
        'revenue by plan'
      ),
      settle(
        Transaction.aggregate([
          { $match: { status: 'success', createdAt: { $gte: twelveMonthsAgo } } },
          { $group: { _id: '$gateway', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
        ]),
        [],
        'revenue by gateway'
      ),
      settle(
        Transaction.aggregate([
          { $match: { status: { $in: ['refunded', 'chargeback'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        [],
        'refunded amount'
      ),
      // MRR: normalize active subscriptions to a monthly value.
      settle(
        Subscription.aggregate([
          { $match: { status: 'active' } },
          {
            $project: {
              monthly: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$billingCycle', 'monthly'] }, then: '$amount' },
                    { case: { $eq: ['$billingCycle', 'quarterly'] }, then: { $divide: ['$amount', 3] } },
                    { case: { $eq: ['$billingCycle', 'yearly'] }, then: { $divide: ['$amount', 12] } },
                  ],
                  default: 0,
                },
              },
            },
          },
          { $group: { _id: null, mrr: { $sum: '$monthly' } } },
        ]),
        [],
        'mrr'
      ),
    ]);

  const totalRevenue = totals[0]?.total ?? 0;
  const paidInvoiceCount = totals[0]?.count ?? 0;

  return {
    totalRevenue,
    revenueThisMonth: thisMonth[0]?.total ?? 0,
    revenueLastMonth: lastMonth[0]?.total ?? 0,
    revenueToday: today[0]?.total ?? 0,
    mrr: mrr[0]?.mrr ?? 0,
    arr: (mrr[0]?.mrr ?? 0) * 12,
    paidInvoiceCount,
    refundedAmount: refundedAgg[0]?.total ?? 0,
    averageOrderValue: paidInvoiceCount > 0 ? totalRevenue / paidInvoiceCount : 0,
    monthly: monthlyAgg.map((r: any) => ({ month: r._id, revenue: r.revenue, invoices: r.invoices })),
    byPlan: byPlanAgg.map((r: any) => ({ plan: r._id || 'Unknown', revenue: r.revenue, count: r.count })),
    byGateway: byGatewayAgg.map((r: any) => ({ gateway: r._id || 'unknown', revenue: r.revenue, count: r.count })),
  };
}

export async function getUserStats(): Promise<UserStats> {
  const { User, Subscription } = await getModels();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [total, today, week, month, verified, planDist, statusDist] = await Promise.all([
    settle(User.countDocuments({ isDeleted: { $ne: true } }), 0, 'total users'),
    settle(User.countDocuments({ createdAt: { $gte: startOfToday }, isDeleted: { $ne: true } }), 0, 'users today'),
    settle(User.countDocuments({ createdAt: { $gte: weekAgo }, isDeleted: { $ne: true } }), 0, 'users week'),
    settle(User.countDocuments({ createdAt: { $gte: monthAgo }, isDeleted: { $ne: true } }), 0, 'users month'),
    settle(User.countDocuments({ isEmailVerified: true, isDeleted: { $ne: true } }), 0, 'verified users'),
    settle(
      User.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: { $ifNull: ['$subscription.planKey', 'free'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      [],
      'plan distribution'
    ),
    settle(
      Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      [],
      'subscription statuses'
    ),
  ]);

  return {
    totalUsers: total,
    newUsersToday: today,
    newUsersThisWeek: week,
    newUsersThisMonth: month,
    verifiedUsers: verified,
    activeSubscriptions: statusDist.find((s: any) => s._id === 'active')?.count ?? 0,
    planDistribution: planDist.map((p: any) => ({ plan: p._id || 'free', count: p.count })),
    subscriptionStatuses: statusDist.map((s: any) => ({ status: s._id || 'unknown', count: s.count })),
  };
}

export async function getProductUsageStats(): Promise<ProductUsageStats> {
  const { CV, CoverLetter, ApplicationJourney, Job, JobApplication } = await getModels();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [cvs, letters, journeys, jobs, applications, cvs30, journeys30, apps30] = await Promise.all([
    settle(CV.countDocuments({}), 0, 'cv count'),
    settle(CoverLetter.countDocuments({}), 0, 'cover letter count'),
    settle(ApplicationJourney.countDocuments({}), 0, 'journey count'),
    settle(Job.countDocuments({}), 0, 'job count'),
    settle(JobApplication.countDocuments({}), 0, 'application count'),
    settle(CV.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }), 0, 'cv 30d'),
    settle(ApplicationJourney.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }), 0, 'journey 30d'),
    settle(JobApplication.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }), 0, 'application 30d'),
  ]);

  return {
    cvsCreated: cvs,
    coverLettersCreated: letters,
    journeysCreated: journeys,
    jobsTracked: jobs,
    applications,
    cvsLast30Days: cvs30,
    journeysLast30Days: journeys30,
    applicationsLast30Days: apps30,
  };
}

export async function getAIUsageStats(): Promise<AIUsageStats> {
  const { ActivityLog } = await getModels();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totals, byModel, daily, last30] = await Promise.all([
    settle(
      ActivityLog.aggregate([
        { $match: { logType: 'ai' } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            successCalls: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            totalTokens: { $sum: { $ifNull: ['$aiMetadata.tokensUsed', 0] } },
            totalCost: { $sum: { $ifNull: ['$aiMetadata.cost', 0] } },
          },
        },
      ]),
      [],
      'ai totals'
    ),
    settle(
      ActivityLog.aggregate([
        { $match: { logType: 'ai' } },
        {
          $group: {
            _id: { $ifNull: ['$aiMetadata.model', 'unknown'] },
            calls: { $sum: 1 },
            tokens: { $sum: { $ifNull: ['$aiMetadata.tokensUsed', 0] } },
            cost: { $sum: { $ifNull: ['$aiMetadata.cost', 0] } },
          },
        },
        { $sort: { calls: -1 } },
      ]),
      [],
      'ai by model'
    ),
    settle(
      ActivityLog.aggregate([
        { $match: { logType: 'ai', timestamp: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            calls: { $sum: 1 },
            cost: { $sum: { $ifNull: ['$aiMetadata.cost', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      [],
      'ai daily'
    ),
    settle(
      ActivityLog.aggregate([
        { $match: { logType: 'ai', timestamp: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            calls: { $sum: 1 },
            cost: { $sum: { $ifNull: ['$aiMetadata.cost', 0] } },
          },
        },
      ]),
      [],
      'ai last 30d'
    ),
  ]);

  const t = totals[0] || {};
  const l30 = last30[0] || {};

  return {
    totalCalls: t.totalCalls ?? 0,
    successCalls: t.successCalls ?? 0,
    failedCalls: (t.totalCalls ?? 0) - (t.successCalls ?? 0),
    totalTokens: t.totalTokens ?? 0,
    totalCost: t.totalCost ?? 0,
    callsLast30Days: l30.calls ?? 0,
    costLast30Days: l30.cost ?? 0,
    byModel: byModel.map((m: any) => ({ model: m._id, calls: m.calls, tokens: m.tokens, cost: m.cost })),
    daily: daily.map((d: any) => ({ day: d._id, calls: d.calls, cost: d.cost })),
  };
}

export async function getEmailStats(): Promise<EmailStats> {
  const { EmailCampaign, Newsletter } = await getModels();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, sent, sent30, newsletter] = await Promise.all([
    settle(EmailCampaign.countDocuments({}), 0, 'campaign count'),
    settle(EmailCampaign.countDocuments({ status: 'sent' }), 0, 'campaigns sent'),
    settle(
      EmailCampaign.aggregate([
        { $match: { sentAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, count: { $sum: '$sentCount' } } },
      ]),
      [],
      'emails 30d'
    ),
    settle(Newsletter.countDocuments({}), 0, 'newsletter count'),
  ]);

  const totalSentAgg = await settle(
    EmailCampaign.aggregate([{ $group: { _id: null, count: { $sum: '$sentCount' } } }]),
    [],
    'emails total'
  );

  return {
    campaignsTotal: total,
    campaignsSent: sent,
    emailsSentTotal: totalSentAgg[0]?.count ?? 0,
    emailsSentLast30Days: sent30[0]?.count ?? 0,
    newsletterSubscribers: newsletter,
  };
}

/** Combined dashboard payload — one round trip for the overview page. */
export async function getAdminOverview() {
  const [revenue, users, usage, ai, email] = await Promise.all([
    getRevenueStats(),
    getUserStats(),
    getProductUsageStats(),
    getAIUsageStats(),
    getEmailStats(),
  ]);
  return { revenue, users, usage, ai, email, generatedAt: new Date().toISOString() };
}

/** Recent signups + recent payments for the overview tables. */
export async function getAdminRecentActivity(limit = 8) {
  const { User, Invoice } = await getModels();

  const [recentUsers, recentInvoices] = await Promise.all([
    settle(
      User.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('email firstName lastName createdAt subscription.planKey isEmailVerified')
        .lean(),
      [],
      'recent users'
    ),
    settle(
      Invoice.find({ status: { $in: ['paid', 'partially_refunded'] } })
        .sort({ paidAt: -1 })
        .limit(limit)
        .select('userId invoiceNumber amount currency planName billingCycle paidAt status')
        .lean(),
      [],
      'recent invoices'
    ),
  ]);

  return {
    recentUsers: recentUsers.map((u: any) => ({
      id: String(u._id),
      email: u.email,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      plan: u.subscription?.planKey || 'free',
      verified: !!u.isEmailVerified,
      createdAt: u.createdAt,
    })),
    recentInvoices: recentInvoices.map((i: any) => ({
      id: String(i._id),
      invoiceNumber: i.invoiceNumber,
      userId: String(i.userId),
      amount: i.amount,
      currency: i.currency || 'USD',
      planName: i.planName,
      billingCycle: i.billingCycle,
      paidAt: i.paidAt,
      status: i.status,
    })),
  };
}

/** Paginated invoice list for the revenue page. */
export async function getInvoicesPage(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const { Invoice } = await getModels();

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const filter: Record<string, any> = {};

  if (params.status && params.status !== 'all') {
    filter.status = params.status;
  }
  if (params.search) {
    // userId is Mixed — match either an ObjectId or a raw string id.
    const rx = { $regex: params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ invoiceNumber: rx }, { planName: rx }];
    if (mongoose.Types.ObjectId.isValid(params.search)) {
      filter.$or.push({ userId: new mongoose.Types.ObjectId(params.search) });
    }
    filter.$or.push({ userId: rx as any });
  }

  const [items, total] = await Promise.all([
    settle(
      Invoice.find(filter)
        .sort({ paidAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          'userId invoiceNumber subtotal taxAmount amount currency status planName billingCycle paymentMethodType paidAt createdAt'
        )
        .lean(),
      [],
      'invoices page'
    ),
    settle(Invoice.countDocuments(filter), 0, 'invoices count'),
  ]);

  return {
    items: items.map((i: any) => ({
      id: String(i._id),
      userId: String(i.userId),
      invoiceNumber: i.invoiceNumber,
      subtotal: i.subtotal,
      taxAmount: i.taxAmount,
      amount: i.amount,
      currency: i.currency || 'USD',
      status: i.status,
      planName: i.planName,
      billingCycle: i.billingCycle,
      paymentMethodType: i.paymentMethodType,
      paidAt: i.paidAt,
      createdAt: i.createdAt,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}
