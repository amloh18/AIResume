#!/usr/bin/env node

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

async function fixGoogleAuth() {
  console.log('🔧 Google Authentication Fix for Circle CV\n');
  
  console.log('This script will help you fix Google sign-in/signup issues.\n');
  
  console.log('📋 Issues Found:');
  console.log('   1. Missing Google OAuth credentials in environment');
  console.log('   2. Firebase project may not have Google sign-in enabled');
  console.log('   3. Authentication flow inconsistencies\n');
  
  console.log('🔗 To get Google OAuth credentials:');
  console.log('   1. Go to https://console.cloud.google.com/');
  console.log('   2. Select your Firebase project: cvcircle-app');
  console.log('   3. Go to "APIs & Services" > "Credentials"');
  console.log('   4. Find your OAuth 2.0 Client ID (Web application)');
  console.log('   5. Copy the Client ID and Client Secret\n');
  
  const clientId = await question('Enter your Google OAuth Client ID: ');
  const clientSecret = await question('Enter your Google OAuth Client Secret: ');
  
  if (!clientId || !clientSecret) {
    console.log('❌ Both Client ID and Client Secret are required.');
    rl.close();
    return;
  }
  
  // Read current .env.local file
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('❌ Could not read .env.local file. Please make sure it exists.');
    rl.close();
    return;
  }
  
  // Check if Google OAuth configuration already exists
  if (envContent.includes('GOOGLE_CLIENT_ID')) {
    console.log('⚠️ Google OAuth configuration already exists in .env.local');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
    
    // Remove existing Google OAuth configuration
    envContent = envContent.replace(/\n# Google OAuth Configuration.*?(?=\n\n|\n[A-Z]|\n#|\n$)/s, '');
  }
  
  // Add Google OAuth configuration
  const googleConfig = `

# Google OAuth Configuration
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}
NEXT_PUBLIC_GOOGLE_CLIENT_ID=${clientId}`;
  
  // Append to .env.local
  const updatedContent = envContent + googleConfig;
  
  try {
    fs.writeFileSync(envPath, updatedContent);
    console.log('✅ Google OAuth configuration added to .env.local');
  } catch (error) {
    console.log('❌ Failed to write to .env.local:', error.message);
    rl.close();
    return;
  }
  
  console.log('\n🔧 Additional Steps Required:');
  console.log('   1. Enable Google sign-in in Firebase Console:');
  console.log('      - Go to https://console.firebase.google.com/');
  console.log('      - Select project: cvcircle-app');
  console.log('      - Go to Authentication > Sign-in method');
  console.log('      - Enable Google provider');
  console.log('      - Add authorized domains: localhost, your-domain.com');
  console.log('');
  console.log('   2. Update OAuth consent screen:');
  console.log('      - Go to https://console.cloud.google.com/');
  console.log('      - Select project: cvcircle-app');
  console.log('      - Go to "APIs & Services" > "OAuth consent screen"');
  console.log('      - Add test users or publish the app');
  console.log('');
  console.log('   3. Add authorized redirect URIs:');
  console.log('      - Go to "APIs & Services" > "Credentials"');
  console.log('      - Edit your OAuth 2.0 Client ID');
  console.log('      - Add redirect URIs:');
  console.log('        * http://localhost:3000/api/auth/callback/google');
  console.log('        * https://your-domain.com/api/auth/callback/google');
  
  console.log('\n🧪 Testing Google Authentication...');
  
  // Test the configuration
  try {
    const { testGoogleAuth } = require('./src/lib/google-auth-test.ts');
    const result = await testGoogleAuth();
    if (result.success) {
      console.log('✅ Google authentication is working correctly!');
    } else {
      console.log('❌ Google authentication test failed:', result.error);
    }
  } catch (error) {
    console.log('⚠️ Could not test Google authentication:', error.message);
    console.log('   Please restart your development server and try again.');
  }
  
  console.log('\n📖 Next steps:');
  console.log('   1. Restart your development server: npm run dev');
  console.log('   2. Try Google sign-in on your application');
  console.log('   3. Check browser console for any errors');
  
  rl.close();
}

fixGoogleAuth().catch(console.error);
