# CVCircle API Documentation

This document provides comprehensive documentation for the CVCircle API endpoints.

## 🚀 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "688938a3d46879e751639e1b",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": false,
      "subscription": {
        "plan": "basic",
        "status": "inactive",
        "seats": 3,
        "storageUsed": 0
      },
      "createdAt": "2025-07-29T21:09:55.394Z"
    },
    "token": "jwt-token-here"
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "688938a3d46879e751639e1b",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": true
    },
    "token": "jwt-token-here"
  }
}
```

### Verify Email (Testing)
**POST** `/auth/verify-email`

Mark user email as verified (for testing purposes).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

## 📄 CV Management Endpoints

### List CVs
**GET** `/cvs?userId={userId}&page={page}&limit={limit}&search={search}&status={status}`

Get paginated list of CVs for a user.

**Query Parameters:**
- `userId` (required): User ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for title or name
- `status` (optional): Filter by status (draft, published, archived)

**Response:**
```json
{
  "success": true,
  "message": "CVs retrieved successfully",
  "data": {
    "data": [
      {
        "id": "6889392cd46879e751639e25",
        "title": "My Professional CV",
        "template": "modern",
        "status": "draft",
        "version": 1,
        "sections": {
          "personalInfo": {
            "firstName": "Your",
            "lastName": "Name",
            "email": "your.email@example.com",
            "summary": "A passionate professional with experience in..."
          }
        },
        "metadata": {
          "lastModified": "2025-07-29T21:12:12.577Z",
          "viewCount": 0,
          "downloadCount": 0
        },
        "createdAt": "2025-07-29T21:12:12.577Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Create CV
**POST** `/cvs`

Create a new CV for a user.

**Request Body:**
```json
{
  "userId": "688938a3d46879e751639e1b",
  "title": "My Professional CV",
  "template": "modern"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CV created successfully",
  "data": {
    "cv": {
      "id": "6889392cd46879e751639e25",
      "title": "My Professional CV",
      "template": "modern",
      "status": "draft",
      "version": 1,
      "sections": {
        "personalInfo": {
          "firstName": "Your",
          "lastName": "Name",
          "email": "your.email@example.com",
          "summary": "A passionate professional with experience in..."
        },
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "certifications": [],
        "languages": [],
        "customSections": []
      },
      "styling": {
        "primaryColor": "#84cc16",
        "secondaryColor": "#22c55e",
        "fontFamily": "Inter",
        "fontSize": "medium",
        "spacing": 1.5
      }
    }
  }
}
```

### Get CV by ID
**GET** `/cvs/{id}?userId={userId}`

Get a specific CV by ID.

**Path Parameters:**
- `id`: CV ID

**Query Parameters:**
- `userId` (required): User ID for authorization

**Response:**
```json
{
  "success": true,
  "message": "CV retrieved successfully",
  "data": {
    "cv": {
      "id": "6889392cd46879e751639e25",
      "title": "My Professional CV",
      "template": "modern",
      "status": "draft",
      "version": 1,
      "sections": {
        "personalInfo": {
          "firstName": "Your",
          "lastName": "Name",
          "email": "your.email@example.com",
          "phone": "",
          "location": "",
          "website": "",
          "linkedin": "",
          "github": "",
          "summary": "A passionate professional with experience in..."
        },
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "certifications": [],
        "languages": [],
        "customSections": []
      },
      "styling": {
        "primaryColor": "#84cc16",
        "secondaryColor": "#22c55e",
        "fontFamily": "Inter",
        "fontSize": "medium",
        "spacing": 1.5
      },
      "metadata": {
        "lastModified": "2025-07-29T21:12:12.577Z",
        "tags": [],
        "isPublic": false,
        "viewCount": 0,
        "downloadCount": 0
      }
    }
  }
}
```

### Update CV
**PUT** `/cvs/{id}`

Update a specific CV.

**Path Parameters:**
- `id`: CV ID

**Request Body:**
```json
{
  "userId": "688938a3d46879e751639e1b",
  "title": "Updated CV Title",
  "sections": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "summary": "Updated professional summary..."
    }
  },
  "styling": {
    "primaryColor": "#3b82f6"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "CV updated successfully",
  "data": {
    "cv": {
      "id": "6889392cd46879e751639e25",
      "title": "Updated CV Title",
      "version": 2,
      "metadata": {
        "lastModified": "2025-07-29T21:15:30.123Z"
      }
    }
  }
}
```

### Delete CV
**DELETE** `/cvs/{id}?userId={userId}`

Delete a specific CV.

**Path Parameters:**
- `id`: CV ID

**Query Parameters:**
- `userId` (required): User ID for authorization

**Response:**
```json
{
  "success": true,
  "message": "CV deleted successfully"
}
```

## 🧪 Testing Endpoints

### Test Database Connection
**GET** `/test-db`

Test the database connection and get collection counts.

**Response:**
```json
{
  "success": true,
  "message": "Database connection successful!",
  "data": {
    "collections": {
      "users": 2,
      "cvs": 1,
      "jobApplications": 0,
      "coverLetters": 0
    },
    "timestamp": "2025-07-29T21:08:42.841Z"
  }
}
```

### Create Test User
**POST** `/test-db`

Create a test user for development purposes.

**Response:**
```json
{
  "success": true,
  "message": "Test user created successfully",
  "data": {
    "userId": "6889385ed46879e751639e14",
    "email": "test@example.com",
    "createdAt": "2025-07-29T21:08:46.849Z"
  }
}
```

## 📊 Data Models

### User Model
```typescript
{
  email: string (unique, required),
  password: string (hashed, required),
  firstName: string (required),
  lastName: string (required),
  avatar?: string,
  isEmailVerified: boolean,
  subscription: {
    plan: 'basic' | 'pro' | 'unlimited',
    status: 'active' | 'inactive' | 'cancelled',
    seats: number,
    storageUsed: number
  },
  settings: {
    theme: 'light' | 'dark' | 'auto',
    notifications: {
      email: boolean,
      push: boolean
    }
  }
}
```

### CV Model
```typescript
{
  userId: ObjectId (ref: User),
  title: string (required),
  template: string (required),
  status: 'draft' | 'published' | 'archived',
  version: number,
  sections: {
    personalInfo: {
      firstName: string (required),
      lastName: string (required),
      email: string (required),
      phone?: string,
      location?: string,
      website?: string,
      linkedin?: string,
      github?: string,
      summary: string (required)
    },
    experience: Array<WorkExperience>,
    education: Array<Education>,
    skills: Array<SkillCategory>,
    projects: Array<Project>,
    certifications: Array<Certification>,
    languages: Array<Language>,
    customSections: Array<CustomSection>
  },
  styling: {
    primaryColor: string,
    secondaryColor: string,
    fontFamily: string,
    fontSize: string,
    spacing: number
  },
  metadata: {
    lastModified: Date,
    tags: string[],
    isPublic: boolean,
    viewCount: number,
    downloadCount: number
  }
}
```

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "field": "field_name", // for validation errors
  "statusCode": 400
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **Input Validation**: Comprehensive validation for all inputs
- **User Authorization**: Users can only access their own data
- **Email Verification**: Optional email verification system
- **Rate Limiting**: Built-in protection against abuse

## 📝 Usage Examples

### Complete User Registration Flow
```bash
# 1. Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Verify email (for testing)
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@example.com"}'

# 3. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'

# 4. Create CV
curl -X POST http://localhost:3001/api/cvs \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "688938a3d46879e751639e1b",
    "title": "My Professional CV",
    "template": "modern"
  }'

# 5. List CVs
curl "http://localhost:3001/api/cvs?userId=688938a3d46879e751639e1b"
```

## 🚀 Next Steps

1. **JWT Authentication**: Implement proper JWT token generation and validation
2. **Job Applications**: Add endpoints for job application management
3. **Cover Letters**: Add endpoints for cover letter creation and management
4. **File Uploads**: Implement file upload for CV attachments and avatars
5. **Email System**: Add email verification and notification system
6. **Payment Integration**: Add subscription management endpoints
7. **Analytics**: Add usage analytics and reporting endpoints

## 📞 Support

For API support and questions:
- Check the database setup guide: `DATABASE_SETUP.md`
- Review error logs in the console
- Test endpoints using the provided examples
- Ensure MongoDB connection is properly configured 