# Vercel Setup Checklist

## 🚀 Quick Setup Steps

### 1. Generate Secure Secrets
```bash
npm run generate-secrets
```
This will generate secure JWT and NextAuth secrets for you.

### 2. Set Up MongoDB Atlas
- [ ] Create MongoDB Atlas account
- [ ] Create a free cluster
- [ ] Create database user with read/write permissions
- [ ] Configure network access (add `0.0.0.0/0`)
- [ ] Get connection string

### 3. Add Environment Variables to Vercel
Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

#### Critical (Required for Login)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority
JWT_SECRET=your-generated-jwt-secret
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-generated-nextauth-secret
```

#### Optional (For Full Functionality)
```bash
GEMINI_API_KEY=AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA
PERPLEXITY_API_KEY=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
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
UPLOAD_DIR=./public/uploads
VERCEL_ENV=production
NODE_ENV=production
```

### 4. Deploy to Vercel
- [ ] Push your code to GitHub
- [ ] Connect repository to Vercel
- [ ] Deploy automatically

### 5. Test Your Deployment
```bash
npm run test-deployment
```

Or manually test:
- [ ] Visit `/api/test-db` - Should show database connection
- [ ] Visit `/api/auth/login` - Should respond (even if no user)
- [ ] Try logging in with existing user

### 6. Troubleshoot if Needed
- [ ] Check Vercel function logs
- [ ] Verify environment variables are set
- [ ] Test database connection
- [ ] Review troubleshooting guide

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Database connection error" | Check MONGODB_URI in Vercel |
| "Invalid email or password" | Verify user exists in database |
| "Service unavailable" | Check Vercel function logs |
| CORS errors | Already fixed in next.config.ts |

## 📞 Need Help?

1. Check `VERCEL_DEPLOYMENT_TROUBLESHOOTING.md`
2. Run `npm run test-deployment`
3. Check Vercel function logs
4. Verify MongoDB Atlas configuration

---

**Status:** Ready for deployment ✅ 