# Firebase Authentication Setup

This guide explains how to use the Firebase Authentication system that has been integrated into your Circle CV app.

## 🚀 Features

- **Google OAuth Sign-in/Sign-up**: One-click authentication with Google accounts
- **Seamless Integration**: Works with your existing NextAuth and user management system
- **Modern UI**: Beautiful, responsive authentication components
- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error handling and user feedback

## 📁 Files Created/Modified

### New Files:
- `src/lib/firebase.ts` - Firebase configuration and auth functions
- `src/lib/hooks/useFirebaseAuth.ts` - Custom hook for Firebase authentication
- `src/components/auth/FirebaseAuth.tsx` - Full authentication component
- `src/components/auth/FirebaseAuthButton.tsx` - Simple auth button component
- `src/app/api/auth/firebase/route.ts` - Backend API for Firebase auth
- `src/app/firebase-auth-demo/page.tsx` - Demo page showcasing the functionality

### Modified Files:
- `src/models/User.ts` - Added Firebase UID support and made password optional
- `package.json` - Added Firebase dependency

## 🛠️ Setup Instructions

### 1. Firebase Configuration

The Firebase configuration is already set up in `src/lib/firebase.ts` with your provided config:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyB7dE2gnnLPLk5hcWOBAJ9w8dM-f8G3-4g",
  authDomain: "cvcircle-app.firebaseapp.com",
  projectId: "cvcircle-app",
  storageBucket: "cvcircle-app.firebasestorage.app",
  messagingSenderId: "443355117710",
  appId: "1:443355117710:web:08a40d5020a53ff037f1df",
  measurementId: "G-LLY6JFVE1W"
};
```

### 2. Enable Google Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cvcircle-app`)
3. Go to Authentication > Sign-in method
4. Enable Google as a sign-in provider
5. Configure the OAuth consent screen if needed

### 3. Environment Variables

Add these to your `.env.local` file (optional, for additional security):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB7dE2gnnLPLk5hcWOBAJ9w8dM-f8G3-4g
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cvcircle-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cvcircle-app
```

## 🎯 Usage Examples

### 1. Simple Auth Button

```tsx
import FirebaseAuthButton from '@/components/auth/FirebaseAuthButton';

const MyComponent = () => {
  return (
    <div>
      <h1>Welcome to Circle CV</h1>
      <FirebaseAuthButton 
        onSuccess={(user) => console.log('Signed in:', user)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
};
```

### 2. Full Auth Component

```tsx
import FirebaseAuth from '@/components/auth/FirebaseAuth';

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <FirebaseAuth 
        mode="login"
        onSuccess={(user) => {
          // Redirect to dashboard
          window.location.href = '/dashboard';
        }}
        onError={(error) => {
          alert('Login failed: ' + error);
        }}
      />
    </div>
  );
};
```

### 3. Custom Hook Usage

```tsx
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';

const MyComponent = () => {
  const { user, loading, signInWithGoogle, signOut } = useFirebaseAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle}>Sign In with Google</button>
      )}
    </div>
  );
};
```

## 🔧 Component Props

### FirebaseAuthButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | `''` | Additional CSS classes |
| `onSuccess` | function | undefined | Callback when auth succeeds |
| `onError` | function | undefined | Callback when auth fails |
| `variant` | 'default' \| 'outline' \| 'ghost' | 'default' | Button style variant |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Button size |

### FirebaseAuth

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | 'login' \| 'signup' \| 'both' | 'both' | Authentication mode |
| `className` | string | `''` | Additional CSS classes |
| `onSuccess` | function | undefined | Callback when auth succeeds |
| `onError` | function | undefined | Callback when auth fails |

## 🎨 Styling

The components use Tailwind CSS and are designed to match your existing design system:

- **Colors**: Uses your lime/green theme
- **Backdrop blur**: Modern glassmorphism effects
- **Animations**: Smooth Framer Motion animations
- **Responsive**: Works on all screen sizes

## 🔒 Security Features

1. **Token Verification**: Firebase ID tokens are verified on the backend
2. **User Creation**: New users are automatically created in your MongoDB database
3. **Session Management**: Compatible with your existing session system
4. **Error Handling**: Comprehensive error handling and user feedback

## 🚀 Demo Page

Visit `/firebase-auth-demo` to see the authentication system in action. This page includes:

- Interactive authentication component
- User profile display
- Code examples
- Feature explanations

## 🔄 Integration with Existing System

The Firebase authentication integrates seamlessly with your existing system:

1. **User Model**: Updated to support Firebase UID
2. **API Routes**: New `/api/auth/firebase` endpoint
3. **Session Management**: Compatible with NextAuth
4. **Local Storage**: Stores user data for compatibility

## 🐛 Troubleshooting

### Common Issues:

1. **"Firebase App named '[DEFAULT]' already exists"**
   - This is normal in development with hot reloading
   - The app handles this gracefully

2. **"Popup blocked"**
   - Ensure popups are allowed for your domain
   - Try using a different browser

3. **"Invalid API key"**
   - Check your Firebase configuration
   - Ensure the API key is correct

4. **"User not found in database"**
   - Check your MongoDB connection
   - Verify the API route is working

### Debug Mode:

Add this to see detailed logs:

```typescript
// In src/lib/firebase.ts
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase initialized with config:', firebaseConfig);
}
```

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Firebase Console](https://console.firebase.google.com/)

## 🤝 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify Firebase configuration
3. Test the demo page at `/firebase-auth-demo`
4. Check the network tab for API calls

The authentication system is now ready to use! 🎉
