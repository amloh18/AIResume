# CVCircle.io - Vercel Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in Vercel:

#### Authentication
- `NEXTAUTH_SECRET` - Next-Auth secret key
- `NEXTAUTH_URL` - Your production URL (e.g., https://cvcircle.io)

#### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

#### Database
- `MONGODB_URI` - MongoDB connection string

#### Payment (Optional)
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

#### AI Services (Optional)
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

### 2. Build Configuration
The project is configured with:
- **Framework**: Next.js 14+ (App Router)
- **Node Version**: 18.x or higher
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Domain Configuration
1. Add your custom domain in Vercel
2. Update `NEXTAUTH_URL` to match your production domain
3. Update Firebase authorized domains

### 4. Database Setup
1. Ensure MongoDB Atlas is accessible from Vercel IPs
2. Whitelist Vercel IP addresses in MongoDB Network Access
3. Test database connectivity

## Deployment Steps

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option 2: Deploy via GitHub Integration
1. Push code to GitHub
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Deploy

### Option 3: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Configure environment variables
5. Deploy

## Post-Deployment

### 1. Verify Deployment
- [ ] Homepage loads correctly
- [ ] Authentication works (sign in/sign up)
- [ ] Database connections are working
- [ ] API routes respond correctly
- [ ] File uploads work
- [ ] Email functionality works

### 2. Performance Optimization
- Enable Vercel Analytics
- Configure Edge Functions if needed
- Set up monitoring and alerts
- Review build logs for warnings

### 3. Security
- Verify CORS settings
- Check API rate limiting
- Review security headers
- Ensure sensitive data is not exposed

## Troubleshooting

### Build Errors
- Check TypeScript errors: `npm run type-check`
- Review build logs in Vercel dashboard
- Ensure all dependencies are installed

### Runtime Errors
- Check Function Logs in Vercel
- Verify environment variables are set correctly
- Review API route responses

### Database Connection Issues
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas
- Ensure network access is configured

## Monitoring

### Recommended Tools
- Vercel Analytics (built-in)
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for user analytics

## Maintenance

### Regular Tasks
- Monitor error rates
- Review performance metrics
- Update dependencies regularly
- Backup database regularly
- Review and optimize bundle size

## Support
For issues, contact the development team or check the logs in Vercel Dashboard.

