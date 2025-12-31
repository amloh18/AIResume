/**
 * Subscription & System Helper Utilities
 * 
 * Handles edge cases for System & Subscription (EC-41 to EC-50)
 */

/**
 * EC-41: Free Tier Limit Checks
 * Determine if user can perform an action based on their plan
 */
export interface PlanLimits {
  journeyCVs: number;
  activeJourneyCVs: number;     // Explicit active count
  surgeonRuns: number;
  downloads: number;
  premiumTemplates: boolean;
  maxCVs: number;
  maxJobs: number;              // NEW: Job tracker limit
  aiSurgeonMode: 'spelling_only' | 'full';  // NEW: AI mode restriction
  coverLetterAI: boolean;       // NEW: No AI cover letter
  docxExport: boolean;          // NEW: No DOCX export
  hasVault?: boolean;           // NEW: Career Vault feature (Yearly only)
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    journeyCVs: 1,              // 1 Active Journey CV
    activeJourneyCVs: 1,        // Explicit active count
    surgeonRuns: 10,
    downloads: 5,
    premiumTemplates: false,
    maxCVs: 5,
    maxJobs: 3,                 // 3 Jobs total (including archived)
    aiSurgeonMode: 'spelling_only',  // NEW: AI mode restriction
    coverLetterAI: false,       // NEW: No AI cover letter
    docxExport: false           // NEW: No DOCX export
  },
  day_pass: {
    journeyCVs: -1,             // Unlimited during 24h
    activeJourneyCVs: -1,
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: 100,
    aiSurgeonMode: 'full',      // Full AI rewrite
    coverLetterAI: true,
    docxExport: true
  },
  pro_monthly: {
    journeyCVs: 50,             // 50 Active per month
    activeJourneyCVs: 50,
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: -1,
    aiSurgeonMode: 'full',
    coverLetterAI: true,
    docxExport: true
  },
  pro_quarterly: {
    journeyCVs: -1,            // Unlimited
    activeJourneyCVs: -1,
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: -1,
    aiSurgeonMode: 'full',
    coverLetterAI: true,
    docxExport: true
  },
  pro_yearly: {
    journeyCVs: -1,            // Unlimited
    activeJourneyCVs: -1,
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: -1,
    aiSurgeonMode: 'full',
    coverLetterAI: true,
    docxExport: true,
    hasVault: true              // NEW: Career Vault feature
  },
  pro_lifetime: {
    journeyCVs: -1,            // Unlimited
    activeJourneyCVs: -1, // Explicit active count
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: -1,
    aiSurgeonMode: 'full',
    coverLetterAI: true,
    docxExport: true,
    hasVault: true
  },
  pro: {
    journeyCVs: 50,             // Default to monthly limits for generic pro
    activeJourneyCVs: 50,
    surgeonRuns: -1,
    downloads: -1,
    premiumTemplates: true,
    maxCVs: -1,
    maxJobs: -1,
    aiSurgeonMode: 'full',
    coverLetterAI: true,
    docxExport: true
  }
};

export function getPlanLimits(planKey: string): PlanLimits {
  return PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
}

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * EC-42: Premium Template Paywall
 * Check if user can use a premium template
 */
export function canUsePremiumTemplate(
  planKey: string,
  templateTier: 'free' | 'premium'
): { allowed: boolean; message?: string } {
  if (templateTier === 'free') {
    return { allowed: true };
  }

  const limits = getPlanLimits(planKey);

  if (!limits.premiumTemplates) {
    return {
      allowed: false,
      message: 'Premium templates require a Pro subscription. Upgrade to unlock all templates.'
    };
  }

  return { allowed: true };
}

/**
 * EC-43: Downgrade Preservation
 * When user downgrades, preserve access to existing resources (read-only)
 */
export interface DowngradeResult {
  preservedResources: {
    cvs: string[];
    coverLetters: string[];
    journeys: string[];
  };
  lockedResources: {
    premiumTemplates: boolean;
    unlimitedDownloads: boolean;
    unlimitedSurgeon: boolean;
  };
  message: string;
}

