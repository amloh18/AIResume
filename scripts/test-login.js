#!/usr/bin/env node

/**
 * Test Login Script
 * 
 * This script tests the login functionality directly.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function testLogin() {
  console.log('🧪 Testing login functionality...\n');
  
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
    
    const db = client.db('cvcircle');
    
    // Test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    console.log('🔍 Looking for user:', testEmail);
    
    // Find user
    const user = await db.collection('users').findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('🔐 Testing password comparison...');
    
    // Test password comparison
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    
    if (isPasswordValid) {
      console.log('✅ Password is valid!');
      console.log('🎉 Login would be successful');
    } else {
      console.log('❌ Password is invalid');
      console.log('🔍 Password hash:', user.password);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testLogin(); 