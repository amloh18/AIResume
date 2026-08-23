'use strict';

import mongoose from 'mongoose';

// Application Queue Schema
const ApplicationQueueSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobId: { type: String, required: true },
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  companyLogo: { type: String },
  location: { type: String },
  source: { type: String, required: true },
  sourceUrl: { type: String },
  salary: { type: String },
  status: {
    type: String,
    enum: ['queued', 'processing', 'applying', 'applied', 'failed', 'retrying'],
    default: 'queued'
  },
  priority: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  errorMessage: { type: String },
  lastError: { type: String },
  appliedAt: { type: Date },
  scheduledFor: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
  cvTemplateId: { type: String },
  coverLetterId: { type: String },
  tailoredCV: { type: String },
  coverLetter: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  indexes: [
    { userId: 1, status: 1 },
    { userId: 1, scheduledFor: 1 },
    { status: 1, scheduledFor: 1 },
  ]
});

// User Quota Tracking Schema
const UserQuotaSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hourlyApplications: [{
    timestamp: { type: Date, default: Date.now },
    count: { type: Number, default: 1 }
  }],
  dailyApplications: [{
    date: { type: String }, // YYYY-MM-DD format
    count: { type: Number, default: 0 }
  }],
  monthlyApplications: [{
    yearMonth: { type: String }, // YYYY-MM format
    count: { type: Number, default: 0 }
  }],
  totalApplications: { type: Number, default: 0 },
  totalSuccessful: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  plan: { type: String, default: 'free' },
  planLimits: {
    hourly: { type: Number, default: 10 },
    daily: { type: Number, default: 50 },
    monthly: { type: Number, default: 500 }
  },
  lastResetAt: { type: Date, default: Date.now },
  autoApplyEnabled: { type: Boolean, default: false },
  autoApplySettings: {
    targetRoles: [String],
    locations: [String],
    remoteOnly: { type: Boolean, default: false },
    maxPerHour: { type: Number, default: 5 },
    maxPerDay: { type: Number, default: 20 },
    useCoverLetter: { type: Boolean, default: true },
    useTailoredCV: { type: Boolean, default: true },
    excludeCompanies: [String],
    minSalary: { type: Number },
    matchScoreThreshold: { type: Number, default: 70 }
  },
  rateLimitSettings: {
    minDelayMs: { type: Number, default: 60000 }, // 1 minute between applications
    maxConcurrent: { type: Number, default: 1 }
  }
}, {
  timestamps: true
});

// Rate Limiter Schema for External APIs
const ExternalApiRateLimitSchema = new mongoose.Schema({
  apiProvider: { type: String, required: true, unique: true },
  requests: [{
    timestamp: { type: Date, default: Date.now }
  }],
  limits: {
    requestsPerMinute: { type: Number, default: 10 },
    requestsPerHour: { type: Number, default: 100 },
    requestsPerDay: { type: Number, default: 1000 }
  },
  currentPlan: { type: String, default: 'free' },
  cooldownUntil: { type: Date },
  isLimited: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Job Application History Schema
const ApplicationHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobId: { type: String, required: true },
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  source: { type: String, required: true },
  sourceUrl: { type: String },
  salary: { type: String },
  status: {
    type: String,
    enum: ['pending', 'applied', 'viewed', 'interview', 'rejected', 'offer', 'withdrawn', 'failed'],
    default: 'pending'
  },
  appliedAt: { type: Date, default: Date.now },
  responseDate: { type: Date },
  notes: { type: String },
  interviewDate: { type: Date },
  salaryOffered: { type: Number },
  cvUsed: { type: String },
  coverLetterUsed: { type: String },
  matchScore: { type: Number },
  keywords: [String],
  trackerId: { type: String },
}, {
  timestamps: true,
  indexes: [
    { userId: 1, status: 1 },
    { userId: 1, appliedAt: -1 },
    { company: 1, status: 1 }
  ]
});

export interface IApplicationQueue extends mongoose.Document {
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location?: string;
  source: string;
  sourceUrl?: string;
  salary?: string;
  status: 'queued' | 'processing' | 'applying' | 'applied' | 'failed' | 'retrying';
  priority: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  lastError?: string;
  appliedAt?: Date;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  cvTemplateId?: string;
  coverLetterId?: string;
  tailoredCV?: string;
  coverLetter?: string;
  metadata?: any;
}

