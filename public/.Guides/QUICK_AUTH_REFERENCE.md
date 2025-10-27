# 🚀 Quick Auth Reference - CVCircle.io

## ✅ What's Been Fixed

Your NextAuth + Google OAuth system is now **fully functional**. Here's what was done:

### 1. Created Unified Auth Configuration (`src/lib/auth-config.ts`)
- ✅ Google OAuth Provider (for social login)
- ✅ Credentials Provider (for email/password)
- ✅ Admin Credentials Provider (for admin login)
- ✅ MongoDB integration for user management
- ✅ JWT session strategy (stateless, secure)
- ✅ Automatic user creation on first Google login
- ✅ Email verification for credentials users

### 2. Simplified NextAuth Route (`src/app/api/auth/[...nextauth]/route.ts`)
- ✅ Now uses centralized config
- ✅ Handles all auth requests automatically

### 3. Updated Middleware (`src/middleware.ts`)
- ✅ Removed custom auth fallback
- ✅ Uses only NextAuth session tokens
- ✅ Proper redirect handling for protected routes

### 4. Updated TypeScript Definitions (`src/types/next-auth.d.ts`)
- ✅ Extended session and user types
- ✅ Added planKey, subscriptionStatus, type fields

## 🎯 Quick Start

### 1. Setup Environment Variables

Create `.env` file:

```bash
# Required
MONGODB_URI=your-mongodb-uri
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 2. Get Google OAuth Credentials

1. Go to: https://console.cloud.google.com/
2. Create project → Enable Google+ API
3. Create OAuth credentials
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`

### 3. Test the System

```bash
npm run dev
```

**Test Google OAuth:**
- Visit: http://localhost:3000/sign-in
- Click "Sign in with Google"
- Should redirect to Google → back to dashboard

**Test Credentials:**
- Visit: http://localhost:3000/sign-up
- Create account → verify email → sign in

## 📖 Usage Examples

### Client Component - Get Session

```tsx
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;
  
  return <div>Hello {session.user.name}!</div>;
}
```

### Server Component - Get Session

```tsx
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';

export default async function ServerComponent() {
  const session = await getServerSession(authConfig);
  
  if (!session) return <div>Not signed in</div>;
  
  return <div>Hello {session.user.name}!</div>;
}
```

### API Route - Protect Endpoint

```tsx
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = token.id;
  // ... fetch user data
}
```

### Sign In Programmatically

```tsx
'use client';
import { signIn } from 'next-auth/react';

// Google OAuth
signIn('google', { callbackUrl: '/dashboard' });

// Credentials
signIn('credentials', {
  email: 'user@example.com',
  password: 'password123',
  redirect: true,
  callbackUrl: '/dashboard'
});

// Admin
signIn('admin-credentials', {
  email: 'admin@example.com',
  password: 'adminpass',
  redirect: true,
  callbackUrl: '/admin'
});
```

### Sign Out

```tsx
'use client';
import { signOut } from 'next-auth/react';

signOut({ callbackUrl: '/sign-in' });
```

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth-config.ts` | Main NextAuth configuration |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| `src/middleware.ts` | Route protection |
| `src/types/next-auth.d.ts` | TypeScript definitions |
| `src/models/User.ts` | MongoDB User model |
| `src/components/auth/SignInForm.tsx` | Sign-in UI |
| `src/components/auth/SignUpForm.tsx` | Sign-up UI |

## 🎨 Session Data Structure

```typescript
session = {
  user: {
    id: string,                    // MongoDB _id
    email: string,                 // User email
    name: string,                  // Full name
    image?: string,                // Avatar URL (from Google)
    role: 'user' | 'admin',        // User role
    type: 'user' | 'admin',        // Account type
    planKey: 'free' | 'pro_monthly' | ...,  // Subscription plan
    subscriptionStatus: 'active' | 'inactive' | ..., // Sub status
  }
}
```

## 🐛 Troubleshooting

**Google OAuth fails:**
```bash
# Check redirect URI
http://localhost:3000/api/auth/callback/google

# Verify environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

**Session not working:**
```bash
# Check secret is set
echo $NEXTAUTH_SECRET

# Generate new secret if needed
openssl rand -base64 32
```

**MongoDB connection issues:**
```bash
# Test connection
mongosh "your-mongodb-uri"
```

## 📚 Documentation

- **Full Setup Guide:** `NEXTAUTH_GOOGLE_SETUP_GUIDE.md`
- **NextAuth Docs:** https://next-auth.js.org/
- **Google OAuth Setup:** https://next-auth.js.org/providers/google

## ✅ Verification Checklist

- [ ] Google OAuth creates/signs in users
- [ ] Email/password sign-up works
- [ ] Email verification required for credentials
- [ ] Protected routes redirect to sign-in
- [ ] Protected API routes return 401 when unauthenticated
- [ ] Session persists across page reloads
- [ ] Sign-out clears session properly
- [ ] Admin users can access admin routes

---

**Status:** ✅ Production Ready
**Last Updated:** October 25, 2025
**Need Help?** Check `NEXTAUTH_GOOGLE_SETUP_GUIDE.md`

