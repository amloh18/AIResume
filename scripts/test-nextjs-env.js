#!/usr/bin/env node

/**
 * Test Next.js Environment Variable Loading
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Next.js environment variable loading...\n');

// Simulate Next.js environment loading
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 .env.local content:');
  console.log(envContent);
  
  // Parse environment variables
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim();
    }
  });
  
  console.log('\n🔍 Parsed environment variables:');
  Object.keys(envVars).forEach(key => {
    if (key === 'MONGODB_URI') {
      console.log(`   ${key}: ${envVars[key].replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    } else {
      console.log(`   ${key}: ${envVars[key]}`);
    }
  });
  
  // Test connection with the parsed URI
  if (envVars.MONGODB_URI) {
    console.log('\n🔗 Testing connection with parsed URI:');
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
} else {
  console.log('❌ .env.local file not found');
} 