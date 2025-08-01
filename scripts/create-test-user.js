#!/usr/bin/env node

/**
 * Create Test User Script
 * 
 * This script creates a test user with a known password for testing login functionality.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  console.log('🚀 Creating test user for login testing...\n');
  
  try {
    // Set environment variable
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        process.env.MONGODB_URI = uriMatch[1].trim();
        console.log('✅ Loaded MongoDB URI from .env.local');
      }
    }
    
    // Connect to MongoDB directly
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Test user credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: testEmail });
    
    if (existingUser) {
      console.log('⚠️ Test user already exists, updating password...');
      await db.collection('users').updateOne(
        { email: testEmail },
        { 
          $set: { 
            password: hashedPassword,
            updatedAt: new Date()
          }
        }
      );
    } else {
      console.log('👤 Creating new test user...');
      
      const testUser = {
        email: testEmail,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
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
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(testUser);
    }
    
    console.log('✅ Test user created/updated successfully!');
    console.log('\n📋 Test Credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n🔗 You can now test login with these credentials');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.message.includes('Could not connect to any servers')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your MongoDB Atlas IP whitelist');
      console.log('2. Verify your MongoDB URI is correct');
      console.log('3. Ensure your MongoDB cluster is running');
      console.log('\n📚 For IP whitelisting, visit:');
      console.log('   https://www.mongodb.com/docs/atlas/security-whitelist/');
    }
  }
}

createTestUser(); 