#!/usr/bin/env node

/**
 * Create Test User Script
 * 
 * This script creates a test user with a known password for testing authentication.
 */

const fs = require('fs');
const path = require('path');

async function createTestUser() {
  console.log('🧪 Creating Test User...\n');
  
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
    
    // Test user credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    console.log(`🔍 Creating test user: ${testEmail}`);
    console.log(`🔐 Password: ${testPassword}`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: testEmail });
    
    if (existingUser) {
      console.log('⚠️ User already exists, updating password...');
      existingUser.password = testPassword;
      await existingUser.save();
      console.log('✅ Password updated successfully');
    } else {
      // Create new test user
      const newUser = new User({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        password: testPassword,
        isEmailVerified: true,
        role: 'user',
        subscription: {
          plan: 'basic',
          status: 'active',
          startDate: new Date(),
          seats: 3,
          storageUsed: 0
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true
          }
        }
      });
      
      await newUser.save();
      console.log('✅ Test user created successfully');
    }
    
    // Verify the user was created/updated
    const user = await User.findOne({ email: testEmail });
    console.log('\n📋 User details:');
    console.log('- Email:', user.email);
    console.log('- Name:', `${user.firstName} ${user.lastName}`);
    console.log('- Role:', user.role);
    console.log('- Verified:', user.isEmailVerified);
    console.log('- Has password:', !!user.password);
    
    // Test password
    const isPasswordValid = await user.comparePassword(testPassword);
    console.log('- Password valid:', isPasswordValid);
    
    console.log('\n🎉 Test user is ready for authentication testing!');
    console.log('📧 Email: test@example.com');
    console.log('🔐 Password: password123');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

createTestUser(); 