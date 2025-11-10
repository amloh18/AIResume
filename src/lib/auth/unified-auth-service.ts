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
            preVerified: { type: 'text' }, // Flag to skip code verification (user already verified)
          },
          async authorize(credentials) {
            if (!credentials?.email) {
              console.error('❌ Passwordless login: Missing email');
              return null;
            }

            // If preVerified flag is set, skip code verification (code was already verified and burned)
            const isPreVerified = credentials.preVerified === 'true';

            if (!isPreVerified && !credentials?.verificationCode) {
              console.error('❌ Passwordless login: Missing verification code', {
                hasEmail: !!credentials?.email,
                hasCode: !!credentials?.verificationCode,
                preVerified: isPreVerified
              });
              return null;
            }

            try {
              console.log('🔐 Passwordless login: Starting authorization for', credentials.email, isPreVerified ? '(pre-verified)' : '');
              await getConnection();

              // If preVerified, skip ALL code verification and just find the user
              // This is used when code was already verified by atomic-signup
              if (isPreVerified) {
                console.log('✅ Passwordless login: Pre-verified flow - skipping code verification');
                
                // User was already verified by atomic-signup
                // Just find them and return user data
                const user = await User.findOne({
                  email: credentials.email.toLowerCase(),
                }).lean().exec();

                const userDoc = Array.isArray(user) ? user[0] : user;

                if (!userDoc) {
                  console.error('❌ Passwordless login: User not found for pre-verified sign-in');
                  return null;
                }

                // Verify user is actually verified
                if (!userDoc.isEmailVerified) {
                  console.error('❌ Passwordless login: User not verified despite preVerified flag');
                  return null;
                }

                // Update last login
                await User.findByIdAndUpdate((userDoc._id as any).toString(), { lastLogin: new Date() });

                const userData = {
                  id: (userDoc._id as any).toString(),
                  email: userDoc.email,
                  name: `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User',
                  image: userDoc.avatar || null,
                };

                console.log('✅ Passwordless login: Pre-verified authorization successful for user', userData.id);
                return userData;
              }

              // Normal flow: verify code (for regular passwordless login)
              if (!credentials?.verificationCode) {
                console.error('❌ Passwordless login: Missing verification code');
                return null;
              }

              // Verify the code - try passwordless-login first, then email-verification
              // This allows email verification codes to be used for automatic sign-in after signup
              let verificationResult = await VerificationToken.verifyCode(
                credentials.verificationCode!,
                credentials.email.toLowerCase(),
                'passwordless-login'
              );

              // If passwordless-login type fails, try email-verification type
              // This allows email verification codes to be used for sign-in
              if (!verificationResult.valid) {
                console.log('🔍 Trying email-verification type for code...');
                verificationResult = await VerificationToken.verifyCode(
                  credentials.verificationCode!,
                  credentials.email.toLowerCase(),
                  'email-verification'
                );
              }

              if (!verificationResult.valid) {
                console.error('❌ Passwordless login: Code verification failed for both types:', verificationResult.message);
                return null;
              }

              console.log('✅ Passwordless login: Code verified successfully');

              // Find or create user
              let user = await User.findOne({
                email: credentials.email.toLowerCase(),
              }).lean().exec();

              let userDoc = Array.isArray(user) ? user[0] : user;

              if (!userDoc) {
                // Create new user for passwordless login
                const newUser = new User({
                  authProviderId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  authProvider: 'local',
                  email: credentials.email.toLowerCase(),
                  password: null,
                  firstName: 'User',
                  lastName: 'User',
                  isEmailVerified: true, // Verified via code
                  role: 'user',
                  currentPlanKey: 'free',
                  monthlyGoal: 20,
                  usage: {
                    cvJourneyCount: 0,
                    cvCreatedCount: 0,
                    journeysCreated: 0,
                    exportCount: 0,
                    atsCheckCount: 0,
                    lastResetDate: new Date(),
                  },
                  subscription: {
                    planKey: 'free',
                    status: 'inactive',
                    startDate: new Date(),
                    provider: 'stripe',
                    interval: 'monthly',
                    seats: 3,
                    storageUsed: 0
                  },
                  settings: {
                    theme: 'auto',
                    notifications: {
                      email: true,
                      push: true
                    },
                    timezone: 'UTC',
                    languagePreference: 'en'
                  }
                });
                
                await newUser.save();
                userDoc = newUser.toObject();
                console.log('✅ New user created for passwordless login:', newUser._id.toString());
              } else if (!userDoc.isEmailVerified) {
                // Update existing user to be verified
                await User.findByIdAndUpdate((userDoc._id as any).toString(), { 
                  isEmailVerified: true,
                  emailVerifiedAt: new Date()
                });
                userDoc.isEmailVerified = true;
              }

              // Update last login
              await User.findByIdAndUpdate((userDoc._id as any).toString(), { lastLogin: new Date() });

              const userData = {
                id: (userDoc._id as any).toString(),
                email: userDoc.email,
                name: `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User',
                image: userDoc.avatar || null,
              };

              console.log('✅ Passwordless login: Authorization successful for user', userData.id);
              return userData;
            } catch (error: any) {
              console.error('❌ Passwordless login error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
              });
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
          // IMPORTANT: Only store minimal data in session to prevent cookie size issues
          if (token && session?.user && token.id) {
            try {
            const userData = await UnifiedAuthService.fetchUserData(token.id as string);

            if (userData) {
                // Store only essential fields - keep session minimal
              session.user.id = userData.id;
                session.user.email = userData.email || (token.email as string) || '';
                session.user.name = userData.name || '';
              session.user.image = userData.image ?? undefined;
                (session.user as any).role = userData.role || 'user';
              (session.user as any).type = 'user';
                (session.user as any).planKey = userData.planKey || 'free';
                (session.user as any).subscriptionStatus = userData.subscriptionStatus || 'inactive';
            } else {
              // Fallback to token data if user not found
                session.user.id = (token.id as string) || '';
                session.user.email = (token.email as string) || '';
                session.user.name = '';
                (session.user as any).role = 'user';
                (session.user as any).type = 'user';
                (session.user as any).planKey = 'free';
                (session.user as any).subscriptionStatus = 'inactive';
              }
            } catch (error) {
              console.error('❌ Error in session callback:', error);
              // Fallback to minimal token data on error
              session.user.id = (token.id as string) || '';
              session.user.email = (token.email as string) || '';
              session.user.name = '';
            }
          }

          // Ensure we're not accidentally including large objects
          // Create a minimal session object with only primitive values
          const cleanedSession = {
            user: {
              id: String(session.user?.id || ''),
              email: String(session.user?.email || ''),
              name: String(session.user?.name || ''),
              image: session.user?.image ? String(session.user.image).substring(0, 500) : undefined, // Limit image URL length
              role: String((session.user as any)?.role || 'user'),
              type: String((session.user as any)?.type || 'user'),
              planKey: String((session.user as any)?.planKey || 'free'),
              subscriptionStatus: String((session.user as any)?.subscriptionStatus || 'inactive'),
            },
            expires: session.expires
          };

          // Log if session is getting too large (for debugging)
          const sessionSize = JSON.stringify(cleanedSession).length;
          if (sessionSize > 10000) { // 10KB threshold
            console.warn(`⚠️ Session size is ${sessionSize} bytes - may cause cookie issues`);
          }

          return cleanedSession as any;
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

      // Fetch from database - only select fields we need to prevent large payloads
      await getConnection();
      const user = await User.findById(userId)
        .select('_id email firstName lastName avatar role currentPlanKey subscription.status')
        .lean()
        .exec();

      if (!user) {
        return null;
      }
      const userDoc = Array.isArray(user) ? user[0] : user;
      if (!userDoc) {
        return null;
      }

      // Create minimal user data object - only include what we need
      // Ensure image is a URL string, not a large base64 or buffer
      let avatarUrl: string | null = null;
      if (userDoc.avatar) {
        if (typeof userDoc.avatar === 'string' && userDoc.avatar.length < 1000) {
          // Only include if it's a reasonable length (likely a URL)
          avatarUrl = userDoc.avatar;
        } else if (typeof userDoc.avatar === 'object') {
          // If it's an object, try to extract URL
          avatarUrl = (userDoc.avatar as any).url || null;
        }
      }

      const userData: AuthenticatedUser = {
        id: (userDoc._id as any).toString(),
        email: userDoc.email || '',
        name: `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User',
        image: avatarUrl,
        role: userDoc.role || 'user',
        planKey: userDoc.currentPlanKey || 'free',
        subscriptionStatus: (userDoc as any).subscription?.status || 'inactive',
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

