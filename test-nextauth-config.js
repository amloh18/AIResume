// Test NextAuth configuration
console.log('🔍 Testing NextAuth Configuration...');

// Check environment variables
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// Check if required variables are missing
const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'MONGODB_URI',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
} else {
  console.log('✅ All required environment variables are set');
}

// Test Firebase Admin SDK
try {
  const admin = require('firebase-admin');
  console.log('✅ Firebase Admin SDK loaded');
  
  if (admin.apps.length > 0) {
    console.log('✅ Firebase Admin app initialized');
  } else {
    console.log('⚠️ Firebase Admin app not initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK error:', error.message);
}

// Test MongoDB connection
try {
  const mongoose = require('mongoose');
  console.log('✅ Mongoose loaded');
} catch (error) {
  console.error('❌ Mongoose error:', error.message);
}

console.log('🔍 NextAuth configuration test complete');
