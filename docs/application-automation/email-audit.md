# BuildAIResume Email Infrastructure Audit

## Executive Summary

The BuildAIResume email system currently uses external SMTP providers (Gmail, SendGrid, Mailgun, AWS SES) through Nodemailer. The system supports transactional emails (verification, password reset) and has a TrackerEmail model for tracking. The goal is to introduce self-hosted Stalwart Mail Server for application emails while preserving existing functionality.

---

## Current Email Architecture

### 1. Email Service
**Location**: `src/lib/email-service.ts`

**Status**: Fully implemented and operational

**Features**:
- Multiple provider support (Gmail, SendGrid, Mailgun, AWS SES)
- Nodemailer transport with connection pooling
- Rate limiting (100 sends/second max)
- Email verification
- Password reset
- Verification codes
- Generic email sending

**Providers Supported**:
- Gmail (EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD)
- SendGrid (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
- Mailgun (MAILGUN_API_KEY, MAILGUN_DOMAIN)
- AWS SES (AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, AWS_SES_REGION)

### 2. Email Templates
**Location**: `src/lib/email-templates.ts`

**Status**: Implemented

**Templates**:
- New user welcome
- Limit exhausted
- Special offers
- Verification code
- Account deletion
- Email verification
- Password reset

### 3. Email Tracking
**Location**: `src/models/TrackerEmail.ts`

**Status**: Implemented

**Fields**:
- userId
- type (verification_code, password_reset, etc.)
- status (queued, sent, delivered, failed)
- sentAt
- deliveredAt
- failureReason
- metadata

### 4. Email Limiter
**Location**: `src/lib/services/emailLimiter.ts`

**Status**: Implemented

**Features**:
- Daily limits per email type
- Transactional reservations
- Rate limiting

---

## Current SMTP Configuration

### Environment Variables
```bash
# Gmail
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password

# SendGrid
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@buildairesume.com

# Mailgun
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=mg.buildairesume.com

# AWS SES
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=us-east-1
```

### Sender Configuration
- Default sender: `noreply@buildairesume.com`
- Provider-specific sender based on configuration

---

## Current Email Flow

### Transactional Emails
```
User Action
    ↓
API Route
    ↓
Email Service
    ↓
Nodemailer
    ↓
External SMTP Provider
    ↓
Recipient
```

### Application Emails (Not Yet Implemented)
```
Application Queue
    ↓
Email Worker (Not Yet Implemented)
    ↓
Email Service
    ↓
Nodemailer
    ↓
External SMTP Provider
    ↓
Employer/Recruiter
```

---

## What Can Be Reused

### 1. Nodemailer Integration
The existing Nodemailer setup can be extended to support Stalwart as an internal SMTP server.

### 2. Email Templates
Existing templates can be extended for application emails.

### 3. TrackerEmail Model
The existing tracking model can be reused for application email tracking.

### 4. Email Limiter
The rate limiting infrastructure can be extended for application email limits.

### 5. Email Service Architecture
The centralized email service can be extended to support application emails.

---

## What Needs Changing

### 1. SMTP Configuration
Add Stalwart as an internal SMTP option:
```bash
# Stalwart Internal SMTP
STALWART_SMTP_HOST=stalwart
STALWART_SMTP_PORT=587
STALWART_SMTP_USER=applications@buildairesume.com
STALWART_SMTP_PASSWORD=your-stalwart-password
```

### 2. Application Email Sender
Create a new sender function for application emails:
```typescript
sendApplicationEmail({
  to: string;
  subject: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  resumePdf: Buffer;
  coverLetterPdf?: Buffer;
  customMessage?: string;
})
```

### 3. Email Queue
Implement asynchronous email queue for application emails:
```
Application
    ↓
Email Queue (MongoDB)
    ↓
Email Worker
    ↓
Nodemailer → Stalwart
    ↓
Recipient
```

### 4. Application Email Templates
Create professional application email templates:
- Application submission
- Application follow-up
- Thank you email

### 5. Delivery Tracking
Extend TrackerEmail for application-specific tracking:
- applicationId
- jobId
- candidateId
- employerEmail
- subject
- attachments
- delivery status

---

## What Must Remain Untouched

### 1. Existing Transactional Emails
- Email verification
- Password reset
- Login notifications
- System notifications

### 2. Existing Email Service Interface
The `sendEmail()`, `sendEmailVerification()`, `sendPasswordResetEmail()` functions must continue working.

### 3. Existing Email Templates
Existing templates must not be modified.

### 4. Existing TrackerEmail Model
The existing model must be extended, not replaced.

### 5. Existing Email Limiter
The existing rate limiting must continue working.

---

## Implementation Priority

### Phase 1: Stalwart Deployment (Week 1)
1. Deploy Stalwart Docker container
2. Configure internal networking
3. Configure SMTP authentication
4. Configure DKIM/SPF/DMARC
5. Test outbound email

### Phase 2: BuildAIResume Integration (Week 2)
1. Add Stalwart SMTP configuration
2. Create application email sender
3. Create application email templates
4. Implement email queue
5. Implement email worker

### Phase 3: Application Email (Week 3)
1. Create application email composer
2. Integrate with application pipeline
3. Add attachment handling
4. Add delivery tracking
5. Test end-to-end flow

### Phase 4: Security & Testing (Week 4)
1. Test open relay protection
2. Test rate limiting
3. Test retry handling
4. Test duplicate prevention
5. Test failure recovery

---

## Security Considerations

### 1. Open Relay Protection
Stalwart MUST NOT become an open relay. Require authentication for application emails.

### 2. Credential Protection
- Never log SMTP passwords
- Never commit secrets to Git
- Use environment variables

### 3. Rate Limiting
Implement strict limits:
- Global: max emails/minute
- Per user: max application emails/hour
- Per domain: reasonable throttling

### 4. Attachment Validation
- Validate file types
- Limit file sizes
- Prevent path traversal

### 5. Header Injection
Sanitize all user input in email headers.

---

## Testing Requirements

### 1. SMTP Connectivity
- Test connection to Stalwart
- Test authentication
- Test TLS

### 2. Email Delivery
- Send to Gmail
- Send to Outlook
- Verify headers
- Verify SPF/DKIM/DMARC

### 3. Application Email
- Test with resume attachment
- Test with cover letter attachment
- Test duplicate prevention
- Test retry handling

### 4. Security
- Test open relay prevention
- Test rate limiting
- Test unauthorized access

---

## Rollback Plan

If Stalwart deployment fails:
1. Revert to external SMTP provider
2. Keep existing email functionality
3. Document failure reasons
4. Plan alternative approach

The existing email system must continue working regardless of Stalwart status.
