# Circle CV - Technical Architecture Guide

This comprehensive guide covers the technical architecture, implementation details, and system design of the Circle CV application.

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Architecture](#database-architecture)
3. [API Architecture](#api-architecture)
4. [Authentication System](#authentication-system)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Services](#backend-services)
7. [Data Flow](#data-flow)
8. [Security Implementation](#security-implementation)

## 🏗️ System Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chrome        │    │   Firebase      │    │   File Storage  │
│   Extension     │    │   Auth          │    │   (Vercel)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB Atlas
- **Authentication**: Firebase Auth, NextAuth.js
- **Deployment**: Vercel
- **Email**: Hostinger SMTP
- **File Storage**: Vercel Blob Storage

## 🗄️ Database Architecture

### MongoDB Schema Design

#### User Collection
```typescript
interface User {
  _id: ObjectId;
  firebaseUid: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
}
```

#### CV Collection
```typescript
interface CV {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  data: UnifiedCVDataStructure;
  templateId: string;
  isMaster: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags: string[];
  isPublic: boolean;
}
```

#### Job Collection
```typescript
interface Job {
  _id: ObjectId;
  userId: ObjectId;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDescription?: string;
  location?: string;
  salary?: SalaryInfo;
  status: JobStatus;
  priority: 'low' | 'medium' | 'high';
  applicationDate?: Date;
  deadline?: Date;
  notes?: string;
  contacts: Contact[];
  interviews: Interview[];
  followUps: FollowUp[];
  attachments: Attachment[];
  source?: JobSource;
  atsScore?: number;
  atsAnalysis?: ATSAnalysis;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Template Collection
```typescript
interface Template {
  _id: ObjectId;
  name: string;
  tier: 'free' | 'premium';
  category: string;
  categories: string[];
  layoutType: 'one-column' | 'two-column';
  pageFormat: 'A4' | 'Letter';
  orientation: 'Portrait' | 'Landscape';
  sections: TemplateSection[];
  styling: TemplateStyling;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Indexes
```javascript
// User indexes
db.users.createIndex({ "firebaseUid": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// CV indexes
db.cvs.createIndex({ "userId": 1 });
db.cvs.createIndex({ "userId": 1, "isMaster": 1 });
db.cvs.createIndex({ "templateId": 1 });

// Job indexes
db.jobs.createIndex({ "userId": 1 });
db.jobs.createIndex({ "userId": 1, "status": 1 });
db.jobs.createIndex({ "company": 1 });

// Template indexes
db.templates.createIndex({ "tier": 1 });
db.templates.createIndex({ "category": 1 });
db.templates.createIndex({ "isActive": 1 });
```

## 🔌 API Architecture

### RESTful API Design

#### Authentication Endpoints
```typescript
// POST /api/auth/signin
interface SignInRequest {
  email: string;
  password: string;
}

// POST /api/auth/signup
interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

// POST /api/auth/signout
// GET /api/auth/session
```

#### CV Management Endpoints
```typescript
// GET /api/cvs
// POST /api/cvs
// GET /api/cvs/[id]
// PUT /api/cvs/[id]
// DELETE /api/cvs/[id]

// POST /api/cvs/parse
interface ParseCVRequest {
  file: File;
  userId: string;
}
```

#### Job Management Endpoints
```typescript
// GET /api/jobs
// POST /api/jobs
// GET /api/jobs/[id]
// PUT /api/jobs/[id]
// DELETE /api/jobs/[id]

// POST /api/jobs/parse
interface ParseJobRequest {
  url: string;
  userId: string;
}
```

#### ATS Analysis Endpoints
```typescript
// POST /api/ats/analyze
interface ATSAnalysisRequest {
  cvData: CVData;
  jobData: JobData;
}

// POST /api/ats/optimize
interface ATSOptimizeRequest {
  cvData: CVData;
  jobData: JobData;
  optimizations: Optimization[];
}
```

### API Response Format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

## 🔐 Authentication System

### Firebase Authentication Integration
```typescript
// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

### NextAuth.js Configuration
```typescript
// NextAuth configuration
export default NextAuth({
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: FirebaseAdapter(firebaseConfig),
  callbacks: {
    async session({ session, user }) {
      // Custom session handling
      return session;
    },
  },
});
```

### Authentication Middleware
```typescript
// API route protection
export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return handler(req, res);
  };
}
```

## 🎨 Frontend Architecture

### Component Architecture
```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── forms/             # Form components
│   ├── studio/            # CV Studio components
│   ├── dashboard/         # Dashboard components
│   ├── landing/           # Landing page components
│   └── admin/             # Admin components
├── pages/
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── studio/            # CV Studio pages
│   └── auth/              # Authentication pages
├── lib/
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
└── types/                 # TypeScript type definitions
```

### State Management
```typescript
// Context-based state management
interface AppContext {
  user: User | null;
  cvData: CVData | null;
  selectedJob: Job | null;
  isLoading: boolean;
  error: string | null;
}

// Custom hooks for state management
export function useCVData() {
  const [cvData, setCVData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const updateCVData = useCallback((data: CVData) => {
    setCVData(data);
  }, []);
  
  return { cvData, updateCVData, isLoading };
}
```

### Routing System
```typescript
// App router structure
app/
├── page.tsx               # Landing page
├── dashboard/
│   ├── page.tsx           # Dashboard home
│   ├── analytics/
│   │   └── page.tsx       # Analytics page
│   └── settings/
│       └── page.tsx       # Settings page
├── studio/
│   ├── page.tsx           # CV Studio
│   └── [id]/
│       └── page.tsx       # CV editing
└── api/                   # API routes
```

## ⚙️ Backend Services

### Service Layer Architecture
```typescript
// Service interfaces
interface CVService {
  createCV(userId: string, cvData: CVData): Promise<CV>;
  updateCV(cvId: string, cvData: CVData): Promise<CV>;
  deleteCV(cvId: string): Promise<void>;
  getCVs(userId: string): Promise<CV[]>;
  parseCV(file: File): Promise<CVData>;
}

interface JobService {
  createJob(userId: string, jobData: JobData): Promise<Job>;
  updateJob(jobId: string, jobData: JobData): Promise<Job>;
  deleteJob(jobId: string): Promise<void>;
  getJobs(userId: string): Promise<Job[]>;
  parseJob(url: string): Promise<JobData>;
}

interface ATSService {
  analyzeCV(cvData: CVData, jobData: JobData): Promise<ATSAnalysis>;
  optimizeCV(cvData: CVData, jobData: JobData): Promise<CVData>;
  calculateScore(cvData: CVData, jobData: JobData): Promise<number>;
}
```

### Database Service
```typescript
// Database connection and operations
class DatabaseService {
  private client: MongoClient;
  
  async connect(): Promise<void> {
    this.client = new MongoClient(process.env.MONGODB_URI!);
    await this.client.connect();
  }
  
  async getCollection<T>(name: string): Promise<Collection<T>> {
    const db = this.client.db(process.env.MONGODB_DB_NAME);
    return db.collection<T>(name);
  }
  
  async findOne<T>(collection: string, filter: Filter<T>): Promise<T | null> {
    const coll = await this.getCollection<T>(collection);
    return await coll.findOne(filter);
  }
  
  async insertOne<T>(collection: string, document: T): Promise<InsertOneResult<T>> {
    const coll = await this.getCollection<T>(collection);
    return await coll.insertOne(document);
  }
}
```

### Email Service
```typescript
// Email service implementation
class EmailService {
  private transporter: Transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT!),
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }
  
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM_EMAIL,
      to: email,
      subject: 'Verify your email address',
      html: this.getVerificationEmailTemplate(token),
    };
    
    await this.transporter.sendMail(mailOptions);
  }
}
```

## 🔄 Data Flow

### CV Creation Flow
```
1. User uploads CV file
2. File parsing service extracts data
3. Data mapping to unified schema
4. Template selection and styling
5. Preview generation
6. Database storage
7. User confirmation
```

### ATS Analysis Flow
```
1. User selects CV and job
2. ATS service analyzes compatibility
3. Score calculation and breakdown
4. Optimization suggestions
5. Auto-fix implementation
6. Updated CV generation
7. Score improvement tracking
```

### Application Journey Flow
```
1. Job discovery and saving
2. CV customization for job
3. ATS optimization
4. Application submission
5. Progress tracking
6. Follow-up management
7. Outcome recording
```

## 🔒 Security Implementation

### Data Security
```typescript
// Data encryption
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  }
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
}
```

### API Security
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};
```

