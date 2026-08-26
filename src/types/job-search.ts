import { ObjectId } from 'mongodb';

/**
 * JobSearchProfile — Canonical domain model for job-search preferences.
 * This is the single source of truth for all job-search related preferences.
 * 
 * Owner: User (1:1 relationship)
 * Consumers: Discover, Matching, Recommendations, Alerts, Auto-Apply
 */
export interface IJobSearchProfile {
  _id: ObjectId;
  userId: ObjectId;
  
  // Target roles and titles
  targetRoles: string[];
  
  // Location preferences
  locations: string[];
  workplaceTypes: ('remote' | 'hybrid' | 'onsite')[];
  remoteOnly: boolean;
  
  // Salary preferences
  minSalary: number;
  salaryCurrency: string;
  
  // Experience and availability
  experienceYears: number;
  maxNoticePeriodDays: number;
  
  // Search behavior
  searchIntensity: 'browsing' | 'exploring' | 'active' | 'aggressive';
  expectedApplicationsPerMonth: number;
  applicationMode: 'find_only' | 'manual_review' | 'automatic';
  
  // Auto-apply specific (consumed BY auto-apply, not owned)
  autoApply: {
    enabled: boolean;
    maxPerDay: number;
    useTailoredCV: boolean;
    useCoverLetter: boolean;
    autoAnswerQuestions: boolean;
    enabledPortals: ('naukri' | 'indeed' | 'greenhouse' | 'adzuna' | 'lever' | 'ashby' | 'workable')[];
  };
  
  // Versioning for cache invalidation
  profileVersion: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AutoApplyConfiguration — Separate domain for auto-apply execution settings.
 * This consumes JobSearchProfile but does NOT own general preferences.
 * 
 * Owner: User (1:1 relationship)
 * Consumer: Auto-Apply Processor
 */
export interface IAutoApplyConfiguration {
  _id: ObjectId;
  userId: ObjectId;
  
  // Reference to canonical profile (read-only)
  jobSearchProfileId: ObjectId;
  
  // Auto-apply specific settings
  enabled: boolean;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: string[];
  
  // Portal-specific overrides (NOT general preferences)
  portalOverrides: {
    naukri?: { enabled: boolean; dailyLimit: number };
    indeed?: { enabled: boolean; dailyLimit: number };
  };
  
  // Version tracking
  profileVersion: number;
  lastSyncedAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application — Unified application model (merged from Application + JobApplication).
 * Single source of truth for application state across manual and auto-apply flows.
 * 
 * Owner: User (many:1 relationship)
 * History: ApplicationEvent (1:many relationship)
 */
export interface IApplication {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  
  // Current state
  currentStage: 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';
  internalStatus: string;
  applicationMethod: 'manual' | 'auto';
  
  // References
  cvId?: ObjectId;
  coverLetterId?: ObjectId;
  
  // Automation
  automationEnabled: boolean;
  automationRunId?: string;
  attempts: number;
  
  // Intelligence
  matchScore?: number;
  trustScore?: number;
  skillGapAnalysis?: any;
  
  // Tracker UI fields
  jobTitle: string;
  company: string;
  location?: string;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
  status: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ApplicationEvent — Immutable history of application state changes.
 * Each event represents a single state transition or metadata update.
 * 
 * Owner: Application (many:1 relationship)
 */
export interface IApplicationEvent {
  _id: ObjectId;
  applicationId: ObjectId;
  userId: ObjectId;
  
  type: 'stage_change' | 'status_update' | 'note_added' | 'tag_updated';
  previousStage?: string;
  newStage?: string;
  source: 'user' | 'automation' | 'email_intelligence' | 'admin';
  
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * JobSearchProfile Service Interface
 */
export interface IJobSearchProfileService {
  getProfile(userId: string): Promise<IJobSearchProfile | null>;
  getOrCreateProfile(userId: string): Promise<IJobSearchProfile>;
  updateProfile(userId: string, updates: Partial<IJobSearchProfile>): Promise<IJobSearchProfile>;
  incrementVersion(userId: string): Promise<number>;
  deleteProfile(userId: string): Promise<void>;
  
  // Migration helpers
  migrateFromAutoApplyPreferences(userId: string): Promise<IJobSearchProfile>;
  migrateFromJobPreferences(userId: string): Promise<IJobSearchProfile>;
  migrateFromPortalPreferences(userId: string): Promise<IJobSearchProfile>;
}

/**
 * AutoApplyConfiguration Service Interface
 */
export interface IAutoApplyConfigurationService {
  getConfig(userId: string): Promise<IAutoApplyConfiguration | null>;
  getOrCreateConfig(userId: string): Promise<IAutoApplyConfiguration>;
  updateConfig(userId: string, updates: Partial<IAutoApplyConfiguration>): Promise<IAutoApplyConfiguration>;
  syncWithProfile(userId: string): Promise<IAutoApplyConfiguration>;
  deleteConfig(userId: string): Promise<void>;
}

/**
 * Application Service Interface
 */
export interface IApplicationService {
  getApplication(userId: string, jobId: string): Promise<IApplication | null>;
  getApplications(userId: string, filters?: any): Promise<IApplication[]>;
  createApplication(userId: string, jobId: string, data: Partial<IApplication>): Promise<IApplication>;
  updateStage(userId: string, jobId: string, newStage: string, source: string): Promise<IApplication>;
  addNote(userId: string, jobId: string, note: string): Promise<IApplicationEvent>;
  addTag(userId: string, jobId: string, tag: string): Promise<IApplicationEvent>;
  
  // Migration helpers
  migrateFromJobApplication(jobApplicationId: string): Promise<IApplication>;
  mergeDuplicateApplications(userId: string): Promise<number>;
}

/**
 * Cache Invalidation Service Interface
 */
export interface ICacheInvalidationService {
  onProfileChange(userId: string, newVersion: number): Promise<void>;
  onCVChange(userId: string): Promise<void>;
  onApplicationChange(userId: string, jobId: string): Promise<void>;
  invalidateAll(userId: string): Promise<void>;
}
