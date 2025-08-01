#!/usr/bin/env node

/**
 * Test Environment Variable Loading
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing environment variable loading...\n');

// Method 1: Direct file reading
console.log('1. Direct file reading:');
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
  
  if (uriMatch) {
    const uri = uriMatch[1].trim();
    console.log('   ✅ MONGODB_URI found in .env.local');
    console.log(`   📝 URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  } else {
    console.log('   ❌ MONGODB_URI not found in .env.local');
  }
} else {
  console.log('   ❌ .env.local file not found');
}

// Method 2: Process environment
console.log('\n2. Process environment:');
console.log(`   📝 MONGODB_URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'undefined'}`);

// Method 3: Load dotenv manually
console.log('\n3. Manual dotenv loading:');
try {
  const dotenv = require('dotenv');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.log(`   ❌ Error loading .env.local: ${result.error.message}`);
  } else {
    console.log('   ✅ .env.local loaded successfully');
    console.log(`   📝 MONGODB_URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'undefined'}`);
  }
} catch (error) {
  console.log(`   ❌ Error loading dotenv: ${error.message}`);
}

// Method 4: Test Next.js environment loading
console.log('\n4. Next.js environment simulation:');
try {
  // Simulate Next.js environment loading
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim();
    }
  });
  
  console.log(`   📝 MONGODB_URI: ${envVars.MONGODB_URI ? envVars.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'undefined'}`);
  
  // Test connection with the loaded URI
  if (envVars.MONGODB_URI) {
    console.log('\n5. Testing connection with loaded URI:');
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(envVars.MONGODB_URI);
    
    client.connect()
      .then(() => {
        console.log('   ✅ Connection successful!');
        return client.db().admin().ping();
      })
      .then(() => {
        console.log('   ✅ Database ping successful!');
        client.close();
      })
      .catch((error) => {
        console.log(`   ❌ Connection failed: ${error.message}`);
        client.close();
      });
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
} 