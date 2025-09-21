require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple User schema for debugging
const UserSchema = new mongoose.Schema({
  email: String,
  firebaseUid: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function testUserAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Test what happens when we call the user API logic manually
    const firebaseUid = 'Pb2CeNSbxGYNJhKEQVGD6xYqKvs1'; // The user's Firebase UID
    
    console.log('🔍 Testing Firebase UID lookup:', firebaseUid);
    
    // Simulate what /api/user does
    const firebaseUser = await User.findOne({ firebaseUid });
    if (firebaseUser) {
      console.log('✅ Found Firebase user:', {
        id: firebaseUser._id.toString(),
        email: firebaseUser.email,
        firstName: firebaseUser.firstName,
        lastName: firebaseUser.lastName,
        firebaseUid: firebaseUser.firebaseUid
      });
    } else {
      console.log('❌ No Firebase user found');
    }
    
    // Test what happens if we look up by session email instead
    const sessionEmail = 'amarjotasl@gmail.com';
    console.log('\n🔍 Testing session email lookup:', sessionEmail);
    
    const emailUser = await User.findOne({ email: sessionEmail });
    if (emailUser) {
      console.log('✅ Found user by email:', {
        id: emailUser._id.toString(),
        email: emailUser.email,
        firstName: emailUser.firstName,
        lastName: emailUser.lastName,
        firebaseUid: emailUser.firebaseUid
      });
    } else {
      console.log('❌ No user found by email');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testUserAPI();
