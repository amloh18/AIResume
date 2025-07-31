#!/usr/bin/env node

/**
 * MongoDB URI Fix Script
 * 
 * This script helps fix MongoDB connection string encoding issues.
 */

const fs = require('fs');
const path = require('path');

function encodeMongoDBURI(uri) {
  // Extract parts of the URI
  const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(\?.*)?$/);
  
  if (!match) {
    console.error('❌ Invalid MongoDB URI format');
    return null;
  }
  
  const [, username, password, host, database, query] = match;
  
  // Encode username and password
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  // Reconstruct the URI
  const encodedURI = `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${database}${query || ''}`;
  
  return encodedURI;
}

function fixEnvironmentFile() {
  const envPath = path.join(__dirname, '../.env.local');
  const newEnvPath = path.join(__dirname, '../.env.new');
  
  try {
    // Read current .env.local
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Read new .env file
    let newEnvContent = '';
    if (fs.existsSync(newEnvPath)) {
      newEnvContent = fs.readFileSync(newEnvPath, 'utf8');
    }
    
    console.log('🔧 Fixing MongoDB URI encoding...\n');
    
    // Find MONGODB_URI in current file
    const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
    if (uriMatch) {
      const currentURI = uriMatch[1].trim();
      console.log('📋 Current MONGODB_URI found:');
      console.log(`   ${currentURI.substring(0, 50)}...`);
      
      // Check if it needs encoding
      if (currentURI.includes('%')) {
        console.log('✅ URI appears to be already encoded');
        return currentURI;
      }
      
      // Encode the URI
      const encodedURI = encodeMongoDBURI(currentURI);
      if (encodedURI) {
        console.log('🔧 Encoded MONGODB_URI:');
        console.log(`   ${encodedURI.substring(0, 50)}...`);
        
        // Update the .env.local file
        const updatedContent = envContent.replace(
          /MONGODB_URI=.+/,
          `MONGODB_URI=${encodedURI}`
        );
        
        fs.writeFileSync(envPath, updatedContent);
        console.log('✅ Updated .env.local with encoded URI');
        
        return encodedURI;
      }
    } else {
      console.log('⚠️ No MONGODB_URI found in .env.local');
      console.log('📝 Please add your MongoDB connection string to .env.local:');
      console.log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority');
    }
    
  } catch (error) {
    console.error('❌ Error fixing environment file:', error.message);
  }
  
  return null;
}

function testConnection(uri) {
  if (!uri) return;
  
  console.log('\n🧪 Testing connection...');
  
  // Set the URI as environment variable
  process.env.MONGODB_URI = uri;
  
  // Import and test the database connection
  try {
    const { connectDB, healthCheck } = require('../src/lib/database');
    
    // Test connection
    connectDB().then(() => {
      return healthCheck();
    }).then((health) => {
      console.log('✅ Connection test successful!');
      console.log(`   Status: ${health.status}`);
      console.log(`   Database: ${health.database}`);
      console.log(`   Host: ${health.host}`);
    }).catch((error) => {
      console.error('❌ Connection test failed:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Error testing connection:', error.message);
  }
}

function main() {
  console.log('🔧 MongoDB URI Fix Script\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MongoDB URI Fix Script

Usage:
  node scripts/fix-mongodb-uri.js [options]

Options:
  --help, -h          Show this help message
  --test-only         Only test connection, don't modify files
  --encode-only       Only encode URI, don't test connection

Examples:
  node scripts/fix-mongodb-uri.js
  node scripts/fix-mongodb-uri.js --test-only
    `);
    process.exit(0);
  }
  
  if (args.includes('--test-only')) {
    // Test existing connection without modifying files
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        const uri = uriMatch[1].trim();
        testConnection(uri);
      }
    }
    return;
  }
  
  // Fix the URI
  const fixedURI = fixEnvironmentFile();
  
  if (!args.includes('--encode-only')) {
    // Test the connection
    testConnection(fixedURI);
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Test the connection: npm run test-mongoose');
  console.log('3. Test endpoints: curl http://localhost:3000/api/health');
}

if (require.main === module) {
  main();
}

module.exports = { encodeMongoDBURI, fixEnvironmentFile, testConnection }; 