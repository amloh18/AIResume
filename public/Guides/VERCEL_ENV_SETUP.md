# Vercel Environment Variables Setup Guide

## Required Environment Variables for Vercel Deployment

Copy these environment variables to your Vercel project settings:

### 1. Database Configuration
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority
```

### 2. AI API Keys
```bash
GEMINI_API_KEY=AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA
PERPLEXITY_API_KEY=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
```

### 3. JWT and Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production-2024
```

### 4. Email Service
```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
```

### 5. File Upload
```bash
UPLOAD_DIR=./public/uploads
```

### 6. Vercel-specific
```bash
VERCEL_ENV=production
VERCEL_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

## How to Add Environment Variables in Vercel

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com](https://vercel.com)
   - Select your project

2. **Navigate to Settings:**
   - Click on your project
   - Go to "Settings" tab
   - Click "Environment Variables"

3. **Add Each Variable:**
   - Click "Add New"
   - Enter the variable name (e.g., `MONGODB_URI`)
   - Enter the variable value
   - Select environment (Production, Preview, Development)
   - Click "Save"

4. **Redeploy:**
   - After adding all variables, redeploy your project
   - Go to "Deployments" tab
   - Click "Redeploy" on your latest deployment

## Critical Variables for Login to Work

**These are the most important variables for login functionality:**

```bash
# 1. MongoDB Connection (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# 2. JWT Secret (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

# 3. NextAuth URL (REQUIRED)
NEXTAUTH_URL=https://your-app-name.vercel.app

# 4. NextAuth Secret (REQUIRED)
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production-2024
```

## MongoDB Atlas Setup

1. **Create MongoDB Atlas Account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free cluster

2. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<dbname>` with `cvcircle`

3. **Configure Network Access:**
   - Go to "Network Access"
   - Add `0.0.0.0/0` to allow all IPs
   - Or add Vercel's IP ranges

## Generate Secure Secrets

For production, generate secure random strings:

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate NextAuth Secret
openssl rand -base64 32
```

## Testing Your Setup

After adding environment variables:

1. **Test Database Connection:**
   ```
   https://your-app-name.vercel.app/api/test-db
   ```

2. **Check Login Endpoint:**
   ```
   https://your-app-name.vercel.app/api/auth/login
   ```

3. **Run Deployment Test:**
   ```bash
   npm run test-deployment
   ```

## Troubleshooting

**If login still doesn't work:**

1. **Check Vercel Function Logs:**
   - Go to Functions → `/api/auth/login`
   - Check for environment variable errors

2. **Verify MongoDB Connection:**
   - Test with `/api/test-db` endpoint
   - Check if `MONGODB_URI` is correctly set

3. **Common Issues:**
   - Missing `MONGODB_URI` variable
   - Incorrect connection string format
   - MongoDB Atlas network access not configured
   - JWT secret not set

## Security Notes

- Never commit `.env` files to git
- Use strong, unique secrets for production
- Regularly rotate API keys and secrets
- Monitor Vercel function logs for security issues

---

**Last Updated:** $(date)
**Version:** 1.0 