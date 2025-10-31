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
  // Reduced JWT payload to prevent 431 errors
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Cookie configuration to prevent oversized/duplicated cookies
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      // Use __Secure- prefix in production per NextAuth guidance
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // In prod, scope to base domain to avoid duplicates across subdomains
        ...(process.env.NODE_ENV === 'production' ? { domain: '.cvcircle.io' } : {}),
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },

  // Secret for signing JWT tokens
  secret: NEXTAUTH_SECRET,

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
          throw new Error('Please provide email and password');
        }

        try {
          await connectDB();

          // Find user by email
          const user = await User.findOne({ email: credentials.email.toLowerCase() })
            .select('+password')
            .lean();

          if (!user) {
            return null; // Return null instead of throwing error for better NextAuth handling
          }

          // Check if user has a password (OAuth users don't have passwords)
          if (!user.password) {
            return null; // Return null instead of throwing error
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          if (!userDoc) {
            return null;
          }

          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            return null; // Return null instead of throwing error
          }

          // Check if email is verified
          if (!user.isEmailVerified) {
            return null; // Return null instead of throwing error
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

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
          return null;
        }

        try {
          await connectDB();

          // Find user by email
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();

          if (!user) {
            return null;
          }

          // Check if user is email verified
          if (!user.isEmailVerified) {
            return null;
          }

          // Verify the code using the existing verification system
          // We verify directly; successful verification will delete the code (one-time use)
          const verificationResult = await VerificationToken.verifyCode(
            credentials.verificationCode,
            credentials.email.toLowerCase(),
            'passwordless-login'
          );

          if (!verificationResult.valid) {
            return null;
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

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
            return null; // Return null instead of throwing error
          }

          // Check if user has a password
          if (!user.password) {
            return null; // Return null instead of throwing error
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          if (!userDoc) {
            return null;
          }

          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            return null; // Return null instead of throwing error
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

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
        // Handle OAuth sign-in (Google)
        if (account?.provider === 'google') {
          if (!user.email) {
            console.error('❌ Google OAuth: Missing email');
            return false;
          }

          // Check if user exists
          const userEmail = user.email?.toLowerCase();
          if (!userEmail) {
            console.error('❌ Google OAuth: Invalid email');
            return false;
          }

          // Connect to database (v1.8 approach - simple, rely on connection pooling)
          await connectDB();

          // Check if user exists
          let existingUser = await User.findOne({ email: userEmail });

          if (existingUser) {
            // Update existing user (v1.8 approach - simple update)
            await User.findByIdAndUpdate(existingUser._id, {
              lastLogin: new Date(),
              avatar: user.image || existingUser.avatar,
              isEmailVerified: true, // OAuth users are pre-verified
            });
            console.log('✅ Existing Google user updated:', existingUser._id);
          } else {
            // Create new user (v1.8 approach - minimal fields, let pre-save hook handle defaults)
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
              authProviderId: user.id || `google_${account.providerAccountId}`,
              isEmailVerified: true, // OAuth users are pre-verified
              role: 'user',
              currentPlanKey: 'free',
              lastLogin: new Date(),
            });
            console.log('✅ New Google user created:', existingUser._id);
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
        // Return false on error (v1.8 approach - simpler error handling)
        return false;
      }
    },

  // JWT callback - minimize token size to prevent 431 errors
  async jwt({ token, user, account, trigger, session }) {
    // Initial sign-in - store minimal data only
    if (user) {
      // Store only essential data to keep JWT small
      token.id = user.id || '';
      token.email = user.email || '';
      // Remove large fields that bloat the cookie
      // token.name, token.image, token.role, etc. will be fetched from DB when needed
    }

    return token;
  },

    // Session callback - fetch user data from DB to keep JWT small
    async session({ session, token }) {
      if (token && session?.user && token.id) {
        try {
          await connectDB();
          const user = await User.findById(token.id).lean();

          if (user) {
            // Populate session with user data from database
            session.user.id = user._id.toString();
            session.user.email = user.email;
            session.user.name = `${user.firstName} ${user.lastName}`;
            session.user.image = user.avatar || null;
            (session.user as any).role = user.role || 'user';
            (session.user as any).type = 'user'; // Default for now
            (session.user as any).planKey = user.currentPlanKey || 'free';
            (session.user as any).subscriptionStatus = user.subscription?.status || 'inactive';
          } else {
            // Fallback if user not found
            session.user.id = (token.id as string) || '';
            session.user.email = (token.email as string) || '';
          }
        } catch (error) {
          console.error('❌ Error fetching user data for session:', error);
          // Fallback to token data
          session.user.id = (token.id as string) || '';
          session.user.email = (token.email as string) || '';
        }
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
      // User sign-in event
    },
    async signOut({ token }) {
      // User sign-out event
    },
  },
};

export default authConfig;