### Input Validation
```typescript
// Zod schema validation
import { z } from 'zod';

const CVDataSchema = z.object({
  basics: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  work: z.array(z.object({
    name: z.string().min(1),
    position: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
  })),
});

// Validation middleware
export function validateCVData(req: NextApiRequest, res: NextApiResponse, next: NextFunction) {
  try {
    CVDataSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid CV data' });
  }
}
```

## 📊 Performance Optimization

### Caching Strategy
```typescript
// Redis caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Database Optimization
```typescript
// Query optimization
class OptimizedQueryService {
  async getCVsWithPagination(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    return await db.cvs
      .find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
  
  async getCVsWithTemplate(userId: string, templateId: string) {
    return await db.cvs
      .aggregate([
        { $match: { userId: new ObjectId(userId), templateId } },
        { $lookup: {
          from: 'templates',
          localField: 'templateId',
          foreignField: '_id',
          as: 'template'
        }},
        { $unwind: '$template' }
      ])
      .toArray();
  }
}
```

## 🚀 Deployment Architecture

### Vercel Deployment
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "FIREBASE_PROJECT_ID": "@firebase-project-id"
  }
}
```

### Environment Configuration
```typescript
// Environment validation
const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  FIREBASE_PROJECT_ID: z.string(),
  NEXTAUTH_SECRET: z.string().min(32),
  EMAIL_SERVER_HOST: z.string(),
  EMAIL_SERVER_PORT: z.string().transform(Number),
});

export const env = envSchema.parse(process.env);
```

## 🔧 Monitoring and Logging

### Error Tracking
```typescript
// Error handling
export function withErrorHandling(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      
      // Log to external service
      if (process.env.NODE_ENV === 'production') {
        // Send to error tracking service
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
```

### Performance Monitoring
```typescript
// Performance tracking
export function withPerformanceTracking(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    
    await handler(req, res);
    
    const duration = Date.now() - start;
    console.log(`API ${req.url} took ${duration}ms`);
    
    // Track performance metrics
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
    }
  };
}
```

---

This technical architecture provides a robust, scalable, and secure foundation for the Circle CV application, ensuring optimal performance and user experience.
