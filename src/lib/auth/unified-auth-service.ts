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
import { headers } from 'next/headers';
import { detectUserRegion } from '@/lib/services/regionDetectionService';

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
            try {
              if (!credentials?.email || !credentials?.password) {
                console.error('❌ Credentials provider: Missing email or password');
                return null;
              }

              console.log('🔐 Credentials provider: Attempting authentication for:', credentials.email);

              const result = await UserService.authenticateUser(
                credentials.email,
                credentials.password
              );

              if (!result.user || result.error) {
                console.error('❌ Credentials provider: Authentication failed', {
                  hasUser: !!result.user,
                  error: result.error
                });
                return null;
              }

              console.log('✅ Credentials provider: Authentication successful for:', result.user.email);

              // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
              // The JWT callback will further minimize this, but we should start minimal here
              return {
                id: String(result.user.id).substring(0, 100),
                email: String(result.user.email).substring(0, 255),
                name: String(result.user.name || '').substring(0, 100),
                // Only include image if it's a short URL (not a large base64 string)
                image: result.user.image && typeof result.user.image === 'string' && result.user.image.length < 500
                  ? result.user.image.substring(0, 500)
                  : undefined,
              };
            } catch (error: any) {
              console.error('❌ Credentials provider: Unexpected error:', {
                message: error.message,
                stack: error.stack
              });
              return null;
            }
          },
        }),

        // Admin Credentials Provider
        CredentialsProvider({
          id: 'admin-credentials',
          name: 'Admin Login',
          credentials: {
            email: { type: 'email' },
            password: { type: 'password' },
          },
          async authorize(credentials, req) {
            if (!credentials?.email || !credentials?.password) {
              console.log('Admin auth: Missing credentials');
              return null;
            }

            try {
              // Get database connection
              await getConnection();

              // Dynamically import AdminAuth model to avoid circular dependencies
              const AdminAuth = (await import('@/models/AdminAuth')).default;

              // Find admin user by email
              const adminUser = await AdminAuth.findOne({
                email: credentials.email.toLowerCase().trim()
              }).select('+password');

              if (!adminUser) {
                console.log('Admin user not found:', credentials.email);
                // Log failed login attempt
                try {
                  const { ActivityLogService } = await import('@/lib/services/activityLogService');
                  await ActivityLogService.logAdminAction({
                    adminUserId: 'unknown',
                    adminEmail: credentials.email,
                    action: 'admin_login_failed',
                    actionType: 'authentication',
                    status: 'failed',
                    metadata: {
                      reason: 'user_not_found',
                      provider: 'admin-credentials'
                    }
                  });
                } catch (logError) {
                  console.error('Failed to log admin login failure:', logError);
                }
                return null;
              }

              // Verify password
              const isPasswordValid = await adminUser.comparePassword(credentials.password);

              if (!isPasswordValid) {
                console.log('Invalid password for admin:', credentials.email);
                // Log failed login attempt
                try {
                  const { ActivityLogService } = await import('@/lib/services/activityLogService');
                  await ActivityLogService.logAdminAction({
                    adminUserId: adminUser._id.toString(),
                    adminEmail: credentials.email,
                    action: 'admin_login_failed',
                    actionType: 'authentication',
                    status: 'failed',
                    metadata: {
                      reason: 'invalid_password',
                      provider: 'admin-credentials'
                    }
                  });
                } catch (logError) {
                  console.error('Failed to log admin login failure:', logError);
                }
                return null;
              }

              // Update last login (don't fail if this fails)
              try {
                adminUser.lastLogin = new Date();
                await adminUser.save();
              } catch (saveError) {
                console.warn('Failed to update admin last login:', saveError);
                // Continue anyway - this is not critical
              }

              // Return admin user with role
              return {
                id: adminUser._id.toString(),
                email: adminUser.email,
                name: adminUser.email.split('@')[0],
                role: adminUser.role || 'admin',
                type: 'admin',
              };
            } catch (error: any) {
              // Log error but don't expose details to client
              console.error('Admin authentication error:', {
                message: error?.message || 'Unknown error',
                name: error?.name || 'Error',
                // Don't log full stack in production
                ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
              });
              // Always return null on error - never throw
              return null;
            }
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

                // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
                const userData = {
                  id: String((userDoc._id as any).toString()).substring(0, 100),
                  email: String(userDoc.email).substring(0, 255),
                  name: String(`${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User').substring(0, 100),
                  // Only include image if it's a short URL (not a large base64 string)
                  image: userDoc.avatar && typeof userDoc.avatar === 'string' && userDoc.avatar.length < 500
                    ? userDoc.avatar.substring(0, 500)
                    : undefined,
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

              // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
              const userData = {
                id: String((userDoc._id as any).toString()).substring(0, 100),
                email: String(userDoc.email).substring(0, 255),
                name: String(`${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User').substring(0, 100),
                // Only include image if it's a short URL (not a large base64 string)
                image: userDoc.avatar && typeof userDoc.avatar === 'string' && userDoc.avatar.length < 500
                  ? userDoc.avatar.substring(0, 500)
                  : undefined,
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
        // NOTE: admin-credentials provider is defined above (line 101)
        // Removed duplicate provider that was using UserService.authenticateAdmin
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
          // CRITICAL: Keep JWT token minimal to prevent cookie size issues
          // The JWT token is what gets stored in the cookie, so it must be tiny

          if (user) {
            // Only store essential identifiers - fetch full data in session callback
            // Ensure all values are strings and limited in length
            token.id = String(user.id || '').substring(0, 100);
            token.email = String(user.email || '').substring(0, 255);

            // Preserve admin type and role from authorize function (minimal)
            if ((user as any).type === 'admin') {
              token.type = 'admin';
              token.role = String((user as any).role || 'admin').substring(0, 50);
              // Only store name if it's short (admin emails can be long)
              const name = user.name || (user.email as string)?.split('@')[0] || 'Admin';
              token.name = String(name).substring(0, 100); // Limit name length
            } else {
              // Regular users - don't store name in token, fetch in session callback
              token.type = 'user';
            }

            // Explicitly remove image from token - it can be large
            delete (token as any).image;
          }

          // CRITICAL: Create a completely clean token object with only primitive values
          // This prevents any accidental inclusion of large objects or circular references
          const cleanedToken: any = {
            id: String(token.id || '').substring(0, 100),
            email: String(token.email || '').substring(0, 255),
            type: String(token.type || 'user').substring(0, 50),
          };

          // Only add standard JWT fields if they exist
          if (token.iat) cleanedToken.iat = Number(token.iat);
          if (token.exp) cleanedToken.exp = Number(token.exp);
          if (token.jti) cleanedToken.jti = String(token.jti).substring(0, 100);

          // Only add role and name if they exist and are short
          if (token.role) {
            cleanedToken.role = String(token.role).substring(0, 50);
          }
          if (token.name && token.type === 'admin') {
            cleanedToken.name = String(token.name).substring(0, 100);
          }

          // Log token size for debugging (should be < 500 bytes)
          const tokenSize = JSON.stringify(cleanedToken).length;
          if (tokenSize > 1000) {
            console.warn(`⚠️ JWT token size is ${tokenSize} bytes - may cause cookie issues`);
            console.warn('Token data:', JSON.stringify(cleanedToken).substring(0, 500));
          }

          return cleanedToken;
        },

        async session({ session, token }) {
          // Check if this is an admin user first
          const isAdmin = token.type === 'admin' || token.role === 'admin' || token.role === 'superadmin';

          if (isAdmin) {
            // Admin user - use token data directly (don't fetch from User model)
            session.user.id = (token.id as string) || '';
            session.user.email = (token.email as string) || '';
            session.user.name = (token.name as string) || (token.email as string)?.split('@')[0] || 'Admin';
            (session.user as any).role = (token.role as string) || 'admin';
            (session.user as any).type = 'admin';
            (session.user as any).planKey = 'admin';
            (session.user as any).subscriptionStatus = 'active';
          } else {
            // Regular user - fetch fresh user data from cache or DB
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
                (session.user as any).role = 'user';
                (session.user as any).type = 'user';
              }
            }
          }

          // CRITICAL: Create a minimal session object with only primitive values
          // This prevents cookie size issues by ensuring we only store essential data
          const cleanedSession = {
            user: {
              id: String(session.user?.id || '').substring(0, 100), // Limit ID length
              email: String(session.user?.email || '').substring(0, 255), // Limit email length
              name: String(session.user?.name || '').substring(0, 100), // Limit name length
              image: session.user?.image ? String(session.user.image).substring(0, 500) : undefined, // Limit image URL length
              role: String((session.user as any)?.role || (isAdmin ? 'admin' : 'user')).substring(0, 50),
              type: String((session.user as any)?.type || (isAdmin ? 'admin' : 'user')).substring(0, 50),
              planKey: String((session.user as any)?.planKey || (isAdmin ? 'admin' : 'free')).substring(0, 50),
              subscriptionStatus: String((session.user as any)?.subscriptionStatus || (isAdmin ? 'active' : 'inactive')).substring(0, 50),
            },
            expires: session.expires
          };

          // Log if session is getting too large (for debugging)
          const sessionSize = JSON.stringify(cleanedSession).length;
          if (sessionSize > 1000) { // 1KB threshold (should be much smaller)
            console.warn(`⚠️ Session size is ${sessionSize} bytes - may cause cookie issues`);
            console.warn('Session data:', JSON.stringify(cleanedSession).substring(0, 500));
          }

          // Return the cleaned session - this is what gets stored in the cookie
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
          // Log sign-in events to activity logs
          try {
            const { ActivityLogService } = await import('@/lib/services/activityLogService');
            const isAdmin = (user as any)?.type === 'admin' || (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin';

            if (isAdmin) {
              // Log admin login
              await ActivityLogService.logAdminAction({
                adminUserId: user.id || '',
                adminEmail: user.email || undefined,
                action: 'admin_login_success',
                actionType: 'authentication',
                status: 'success',
                metadata: {
                  provider: account?.provider || 'unknown',
                  isNewUser: isNewUser || false
                }
              });
            } else {
              // Detect user region from IP
              let region = 'Unknown';
              let ipLocation = 'Unknown';

              try {
                const headersList = await headers();
                const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
                const regionInfo = await detectUserRegion(ip);

                if (regionInfo) {
                  region = regionInfo.countryName;
                  ipLocation = regionInfo.countryCode;

                  // Update user with region info
                  await getConnection();
                  await User.findByIdAndUpdate(user.id, {
                    region: region,
                    ip_location: ipLocation,
                    lastLogin: new Date()
                  });
                }
              } catch (regionError) {
                console.error('Failed to detect/update user region:', regionError);
              }

              // Log regular user login
              await ActivityLogService.logUserAction({
                userId: user.id || '',
                userEmail: user.email || undefined,
                action: 'user_login_success',
                status: 'success',
                metadata: {
                  provider: account?.provider || 'unknown',
                  isNewUser: isNewUser || false,
                  region,
                  ipLocation
                }
              });
            }
          } catch (error) {
            // Don't fail sign-in if logging fails
            console.error('Failed to log sign-in event:', error);
          }
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