export function handlePlanDowngrade(
  fromPlan: string,
  toPlan: string,
  existingResources: {
    cvCount: number;
    journeyCount: number;
    usingPremiumTemplates: boolean;
  }
): DowngradeResult {
  const newLimits = getPlanLimits(toPlan);
  const lockedResources = {
    premiumTemplates: !newLimits.premiumTemplates && existingResources.usingPremiumTemplates,
    unlimitedDownloads: !isUnlimited(newLimits.downloads),
    unlimitedSurgeon: !isUnlimited(newLimits.surgeonRuns)
  };

  let message = 'Your existing CVs and cover letters are preserved and can be viewed. ';

  if (lockedResources.premiumTemplates) {
    message += 'Premium templates will switch to free alternatives on next edit. ';
  }

  if (lockedResources.unlimitedDownloads) {
    message += `Downloads are now limited to ${newLimits.downloads}/month. `;
  }

  return {
    preservedResources: {
      cvs: [], // Populated by caller
      coverLetters: [],
      journeys: []
    },
    lockedResources,
    message: message.trim()
  };
}

/**
 * EC-44: DOCX Export Alignment Fix
 * Provide warnings about potential DOCX issues
 */
export interface ExportWarning {
  format: 'pdf' | 'docx';
  warnings: string[];
  recommendation?: string;
}

export function getExportWarnings(
  format: 'pdf' | 'docx',
  templateLayout: string,
  hasSpecialFormatting: boolean
): ExportWarning {
  const warnings: string[] = [];

  if (format === 'docx') {
    if (templateLayout === 'two-column' || templateLayout === 'three-column') {
      warnings.push('Multi-column layouts may not preserve alignment in DOCX format');
    }

    if (hasSpecialFormatting) {
      warnings.push('Some styling (gradients, shadows) will be simplified in DOCX');
    }

    warnings.push('For best results, use PDF format for job applications');
  }

  return {
    format,
    warnings,
    recommendation: warnings.length > 0 ? 'PDF format is recommended for ATS submission' : undefined
  };
}

/**
 * EC-45: Pagination for Large Lists
 * Calculate pagination for job tracker with 500+ items
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export function calculatePagination(
  totalItems: number,
  currentPage: number = 1,
  pageSize: number = 50
): PaginationConfig {
  const totalPages = Math.ceil(totalItems / pageSize);
  const page = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    startIndex,
    endIndex
  };
}

/**
 * EC-47: JD Link Expiration Handling
 * Check if cached JD is available when link is expired
 */
export interface JDCacheCheck {
  hasCache: boolean;
  cachedAt?: Date;
  isStale: boolean;
  message?: string;
}

export function checkJDCache(
  cachedJD: string | undefined,
  cachedAt: Date | undefined,
  staleDays: number = 30
): JDCacheCheck {
  if (!cachedJD) {
    return {
      hasCache: false,
      isStale: false,
      message: 'No cached job description available'
    };
  }

  const now = new Date();
  const cacheDate = new Date(cachedAt || 0);
  const daysSinceCached = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
  const isStale = daysSinceCached > staleDays;

  return {
    hasCache: true,
    cachedAt: cacheDate,
    isStale,
    message: isStale
      ? `Using cached job description from ${Math.round(daysSinceCached)} days ago. The job may have changed.`
      : undefined
  };
}

/**
 * EC-48: PII Detection for Anonymized Sharing
 * Detect personally identifiable information for anonymization
 */
export interface PIIDetection {
  hasPII: boolean;
  detectedFields: string[];
  anonymizedData?: Record<string, string>;
}

export function detectPII(cvData: any): PIIDetection {
  const detectedFields: string[] = [];
  const anonymizedData: Record<string, string> = {};

  // Check common PII fields
  if (cvData.basics?.name) {
    detectedFields.push('name');
    anonymizedData['name'] = '[REDACTED NAME]';
  }

  if (cvData.basics?.email) {
    detectedFields.push('email');
    anonymizedData['email'] = '[REDACTED EMAIL]';
  }

  if (cvData.basics?.phone) {
    detectedFields.push('phone');
    anonymizedData['phone'] = '[REDACTED PHONE]';
  }

  if (cvData.basics?.location) {
    detectedFields.push('location');
    // Keep city/country, remove specific address
    const location = cvData.basics.location;
    if (typeof location === 'string' && location.match(/\d/)) {
      anonymizedData['location'] = location.replace(/\d+[^,]*/g, '[ADDRESS]');
    }
  }

  // Check for social profiles
  if (cvData.basics?.profiles) {
    cvData.basics.profiles.forEach((profile: any, index: number) => {
      if (profile.url || profile.username) {
        detectedFields.push(`profiles[${index}]`);
      }
    });
  }

  return {
    hasPII: detectedFields.length > 0,
    detectedFields,
    anonymizedData
  };
}

