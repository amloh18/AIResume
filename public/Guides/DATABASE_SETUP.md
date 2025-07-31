# Database Setup Guide

This guide will help you set up MongoDB with Mongoose for the CVCircle application.

## 🗄️ Database Models

The application includes the following MongoDB models:

### 1. **User Model** (`src/models/User.ts`)
- User authentication and profile management
- Subscription tracking (Basic, Pro, Unlimited plans)
- Email verification and password reset functionality
- User settings and preferences

### 2. **CV Model** (`src/models/CV.ts`)
- Complete CV/resume data structure
- Multiple sections: Personal Info, Experience, Education, Skills, Projects, etc.
- Template and styling customization
- Version control and metadata tracking

### 3. **JobApplication Model** (`src/models/JobApplication.ts`)
- Job application tracking with Kanban-style status management
- Interview scheduling and follow-up tracking
- Contact management and attachment handling
- Priority and deadline management

### 4. **CoverLetter Model** (`src/models/CoverLetter.ts`)
- Cover letter creation and customization
- Template system and styling options
- Word count tracking and metadata
- Integration with job applications

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install mongoose mongodb bcryptjs @types/bcryptjs
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp env.example .env.local
```

Update the `.env.local` file with your MongoDB connection string:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/cvcircle

# For MongoDB Atlas (recommended for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Next.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-here
```

### 3. MongoDB Setup Options

#### Option A: Local MongoDB Installation

1. **Install MongoDB Community Edition:**
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB service:**
   ```bash
   # macOS (with Homebrew)
   brew services start mongodb-community

   # Windows
   net start MongoDB

   # Linux
   sudo systemctl start mongod
   ```

3. **Create database:**
   ```bash
   mongosh
   use cvcircle
   ```

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. **Create MongoDB Atlas account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a cluster:**
   - Choose the free tier (M0)
   - Select your preferred cloud provider and region

3. **Set up database access:**
   - Create a database user with read/write permissions
   - Whitelist your IP address (or use 0.0.0.0/0 for development)

4. **Get connection string:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string and replace `<password>` with your database password

### 4. Test Database Connection

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the database connection:**
   - Visit: `http://localhost:3001/api/test-db`
   - You should see a success response with collection counts

3. **Create a test user:**
   - Send a POST request to `http://localhost:3001/api/test-db`
   - This will create a test user in the database

## 📊 Database Schema Overview

### User Collection
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  avatar: String (optional),
  isEmailVerified: Boolean,
  subscription: {
    plan: 'basic' | 'pro' | 'unlimited',
    status: 'active' | 'inactive' | 'cancelled',
    startDate: Date,
    endDate: Date (optional),
    seats: Number,
    storageUsed: Number
  },
  settings: {
    theme: 'light' | 'dark' | 'auto',
    notifications: {
      email: Boolean,
      push: Boolean
    }
  }
}
```

### CV Collection
```javascript
{
  userId: ObjectId (ref: User),
  title: String (required),
  template: String (required),
  status: 'draft' | 'published' | 'archived',
  version: Number,
  sections: {
    personalInfo: { /* personal details */ },
    experience: [{ /* work experience */ }],
    education: [{ /* education history */ }],
    skills: [{ /* skills and categories */ }],
    projects: [{ /* project details */ }],
    certifications: [{ /* certifications */ }],
    languages: [{ /* language proficiency */ }],
    customSections: [{ /* custom content */ }]
  },
  styling: { /* visual customization */ },
  metadata: { /* tracking and analytics */ }
}
```

### JobApplication Collection
```javascript
{
  userId: ObjectId (ref: User),
  cvId: ObjectId (ref: CV),
  jobTitle: String (required),
  company: String (required),
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
  priority: 'low' | 'medium' | 'high',
  applicationDate: Date (required),
  deadline: Date (optional),
  contacts: [{ /* contact information */ }],
  interviews: [{ /* interview details */ }],
  followUps: [{ /* follow-up activities */ }],
  attachments: [{ /* file attachments */ }]
}
```

### CoverLetter Collection
```javascript
{
  userId: ObjectId (ref: User),
  cvId: ObjectId (ref: CV),
  jobApplicationId: ObjectId (ref: JobApplication, optional),
  title: String (required),
  template: String (required),
  status: 'draft' | 'final' | 'archived',
  content: {
    salutation: String (required),
    introduction: String (required),
    body: String (required),
    conclusion: String (required),
    signature: String (required)
  },
  customization: { /* styling options */ },
  metadata: { /* tracking and analytics */ }
}
```

## 🔧 Database Utilities

The application includes utility functions in `src/lib/db-utils.ts`:

- **Pagination**: Built-in pagination support for all queries
- **Validation**: Email, password, and ObjectId validation
- **Search**: Text search across multiple fields
- **Error Handling**: Comprehensive error handling for database operations
- **File Management**: Storage size calculation and file size formatting

## 🚨 Important Notes

1. **Security**: Never commit your `.env.local` file to version control
2. **Backup**: Regularly backup your MongoDB data
3. **Indexes**: The models include optimized indexes for better performance
4. **Validation**: All models include comprehensive validation rules
5. **TypeScript**: Full TypeScript support with proper type definitions

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Ensure MongoDB is running
   - Check if the port (27017) is available
   - Verify firewall settings

2. **Authentication Failed:**
   - Check username and password in connection string
   - Ensure database user has proper permissions
   - Verify IP whitelist (for Atlas)

3. **Database Not Found:**
   - MongoDB will create the database automatically on first use
   - Check if the connection string is correct

4. **Validation Errors:**
   - Check the model schemas for required fields
   - Ensure data types match the schema definitions

### Getting Help

- Check the MongoDB logs for detailed error messages
- Use MongoDB Compass for visual database management
- Refer to the [Mongoose documentation](https://mongoosejs.com/docs/)
- Check the [MongoDB documentation](https://docs.mongodb.com/)

## 📈 Performance Optimization

1. **Indexes**: The models include strategic indexes for common queries
2. **Connection Pooling**: Mongoose handles connection pooling automatically
3. **Query Optimization**: Use projection to select only needed fields
4. **Pagination**: Always use pagination for large datasets
5. **Caching**: Consider implementing Redis for frequently accessed data

## 🔄 Database Migrations

For future schema changes, consider using a migration tool like:
- [Mongoose Migrations](https://github.com/seppevs/migrate-mongo)
- [MongoDB Migration Scripts](https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/)

## 🎯 Next Steps

1. Set up authentication system
2. Create API routes for CRUD operations
3. Implement file upload functionality
4. Add email verification system
5. Set up payment processing for subscriptions
6. Implement real-time notifications
7. Add analytics and reporting features 