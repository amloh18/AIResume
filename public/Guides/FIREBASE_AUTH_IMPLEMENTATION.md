# Firebase Authentication Implementation

This document outlines the implementation of the unified Firebase and NextAuth.js authentication strategy for Circle CV.

## Overview

The authentication system uses Firebase for secure user authentication and NextAuth.js for robust session management within the Next.js application.

### Core Architecture

1. **Frontend**: Uses Firebase SDK to handle sign-up and sign-in actions (Google & Email/Password)
2. **Firebase**: Manages user credentials, handles email verification, and issues Firebase ID Tokens
3. **Backend**: NextAuth.js verifies Firebase tokens and creates secure sessions
4. **Database**: MongoDB stores user profiles with Firebase UID references

## Implementation Details

### 1. Firebase Admin SDK Setup

**File**: `src/lib/firebase-admin.ts`

- Initializes Firebase Admin SDK
- Provides token verification functions
- Handles password reset email generation
- Requires `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

### 2. Firebase Client Configuration

**File**: `src/lib/firebase.ts`

- Initializes Firebase client SDK
- Configures Google Auth Provider
- Exports auth instance for frontend use

### 3. NextAuth Configuration

**File**: `src/lib/auth.ts`

- Firebase provider for token verification
- Legacy credentials provider for non-Firebase users
- JWT session strategy
- User profile synchronization with MongoDB

### 4. User Schema Updates

**File**: `src/models/User.ts`

- `firebaseUid` field for Firebase user identification
- `password` field optional (only for non-Firebase users)
- Enhanced validation for Firebase vs traditional users

### 5. API Endpoints

#### Profile Creation
**Endpoint**: `POST /api/user/create-profile`

- Creates user profile after Firebase signup
- Validates required fields
- Checks username uniqueness
- Links Firebase UID to MongoDB user

#### Password Reset
**Endpoint**: `POST /api/auth/reset-password`

- Sends password reset email via Firebase
- Handles Firebase-specific error codes
- Returns appropriate error messages

### 6. Frontend Components

#### Sign Up Form
**File**: `src/components/auth/SignUpForm.tsx`

- Email/password registration
- Google OAuth registration
- Profile data collection
- Email verification flow

#### Sign In Form
**File**: `src/components/auth/SignInForm.tsx`

- Email/password authentication
- Google OAuth authentication
- Password reset functionality
- Email verification check

#### Password Reset Page
**File**: `src/app/auth/reset-password/page.tsx`

- Password reset email request
- Password reset confirmation
- Firebase password reset flow

### 7. Authentication Pages

- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/auth/reset-password` - Password reset page
- `/auth` - Redirects to sign in

### 8. Middleware Updates

**File**: `src/middleware.ts`

- Simplified authentication check
- NextAuth JWT token verification
- Protected route handling
- Redirect to sign in for unauthenticated users

## Environment Variables

Add these to your `.env.local`:

```env
# Firebase Configuration (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK (NEW - Required)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# NextAuth Configuration (already configured)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Firebase Console Setup

1. **Enable Authentication Methods**:
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Email/Password provider
   - Enable Google provider
   - Configure OAuth consent screen

2. **Generate Service Account Key**:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Copy the JSON content to `FIREBASE_SERVICE_ACCOUNT_KEY`

3. **Configure Authorized Domains**:
   - Add your domain to authorized domains list
   - Include localhost for development

## User Flow

### New User Registration

1. User fills sign-up form
2. Firebase creates user account
3. Email verification sent
4. Profile created in MongoDB via API
5. User must verify email before sign-in

### Returning User Sign-in

1. User enters credentials
2. Firebase authenticates user
3. System checks email verification
4. NextAuth creates session with Firebase token
5. User redirected to dashboard

### Password Reset

1. User requests password reset
2. Firebase sends reset email
3. User clicks link in email
4. User enters new password
5. Firebase updates password
6. User can sign in with new password

## Security Features

- **Email Verification**: Required before account activation
- **Secure Tokens**: Firebase ID tokens with short expiration
- **Session Management**: NextAuth JWT with configurable expiration
- **Password Reset**: Secure Firebase-based reset flow
- **CSRF Protection**: Built-in NextAuth CSRF protection
- **Secure Cookies**: HTTP-only session cookies

## Migration Notes

- Existing users with passwords can still use credentials provider
- New users will use Firebase authentication
- User profiles remain in MongoDB with Firebase UID reference
- No data migration required for existing users

## Testing

1. **Sign Up Flow**:
   - Test email/password registration
   - Test Google OAuth registration
   - Verify email verification requirement

2. **Sign In Flow**:
   - Test email/password sign-in
   - Test Google OAuth sign-in
   - Test email verification check

3. **Password Reset**:
   - Test password reset email
   - Test password reset confirmation
   - Verify new password works

4. **Protected Routes**:
   - Test middleware protection
   - Test session persistence
   - Test logout functionality

## Troubleshooting

### Common Issues

1. **Firebase Admin SDK Error**:
   - Check `FIREBASE_SERVICE_ACCOUNT_KEY` format
   - Verify service account permissions

2. **Token Verification Failed**:
   - Check Firebase project configuration
   - Verify domain authorization

3. **Email Verification Not Working**:
   - Check Firebase email templates
   - Verify SMTP configuration

4. **Google OAuth Issues**:
   - Check OAuth consent screen
   - Verify redirect URIs
   - Check client ID configuration

### Debug Mode

Enable debug logging by setting:
```env
NEXTAUTH_DEBUG=true
```

This will provide detailed logs for authentication flows.