export interface IUserQuota extends mongoose.Document {
  userId: string;
  hourlyApplications: Array<{ timestamp: Date; count: number }>;
  dailyApplications: Array<{ date: string; count: number }>;
  monthlyApplications: Array<{ yearMonth: string; count: number }>;
  totalApplications: number;
  totalSuccessful: number;
  totalFailed: number;
  plan: string;
  planLimits: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  lastResetAt: Date;
  autoApplyEnabled: boolean;
  autoApplySettings: {
    targetRoles: string[];
    locations: string[];
    remoteOnly: boolean;
    maxPerHour: number;
    maxPerDay: number;
    useCoverLetter: boolean;
    useTailoredCV: boolean;
    excludeCompanies: string[];
    minSalary?: number;
    matchScoreThreshold: number;
  };
  rateLimitSettings: {
    minDelayMs: number;
    maxConcurrent: number;
  };
}

export interface IExternalApiRateLimit extends mongoose.Document {
  apiProvider: string;
  requests: Array<{ timestamp: Date }>;
  limits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  currentPlan: string;
  cooldownUntil?: Date;
  isLimited: boolean;
}

export interface IApplicationHistory extends mongoose.Document {
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location?: string;
  source: string;
  sourceUrl?: string;
  salary?: string;
  status: 'pending' | 'applied' | 'viewed' | 'interview' | 'rejected' | 'offer' | 'withdrawn' | 'failed';
  appliedAt: Date;
  responseDate?: Date;
  notes?: string;
  interviewDate?: Date;
  salaryOffered?: number;
  cvUsed?: string;
  coverLetterUsed?: string;
  matchScore?: number;
  keywords?: string[];
  trackerId?: string;
}

// Create models (will be used after connection)
let ApplicationQueue: mongoose.Model<IApplicationQueue>;
let UserQuota: mongoose.Model<IUserQuota>;
let ExternalApiRateLimit: mongoose.Model<IExternalApiRateLimit>;
let ApplicationHistory: mongoose.Model<IApplicationHistory>;

export async function initializeModels() {
  if (!ApplicationQueue) {
    ApplicationQueue = mongoose.models.ApplicationQueue || mongoose.model<IApplicationQueue>('ApplicationQueue', ApplicationQueueSchema);
  }
  if (!UserQuota) {
    UserQuota = mongoose.models.UserQuota || mongoose.model<IUserQuota>('UserQuota', UserQuotaSchema);
  }
  if (!ExternalApiRateLimit) {
    ExternalApiRateLimit = mongoose.models.ExternalApiRateLimit || mongoose.model<IExternalApiRateLimit>('ExternalApiRateLimit', ExternalApiRateLimitSchema);
  }
  if (!ApplicationHistory) {
    ApplicationHistory = mongoose.models.ApplicationHistory || mongoose.model<IApplicationHistory>('ApplicationHistory', ApplicationHistorySchema);
  }
}

// Quota Management Functions
export async function checkUserQuota(userId: string): Promise<{
  canApply: boolean;
  remaining: { hourly: number; daily: number };
  nextAvailable: Date | null;
}> {
  await initializeModels();
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  
  // Get or create user quota
  let quota = await UserQuota.findOne({ userId });
  
  if (!quota) {
    quota = new UserQuota({ userId });
    await quota.save();
  }
  
  // Clean up old entries and count current usage
  const hourlyCount = quota.hourlyApplications
    .filter((a: any) => new Date(a.timestamp) > oneHourAgo)
    .reduce((sum: number, a: any) => sum + a.count, 0);
  
  const dailyEntry = quota.dailyApplications.find((d: any) => d.date === today);
  const dailyCount = dailyEntry?.count || 0;
  
  const hourlyLimit = quota.planLimits.hourly;
  const dailyLimit = quota.planLimits.daily;
  
  const remainingHourly = Math.max(0, hourlyLimit - hourlyCount);
  const remainingDaily = Math.max(0, dailyLimit - dailyCount);
  
  const canApply = remainingHourly > 0 && remainingDaily > 0;
  
  // Calculate next available time
  let nextAvailable: Date | null = null;
  if (!canApply) {
    if (remainingHourly <= 0) {
      const oldestHourly = quota.hourlyApplications
        .filter((a: any) => new Date(a.timestamp) > oneHourAgo)
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
      if (oldestHourly) {
        nextAvailable = new Date(new Date(oldestHourly.timestamp).getTime() + 60 * 60 * 1000);
      }
    }
  }
  
  return {
    canApply,
    remaining: { hourly: remainingHourly, daily: remainingDaily },
    nextAvailable
  };
}

