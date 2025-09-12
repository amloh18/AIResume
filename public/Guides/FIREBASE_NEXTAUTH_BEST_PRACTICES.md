# Firebase + NextAuth + MongoDB Best Practices Implementation

This document outlines the implementation of the recommended Firebase + NextAuth + MongoDB authentication architecture for Circle CV.

## 🏗️ **Architecture Overview**

### **Core Principle**
- **Firebase**: Handles authentication (login/signup)
- **NextAuth**: Manages sessions and backend authorization
- **MongoDB**: Stores user profiles with Firebase UID references

### **Authentication Flow**
1. **Client-Side**: User signs in using Firebase Client SDK
2. **Token Generation**: Firebase returns an ID Token (JWT)
3. **Backend Communication**: Client sends ID Token to NextAuth
4. **Backend Verification**: NextAuth verifies token using Firebase Admin SDK
5. **Database Sync**: Find/create user in MongoDB based on Firebase UID
6. **Session Creation**: NextAuth creates session for subsequent requests

## 🔧 **Implementation Details**

### **1. Firebase Admin SDK Setup**

**File**: `src/lib/firebase-admin.ts`

- **Priority 1**: Environment variables (recommended for production)
- **Priority 2**: Service account key file (for development)
- **Priority 3**: Application default credentials (fallback)

```typescript
// Environment variables (recommended)
FIREBASE_PROJECT_ID=cvcircle-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cvcircle-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### **2. NextAuth Configuration**

**File**: `src/lib/auth.ts`

- **CredentialsProvider**: Handles Firebase token verification
- **JWT Strategy**: Recommended for Firebase + NextAuth approach
- **Manual Database Interaction**: No NextAuth adapter used
- **Proper Callbacks**: JWT and session callbacks for data flow

```typescript
export const authOptions: NextAuthOptions = {
  // IMPORTANT: No NextAuth adapter - manual database interaction
  providers: [
    CredentialsProvider({
      id: 'firebase',
      name: 'Firebase',
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        // 1. Verify Firebase ID token
        // 2. Connect to MongoDB
        // 3. Find/create user
        // 4. Return user object
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // Put custom data into JWT
    },
    async session({ session, token }) {
      // Make data available to client
    },
  },
};
```

### **3. MongoDB User Schema**

**File**: `src/models/User.ts`

- **firebaseUid**: Unique identifier linking to Firebase
- **Unique Indexes**: Prevent duplicate entries
- **Optional Password**: Only for non-Firebase users
- **Proper Validation**: Firebase vs traditional users

```typescript
const userSchema = new Schema<IUser>({
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: function(this: any) {
      return !this.password; // Required if no password (Firebase user)
    }
  },
  // ... other fields
});

// Unique indexes for data integrity
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
```

### **4. Client-Side Implementation**

**Files**: `src/app/auth/signin/page.tsx`, `src/components/auth/`

- **Firebase SDK**: Handle authentication
- **ID Token**: Get token after successful login
- **NextAuth signIn**: Send token to backend

```typescript
const handleSignIn = async () => {
  try {
    // 1. Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Get Firebase ID token
    const idToken = await user.getIdToken();

    // 3. Sign in with NextAuth using the token
    const result = await signIn('firebase', { 
      idToken, 
      redirect: false 
    });

    if (result?.ok) {
      // Redirect to dashboard
      router.push('/dashboard');
    }
  } catch (error) {
    // Handle errors
  }
};
```

## 🛡️ **Security Features**

### **1. Token Verification**
- Firebase Admin SDK verifies ID tokens
- Prevents token tampering
- Ensures token authenticity

### **2. Database Integrity**
- Unique indexes prevent duplicate users
- Firebase UID as primary link
- Proper validation for user types

### **3. Session Management**
- JWT-based sessions
- Secure token storage
- Automatic session expiration

## 📋 **Environment Variables**

### **Required Variables**
```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Firebase Admin SDK (Recommended)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# MongoDB
MONGODB_URI=your-mongodb-connection-string
```

## 🚀 **Setup Instructions**

### **1. Firebase Console Setup**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication > Sign-in method
4. Enable Email/Password and Google providers
5. Go to Project Settings > Service accounts
6. Generate new private key (JSON file)
7. Extract the values for environment variables

### **2. MongoDB Setup**
1. Run the index creation script:
```bash
node scripts/create-mongodb-indexes.js
```

### **3. Environment Configuration**
1. Copy `env.example` to `.env.local`
2. Fill in all required environment variables
3. Use individual Firebase Admin SDK variables (recommended)

### **4. Test Authentication**
1. Visit `/test-firebase-auth` for comprehensive testing
2. Use the debug component on signin page (development only)
3. Check Firebase Console for user creation

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. `auth/invalid-credential` Error**
- Check Firebase Console settings
- Verify environment variables
- Ensure user account exists and is verified
- Check domain authorization

#### **2. MongoDB Connection Issues**
- Verify MONGODB_URI
- Check network connectivity
- Ensure proper indexes are created

#### **3. NextAuth Session Issues**
- Check NEXTAUTH_SECRET
- Verify callback URLs
- Check JWT token structure

### **Debug Tools**
- **Test Page**: `/test-firebase-auth`
- **Debug Component**: Available in development mode
- **Console Logs**: Detailed logging throughout the flow

## 📚 **Best Practices Summary**

1. **✅ Use Firebase for authentication only**
2. **✅ Use NextAuth for session management**
3. **✅ Use MongoDB as primary user database**
4. **✅ Implement proper token verification**
5. **✅ Create unique indexes for data integrity**
6. **✅ Use environment variables for secrets**
7. **✅ Implement proper error handling**
8. **✅ Use JWT strategy for sessions**
9. **✅ Avoid NextAuth adapters with CredentialsProvider**
10. **✅ Test authentication flow thoroughly**

## 🔄 **Migration from Legacy Auth**

If migrating from legacy authentication:

1. **Backup existing user data**
2. **Run MongoDB index creation script**
3. **Update environment variables**
4. **Test authentication flow**
5. **Remove legacy authentication code**
6. **Update client-side components**

This implementation ensures a robust, secure, and scalable authentication system that follows industry best practices for Firebase + NextAuth + MongoDB integration.
