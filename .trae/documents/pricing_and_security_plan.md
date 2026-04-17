# CVCircle Comprehensive Implementation Plan: Pricing Strategy & Security/Performance

## 1. Pricing Strategy & Paywall Implementation (Polar Payment Gateway)

### Overview
Balance user acquisition with value-based friction by offering a robust Free Tier ("Utility") and locking advanced AI optimization features behind Paid Tiers ("Competitive Edge"). **The app uses Polar as the payment gateway**; all plans and tier configurations must be synchronized with Polar's product IDs.

### Pricing Tiers (Configured via Polar)
- **Free Forever ($0)**: "Utility" hook. Loss leader to build the database.
- **Monthly Pro (~$19/mo)**: High margin for active job hunters (expected 60-day churn).
- **Annual Pro (~$99/yr)**: "Most Popular" best value for career-long users.
- **Lifetime (~$199)**: One-time cash injection for subscription-averse users.

### Feature Distribution
#### 🟢 Free Tier
* **CV Editor**: Access to **ALL templates** and **ALL snippets** (completely free).
* **Application Tracker**: Full access to the Kanban board.
* **Chrome Extension**: Basic job saving functionality.
* **Basic AI Writing**: Grammar correction and simple contextual rephrasing (limited by a fixed pool of free AI credits).

#### 🔐 Paid Tiers
* **Using AI**: Beyond the initial free credits, all AI generation is paid.
* **ATS Scoring & Editing**: Real-time feedback for specific job descriptions.
* **Advanced Sentence Structuring**: AI rewriting bullets using the **STAR method**.
* **AI Cover Letter Generator**: Unlimited tailored letters for specific job URLs.
* **LinkedIn Enhancer**: AI suggestions for headlines and "About" sections.
* **Interview Coach**: Access to the AI-driven mock interview simulator.

### Paywall Triggers
Don't block users immediately. Let them build their CV using the free tools first. Trigger the Polar paywall (e.g., via `openPaymentModal`) when:
1. They click **"Check ATS Score."**
2. They use the **"Power Rewrite"** (STAR Method) more than 3 times (exhausting their free AI credits).
3. They attempt to access restricted tools like the **Interview Coach** or **AI Cover Letter Generator** without an active subscription.

---

## 2. Security Optimization Plan

### 🚨 Critical Flaws Identified
1. **Unprotected Expensive Endpoints (DoS/DoW)**: AI generation and analysis routes (`/api/ai/career-analysis`, `/api/ai/generate-description`) are exposed publicly, risking severe AI API quota exhaustion (Denial of Wallet).
2. **Arbitrary File Upload Vulnerability**: `/api/upload` generates S3 presigned URLs without enforcing strict MIME type or size limits, risking malware hosting and storage exhaustion.

### Remediation Steps
* **Step 1: Secure AI Routes & Rate Limiting**
  * **Action:** Ensure all `/api/ai/*` routes require authentication via `getServerSession`.
  * **Action:** **Limit rate-limiting strictly to AI endpoints**. Implement `rateLimiter.checkLimit` on all AI routes to prevent abuse, while leaving other non-AI utility tools unaffected as per the tier limits.
* **Step 2: Secure S3 File Uploads**
  * **File:** `src/app/api/upload/route.ts`
  * **Action:** Validate the `contentType` strictly against a whitelist (PDF, Word, JPEG, PNG).
  * **Action:** Switch from `PutObjectCommand` to `createPresignedPost` (or rely on strict client+server validation) to enforce a `content-length-range` (e.g., 10MB max) directly at the S3 bucket level.

---

## 3. Performance Optimization Plan

### 🐌 Critical Flaws Identified
1. **Missing `.lean()` in Mongoose Queries**: Over 60 `find()` and `findOne()` read-only operations return heavy Mongoose documents instead of plain JSON objects.
2. **Unbounded Queries**: Admin routes (e.g., notification broadcasting) fetch thousands of users into memory simultaneously.

### Remediation Steps
* **Step 1: Add `.lean()` to Read-Only Queries**
  * **Files:** `src/app/api/admin/**/*.ts` and `src/app/api/user/**/*.ts`
  * **Action:** Append `.lean()` to all Mongoose queries that are strictly for reading data (where `.save()` is not invoked). This significantly reduces memory overhead and speeds up JSON serialization.
* **Step 2: Paginate Heavy Admin Queries**
  * **File:** `src/app/api/admin/notifications/create-offer/route.ts` (and similar batch routes).
  * **Action:** Replace unbounded `User.find()` calls with `.limit()`, `.skip()`, or `.cursor()` iterators to process users in manageable batches, preventing Out-Of-Memory (OOM) server crashes.