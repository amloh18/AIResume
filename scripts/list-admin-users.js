const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: String,
  isEmailVerified: Boolean,
  createdAt: Date,
  lastLogin: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function listAdminUsers() {
  try {
    await connectDB();
    
    console.log('🔍 Searching for admin users...\n');
    
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('email firstName lastName role isEmailVerified createdAt lastLogin');
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the database');
      return;
    }
    
    console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🎭 Role: ${user.role}`);
      console.log(`   ✅ Verified: ${user.isEmailVerified ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}`);
      console.log(`   🔄 Last Login: ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}`);
      console.log('   ---');
    });
    
    console.log('\n🌐 Access admin dashboard at: http://localhost:3001/admin');
    console.log('🔐 Use any of the above email addresses to login');
    
  } catch (error) {
    console.error('❌ Error listing admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

listAdminUsers();
