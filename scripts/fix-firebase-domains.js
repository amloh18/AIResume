#!/usr/bin/env node

/**
 * Firebase Domain Authorization Fix Script
 * 
 * This script helps diagnose and fix Firebase unauthorized domain errors.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase Domain Authorization Fix Script');
console.log('==========================================\n');

// Get current domain information
const getCurrentDomain = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  return 'http://localhost:3000';
};

const currentDomain = getCurrentDomain();
console.log(`📍 Current domain: ${currentDomain}`);

// Check environment variables
console.log('\n🔍 Checking Firebase environment variables...');

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
} else {
  console.log('✅ All required Firebase environment variables are set');
}

// Instructions for fixing the issue
console.log('\n📋 Steps to Fix Firebase Unauthorized Domain Error:');
console.log('==================================================');

console.log('\n1. 🔐 Go to Firebase Console:');
console.log('   https://console.firebase.google.com/');
console.log('   Select project: cvcircle-app');

console.log('\n2. 🛠️ Navigate to Authentication Settings:');
console.log('   Authentication → Settings → Authorized domains');

console.log('\n3. ➕ Add these domains to the authorized list:');
console.log('   - localhost (for development)');
if (currentDomain !== 'http://localhost:3000') {
  console.log(`   - ${new URL(currentDomain).hostname} (for production)`);
}

console.log('\n4. 🔄 If using Vercel, also add:');
console.log('   - your-app-name.vercel.app');
console.log('   - your-custom-domain.com (if you have one)');

console.log('\n5. 💾 Save the changes');

console.log('\n6. 🧪 Test the authentication:');
console.log('   - Clear browser cache and cookies');
console.log('   - Try logging in again');

// Check if running locally or on production
const isLocal = currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1');
const isVercel = currentDomain.includes('vercel.app');

console.log('\n🎯 Current Environment:');
console.log(`   - Local: ${isLocal ? 'Yes' : 'No'}`);
console.log(`   - Vercel: ${isVercel ? 'Yes' : 'No'}`);

if (isLocal) {
  console.log('\n💡 For Local Development:');
  console.log('   Make sure "localhost" is in your Firebase authorized domains');
  console.log('   You can also try using "127.0.0.1" if localhost doesn\'t work');
}

if (isVercel) {
  console.log('\n💡 For Vercel Deployment:');
  console.log('   Add your Vercel domain to Firebase authorized domains');
  console.log('   Format: your-app-name.vercel.app');
  console.log('   Also add any custom domains you\'re using');
}

console.log('\n🔗 Quick Links:');
console.log('   - Firebase Console: https://console.firebase.google.com/project/cvcircle-app/authentication/settings');
console.log('   - Vercel Dashboard: https://vercel.com/dashboard');

console.log('\n✅ Script completed! Follow the steps above to fix the unauthorized domain error.');
