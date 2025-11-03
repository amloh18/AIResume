# Circle CV Application - Architecture Guide
**Quick Reference for Development Team**  
**Last Updated:** November 3, 2025  

---

## 🗂️ Architecture Overview

```
┌────────────────────────────────────────────────────┐
│              Frontend (Next.js App Router)          │
│  - React Components                                │
│  - Client-side State (Zustand, Context)           │
│  - API Clients                                     │
└─────────────────┬──────────────────────────────────┘
                  │
                  │ HTTP/REST
                  ▼
┌────────────────────────────────────────────────────┐
│                 API Routes Layer                    │
│  /api/* - Next.js 15 Route Handlers               │
│  + Error Handling (standardized)                  │
│  + Validation (Zod schemas)                       │
│  + Authentication (NextAuth)                      │
└─────────────────┬──────────────────────────────────┘
                  │
                  │ calls
                  ▼
┌────────────────────────────────────────────────────┐
│                  Service Layer                      │
│  Business Logic & Orchestration                    │
│  - UserService                                     │
│  - CVBusinessService                               │
│  - JobService                                      │
│  - AIService                                       │
└─────────────────┬──────────────────────────────────┘
                  │
                  │ uses
                  ▼
┌────────────────────────────────────────────────────┐
│            Repository Layer ✨ NEW                 │
│  Data Access Abstraction                          │
│  - UserRepository                                  │
│  - CVRepository                                    │
│  - JobRepository (to create)                       │
└─────────────────┬──────────────────────────────────┘
                  │
                  │ queries
                  ▼
┌────────────────────────────────────────────────────┐
│                  Model Layer                        │
│  Mongoose Schemas & Models                        │
│  - User, CV, Job, CoverLetter                     │
└─────────────────┬──────────────────────────────────┘
                  │
                  │ connects via
                  ▼
┌────────────────────────────────────────────────────┐
│           Connection Manager ✨ NEW                │
│  - Single DB connection instance                  │
│  - Connection pooling                             │
│  - Health checks                                  │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│              MongoDB Database                       │
│  Collections: users, cvs, jobs, etc.              │
└────────────────────────────────────────────────────┘

Adjacent Layers:
┌────────────────────────────────────────────────────┐
│  Cache Layer (Redis) ✨ NEW                       │
│  - User session caching                           │
│  - Query result caching                           │
└────────────────────────────────────────────────────┘
```

---

## 📁 New File Structure

```
src/lib/
├── api/                    ✨ NEW - API utilities
│   ├── error-handler.ts   - Standardized error handling
│   └── index.ts           - Exports
│
├── auth/                   ✨ Refactored
│   ├── unified-auth-service.ts  - NextAuth config
│   └── user-service.ts          - Auth business logic
│
├── cache/                  ✨ NEW - Caching layer
│   ├── cache-manager.ts   - Unified cache interface
│   ├── redis-client.ts    - Redis singleton
│   └── index.ts           - Exports
│
├── database/               ✨ NEW - DB connection
│   ├── connection-manager.ts  - Unified connection
│   └── index.ts              - Exports
│
├── repositories/           ✨ NEW - Data access layer
│   ├── base-repository.ts    - Base CRUD operations
│   ├── user-repository.ts    - User data access
│   ├── cv-repository.ts      - CV data access
│   └── index.ts              - Exports
│
└── validation/             ✨ NEW - Input validation
    ├── cv-schemas.ts         - CV validation schemas
    ├── user-schemas.ts       - User validation schemas
    └── index.ts              - Exports
```

---

## 🔑 Key Architectural Decisions

### 1. Single Database Connection
**Decision:** Use unified connection manager  
**Location:** [`src/lib/database/connection-manager.ts`](src/lib/database/connection-manager.ts)  
**Why:** Prevents connection leaks, ensures proper pooling  

### 2. Repository Pattern for Data Access
**Decision:** All database access through repositories  
**Location:** [`src/lib/repositories/`](src/lib/repositories/)  
**Why:** Testability, separation of concerns, reusability  

### 3. Zod for Input Validation
**Decision:** Validate all inputs with Zod schemas  
**Location:** [`src/lib/validation/`](src/lib/validation/)  
**Why:** Type safety, clear error messages, security  

### 4. Standardized Error Responses
**Decision:** Use APIError classes and standard format  
**Location:** [`src/lib/api/error-handler.ts`](src/lib/api/error-handler.ts)  
**Why:** Consistent API, better client experience  

### 5. Redis Caching with Fallback
**Decision:** Redis in production, memory in development  
**Location:** [`src/lib/cache/cache-manager.ts`](src/lib/cache/cache-manager.ts)  
**Why:** Performance, graceful degradation  

---

## 🚀 Quick Start for Developers

### Creating a New API Endpoint

