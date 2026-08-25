import { ObjectId } from 'mongodb';
export type JobStatus = 'active' | 'updated' | 'stale' | 'expired' | 'removed' | 'blocked';
export type RemoteType = 'remote' | 'hybrid' | 'on_site' | 'unknown';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary' | 'other';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | 'unknown';
export type SalaryPeriod = 'year' | 'month' | 'hour';
export interface JobCompany {
    name: string;
    normalizedName: string;
    domain?: string;
    logoUrl?: string;
    companyId?: ObjectId;
}
export interface JobSourceProvenance {
    name: string;
    sourceJobId: string;
    url: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
}
export interface JobLocation {
    city: string;
    state?: string;
    country: string;
    countryCode: string;
    remote: boolean;
    remoteType: RemoteType;
}
export interface JobExperience {
    minYears?: number | null;
    maxYears?: number | null;
    level: ExperienceLevel;
}
export interface JobSalary {
    min?: number | null;
    max?: number | null;
    currency?: string;
    period?: SalaryPeriod;
}
export interface JobVisaSponsorship {
    mentioned: boolean;
    type?: string | null;
}
export interface JobIngestionMetrics {
    firstSeenAt: Date;
    lastSeenAt: Date;
    lastUpdatedAt: Date;
    updateCount: number;
}
export interface JobSearchFields {
    keywords: string[];
    normalizedLocation: string;
    normalizedSkills: string[];
}
export interface JobMatchingFields {
    embeddingId?: string | null;
    indexed: boolean;
}
export interface NormalizedJob {
    _id?: ObjectId;
    canonicalId: string;
    title: string;
    normalizedTitle: string;
    company: JobCompany;
    description: string;
    descriptionText: string;
    source: {
        primary: string;
        sourceJobId: string;
        sourceUrl: string;
        applicationUrl: string;
        discoveredAt: Date;
        lastSeenAt: Date;
    };
    sources: JobSourceProvenance[];
    location: JobLocation;
    employmentType: EmploymentType;
    experience: JobExperience;
    salary: JobSalary;
    skills: string[];
    requirements: string[];
    benefits: string[];
    visaSponsorship: JobVisaSponsorship;
    postedAt: Date;
    expiresAt?: Date | null;
    status: JobStatus;
    ingestion: JobIngestionMetrics;
    search: JobSearchFields;
    matching: JobMatchingFields;
    metadata: {
        rawSource?: Record<string, any>;
        parserVersion: string;
        normalizerVersion: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