export async function recordApplication(userId: string, count: number = 1): Promise<void> {
  await initializeModels();
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yearMonth = now.toISOString().slice(0, 7);
  
  const quota = await UserQuota.findOne({ userId });
  if (!quota) return;
  
  // Add hourly application
  quota.hourlyApplications.push({ timestamp: now, count });
  
  // Update daily count
  const dailyEntry = quota.dailyApplications.find((d: any) => d.date === today);
  if (dailyEntry) {
    dailyEntry.count += count;
  } else {
    quota.dailyApplications.push({ date: today, count });
  }
  
  // Update monthly count
  const monthlyEntry = quota.monthlyApplications.find((m: any) => m.yearMonth === yearMonth);
  if (monthlyEntry) {
    monthlyEntry.count += count;
  } else {
    quota.monthlyApplications.push({ yearMonth, count });
  }
  
  // Update totals
  quota.totalApplications += count;
  
  // Clean up old entries (older than 24 hours for hourly, 30 days for daily)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  quota.hourlyApplications = quota.hourlyApplications.filter((a: any) => new Date(a.timestamp) > oneDayAgo);
  quota.dailyApplications = quota.dailyApplications.filter((d: any) => new Date(d.date + 'T00:00:00') > thirtyDaysAgo);
  quota.monthlyApplications = quota.monthlyApplications.filter((m: any) => {
    const [year, month] = m.yearMonth.split('-');
    return new Date(parseInt(year), parseInt(month) - 1) > thirtyDaysAgo;
  });
  
  await quota.save();
}

export async function recordApplicationSuccess(userId: string): Promise<void> {
  await initializeModels();
  
  const quota = await UserQuota.findOne({ userId });
  if (quota) {
    quota.totalSuccessful += 1;
    await quota.save();
  }
}

export async function recordApplicationFailure(userId: string): Promise<void> {
  await initializeModels();
  
  const quota = await UserQuota.findOne({ userId });
  if (quota) {
    quota.totalFailed += 1;
    await quota.save();
  }
}

// Queue Management Functions
export async function addToApplicationQueue(application: Partial<IApplicationQueue>): Promise<IApplicationQueue> {
  await initializeModels();
  
  const queued = new ApplicationQueue({
    ...application,
    status: 'queued',
    scheduledFor: application.scheduledFor || new Date()
  });
  
  await queued.save();
  return queued;
}

export async function getNextQueuedApplication(userId: string): Promise<IApplicationQueue | null> {
  await initializeModels();
  
  const now = new Date();
  return ApplicationQueue.findOne({
    userId,
    status: 'queued',
    scheduledFor: { $lte: now }
  }).sort({ priority: -1, scheduledFor: 1 });
}

export async function updateApplicationStatus(
  id: string,
  status: IApplicationQueue['status'],
  error?: string
): Promise<void> {
  await initializeModels();
  
  const update: any = { status };
  
  if (status === 'applied') {
    update.appliedAt = new Date();
    update.completedAt = new Date();
  } else if (status === 'processing' || status === 'applying') {
    update.startedAt = new Date();
  }
  
  if (error) {
    update.lastError = error;
  }
  
  await ApplicationQueue.findByIdAndUpdate(id, update);
}

