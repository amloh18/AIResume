# Vercel Deployment Guide

## 🚀 **Pre-Deployment Checklist**

### **0. Configuration Files**
✅ **vercel.json** - Updated to use modern Vercel configuration (no incompatible `builds` and `functions` properties)
✅ **next.config.ts** - Optimized for Vercel deployment with proper function handling
✅ **package.json** - Correct Node.js version requirements

### **1. Environment Variables Setup**

Set these environment variables in your Vercel project dashboard:

#### **Database Configuration**
```
MONGODB_URI=your-mongodb-atlas-connection-string
```

#### **Authentication & Security**
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-nextauth-key
JWT_SECRET=your-super-secret-jwt-key
```

#### **AI API Keys**
```
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

#### **Firebase Configuration**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

#### **Payment Processing**
```
# Stripe (Global)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay (India)
RAZORPAY_KEY_ID=rzp_live_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

#### **Email Service**
```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
```

### **2. MongoDB Atlas Setup**

1. **Create MongoDB Atlas Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a new cluster (M0 Free tier works for development)
   - Set up database access with username/password
   - Configure network access (allow all IPs: 0.0.0.0/0)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Add `?retryWrites=true&w=majority` at the end

3. **Set Environment Variable**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority
   ```

### **3. Firebase Setup**

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication (Google, Email/Password)
   - Enable Firestore Database

2. **Get Configuration**
   - Go to Project Settings
   - Scroll down to "Your apps"
   - Add a web app
   - Copy the configuration object

3. **Set Environment Variables**
   - Use the values from the Firebase config object

### **4. Payment Providers Setup**

#### **Stripe (Global)**
1. Create account at [Stripe](https://stripe.com)
2. Get API keys from Dashboard
3. Set up webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`

#### **Razorpay (India)**
1. Create account at [Razorpay](https://razorpay.com)
2. Get API keys from Dashboard
3. Set up webhook endpoint: `https://your-domain.vercel.app/api/webhooks/razorpay`

## 🚀 **Deployment Steps**

### **1. Quick Deployment (Recommended)**

Use the provided deployment script:
```bash
./deploy.sh
```

This script will:
- Check if Vercel CLI is installed
- Verify login status
- Build the project
- Deploy to Vercel

### **2. Manual Deployment**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### **2. Environment Variables in Vercel**

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the environment variables listed above
4. Make sure to set them for "Production" environment

### **3. Custom Domain (Optional)**

1. Go to your Vercel project dashboard
2. Navigate to Settings → Domains
3. Add your custom domain
4. Update `NEXTAUTH_URL` to match your custom domain

## 🔧 **Post-Deployment Configuration**

### **1. Database Initialization**

After deployment, you may need to initialize your database:

1. **Create Collections**
   ```javascript
   // Run this in MongoDB Atlas shell or MongoDB Compass
   db.createCollection("users")
   db.createCollection("cvs")
   db.createCollection("jobapplications")
   db.createCollection("coverletters")
   db.createCollection("templates")
   db.createCollection("pricingplans")
   db.createCollection("subscriptions")
   db.createCollection("invoices")
   db.createCollection("discountcodes")
   db.createCollection("aiusagelogs")
   db.createCollection("betasignups")
   ```

2. **Create Indexes**
   ```javascript
   // Users collection
   db.users.createIndex({ "email": 1 }, { unique: true })
   db.users.createIndex({ "subscription.status": 1 })
   
   // CVs collection
   db.cvs.createIndex({ "userId": 1, "status": 1 })
   db.cvs.createIndex({ "userId": 1, "createdAt": -1 })
   
   // Job Applications collection
   db.jobapplications.createIndex({ "userId": 1, "status": 1 })
   db.jobapplications.createIndex({ "userId": 1, "createdAt": -1 })
   
   // Cover Letters collection
   db.coverletters.createIndex({ "userId": 1, "status": 1 })
   db.coverletters.createIndex({ "userId": 1, "createdAt": -1 })
   ```

### **2. Admin User Creation**

Create an admin user for the application:

1. **Sign up normally** through the app
2. **Update user role** in MongoDB:
   ```javascript
   db.users.updateOne(
     { "email": "admin@example.com" },
     { $set: { "role": "admin" } }
   )
   ```

### **3. Test All Features**

After deployment, test these features:

- [ ] User registration and login
- [ ] CV creation and editing
- [ ] Job application tracking
- [ ] AI assistant functionality
- [ ] Payment processing
- [ ] Email notifications
- [ ] File uploads
- [ ] Admin dashboard

## 🐛 **Troubleshooting**

### **Vercel Configuration Issues**

1. **"functions property cannot be used in conjunction with builds property"**
   - ✅ **Fixed**: Updated `vercel.json` to use modern configuration
   - **Solution**: Use the updated `vercel.json` file provided

2. **Build failures due to optional dependencies**
   - ✅ **Fixed**: Configured webpack to handle tesseract.js, canvas, puppeteer
   - **Solution**: The `next.config.ts` handles these automatically

3. **Function timeout issues**
   - **Solution**: Vercel automatically handles timeouts for Next.js API routes
   - **Default**: 10 seconds for Hobby plan, 60 seconds for Pro plan

### **Common Issues**

1. **Build Failures**
   - Check that all environment variables are set
   - Ensure MongoDB connection string is correct
   - Verify Firebase configuration

2. **Database Connection Issues**
   - Check MongoDB Atlas network access
   - Verify connection string format
   - Ensure database user has correct permissions

3. **Authentication Issues**
   - Verify `NEXTAUTH_URL` matches your domain
   - Check `NEXTAUTH_SECRET` is set
   - Ensure Firebase configuration is correct

4. **Payment Issues**
   - Verify Stripe/Razorpay API keys
   - Check webhook endpoints are configured
   - Ensure webhook secrets are set correctly

### **Performance Optimization**

1. **Enable Vercel Analytics**
   - Already configured in the app
   - Monitor performance in Vercel dashboard

2. **Database Optimization**
   - Monitor query performance in MongoDB Atlas
   - Add indexes for slow queries
   - Use connection pooling

3. **CDN Configuration**
   - Vercel automatically provides CDN
   - Static assets are optimized

## 📊 **Monitoring**

### **Vercel Dashboard**
- Monitor function execution times
- Check for errors and logs
- Track performance metrics

### **MongoDB Atlas**
- Monitor database performance
- Check connection usage
- Track query performance

### **Application Logs**
- Check Vercel function logs
- Monitor API response times
- Track user activity

## 🔒 **Security Checklist**

- [ ] All environment variables are set
- [ ] Database connection is secure
- [ ] Authentication is working
- [ ] Payment processing is secure
- [ ] File uploads are restricted
- [ ] CORS is configured correctly
- [ ] Rate limiting is in place
- [ ] HTTPS is enforced

## 🎉 **Deployment Complete!**

Your CVCircle application is now deployed and ready for production use!

### **Next Steps**
1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure backup strategies
4. Plan for scaling as needed
5. Set up CI/CD for future updates

---

**Need Help?**
- Check Vercel documentation: https://vercel.com/docs
- MongoDB Atlas documentation: https://docs.atlas.mongodb.com
- Firebase documentation: https://firebase.google.com/docs
