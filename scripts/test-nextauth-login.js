#!/usr/bin/env node

/**
 * Test NextAuth Login Script
 * 
 * This script tests the NextAuth credentials provider directly.
 */

const fs = require('fs');
const path = require('path');

async function testNextAuthLogin() {
  console.log('🧪 Testing NextAuth credentials provider...\n');
  
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
    
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    console.log('🔍 Testing NextAuth credentials flow...');
    console.log('📧 Email:', testEmail);
    console.log('🔐 Password:', testPassword);
    
    // Find user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('👤 User ID:', user._id);
    console.log('✉️ Email verified:', user.isEmailVerified);
    
    // Test password comparison
    console.log('🔐 Testing password comparison...');
    const isPasswordValid = await user.comparePassword(testPassword);
    
    if (isPasswordValid) {
      console.log('✅ Password is valid!');
      
      // Test the exact flow from NextAuth credentials provider
      const userResponse = {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.avatar,
      };
      
      console.log('🎉 NextAuth would return:', JSON.stringify(userResponse, null, 2));
    } else {
      console.log('❌ Password is invalid');
      console.log('🔍 Stored password hash:', user.password);
    }
    
  } catch (error) {
    console.error('❌ Error testing NextAuth login:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

testNextAuthLogin();