/**
 * EC-49: Email Integration Error Handling
 * Handle errors when sending CV via email
 */
export interface EmailSendResult {
  success: boolean;
  error?: string;
  fallbackAction?: 'download' | 'copy_link' | 'retry';
  message: string;
}

export function handleEmailError(
  errorCode: string | number
): EmailSendResult {
  const errorHandlers: Record<string, EmailSendResult> = {
    'auth_failed': {
      success: false,
      error: 'Email authentication failed',
      fallbackAction: 'download',
      message: 'Could not connect to your email. Download the CV instead.'
    },
    'quota_exceeded': {
      success: false,
      error: 'Email quota exceeded',
      fallbackAction: 'retry',
      message: 'Too many emails sent. Please try again later.'
    },
    'invalid_recipient': {
      success: false,
      error: 'Invalid email address',
      fallbackAction: 'retry',
      message: 'Please check the recipient email address.'
    },
    'timeout': {
      success: false,
      error: 'Request timed out',
      fallbackAction: 'retry',
      message: 'The request took too long. Please try again.'
    },
    'default': {
      success: false,
      error: 'Unknown error',
      fallbackAction: 'download',
      message: 'Could not send email. Download the CV and attach manually.'
    }
  };

  return errorHandlers[errorCode.toString()] || errorHandlers['default'];
}

/**
 * Check if user's subscription is active
 */
export function isSubscriptionActive(
  subscription: {
    status: string;
    endDate?: Date;
    accessExpiresAt?: Date;
  }
): { isActive: boolean; reason?: string } {
  if (subscription.status === 'inactive' || subscription.status === 'cancelled') {
    return { isActive: false, reason: 'Subscription is inactive' };
  }

  if (subscription.status === 'expired') {
    return { isActive: false, reason: 'Subscription has expired' };
  }

  // Check end date
  if (subscription.endDate) {
    const endDate = new Date(subscription.endDate);
    if (endDate < new Date()) {
      return { isActive: false, reason: 'Subscription period has ended' };
    }
  }

  // Check access expiry (for day passes)
  if (subscription.accessExpiresAt) {
    const expiresAt = new Date(subscription.accessExpiresAt);
    if (expiresAt < new Date()) {
      return { isActive: false, reason: 'Access period has expired' };
    }
  }

  return { isActive: true };
}

/**
 * Calculate time until subscription renewal/expiry
 */
