# MongoDB Atlas Cluster Connection Guide

## 🔗 Current Status

✅ **MongoDB URI Fixed**: Your connection string is now properly formatted
❌ **Connection Issue**: "Could not connect to any servers" - Network access restriction

## 🚀 Quick Fix Steps

### Step 1: Configure MongoDB Atlas Network Access

1. **Go to MongoDB Atlas:**
   - Visit [MongoDB Atlas](https://cloud.mongodb.com)
   - Sign in to your account

2. **Navigate to Network Access:**
   - Click on your cluster
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"

3. **Add Your IP Address:**
   - **Option A (Recommended):** Click "Add Current IP Address"
   - **Option B (Development):** Click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Option C (Specific):** Enter your IP address manually

4. **Save Changes:**
   - Click "Confirm" to save the network access rule

### Step 2: Verify Database User

1. **Go to Database Access:**
   - Click "Database Access" in the left sidebar
   - Check if your user exists

2. **Create/Update User:**
   - Click "Add New Database User"
   - **Username:** admin
   - **Password:** admin (or your preferred password)
   - **Database User Privileges:** "Read and write to any database"
   - Click "Add User"

### Step 3: Test Connection

```bash
# Test the connection
npm run test-mongoose

# Or test manually
curl http://localhost:3000/api/health
```

## 🔧 Alternative Connection Methods

### Method 1: Use MongoDB Compass (GUI Tool)

1. **Download MongoDB Compass:**
   - Visit [MongoDB Compass](https://www.mongodb.com/products/compass)
   - Download and install

2. **Connect with URI:**
   ```
   mongodb+srv://admin:admin@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority
   ```

3. **Test Connection:**
   - If Compass connects, your cluster is accessible
   - If not, check network access settings

### Method 2: Use MongoDB Shell

```bash
# Install MongoDB Shell
brew install mongosh  # macOS
# or download from https://www.mongodb.com/try/download/shell

# Test connection
mongosh "mongodb+srv://admin:admin@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority"
```

### Method 3: Use Atlas Data Explorer

1. **Go to Collections:**
   - Click "Browse Collections" in your cluster
   - This tests if the cluster is accessible

## 🛠️ Troubleshooting

### Issue: "Could not connect to any servers"

**Possible Causes:**
1. **Network Access:** IP not whitelisted
2. **User Credentials:** Wrong username/password
3. **Cluster Status:** Cluster is paused or down
4. **Firewall:** Local firewall blocking connection

**Solutions:**
```bash
# 1. Check your IP address
curl ifconfig.me

# 2. Add your IP to MongoDB Atlas Network Access
# 3. Verify cluster is running (green status in Atlas)
# 4. Check user credentials in Database Access
```

### Issue: "Authentication failed"

**Solutions:**
1. **Reset Database User Password:**
   - Go to Database Access
   - Edit your user
   - Set a new password
   - Update .env.local

2. **Update .env.local:**
   ```bash
   # Update with new password
   npm run setup-cluster -- --uri "mongodb+srv://admin:newpassword@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority"
   ```

### Issue: "SSL/TLS connection error"

**Solutions:**
1. **Check SSL settings in database.ts**
2. **Try without SSL for development:**
   ```typescript
   ssl: false, // For development
   ```

## 📋 Step-by-Step Setup

### 1. Create New Cluster (if needed)

1. **Go to MongoDB Atlas**
2. **Click "Build a Database"**
3. **Choose "FREE" tier (M0)**
4. **Select cloud provider and region**
5. **Click "Create"**

### 2. Configure Database Access

1. **Go to Database Access**
2. **Click "Add New Database User"**
3. **Username:** admin
4. **Password:** admin (or secure password)
5. **Privileges:** "Read and write to any database"
6. **Click "Add User"**

### 3. Configure Network Access

1. **Go to Network Access**
2. **Click "Add IP Address"**
3. **Click "Allow Access from Anywhere"** (for development)
4. **Click "Confirm"**

### 4. Get Connection String

1. **Click "Connect" on your cluster**
2. **Choose "Connect your application"**
3. **Copy the connection string**
4. **Replace `<password>` with your actual password**

### 5. Update Environment

```bash
# Update with your connection string
npm run setup-cluster -- --uri "your-connection-string-here"
```

### 6. Test Connection

```bash
# Test the setup
npm run test-mongoose

# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/api/health
```

## 🔍 Connection Testing Commands

```bash
# Test Mongoose setup
npm run test-mongoose

# Test cluster connection only
npm run setup-cluster -- --test-only

# Test with specific URI
npm run setup-cluster -- --uri "mongodb+srv://admin:admin@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority"

# Test health endpoint
curl http://localhost:3000/api/health

# Test database endpoint
curl http://localhost:3000/api/test-db
```

## 📊 Expected Results

### Successful Connection:
```json
{
  "status": "healthy",
  "database": {
    "status": "healthy",
    "message": "MongoDB connection is healthy",
    "database": "cvcircle",
    "host": "cluster0.ta7jxv7.mongodb.net",
    "connectionStatus": "connected",
    "connected": true
  }
}
```

### Failed Connection:
```json
{
  "status": "unhealthy",
  "error": "Could not connect to any servers",
  "database": {
    "status": "error",
    "connectionStatus": "disconnected",
    "connected": false
  }
}
```

## 🚨 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Could not connect to any servers" | Network access restricted | Add IP to Network Access |
| "Authentication failed" | Wrong credentials | Reset user password |
| "SSL/TLS error" | SSL configuration | Disable SSL for development |
| "Cluster not found" | Wrong cluster name | Check cluster address |
| "Database not found" | Database doesn't exist | Create database or use existing |

## 📞 Getting Help

1. **Check MongoDB Atlas Status:** [Status Page](https://status.mongodb.com/)
2. **MongoDB Documentation:** [Connection Guide](https://docs.mongodb.com/atlas/connect-to-cluster/)
3. **Community Support:** [MongoDB Community](https://community.mongodb.com/)

---

**Next Steps:**
1. Configure Network Access in MongoDB Atlas
2. Test connection with `npm run test-mongoose`
3. Start development server with `npm run dev`
4. Test endpoints and create database schema 