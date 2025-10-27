import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import mongoose from 'mongoose';
import { env } from './env';

// Ensure MongoDB connection
async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(process.env.MONGODB_URI);
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
  secret: env.NEXTAUTH_SECRET,

  // Custom pages
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },

  // Authentication providers
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
            throw new Error('Invalid email or password');
          }

          // Check if user has a password (OAuth users don't have passwords)
          if (!user.password) {
            console.log('❌ User has no password (OAuth user):', credentials.email);
            throw new Error('Please sign in with Google');
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email);
            throw new Error('Invalid email or password');
          }

          // Check if email is verified
          if (!user.isEmailVerified) {
            console.log('❌ Email not verified:', credentials.email);
            throw new Error('Please verify your email before signing in');
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
          throw new Error(error.message || 'Authentication failed');
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
            throw new Error('Invalid admin credentials');
          }

          // Check if user has a password
          if (!user.password) {
            console.log('❌ Admin user has no password:', credentials.email);
            throw new Error('Invalid admin credentials');
          }

          // Verify password
          const userDoc = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');
          const isPasswordValid = await userDoc.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.log('❌ Invalid admin password for:', credentials.email);
            throw new Error('Invalid admin credentials');
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
          throw new Error(error.message || 'Admin authentication failed');
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
        // Remove large fields that can be fetched from database when needed
        // token.planKey = (user as any).planKey || 'free';
        // token.subscriptionStatus = (user as any).subscriptionStatus || 'inactive';
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
        // Remove large fields - these can be fetched from database when needed
        // (session.user as any).planKey = token.planKey;
        // (session.user as any).subscriptionStatus = token.subscriptionStatus;
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

