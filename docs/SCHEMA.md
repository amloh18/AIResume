# BuildAIResume — Database Schema & Data Architecture

This document is the authoritative specification for all MongoDB collections and Mongoose models across the BuildAIResume platform (`apps/airesume_app/src/models`).

---

## 1. Data Model Philosophy

### 1.1 Master CV as the Source of Truth
The candidate's **Master CV** is the single factual source of truth. It represents their verified professional experience, skills, metrics, education, and credentials.
- AI tailoring engines may rephrase, prioritize, and re-order sections for job relevance.
- AI must **never** fabricate credentials, employers, dates, work authorizations, or achievements.
- If required data is missing for an application, the workflow transitions to `NEEDS_USER_ACTION`.

### 1.2 Candidate Evidence Engine
Factual assertions are structured as verifiable evidence items:
```typescript
interface CandidateEvidence {
  claimId: string;
  claimText: string;          // e.g. "Reduced database query latency by 45%"
  sourceSection: string;       // e.g. "workExperiences[0].highlights[1]"
  verified: boolean;           // Verified against factual Master CV
  tags: string[];              // ["performance", "mongodb", "optimization"]
}
```
All generated cover letters, application answers, and tailored resumes cite valid `claimId` items from the candidate's Master CV.

---

## 2. Core Collections & Schemas

### 2.1 `users` (`User.ts`)
Stores account authentication, candidate profile metadata, security flags, and entitlement limits.

```typescript
interface IUser {
  _id: ObjectId;
  email: string;                             // Indexed, unique, lowercase
  passwordHash?: string;                     // Nullable for OAuth users
  name: string;
  role: 'user' | 'admin' | 'superadmin';     // Access control
  image?: string;                            // Avatar URL
  emailVerified?: Date;
  onboarded: boolean;                        // Wizard completion status
  profile: {
    phone?: string;
    location?: string;
    headline?: string;
    currentJobTitle?: string;
    yearsOfExperience?: number;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    workAuthorization?: string[];            // ["US_CITIZEN", "EU_WORK_PERMIT", etc.]
    visaStatus?: string;
    willingToRelocate?: boolean;
    desiredSalary?: {
      currency: string;
      amount: number;
      period: 'yearly' | 'monthly' | 'hourly';
    };
  };
  subscription: {
    tier: 'free' | 'pro' | 'unlimited';      // Plan tier
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    expiresAt?: Date;
    provider?: 'polar' | 'razorpay' | 'stripe';
    subscriptionId?: string;
  };
  usageLimits: {
    tailoredResumesUsed: number;
    tailoredResumesMax: number;
    coverLettersUsed: number;
    coverLettersMax: number;
    autoAppliesUsed: number;
    autoAppliesMax: number;
    monthlyResetDate: Date;
  };
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    backupCodes?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ email: 1 }` (unique)
- `{ "subscription.tier": 1, "subscription.status": 1 }`
- `{ createdAt: -1 }`

---

### 2.2 `cvs` (`CV.ts`)
Stores Master CVs and tailored CV versions.

```typescript
interface ICV {
  _id: ObjectId;
  userId: ObjectId;                          // Ref: User (indexed)
  isMaster: boolean;                         // True if this is the factual Master CV
  title: string;                             // e.g. "Senior Full-Stack Engineer Master"
  slug: string;                              // URL-friendly identifier
  version: number;                           // Monotonically increasing version
  jobId?: ObjectId;                          // Linked job if tailored (Ref: Job)
  contactInformation: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  professionalSummary: string;
  workExperiences: Array<{
    id: string;
    company: string;
    position: string;
    location?: string;
    remote: boolean;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    highlights: string[];
  }>;
  educations: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    highlights: string[];
  }>;
  skills: Array<{
    category: string;                        // e.g. "Frontend", "Backend", "DevOps"
    items: string[];                         // ["React", "TypeScript", "Next.js"]
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    highlights: string[];
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  customSections?: Array<{
    id: string;
    title: string;
    items: any[];
  }>;
  evidenceItems: CandidateEvidence[];        // Ground truth claims
  atsAnalysis?: {
    overallScore: number;                    // 0 - 100
    keywordMatches: string[];
    missingKeywords: string[];
    formattingIssues: string[];
    lastAnalyzedAt: Date;
  };
  templateSettings: {
    templateId: string;                      // e.g. "modern-minimal", "executive-two-column"
    colorTheme: string;
    fontFamily: string;
    spacing: 'compact' | 'normal' | 'spacious';
  };
  pdfUrl?: string;                           // R2 storage URL
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ userId: 1, isMaster: 1 }`
- `{ userId: 1, jobId: 1 }`
- `{ userId: 1, updatedAt: -1 }`

---

### 2.3 `jobs` (`Job.ts`)
Normalized job listings aggregated from direct ATS APIs and web sources.

