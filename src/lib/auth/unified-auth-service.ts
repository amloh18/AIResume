import 'server-only';
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getCache, setCache, invalidateCache } from '@/lib/cache';
import { UserService, AuthenticatedUser } from './user-service';
import VerificationToken from '@/models/VerificationToken';
import { isCodeExpired } from '@/lib/verification-code';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

/**
 * Unified Authentication Service
 * 
 * Single source of truth for authentication.
 * Uses NextAuth as the foundation with:
 * - Minimal JWT payload (only id, email) to prevent 431 errors
 * - Redis caching for user data (5-minute TTL)
 * - Fresh data fetch on each session check
 * - No localStorage usage (security improvement)
 * - HTTP-only cookies exclusively
 */

export class UnifiedAuthService {
  /**
   * Get NextAuth configuration
   */
  static getAuthConfig(): NextAuthOptions {
    const NEXTAUTH_SECRET =
      process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development';
    const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

    return {
      session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
      },

      useSecureCookies: process.env.NODE_ENV === 'production',
      cookies: {
        sessionToken: {
          name:
            process.env.NODE_ENV === 'production'
              ? '__Secure-next-auth.session-token'
              : 'next-auth.session-token',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            ...(process.env.NODE_ENV === 'production'
              ? { domain: '.cvcircle.io' }
              : {}),
            maxAge: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },

      secret: NEXTAUTH_SECRET,

      providers: [
        GoogleProvider({
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
        }),

        CredentialsProvider({
          id: 'credentials',
          name: 'Email',
          credentials: {
            email: { type: 'email' },
            password: { type: 'password' },
          },
          async authorize(credentials, req) {
            if (!credentials?.email || !credentials?.password) {
              return null;
            }

            const result = await UserService.authenticateUser(
              credentials.email,
              credentials.password
            );

            if (!result.user || result.error) {
              return null;
            }

            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              image: result.user.image || undefined,
            };
          },
        }),

        CredentialsProvider({
          id: 'passwordless',
          name: 'Passwordless Login',
          credentials: {
            email: { type: 'email' },
            verificationCode: { type: 'text' },
          },
          async authorize(credentials) {
            if (!credentials?.email || !credentials?.verificationCode) {
              return null;
            }

            try {
              await getConnection();

              const user = await User.findOne({
                email: credentials.email.toLowerCase(),
              }).lean().exec();

              if (!user) return null;
              const userDoc = Array.isArray(user) ? user[0] : user;
              if (!userDoc || !userDoc.isEmailVerified) {
                return null;
              }

              const verificationResult = await VerificationToken.verifyCode(
                credentials.verificationCode,
                credentials.email.toLowerCase(),
                'passwordless-login'
              );

              if (!verificationResult.valid) {
                return null;
              }

              await User.findByIdAndUpdate((userDoc._id as any).toString(), { lastLogin: new Date() });

              return {
                id: (userDoc._id as any).toString(),
                email: userDoc.email,
                name: `${userDoc.firstName} ${userDoc.lastName}`,
                image: userDoc.avatar || null,
              };
            } catch (error: any) {
              console.error('❌ Passwordless login error:', error);
              return null;
            }
          },
        }),

        CredentialsProvider({
          id: 'admin-credentials',
          name: 'Admin Login',
          credentials: {
            email: { type: 'email' },
            password: { type: 'password' },
          },
          async authorize(credentials, req) {
            if (!credentials?.email || !credentials?.password) {
              return null;
            }

            const result = await UserService.authenticateAdmin(
              credentials.email,
              credentials.password
            );

            if (!result.user || result.error) {
              return null;
            }

            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              image: result.user.image || undefined,
            };
          },
        }),
      ],

      callbacks: {
        async signIn({ user, account, profile }) {
          // Handle Google OAuth sign-in
          if (account?.provider === 'google') {
            try {
              const googleUser = await UserService.findOrCreateGoogleUser({
                email: user.email || '',
                name: user.name || '',
                image: user.image || undefined,
                googleId: account.providerAccountId || (account.id ? String(account.id) : '') || '',
              });

              if (googleUser) {
                user.id = googleUser.id;
              }

              return !!googleUser;
            } catch (error: any) {
              console.error('❌ Sign-in callback error:', error);
              return false;
            }
          }

          return true;
        },

        async jwt({ token, user }) {
          // Initial sign-in - store minimal data only (id, email)
          if (user) {
            token.id = user.id || '';
            token.email = user.email || '';
          }

          return token;
        },

        async session({ session, token }) {
          // Fetch fresh user data from cache or DB on each session check
          if (token && session?.user && token.id) {
            const userData = await UnifiedAuthService.fetchUserData(token.id as string);

            if (userData) {
              session.user.id = userData.id;
              session.user.email = userData.email;
              session.user.name = userData.name;
              session.user.image = userData.image ?? undefined;
              (session.user as any).role = userData.role;
              (session.user as any).type = 'user';
              (session.user as any).planKey = userData.planKey;
              (session.user as any).subscriptionStatus =
                userData.subscriptionStatus;
            } else {
              // Fallback to token data if user not found
              session.user.id = (token.id as string) || '';
              session.user.email = (token.email as string) || '';
            }
          }

          return session;
        },
      },

      pages: {
        signIn: '/sign-in',
        error: '/auth/error',
        verifyRequest: '/auth/verify-email',
      },

      debug: process.env.NODE_ENV === 'development',

      events: {
        async signIn({ user, account, profile, isNewUser }) {
          // User sign-in event logging
        },
        async signOut({ token }) {
          // Invalidate user cache on sign out
          if (token?.id) {
            await invalidateCache(`user:${token.id}`);
          }
        },
      },
    };
  }

  /**
   * Fetch user data with Redis caching
   * Cache TTL: 5 minutes
   */
  private static async fetchUserData(
    userId: string
  ): Promise<AuthenticatedUser | null> {
    const cacheKey = `user:${userId}`;

    try {
      // Check cache first
      const cached = await getCache<AuthenticatedUser>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from database
      await getConnection();
      const user = await User.findById(userId).lean().exec();

      if (!user) {
        return null;
      }
      const userDoc = Array.isArray(user) ? user[0] : user;
      if (!userDoc) {
        return null;
      }

      const userData: AuthenticatedUser = {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        name: `${userDoc.firstName} ${userDoc.lastName}`,
        image: userDoc.avatar || null,
        role: userDoc.role || 'user',
        planKey: userDoc.currentPlanKey || 'free',
        subscriptionStatus: userDoc.subscription?.status || 'inactive',
      };

      // Cache for 5 minutes
      await setCache(cacheKey, userData, 300);

      return userData;
    } catch (error: any) {
      console.error('❌ Error fetching user data:', error);
      return null;
    }
  }

  /**
   * Invalidate user cache (call when user data changes)
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await invalidateCache(`user:${userId}`);
  }
}

