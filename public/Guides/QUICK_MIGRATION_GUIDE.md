# Quick MongoDB Migration Guide

## 🚀 Fast Migration Steps

### Step 1: Set Up New MongoDB Atlas Cluster

1. **Create New Cluster:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create new project or use existing
   - Create M0 Free cluster
   - Choose your preferred region

2. **Configure Access:**
   - **Database Access:** Create user with read/write permissions
   - **Network Access:** Allow access from anywhere (0.0.0.0/0)
   - **Get Connection String:** Copy and note your new connection string

### Step 2: Update Environment Variables

#### Option A: Using Scripts (Recommended)
```bash
# Generate new environment file
npm run update-env -- --generate-env

# Get Vercel update instructions
npm run update-env -- --vercel-instructions
```

#### Option B: Manual Update
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `MONGODB_URI` with your new connection string
3. Redeploy your project

### Step 3: Test New Connection
```bash
# Test deployment
npm run test-deployment

# Or visit: https://your-app.vercel.app/api/test-db
```

### Step 4: Migrate Data (If Needed)

#### Option A: Using Migration Script
```bash
# Set environment variables
export OLD_MONGODB_URI="mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle"
export NEW_MONGODB_URI="mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle"

# Run migration
npm run migrate-mongodb
```

#### Option B: Fresh Start
- Simply update the connection string
- New users will register fresh
- Old data will not be available

### Step 5: Verify Migration

1. **Test Registration:** Try registering a new user
2. **Test Login:** Try logging in with existing user (if migrated)
3. **Check Dashboard:** Verify everything works correctly

## 🔧 Troubleshooting

### Connection Issues
```bash
# Test connections only
npm run migrate-mongodb -- --test-connection
```

### Common Problems
- **Network Access:** Ensure 0.0.0.0/0 is allowed
- **User Permissions:** Verify user has read/write access
- **Connection String:** Check format and credentials

### Get Help
- Check `MONGODB_MIGRATION_GUIDE.md` for detailed instructions
- Review Vercel function logs for errors
- Test with MongoDB Compass if needed

## 📋 Migration Checklist

- [ ] New cluster created
- [ ] Database user configured
- [ ] Network access configured
- [ ] Connection string obtained
- [ ] Environment variables updated
- [ ] Connection tested
- [ ] Data migrated (optional)
- [ ] Application tested
- [ ] Old cluster cleaned up (optional)

## 🎯 Quick Commands

```bash
# Generate new environment file
npm run update-env -- --generate-env

# Test deployment
npm run test-deployment

# Migrate data
npm run migrate-mongodb

# Generate secure secrets
npm run generate-secrets
```

---

**Time Estimate:** 15-30 minutes
**Difficulty:** Easy
**Data Loss Risk:** Low (if following instructions) 