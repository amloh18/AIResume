# Mongoose Setup Guide for CV Circle

## 🎯 Overview

This guide covers the complete Mongoose setup for your CV Circle application, including enhanced database configuration, service layer, utilities, and best practices.

## 📁 File Structure

```
src/
├── lib/
│   ├── database.ts          # Enhanced database connection
│   ├── mongoose-utils.ts    # Mongoose utilities and service layer
│   └── services/
│       └── index.ts         # Service instances for all models
├── models/
│   ├── User.ts             # User model with authentication
│   ├── CV.ts               # CV/Resume model
│   ├── JobApplication.ts   # Job application tracking
│   ├── CoverLetter.ts      # Cover letter model
│   ├── Template.ts         # CV templates
│   ├── Snippet.ts          # Reusable snippets
│   ├── CVData.ts           # CV data storage
│   └── index.ts            # Model exports
└── app/
    └── api/
        ├── health/          # Health check endpoint
        └── test-db/         # Database testing endpoint
```

## 🔧 Enhanced Database Configuration

### Key Features:
- **Connection Pooling:** Optimized for serverless environments
- **Error Handling:** Comprehensive error management
- **Health Monitoring:** Connection status and health checks
- **Production Ready:** SSL, compression, and timeout settings
- **Graceful Shutdown:** Proper cleanup on app termination

### Connection Options:
```typescript
const connectionOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxIdleTimeMS: 30000,
  compressors: ['zlib'],
  zlibCompressionLevel: 6,
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: process.env.NODE_ENV === 'production',
  heartbeatFrequencyMS: 10000,
  readPreference: 'primaryPreferred',
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 10000
  }
};
```

## 🛠️ Service Layer

### MongooseService Class
Provides a consistent interface for all CRUD operations:

```typescript
// Create
const user = await userService.create(userData);

// Find by ID
const user = await userService.findById(userId);

// Find with pagination
const result = await userService.findWithPagination(
  { isEmailVerified: true },
  { page: 1, limit: 10, sort: { createdAt: -1 } }
);

// Update
const updatedUser = await userService.updateById(userId, updateData);

// Delete
const deleted = await userService.deleteById(userId);

// Search
const users = await userService.search(
  ['firstName', 'lastName', 'email'],
  { search: 'john', filters: { isEmailVerified: true } }
);
```

### Available Services:
- `userService` - User management
- `cvService` - CV/Resume operations
- `jobApplicationService` - Job application tracking
- `coverLetterService` - Cover letter management
- `templateService` - CV templates
- `snippetService` - Reusable snippets
- `cvDataService` - CV data storage

## 🔍 Utility Functions

### Database Utilities:
```typescript
import { mongooseUtils } from '@/lib/services';

// Generate ObjectId
const id = mongooseUtils.generateId();

// Validate ObjectId
const isValid = mongooseUtils.isValidObjectId(id);

// Create date range query
const dateQuery = mongooseUtils.createDateRange(startDate, endDate);

// Create text search
const searchQuery = mongooseUtils.createTextSearch('john', ['firstName', 'lastName']);

// Create pagination options
const pagination = mongooseUtils.createPaginationOptions(1, 10);

// Create sort options
const sort = mongooseUtils.createSortOptions('createdAt', 'desc');

// Sanitize query
const cleanQuery = mongooseUtils.sanitizeQuery(rawQuery);
```

### Health Check Functions:
```typescript
import { healthCheck, isConnected, getConnectionStatus } from '@/lib/database';

// Check if connected
const connected = isConnected();

// Get connection status
const status = getConnectionStatus(); // 'connected' | 'disconnected' | 'connecting' | 'disconnecting'

// Full health check
const health = await healthCheck();
```

## 📊 API Endpoints