```typescript
interface IJob {
  _id: ObjectId;
  canonicalId: string;                       // SHA-256 fingerprint (indexed, unique)
  title: string;                             // Normalized job title
  company: string;                           // Company name
  companySlug: string;                       // Normalized slug
  location: string;
  isRemote: boolean;
  remoteType?: 'fully-remote' | 'hybrid' | 'on-site';
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'yearly' | 'monthly' | 'hourly';
  };
  descriptionRaw: string;                    // Raw HTML / Text
  descriptionClean: string;                  // Stripped clean markdown text
  requirements: string[];                    // Extracted skills & qualifications
  atsType: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'naukri' | 'indeed' | 'unknown';
  source: string;                            // 'greenhouse', 'lever', 'jobspy', etc.
  sourceJobId: string;                       // Requisition ID on the source platform
  canonicalUrl: string;                      // Clean job post URL
  applicationUrl: string;                    // Direct ATS application submission URL
  status: 'active' | 'stale' | 'expired';
  firstSeenAt: Date;                         // First discovery date
  sourcePostedAt?: Date;                     // Original posting date from source
  lastSeenAt: Date;                          // Last re-verification date
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ canonicalId: 1 }` (unique)
- `{ source: 1, sourceJobId: 1 }` (unique)
- `{ status: 1, firstSeenAt: -1 }`
- `{ companySlug: 1, title: 1 }`

---

### 2.4 `job_applications` (`JobApplication.ts`)
Tracks the complete candidate application lifecycle.

```typescript
interface IJobApplication {
  _id: ObjectId;
  userId: ObjectId;                          // Ref: User
  jobId: ObjectId;                           // Ref: Job
  status: 'saved' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  mode: 'AUTO' | 'REVIEW' | 'MANUAL';
  tailoredCvId?: ObjectId;                   // Ref: CV
  coverLetterId?: ObjectId;                  // Ref: CoverLetter
  appliedAt?: Date;
  responseReceivedAt?: Date;
  interviewDate?: Date;
  notes?: string;
  customAnswers?: Array<{
    question: string;
    answer: string;
    verifiedClaimId?: string;
  }>;
  submissionDetails?: {
    portalUrl: string;
    atsType: string;
    confirmationId?: string;
    screenshotUrl?: string;                  // R2 upload
    durationMs?: number;
  };
  timeline: Array<{
    stage: string;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ userId: 1, jobId: 1 }` (unique deduplication per user)
- `{ userId: 1, status: 1 }`
- `{ userId: 1, appliedAt: -1 }`

---

### 2.5 `application_queues` (`ApplicationQueue.ts`)
Distributed queue for deterministic Playwright application automation.

```typescript
interface IApplicationQueue {
  _id: ObjectId;
  applicationId: ObjectId;                   // Ref: JobApplication
  userId: ObjectId;                          // Ref: User
  jobId: ObjectId;                           // Ref: Job
  priority: number;                          // 1 (Highest) - 10 (Lowest)
  status: 'queued' | 'running' | 'needs_user_action' | 'submitted' | 'failed' | 'cancelled';
  scheduledAt: Date;
  lockedAt?: Date;                           // Lease lock timestamp
  lockedUntil?: Date;                        // Lease expiration
  lockedBy?: string;                         // Worker host/PID identifier
  idempotencyKey: string;                    // Unique execution lock
  retryCount: number;
  maxRetries: number;
  errorLog?: string;
  actionRequiredReason?: string;             // e.g. "CAPTCHA detected" | "Mandatory field missing"
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ idempotencyKey: 1 }` (unique)
- `{ status: 1, priority: 1, scheduledAt: 1 }`
- `{ lockedUntil: 1 }`

---

### 2.6 `tracker_emails` (`TrackerEmail.ts`)
Bidirectional recruiter communication synchronized from the Stalwart mail server via JMAP.

```typescript
interface ITrackerEmail {
  _id: ObjectId;
  userId: ObjectId;                          // Ref: User
  applicationId?: ObjectId;                  // Ref: JobApplication (matched)
  messageId: string;                         // RFC-822 Message-ID (unique per user)
  threadId?: string;                         // Email conversation thread ID
  from: {
    name?: string;
    address: string;
  };
  to: Array<{
    name?: string;
    address: string;
  }>;
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  date: Date;
  direction: 'inbound' | 'outbound';
  classification?: 'interview_request' | 'rejection' | 'offer' | 'screening' | 'general';
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ userId: 1, messageId: 1 }` (unique)
- `{ userId: 1, applicationId: 1 }`
- `{ userId: 1, date: -1 }`

---

### 2.7 Other Supporting Collections

- **`cover_letters`**: Generated cover letters matched to candidate evidence and job requirements.
- **`job_demands`**: Candidate search preferences, criteria, and ingestion worker polling triggers.
- **`company_watchlists`**: Companies bookmarked by users for prioritized ingestion sweeps.
- **`templates`**: System resume layouts (typography, color palettes, grid configurations).
- **`cron_locks`**: Distributed lock leases preventing concurrent background worker sweeps.
- **`notifications` & `notification_queues`**: In-app notifications and real-time SSE event queues.
- **`verification_tokens`**: Authentication tokens for password reset and 2FA with TTL expiration.
