# Vercel Deployment Troubleshooting Guide

## Login Issues on Vercel

If login is not working when deployed on Vercel, follow these steps to diagnose and fix the issue:

### 1. Environment Variables Setup

**Critical**: Ensure all environment variables are properly configured in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:

```bash
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key
```

**Important Notes:**
- Use MongoDB Atlas (cloud) connection string, not localhost
- Ensure the MongoDB connection string includes authentication
- The connection string should look like: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

### 2. Database Connection Issues

**Common Problems:**
- MongoDB Atlas IP whitelist not configured
- Connection string format incorrect
- Network timeout issues

**Solutions:**
1. **MongoDB Atlas Configuration:**
   - Go to MongoDB Atlas dashboard
   - Navigate to Network Access
   - Add `0.0.0.0/0` to IP Access List (allows all IPs)
   - Or add Vercel's IP ranges

2. **Test Database Connection:**
   - Visit `/api/test-db` on your deployed site
   - Check the response for connection status
   - Review Vercel function logs for errors

### 3. API Route Issues

**CORS Problems:**
- API routes might be blocked by CORS
- Solution: Updated `next.config.ts` with proper headers

**Function Timeout:**
- Vercel has a 10-second timeout for serverless functions
- Solution: Optimized database connection with proper timeouts

### 4. Debugging Steps

1. **Check Vercel Function Logs:**
   ```bash
   # In Vercel dashboard
   Functions → /api/auth/login → View Function Logs
   ```

2. **Test Database Connection:**
   ```bash
   # Visit this URL on your deployed site
   https://your-domain.vercel.app/api/test-db
   ```

3. **Check Environment Variables:**
   ```bash
   # The test endpoint will show if MONGODB_URI is configured
   ```

4. **Browser Console:**
   - Open browser developer tools
   - Check Network tab for API calls
   - Look for CORS errors or timeout issues

### 5. Common Error Messages and Solutions

**"Database connection error"**
- Check MONGODB_URI environment variable
- Verify MongoDB Atlas network access
- Ensure connection string format is correct

**"Service temporarily unavailable"**
- Check Vercel function logs
- Verify database is accessible
- Check for rate limiting

**"Network error"**
- Check internet connection
- Verify API endpoint is accessible
- Check for CORS issues

**"Invalid email or password"**
- Verify user exists in database
- Check password hashing
- Ensure email verification status

### 6. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free cluster

2. **Configure Database Access:**
   - Create database user with read/write permissions
   - Use strong password

3. **Configure Network Access:**
   - Allow access from anywhere (0.0.0.0/0)
   - Or add Vercel's IP ranges

4. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

### 7. Vercel-Specific Optimizations

**Serverless Function Limits:**
- 10-second timeout
- 50MB memory limit
- Cold start delays

**Solutions Implemented:**
- Optimized database connection pooling
- Added proper error handling
- Implemented connection caching
- Added comprehensive logging

### 8. Testing Checklist

- [ ] Environment variables configured in Vercel
- [ ] MongoDB Atlas accessible from Vercel
- [ ] Database connection test passes (`/api/test-db`)
- [ ] Login API endpoint responds (`/api/auth/login`)
- [ ] No CORS errors in browser console
- [ ] User exists in database
- [ ] Password properly hashed
- [ ] Email verification status correct

### 9. Emergency Fixes

**If login still doesn't work:**

1. **Temporarily disable email verification:**
   ```typescript
   // In login route, comment out email verification check
   // if (!user.isEmailVerified) { ... }
   ```

2. **Add more detailed logging:**
   ```typescript
   console.log('User data:', user);
   console.log('Password comparison result:', isPasswordValid);
   ```

3. **Test with a simple user creation:**
   ```typescript
   // Create a test user directly in MongoDB Atlas
   ```

### 10. Contact Support

If issues persist:
1. Check Vercel function logs
2. Review MongoDB Atlas logs
3. Test with the provided debugging endpoints
4. Share error logs and environment setup details

---

**Last Updated:** $(date)
**Version:** 1.0 