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

// Test the sign-in process
async function testSignIn() {
  try {
    await connectDB();
    
    const email = 'amarjotasl@gmail.com';
    const password = 'test123'; // This is the password that was set during account creation
    
    console.log(`🧪 Testing sign-in for: ${email}`);
    
    // Test the NextAuth credentials provider
    const response = await fetch('http://localhost:3000/api/auth/signin/credentials', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        redirect: false
      })
    });
    
    console.log('📋 Sign-in response status:', response.status);
    const result = await response.text();
    console.log('📋 Sign-in response:', result);
    
    // Also test with a direct API call to check user authentication
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      firstName: String,
      lastName: String,
      isEmailVerified: Boolean,
      password: String
    }));
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (user) {
      console.log('👤 User details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email Verified: ${user.isEmailVerified}`);
      console.log(`   Has Password: ${!!user.password}`);
      
      // Test password comparison
      if (user.password) {
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`   Password Valid: ${isPasswordValid}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testSignIn();
