import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export interface AuthTestResult {
  success: boolean;
  error?: string;
  user?: any;
  details?: any;
}

/**
 * Test Firebase authentication with email/password
 */
export const testFirebaseAuth = async (email: string, password: string): Promise<AuthTestResult> => {
  try {
    console.log('🧪 Testing Firebase authentication...');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    console.log('🌐 Auth domain:', auth.app.options.authDomain);
    console.log('🆔 Project ID:', auth.app.options.projectId);
    
    // Test sign in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase auth test successful');
    console.log('👤 User:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName
    });
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName
      },
      details: {
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('❌ Firebase auth test failed:', error);
    console.error('🔍 Error code:', error.code);
    console.error('📝 Error message:', error.message);
    
    return {
      success: false,
      error: error.message,
      details: {
        code: error.code,
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * Test Firebase configuration
 */
export const testFirebaseConfig = (): AuthTestResult => {
  try {
    const config = {
      apiKey: auth.app.options.apiKey ? 'Set' : 'Not Set',
      authDomain: auth.app.options.authDomain,
      projectId: auth.app.options.projectId,
      storageBucket: auth.app.options.storageBucket,
      messagingSenderId: auth.app.options.messagingSenderId,
      appId: auth.app.options.appId
    };
    
    console.log('🔧 Firebase configuration test:', config);
    
    const hasRequiredFields = config.authDomain && config.projectId && config.apiKey === 'Set';
    
    return {
      success: hasRequiredFields,
      error: hasRequiredFields ? undefined : 'Missing required Firebase configuration',
      details: config
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: { timestamp: new Date().toISOString() }
    };
  }
};

/**
 * Test Firebase ID token generation
 */
export const testFirebaseToken = async (email: string, password: string): Promise<AuthTestResult> => {
  try {
    const authResult = await testFirebaseAuth(email, password);
    
    if (!authResult.success || !authResult.user) {
      return authResult;
    }
    
    // Get ID token
    const idToken = await auth.currentUser?.getIdToken();
    
    if (!idToken) {
      return {
        success: false,
        error: 'Failed to generate ID token',
        details: authResult.details
      };
    }
    
    console.log('🎫 ID token generated successfully');
    console.log('🔑 Token length:', idToken.length);
    console.log('🔑 Token preview:', idToken.substring(0, 50) + '...');
    
    return {
      success: true,
      details: {
        ...authResult.details,
        tokenLength: idToken.length,
        tokenPreview: idToken.substring(0, 50) + '...'
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: { timestamp: new Date().toISOString() }
    };
  }
};
