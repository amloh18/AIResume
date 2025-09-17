#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Fix Script
 * 
 * This script helps troubleshoot and fix MongoDB Atlas connection issues.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkCurrentIP() {
  console.log('🌐 Checking your current IP address...');
  
  try {
    const { exec } = require('child_process');
    const ip = await new Promise((resolve, reject) => {
      exec('curl -4 -s ifconfig.me', (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
    
    console.log(`✅ Your current IP address is: ${ip}`);
    return ip;
  } catch (error) {
    console.log('❌ Could not determine IP address automatically');
    return null;
  }
}

async function testMongoDBConnection(uri) {
  console.log('\n🧪 Testing MongoDB connection...');
  
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ MongoDB connection successful!');
    
    // Test a simple operation
    const db = client.db('cvcircle');
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    await client.close();
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔐 Authentication Error:');
      console.log('   - Check your username and password');
      console.log('   - Make sure the user exists in your Atlas cluster');
      console.log('   - Verify the user has the correct permissions');
    } else if (error.message.includes('Could not connect to any servers')) {
      console.log('\n🌐 Connection Error:');
      console.log('   - Check your IP whitelist in MongoDB Atlas');
      console.log('   - Verify your cluster is running');
      console.log('   - Check your network connection');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔗 DNS Error:');
      console.log('   - Check your connection string format');
      console.log('   - Verify the cluster name is correct');
    }
    
    return false;
  }
}

async function updateEnvFile(mongoDBURI) {
  const envPath = path.join(__dirname, '../.env.local');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Replace or add MONGODB_URI
    if (envContent.includes('MONGODB_URI=')) {
      envContent = envContent.replace(
        /MONGODB_URI=.*/,
        `MONGODB_URI=${mongoDBURI}`
      );
    } else {
      envContent += `\nMONGODB_URI=${mongoDBURI}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env.local with your MongoDB URI');
    return true;
  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 MongoDB Atlas Connection Fix Tool\n');
  
  // Check current IP
  const currentIP = await checkCurrentIP();
  
  console.log('\n📋 Current Configuration:');
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
    if (uriMatch) {
      const uri = uriMatch[1].trim();
      console.log(`   MongoDB URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    } else {
      console.log('   MongoDB URI: Not configured');
    }
  }
  
  console.log('\n🔍 Troubleshooting Steps:');
  console.log('1. Verify your IP is whitelisted in MongoDB Atlas');
  console.log('2. Check your connection string format');
  console.log('3. Verify your username and password');
  console.log('4. Ensure your cluster is running');
  
  if (currentIP) {
    console.log(`\n🌐 Your IP (${currentIP}) should be whitelisted in MongoDB Atlas`);
    console.log('   Go to: https://cloud.mongodb.com → Network Access → Add IP Address');
  }
  
  console.log('\n📝 To get your connection string:');
  console.log('1. Go to https://cloud.mongodb.com');
  console.log('2. Select your cluster');
  console.log('3. Click "Connect"');
  console.log('4. Choose "Connect your application"');
  console.log('5. Copy the connection string');
  console.log('6. Replace <username>, <password>, and <dbname> with your values');
  
  const action = await question('\nWhat would you like to do?\n1. Test current connection\n2. Update MongoDB URI\n3. Exit\nEnter choice (1-3): ');
  
  switch (action) {
    case '1':
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        const uri = uriMatch[1].trim();
        await testMongoDBConnection(uri);
      } else {
        console.log('❌ No MongoDB URI found in .env.local');
      }
      break;
      
    case '2':
      console.log('\n📝 Enter your MongoDB Atlas connection string:');
      console.log('Format: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
      const newURI = await question('Connection string: ');
      
      if (newURI && newURI.includes('mongodb+srv://')) {
        const success = await updateEnvFile(newURI);
        if (success) {
          console.log('\n🧪 Testing new connection...');
          await testMongoDBConnection(newURI);
        }
      } else {
        console.log('❌ Invalid connection string format');
      }
      break;
      
    case '3':
      console.log('👋 Goodbye!');
      break;
      
    default:
      console.log('❌ Invalid choice');
  }
  
  rl.close();
}

main().catch(console.error); 