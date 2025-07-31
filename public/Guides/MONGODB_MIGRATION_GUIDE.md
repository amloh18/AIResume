# MongoDB Cluster Migration Guide

## 🚀 Migrating to a New MongoDB Cluster

This guide will help you migrate your data from the old MongoDB cluster to a new one.

## Step 1: Set Up New MongoDB Atlas Cluster

### 1.1 Create New Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new project or use existing one
3. Create a new cluster (M0 Free tier recommended for testing)
4. Choose your preferred cloud provider and region

### 1.2 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Create a username and strong password
4. Select "Read and write to any database"
5. Click "Add User"

### 1.3 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add specific IP addresses
5. Click "Confirm"

### 1.4 Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Replace `<dbname>` with your database name (e.g., `cvcircle`)

## Step 2: Update Environment Variables

### 2.1 Update Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Find `MONGODB_URI`
4. Update it with your new connection string:

```bash
# Old connection string
MONGODB_URI=mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# New connection string
MONGODB_URI=mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle?retryWrites=true&w=majority
```

### 2.2 Test New Connection
1. Deploy your changes to Vercel
2. Test the connection: `https://your-app.vercel.app/api/test-db`
3. Verify it shows successful connection

## Step 3: Data Migration Options

### Option A: Manual Migration (Recommended for small datasets)

#### 3.1 Export Data from Old Cluster
```bash
# Export users collection
mongodump --uri="mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle" --collection=users --out=./backup

# Export CVs collection
mongodump --uri="mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle" --collection=cvs --out=./backup

# Export all collections
mongodump --uri="mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle" --out=./backup
```

#### 3.2 Import Data to New Cluster
```bash
# Import users collection
mongorestore --uri="mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle" ./backup/cvcircle/users.bson

# Import CVs collection
mongorestore --uri="mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle" ./backup/cvcircle/cvs.bson

# Import all collections
mongorestore --uri="mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle" ./backup/cvcircle/
```

### Option B: MongoDB Atlas Data Migration (For larger datasets)

1. Go to your old cluster in MongoDB Atlas
2. Click "Command Line Tools"
3. Download MongoDB Database Tools
4. Use `mongodump` and `mongorestore` commands as shown above

### Option C: Fresh Start (If you don't need old data)

1. Simply update the connection string
2. The new cluster will create collections automatically
3. Users will need to register again

## Step 4: Verify Migration

### 4.1 Test Database Connection
```bash
# Run the test script
npm run test-deployment
```

### 4.2 Check Collections
Visit: `https://your-app.vercel.app/api/test-db`

Expected response:
```json
{
  "success": true,
  "message": "Database connection test successful",
  "data": {
    "userCount": 0,
    "envInfo": {
      "hasMongoUri": true,
      "mongoUriLength": 123,
      "nodeEnv": "production",
      "vercelEnv": "production"
    }
  }
}
```

### 4.3 Test User Registration
1. Try registering a new user
2. Verify the user is created in the new cluster
3. Test login functionality

## Step 5: Update Local Development

### 5.1 Update Local Environment
Create or update your `.env.local` file:

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# Other variables...
GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key
JWT_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 5.2 Test Locally
```bash
npm run dev
# Visit http://localhost:3000/api/test-db
```

## Step 6: Clean Up

### 6.1 Remove Old Cluster (Optional)
1. Go to your old MongoDB Atlas project
2. Delete the old cluster
3. Remove old database users
4. Clean up network access rules

### 6.2 Update Documentation
1. Update any documentation with new connection details
2. Share new connection string with team members
3. Update deployment scripts if any

## Troubleshooting

### Connection Issues
- Verify network access is configured correctly
- Check username and password are correct
- Ensure database name is specified in connection string

### Data Migration Issues
- Verify both clusters are accessible
- Check if collections exist in source cluster
- Ensure sufficient permissions on both clusters

### Application Issues
- Clear browser cache and localStorage
- Check Vercel function logs for errors
- Verify environment variables are updated

## Security Best Practices

1. **Use Strong Passwords**: Generate secure passwords for database users
2. **Network Security**: Restrict IP access in production
3. **Regular Backups**: Set up automated backups on new cluster
4. **Monitor Access**: Use MongoDB Atlas monitoring features
5. **Rotate Credentials**: Regularly update database passwords

## Support

If you encounter issues:
1. Check MongoDB Atlas documentation
2. Review Vercel function logs
3. Test connection with MongoDB Compass
4. Contact MongoDB Atlas support if needed

---

**Migration Checklist:**
- [ ] New cluster created
- [ ] Database user configured
- [ ] Network access configured
- [ ] Connection string obtained
- [ ] Environment variables updated
- [ ] Data migrated (if needed)
- [ ] Connection tested
- [ ] Application tested
- [ ] Old cluster cleaned up (optional)

**Last Updated:** $(date)
**Version:** 1.0 