export async function retryApplication(id: string): Promise<IApplicationQueue | null> {
  await initializeModels();
  
  const application = await ApplicationQueue.findById(id);
  if (!application) return null;
  
  if (application.retryCount >= application.maxRetries) {
    application.status = 'failed';
    application.lastError = 'Max retries exceeded';
    await application.save();
    return null;
  }
  
  // Schedule retry with exponential backoff
  const delayMs = Math.pow(2, application.retryCount) * 60000; // 1min, 2min, 4min
  application.status = 'queued';
  application.retryCount += 1;
  application.scheduledFor = new Date(Date.now() + delayMs);
  application.lastError = undefined;
  
  await application.save();
  return application;
}

// External API Rate Limiting
export async function checkApiRateLimit(provider: string): Promise<{
  canProceed: boolean;
  waitTimeMs: number;
}> {
  await initializeModels();
  
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  let rateLimit = await ExternalApiRateLimit.findOne({ apiProvider: provider });
  
  if (!rateLimit) {
    rateLimit = new ExternalApiRateLimit({ apiProvider: provider });
    await rateLimit.save();
  }
  
  // Check if in cooldown
  if (rateLimit.cooldownUntil && rateLimit.cooldownUntil > now) {
    return {
      canProceed: false,
      waitTimeMs: rateLimit.cooldownUntil.getTime() - now.getTime()
    };
  }
  
  // Clean old requests and count current
  const recentRequests = rateLimit.requests.filter((r: any) => new Date(r.timestamp) > oneMinuteAgo);
  const hourlyRequests = rateLimit.requests.filter((r: any) => new Date(r.timestamp) > oneHourAgo);
  
  const limits = rateLimit.limits;
  
  if (recentRequests.length >= limits.requestsPerMinute) {
    return { canProceed: false, waitTimeMs: 60000 };
  }
  
  if (hourlyRequests.length >= limits.requestsPerHour) {
    // Set cooldown
    rateLimit.isLimited = true;
    rateLimit.cooldownUntil = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
    await rateLimit.save();
    return { canProceed: false, waitTimeMs: 60 * 60 * 1000 };
  }
  
  return { canProceed: true, waitTimeMs: 0 };
}

export async function recordApiRequest(provider: string): Promise<void> {
  await initializeModels();
  
  const rateLimit = await ExternalApiRateLimit.findOne({ apiProvider: provider });
  if (rateLimit) {
    rateLimit.requests.push({ timestamp: new Date() });
    
    // Clean old requests (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    rateLimit.requests = rateLimit.requests.filter((r: any) => new Date(r.timestamp) > oneDayAgo);
    
    // Reset cooldown if limits are no longer exceeded
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyRequests = rateLimit.requests.filter((r: any) => new Date(r.timestamp) > oneHourAgo);
    
    if (hourlyRequests.length < rateLimit.limits.requestsPerHour * 0.8) {
      rateLimit.isLimited = false;
      rateLimit.cooldownUntil = undefined;
    }
    
    await rateLimit.save();
  }
}

// Application History Functions
export async function addToApplicationHistory(application: Partial<IApplicationHistory>): Promise<IApplicationHistory> {
  await initializeModels();
  
  const history = new ApplicationHistory({
    ...application,
    appliedAt: application.appliedAt || new Date()
  });
  
  await history.save();
  return history;
}

