/**
 * Quota Service - Rate limiting for job applications
 * 
 * Implements:
 * - 50 applications per hour per user
 * - 100 applications per day per user
 * - Plan-based quotas (free/pro/power)
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';

// Plan-based quota definitions
export const PLAN_QUOTAS = {
  free: {
    jobsFetchedMonthly: 50,
    applicationsPerDay: 10,
    applicationsPerHour: 5,
    tailoredCVsMonthly: 5,
    coverLettersMonthly: 3,
  },
  pro: {
    jobsFetchedMonthly: -1, // Unlimited
    applicationsPerDay: 50,
    applicationsPerHour: 20,
    tailoredCVsMonthly: -1,
    coverLettersMonthly: -1,
  },
  power: {
    jobsFetchedMonthly: -1,
    applicationsPerDay: 100,
    applicationsPerHour: 50,
    tailoredCVsMonthly: -1,
    coverLettersMonthly: -1,
  },
};

export type PlanType = keyof typeof PLAN_QUOTAS;
export type QuotaType = 'applications' | 'jobsFetched' | 'tailoredCVs' | 'coverLetters';

export interface QuotaStatus {
  allowed: boolean;
  remainingHourly: number;
  remainingDaily: number;
  remainingMonthly: number;
  usedHourly: number;
  usedDaily: number;
  usedMonthly: number;
  resetTimeHourly: Date;
  resetTimeDaily: Date;
  resetTimeMonthly?: Date;
  reason?: string;
}

export interface IApplicationQuota extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  // Hourly tracking
  hourlyApplications: {
    count: number;
    windowStart: Date;
  };
  // Daily tracking
  dailyApplications: {
    count: number;
    windowStart: Date;
  };
  // Monthly tracking
  monthlyJobsFetched: {
    count: number;
    windowStart: Date;
  };
  monthlyTailoredCVs: {
    count: number;
    windowStart: Date;
  };
  monthlyCoverLetters: {
    count: number;
    windowStart: Date;
  };
  lastApplicationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationQuotaSchema = new mongoose.Schema<IApplicationQuota>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  hourlyApplications: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  dailyApplications: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  monthlyJobsFetched: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  monthlyTailoredCVs: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  monthlyCoverLetters: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  lastApplicationAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for efficient quota window queries
ApplicationQuotaSchema.index({ userId: 1, 'hourlyApplications.windowStart': 1 });
ApplicationQuotaSchema.index({ userId: 1, 'dailyApplications.windowStart': 1 });

let ApplicationQuotaModel: mongoose.Model<IApplicationQuota>;

async function getQuotaModel() {
  if (!ApplicationQuotaModel) {
    await getConnection();
    ApplicationQuotaModel = mongoose.models.ApplicationQuota || 
      mongoose.model<IApplicationQuota>('ApplicationQuota', ApplicationQuotaSchema);
  }
  return ApplicationQuotaModel;
}

export class QuotaService {
  private static readonly HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private static readonly DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MONTHLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Check if user can apply for a job based on quota limits
   */
  static async checkApplicationQuota(userId: string, planType: string = 'free'): Promise<QuotaStatus> {
    const model = await getQuotaModel();
    const normalizedPlan = this.normalizePlanType(planType);
    const quotas = PLAN_QUOTAS[normalizedPlan];
    
    let quota = await model.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    // Get current usage
    const hourlyCount = quota ? this.getCurrentWindowCount(quota.hourlyApplications, this.HOURLY_WINDOW_MS) : 0;
    const dailyCount = quota ? this.getCurrentWindowCount(quota.dailyApplications, this.DAILY_WINDOW_MS) : 0;
    
    const hourlyLimit = quotas.applicationsPerHour;
    const dailyLimit = quotas.applicationsPerDay;
    
    const allowed = hourlyCount < hourlyLimit && dailyCount < dailyLimit;
    
    return {
      allowed,
      remainingHourly: Math.max(0, hourlyLimit - hourlyCount),
      remainingDaily: Math.max(0, dailyLimit - dailyCount),
      remainingMonthly: -1, // Not checked for applications
      usedHourly: hourlyCount,
      usedDaily: dailyCount,
      usedMonthly: 0,
      resetTimeHourly: quota 
        ? new Date(quota.hourlyApplications.windowStart.getTime() + this.HOURLY_WINDOW_MS)
        : new Date(Date.now() + this.HOURLY_WINDOW_MS),
      resetTimeDaily: quota
        ? new Date(quota.dailyApplications.windowStart.getTime() + this.DAILY_WINDOW_MS)
        : new Date(Date.now() + this.DAILY_WINDOW_MS),
      reason: !allowed 
        ? hourlyCount >= hourlyLimit 
          ? 'Hourly limit exceeded' 
          : 'Daily limit exceeded'
        : undefined,
    };
  }

  /**
   * Check if user can fetch more jobs (monthly limit)
   */
  static async checkJobsFetchQuota(userId: string, planType: string = 'free'): Promise<QuotaStatus> {
    const model = await getQuotaModel();
    const normalizedPlan = this.normalizePlanType(planType);
    const quotas = PLAN_QUOTAS[normalizedPlan];
    
    let quota = await model.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    const monthlyCount = quota ? this.getCurrentWindowCount(quota.monthlyJobsFetched, this.MONTHLY_WINDOW_MS) : 0;
    const monthlyLimit = quotas.jobsFetchedMonthly;
    
    const allowed = monthlyLimit === -1 || monthlyCount < monthlyLimit;
    
    return {
      allowed,
      remainingHourly: -1,
      remainingDaily: -1,
      remainingMonthly: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - monthlyCount),
      usedHourly: 0,
      usedDaily: 0,
      usedMonthly: monthlyCount,
      resetTimeHourly: new Date(),
      resetTimeDaily: new Date(),
      resetTimeMonthly: quota
        ? new Date(quota.monthlyJobsFetched.windowStart.getTime() + this.MONTHLY_WINDOW_MS)
        : new Date(Date.now() + this.MONTHLY_WINDOW_MS),
      reason: !allowed ? 'Monthly jobs fetch limit exceeded' : undefined,
    };
  }

  /**
   * Increment application count for user
   */
  static async incrementApplication(userId: string): Promise<void> {
    const model = await getQuotaModel();
    const now = new Date();
    const userObjId = new mongoose.Types.ObjectId(userId);
    
    let quota = await model.findOne({ userId: userObjId });
    
    if (!quota) {
      // Create new quota document
      await model.create({
        userId: userObjId,
        hourlyApplications: { count: 1, windowStart: now },
        dailyApplications: { count: 1, windowStart: now },
        monthlyJobsFetched: { count: 0, windowStart: now },
        monthlyTailoredCVs: { count: 0, windowStart: now },
        monthlyCoverLetters: { count: 0, windowStart: now },
        lastApplicationAt: now,
      });
      return;
    }
    
    // Check and reset hourly window
    if (this.isWindowExpired(quota.hourlyApplications.windowStart, this.HOURLY_WINDOW_MS)) {
      quota.hourlyApplications = { count: 1, windowStart: now };
    } else {
      quota.hourlyApplications.count += 1;
    }
    
    // Check and reset daily window
    if (this.isWindowExpired(quota.dailyApplications.windowStart, this.DAILY_WINDOW_MS)) {
      quota.dailyApplications = { count: 1, windowStart: now };
    } else {
      quota.dailyApplications.count += 1;
    }
    
    quota.lastApplicationAt = now;
    await quota.save();
  }

  /**
   * Increment jobs fetched count
   */
  static async incrementJobsFetched(userId: string): Promise<void> {
    const model = await getQuotaModel();
    const now = new Date();
    const userObjId = new mongoose.Types.ObjectId(userId);
    
    let quota = await model.findOne({ userId: userObjId });
    
    if (!quota) {
      await model.create({
        userId: userObjId,
        hourlyApplications: { count: 0, windowStart: now },
        dailyApplications: { count: 0, windowStart: now },
        monthlyJobsFetched: { count: 1, windowStart: now },
        monthlyTailoredCVs: { count: 0, windowStart: now },
        monthlyCoverLetters: { count: 0, windowStart: now },
      });
      return;
    }
    
    // Check and reset monthly window
    if (this.isWindowExpired(quota.monthlyJobsFetched.windowStart, this.MONTHLY_WINDOW_MS)) {
      quota.monthlyJobsFetched = { count: 1, windowStart: now };
    } else {
      quota.monthlyJobsFetched.count += 1;
    }
    
    await quota.save();
  }

  /**
   * Get current quota status for UI display
   */
  static async getQuotaDisplay(userId: string, planType: string = 'free'): Promise<{
    hourly: { used: number; limit: number; remaining: number };
    daily: { used: number; limit: number; remaining: number };
    monthly: { used: number; limit: number; remaining: number };
  }> {
    const normalizedPlan = this.normalizePlanType(planType);
    const quotas = PLAN_QUOTAS[normalizedPlan];
    const model = await getQuotaModel();
    
    let quota = await model.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    const hourlyCount = quota ? this.getCurrentWindowCount(quota.hourlyApplications, this.HOURLY_WINDOW_MS) : 0;
    const dailyCount = quota ? this.getCurrentWindowCount(quota.dailyApplications, this.DAILY_WINDOW_MS) : 0;
    const monthlyJobsCount = quota ? this.getCurrentWindowCount(quota.monthlyJobsFetched, this.MONTHLY_WINDOW_MS) : 0;
    
    return {
      hourly: {
        used: hourlyCount,
        limit: quotas.applicationsPerHour,
        remaining: Math.max(0, quotas.applicationsPerHour - hourlyCount),
      },
      daily: {
        used: dailyCount,
        limit: quotas.applicationsPerDay,
        remaining: Math.max(0, quotas.applicationsPerDay - dailyCount),
      },
      monthly: {
        used: monthlyJobsCount,
        limit: quotas.jobsFetchedMonthly,
        remaining: quotas.jobsFetchedMonthly === -1 
          ? -1 
          : Math.max(0, quotas.jobsFetchedMonthly - monthlyJobsCount),
      },
    };
  }

  private static normalizePlanType(planType: string): PlanType {
    if (!planType) return 'free';
    if (planType === 'power') return 'power';
    if (planType.startsWith('pro_') || planType === 'focused_monthly') {
      return 'pro';
    }
    return 'free';
  }

  /**
   * Helper: Get current count considering window expiry
   */
  private static getCurrentWindowCount(
    windowData: { count: number; windowStart: Date },
    windowMs: number
  ): number {
    if (!windowData) return 0;
    
    if (this.isWindowExpired(windowData.windowStart, windowMs)) {
      return 0;
    }
    
    return windowData.count;
  }

  /**
   * Helper: Check if window has expired
   */
  private static isWindowExpired(windowStart: Date, windowMs: number): boolean {
    const now = Date.now();
    const windowEnd = new Date(windowStart).getTime() + windowMs;
    return now >= windowEnd;
  }
}

export default QuotaService;
