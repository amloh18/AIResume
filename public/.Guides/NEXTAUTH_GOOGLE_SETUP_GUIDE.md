# NextAuth + Google OAuth Setup & Testing Guide

## 🎯 Overview

This guide covers the complete NextAuth authentication system with Google OAuth integration for CVCircle.io.

**Status:** ✅ **FULLY CONFIGURED AND READY**

## 📋 What's Been Implemented

### 1. **Unified Authentication System**
- ✅ NextAuth v4 as the single authentication provider
- ✅ JWT session strategy (stateless, HTTP-only cookies)
- ✅ MongoDB integration for user management
- ✅ Comprehensive TypeScript type definitions

### 2. **Authentication Providers**
- ✅ **Google OAuth** - Social login with automatic account creation
- ✅ **Email/Password** - Credentials provider with MongoDB user lookup
- ✅ **Admin Login** - Separate credentials provider for admin users

### 3. **Key Files Created/Updated**
- ✅ `src/lib/auth-config.ts` - Centralized NextAuth configuration
- ✅ `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API handler
- ✅ `src/middleware.ts` - Authentication middleware (simplified)
- ✅ `src/types/next-auth.d.ts` - TypeScript type extensions
- ✅ `src/app/api/auth/register-user/route.ts` - User registration endpoint

## 🔧 Environment Variables Setup

### Required Environment Variables

Create a `.env` file in your project root with the following:

```bash
# MongoDB Connection
MONGODB_URI=your-mongodb-connection-string

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-min-32-chars

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services (optional)
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

### How to Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name it (e.g., "CVCircle Production")
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" (for public apps)
   - Fill in:
     - App name: CVCircle.io
     - User support email: your@email.com
     - Developer contact: your@email.com
   - Click "Save and Continue"
   - Skip scopes (default is fine)
   - Add test users if needed
   - Click "Save and Continue"

5. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "CVCircle Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
   - Click "Create"
   - **Copy the Client ID and Client Secret** to your `.env` file

6. **Generate NEXTAUTH_SECRET**
   ```bash
   # Run this in your terminal
   openssl rand -base64 32
   ```
   Copy the output to `NEXTAUTH_SECRET` in `.env`

## 🧪 Testing Guide

### Test 1: Google OAuth Sign-In Flow

**Steps:**
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to sign-in page:
   ```
   http://localhost:3000/sign-in
   ```

3. Click "Sign in with Google"

4. **Expected Behavior:**
   - Redirects to Google OAuth consent screen
   - After approval, redirects back to your app
   - If new user: Creates account in MongoDB
   - If existing user: Logs in
   - Redirects to `/dashboard`

5. **Verify in Database:**
   - Check MongoDB `users` collection
   - New user should have:
     - `authProvider: "nextauth"`
     - `authProviderId: "<google-user-id>"`
     - `isEmailVerified: true`
     - `email`, `firstName`, `lastName` from Google profile

**Troubleshooting:**
- ❌ **"Error: redirect_uri_mismatch"**
  - Solution: Add `http://localhost:3000/api/auth/callback/google` to Google Console authorized redirect URIs

- ❌ **"Error: invalid_client"**
  - Solution: Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

- ❌ **"Error: Unauthorized"**
  - Solution: Check `NEXTAUTH_SECRET` is set in `.env`

### Test 2: Email/Password Sign-Up Flow

**Steps:**
1. Navigate to sign-up page:
   ```
   http://localhost:3000/sign-up
   ```

2. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Password: SecurePass123!
   - Confirm Password: SecurePass123!

3. Click "Create Account"

4. **Expected Behavior:**
   - Success message: "Account created! Check your email to verify"
   - Verification email sent
   - User created in MongoDB with `isEmailVerified: false`

5. **Verify Email:**
   - Check your email inbox
   - Click verification link
   - Should see "Email verified successfully"

6. **Sign In:**
   - Go to `/sign-in`
   - Enter email and password
   - Should redirect to `/dashboard`

**Troubleshooting:**
- ❌ **"Password must contain..."**
  - Solution: Password requires 8+ chars, uppercase, lowercase, number, special char

- ❌ **"User already exists"**
  - Solution: Email is already registered, use sign-in instead

- ❌ **"Please verify your email"**
  - Solution: Check email for verification link

### Test 3: Admin Sign-In Flow

**Steps:**
1. Create an admin user in MongoDB manually or use the script:
   ```bash
   npm run scripts/create-admin-user.js
   ```

2. Navigate to admin sign-in:
   ```
   http://localhost:3000/admin/signin
   ```

3. Enter admin credentials

4. **Expected Behavior:**
   - Redirects to `/admin` dashboard
   - Session includes `type: "admin"` and `role: "superadmin"`

### Test 4: Protected Routes

**Test without authentication:**
1. Open incognito/private window
2. Try to access: `http://localhost:3000/dashboard`
3. **Expected:** Redirects to `/sign-in?callbackUrl=/dashboard`

**Test with authentication:**
1. Sign in first
2. Access: `http://localhost:3000/dashboard`
3. **Expected:** Dashboard loads successfully

### Test 5: API Routes Authentication

**Test protected API endpoint:**

