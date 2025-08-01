#!/usr/bin/env node

/**
 * Test Environment Variables
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing environment variables...\n');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
  
  if (uriMatch) {
    const uri = uriMatch[1].trim();
    console.log('✅ MONGODB_URI found in .env.local:');
    console.log(`   ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    // Test if it's the correct format
    if (uri.includes('mongodb+srv://') && uri.includes('cluster0.ta7jxv7.mongodb.net')) {
      console.log('✅ URI format looks correct');
    } else {
      console.log('❌ URI format may be incorrect');
    }
  } else {
    console.log('❌ MONGODB_URI not found in .env.local');
  }
} else {
  console.log('❌ .env.local file not found');
}

// Test direct connection
console.log('\n🔗 Testing direct connection...');
try {
  const { MongoClient } = require('mongodb');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
  
  if (uriMatch) {
    const uri = uriMatch[1].trim();
    const client = new MongoClient(uri);
    
    client.connect()
      .then(() => {
        console.log('✅ Direct connection successful!');
        return client.db().admin().ping();
      })
      .then(() => {
        console.log('✅ Database ping successful!');
        client.close();
      })
      .catch((error) => {
        console.log('❌ Direct connection failed:', error.message);
        client.close();
      });
  }
} catch (error) {
  console.log('❌ Error testing connection:', error.message);
} 