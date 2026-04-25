# CV Circle B2B Gateway Spec

## Why
CV Circle currently provides tools for individual users. By offering an API and a B2B interface, we can target enterprise and mid-market B2B clients (HR managers and recruiters). Providing both an API for technical integration and a dedicated HR Dashboard interface allows non-technical stakeholders to immediately see the value, filtering candidates and viewing match scores while dev teams handle backend integration.

## What Changes
- Build Developer API Hub (Endpoints for CV parsing, scoring, batch processing, and webhooks).
- Implement multi-tenant architecture with API Key generation, caching, and management.
- Build HR Interface (B2B Dashboard) with a Smart Roster for filtering candidates by score, skills, experience, etc.
- Build Detailed Candidate View explaining match scores.
- Add Usage Analytics and Billing structure (Tiered SaaS model with usage limits and overage).
- Implement Role-Based Access Control (RBAC) within Tenants.
- Ensure Data Privacy & Compliance (Data retention policies and data deletion).
- Implement strict Rate Limiting and Tenant Isolation to prevent IDOR.

## Impact
- Affected specs: Authentication, User/Tenant models, ATS Scoring logic, Billing, Middleware.
- Affected code: `src/app/api/b2b/*`, `src/app/b2b/*`, `src/lib/models/*`, `src/lib/auth/*`, `src/lib/middleware/*`.

## ADDED Requirements
### Requirement: Developer Hub (API)
The system SHALL provide RESTful API endpoints for:
- `POST /api/v1/b2b/parse`: Parses CV files (PDF, DOCX, TXT) into structured JSON.
- `POST /api/v1/b2b/score`: Accepts parsed CV and Job Description to return a match score.
- `POST /api/v1/b2b/batch`: Handles bulk processing of CVs asynchronously.
- `POST /api/v1/b2b/webhooks`: Registers and manages Webhook URLs for async processing results. Webhook payloads MUST include a cryptographic signature in the header.
- `DELETE /api/v1/b2b/candidate/{id}`: Purges candidate data upon request for GDPR/CCPA compliance.

### Requirement: Architecture & Security
- **API Key Caching**: API keys SHALL be cached in Redis or validated via Edge middleware to prevent database bottlenecks.
- **Tenant Isolation**: All database queries SHALL strictly enforce `tenantId` filtering to prevent Insecure Direct Object Reference (IDOR).
- **Rate Limiting**: All API endpoints SHALL enforce strict rate limiting based on the Tenant's subscription tier, returning standard `429 Too Many Requests` headers.
- **Data Privacy**: The system SHALL provide automated data retention policies (e.g., auto-delete parsed CV data after 30/60/90 days).

### Requirement: HR Interface (Visual Dashboard)
The system SHALL provide a web dashboard for B2B users with:
- **RBAC**: Support for Admin (manage API keys, billing, Sandbox) and Recruiter/Member (view Smart Roster and Candidate Views).
- **Smart Roster**: Paginated data grid to view and filter candidates (Score, Skills, Experience).
- **Candidate View**: Side-by-side comparison of CV vs Job Description.
- **Analytics & Billing**: Charts for API usage, match rates, and subscription limits tracking.
- **Sandbox**: Drag-and-drop zone for manual testing of parsing and scoring.