### Health Check: `/api/health`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "status": "healthy",
    "message": "MongoDB connection is healthy",
    "database": "cvcircle",
    "host": "cluster.mongodb.net",
    "port": 27017,
    "connectionStatus": "connected",
    "connected": true,
    "collections": {
      "users": 5,
      "cvs": 12,
      "jobApplications": 8
    }
  },
  "system": {
    "nodeVersion": "v18.17.0",
    "environment": "production",
    "uptime": 3600,
    "memoryUsage": { ... }
  }
}
```

### Database Test: `/api/test-db`
```json
{
  "success": true,
  "message": "Database connection test successful",
  "data": {
    "userCount": 5,
    "envInfo": {
      "hasMongoUri": true,
      "nodeEnv": "production",
      "vercelEnv": "production"
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🚀 Usage Examples

### User Management:
```typescript
import { userService } from '@/lib/services';

// Create user
const newUser = await userService.create({
  email: 'john@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe'
});

// Find user by email
const user = await userService.findOne({ email: 'john@example.com' });

// Update user
const updatedUser = await userService.updateById(userId, {
  firstName: 'Johnny',
  'subscription.status': 'active'
});

// Get users with pagination
const users = await userService.findWithPagination(
  { isEmailVerified: true },
  { page: 1, limit: 20, sort: { createdAt: -1 } }
);
```

### CV Management:
```typescript
import { cvService } from '@/lib/services';

// Create CV
const cv = await cvService.create({
  userId: userId,
  title: 'Professional CV',
  template: 'modern',
  sections: { ... }
});

// Find user's CVs
const userCVs = await cvService.findAll({ userId: userId });

// Search CVs
const searchResults = await cvService.search(
  ['title', 'sections.personalInfo.firstName'],
  { search: 'john', filters: { status: 'published' } }
);
```

### Job Application Tracking:
```typescript
import { jobApplicationService } from '@/lib/services';

// Create job application
const application = await jobApplicationService.create({
  userId: userId,
  cvId: cvId,
  jobTitle: 'Software Engineer',
  company: 'Tech Corp',
  status: 'applied'
});

// Get applications by status
const appliedJobs = await jobApplicationService.findAll({
  userId: userId,
  status: 'applied'
});

// Update application status
await jobApplicationService.updateById(applicationId, {
  status: 'interview',
  'interviews.0': {
    type: 'phone',
    date: new Date(),
    duration: 30
  }
});
```

## 🔒 Error Handling

The service layer includes comprehensive error handling:

```typescript
try {
  const user = await userService.create(userData);
} catch (error) {
  if (error.message.includes('Validation Error')) {
    // Handle validation errors
  } else if (error.message.includes('already exists')) {
    // Handle duplicate key errors
  } else if (error.message.includes('Invalid')) {
    // Handle cast errors
  }
}
```

## 📈 Performance Optimization

### Indexes:
All models include optimized indexes for common queries:

```typescript
// Users
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'subscription.status': 1 });

// CVs
cvSchema.index({ userId: 1, status: 1 });
cvSchema.index({ userId: 1, createdAt: -1 });

// Job Applications
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, applicationDate: -1 });
```

### Connection Pooling:
- **maxPoolSize:** 10 connections
- **minPoolSize:** 2 connections
- **maxIdleTimeMS:** 30 seconds
- **heartbeatFrequencyMS:** 10 seconds

## 🧪 Testing

### Test Database Connection:
```bash
# Test connection
curl https://your-app.vercel.app/api/test-db

# Health check
curl https://your-app.vercel.app/api/health

# Create test user
curl -X POST https://your-app.vercel.app/api/test-db
```

### Local Testing:
```bash
# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/test-db
```

## 🔧 Environment Variables

Required environment variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your-jwt-secret

# Environment
NODE_ENV=production
```

## 📋 Best Practices

1. **Always use services:** Use the service layer instead of direct model operations
2. **Handle errors:** Always wrap database operations in try-catch blocks
3. **Use pagination:** For large datasets, always use pagination
4. **Validate input:** Use Mongoose validation and sanitize queries
5. **Monitor connections:** Use health checks to monitor database status
6. **Use transactions:** For complex operations involving multiple documents
7. **Index queries:** Ensure all frequently used queries have proper indexes

## 🎯 Next Steps

1. **Test the setup:** Run the health check and test endpoints
2. **Update API routes:** Migrate existing routes to use the service layer
3. **Add monitoring:** Set up alerts for database health
4. **Performance tuning:** Monitor and optimize slow queries
5. **Backup strategy:** Implement regular database backups

---

**Status:** ✅ Mongoose Setup Complete
**Ready for:** Production deployment with enhanced features 