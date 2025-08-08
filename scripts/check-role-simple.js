const mongoose = require('mongoose');

// Use the same connection logic as the main app
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        MONGODB_URI = uriMatch[1].trim();
        console.log('✅ Loaded MONGODB_URI from .env.local');
      }
    }
  } catch (error) {
    console.error('❌ Error loading .env.local:', error);
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkUserRole(email) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);
    
    if (user.role !== 'admin') {
      console.log('🔧 Making user admin...');
      user.role = 'admin';
      await user.save();
      console.log('✅ User is now admin!');
    } else {
      console.log('✅ User is already admin');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/check-role-simple.js <email>');
  process.exit(1);
}

checkUserRole(email); 