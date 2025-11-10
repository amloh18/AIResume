# CVCircle.io - Developer Guide

**Version**: 1.0  
**Last Updated**: November 2025  
**For**: Development Team

---

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [Technical Architecture](#technical-architecture)
3. [Sitemap & Routes](#sitemap--routes)
4. [User Flows & Diagrams](#user-flows--diagrams)
5. [Authentication System](#authentication-system)
6. [API Architecture](#api-architecture)
7. [Database Schema](#database-schema)
8. [Development Setup](#development-setup)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Application Overview

### Tech Stack

**Frontend**
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Custom component library (shadcn/ui based)
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **State Management**: Zustand, React Context

**Backend**
- **API**: Next.js API Routes (Serverless)
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3
- **Email**: Hostinger SMTP

**AI & Services**
- **AI Provider**: OpenAI (GPT models)
- **CV Parsing**: pdf-parse, mammoth
- **PDF Generation**: Puppeteer
- **Analytics**: Vercel Analytics

### Application Architecture

```mermaid
graph TB
    A[Next.js App Router] --> B[Client Components]
    A --> C[Server Components]
    A --> D[API Routes]
    
    B --> E[React Components]
    B --> F[State Management]
    B --> G[Client-side Logic]
    
    C --> H[Server-side Rendering]
    C --> I[Data Fetching]
    
    D --> J[Business Logic]
    D --> K[Database Access]
    D --> L[External APIs]
    
    K --> M[MongoDB]
    L --> N[OpenAI]
    L --> O[AWS S3]
    L --> P[Email Service]
    
    style A fill:#87CEEB
    style M fill:#90EE90
    style N fill:#FFD700
```

---

## 🗺️ Sitemap & Routes

### Public Routes

```
/                           → Landing Page
/sign-in                    → Login Page
/sign-up                    → Registration Page
/ai-career-report           → Free AI Career Guide
/features                   → Features Page
/templates                  → Templates Page
/privacy-policy             → Privacy Policy
/terms                      → Terms of Service
/cookie-policy              → Cookie Policy
/auth/verify-email          → Email Verification
/auth/reset-password        → Password Reset
/auth/error                 → Auth Error Page
```

### Protected Routes (Require Authentication)

```
/dashboard                  → Main Dashboard
/dashboard/application-journey → Application Journey
/dashboard/application-tracker → Job Tracker
/dashboard/canvas          → Canvas View
/dashboard/settings         → User Settings
/dashboard/vault           → Document Vault
/studio                    → CV Studio Editor
/profile                   → User Profile
```

### Admin Routes (Require Admin Role)

```
/admin                     → Admin Dashboard
/admin/email-campaigns     → Email Campaign Management
/admin/email-management    → Email Management
/admin/drafts             → Draft Management
```

### Application Flow Diagram

```mermaid
graph TB
    A[Landing Page] --> B{User Action}
    B -->|Sign Up| C[Registration Flow]
    B -->|Sign In| D[Login Flow]
    B -->|Browse| E[Public Pages]
    
    C --> F[Email Verification]
    F --> G[Master CV Onboarding]
    G --> H[Dashboard]
    
    D --> I{Has Master CV?}
    I -->|Yes| H
    I -->|No| G
    
    H --> J[Application Journey]
    H --> K[CV Studio]
    H --> L[Application Tracker]
    H --> M[Canvas View]
    H --> N[Settings]
    
    style H fill:#90EE90
    style G fill:#FFD700
    style A fill:#87CEEB
```

---

## 🔄 User Flows & Diagrams

### 1. New User Onboarding Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as Sign Up
    participant E as Email Verify
    participant O as Master CV Onboarding
    participant D as Dashboard

    U->>S: Register Account
    S->>E: Send Verification
    E->>U: Click Email Link
    U->>O: Start Onboarding
    O->>O: Personal Info
    O->>O: Experience
    O->>O: Education
    O->>O: Skills
    O->>O: Preview & Submit
    O->>D: Complete → Dashboard
```

**Files:**
- `src/app/master-cv-onboarding/page.tsx` - Main onboarding page
- `src/components/onboarding/MasterCVCreationWizard.tsx` - Wizard component
- `src/components/onboarding/PersonalInfoStep.tsx` - Step 1
- `src/components/onboarding/ExperienceStep.tsx` - Step 2
- `src/components/onboarding/EducationStep.tsx` - Step 3
- `src/components/onboarding/steps/SkillsStep.tsx` - Step 4
- `src/components/onboarding/CompletionStep.tsx` - Step 5

### 2. CV Creation & Tailoring Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as API
    participant DB as Database
    participant S as Studio

    U->>D: Create Master CV
    D->>API: POST /api/cvs/onboarding
    API->>DB: Save Master CV
    DB->>API: CV Created
    API->>D: Return CV ID

    U->>D: Start Journey
    D->>API: POST /api/application-journey
    API->>DB: Create Journey
    DB->>API: Journey ID

    U->>D: Create Tailored CV
    D->>API: POST /api/cvs (from master)
    API->>DB: Duplicate & Tailor CV
    DB->>API: New CV ID

    U->>S: Edit CV
    S->>API: PUT /api/cvs/:id
    API->>DB: Update CV
    DB->>API: Success
    API->>S: CV Updated
```

### 3. Dashboard Structure

```mermaid
graph TB
    D[Dashboard Layout] --> N[Navigation Sidebar]
    D --> M[Main Content Area]
    
    N --> N1[Home]
    N --> N2[Application Journey]
    N --> N3[Application Tracker]
    N --> N4[Canvas]
    N --> N5[Settings]
    
    M --> H[Home View]
    M --> AJ[Application Journey View]
    M --> AT[Application Tracker View]
    M --> C[Canvas View]
    M --> S[Settings View]
    
    H --> H1[Quick Stats]
    H --> H2[Recent Activity]
    H --> H3[Journey Timeline]
    H --> H4[Master CV Card]
    
    style D fill:#90EE90
    style AJ fill:#FFD700
```

### 4. CV Studio Flow

```mermaid
graph TB
    S[Studio Page] --> L[Studio Layout]
    L --> E[Editor Panel]
    L --> P[Preview Panel]
    L --> T[Toolbar]
    
    E --> E1[Section Editor]
    E --> E2[Content Editor]
    E --> E3[Formatting Tools]
    
    P --> P1[Live Preview]
    P --> P2[Template Selector]
    P --> P3[ATS Score]
    
    T --> T1[Save]
    T --> T2[Export]
    T --> T3[AI Assist]
    T --> T4[Settings]
    
    E1 --> S1[Personal Header]
    E1 --> S2[Work Experience]
    E1 --> S3[Education]
    E1 --> S4[Skills]
    E1 --> S5[Projects]
    E1 --> S6[Additional Sections]
    
    style S fill:#FFD700
    style P1 fill:#90EE90
```

---

## 🔐 Authentication System

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant N as NextAuth
    participant A as API
    participant D as Database

    C->>M: Request Protected Route
    M->>N: Check JWT Token
    
    alt Token Valid
        N->>M: Return User Session
        M->>C: Allow Access
    else No Token
        M->>C: Redirect to /sign-in
    end
    
    C->>A: Login Request
    A->>D: Verify Credentials
    D->>A: User Data
    A->>N: Create Session
    N->>C: Set JWT Cookie
    C->>M: Access Protected Route
    M->>N: Validate Token
    N->>M: Valid
    M->>C: Access Granted
```

### Authentication Files

**Core Auth Files:**
- `src/middleware.ts` - Route protection middleware
- `src/lib/auth.ts` - NextAuth configuration
- `src/lib/auth-config.ts` - Auth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `src/app/api/auth/login/route.ts` - Custom login endpoint
- `src/app/api/auth/register/route.ts` - Custom registration
- `src/app/api/auth/logout/route.ts` - Logout endpoint
- `src/lib/utils/signout.ts` - Signout utilities

**Auth Components:**
- `src/components/auth/UnifiedAuthPage.tsx` - Main auth page
- `src/components/auth/SignInForm.tsx` - Sign in form
- `src/components/auth/SignUpForm.tsx` - Sign up form
- `src/components/auth/CodeVerificationScreen.tsx` - Email verification
- `src/components/auth/RouteGuard.tsx` - Route protection component

### Authentication Methods

1. **Email/Password**: Traditional email and password authentication
2. **Google OAuth**: Social login via Google
3. **Magic Link**: Passwordless authentication (email link)
4. **Email Verification**: 4-digit code verification

### Session Management

- **JWT Tokens**: Secure JWT tokens for session management
- **HTTP-Only Cookies**: Secure cookie storage
- **Session Expiration**: Configurable session timeout
- **Token Refresh**: Automatic token refresh mechanism

---

## 🔌 API Architecture

### API Route Structure

```mermaid
graph TB
    API[/api] --> Auth[/auth - Authentication]
    API --> User[/user - User Management]
    API --> CVs[/cvs - CV Management]
    API --> CL[/cover-letters - Cover Letters]
    API --> Jobs[/jobs - Job Applications]
    API --> Journey[/application-journey - Journey Management]
    API --> AI[/ai - AI Services]
    API --> Admin[/admin - Admin Functions]
    API --> Payment[/payment - Payments]
    API --> Webhooks[/webhooks - Webhooks]
    
    Auth --> A1[/login]
    Auth --> A2[/register]
    Auth --> A3[/logout]
    Auth --> A4[/refresh]
    
    CVs --> C1[GET/POST /cvs]
    CVs --> C2[GET/PUT/DELETE /cvs/:id]
    CVs --> C3[/cvs/duplicate]
    CVs --> C4[/cvs/master]
    
    AI --> AI1[/ats-score]
    AI --> AI2[/generate-cover-letter]
    AI --> AI3[/improve-content]
    AI --> AI4[/parse-cv]
    
    style API fill:#87CEEB
    style Auth fill:#90EE90
    style CVs fill:#FFD700
    style AI fill:#FF6B6B
```

### API Endpoint Counts

- **Auth routes**: 16 endpoints
- **CV management**: 12 endpoints
- **AI services**: 23 endpoints
- **User management**: 18 endpoints
- **Admin**: 25 endpoints
- **Job tracking**: 15 endpoints
- **Cover letters**: 8 endpoints
- **Payment**: 6 endpoints
- **Total**: ~150 API routes

### API Response Format

```typescript
// Success Response
{
  success: true,
  data: { ... },
  message?: string
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### API Best Practices

1. **Error Handling**: Standardized error responses
2. **Validation**: Input validation using Zod schemas
3. **Authentication**: JWT token validation
4. **Rate Limiting**: Rate limiting on sensitive endpoints
5. **Caching**: Response caching where appropriate
6. **Logging**: Comprehensive request/response logging

---

## 🗄️ Database Schema

### Core Collections

**Users Collection**
```typescript
{
  _id: ObjectId,
  email: string,
  name: string,
  password?: string,
  authProvider: 'email' | 'google',
  isEmailVerified: boolean,
  emailVerifiedAt?: Date,
  currentPlanKey: string,
  subscriptionStatus: string,
  credits: number,
  createdAt: Date,
  updatedAt: Date
}
```

**CVs Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  cvData: {
    basics: { ... },
    work: [...],
    education: [...],
    skills: [...],
    projects: [...],
    // ... other sections
  },
  templateId: string,
  isMasterCV: boolean,
  metadata: {
    aiAnalysis: {...},
    lastModified: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Jobs Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  company: string,
  status: 'applied' | 'interviewing' | 'offer' | 'rejected',
  applicationDate: Date,
  cvId?: ObjectId,
  coverLetterId?: ObjectId,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Journeys Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  jobId: ObjectId,
  currentStep: number,
  steps: [
    { step: 1, completed: boolean, data: {...} },
    { step: 2, completed: boolean, data: {...} },
    // ... 5 steps total
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Database Indexes

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ currentPlanKey: 1 })
db.users.createIndex({ createdAt: -1 })

// CVs
db.cvs.createIndex({ userId: 1 })
db.cvs.createIndex({ userId: 1, isMasterCV: 1 })
db.cvs.createIndex({ createdAt: -1 })

// Jobs
db.jobs.createIndex({ userId: 1 })
db.jobs.createIndex({ userId: 1, status: 1 })
db.jobs.createIndex({ applicationDate: -1 })
```

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher (but less than 25.0.0)
- **npm**: 8.0.0 or higher
- **MongoDB**: MongoDB Atlas account
- **Git**: Version control

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Circle_CV_app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle
MONGODB_DB_NAME=cvcircle

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name

# Email
EMAIL_SERVER_HOST=smtp.hostinger.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@yourdomain.com
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM_EMAIL=noreply@yourdomain.com
```

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

---

## 🚀 Deployment Guide

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Push code to GitHub/GitLab
   - Connect repository to Vercel

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Set production values

3. **Deploy**
   - Vercel automatically deploys on push
   - Or manually trigger deployment

### Railway Deployment

1. **Create Railway Project**
2. **Connect Repository**
3. **Configure Environment Variables**
4. **Deploy**

### Build Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

---

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: Cannot connect to MongoDB
```
**Solution**: Check MONGODB_URI in .env.local

**2. NextAuth Session Error**
```
Error: JWT token invalid
```
**Solution**: Clear cookies and re-login

**3. Build Errors**
```
Error: Module not found
```
**Solution**: Run `npm install` and check imports

### Debug Mode

Enable debug logging:
```env
DEBUG=true
NODE_ENV=development
```

---

## 📚 Additional Resources

- **Component Documentation**: See `COMPONENTS_GUIDE.md`
- **Product Requirements**: See `PRD.md`
- **Legal Information**: See `LEGAL_AND_DATA_SAVING.md`
- **API Documentation**: Inline code comments
- **Architecture Diagrams**: See mermaid diagrams above

---

**Document Status**: Active  
**Maintained By**: Development Team  
**Review Cycle**: Monthly

