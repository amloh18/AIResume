# MongoDB Quick Setup Guide

## 🚀 Fast Setup Steps

### Step 1: Create MongoDB Atlas Cluster

1. **Go to MongoDB Atlas:**
   - Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign in or create account

2. **Create Cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select cloud provider and region
   - Click "Create"

3. **Configure Access:**
   - **Database Access:** Create user with read/write permissions
   - **Network Access:** Allow access from anywhere (0.0.0.0/0)
   - **Get Connection String:** Copy your connection string

### Step 2: Set Up Environment Variables

```bash
# Generate new environment file
npm run update-env -- --generate-env

# Update your .env.local file with the new connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority
```

### Step 3: Set Up Database Schema

```bash
# Set your MongoDB URI
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority"

# Run the setup script
npm run setup-mongodb
```

### Step 4: Update Vercel

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com](https://vercel.com)
   - Select your project

2. **Update Environment Variables:**
   - Go to Settings → Environment Variables
   - Update `MONGODB_URI` with your new connection string
   - Redeploy your project

### Step 5: Test Everything

```bash
# Test deployment
npm run test-deployment

# Or visit: https://your-app.vercel.app/api/test-db
```

## 📊 What Gets Created

### Collections:
- **users** - User accounts and authentication
- **cvs** - CV/Resume documents  
- **jobapplications** - Job application tracking
- **coverletters** - Cover letter documents
- **templates** - CV templates
- **snippets** - Reusable content snippets
- **cvdata** - CV data storage

### Indexes:
- Email uniqueness for users
- User-based queries for all collections
- Status and date-based queries
- Search and filtering indexes

### Sample Data:
- Admin user account
- Modern Professional template

## 🔧 Available Scripts

```bash
# Setup MongoDB schema
npm run setup-mongodb

# Test connection only
npm run setup-mongodb -- --test-connection

# Generate environment variables
npm run update-env -- --generate-env

# Test deployment
npm run test-deployment

# Generate secure secrets
npm run generate-secrets
```

## 📋 Setup Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user configured
- [ ] Network access configured
- [ ] Connection string obtained
- [ ] Environment variables updated
- [ ] Schema setup script run
- [ ] Collections created
- [ ] Indexes created
- [ ] Sample data inserted
- [ ] Connection tested
- [ ] Vercel environment updated
- [ ] Application tested

## 🎯 Expected Results

After running the setup script, you should see:

```
🚀 Setting up MongoDB for CV Circle...

🔍 Testing MongoDB connection...
✅ MongoDB connection successful

📁 Creating collections...
✅ Created collection: users
✅ Created collection: cvs
✅ Created collection: jobapplications
✅ Created collection: coverletters
✅ Created collection: templates
✅ Created collection: snippets
✅ Created collection: cvdata

🔍 Creating indexes...
✅ Created index: {"email":1}
✅ Created index: {"userId":1,"status":1}
...

📊 Inserting sample data...
✅ Inserted sample user
✅ Inserted sample template

🔍 Verifying setup...
📁 Collections: users,cvs,jobapplications,coverletters,templates,snippets,cvdata
👥 Users count: 1
📄 Templates count: 1

✅ MongoDB setup completed successfully!
```

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test connection only
npm run setup-mongodb -- --test-connection
```

### Permission Issues
- Verify database user has read/write permissions
- Check network access allows your IP

### Missing MongoDB Tools
```bash
# Install MongoDB Database Tools
# https://www.mongodb.com/try/download/database-tools
```

## 📈 Next Steps

1. **Test Registration:** Try registering a new user
2. **Test CV Creation:** Upload and create a CV
3. **Test Job Applications:** Create a job application
4. **Monitor Performance:** Check Vercel Analytics

---

**Time Estimate:** 10-15 minutes
**Difficulty:** Easy
**Status:** Ready for production use 