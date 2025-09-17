# Email Service Setup Guide

This guide will help you configure email services for Circle CV to enable email verification and password reset functionality.

## Quick Setup Options

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Add to your `.env.local` file**:
   ```env
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=your-16-character-app-password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up for SendGrid** (free tier available)
2. **Get your API key** from SendGrid dashboard
3. **Add to your `.env.local` file**:
   ```env
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

### Option 3: Mailgun (Alternative)

1. **Sign up for Mailgun** (free tier available)
2. **Get your API key and domain** from Mailgun dashboard
3. **Add to your `.env.local` file**:
   ```env
   MAILGUN_API_KEY=your-mailgun-api-key
   MAILGUN_DOMAIN=your-mailgun-domain
   ```

### Option 4: AWS SES (Enterprise)

1. **Set up AWS SES** in your AWS account
2. **Verify your domain** in SES
3. **Add to your `.env.local` file**:
   ```env
   AWS_SES_ACCESS_KEY_ID=your-access-key
   AWS_SES_SECRET_ACCESS_KEY=your-secret-key
   AWS_SES_REGION=us-east-1
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   ```

## Testing Your Configuration

Run the email test script to verify your configuration:

```bash
node test-email-service.js
```

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Make sure you have at least one email provider configured
   - Check that your `.env.local` file has the correct variables

2. **"Authentication failed"**
   - For Gmail: Make sure you're using an App Password, not your regular password
   - For SendGrid: Verify your API key is correct
   - For Mailgun: Check your API key and domain

3. **"Connection timeout"**
   - Check your firewall settings
   - Verify the SMTP host and port are correct

4. **Emails not received**
   - Check spam/junk folder
   - Verify the sender email address is correct
   - Make sure your domain is verified (for production)

### Gmail Specific Issues

- **"Less secure app access"**: Use App Passwords instead
- **"2FA required"**: Enable 2-Factor Authentication first
- **"App password not working"**: Regenerate the app password

### Production Considerations

1. **Domain Verification**: Verify your sending domain
2. **SPF Records**: Add SPF records to your DNS
3. **DKIM**: Set up DKIM for better deliverability
4. **Rate Limits**: Be aware of sending limits
5. **Monitoring**: Set up email delivery monitoring

## Environment Variables Reference

### Gmail Configuration
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
```

### SendGrid Configuration
```env
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Mailgun Configuration
```env
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
```

### AWS SES Configuration
```env
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

## Next Steps

1. Choose an email provider from the options above
2. Follow the setup instructions
3. Test your configuration
4. Deploy with the same environment variables

For production deployment, make sure to set these environment variables in your hosting platform (Vercel, Railway, etc.).
