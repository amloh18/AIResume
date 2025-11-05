# Production Deployment Checklist

## Pre-Deployment Security Checklist

### ✅ Critical Security (MUST FIX)
- [x] **Middleware Authentication**: Re-enabled JWT authentication in middleware.ts
- [x] **CORS Configuration**: Restricted to specific production domains
- [x] **Environment Validation**: Comprehensive validation on startup
- [x] **API Keys**: Removed hardcoded keys from env.example
- [x] **Build Configuration**: Removed ignoreBuildErrors flags

### ✅ Monitoring & Observability
- [x] **Health Check Endpoint**: Created comprehensive /api/health endpoint
- [x] **Structured Logging**: Implemented production-ready logging service
- [x] **Error Tracking**: Sentry integration ready (optional dependency)
- [x] **Performance Monitoring**: Built-in performance tracking

### ✅ Infrastructure
- [x] **Rate Limiting**: Redis-backed rate limiting service
- [x] **Database Backup**: Automated backup strategy with retention
- [x] **Docker Support**: Production-ready Dockerfile
- [x] **SEO Files**: robots.txt and sitemap.xml generation

## Environment Variables Required

### Required for Production
```bash
# Core Application
NEXTAUTH_URL=https://cvcircle.io
NEXTAUTH_SECRET=your-32-character-secret-here
MONGODB_URI=mongodb+srv://...

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Service
EMAIL_SERVER_HOST=smtp.hostinger.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@cvcircle.io
EMAIL_SERVER_PASSWORD=your-email-password

# AI Services
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key

# JWT
JWT_SECRET=your-jwt-secret-here
```

### Optional but Recommended
```bash
# Monitoring
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project

# Backup
BACKUP_DIR=/app/backups
BACKUP_RETENTION_DAYS=30
BACKUP_WEBHOOK_URL=your-webhook-url

# SEO
GOOGLE_SITE_VERIFICATION=your-verification-code

# Payment Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

## Deployment Steps

### 1. Pre-Deployment Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build the application
npm run build

# Test health endpoint
npm run health-check
```

### 2. Environment Setup
1. Copy `env.example` to `.env.production`
2. Fill in all required environment variables
3. Test environment validation: `node -e "require('./src/lib/env')"`

### 3. Database Preparation
```bash
# Create database backup before deployment
npm run backup-database

# Run any pending migrations
npm run migrate-mongodb
```

### 4. Deploy to Production

#### Option A: Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Option B: Docker Deployment
```bash
# Build Docker image
docker build -t cvcircle-app .

# Run container
docker run -p 3000:3000 \
  -e NEXTAUTH_URL=https://cvcircle.io \
  -e NEXTAUTH_SECRET=your-secret \
  -e MONGODB_URI=your-mongodb-uri \
  cvcircle-app
```

#### Option C: Railway/Render Deployment
1. Connect your repository
2. Set environment variables
3. Deploy

### 5. Post-Deployment Verification

#### Health Check
```bash
curl https://cvcircle.io/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": { "status": "connected" },
    "email": { "status": "configured" },
    "ai": { "gemini": "configured", "perplexity": "configured" },
    "payments": { "stripe": "configured", "razorpay": "configured" }
  }
}
```

#### Security Tests
```bash
# Test authentication
curl -I https://cvcircle.io/dashboard
# Should redirect to /sign-in

# Test API protection
curl https://cvcircle.io/api/cvs
# Should return 401 Unauthorized

# Test CORS
curl -H "Origin: https://malicious-site.com" https://cvcircle.io/api/health
# Should not include malicious-site.com in CORS headers
```

#### Performance Tests
```bash
# Test rate limiting
for i in {1..10}; do curl https://cvcircle.io/api/health; done
# Should work normally

# Test slow requests
curl -w "@curl-format.txt" https://cvcircle.io/api/health
```

## Monitoring Setup

### 1. Sentry Integration (Optional)
1. Create Sentry account
2. Create new project
3. Add SENTRY_DSN to environment variables
4. Install Sentry: `npm install @sentry/nextjs`

### 2. Log Monitoring
- Application logs are structured JSON in production
- Set up log aggregation (e.g., LogRocket, DataDog, or ELK stack)

### 3. Database Monitoring
- Set up MongoDB Atlas monitoring
- Configure alerts for connection issues
- Monitor query performance

### 4. Backup Monitoring
```bash
# Set up cron job for automated backups
0 2 * * * cd /app && npm run backup-database

# Monitor backup success
npm run backup-list
```

## Security Hardening

### 1. Headers Verification
Verify these security headers are present:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 2. CORS Verification
- Verify CORS only allows your domains
- Test with different origins

### 3. Authentication Verification
- Test all protected routes require authentication
- Test admin routes require admin role
- Test API routes are properly protected

## Performance Optimization

### 1. Bundle Analysis
```bash
npm run build:analyze
```

### 2. Image Optimization
- Verify images are optimized
- Check Next.js Image component usage

### 3. Caching
- Verify static assets are cached
- Check API response caching

## Troubleshooting

### Common Issues

#### 1. Environment Validation Fails
```bash
# Check environment variables
node -e "console.log(process.env.NEXTAUTH_URL)"
```

#### 2. Database Connection Issues
```bash
# Test database connection
npm run test-mongoose
```

#### 3. Authentication Issues
- Check NEXTAUTH_SECRET is set
- Verify Google OAuth configuration
- Check middleware configuration

#### 4. Build Failures
```bash
# Check TypeScript errors
npm run type-check

# Check ESLint errors
npm run lint
```

### Emergency Procedures

#### 1. Rollback
```bash
# If using Vercel
vercel rollback

# If using Docker
docker run -p 3000:3000 cvcircle-app:previous-version
```

#### 2. Database Recovery
```bash
# Restore from backup
mongorestore --uri="your-mongodb-uri" /path/to/backup
```

#### 3. Emergency Maintenance
```bash
# Put app in maintenance mode
echo "Maintenance in progress" > public/maintenance.html
```

## Success Criteria

- [ ] All health checks pass
- [ ] Authentication works correctly
- [ ] All protected routes are secured
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] Database backups are working
- [ ] Error tracking is functional
- [ ] Performance is acceptable (< 2s load time)
- [ ] SEO files are accessible
- [ ] Security headers are present

## Post-Deployment Tasks

1. **Monitor for 24 hours** - Watch error rates and performance
2. **Test all user flows** - Sign up, login, CV creation, etc.
3. **Set up alerts** - Database, errors, performance
4. **Document any issues** - Update runbook
5. **Schedule regular backups** - Set up cron jobs
6. **Update monitoring dashboards** - Configure alerts

## Support Contacts

- **Technical Issues**: [Your technical contact]
- **Database Issues**: [Your database admin]
- **Infrastructure**: [Your DevOps team]
- **Security Issues**: [Your security team]

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Next Review**: [Next Review Date]
