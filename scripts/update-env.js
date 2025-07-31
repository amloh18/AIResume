#!/usr/bin/env node

/**
 * Environment Variables Update Script
 * 
 * This script helps you update your environment variables for the new MongoDB cluster.
 */

const fs = require('fs');
const path = require('path');

function generateNewEnvFile() {
  const envContent = `# Database Configuration - NEW CLUSTER
# Replace with your new MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# AI API Keys
GEMINI_API_KEY=AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA
PERPLEXITY_API_KEY=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

# JWT Secret (Generate a new one for security)
JWT_SECRET=${require('crypto').randomBytes(32).toString('base64')}

# Next.js Configuration
# Update this with your actual Vercel domain
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=${require('crypto').randomBytes(32).toString('base64')}

# Email Service (for email verification, password reset, etc.)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password

# File Upload (for CV attachments, avatars, etc.)
UPLOAD_DIR=./public/uploads

# Vercel-specific variables
VERCEL_ENV=production
NODE_ENV=production

# Migration Variables (for data migration)
OLD_MONGODB_URI=mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle?retryWrites=true&w=majority
NEW_MONGODB_URI=mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle?retryWrites=true&w=majority
`;

  return envContent;
}

function updateVercelEnvInstructions() {
  console.log(`
🔧 Vercel Environment Variables Update Instructions:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Update the following variables:

   MONGODB_URI=mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle?retryWrites=true&w=majority

4. Click "Save" and redeploy your project

📝 Note: Replace the connection string with your actual new MongoDB Atlas connection string.
  `);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Environment Variables Update Script

Usage:
  node scripts/update-env.js [options]

Options:
  --help, -h          Show this help message
  --generate-env      Generate a new .env file
  --vercel-instructions Show Vercel update instructions

Examples:
  node scripts/update-env.js --generate-env
  node scripts/update-env.js --vercel-instructions
    `);
    return;
  }
  
  if (args.includes('--generate-env')) {
    const envContent = generateNewEnvFile();
    const envPath = path.join(process.cwd(), '.env.new');
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Generated new environment file: ${envPath}`);
    console.log('📝 Please review and update the connection strings with your actual values.');
    return;
  }
  
  if (args.includes('--vercel-instructions')) {
    updateVercelEnvInstructions();
    return;
  }
  
  // Default behavior
  console.log('🔧 MongoDB Cluster Migration - Environment Variables Update\n');
  
  console.log('📋 Steps to update your environment variables:\n');
  
  console.log('1️⃣ Generate new environment file:');
  console.log('   node scripts/update-env.js --generate-env\n');
  
  console.log('2️⃣ Update Vercel environment variables:');
  console.log('   node scripts/update-env.js --vercel-instructions\n');
  
  console.log('3️⃣ Test the new connection:');
  console.log('   npm run test-deployment\n');
  
  console.log('4️⃣ Migrate data (if needed):');
  console.log('   npm run migrate-mongodb\n');
}

if (require.main === module) {
  main();
}

module.exports = { generateNewEnvFile, updateVercelEnvInstructions }; 