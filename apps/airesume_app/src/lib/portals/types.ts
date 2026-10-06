import {
  PortalProvider,
  PortalConnectionStatus,
  PortalAuthMethod,
  IPortalConnection,
} from '@/models/PortalConnection';

export interface PortalCapabilities {
  jobDiscovery: boolean;
  jobDetails: boolean;
  jobSave: boolean;
  application: boolean;
  applicationStatus: boolean;
  messaging: boolean;
}

export interface NormalizedPortalJob {
  externalId: string;
  provider: PortalProvider;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  jobUrl: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  remote?: boolean;
  atsType?: string;
  postedDate?: Date;
  metadata?: Record<string, any>;
}

export interface PortalConnectionStartResult {
  connectionAttemptId: string;
  provider: PortalProvider;
  authMethod: PortalAuthMethod;
  redirectUrl?: string;
  instructions?: string;
  expiresAt: Date;
  state?: string;
}

export interface PortalConnectionCompleteRequest {
  connectionAttemptId: string;
  provider: PortalProvider;
  authCode?: string;
  state?: string;
  sessionPayload?: any;
  accountEmail?: string;
  displayName?: string;
  preferences?: {
    targetTitles?: string[];
    targetLocations?: string[];
    minSalary?: number;
    experienceYears?: number;
    remoteOnly?: boolean;
    dailyLimit?: number;
  };
}

export interface PortalConnectionValidationResult {
  valid: boolean;
  status: PortalConnectionStatus;
  health: 'healthy' | 'degraded' | 'expired' | 'disconnected' | 'reauth_required';
  account?: {
    email?: string;
    displayName?: string;
    portalUserId?: string;
  };
  errorCode?: string;
  errorMessage?: string;
  requiresUserAction?: boolean;
}

export interface PortalSyncOptions {
  trigger: 'manual' | 'scheduled' | 'onboarding' | 'background' | 'reconnect';
  limit?: number;
  page?: number;
  searchCriteria?: {
    keywords?: string[];
    locations?: string[];
    experienceYears?: number;
  };
}

export interface PortalSyncResult {
  success: boolean;
  jobsFetched: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsDeduplicated: number;
  /**
   * True when the portal has no implemented job source, so `0 jobs` is the
   * expected result rather than a failure.
   *
   * This exists because the three consumer portals (Naukri/Indeed/LinkedIn) are
   * session-captured account connections, not API feeds. Their adapters returned
   * hard-coded sample roles and the sync wrote them into the shared `jobs`
   * collection, so "0 jobs" never happened and the UI could report a fabricated
   * discovery count. Now it can say, truthfully, that nothing is wired up yet —
   * and a caller can distinguish that from a genuine sync failure.
   */
  sourceUnavailable?: boolean;
  /** Safe, user-presentable explanation. Never contains internal detail. */
  note?: string;
  error?: {
    code: string;
    message: string;
    safeUserMessage: string;
    retryable: boolean;
    requiresUserAction: boolean;
  };
}

export interface PortalAdapter {
  readonly provider: PortalProvider;
  readonly defaultAuthMethod: PortalAuthMethod;

  getCapabilities(): PortalCapabilities;

  startConnection(
    userId: string,
    options?: { redirectUri?: string; state?: string }
  ): Promise<PortalConnectionStartResult>;

  completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: PortalConnectionValidationResult;
  }>;

  validateConnection(
    connection: IPortalConnection
  ): Promise<PortalConnectionValidationResult>;

  fetchJobs(
    connection: IPortalConnection,
    options?: PortalSyncOptions
  ): Promise<{
    jobs: NormalizedPortalJob[];
    cursor?: string;
    hasMore?: boolean;
  }>;

  disconnect(connection: IPortalConnection): Promise<boolean>;
}
