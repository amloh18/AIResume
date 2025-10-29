# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup

Ensure all required environment variables are set in your production environment:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle

# Authentication
NEXTAUTH_URL=https://cvcircle.io
NEXTAUTH_SECRET=your-super-secret-nextauth-key
JWT_SECRET=your-super-secret-jwt-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_REDIRECT_URI=https://cvcircle.io/api/calendar/callback

# Email Service
EMAIL_SERVER_HOST=smtp.hostinger.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@cvcircle.io
EMAIL_SERVER_PASSWORD=your-email-password

# AI Services
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

RAZORPAY_KEY_ID=rzp_live_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cvcircle-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cvcircle-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cvcircle-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=443355117710
NEXT_PUBLIC_FIREBASE_APP_ID=1:443355117710:web:08a40d5020a53ff037f1df
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LLY6JFVE1W
FIREBASE_PROJECT_ID=cvcircle-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cvcircle-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# File Upload
UPLOAD_DIR=./public/uploads

# Error Tracking (Optional)
ERROR_TRACKING_SERVICE=sentry
SENTRY_DSN=your-sentry-dsn

# Redis (Optional, for rate limiting)
REDIS_URL=redis://your-redis-url

# Backup Configuration
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=your-backup-bucket
AWS_REGION=us-east-1
```

### 2. Database Setup

1. **Create MongoDB Atlas cluster** (recommended for production)
2. **Set up database indexes** for optimal performance
3. **Configure backup strategy** using the provided backup script
4. **Set up monitoring** for database performance

```bash
# Run database backup script
node scripts/backup-database.js
```

### 3. Security Configuration

1. **Update CORS settings** in `next.config.ts` with your production domains
2. **Configure SSL certificates** for HTTPS
3. **Set up security headers** (already configured in Next.js config)
4. **Enable rate limiting** (Redis recommended for production)

### 4. Monitoring Setup

1. **Set up error tracking** (Sentry recommended)
2. **Configure application monitoring** (New Relic, DataDog, etc.)
3. **Set up log aggregation** (ELK stack, CloudWatch, etc.)
4. **Configure uptime monitoring** (Pingdom, UptimeRobot, etc.)

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Configure custom domain** in Vercel settings
4. **Enable automatic deployments** from main branch

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Option 2: Docker Deployment

1. **Build Docker image**:
```bash
docker build -t cvcircle-app .
```

2. **Run container**:
```bash
docker run -p 3000:3000 \
  -e MONGODB_URI=your-mongodb-uri \
  -e NEXTAUTH_URL=https://cvcircle.io \
  -e NEXTAUTH_SECRET=your-secret \
  cvcircle-app
```

3. **Use Docker Compose** for multi-container setup:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Option 3: Railway

1. **Connect GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Configure custom domain** in Railway settings
4. **Deploy automatically** on push to main branch

### Option 4: Render

1. **Connect GitHub repository** to Render
2. **Set environment variables** in Render dashboard
3. **Configure custom domain** in Render settings
4. **Deploy automatically** on push to main branch

## Post-Deployment Steps

### 1. Health Check

Verify the application is running correctly:

```bash
# Check health endpoint
curl https://cvcircle.io/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "responseTime": 50 },
    "logsDatabase": { "status": "healthy", "responseTime": 30 },
    "environment": { "status": "healthy", "missingVars": [], "errors": [] },
    "memory": { "status": "healthy", "used": 100, "total": 512, "percentage": 19.5 },
    "externalServices": {
      "gemini": "healthy",
      "email": "healthy",
      "stripe": "healthy",
      "razorpay": "healthy"
    }
  }
}
```

### 2. SSL Certificate

Ensure SSL certificate is properly configured:

```bash
# Check SSL certificate
openssl s_client -connect cvcircle.io:443 -servername cvcircle.io
```

### 3. DNS Configuration

Configure DNS records:

```
A    @           -> your-server-ip
CNAME www        -> cvcircle.io
CNAME api        -> cvcircle.io
CNAME admin      -> cvcircle.io
```

### 4. CDN Setup (Optional)

Configure CDN for static assets:

1. **CloudFlare** (recommended)
2. **AWS CloudFront**
3. **Vercel Edge Network** (if using Vercel)

### 5. Monitoring Setup

1. **Set up uptime monitoring**:
   - Pingdom
   - UptimeRobot
   - StatusCake

2. **Configure error tracking**:
   - Sentry
   - LogRocket
   - Bugsnag

3. **Set up performance monitoring**:
   - New Relic
   - DataDog
   - Vercel Analytics

## Maintenance

### 1. Regular Backups

Set up automated database backups:

```bash
# Add to crontab for daily backups
0 2 * * * /usr/bin/node /path/to/scripts/backup-database.js
```

### 2. Security Updates

- **Keep dependencies updated**
- **Monitor security advisories**
- **Regular security audits**

### 3. Performance Monitoring

- **Monitor Core Web Vitals**
- **Track API response times**
- **Monitor database performance**
- **Set up alerts for anomalies**

### 4. Log Management

- **Set up log rotation**
- **Configure log retention**
- **Monitor error rates**
- **Set up log-based alerts**

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify TypeScript errors
   - Check dependency versions

2. **Runtime Errors**
   - Check application logs
   - Verify database connectivity
   - Check external service availability

3. **Performance Issues**
   - Monitor memory usage
   - Check database query performance
   - Verify CDN configuration

4. **Authentication Issues**
   - Verify JWT secret
   - Check OAuth configuration
   - Verify session configuration

### Debug Commands

```bash
# Check application logs
docker logs cvcircle-app

# Check database connectivity
mongosh "your-mongodb-uri"

# Check Redis connectivity
redis-cli -u "your-redis-url"

# Check environment variables
printenv | grep -E "(MONGODB|NEXTAUTH|GOOGLE|STRIPE)"
```

## Scaling Considerations

### 1. Horizontal Scaling

- **Use load balancer** for multiple instances
- **Configure session storage** (Redis recommended)
- **Set up database read replicas**

### 2. Vertical Scaling

- **Increase server resources** as needed
- **Optimize database queries**
- **Use caching strategies**

### 3. CDN Configuration

- **Cache static assets**
- **Configure edge locations**
- **Set up cache invalidation**

## Security Best Practices

1. **Regular security audits**
2. **Keep dependencies updated**
3. **Monitor for vulnerabilities**
4. **Use HTTPS everywhere**
5. **Implement rate limiting**
6. **Set up intrusion detection**
7. **Regular backup testing**
8. **Access control monitoring**

## Support

For production support:

1. **Check application logs** first
2. **Verify health endpoint** status
3. **Check external service status**
4. **Review monitoring dashboards**
5. **Contact support team** if needed

## Emergency Procedures

### 1. Application Down

1. **Check health endpoint**
2. **Review recent deployments**
3. **Check server resources**
4. **Rollback if necessary**

### 2. Database Issues

1. **Check database connectivity**
2. **Review database logs**
3. **Check backup availability**
4. **Restore from backup if needed**

### 3. Security Incident

1. **Isolate affected systems**
2. **Review access logs**
3. **Change compromised credentials**
4. **Notify security team**
5. **Document incident**

Remember to test all procedures in a staging environment before applying to production.
