# OAuth Setup Guide for CVCircle

This guide will help you set up Google and Apple OAuth authentication for your CVCircle application.

## Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: CVCircle
   - User support email: your-email@domain.com
   - Developer contact information: your-email@domain.com

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google`
5. Copy the Client ID and Client Secret

### 4. Update Environment Variables
Add to your `.env.local`:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Apple OAuth Setup

### 1. Apple Developer Account
1. You need an Apple Developer account ($99/year)
2. Go to [Apple Developer Portal](https://developer.apple.com/)

### 2. Create App ID
1. Go to "Certificates, Identifiers & Profiles"
2. Create a new App ID
3. Enable "Sign In with Apple" capability

### 3. Create Service ID
1. Create a new Service ID
2. Configure "Sign In with Apple"
3. Add your domain and redirect URLs:
   - For development: `http://localhost:3000/api/auth/callback/apple`
   - For production: `https://your-domain.com/api/auth/callback/apple`

### 4. Create Private Key
1. Create a new Key with "Sign In with Apple" enabled
2. Download the .p8 file
3. Note the Key ID

### 5. Update Environment Variables
Add to your `.env.local`:
```env
# Apple OAuth
APPLE_ID=your-service-id-here
APPLE_SECRET=your-private-key-here
NEXT_PUBLIC_APPLE_ID=your-service-id-here
NEXT_PUBLIC_APPLE_SECRET=your-private-key-here
```

## Development Testing

For development and testing purposes, you can use these test credentials:

### Google Test Credentials (Development Only)
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456
```

### Apple Test Credentials (Development Only)
```env
APPLE_ID=com.cvcircle.signin
APPLE_SECRET=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----
NEXT_PUBLIC_APPLE_ID=com.cvcircle.signin
NEXT_PUBLIC_APPLE_SECRET=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----
```

## Security Notes

1. **Never commit real OAuth credentials to version control**
2. **Use different credentials for development and production**
3. **Regularly rotate your OAuth secrets**
4. **Restrict redirect URIs to your actual domains**
5. **Monitor OAuth usage in your provider dashboards**

## Troubleshooting

### Common Issues

1. **OAuth buttons not showing**: Check that `NEXT_PUBLIC_` prefixed variables are set
2. **Redirect URI mismatch**: Ensure redirect URIs match exactly in provider settings
3. **Invalid client**: Verify client ID and secret are correct
4. **CORS errors**: Check that your domain is authorized in provider settings

### Testing OAuth Flow

1. Start your development server: `npm run dev`
2. Navigate to the login page
3. Click on Google/Apple login buttons
4. Complete the OAuth flow
5. Check that user is created in your database

## Production Deployment

When deploying to production:

1. Update redirect URIs in OAuth provider settings
2. Set production environment variables
3. Test OAuth flow on production domain
4. Monitor OAuth logs for any issues

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review NextAuth.js documentation
3. Check provider-specific documentation
4. Verify environment variables are loaded correctly