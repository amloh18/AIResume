# Circle CV - Troubleshooting and Maintenance Guide

This comprehensive guide covers common issues, troubleshooting steps, and maintenance procedures for the Circle CV application.

## 📋 Table of Contents

1. [Common Issues](#common-issues)
2. [Authentication Problems](#authentication-problems)
3. [Database Issues](#database-issues)
4. [Email Configuration](#email-configuration)
5. [Performance Issues](#performance-issues)
6. [Build and Deployment](#build-and-deployment)
7. [Chrome Extension Issues](#chrome-extension-issues)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Recovery Procedures](#recovery-procedures)

## 🚨 Common Issues

### Application Won't Start

#### Issue: "Module not found" errors
**Symptoms:**
- Application fails to start
- Missing module errors in console
- Build failures

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing dependencies
npm ls --depth=0

# Install missing dependencies
npm install <missing-package>
```

#### Issue: Port already in use
**Symptoms:**
- "Port 3000 is already in use" error
- Application won't start

**Solutions:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
npm run dev -- -p 3001
```

### Database Connection Issues

#### Issue: MongoDB connection failed
**Symptoms:**
- "MongoDB connection failed" errors
- Database operations timing out
- User data not loading

**Solutions:**
```bash
# Test MongoDB connection
npm run test-mongoose

# Fix MongoDB URI issues
npm run fix-mongodb-uri

# Check environment variables
echo $MONGODB_URI
```

#### Issue: Database authentication failed
**Symptoms:**
- "Authentication failed" errors
- Database connection refused

**Solutions:**
1. **Check MongoDB Atlas settings:**
   - Verify database user credentials
   - Check IP whitelist settings
   - Ensure database user has proper permissions

2. **Update connection string:**
   ```bash
   # Update MongoDB URI in .env.local
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle
   ```

3. **Test connection:**
   ```bash
   node scripts/test-mongoose.js
   ```

### Build Errors

#### Issue: WebAssembly build errors
**Symptoms:**
- "WebAssembly module not found" errors
- Build failures with sharp or other native modules

**Solutions:**
```bash
# Clear build cache
rm -rf .next
npm run build

# Reinstall native modules
npm uninstall sharp
npm install sharp

# Use alternative image processing
npm install @img/sharp-libvips-darwin-arm64
```

#### Issue: TypeScript compilation errors
**Symptoms:**
- TypeScript type errors
- Build failures

**Solutions:**
```bash
# Check TypeScript configuration
npm run type-check

# Fix type errors
# Update type definitions
npm install @types/node @types/react @types/react-dom

# Regenerate type definitions
npm run type-check -- --noEmit
```

## 🔐 Authentication Problems

### Firebase Authentication Issues

#### Issue: Firebase configuration errors
**Symptoms:**
- "Firebase configuration not found" errors
- Authentication not working
- User sessions not persisting

**Solutions:**
1. **Check Firebase configuration:**
   ```bash
   # Verify environment variables
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_CLIENT_EMAIL
   echo $FIREBASE_PRIVATE_KEY
   ```

2. **Update Firebase configuration:**
   ```bash
   # Download new service account key
   # Update firebase-key.json
   # Update environment variables
   ```

3. **Test Firebase connection:**
   ```bash
   node scripts/test-google-auth.js
   ```

#### Issue: Google OAuth not working
**Symptoms:**
- Google sign-in button not working
- OAuth redirect errors
- "Invalid client" errors

**Solutions:**
1. **Check Google OAuth settings:**
   - Verify client ID and secret
   - Check authorized redirect URIs
   - Ensure OAuth consent screen is configured

2. **Update OAuth configuration:**
   ```bash
   # Update environment variables
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Test OAuth flow:**
   ```bash
   node scripts/test-google-oauth.js
   ```

### NextAuth.js Issues

#### Issue: Session not persisting
**Symptoms:**
- User logged out unexpectedly
- Session data not available
- Authentication state inconsistent

**Solutions:**
1. **Check NextAuth configuration:**
   ```typescript
   // Verify NextAuth configuration
   export default NextAuth({
     providers: [...],
     adapter: FirebaseAdapter(firebaseConfig),
     callbacks: {
       async session({ session, user }) {
         // Ensure session data is properly set
         return session;
       }
     }
   });
   ```

2. **Clear session data:**
   ```bash
   # Clear browser cookies
   # Clear localStorage
   # Restart application
   ```

## 🗄️ Database Issues

### MongoDB Atlas Issues

#### Issue: Connection timeout
**Symptoms:**
- Database operations timing out
- Slow query performance
- Connection pool exhausted

**Solutions:**
1. **Check MongoDB Atlas settings:**
   - Verify cluster status
   - Check connection limits
   - Monitor resource usage

2. **Optimize connection settings:**
   ```typescript
   // Update MongoDB connection options
   const options = {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
     bufferMaxEntries: 0
   };
   ```

3. **Monitor database performance:**
   ```bash
   # Check database performance
   npm run test-mongoose
   ```

#### Issue: Data corruption
**Symptoms:**
- Inconsistent data
- Missing records
- Application errors

**Solutions:**
1. **Backup database:**
   ```bash
   # Create database backup
   mongodump --uri="mongodb+srv://..." --out=backup/
   ```

2. **Restore from backup:**
   ```bash
   # Restore database from backup
   mongorestore --uri="mongodb+srv://..." backup/
   ```

3. **Data validation:**
   ```bash
   # Validate data integrity
   node scripts/validate-database.js
   ```

### Schema Migration Issues

#### Issue: Schema validation errors
**Symptoms:**
- Data validation failures
- Schema mismatch errors
- Application crashes

**Solutions:**
1. **Run schema migration:**
   ```bash
   # Migrate database schema
   npm run migrate-mongodb
   ```

2. **Validate schema:**
   ```bash
   # Check schema compatibility
   node scripts/validate-schema.js
   ```

3. **Fix data inconsistencies:**
   ```bash
   # Clean up inconsistent data
   node scripts/cleanup-database.js
   ```

## 📧 Email Configuration

### Hostinger Email Issues

#### Issue: SMTP authentication failed
**Symptoms:**
- "Authentication failed" errors
- Email sending failures
- SMTP connection errors

**Solutions:**
1. **Check SMTP settings:**
   ```bash
   # Verify SMTP configuration
   EMAIL_SERVER_HOST=smtp.hostinger.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=noreply@yourdomain.com
   EMAIL_SERVER_PASSWORD=your-password
   ```

2. **Test email configuration:**
   ```bash
   # Test email setup
   node test-hostinger-email.js
   ```

3. **Check Hostinger settings:**
   - Verify email account is active
   - Check SMTP settings in Hostinger control panel
   - Ensure email account has proper permissions

#### Issue: Emails not delivered
**Symptoms:**
- Emails sent but not received
- Spam folder issues
- Delivery failures

**Solutions:**
1. **Check email templates:**
   ```bash
   # Test email templates
   node scripts/test-email-templates.js
   ```

2. **Verify email content:**
   - Check for spam triggers
   - Verify email headers
   - Test with different email providers

3. **Monitor email delivery:**
   ```bash
   # Check email delivery logs
   node scripts/monitor-email-delivery.js
   ```

### Firebase Email Issues

#### Issue: Firebase email not working
**Symptoms:**
- Firebase email service errors
- Email verification failures
- Password reset emails not sent

**Solutions:**
1. **Check Firebase email settings:**
   - Verify Firebase project configuration
   - Check email templates
   - Ensure email service is enabled

2. **Test Firebase email:**
   ```bash
   # Test Firebase email service
   node scripts/test-firebase-email.js
   ```

3. **Update email configuration:**
   ```bash
   # Update Firebase email settings
   npm run fix-firebase-domains
   ```

## ⚡ Performance Issues

### Slow Application Performance

#### Issue: Slow page loads
**Symptoms:**
- Long loading times
- Slow API responses
- Poor user experience

**Solutions:**
1. **Optimize database queries:**
   ```typescript
   // Add database indexes
   db.cvs.createIndex({ "userId": 1 });
   db.jobs.createIndex({ "userId": 1, "status": 1 });
   ```

2. **Implement caching:**
   ```typescript
   // Add Redis caching
   const cached = await redis.get(key);
   if (cached) return JSON.parse(cached);
   ```

3. **Optimize images:**
   ```bash
   # Optimize images
   npm install sharp
   # Use image optimization
   ```

#### Issue: Memory leaks
**Symptoms:**
- High memory usage
- Application crashes
- Slow performance over time

**Solutions:**
1. **Monitor memory usage:**
   ```bash
   # Check memory usage
   node --inspect scripts/monitor-memory.js
   ```

2. **Fix memory leaks:**
   - Remove event listeners
   - Clear timers and intervals
   - Dispose of resources properly

3. **Optimize code:**
   ```typescript
   // Use proper cleanup
   useEffect(() => {
     return () => {
       // Cleanup code
     };
   }, []);
   ```

### Database Performance

#### Issue: Slow database queries
**Symptoms:**
- Long query execution times
- Database timeouts
- Poor application performance

**Solutions:**
1. **Add database indexes:**
   ```javascript
   // Create indexes for common queries
   db.cvs.createIndex({ "userId": 1, "createdAt": -1 });
   db.jobs.createIndex({ "userId": 1, "status": 1, "createdAt": -1 });
   ```

2. **Optimize queries:**
   ```typescript
   // Use projection to limit fields
   const cvs = await db.cvs.find({ userId }, { 
     projection: { title: 1, createdAt: 1 } 
   });
   ```

3. **Monitor query performance:**
   ```bash
   # Check slow queries
   node scripts/monitor-database-performance.js
   ```

## 🚀 Build and Deployment

### Build Failures

#### Issue: Build errors
**Symptoms:**
- Build process fails
- TypeScript errors
- Missing dependencies

**Solutions:**
1. **Clear build cache:**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Fix TypeScript errors:**
   ```bash
   # Check TypeScript errors
   npm run type-check
   
   # Fix type errors
   # Update type definitions
   ```

3. **Update dependencies:**
   ```bash
   # Update all dependencies
   npm update
   
   # Check for security vulnerabilities
   npm audit
   npm audit fix
   ```

#### Issue: Deployment failures
**Symptoms:**
- Vercel deployment fails
- Environment variable errors
- Build timeout

**Solutions:**
1. **Check environment variables:**
   ```bash
   # Verify all required environment variables
   # Check Vercel environment settings
   ```

2. **Optimize build process:**
   ```bash
   # Reduce build time
   npm run build:analyze
   
   # Optimize bundle size
   npm run build:optimize
   ```

3. **Fix deployment issues:**
   ```bash
   # Test deployment locally
   npm run build
   npm start
   ```

### Vercel Deployment Issues

#### Issue: Vercel build failures
**Symptoms:**
- Vercel deployment fails
- Build timeout errors
- Environment variable issues

**Solutions:**
1. **Check Vercel configuration:**
   ```json
   // vercel.json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs"
   }
   ```

2. **Update environment variables:**
   ```bash
   # Set environment variables in Vercel dashboard
   # Check all required variables are set
   ```

3. **Optimize build process:**
   ```bash
   # Reduce build time
   # Optimize dependencies
   # Use build caching
   ```

## 🔧 Chrome Extension Issues

### Extension Not Working

#### Issue: Extension not loading
**Symptoms:**
- Extension not appearing in Chrome
- Content scripts not running
- Popup not opening

**Solutions:**
1. **Check extension manifest:**
   ```json
   // Verify manifest.json
   {
     "manifest_version": 3,
     "permissions": ["activeTab", "storage"],
     "content_scripts": [...]
   }
   ```

2. **Reload extension:**
   ```bash
   # Reload extension in Chrome
   # Check for errors in console
   # Verify permissions
   ```

3. **Test extension:**
   ```bash
   # Test extension functionality
   npm run test:extension
   ```

#### Issue: Content script errors
**Symptoms:**
- Content scripts not injecting
- JavaScript errors in console
- Extension functionality not working

**Solutions:**
1. **Check content script code:**
   ```javascript
   // Verify content script is properly loaded
   console.log('Content script loaded');
   ```

2. **Fix JavaScript errors:**
   ```bash
   # Check for syntax errors
   # Fix runtime errors
   # Test content script functionality
   ```

3. **Update extension:**
   ```bash
   # Update extension code
   # Reload extension
   # Test functionality
   ```

### API Integration Issues

#### Issue: API calls failing
**Symptoms:**
- Extension can't connect to API
- Authentication errors
- Data not syncing

**Solutions:**
1. **Check API configuration:**
   ```javascript
   // Verify API endpoints
   const API_BASE_URL = 'https://api.circlecv.com';
   ```

2. **Test API connectivity:**
   ```bash
   # Test API endpoints
   curl -X GET https://api.circlecv.com/health
   ```

3. **Fix authentication:**
   ```javascript
   // Check authentication token
   const token = await chrome.storage.local.get(['authToken']);
   ```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks
- **Monitor application health:**
  ```bash
  # Check application status
  npm run health-check
  ```

- **Monitor database performance:**
  ```bash
  # Check database metrics
  npm run monitor-database
  ```

- **Check error logs:**
  ```bash
  # Review error logs
  npm run check-logs
  ```

#### Weekly Tasks
- **Update dependencies:**
  ```bash
  # Check for updates
  npm outdated
  
  # Update dependencies
  npm update
  ```

- **Run security audit:**
  ```bash
  # Check for vulnerabilities
  npm audit
  npm audit fix
  ```

- **Backup database:**
  ```bash
  # Create database backup
  npm run backup-database
  ```

#### Monthly Tasks
- **Performance review:**
  ```bash
  # Analyze performance metrics
  npm run analyze-performance
  ```

- **Security review:**
  ```bash
  # Review security settings
  npm run security-review
  ```

- **Update documentation:**
  ```bash
  # Update documentation
  npm run update-docs
  ```

### Database Maintenance

#### Database Cleanup
```bash
# Clean up old data
node scripts/cleanup-database.js

# Remove unused collections
node scripts/remove-unused-collections.js

# Optimize database
node scripts/optimize-database.js
```

#### Data Migration
```bash
# Run database migrations
npm run migrate-mongodb

# Validate data integrity
npm run validate-data

# Fix data inconsistencies
npm run fix-data-inconsistencies
```

### Application Updates

#### Code Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run database migrations
npm run migrate-mongodb

# Restart application
npm run restart
```

#### Configuration Updates
```bash
# Update environment variables
# Update configuration files
# Test configuration changes
npm run test-config
```

## 📊 Monitoring and Logging

### Application Monitoring

#### Health Checks
```bash
# Check application health
npm run health-check

# Check database connectivity
npm run check-database

# Check external services
npm run check-external-services
```

#### Performance Monitoring
```bash
# Monitor performance metrics
npm run monitor-performance

# Check memory usage
npm run monitor-memory

# Check CPU usage
npm run monitor-cpu
```

### Error Logging

#### Log Management
```bash
# View application logs
npm run view-logs

# Clear old logs
npm run clear-logs

# Export logs
npm run export-logs
```

#### Error Tracking
```bash
# Check error rates
npm run check-error-rates

# Analyze error patterns
npm run analyze-errors

# Fix common errors
npm run fix-common-errors
```

### Database Monitoring

#### Database Health
```bash
# Check database health
npm run check-database-health

# Monitor query performance
npm run monitor-query-performance

# Check connection pool
npm run check-connection-pool
```

#### Data Integrity
```bash
# Validate data integrity
npm run validate-data-integrity

# Check for data corruption
npm run check-data-corruption

# Fix data issues
npm run fix-data-issues
```

## 🔄 Recovery Procedures

### Application Recovery

#### Complete System Recovery
```bash
# Stop application
npm run stop

# Restore from backup
npm run restore-from-backup

# Restart application
npm run start
```

#### Database Recovery
```bash
# Stop database operations
npm run stop-database

# Restore database from backup
npm run restore-database

# Restart database
npm run start-database
```

### Data Recovery

#### User Data Recovery
```bash
# Restore user data
npm run restore-user-data

# Fix user accounts
npm run fix-user-accounts

# Restore user sessions
npm run restore-user-sessions
```

#### CV Data Recovery
```bash
# Restore CV data
npm run restore-cv-data

# Fix CV templates
npm run fix-cv-templates

# Restore user CVs
npm run restore-user-cvs
```

### Emergency Procedures

#### Emergency Shutdown
```bash
# Emergency stop
npm run emergency-stop

# Clear sensitive data
npm run clear-sensitive-data

# Notify administrators
npm run notify-admins
```

#### Emergency Recovery
```bash
# Emergency restore
npm run emergency-restore

# Restore critical services
npm run restore-critical-services

# Verify system integrity
npm run verify-system-integrity
```

---

This comprehensive troubleshooting and maintenance guide provides everything needed to keep the Circle CV application running smoothly and resolve any issues that may arise.
