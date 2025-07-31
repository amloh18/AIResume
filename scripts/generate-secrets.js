#!/usr/bin/env node

/**
 * Generate Secure Secrets Script
 * 
 * This script generates secure random strings for environment variables.
 * Use these generated secrets in your Vercel environment variables.
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

function generateJWTSecret() {
  return generateSecret(32);
}

function generateNextAuthSecret() {
  return generateSecret(32);
}

function generateMongoDBURI() {
  console.log('\n📝 MongoDB Atlas Connection String Template:');
  console.log('mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority');
  console.log('\n💡 Replace:');
  console.log('  - username: your MongoDB Atlas username');
  console.log('  - password: your MongoDB Atlas password');
  console.log('  - cluster: your cluster name');
  console.log('  - cvcircle: your database name');
}

function main() {
  console.log('🔐 Generating Secure Secrets for Vercel Environment Variables\n');
  
  console.log('1️⃣ JWT Secret:');
  console.log(`JWT_SECRET=${generateJWTSecret()}\n`);
  
  console.log('2️⃣ NextAuth Secret:');
  console.log(`NEXTAUTH_SECRET=${generateNextAuthSecret()}\n`);
  
  console.log('3️⃣ MongoDB Connection String:');
  generateMongoDBURI();
  
  console.log('\n📋 Complete Environment Variables for Vercel:');
  console.log('==============================================');
  console.log(`MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority`);
  console.log(`JWT_SECRET=${generateJWTSecret()}`);
  console.log(`NEXTAUTH_SECRET=${generateNextAuthSecret()}`);
  console.log('NEXTAUTH_URL=https://your-app-name.vercel.app');
  console.log('GEMINI_API_KEY=AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA');
  console.log('PERPLEXITY_API_KEY=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');
  console.log('EMAIL_SERVER_HOST=smtp.gmail.com');
  console.log('EMAIL_SERVER_PORT=587');
  console.log('EMAIL_SERVER_USER=your-email@gmail.com');
  console.log('EMAIL_SERVER_PASSWORD=your-app-password');
  console.log('UPLOAD_DIR=./public/uploads');
  console.log('VERCEL_ENV=production');
  console.log('NODE_ENV=production');
  
  console.log('\n✅ Copy these variables to your Vercel project settings!');
  console.log('🔗 Go to: Vercel Dashboard → Your Project → Settings → Environment Variables');
}

if (require.main === module) {
  main();
}

module.exports = { generateJWTSecret, generateNextAuthSecret, generateMongoDBURI }; 