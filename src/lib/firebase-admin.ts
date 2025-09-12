import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Priority 1: Environment variables (recommended for production)
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
    // Priority 2: Service account key file (for development)
    else {
      const serviceAccountPath = process.cwd() + '/firebase-key.json';
      const fs = require('fs');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Using Firebase service account key file');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('✅ Using Firebase service account key from environment');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        console.log('⚠️ Using Firebase application default credentials');
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

export default admin;

// Helper function to verify Firebase ID token
export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error);
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
    const actionCodeSettings = {
      url: `${process.env.NEXTAUTH_URL}/auth/reset-password`,
      handleCodeInApp: true,
    };
    
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    return link;
  } catch (error) {
    console.error('Password reset email error:', error);
    throw error;
  }
}
