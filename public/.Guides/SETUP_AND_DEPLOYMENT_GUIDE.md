# Circle CV - Setup and Deployment Guide

This comprehensive guide covers everything needed to set up, configure, and deploy the Circle CV application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Authentication Setup](#authentication-setup)
5. [Email Configuration](#email-configuration)
6. [Deployment Options](#deployment-options)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Software
- **Node.js**: Version 18.0.0 or higher (but less than 25.0.0)
- **npm**: Version 8.0.0 or higher
- **MongoDB**: Database for storing CV data
- **Firebase**: Authentication and hosting
- **Vercel Account**: For deployment (recommended)

### Required Accounts
- **Firebase Account**: For authentication
- **MongoDB Atlas**: For database hosting
- **Hostinger Account**: For email hosting (optional)
- **Vercel Account**: For deployment

## 🌍 Environment Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd Circle_CV_app
npm install
```

### 2. Environment Variables
Create `.env.local` file with the following variables:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle
MONGODB_DB_NAME=cvcircle

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Email Configuration (Hostinger)
EMAIL_SERVER_HOST=smtp.hostinger.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@yourdomain.com
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Vercel Analytics (Optional)
VERCEL_ANALYTICS_ID=your-analytics-id
```

## 🗄️ Database Configuration

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster
   - Choose your preferred region

2. **Configure Database Access**
   ```bash
   # Run the setup script
   npm run setup-mongodb
   ```

3. **Database Collections**
   The application automatically creates these collections:
   - `users` - User accounts and profiles
   - `cvs` - CV documents and data
   - `templates` - CV templates
   - `jobs` - Job applications and tracking
   - `journeys` - Application journeys

### Database Migration
```bash
# Run database migration
npm run migrate-mongodb

# Populate with sample data
npm run populate-mongodb
```

## 🔐 Authentication Setup

### Firebase Authentication

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication

2. **Configure Authentication Providers**
   - Email/Password
   - Google (optional)
   - GitHub (optional)

3. **Download Service Account Key**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Save as `firebase-key.json`

### Google OAuth Setup (Optional)

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **Configure Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

## 📧 Email Configuration

### Hostinger Email Setup

1. **Create Email Account**
   - Login to Hostinger Control Panel
   - Go to Email Accounts section
   - Create `noreply@yourdomain.com`

2. **Configure SMTP Settings**
   ```bash
   EMAIL_SERVER_HOST=smtp.hostinger.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=noreply@yourdomain.com
   EMAIL_SERVER_PASSWORD=your-email-password
   ```

3. **Test Email Configuration**
   ```bash
   node test-hostinger-email.js
   ```

### Email Templates
The system includes professional email templates for:
- Email verification
- Password reset
- Welcome emails
- System notifications

## 🚀 Deployment Options

### Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Set production URLs

3. **Custom Domain (Optional)**
   - Add custom domain in Vercel dashboard
   - Configure DNS settings

### Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   npm start
   ```

2. **Server Requirements**
   - Node.js 18+
   - 512MB RAM minimum
   - 1GB storage minimum

## 🔧 Environment Variables Reference

### Required Variables
```bash
# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=cvcircle

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
```

### Optional Variables
```bash
# Email
EMAIL_SERVER_HOST=smtp.hostinger.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@yourdomain.com
EMAIL_SERVER_PASSWORD=your-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Analytics
VERCEL_ANALYTICS_ID=your-analytics-id
```

## 🛠️ Development Setup

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Type check
npm run type-check
```

### Database Scripts
```bash
# Setup database
npm run setup-mongodb

# Migrate data
npm run migrate-mongodb

# Populate sample data
npm run populate-mongodb

# Generate secrets
npm run generate-secrets
```

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   ```bash
   # Check connection
   npm run test-mongoose
   
   # Fix URI issues
   npm run fix-mongodb-uri
   ```

2. **Firebase Authentication Issues**
   ```bash
   # Test Firebase connection
   npm run test-google-auth
   ```

3. **Email Configuration Issues**
   ```bash
   # Test email setup
   node test-hostinger-email.js
   ```

4. **Build Issues**
   ```bash
   # Check build errors
   npm run build:analyze
   
   # Fix build issues
   npm run fix-firebase-domains
   ```

### Debug Commands
```bash
# Test deployment
npm run test-deployment

# Test CV parsing
npm run test-cv-parsing

# Test job parser
npm run test-job-parser

# Test headless parser
npm run test-headless-parser
```

## 📊 Monitoring and Analytics

### Vercel Analytics
- Automatic performance monitoring
- User behavior tracking
- Error reporting

### Database Monitoring
- MongoDB Atlas monitoring
- Query performance analysis
- Storage usage tracking

## 🔒 Security Considerations

### Environment Security
- Never commit `.env.local` files
- Use strong, unique secrets
- Rotate secrets regularly

### Database Security
- Use MongoDB Atlas security features
- Enable IP whitelisting
- Use strong passwords

### Authentication Security
- Enable email verification
- Use secure session management
- Implement rate limiting

## 📈 Performance Optimization

### Database Optimization
- Create proper indexes
- Use connection pooling
- Monitor query performance

### Application Optimization
- Enable Next.js optimizations
- Use CDN for static assets
- Implement caching strategies

## 🎯 Next Steps

After successful setup:

1. **Test All Features**
   - User registration/login
   - CV creation and editing
   - Template selection
   - Email functionality

2. **Configure Monitoring**
   - Set up error tracking
   - Configure performance monitoring
   - Set up backup procedures

3. **Production Readiness**
   - Security audit
   - Performance testing
   - User acceptance testing

---

**Need Help?** Check the troubleshooting section or contact support for assistance with setup and deployment.
