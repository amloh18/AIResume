const { testEmailService, sendEmailVerification, getEmailServiceStatus } = require('./src/lib/email-service-enhanced.ts');

async function testEmailEnhanced() {
  console.log('🧪 Testing Enhanced Email Service Configuration...\n');
  
  // Check email service status
  const status = getEmailServiceStatus();
  console.log('📧 Email Service Status:');
  console.log(`   Configured: ${status.configured ? '✅ Yes' : '❌ No'}`);
  console.log(`   Provider: ${status.provider}`);
  console.log(`   Message: ${status.message}\n`);
  
  if (status.configured) {
    console.log('📋 Configuration Details:');
    console.log(`   Host: ${status.host}`);
    console.log(`   Port: ${status.port}`);
    console.log(`   Secure: ${status.secure}\n`);
  }
  
  // Test email service configuration
  const configTest = await testEmailService();
  console.log('🔧 Email Service Configuration Test:');
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
    console.log('⚠️ Skipping email sending test due to configuration issues.\n');
    
    console.log('📋 Available Email Providers:');
    console.log('   1. Gmail (Development)');
    console.log('      - EMAIL_SERVER_HOST=smtp.gmail.com');
    console.log('      - EMAIL_SERVER_PORT=587');
    console.log('      - EMAIL_SERVER_USER=your-email@gmail.com');
    console.log('      - EMAIL_SERVER_PASSWORD=your-app-password');
    console.log('');
    console.log('   2. SendGrid (Production)');
    console.log('      - SENDGRID_API_KEY=your-sendgrid-api-key');
    console.log('      - SENDGRID_FROM_EMAIL=noreply@yourdomain.com');
    console.log('');
    console.log('   3. Mailgun (Alternative)');
    console.log('      - MAILGUN_API_KEY=your-mailgun-api-key');
    console.log('      - MAILGUN_DOMAIN=your-mailgun-domain');
    console.log('');
    console.log('   4. AWS SES (Enterprise)');
    console.log('      - AWS_SES_ACCESS_KEY_ID=your-access-key');
    console.log('      - AWS_SES_SECRET_ACCESS_KEY=your-secret-key');
    console.log('      - AWS_SES_REGION=us-east-1');
    console.log('      - AWS_SES_FROM_EMAIL=noreply@yourdomain.com');
    console.log('');
    console.log('📖 See EMAIL_SETUP_GUIDE.md for detailed setup instructions.');
  }
}

testEmailEnhanced().catch(console.error);
