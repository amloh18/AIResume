const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test the verification flow
async function testVerificationFlow() {
  try {
    await connectDB();
    
    const email = 'amarjotasl@gmail.com';
    console.log(`🧪 Testing verification flow for: ${email}`);
    
    // Get the most recent verification code
    const VerificationToken = mongoose.model('VerificationToken', new mongoose.Schema({
      code: String,
      email: String,
      type: String,
      userId: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    }));
    
    const recentCode = await VerificationToken.findOne({
      email: email.toLowerCase(),
      type: 'email-verification',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!recentCode) {
      console.log('❌ No recent verification code found');
      return;
    }
    
    console.log(`📧 Found verification code: ${recentCode.code}`);
    
    // Test the verify-and-signin API
    const response = await fetch('http://localhost:3000/api/auth/verify-and-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        code: recentCode.code,
        type: 'email-verification'
      })
    });
    
    const result = await response.json();
    console.log('📋 Verification result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Code verification successful!');
      
      // Check user status after verification
      const User = mongoose.model('User', new mongoose.Schema({
        email: String,
        firstName: String,
        lastName: String,
        isEmailVerified: Boolean,
        emailVerifiedAt: Date,
        password: String
      }));
      
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        console.log('👤 User status after verification:');
        console.log(`   Email Verified: ${user.isEmailVerified}`);
        console.log(`   Email Verified At: ${user.emailVerifiedAt}`);
        console.log(`   Has Password: ${!!user.password}`);
      }
    } else {
      console.log('❌ Code verification failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testVerificationFlow();
