# Google OAuth Sign-in Issue - Fix Guide

## 🚨 **Current Issue**
Google OAuth sign-in gets stuck at the account selection page and doesn't redirect back to the application.

## 🔧 **Root Cause**
The issue is likely due to incorrect redirect URI configuration in Google Cloud Console.

## ✅ **Solution Steps**

### **1. Update Google Cloud Console Configuration**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `cvcircle-app`
3. **Navigate to APIs & Services > Credentials**
4. **Find your OAuth 2.0 Client ID**: `443355117710-7oo5h0ijnr70b0c9papms6le1fspv49f.apps.googleusercontent.com`
5. **Click Edit**

### **2. Update Authorized Redirect URIs**

Add these exact URIs (case-sensitive):

**For Development:**
```
http://localhost:3000/api/auth/callback/google
```

**For Production:**
```
https://yourdomain.com/api/auth/callback/google
```

### **3. Update Authorized JavaScript Origins**

**For Development:**
```
http://localhost:3000
```

**For Production:**
```
https://yourdomain.com
```

### **4. Verify OAuth Consent Screen**

1. **Go to OAuth consent screen**
2. **Ensure these scopes are added:**
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`

### **5. Test the Configuration**

After updating the redirect URIs:

1. **Clear browser cache and cookies**
2. **Restart your development server**
3. **Try signing in with Google again**

## 🔍 **Debugging Steps**

### **Check Server Logs**
Look for these log messages in your terminal:
```
🔐 SignIn callback triggered: { provider: 'google', email: '...', hasAccount: true, hasProfile: true }
🔐 Google OAuth sign-in: user@example.com
✅ Existing user found, updating last login
```

### **Check Network Tab**
1. Open browser DevTools
2. Go to Network tab
3. Try Google sign-in
4. Look for requests to `/api/auth/callback/google`
5. Check if there are any 404 or 500 errors

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| "redirect_uri_mismatch" | Update redirect URI in Google Cloud Console |
| "invalid_client" | Check client ID and secret in environment variables |
| "access_denied" | User cancelled the OAuth flow |
| "server_error" | Check server logs for detailed error |

## 🛠️ **Code Changes Made**

1. **Updated OAuth prompt**: Changed from `consent` to `select_account`
2. **Added error handling**: Enhanced logging in signIn callback
3. **Added error page**: Created `/auth/error` page for OAuth errors
4. **Added pages configuration**: Set custom sign-in and error pages

## 📝 **Environment Variables Check**

Ensure these are set correctly in your `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=443355117710-7oo5h0ijnr70b0c9papms6le1fspv49f.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## 🚀 **Next Steps**

1. **Update Google Cloud Console** with correct redirect URIs
2. **Restart your development server**
3. **Test the sign-in flow**
4. **Check server logs** for any remaining issues

If the issue persists, check the server logs for specific error messages and share them for further debugging.