export function getSubscriptionTimeRemaining(
  endDate: Date | undefined
): { days: number; hours: number; isExpiringSoon: boolean; message: string } {
  if (!endDate) {
    return { days: 0, hours: 0, isExpiringSoon: false, message: 'No expiry date' };
  }

  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, isExpiringSoon: true, message: 'Subscription has expired' };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isExpiringSoon = days < 7;

  let message = '';
  if (days > 0) {
    message = `${days} day${days !== 1 ? 's' : ''} remaining`;
  } else {
    message = `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  }

  return { days, hours, isExpiringSoon, message };
}

/**
 * Check Journey CV limit (1 Active for Free, 50/month for Pro Monthly)
 */
export async function checkJourneyCVLimit(
  userId: string,
  planKey: string,
  subscription?: any
): Promise<{
  allowed: boolean;
  currentActiveCount: number;
  limit: number;
  message?: string;
  upgradeRequired?: boolean;
  canDeleteToMakeSpace?: boolean;
}> {
  const limits = getPlanLimits(planKey);

  // Day Pass: Check if within 24h window
  if (planKey === 'day_pass' && subscription?.accessExpiresAt) {
    const expiresAt = new Date(subscription.accessExpiresAt);
    if (new Date() <= expiresAt) {
      return { allowed: true, currentActiveCount: -1, limit: -1 };
    }
    // Expired day pass reverts to free limits
    return checkJourneyCVLimit(userId, 'free');
  }

  // Unlimited plans
  if (limits.activeJourneyCVs === -1) {
    return { allowed: true, currentActiveCount: -1, limit: -1 };
  }

  // Count active (non-frozen) Journey CVs
  const CV = (await import('@/models/CV')).default;
  const currentActiveCount = await CV.countDocuments({
    userId,
    cvType: 'journey',
    'metadata.isFrozen': { $ne: true }  // Exclude frozen CVs
  });

  // For Pro Monthly: Check monthly limit (50)
  if (planKey === 'pro_monthly' && limits.activeJourneyCVs > 0) {
    // Count CVs created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await CV.countDocuments({
      userId,
      cvType: 'journey',
      createdAt: { $gte: startOfMonth },
      'metadata.isFrozen': { $ne: true }
    });

    const remaining = Math.max(0, limits.activeJourneyCVs - monthlyCount);

    return {
      allowed: remaining > 0,
      currentActiveCount: monthlyCount,
      limit: limits.activeJourneyCVs,
      message: remaining === 0
        ? 'You have reached your monthly limit (50 Journey CVs). Archive old applications to create new ones, or upgrade to Yearly for unlimited.'
        : undefined,
      upgradeRequired: remaining === 0
    };
  }

  // Free tier: 1 Active Journey CV
  const remaining = Math.max(0, limits.activeJourneyCVs - currentActiveCount);

  return {
    allowed: remaining > 0,
    currentActiveCount,
    limit: limits.activeJourneyCVs,
    message: remaining === 0
      ? 'You have 1 active Journey CV. Archive or delete it to create a new one, or Upgrade to Pro.'
      : undefined,
    upgradeRequired: remaining === 0,
    canDeleteToMakeSpace: currentActiveCount > 0
  };
}

/**
 * Check Job Tracker limit (3 active jobs for Free, unlimited for paid plans)
 */
export async function checkJobLimit(
  userId: string,
  planKey: string,
  subscription?: any
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  message?: string;
  upgradeRequired?: boolean;
}> {
  // Determine the effective limit
  let limit = 3; // Default fallback (Free)

  if (planKey === 'day_pass') {
    // Check for day pass expiry
    if (subscription?.accessExpiresAt) {
      const expiresAt = new Date(subscription.accessExpiresAt);
      if (new Date() <= expiresAt) {
        // Active day pass
        limit = PLAN_LIMITS.day_pass.maxJobs;
        console.log(`✅ Job Limit Check - Active Day Pass: Limit is ${limit}`);
      } else {
        // Expired day pass reverts to free limits
        limit = PLAN_LIMITS.free.maxJobs;
        console.log(`⚠️ Job Limit Check - Expired Day Pass, reverting to free limit: ${limit}`);
      }
    } else {
      // Fallback for invalid day pass subscription
      limit = PLAN_LIMITS.free.maxJobs;
    }
  } else {
    // Standard plans (Free, Pro Monthly/Quarterly/Yearly)
    const planLimits = getPlanLimits(planKey);
    limit = planLimits.maxJobs;
  }

  // If unlimited (-1), early return
  if (limit === -1) {
    console.log(`✅ Job Limit Check - Plan (${planKey}): Unlimited jobs allowed`);
    return { allowed: true, currentCount: -1, limit: -1 };
  }

  // Count ACTIVE (non-archived) jobs
  const JobApplication = (await import('@/models/JobApplication')).default;
  const activeJobCount = await JobApplication.countDocuments({
    userId,
    $or: [
      { isArchived: { $exists: false } }, // Old jobs without isArchived field
      { isArchived: false }
    ]
  });

  const remaining = Math.max(0, limit - activeJobCount);

  console.log(`🔍 Job Limit Check - User (${planKey}): ${activeJobCount}/${limit} active jobs`);

  return {
    allowed: remaining > 0,
    currentCount: activeJobCount,
    limit: limit,
    message: remaining === 0
      ? `You have searched ${activeJobCount}/${limit} active jobs. Archive a job or upgrade to Pro for unlimited applications.`
      : undefined,
    upgradeRequired: remaining === 0
  };
}

