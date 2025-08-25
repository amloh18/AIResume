#!/usr/bin/env node

/**
 * Test Session State Script
 * 
 * This script tests the current session state and authentication flow.
 */

const fs = require('fs');
const path = require('path');

async function testSessionState() {
  console.log('🧪 Testing Session State...\n');
  
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
    
    // Check required environment variables
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'MONGODB_URI'
    ];
    
    console.log('\n🔍 Checking environment variables:');
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '***' : process.env[varName]}`);
      } else {
        console.log(`❌ ${varName}: Missing`);
      }
    });
    
    // Import after setting env vars
    const connectDB = require('../src/lib/database.ts').default;
    const User = require('../src/models/User.ts').default;
    
    console.log('\n🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // List all users
    console.log('📋 All users in database:');
    const users = await User.find({}).select('email firstName lastName role isEmailVerified');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role} - Verified: ${user.isEmailVerified}`);
      });
    }
    
    // Test with a specific user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔍 Testing with user: ${testUser.email}`);
      
      // Check if user has a password
      const fullUser = await User.findById(testUser._id);
      if (fullUser.password) {
        console.log('✅ User has password set');
      } else {
        console.log('❌ User has no password set (OAuth only)');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing session state:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

testSessionState();