```bash
# Without auth (should fail)
curl http://localhost:3000/api/cvs

# Expected: {"error":"Unauthorized"} with 401 status

# With auth (after signing in, get cookie from browser)
curl http://localhost:3000/api/cvs \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected: CV data or empty array
```

### Test 6: Sign-Out Flow

**Steps:**
1. Sign in to the app
2. Click "Sign Out" button
3. **Expected Behavior:**
   - Redirects to `/sign-in`
   - Session cookie cleared
   - Accessing protected routes redirects to sign-in

## 🔍 Debugging Tools

### 1. Check Session Data (Client-Side)

Add this to any client component:

```tsx
'use client';
import { useSession } from 'next-auth/react';

export default function DebugSession() {
  const { data: session, status } = useSession();
  
  return (
    <pre>{JSON.stringify({ status, session }, null, 2)}</pre>
  );
}
```

### 2. Check Session Data (Server-Side)

Add this to any server component or API route:

```tsx
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';

export default async function ServerComponent() {
  const session = await getServerSession(authConfig);
  
  return (
    <pre>{JSON.stringify(session, null, 2)}</pre>
  );
}
```

### 3. View NextAuth Logs

Set `debug: true` in `auth-config.ts` (already enabled in development):

```bash
npm run dev
```

Watch the console for detailed NextAuth logs:
- 🔐 JWT callback logs
- 📝 Session callback logs
- ✅ Sign-in events
- 📧 User creation logs

### 4. MongoDB User Inspection

```bash
# Connect to MongoDB
mongosh "your-mongodb-uri"

# Switch to database
use cvcircle

# Find user by email
db.users.findOne({ email: "user@example.com" })

# Check user's auth provider
db.users.find({ authProvider: "nextauth" })

# Count OAuth users
db.users.countDocuments({ authProviderId: { $exists: true } })
```

## 🚀 Production Deployment Checklist

### Before Deploying

- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Generate new production `NEXTAUTH_SECRET`
- [ ] Add production redirect URI to Google Console
- [ ] Test Google OAuth in production environment
- [ ] Verify MongoDB connection string is production cluster
- [ ] Enable email service for verification emails
- [ ] Test all authentication flows in production

### Environment Variables for Production

```bash
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-new-secret-for-production
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
MONGODB_URI=your-production-mongodb-uri
```

### Google Console Production Setup

1. Add production authorized redirect URI:
   - `https://yourdomain.com/api/auth/callback/google`

2. Update authorized JavaScript origins:
   - `https://yourdomain.com`

3. Verify OAuth consent screen is published

4. Remove test users restriction (if applicable)

## 📚 Additional Resources

### NextAuth Documentation
- **Main Docs:** https://next-auth.js.org/
- **Google Provider:** https://next-auth.js.org/providers/google
- **JWT Strategy:** https://next-auth.js.org/configuration/options#session
- **Callbacks:** https://next-auth.js.org/configuration/callbacks

### Code References

**Main Configuration:** `src/lib/auth-config.ts`
```typescript
export const authConfig: NextAuthOptions = {
  providers: [GoogleProvider, CredentialsProvider],
  callbacks: { jwt, session, signIn },
  session: { strategy: 'jwt' },
}
```

**Sign-In Component:** `src/components/auth/SignInForm.tsx`
```typescript
// Google OAuth
await signIn('google', { callbackUrl: '/dashboard' });

// Credentials
await signIn('credentials', { email, password });
```

**Protected API Route:**
```typescript
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return new Response('Unauthorized', { status: 401 });
  
  // User is authenticated
  const userId = token.id;
}
```

## ✅ Success Criteria

Your NextAuth + Google OAuth setup is working correctly if:

1. ✅ Google sign-in creates new users or signs in existing users
2. ✅ Email/password sign-in works after email verification
3. ✅ Protected routes redirect unauthenticated users to sign-in
4. ✅ Protected API routes return 401 for unauthenticated requests
5. ✅ Session data includes user ID, email, name, role, planKey
6. ✅ Sign-out clears session and redirects to sign-in
7. ✅ Admin users can access admin routes
8. ✅ No console errors or warnings in production

## 🐛 Common Issues & Solutions

### Issue: Google OAuth returns error

**Solution:**
- Check redirect URIs match exactly
- Verify Google+ API is enabled
- Ensure OAuth consent screen is configured
- Check client ID and secret are correct

### Issue: "Error: No secret provided"

**Solution:**
- Set `NEXTAUTH_SECRET` in `.env`
- Generate with: `openssl rand -base64 32`
- Restart dev server after adding

### Issue: Session not persisting

**Solution:**
- Check cookie settings in browser (allow third-party cookies)
- Verify `NEXTAUTH_URL` matches current domain
- Check for CORS issues in production

### Issue: User created but can't sign in

**Solution:**
- Check `isEmailVerified: true` for OAuth users
- For credentials users, verify email first
- Check password hash is stored correctly
- Verify `authProvider` is set to "nextauth"

---

## 📞 Support

For issues or questions:
1. Check the console logs (debug mode is enabled in development)
2. Review the NextAuth documentation
3. Check MongoDB for user records
4. Verify environment variables are set correctly

**Last Updated:** October 25, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅

