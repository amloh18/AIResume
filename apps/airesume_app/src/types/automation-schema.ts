import { ObjectId } from 'mongodb';

/**
 * Automation tier types — aligned with billing plan keys.
 * Maps: free → free, starter → starter_*, focused → focused_*
 */
export type UserTier = 'free' | 'starter' | 'focused';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type JobSource = 'google_talent' | 'serpapi' | 'apify' | 'discovery' | 'naukri' | 'linkedin' | 'indeed' | 'adzuna' | 'lever' | 'ashby' | 'workable';
export type ATSType = 'greenhouse' | 'lever' | 'workable' | 'naukri' | 'indeed' | 'adzuna' | 'ashby' | 'workday' | 'unknown';
export type AutomationMode = 'assisted' | 'auto';
export type ApplicationStatus =
  | 'saved'
  | 'created'
  | 'queued'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'interview'
  | 'offer'
  | 'rejected';

export type ApplicationStep =
  | 'queued'
  | 'tailoring_cv'
  | 'uploading_resume'
  | 'answering_questionnaire'
  | 'submitting'
  | 'completed'
  | 'action_required'
  | 'failed';

export interface User {
  _id: ObjectId;
  email: string;
  name: string;
  tier: UserTier;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface JobPreferences {
  _id: ObjectId;
  userId: ObjectId;
  titles: string[];
  locations: string[];
  country: 'UK';
  remoteOnly: boolean;
  salaryMin?: number;
  updatedAt: Date;
}

export interface Job {
  _id: ObjectId;
  title: string;
  company: string;
  description: string;
  location: string;
  country: string;
  remote: boolean;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  applyUrl: string;
  source: JobSource;
  atsType: ATSType;
  keywords: string[];
  createdAt: Date;
  postedDate?: Date;
}

export interface MatchBreakdown {
  skills: number;
  title: number;
  location: number;
  recency: number;
}

export interface JobMatch {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  score: number;
  breakdown: MatchBreakdown;
  eligibleForAutoApply: boolean;
  createdAt: Date;
}

export interface Application {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  resumeVersionId?: ObjectId;
  coverLetterVersionId?: ObjectId;
  status: ApplicationStatus;
  mode: AutomationMode;
  failureReason?: string;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeVersion {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  content: string;
  keywordsUsed: string[];
  createdAt: Date;
}

export interface CoverLetterVersion {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  content: string;
  createdAt: Date;
}

export interface ApplyWindow {
  from: string;
  to: string;
}

export interface AutomationSettings {
  _id: ObjectId;
  userId: ObjectId;
  enabled: boolean;
  mode: AutomationMode;
  dailyLimit: number;
  applyWindow?: ApplyWindow;
  blockedCompanies: string[];
  updatedAt: Date;
}

export interface AdminRules {
  _id: ObjectId;
  globalAutoApplyEnabled: boolean;
  defaultMode: AutomationMode;
  maxAppliesPerUserPerDay: number;
  failureCooldownHours: number;
  allowedATS: ATSType[];
  monthlyCostCap: number;
  updatedAt: Date;
}

export type APIProvider = 'serpapi' | 'google_talent' | 'apify' | 'llm';

export interface APIUsage {
  _id: ObjectId;
  provider: APIProvider;
  month: string;
  used: number;
  limit: number;
  cost: number;
}

export interface AuditLog {
  _id: ObjectId;
  actor: ObjectId;
  action: string;
  target?: ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface JobListing {
  _id: string;
  id?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  matchScore: number;
  matchBreakdown?: MatchBreakdown;
  source: JobSource;
  atsType: ATSType;
  applyUrl: string;
  postedDate?: Date;
  appliedStatus?: ApplicationStatus;
  userId: string;
  country?: string;
  description?: string;
  keywords?: string[];
  experienceYears?: number;
}

export interface MatchDistribution {
  excellent: number;
  good: number;
  moderate: number;
  fair: number;
  low: number;
}

export interface SalaryStats {
  min: number;
  max: number;
  average: number;
  median: number;
}

export interface TopCompany {
  company: string;
  count: number;
  avgMatch: number;
}

export interface TopLocation {
  location: string;
  count: number;
}

export interface TrendDataPoint {
  date: string;
  applications: number;
  matches: number;
}

export interface JobsMetrics {
  totalJobsMatched: number;
  averageMatchScore: number;
  applicationSuccessRate: number;
  pendingApplications: number;
  appliedThisWeek: number;
  appliedLastWeek?: number;
  companiesCount: number;
  locationsCount: number;
  sourceDistribution: Record<string, number>;
  salaryStats: SalaryStats;
  matchDistribution: MatchDistribution;
  topCompanies: TopCompany[];
  topLocations: TopLocation[];
  trendData: TrendDataPoint[];
}

export interface JobsFilter {
  searchText?: string;
  matchScoreMin?: number;
  matchScoreMax?: number;
  companies?: string[];
  locations?: string[];
  sources?: JobSource[];
  salaryMin?: number;
  salaryMax?: number;
  atsTypes?: ATSType[];
  appliedStatus?: ApplicationStatus[];
  remoteOnly?: boolean;
  sortBy?: 'matchScore' | 'postedDate' | 'salary' | 'company';
  sortOrder?: 'asc' | 'desc';
  datePosted?: 'all' | '24h' | '7d' | '30d';
  workplaceType?: string[];
  experienceLevel?: string[];
  sponsorsVisa?: boolean;
  roles?: string[];
  jobTypes?: string[];
  savedOnly?: boolean;
  easyApplyOnly?: boolean;
  unpersonalized?: boolean;
}

export interface PaginatedJobsResponse {
  jobs: JobListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface JobSourceConfig {
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  maxJobsPerRun: number;
  monthlyCap: number;
  currentMonthUsage: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface AutoApplyRequest {
  jobId: string;
}

export interface AutoApplyResponse {
  applicationId: string;
  status: ApplicationStatus;
  queuePosition?: number;
}

export interface AdminMetrics {
  activeAutomationUsers: number;
  jobsFetchedToday: number;
  jobsFetchedMonth: number;
  autoAppliesToday: number;
  autoAppliesMonth: number;
  failuresToday: number;
  monthlyAPISpend: number;
  monthlyBudget: number;
  costProjection: number;
}

export interface KillSwitchAction {
  action: 'disable_auto_apply' | 'disable_fetching' | 'lock_new_users';
}

/**
 * Automation tier limits — aligned with billing plan keys.
 * free = no auto-apply
 * starter = 10/day, 10/month
 * focused = 50/day, unlimited monthly
 *
 * @deprecated This file's TIER_LIMITS is FROZEN. Do not add new tier logic here.
 * Use the new entitlement engine instead:
 *   import { getDefaultLimit, TIER_LIMITS } from '@/lib/entitlements';
 */
export const TIER_LIMITS: Record<UserTier, { dailyApplyCap: number; jobsFetchedPerMonth: number; autoModeAllowed: boolean }> = {
  free: {
    dailyApplyCap: 0,
    jobsFetchedPerMonth: 0,
    autoModeAllowed: false,
  },
  starter: {
    dailyApplyCap: 10,
    jobsFetchedPerMonth: 500,
    autoModeAllowed: false,
  },
  focused: {
    dailyApplyCap: 50,
    jobsFetchedPerMonth: -1,
    autoModeAllowed: true,
  },
};

export const MATCH_SCORE_THRESHOLDS = {
  DISPLAY_MIN: 20,
  AUTO_APPLY_MIN: 70,
  EXCELLENT: 80,
  GOOD: 60,
  MODERATE: 40,
  FAIR: 20,
} as const;

export const MATCH_SCORE_WEIGHTS = {
  SKILLS: 0.4,
  TITLE: 0.3,
  LOCATION: 0.2,
  RECENCY: 0.1,
} as const;

export const DEFAULT_ADMIN_RULES: Omit<AdminRules, '_id' | 'updatedAt'> = {
  globalAutoApplyEnabled: true,
  defaultMode: 'assisted',
  maxAppliesPerUserPerDay: 20,
  failureCooldownHours: 24,
  allowedATS: ['greenhouse', 'lever', 'workable'],
  monthlyCostCap: 5000,
};

export const COST_PER_APPLICATION = {
  LLM_RESUME: 0.10,
  LLM_COVER_LETTER: 0.05,
  PLAYWRIGHT_WORKER: 0.10,
  JOB_FETCH_AMORTIZED: 0.05,
  TOTAL: 0.30,
} as const;

export interface NaukriIntegrationSettings {
  enabled: boolean;
  connectedAt?: string | Date;
  lastSyncedAt?: string | Date;
  sessionStatus: 'active' | 'expired' | 'disconnected';
  userEmail?: string;
  preferences: {
    targetTitles: string[];
    targetLocations: string[];
    minCtcLakhs?: number;
    experienceYears?: number;
    maxNoticePeriodDays?: number;
    dailyLimit: number;
    autoApplyEnabled: boolean;
  };
  stats: {
    totalFetched: number;
    totalApplied: number;
    lastAppliedAt?: string | Date;
  };
}

export interface IndeedIntegrationSettings {
  enabled: boolean;
  connectedAt?: string | Date;
  lastSyncedAt?: string | Date;
  sessionStatus: 'active' | 'expired' | 'disconnected';
  userEmail?: string;
  preferences: {
    targetTitles: string[];
    targetLocations: string[];
    minSalary?: number;
    salaryCurrency?: string;
    remoteOnly: boolean;
    dailyLimit: number;
    autoApplyEnabled: boolean;
  };
  stats: {
    totalFetched: number;
    totalApplied: number;
    lastAppliedAt?: string | Date;
  };
}

