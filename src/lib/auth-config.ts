import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { isCodeExpired } from '@/lib/verification-code';
import mongoose from 'mongoose';
// Import environment variables directly
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const MONGODB_URI = process.env.MONGODB_URI || '';

// Ensure MongoDB connection
async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(MONGODB_URI);
}

/**
 * Unified NextAuth Configuration
 * 
 * Supports:
 * - Google OAuth (social login)
 * - Credentials (email/password for regular users)
 * - Admin Credentials (separate provider for admin login)
 * 
 * Uses JWT session strategy for stateless authentication
 */
export const authConfig: NextAuthOptions = {
  // Use JWT sessions (stateless, stored in HTTP-only cookies)
  // OAuth account management is handled manually in the signIn callback
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Cookie configuration to prevent oversized cookies
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },

  // Secret for signing JWT tokens
  secret: NEXTAUTH_SECRET,

  // Custom pages
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },

  // Authentication providers
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      profile(profile) {
        console.log('🔐 Google OAuth profile:', {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
        });
        
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),

    // Regular User Credentials (email/password)
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          throw new Error('Please provide email and password');
        }

        try {
          await connectDB();

          // Find user by email
          const user = await User.findOne({ email: credentials.email.toLowerCase() })
            .select('+password')
            .lean();

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            return null; // Return null instead of throwing error for better NextAuth handling
          }

          // Check if user has a password (OAuth users don't have passwords)
          if (!user.password) {
            console.log('❌ User has no password (OAuth user):', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          if (!userDoc) {
            console.log('❌ User document not found for password verification:', credentials.email);
            return null;
          }

          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Check if email is verified
          if (!user.isEmailVerified) {
            console.log('❌ Email not verified:', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          console.log('✅ User authenticated:', {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            image: user.avatar || null,
            role: user.role || 'user',
            type: 'user',
            planKey: user.currentPlanKey || 'free',
            subscriptionStatus: user.subscription?.status || 'inactive',
          };
        } catch (error: any) {
          console.error('❌ Authentication error:', error.message);
          return null; // Return null instead of throwing error
        }
      },
    }),

    // Passwordless Login Provider (for code-based authentication)
    CredentialsProvider({
      id: 'passwordless',
      name: 'Passwordless Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        verificationCode: { label: 'Verification Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.verificationCode) {
          console.log('❌ Missing passwordless credentials');
          return null;
        }

        try {
          await connectDB();

          // Find user by email
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();

          if (!user) {
            console.log('❌ User not found for passwordless login:', credentials.email);
            return null;
          }

          // Check if user is email verified
          if (!user.isEmailVerified) {
            console.log('❌ Email not verified for passwordless login:', credentials.email);
            return null;
          }

          // Verify the code using the existing verification system
          const verificationToken = await VerificationToken.findOne({
            email: credentials.email.toLowerCase(),
            type: 'passwordless-login',
            isUsed: false
          });

          if (!verificationToken) {
            console.log('❌ No verification token found for passwordless login:', credentials.email);
            return null;
          }

          // Check if code is expired
          if (isCodeExpired(verificationToken.createdAt)) {
            await VerificationToken.deleteOne({ _id: verificationToken._id });
            console.log('❌ Verification code expired for passwordless login:', credentials.email);
            return null;
          }

          // Verify the code
          const verificationResult = await VerificationToken.verifyCode(
            credentials.verificationCode, 
            credentials.email.toLowerCase(), 
            'passwordless-login'
          );

          if (!verificationResult.valid) {
            console.log('❌ Invalid verification code for passwordless login:', credentials.email);
            return null;
          }

          // Mark token as used
          await VerificationToken.findByIdAndUpdate(verificationToken._id, { isUsed: true });

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          console.log('✅ Passwordless login successful:', {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            image: user.avatar || null,
            role: user.role || 'user',
            type: 'user',
            planKey: user.currentPlanKey || 'free',
            subscriptionStatus: user.subscription?.status || 'inactive',
          };
        } catch (error: any) {
          console.error('❌ Passwordless login error:', error);
          return null;
        }
      },
    }),

    // Admin Credentials Provider (separate login for admin users)
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Admin Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing admin credentials');
          throw new Error('Please provide email and password');
        }

        try {
          await connectDB();

          // Find admin user by email
          const user = await User.findOne({
            email: credentials.email.toLowerCase(),
            role: { $in: ['admin', 'superadmin'] },
          })
            .select('+password')
            .lean();

          if (!user) {
            console.log('❌ Admin user not found:', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Check if user has a password
          if (!user.password) {
            console.log('❌ Admin user has no password:', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          if (!userDoc) {
            console.log('❌ Admin user document not found for password verification:', credentials.email);
            return null;
          }

          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.log('❌ Invalid admin password for:', credentials.email);
            return null; // Return null instead of throwing error
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          console.log('✅ Admin authenticated:', {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            image: user.avatar || null,
            role: user.role || 'admin',
            type: 'admin',
          };
        } catch (error: any) {
          console.error('❌ Admin authentication error:', error.message);
          return null; // Return null instead of throwing error
        }
      },
    }),
  ],

  // Callbacks for customizing JWT and session
  callbacks: {
    // Sign-in callback - control who can sign in
    async signIn({ user, account, profile }) {
      try {
        console.log('🔐 SignIn callback triggered:', {
          provider: account?.provider,
          email: user.email,
          hasAccount: !!account,
          hasProfile: !!profile
        });

        // Handle OAuth sign-in (Google)
        if (account?.provider === 'google') {
          console.log('🔐 Google OAuth sign-in:', user.email);
          
          if (!user.email) {
            console.error('❌ No email provided by Google OAuth');
            return false;
          }

          await connectDB();

          // Check if user exists
          const userEmail = user.email?.toLowerCase();
          if (!userEmail) {
            console.error('❌ No email provided by Google OAuth');
            return false;
          }
          
          let existingUser = await User.findOne({ email: userEmail });

          if (existingUser) {
            console.log('✅ Existing user found, updating last login');
            await User.findByIdAndUpdate(existingUser._id, { 
              lastLogin: new Date(),
              avatar: user.image || existingUser.avatar,
              isEmailVerified: true, // OAuth users are pre-verified
            });
          } else {
            console.log('🆕 Creating new user from Google OAuth');
            
            // Extract first and last name from Google profile
            const userName = user.name || '';
            const nameParts = userName ? userName.split(' ') : ['User'];
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || '';

            existingUser = await User.create({
              email: userEmail,
              firstName,
              lastName,
              avatar: user.image || null,
              authProvider: 'nextauth',
              authProviderId: user.id || null,
              isEmailVerified: true, // OAuth users are pre-verified
              role: 'user',
              currentPlanKey: 'free',
              lastLogin: new Date(),
            });
            console.log('✅ New user created:', existingUser._id);
          }

          // Store user ID in the user object for JWT callback
          user.id = existingUser._id.toString();
        }

        return true;
      } catch (error: any) {
        console.error('❌ Sign-in callback error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          user: user,
          account: account
        });
        return false;
      }
    },

  // JWT callback - add custom fields to the token
  async jwt({ token, user, account, trigger, session }) {
    // Initial sign-in
    if (user) {
      console.log('🔐 JWT callback - user sign-in:', {
        id: user.id,
        email: user.email,
        type: (user as any).type,
      });

      // Store only essential data to keep token size small
      token.id = user.id || '';
      token.email = user.email || '';
      token.name = user.name || '';
      token.image = user.image || null;
      token.role = (user as any).role || 'user';
      token.type = (user as any).type || 'user';
      token.planKey = (user as any).planKey || 'free';
      token.subscriptionStatus = (user as any).subscriptionStatus || 'inactive';
    }

    // Handle session updates
    if (trigger === 'update' && session) {
      console.log('🔄 JWT callback - session update');
      // Update token with new session data
      token = { ...token, ...session };
    }

    return token;
  },

    // Session callback - add custom fields to the session
    async session({ session, token }) {
      if (token && session?.user) {
        // Add only essential fields to session.user to keep session size small
        session.user.id = (token.id as string) || '';
        session.user.email = (token.email as string) || '';
        session.user.name = (token.name as string) || '';
        session.user.image = (token.image as string) || null;
        (session.user as any).role = token.role || 'user';
        (session.user as any).type = token.type || 'user';
        (session.user as any).planKey = token.planKey || 'free';
        (session.user as any).subscriptionStatus = token.subscriptionStatus || 'inactive';
      }

      return session;
    },
  },

  // Custom pages
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
    verifyRequest: '/auth/verify-email',
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Events for logging
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('📝 User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser,
      });
    },
    async signOut({ token }) {
      console.log('📝 User signed out:', {
        userId: token?.id,
        email: token?.email,
      });
    },
  },
};

export default authConfig;