export async function getApplicationHistory(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    skip?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{ applications: IApplicationHistory[]; total: number }> {
  await initializeModels();
  
  const query: any = { userId };
  
  if (options?.status) {
    query.status = options.status;
  }
  
  if (options?.startDate || options?.endDate) {
    query.appliedAt = {};
    if (options.startDate) query.appliedAt.$gte = options.startDate;
    if (options.endDate) query.appliedAt.$lte = options.endDate;
  }
  
  const applications = await ApplicationHistory.find(query)
    .sort({ appliedAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 20);
  
  const total = await ApplicationHistory.countDocuments(query);
  
  return { applications, total };
}

export async function updateApplicationStatusInHistory(
  jobId: string,
  userId: string,
  status: IApplicationHistory['status'],
  additionalFields?: Partial<IApplicationHistory>
): Promise<void> {
  await initializeModels();
  
  const update: any = { status };
  
  if (status === 'interview') {
    update.interviewDate = new Date();
  } else if (status === 'rejected' || status === 'offer') {
    update.responseDate = new Date();
  }
  
  if (additionalFields) {
    Object.assign(update, additionalFields);
  }
  
  await ApplicationHistory.findOneAndUpdate(
    { jobId, userId },
    { $set: update }
  );
}

export async function getApplicationStats(userId: string): Promise<{
  total: number;
  applied: number;
  pending: number;
  interview: number;
  rejected: number;
  offer: number;
  successRate: number;
  applicationsToday: number;
  applicationsThisWeek: number;
  applicationsThisMonth: number;
}> {
  await initializeModels();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  
  const statusCounts = await ApplicationHistory.aggregate(pipeline);
  const statusMap: Record<string, number> = {};
  
  statusCounts.forEach((s: any) => {
    statusMap[s._id] = s.count;
  });
  
  const total = Object.values(statusMap).reduce((sum, count) => sum + count, 0);
  const applied = statusMap['applied'] || 0;
  const pending = statusMap['pending'] || 0;
  const interview = statusMap['interview'] || 0;
  const rejected = statusMap['rejected'] || 0;
  const offer = statusMap['offer'] || 0;
  
  const successCount = applied + interview + offer;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  
  const applicationsToday = await ApplicationHistory.countDocuments({
    userId,
    appliedAt: { $gte: today }
  });
  
  const applicationsThisWeek = await ApplicationHistory.countDocuments({
    userId,
    appliedAt: { $gte: weekAgo }
  });
  
  const applicationsThisMonth = await ApplicationHistory.countDocuments({
    userId,
    appliedAt: { $gte: monthAgo }
  });
  
  return {
    total,
    applied,
    pending,
    interview,
    rejected,
    offer,
    successRate,
    applicationsToday,
    applicationsThisWeek,
    applicationsThisMonth
  };
}

// Auto-Apply Job Matching
export async function findMatchingJobsForAutoApply(
  userId: string,
  limit: number = 10
): Promise<IApplicationQueue[]> {
  await initializeModels();
  
  // Get user's auto-apply settings
  const quota = await UserQuota.findOne({ userId });
  if (!quota || !quota.autoApplyEnabled) {
    return [];
  }
  
  const settings = quota.autoApplySettings;
  const { remaining } = await checkUserQuota(userId);
  
  if (!settings.targetRoles?.length || remaining.hourly <= 0) {
    return [];
  }
  
  // Build match query
  const matchQuery: any = {
    status: 'queued',
    userId: { $ne: userId }, // Jobs from discovery that match criteria
    $or: settings.targetRoles.map((role: string) => ({
      jobTitle: { $regex: role, $options: 'i' }
    }))
  };
  
  if (settings.locations?.length) {
    matchQuery.$and = settings.locations.map((loc: string) => ({
      location: { $regex: loc, $options: 'i' }
    }));
  }
  
  if (settings.remoteOnly) {
    matchQuery.$or = [
      ...(matchQuery.$or || []),
      { location: { $regex: /remote/i } },
      { location: { $regex: /work from home/i } }
    ];
  }
  
  if (settings.excludeCompanies?.length) {
    matchQuery.company = { $nin: settings.excludeCompanies };
  }
  
  if (settings.minSalary) {
    matchQuery.$or = [
      ...(matchQuery.$or || []),
      { salary: { $gte: settings.minSalary } }
    ];
  }
  
  // Return jobs up to the limit and remaining quota
  const availableToApply = Math.min(limit, remaining.hourly, remaining.daily);
  
  return ApplicationQueue.find(matchQuery)
    .sort({ priority: -1, scheduledFor: 1 })
    .limit(availableToApply);
}

export async function processApplicationQueue(userId: string): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  let application: IApplicationQueue | null = null;
  
  try {
    // Check global quota first
    const { canApply, remaining } = await checkUserQuota(userId);
    
    if (!canApply || remaining.hourly <= 0) {
      results.errors.push('Daily application limit reached');
      return results;
    }
    
    // Get next application from queue
    application = await getNextQueuedApplication(userId);
    
    if (!application) {
      return results;
    }
    
    // Check per-source daily limits from User model preferences
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean() as any;
    if (user) {
      const source = application.source;
      let dailyLimit = 25; // default

      if (source === 'naukri' && user.naukriIntegration?.preferences?.dailyLimit) {
        dailyLimit = user.naukriIntegration.preferences.dailyLimit;
      } else if (source === 'indeed' && user.indeedIntegration?.preferences?.dailyLimit) {
        dailyLimit = user.indeedIntegration.preferences.dailyLimit;
      }

      // Count today's applications for this source
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today + 'T00:00:00Z');
      await initializeModels();
      const todayCount = await ApplicationHistory.countDocuments({
        userId,
        source,
        appliedAt: { $gte: todayStart },
      });

      if (todayCount >= dailyLimit) {
        results.errors.push(`Daily limit for ${source} reached (${dailyLimit}/${dailyLimit})`);
        return results;
      }
    }
    
    // Check API rate limits
    const { canProceed: apiCanProceed, waitTimeMs: apiWaitMs } = await checkApiRateLimit(application.source);
    
    if (!apiCanProceed) {
      // Reschedule for later
      application.scheduledFor = new Date(Date.now() + apiWaitMs);
      await application.save();
      results.errors.push(`API rate limited, retry in ${Math.ceil(apiWaitMs / 60000)} minutes`);
      return results;
    }
    
    // Mark as processing
    await updateApplicationStatus(application._id!.toString(), 'processing');
    results.processed += 1;
    
    // Record API request
    await recordApiRequest(application.source);
    
    // Use unified apply service for real application submission
    const { UnifiedApplyService } = await import('./unifiedApplyService');
    
    const applyResult = await UnifiedApplyService.apply(userId, {
      jobId: application.jobId,
      title: application.jobTitle,
      company: application.company,
      description: application.metadata?.description || '',
      location: application.location,
      salary: application.salary,
      jobUrl: application.sourceUrl || '',
      atsType: (application.metadata?.atsType || application.source || 'unknown') as any,
      source: application.source,
      screeningQuestions: application.metadata?.screeningQuestions || [],
    });
    
    if (applyResult.success && applyResult.status === 'applied') {
      // Successfully applied
      await updateApplicationStatus(application._id!.toString(), 'applied');
      await recordApplication(userId);
      await addToApplicationHistory({
        userId: application.userId,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        company: application.company,
        location: application.location,
        source: application.source,
        sourceUrl: application.sourceUrl,
        salary: application.salary,
        status: 'applied',
        cvUsed: application.cvTemplateId,
        coverLetterUsed: application.coverLetterId
      });
      await recordApplicationSuccess(userId);
      results.successful += 1;
    } else if (applyResult.status === 'action_required') {
      // Needs manual action - mark as queued with action required note
      await updateApplicationStatus(application._id!.toString(), 'queued', applyResult.message);
      results.errors.push(`Action required: ${applyResult.message}`);
    } else {
      // Failed
      await updateApplicationStatus(application._id!.toString(), 'failed', applyResult.message);
      results.failed += 1;
      results.errors.push(applyResult.message);
    }
    
  } catch (error: any) {
    results.failed += 1;
    results.errors.push(error.message);
    
    if (application) {
      await updateApplicationStatus(application._id!.toString(), 'failed', error.message);
    }
  }
  
  return results;
}

export async function startAutoApplyProcessor(userId: string): Promise<void> {
  // This would be called by a cron job or background worker
  // It processes applications one at a time respecting rate limits
  
  const { remaining } = await checkUserQuota(userId);
  
  if (remaining.hourly <= 0) {
    console.log('Auto-apply paused: quota exceeded');
    return;
  }
  
  const result = await processApplicationQueue(userId);
  
  if (result.successful > 0 && remaining.hourly > 1) {
    // Continue processing if more quota available
    // Add delay between applications
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute delay
    await startAutoApplyProcessor(userId);
  }
}

export default {
  initializeModels,
  checkUserQuota,
  recordApplication,
  recordApplicationSuccess,
  recordApplicationFailure,
  addToApplicationQueue,
  getNextQueuedApplication,
  updateApplicationStatus,
  retryApplication,
  checkApiRateLimit,
  recordApiRequest,
  addToApplicationHistory,
  getApplicationHistory,
  updateApplicationStatusInHistory,
  getApplicationStats,
  findMatchingJobsForAutoApply,
  processApplicationQueue,
  startAutoApplyProcessor
};
