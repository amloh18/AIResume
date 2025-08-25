#!/usr/bin/env node

/**
 * Test Authentication Flow Script
 * 
 * This script tests the complete authentication flow.
 */

const fs = require('fs');
const path = require('path');

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');
  
  try {
    // Set environment variables
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      
      console.log('✅ Loaded environment variables from .env.local');
    }
    
    // Import after setting env vars
    const connectDB = require('../src/lib/database.ts').default;
    const User = require('../src/models/User.ts').default;
    
    console.log('\n🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Test users
    const testUsers = [
      { email: 'admin@cvcircle.com', password: 'Admin@2468', name: 'Admin User' },
      { email: 'test@example.com', password: 'password123', name: 'Test User' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n🔍 Testing authentication with: ${testUser.email} (${testUser.name})`);
      
      // Find user
      const user = await User.findOne({ email: testUser.email });
      
      if (!user) {
        console.log('❌ User not found');
        continue;
      }
      
      console.log('✅ User found:', user.email);
      console.log('👤 User ID:', user._id);
      console.log('✉️ Email verified:', user.isEmailVerified);
      console.log('🔑 Has password:', !!user.password);
      
      // Test password comparison
      console.log('🔐 Testing password comparison...');
      const isPasswordValid = await user.comparePassword(testUser.password);
      
      if (isPasswordValid) {
        console.log('✅ Password is valid!');
        
        // Test the exact flow from NextAuth credentials provider
        const userResponse = {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          image: user.avatar,
        };
        
        console.log('🎉 NextAuth would return:', JSON.stringify(userResponse, null, 2));
      } else {
        console.log('❌ Password is invalid');
      }
    }
    
    console.log('\n✅ Authentication flow testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing auth flow:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

testAuthFlow();
