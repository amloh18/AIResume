# MongoDB Schema Setup for CV Circle

## 🗄️ Database Schema Overview

Your CV Circle application uses the following collections:

1. **users** - User accounts and authentication
2. **cvs** - CV/Resume documents
3. **jobapplications** - Job application tracking
4. **coverletters** - Cover letter documents
5. **templates** - CV templates
6. **snippets** - Reusable content snippets
7. **cvdata** - CV data storage

## 📋 Schema Definitions

### 1. Users Collection

```javascript
{
  _id: ObjectId,
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  firstName: String (required, max 50 chars),
  lastName: String (required, max 50 chars),
  avatar: String (optional),
  isEmailVerified: Boolean (default: false),
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  subscription: {
    plan: String (enum: ['basic', 'pro', 'unlimited']),
    status: String (enum: ['active', 'inactive', 'cancelled']),
    startDate: Date,
    endDate: Date,
    seats: Number (default: 3),
    storageUsed: Number (default: 0)
  },
  settings: {
    theme: String (enum: ['light', 'dark', 'auto']),
    notifications: {
      email: Boolean (default: true),
      push: Boolean (default: true)
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. CVs Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', required),
  title: String (required, max 100 chars),
  templateId: ObjectId (ref: 'templates'),
  templateName: String,
  templateData: {
    display: {
      layout: String (enum: ['single-column', 'two-column', 'absolute']),
      padding: String (default: '32px'),
      fontFamily: String (default: 'Segoe UI, Roboto, sans-serif'),
      sectionSpacing: String (default: '24px')
    },
    sections: [{
      id: String (required),
      type: String (enum: ['header', 'section']),
      title: String,
      content: {
        name: String,
        contact: [String],
        summary: String
      },
      entries: [{
        degree: String,
        institution: String,
        duration: String,
        details: [String],
        title: String,
        company: String,
        organization: String
      }],
      details: [String],
      styleSnippetId: String (required)
    }],
    snippetStyles: [{
      id: String (required),
      category: String (required),
      style: {
        fontWeight: String,
        fontSize: String,
        color: String,
        marginBottom: String,
        titleFontSize: String,
        entrySpacing: String,
        bulletIndent: String,
        entryBorderLeft: String,
        paddingLeft: String,
        lineSpacing: String,
        entryHighlightColor: String,
        titleFontWeight: String,
        entryBackground: String,
        padding: String,
        columns: Number,
        fontStyle: String
      }
    }]
  },
  cvData: Mixed (flexible schema for CV content),
  status: String (enum: ['draft', 'published', 'archived'], default: 'draft'),
  version: Number (default: 1),
  template: String (default: 'modern'),
  sections: {
    personalInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      location: String,
      website: String,
      linkedin: String,
      github: String,
      summary: String (max 500 chars)
    },
    experience: [{
      company: String,
      position: String,
      location: String,
      startDate: Date,
      endDate: Date,
      current: Boolean (default: false),
      description: String,
      achievements: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      location: String,
      startDate: Date,
      endDate: Date,
      current: Boolean (default: false),
      gpa: Number (min: 0, max: 4),
      description: String
    }],
    skills: [{
      category: String,
      skills: [String]
    }],
    projects: [{
      title: String,
      description: String,
      technologies: [String],
      url: String,
      github: String,
      startDate: Date,
      endDate: Date,
      current: Boolean (default: false)
    }],
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      expiryDate: Date,
      url: String
    }],
    languages: [{
      language: String,
      proficiency: String (enum: ['basic', 'intermediate', 'advanced', 'native'])
    }],
    customSections: [{
      title: String,
      content: String,
      order: Number
    }]
  },
  styling: {
    primaryColor: String (default: '#84cc16'),
    secondaryColor: String (default: '#22c55e'),
    fontFamily: String (default: 'Inter'),
    fontSize: String (default: 'medium'),
    spacing: Number (default: 1.5, min: 0.5, max: 3),
    customCSS: String
  },
  metadata: {
    lastModified: Date (default: now),
    createdFrom: ObjectId (ref: 'cvs'),
    tags: [String],
    isPublic: Boolean (default: false),
    viewCount: Number (default: 0),
    downloadCount: Number (default: 0)
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Job Applications Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', required),
  cvId: ObjectId (ref: 'cvs', required),
  jobTitle: String (required, max 100 chars),
  company: String (required, max 100 chars),
  jobUrl: String (optional, URL validation),
  jobDescription: String (max 5000 chars),
  location: String (max 100 chars),
  salary: {
    min: Number (min: 0),
    max: Number (min: 0),
    currency: String (default: 'USD'),
    period: String (enum: ['hourly', 'monthly', 'yearly'], default: 'yearly')
  },
  status: String (enum: ['created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'], default: 'created'),
  priority: String (enum: ['low', 'medium', 'high'], default: 'medium'),
  applicationDate: Date (required if status !== 'created'),
  deadline: Date (must be in future),
  notes: String (max 2000 chars),
  contacts: [{
    name: String (required),
    role: String,
    email: String,
    phone: String,
    linkedin: String
  }],
  interviews: [{
    type: String (enum: ['phone', 'video', 'onsite', 'technical', 'behavioral'], required),
    date: Date (required),
    duration: Number (min: 15, max: 480), // minutes
    interviewer: String,
    notes: String (max 1000 chars),
    outcome: String (enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled'),
    feedback: String (max 1000 chars)
  }],
  followUps: [{
    date: Date (required),
    type: String (enum: ['email', 'phone', 'linkedin', 'other'], required),
    description: String (required, max 500 chars),
    outcome: String (max 500 chars)
  }],
  attachments: [{
    name: String (required),
    type: String (enum: ['cv', 'cover-letter', 'certificate', 'portfolio', 'other'], required),
    url: String (required),
    size: Number (required, min: 0)
  }],
  tags: [String],
  isArchived: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Cover Letters Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', required),
  cvId: ObjectId (ref: 'cvs', required),
  jobApplicationId: ObjectId (ref: 'jobapplications'),
  title: String (required, max 100 chars),
  template: String (required, default: 'professional'),
  status: String (enum: ['draft', 'final', 'archived'], default: 'draft'),
  content: {
    salutation: String (required, max 100 chars),
    introduction: String (required, max 300 chars),
    body: String (required, max 2000 chars),
    conclusion: String (required, max 300 chars),
    signature: String (required, max 200 chars)
  },
  customization: {
    fontFamily: String (enum: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat'], default: 'Inter'),
    fontSize: String (enum: ['small', 'medium', 'large'], default: 'medium'),
    lineHeight: Number (default: 1.6, min: 1.2, max: 2.5),
    margins: {
      top: Number (default: 1, min: 0.5, max: 2),
      right: Number (default: 1, min: 0.5, max: 2),
      bottom: Number (default: 1, min: 0.5, max: 2),
      left: Number (default: 1, min: 0.5, max: 2)
    },
    primaryColor: String (default: '#84cc16'),
    secondaryColor: String (default: '#22c55e')
  },
  metadata: {
    targetCompany: String (required, max 100 chars),
    targetPosition: String (required, max 100 chars),
    jobUrl: String (optional, URL validation),
    keywords: [String],
    wordCount: Number (default: 0, min: 0),
    lastModified: Date (default: now),
    isPublic: Boolean (default: false),
    viewCount: Number (default: 0, min: 0),
    downloadCount: Number (default: 0, min: 0)
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Templates Collection

```javascript
{
  _id: ObjectId,
  name: String (required, unique),
  description: String,
  category: String (enum: ['professional', 'creative', 'minimal', 'modern', 'classic']),
  thumbnail: String (URL),
  isActive: Boolean (default: true),
  isPremium: Boolean (default: false),
  sections: [{
    id: String (required),
    type: String (enum: ['header', 'section']),
    title: String,
    required: Boolean (default: false),
    order: Number
  }],
  styling: {
    primaryColor: String,
    secondaryColor: String,
    fontFamily: String,
    fontSize: String,
    spacing: Number
  },
  metadata: {
    version: String,
    author: String,
    tags: [String],
    usageCount: Number (default: 0)
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Snippets Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users'),
  name: String (required),
  category: String (required),
  content: String (required),
  tags: [String],
  isPublic: Boolean (default: false),
  usageCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

### 7. CV Data Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', required),
  cvId: ObjectId (ref: 'cvs'),
  data: Mixed (flexible schema for CV content),
  version: Number (default: 1),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔍 Indexes for Performance

### Users Collection
```javascript
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "subscription.status": 1 })
db.users.createIndex({ "isEmailVerified": 1 })
```

### CVs Collection
```javascript
db.cvs.createIndex({ "userId": 1, "status": 1 })
db.cvs.createIndex({ "userId": 1, "createdAt": -1 })
db.cvs.createIndex({ "metadata.tags": 1 })
db.cvs.createIndex({ "metadata.isPublic": 1, "metadata.lastModified": -1 })
db.cvs.createIndex({ "templateId": 1 })
```

### Job Applications Collection
```javascript
db.jobapplications.createIndex({ "userId": 1, "status": 1 })
db.jobapplications.createIndex({ "userId": 1, "applicationDate": -1 })
db.jobapplications.createIndex({ "userId": 1, "company": 1 })
db.jobapplications.createIndex({ "userId": 1, "isArchived": 1 })
db.jobapplications.createIndex({ "contacts.email": 1 })
```

### Cover Letters Collection
```javascript
db.coverletters.createIndex({ "userId": 1, "status": 1 })
db.coverletters.createIndex({ "userId": 1, "createdAt": -1 })
db.coverletters.createIndex({ "metadata.targetCompany": 1 })
db.coverletters.createIndex({ "metadata.keywords": 1 })
db.coverletters.createIndex({ "metadata.isPublic": 1, "metadata.lastModified": -1 })
```

### Templates Collection
```javascript
db.templates.createIndex({ "name": 1 }, { unique: true })
db.templates.createIndex({ "category": 1 })
db.templates.createIndex({ "isActive": 1 })
db.templates.createIndex({ "isPremium": 1 })
```

### Snippets Collection
```javascript
db.snippets.createIndex({ "userId": 1, "category": 1 })
db.snippets.createIndex({ "category": 1 })
db.snippets.createIndex({ "isPublic": 1 })
db.snippets.createIndex({ "tags": 1 })
```

## 🚀 Setup Commands

### 1. Create Database
```javascript
use cvcircle
```

### 2. Create Collections
```javascript
db.createCollection("users")
db.createCollection("cvs")
db.createCollection("jobapplications")
db.createCollection("coverletters")
db.createCollection("templates")
db.createCollection("snippets")
db.createCollection("cvdata")
```

### 3. Create Indexes
```javascript
// Users indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "subscription.status": 1 })
db.users.createIndex({ "isEmailVerified": 1 })

// CVs indexes
db.cvs.createIndex({ "userId": 1, "status": 1 })
db.cvs.createIndex({ "userId": 1, "createdAt": -1 })
db.cvs.createIndex({ "metadata.tags": 1 })
db.cvs.createIndex({ "metadata.isPublic": 1, "metadata.lastModified": -1 })
db.cvs.createIndex({ "templateId": 1 })

// Job Applications indexes
db.jobapplications.createIndex({ "userId": 1, "status": 1 })
db.jobapplications.createIndex({ "userId": 1, "applicationDate": -1 })
db.jobapplications.createIndex({ "userId": 1, "company": 1 })
db.jobapplications.createIndex({ "userId": 1, "isArchived": 1 })
db.jobapplications.createIndex({ "contacts.email": 1 })

// Cover Letters indexes
db.coverletters.createIndex({ "userId": 1, "status": 1 })
db.coverletters.createIndex({ "userId": 1, "createdAt": -1 })
db.coverletters.createIndex({ "metadata.targetCompany": 1 })
db.coverletters.createIndex({ "metadata.keywords": 1 })
db.coverletters.createIndex({ "metadata.isPublic": 1, "metadata.lastModified": -1 })

// Templates indexes
db.templates.createIndex({ "name": 1 }, { unique: true })
db.templates.createIndex({ "category": 1 })
db.templates.createIndex({ "isActive": 1 })
db.templates.createIndex({ "isPremium": 1 })

// Snippets indexes
db.snippets.createIndex({ "userId": 1, "category": 1 })
db.snippets.createIndex({ "category": 1 })
db.snippets.createIndex({ "isPublic": 1 })
db.snippets.createIndex({ "tags": 1 })
```

## 📊 Sample Data

### Sample User
```javascript
db.users.insertOne({
  email: "john.doe@example.com",
  password: "$2a$12$hashedpasswordhere",
  firstName: "John",
  lastName: "Doe",
  isEmailVerified: true,
  subscription: {
    plan: "basic",
    status: "active",
    startDate: new Date(),
    seats: 3,
    storageUsed: 0
  },
  settings: {
    theme: "auto",
    notifications: {
      email: true,
      push: true
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Sample CV
```javascript
db.cvs.insertOne({
  userId: ObjectId("user_id_here"),
  title: "John Doe's Professional CV",
  template: "modern",
  status: "draft",
  version: 1,
  sections: {
    personalInfo: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1 234 567 8900",
      location: "New York, NY",
      summary: "Experienced software developer with 5+ years in web development."
    }
  },
  styling: {
    primaryColor: "#84cc16",
    secondaryColor: "#22c55e",
    fontFamily: "Inter",
    fontSize: "medium",
    spacing: 1.5
  },
  metadata: {
    lastModified: new Date(),
    tags: ["software", "web development"],
    isPublic: false,
    viewCount: 0,
    downloadCount: 0
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## 🔧 Validation Rules

### Email Validation
```javascript
{
  validator: {
    $regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  message: "Please enter a valid email address"
}
```

### URL Validation
```javascript
{
  validator: {
    $regex: /^https?:\/\/.+/
  },
  message: "URL must be a valid HTTP/HTTPS URL"
}
```

### Date Validation
```javascript
{
  validator: {
    $gte: new Date()
  },
  message: "Date must be in the future"
}
```

---

**Status:** ✅ Schema Ready for Implementation
**Next:** Update your MongoDB connection and test the schema! 