#!/usr/bin/env node

/**
 * MongoDB Cluster Setup Script
 * 
 * This script helps you set up the connection to your MongoDB Atlas cluster.
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

function createMongoDBURI(username, password, cluster, database = 'cvcircle') {
  // Encode username and password to handle special characters
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  return `mongodb+srv://${encodedUsername}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority`;
}

function updateEnvFile(mongoDBURI) {
  const envPath = path.join(__dirname, '../.env.local');
  const newEnvPath = path.join(__dirname, '../.env.new');
  
  try {
    // Read the template from .env.new
    let envContent = '';
    if (fs.existsSync(newEnvPath)) {
      envContent = fs.readFileSync(newEnvPath, 'utf8');
    } else {
      // Create a basic template
      envContent = `# Database Configuration
MONGODB_URI=${mongoDBURI}

# JWT Secret (Generate a new one for security)
JWT_SECRET=${require('crypto').randomBytes(32).toString('base64')}

# Next.js Configuration
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=${require('crypto').randomBytes(32).toString('base64')}

# AI API Keys
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key

# Environment
NODE_ENV=development
`;
    }
    
    // Replace the MONGODB_URI
    envContent = envContent.replace(
      /MONGODB_URI=.*/,
      `MONGODB_URI=${mongoDBURI}`
    );
    
    // Write to .env.local
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env.local with your MongoDB URI');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message);
    return false;
  }
}

async function testConnection(uri) {
  console.log('\n🧪 Testing MongoDB connection...');
  
  try {
    // Set environment variable
    process.env.MONGODB_URI = uri;
    
    // Import database module
    const { connectDB, healthCheck } = require('../src/lib/database');
    
    // Test connection
    await connectDB();
    const health = await healthCheck();
    
    console.log('✅ Connection successful!');
    console.log(`   Status: ${health.status}`);
    console.log(`   Database: ${health.database}`);
    console.log(`   Host: ${health.host}`);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 MongoDB Cluster Setup for CV Circle\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MongoDB Cluster Setup Script

Usage:
  node scripts/setup-mongodb-cluster.js [options]

Options:
  --help, -h          Show this help message
  --uri <uri>         Use provided MongoDB URI
  --test-only         Only test existing connection

Examples:
  node scripts/setup-mongodb-cluster.js
  node scripts/setup-mongodb-cluster.js --uri "mongodb+srv://user:pass@cluster.mongodb.net/cvcircle"
    `);
    process.exit(0);
  }
  
  if (args.includes('--test-only')) {
    // Test existing connection
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        const uri = uriMatch[1].trim();
        await testConnection(uri);
      } else {
        console.log('❌ No MONGODB_URI found in .env.local');
      }
    } else {
      console.log('❌ .env.local file not found');
    }
    rl.close();
    return;
  }
  
  let mongoDBURI = '';
  
  if (args.includes('--uri')) {
    const uriIndex = args.indexOf('--uri');
    if (uriIndex + 1 < args.length) {
      mongoDBURI = args[uriIndex + 1];
      console.log('📋 Using provided MongoDB URI');
    }
  } else {
    console.log('📋 Let\'s set up your MongoDB Atlas connection\n');
    
    console.log('🔗 To get your MongoDB URI:');
    console.log('1. Go to MongoDB Atlas (https://cloud.mongodb.com)');
    console.log('2. Select your cluster');
    console.log('3. Click "Connect"');
    console.log('4. Choose "Connect your application"');
    console.log('5. Copy the connection string\n');
    
    const username = await question('Enter your MongoDB username: ');
    const password = await question('Enter your MongoDB password: ');
    const cluster = await question('Enter your cluster address (e.g., cluster0.ta7jxv7.mongodb.net): ');
    const database = await question('Enter database name (default: cvcircle): ') || 'cvcircle';
    
    mongoDBURI = createMongoDBURI(username, password, cluster, database);
  }
  
  console.log('\n🔧 Generated MongoDB URI:');
  console.log(`   ${mongoDBURI.substring(0, 50)}...`);
  
  // Update .env.local
  const updated = updateEnvFile(mongoDBURI);
  
  if (updated) {
    // Test the connection
    const connected = await testConnection(mongoDBURI);
    
    if (connected) {
      console.log('\n🎉 MongoDB cluster setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Start your development server: npm run dev');
      console.log('2. Test the setup: npm run test-mongoose');
      console.log('3. Set up the database schema: npm run setup-mongodb');
      console.log('4. Test endpoints: curl http://localhost:3000/api/health');
    } else {
      console.log('\n❌ Setup completed but connection test failed.');
      console.log('Please check your MongoDB Atlas configuration:');
      console.log('1. Ensure your IP is whitelisted in Network Access');
      console.log('2. Verify username and password are correct');
      console.log('3. Check if the cluster is running');
    }
  }
  
  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createMongoDBURI, updateEnvFile, testConnection }; 