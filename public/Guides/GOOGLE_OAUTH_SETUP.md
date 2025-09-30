# Google OAuth Setup Guide for Clerk

## Issue: "Failed to sign up with Google. Please try again."

This error typically occurs when Google OAuth is not properly configured in your Clerk dashboard. Follow these steps to fix it:

## Step 1: Configure Google OAuth in Clerk Dashboard

1. **Go to your Clerk Dashboard**
   - Visit: https://dashboard.clerk.com
   - Select your application

2. **Navigate to Social Connections**
   - Go to "User & Authentication" → "Social Connections"
   - Find "Google" in the list

3. **Enable Google OAuth**
   - Toggle "Enable for sign-up and sign-in" to ON
   - Choose either:
     - **Use Clerk's credentials** (Recommended for testing)
     - **Use custom credentials** (For production)

## Step 2: If Using Custom Credentials

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "CVCircle OAuth"

4. **Configure Authorized Redirect URIs**
   Add these URIs (replace with your actual domain):
   ```
   https://your-app-domain.com/api/auth/callback/google
   https://your-app-domain.com/sso-callback
   ```

5. **Get Client ID and Secret**
   - Copy the Client ID and Client Secret
   - Paste them into your Clerk dashboard

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - In Google Cloud Console: "APIs & Services" → "OAuth consent screen"

2. **Set Publishing Status**
   - For testing: Set to "Testing" and add test users
   - For production: Set to "In production"

3. **Required Fields**
   - App name: "CVCircle"
   - User support email: Your email
   - Developer contact: Your email

## Step 4: Test the Configuration

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Try Google sign-up again
   - Look for detailed error messages in console

2. **Common Error Messages**
   - "redirect_uri_mismatch": Check redirect URIs in Google Console
   - "access_denied": OAuth consent screen not configured
   - "invalid_client": Wrong Client ID/Secret

## Step 5: Alternative - Use Clerk's Default Credentials

If you're having trouble with custom credentials:

1. **In Clerk Dashboard**
   - Go to Social Connections → Google
   - Toggle "Use Clerk's credentials" to ON
   - This uses Clerk's pre-configured Google OAuth

2. **Note**: This is perfect for development and testing

## Troubleshooting Checklist

- [ ] Google OAuth enabled in Clerk dashboard
- [ ] Redirect URIs configured correctly
- [ ] OAuth consent screen published
- [ ] Client ID and Secret are correct (if using custom)
- [ ] Domain matches in both Clerk and Google Console
- [ ] No typos in configuration

## Testing Steps

1. Clear browser cache and cookies
2. Try Google sign-up again
3. Check browser console for detailed errors
4. Verify redirect URLs are accessible

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify your Clerk dashboard configuration
3. Ensure your Google Cloud Console settings match
4. Try using Clerk's default credentials first

## Production Considerations

For production deployment:
- Use custom Google OAuth credentials
- Set OAuth consent screen to "In production"
- Add your production domain to authorized redirect URIs
- Test thoroughly before going live
