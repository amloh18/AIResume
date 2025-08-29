#!/usr/bin/env node

/**
 * Google Authentication Test Script
 * 
 * This script helps test and debug the Google authentication flow.
 */

console.log('🧪 Google Authentication Test Script');
console.log('====================================\n');

// Check environment variables
console.log('🔍 Checking Firebase environment variables...');

const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
];

const missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Missing environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n💡 Run this command to set up Firebase environment:');
  console.log('   npm run setup-firebase-env');
} else {
  console.log('✅ All required Firebase environment variables are set');
}

// Check if .env.local exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists');
  
  // Read and check the content
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasFirebaseConfig = envContent.includes('NEXT_PUBLIC_FIREBASE_API_KEY');
  
  if (hasFirebaseConfig) {
    console.log('✅ Firebase configuration found in .env.local');
  } else {
    console.log('❌ Firebase configuration missing from .env.local');
  }
} else {
  console.log('❌ .env.local file not found');
  console.log('\n💡 Run this command to create it:');
  console.log('   npm run setup-firebase-env');
}

console.log('\n🔧 Testing Steps:');
console.log('================');

console.log('\n1. 🚀 Start the development server:');
console.log('   npm run dev');

console.log('\n2. 🌐 Open your browser and go to:');
console.log('   http://localhost:3000');

console.log('\n3. 🔑 Test Google Sign-In:');
console.log('   - Click "Login" or "Sign Up"');
console.log('   - Click "Continue with Google"');
console.log('   - Complete the Google OAuth flow');

console.log('\n4. 📊 Check the browser console for logs:');
console.log('   - Look for messages starting with 🔍, ✅, 🆕, etc.');
console.log('   - Check for any error messages');

console.log('\n5. 🔄 Expected Flow:');
console.log('   - User clicks Google sign-in');
console.log('   - Firebase popup opens');
console.log('   - User authenticates with Google');
console.log('   - User data stored in localStorage');
console.log('   - User redirected to dashboard or onboarding');

console.log('\n6. 🐛 If redirect fails:');
console.log('   - Check browser console for errors');
console.log('   - Verify Firebase domain authorization');
console.log('   - Run: npm run fix-firebase-domains');

console.log('\n🔗 Useful Commands:');
console.log('==================');
console.log('npm run setup-firebase-env    # Set up Firebase environment');
console.log('npm run fix-firebase-domains  # Fix domain authorization');
console.log('npm run dev                   # Start development server');

console.log('\n📚 Debugging Tips:');
console.log('==================');
console.log('• Check browser console for detailed logs');
console.log('• Verify localStorage has user data after sign-in');
console.log('• Ensure Firebase domain is authorized');
console.log('• Check network tab for API calls');

console.log('\n✅ Test script completed!');