```typescript
// 1. Create validation schema (src/lib/validation/*)
export const CreateJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().optional(),
});

// 2. Create repository (src/lib/repositories/*)
export class JobRepository extends BaseRepository<IJob> {
  async findByUserId(userId: string): Promise<IJob[]> {
    return this.find({ userId } as FilterQuery<IJob>);
  }
}

// 3. Create service (src/lib/services/*)
export class JobService {
  static async createJob(data: any, userId: string): Promise<IJob> {
    const validData = validateCreateJob(data);
    return jobRepository.create({ ...validData, userId });
  }
}

// 4. Create API route (src/app/api/jobs/route.ts)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    assertAuthenticated(session?.user?.id);
    
    const body = await req.json();
    const job = await JobService.createJob(body, session.user.id);
    
    return createSuccessResponse(job, 201);
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

---

## 🧪 Testing Guide

### Testing Repositories

```typescript
// Mock the repository in tests
jest.mock('@/lib/repositories/user-repository');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should authenticate user', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.verifyPassword as jest.Mock).mockResolvedValue(true);
    
    const result = await UserService.authenticateUser('test@example.com', 'password');
    
    expect(result.user).toBeDefined();
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
  });
});
```

### Testing Validation

```typescript
describe('CV Validation', () => {
  it('should validate valid CV data', () => {
    const validData = {
      title: 'My CV',
      cvData: { basics: { name: 'John Doe', email: 'john@example.com' } },
      templateId: 'template-1',
    };
    
    expect(() => validateCreateCV(validData)).not.toThrow();
  });
  
  it('should reject invalid email', () => {
    const invalidData = {
      cvData: { basics: { email: 'invalid-email' } },
    };
    
    expect(() => validateCVData(invalidData)).toThrow();
  });
});
```

---

## 🔍 Common Patterns

### Pattern 1: CRUD Operations

```typescript
// Create
const user = await userRepository.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
});

// Read
const user = await userRepository.findById(userId);
const users = await userRepository.find({ role: 'user' });

// Update
const updated = await userRepository.updateById(userId, {
  $set: { firstName: 'Jane' },
});

// Delete
const deleted = await userRepository.deleteById(userId);
```

### Pattern 2: Pagination

```typescript
const result = await cvRepository.findWithPagination(
  { userId },
  {
    page: 1,
    limit: 10,
    sort: { createdAt: -1 },
  }
);

console.log(result.data); // Array of CVs
console.log(result.pagination.total); // Total count
console.log(result.pagination.hasNext); // Has more pages
```

### Pattern 3: Transactions

```typescript
await repository.withTransaction(async (session) => {
  // All operations use the same session
  const cv = await cvRepository.create(cvData, { session });
  await userRepository.incrementUsage(userId, 'cvCreatedCount');
  
  // If any operation fails, entire transaction rolls back
});
```

### Pattern 4: Caching

```typescript
// Get from cache
const cached = await getCache<User>(`user:${userId}`);
if (cached) return cached;

// Fetch from DB
const user = await userRepository.findById(userId);

// Store in cache (5 minutes)
await setCache(`user:${userId}`, user, 300);

// Invalidate cache
await invalidateCache(`user:${userId}`);
await invalidateCache('user:*'); // All user caches
```

---

## ⚠️ Migration Guide for Existing Code

### Step 1: Replace Direct Model Access

```typescript
// ❌ Old way:
import User from '@/models/User';
const user = await User.findOne({ email });

// ✅ New way:
import { userRepository } from '@/lib/repositories';
const user = await userRepository.findByEmail(email);
```

### Step 2: Add Validation

```typescript
// ❌ Old way:
const userData = req.body;
const user = await userRepository.create(userData);

// ✅ New way:
import { validateUserRegistration } from '@/lib/validation';
const validData = validateUserRegistration(req.body);
const user = await userRepository.create(validData);
```

###<br> Step 3: Standardize Error Handling

```typescript
// ❌ Old way:
if (!user) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// ✅ New way:
import { NotFoundError, createErrorResponse } from '@/lib/api';
if (!user) {
  throw new NotFoundError('User');
}
// Error automatically handled by try-catch block
```

---

## 📊 Performance Best Practices

### Use Lean Queries When Possible

```typescript
// ✅ For read-only data (faster):
const user = await userRepository.findById(userId, { lean: true });

// ❌ Only when you need Mongoose methods:
const user = await userRepository.findById(userId); // Returns full Document
```

### Use Caching for Frequently Accessed Data

```typescript
// ✅ Cache expensive queries:
const cacheKey = `cv:${cvId}`;
let cv = await getCache<ICV>(cacheKey);

