/**
 * Success Learning
 *
 * Track the complete application lifecycle:
 * Job → Match → Resume version → Application → Response → Screening → Interview → Offer
 *
 * Record timestamps and calculate success rates by various dimensions.
 */

export type ApplicationOutcome =
  | 'submitted'
  | 'response_received'
  | 'screening_passed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_received'
  | 'offer_accepted'
  | 'rejected'
  | 'no_response'
  | 'withdrawn';

export interface ApplicationRecord {
  id: string;
  jobId: string;
  userId: string;
  outcome: ApplicationOutcome;
  outcomeAt: Date;
  metadata: {
    jobSource: string;
    jobRole: string;
    jobCompany: string;
    jobIndustry?: string;
    matchScore: number;
    freshnessScore: number;
    resumeVersion: string;
    applicationMode: 'auto' | 'review' | 'manual';
    atsType?: string;
    responseTimeHours?: number;
  };
  timestamps: {
    appliedAt: Date;
    responseAt?: Date;
    screeningAt?: Date;
    interviewAt?: Date;
    offerAt?: Date;
    rejectedAt?: Date;
  };
}

export interface SuccessMetrics {
  totalApplications: number;
  responseRate: number;
  screeningRate: number;
  interviewRate: number;
  offerRate: number;
  acceptanceRate: number;
  averageResponseTimeHours: number;
}

export interface SuccessMetricsByDimension {
  dimension: string;
  value: string;
  metrics: SuccessMetrics;
}

/**
 * Calculate success rates from application records
 */
export function calculateSuccessRates(records: ApplicationRecord[]): SuccessMetrics {
  const total = records.length;
  if (total === 0) {
    return {
      totalApplications: 0,
      responseRate: 0,
      screeningRate: 0,
      interviewRate: 0,
      offerRate: 0,
      acceptanceRate: 0,
      averageResponseTimeHours: 0,
    };
  }

  const responded = records.filter((r) =>
    ['response_received', 'screening_passed', 'interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted'].includes(r.outcome)
  ).length;

  const screened = records.filter((r) =>
    ['screening_passed', 'interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted'].includes(r.outcome)
  ).length;

  const interviewed = records.filter((r) =>
    ['interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted'].includes(r.outcome)
  ).length;

  const offered = records.filter((r) =>
    ['offer_received', 'offer_accepted'].includes(r.outcome)
  ).length;

  const accepted = records.filter((r) => r.outcome === 'offer_accepted').length;

  const responseTimes = records
    .filter((r) => r.metadata.responseTimeHours !== undefined)
    .map((r) => r.metadata.responseTimeHours!);

  const averageResponseTimeHours =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  return {
    totalApplications: total,
    responseRate: Math.round((responded / total) * 100),
    screeningRate: Math.round((screened / total) * 100),
    interviewRate: Math.round((interviewed / total) * 100),
    offerRate: Math.round((offered / total) * 100),
    acceptanceRate: Math.round((accepted / total) * 100),
    averageResponseTimeHours: Math.round(averageResponseTimeHours * 10) / 10,
  };
}

/**
 * Calculate success rates by job source
 */
export function calculateSuccessRatesBySource(
  records: ApplicationRecord[]
): SuccessMetricsByDimension[] {
  const sourceGroups = new Map<string, ApplicationRecord[]>();

  for (const record of records) {
    const source = record.metadata.jobSource;
    if (!sourceGroups.has(source)) {
      sourceGroups.set(source, []);
    }
    sourceGroups.get(source)!.push(record);
  }

  return Array.from(sourceGroups.entries()).map(([source, sourceRecords]) => ({
    dimension: 'jobSource',
    value: source,
    metrics: calculateSuccessRates(sourceRecords),
  }));
}

/**
 * Calculate success rates by role
 */
export function calculateSuccessRatesByRole(
  records: ApplicationRecord[]
): SuccessMetricsByDimension[] {
  const roleGroups = new Map<string, ApplicationRecord[]>();

  for (const record of records) {
    const role = record.metadata.jobRole;
    if (!roleGroups.has(role)) {
      roleGroups.set(role, []);
    }
    roleGroups.get(role)!.push(record);
  }

  return Array.from(roleGroups.entries()).map(([role, roleRecords]) => ({
    dimension: 'jobRole',
    value: role,
    metrics: calculateSuccessRates(roleRecords),
  }));
}

/**
 * Calculate success rates by match score
 */
export function calculateSuccessRatesByMatchScore(
  records: ApplicationRecord[]
): SuccessMetricsByDimension[] {
  const buckets = [
    { label: '90-100', min: 90, max: 100 },
    { label: '80-89', min: 80, max: 89 },
    { label: '70-79', min: 70, max: 79 },
    { label: '60-69', min: 60, max: 69 },
    { label: '<60', min: 0, max: 59 },
  ];

  return buckets.map((bucket) => {
    const bucketRecords = records.filter(
      (r) => r.metadata.matchScore >= bucket.min && r.metadata.matchScore <= bucket.max
    );
    return {
      dimension: 'matchScore',
      value: bucket.label,
      metrics: calculateSuccessRates(bucketRecords),
    };
  });
}

/**
 * Calculate success rates by freshness
 */
export function calculateSuccessRatesByFreshness(
  records: ApplicationRecord[]
): SuccessMetricsByDimension[] {
  const buckets = [
    { label: '<24h', min: 0, max: 24 },
    { label: '1-3 days', min: 24, max: 72 },
    { label: '3-7 days', min: 72, max: 168 },
    { label: '>7 days', min: 168, max: Infinity },
  ];

  return buckets.map((bucket) => {
    const bucketRecords = records.filter(
      (r) =>
        r.metadata.freshnessScore >= bucket.min && r.metadata.freshnessScore < bucket.max
    );
    return {
      dimension: 'freshness',
      value: bucket.label,
      metrics: calculateSuccessRates(bucketRecords),
    };
  });
}

/**
 * Calculate success rates by resume version
 */
export function calculateSuccessRatesByResumeVersion(
  records: ApplicationRecord[]
): SuccessMetricsByDimension[] {
  const versionGroups = new Map<string, ApplicationRecord[]>();

  for (const record of records) {
    const version = record.metadata.resumeVersion;
    if (!versionGroups.has(version)) {
      versionGroups.set(version, []);
    }
    versionGroups.get(version)!.push(record);
  }

  return Array.from(versionGroups.entries()).map(([version, versionRecords]) => ({
    dimension: 'resumeVersion',
    value: version,
    metrics: calculateSuccessRates(versionRecords),
  }));
}

/**
 * Get comprehensive success analytics
 */
export function getSuccessAnalytics(records: ApplicationRecord[]) {
  return {
    overall: calculateSuccessRates(records),
    bySource: calculateSuccessRatesBySource(records),
    byRole: calculateSuccessRatesByRole(records),
    byMatchScore: calculateSuccessRatesByMatchScore(records),
    byFreshness: calculateSuccessRatesByFreshness(records),
    byResumeVersion: calculateSuccessRatesByResumeVersion(records),
  };
}
