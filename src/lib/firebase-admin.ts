import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with better error handling for Vercel deployment
if (!admin.apps.length) {
  try {
    // Check if we're in a production environment (Vercel)
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
    console.log('🔧 Firebase Admin initialization:', { isProduction, isVercel });
    
    // Priority 1: Environment variables (recommended for production/Vercel)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('✅ Using Firebase service account from environment variables');
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    // Priority 2: Service account key file (for development only)
    else if (!isVercel && !isProduction) {
      const serviceAccountPath = process.cwd() + '/firebase-key.json';
      
      try {
        // Use require for synchronous file check
        const fs = require('fs');
        
        if (fs.existsSync(serviceAccountPath)) {
          console.log('✅ Using Firebase service account key file');
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cvcircle-app',
          });
        } else {
          throw new Error('No service account key file found');
        }
      } catch (error) {
        console.log('⚠️ Service account key file not found, using minimal configuration');
        admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cvcircle-app',
        });
      }
    }
    // Priority 3: Minimal configuration for Vercel/production
    else {
      console.log('⚠️ Using minimal Firebase configuration for production');
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cvcircle-app',
      });
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    // Don't throw error, just log it and continue
    console.log('⚠️ Continuing without Firebase Admin SDK');
  }
}

export default admin;

// Helper function to verify Firebase ID token
export async function verifyFirebaseToken(idToken: string) {
  try {
    console.log('🔍 Verifying Firebase token...');
    
    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('✅ Firebase token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    });
    return decodedToken;
  } catch (error) {
    console.error('❌ Firebase token verification error:', error);
    throw error;
  }
}

// Helper function to get user by UID
export async function getFirebaseUser(uid: string) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Firebase user fetch error:', error);
    throw error;
  }
}

// Helper function to send password reset email
export async function sendPasswordResetEmail(email: string) {
  try {
    console.log('🔥 Generating password reset link for:', email);
    
    const actionCodeSettings = {
      url: `${process.env.NEXTAUTH_URL}/auth/reset-password`,
      handleCodeInApp: true,
    };
    
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    console.log('✅ Password reset link generated successfully');
    return link;
  } catch (error: any) {
    console.error('❌ Password reset email error:', error);
    throw error;
  }
}

// Helper function to verify password reset code
export async function verifyPasswordResetCode(code: string) {
  try {
    console.log('🔍 Verifying password reset code...');
    const email = await admin.auth().verifyPasswordResetCode(code);
    console.log('✅ Password reset code verified for:', email);
    return email;
  } catch (error: any) {
    console.error('❌ Password reset code verification error:', error);
    throw error;
  }
}

// Helper function to confirm password reset
export async function confirmPasswordReset(code: string, newPassword: string) {
  try {
    console.log('🔐 Confirming password reset...');
    await admin.auth().confirmPasswordReset(code, newPassword);
    console.log('✅ Password reset confirmed successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Password reset confirmation error:', error);
    throw error;
  }
}