if (!cv) {
  cv = await cvRepository.findById(cvId);
  await setCache(cacheKey, cv, 300); // 5 minutes
}
```

### Use Projection to Limit Fields

```typescript
// ✅ Only select needed fields:
const user = await userRepository.findById(userId, {
  select: 'email firstName lastName',
  lean: true,
});
```

---

## 🔐 Security Checklist

When creating new API routes, ensure:

- [ ] Input validation with Zod schemas
- [ ] Authentication check (`assertAuthenticated`)
- [ ] Authorization check (`assertOwnership` or `assertRole`)
- [ ] Use repositories (never direct model access)
- [ ] Standardized error responses
- [ ] No sensitive data in error messages (production)
- [ ] Rate limiting (for public endpoints)
- [ ] CORS configuration (if needed)

---

## 📦 Key Imports Reference

```typescript
// Database connection
import { getConnection, healthCheck } from '@/lib/database';

// Repositories
import { 
  userRepository, 
  cvRepository 
} from '@/lib/repositories';

// Validation
import { 
  validateCreateCV,
  validateUserRegistration,
  safeValidateCreateCV 
} from '@/lib/validation';

// Error handling
import {
  APIError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
  assertAuthenticated,
  assertOwnership
} from '@/lib/api';

// Caching
import { 
  getCache, 
  setCache, 
  invalidateCache 
} from '@/lib/cache';

// Auth
import { authConfig } from '@/lib/auth-config';
import { getServerSession } from 'next-auth';
```

---

## 🎯 Development Workflow

### Adding a New Feature

1. **Define Data Model** (if new entity)
   - Create Mongoose schema in `src/models/`
   
2. **Create Validation Schema**
   - Add Zod schema in `src/lib/validation/`
   
3. **Create Repository**
   - Extend BaseRepository in `src/lib/repositories/`
   - Add entity-specific queries
   
4. **Create Service**
   - Add business logic in `src/lib/services/`
   - Use repositories for data access
   
5. **Create API Routes**
   - Add routes in `src/app/api/`
   - Use validation, error handling, auth

6. **Create Frontend Components**
   - Add React components
   - Use API clients to call backend

### Code Review Checklist

- [ ] Uses repository pattern (no direct model access)
- [ ] Input validation with Zod
- [ ] Proper error handling
- [ ] Authentication and authorization
- [ ] TypeScript types defined
- [ ] Comments for complex logic
- [ ] No console.log in production code
- [ ] Follows existing patterns

---

## 🐛 Debugging Tips

### Check Database Connection

```typescript
import { healthCheck } from '@/lib/database';

const health = await healthCheck();
console.log(health);
// { healthy: true, latency: 15, database: 'cvcircle', host: '...', port: 27017 }
```

### Check Cache Status

```typescript
import { isRedisAvailable } from '@/lib/cache';

const available = await isRedisAvailable();
console.log('Redis available:', available);
```

### Enable Debug Logging

```typescript
// In development, NextAuth shows debug info
// Set in auth-config: debug: process.env.NODE_ENV === 'development'
```

---

## 📚 Related Documentation

- **[ARCHITECTURAL_REVIEW.md](ARCHITECTURAL_REVIEW.md)** - Complete analysis of all issues
- **[ARCHITECTURAL_IMPLEMENTATION_STATUS.md](ARCHITECTURAL_IMPLEMENTATION_STATUS.md)** - What's been fixed
- **[IMPLEMENTATION_COMPLETED.md](IMPLEMENTATION_COMPLETED.md)** - Implementation details
- **[ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md)** - This document

---

## 🆘 Getting Help

### Common Issues

**Issue:** "Module not found: @/lib/repositories"
**Solution:** Ensure TypeScript paths are configured in `tsconfig.json`

**Issue:** "Cannot read property '_id' of null"
**Solution:** Always check for null before accessing properties

**Issue:** "Validation error: Required"
**Solution:** Check Zod schema, ensure all required fields are provided

**Issue:** "Transaction failed"
**Solution:** Ensure all operations in transaction use `{ session }` option

---

## 🎓 Learning Resources

### Understanding the Repository Pattern
- Repositories abstract data access logic
- Services contain business logic
- Controllers (API routes) handle HTTP concerns
- Each layer has a single responsibility

### Understanding Transactions
- Use for operations that must be atomic
- All operations in a transaction must succeed or all fail
- Always pass `session` option to repository methods
- Transaction auto-commits on success, auto-rollbacks on error

### Understanding Validation
- Always validate inputs before processing
- Use safe parse for optional validation
- Validation errors are automatically formatted
- Zod provides strong typing and runtime checks

---

## ✨ New Features Enabled

With this architecture, you can now:

- ✅ Write unit tests (repositories are mockable)
- ✅ Use transactions for data integrity
- ✅ Cache expensive queries
- ✅ Validate all inputs automatically
- ✅ Have consistent error messages
- ✅ Scale services independently
- ✅ Refactor with confidence

---

**This guide will be updated as the architecture evolves.**