const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Test sign-in with known user
async function testSignIn() {
  try {
    await connectDB();
    
    const email = 'testuser@cvcircle.io';
    const password = 'test123';
    
    console.log(`🧪 Testing sign-in for: ${email}`);
    
    // Test password comparison directly
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      isEmailVerified: Boolean,
      comparePassword: function(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
      }
    }));
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (user) {
      console.log('👤 User details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.isEmailVerified}`);
      console.log(`   Has Password: ${!!user.password}`);
      
      // Test password comparison
      const isPasswordValid = await user.comparePassword(password);
      console.log(`   Password Valid: ${isPasswordValid}`);
      
      if (isPasswordValid) {
        console.log('✅ Password validation successful!');
        
        // Test the actual NextAuth sign-in
        console.log('🔐 Testing NextAuth sign-in...');
        const response = await fetch('http://localhost:3000/api/auth/signin/credentials', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            email: email,
            password: password,
            redirect: 'false'
          })
        });
        
        console.log('📋 Sign-in response status:', response.status);
        const result = await response.text();
        
        if (response.status === 200) {
          console.log('✅ Sign-in successful!');
          console.log('📋 Response preview:', result.substring(0, 200) + '...');
        } else {
          console.log('❌ Sign-in failed');
          console.log('📋 Response:', result);
        }
      } else {
        console.log('❌ Password validation failed');
      }
    } else {
      console.log('❌ User not found');
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
