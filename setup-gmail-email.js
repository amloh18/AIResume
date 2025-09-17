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

async function setupGmailEmail() {
  console.log('📧 Gmail Email Setup for Circle CV\n');
  
  console.log('This script will help you configure Gmail for email verification.\n');
  
  console.log('📋 Prerequisites:');
  console.log('   1. Gmail account with 2-Factor Authentication enabled');
  console.log('   2. App Password generated (not your regular password)\n');
  
  console.log('🔗 To generate an App Password:');
  console.log('   1. Go to https://myaccount.google.com/security');
  console.log('   2. Enable 2-Step Verification if not already enabled');
  console.log('   3. Go to "App passwords" section');
  console.log('   4. Generate a new app password for "Mail"');
  console.log('   5. Copy the 16-character password\n');
  
  const email = await question('Enter your Gmail address: ');
  const appPassword = await question('Enter your Gmail App Password (16 characters): ');
  
  if (!email || !appPassword) {
    console.log('❌ Both email and app password are required.');
    rl.close();
    return;
  }
  
  if (!email.includes('@gmail.com')) {
    console.log('⚠️ Warning: This appears to be a non-Gmail address. Make sure you have the correct SMTP settings.');
  }
  
  if (appPassword.length !== 16) {
    console.log('⚠️ Warning: App password should be 16 characters long.');
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
  
  // Check if email configuration already exists
  if (envContent.includes('EMAIL_SERVER_HOST')) {
    console.log('⚠️ Email configuration already exists in .env.local');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
    
    // Remove existing email configuration
    envContent = envContent.replace(/\n# Email Service Configuration.*?(?=\n\n|\n[A-Z]|\n#|\n$)/s, '');
  }
  
  // Add email configuration
  const emailConfig = `

# Email Service Configuration (Gmail)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=${email}
EMAIL_SERVER_PASSWORD=${appPassword}`;
  
  // Append to .env.local
  const updatedContent = envContent + emailConfig;
  
  try {
    fs.writeFileSync(envPath, updatedContent);
    console.log('✅ Email configuration added to .env.local');
  } catch (error) {
    console.log('❌ Failed to write to .env.local:', error.message);
    rl.close();
    return;
  }
  
  console.log('\n🧪 Testing email configuration...');
  
  // Test the configuration
  const { testEmailService } = require('./src/lib/email-service.ts');
  
  try {
    const result = await testEmailService();
    if (result.success) {
      console.log('✅ Email service is working correctly!');
      console.log('📧 You can now create accounts and receive verification emails.');
    } else {
      console.log('❌ Email service test failed:', result.error);
      console.log('🔧 Please check your Gmail App Password and try again.');
    }
  } catch (error) {
    console.log('❌ Error testing email service:', error.message);
  }
  
  console.log('\n📖 Next steps:');
  console.log('   1. Try creating a new account');
  console.log('   2. Check your email for verification');
  console.log('   3. If emails go to spam, mark them as "Not Spam"');
  
  rl.close();
}

setupGmailEmail().catch(console.error);
