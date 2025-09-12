const { testEmailService, sendEmailVerification } = require('./src/lib/email-service.ts');

async function testEmail() {
  console.log('🧪 Testing email service configuration...\n');
  
  // Test email service configuration
  const configTest = await testEmailService();
  console.log('📧 Email Service Configuration Test:');
  console.log(`   Status: ${configTest.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Message: ${configTest.success ? configTest.message : configTest.error}\n`);
  
  if (configTest.success) {
    console.log('📨 Testing email sending...');
    const testEmail = 'test@example.com';
    const verificationLink = 'https://example.com/verify?token=test123';
    const firstName = 'Test User';
    
    const emailTest = await sendEmailVerification(testEmail, verificationLink, firstName);
    console.log(`   Status: ${emailTest.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${emailTest.success ? `Email sent (ID: ${emailTest.messageId})` : emailTest.error}`);
  } else {
    console.log('⚠️ Skipping email sending test due to configuration issues.');
    console.log('\n📋 To fix email service configuration:');
    console.log('   1. Set EMAIL_SERVER_HOST (e.g., smtp.gmail.com)');
    console.log('   2. Set EMAIL_SERVER_PORT (e.g., 587)');
    console.log('   3. Set EMAIL_SERVER_USER (your email address)');
    console.log('   4. Set EMAIL_SERVER_PASSWORD (your app password)');
    console.log('\n📧 For Gmail:');
    console.log('   - Enable 2-factor authentication');
    console.log('   - Generate an App Password');
    console.log('   - Use the App Password as EMAIL_SERVER_PASSWORD');
  }
}

testEmail().catch(console.error);
