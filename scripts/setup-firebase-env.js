#!/usr/bin/env node

/**
 * Firebase Environment Setup Script
 * 
 * This script helps you set up Firebase environment variables for the login modal.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase Environment Setup Script');
console.log('====================================\n');

// Firebase configuration
const firebaseConfig = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyB7dE2gnnLPLk5hcWOBAJ9w8dM-f8G3-4g",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "cvcircle-app.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cvcircle-app",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "cvcircle-app.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "443355117710",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:443355117710:web:08a40d5020a53ff037f1df",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-LLY6JFVE1W"
};

// Generate .env.local content
const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${firebaseConfig.NEXT_PUBLIC_FIREBASE_API_KEY}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${firebaseConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${firebaseConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${firebaseConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${firebaseConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
NEXT_PUBLIC_FIREBASE_APP_ID=${firebaseConfig.NEXT_PUBLIC_FIREBASE_APP_ID}
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${firebaseConfig.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production

# Database Configuration (if you have MongoDB set up)
MONGODB_URI=mongodb+srv://cvcircle:cvcircle123@cluster0.mongodb.net/cvcircle?retryWrites=true&w=majority

# JWT Secret (if you have JWT set up)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
`;

const envPath = path.join(process.cwd(), '.env.local');

console.log('📝 Creating .env.local file...');

try {
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Creating backup...');
    const backupPath = path.join(process.cwd(), '.env.local.backup');
    fs.copyFileSync(envPath, backupPath);
    console.log('✅ Backup created as .env.local.backup');
  }

  // Write the new .env.local file
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created successfully!');

  console.log('\n🎉 Firebase environment variables are now configured!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Open the login modal - Google sign-in should now be visible');
  console.log('3. If you get "unauthorized-domain" error, run: npm run fix-firebase-domains');

  console.log('\n🔗 Quick Links:');
  console.log('   - Firebase Console: https://console.firebase.google.com/project/cvcircle-app/authentication/settings');
  console.log('   - Fix Firebase domains: npm run fix-firebase-domains');

} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
  console.log('\n📝 Manual Setup:');
  console.log('Create a .env.local file in your project root with this content:');
  console.log('\n' + envContent);
}

console.log('\n✅ Setup script completed!');
