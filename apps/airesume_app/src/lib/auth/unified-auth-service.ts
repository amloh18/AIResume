// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import 'server-only';
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import AppleProvider from 'next-auth/providers/apple';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { getCache, setCache, invalidateCache } from '@/lib/cache';
import { UserService, AuthenticatedUser } from './user-service';
import VerificationToken from '@/models/VerificationToken';
import { isCodeExpired } from '@/lib/verification-code';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { headers } from 'next/headers';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import { encryptToken, decryptToken } from './token-encryption';
import { getAppleClientSecret } from './apple-provider-secret';
import { SessionService } from '@/lib/services/session-service';
// Explicit import: this file is `@ts-nocheck`, so the previous reliance on a global
// `crypto` was never checked. It happens to exist in Node 20+, but a missing global
// here throws *before* the surrounding try/catch and would break every sign-in flow.
import crypto from 'crypto';
import {
  getSessionCookieName,
  getSessionCookieOptions,
  isSecureSessionCookie,
} from './session-cookie';

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
    const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
    // `next build` prerenders pages, and the root layout reads the session
    // (src/app/layout.tsx:146), so the config gets resolved during the build — where no runtime
    // secret exists. `getServerSession()` spreads the options object *before* it touches
    // `cookies()`, so that spread is what triggers resolution; throwing here aborts the build on
    // every page the layout wraps. Nothing signs a token during a build, so resolve with an empty
    // secret and keep the guard for runtime, where the secret is present. The pages that read the
    // session are then correctly bailed out to dynamic rendering by Next's own `cookies()` handling.
    // See src/lib/auth-config.ts for why the config is also resolved lazily.
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    if (!NEXTAUTH_SECRET && !isBuildPhase) {
      throw new Error('NEXTAUTH_SECRET environment variable is required');
    }
    // NOTE: `NEXTAUTH_URL` is deliberately not read here any more. Whether the
    // deployment is on HTTPS — which decides the session-cookie name and its
    // `Secure` flag — is resolved once in @/lib/auth/session-cookie, so that this
    // config and the routes that also set that cookie cannot disagree.
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

    return {
      session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        updateAge: 24 * 60 * 60, // 24 hours
      },

      // Cookie name + `Secure` flag come from a single shared helper so they can
      // never drift from the routes that also set this cookie
      // (create-session, dev-bypass) — see @/lib/auth/session-cookie.
      useSecureCookies: isSecureSessionCookie(),
      cookies: {
        sessionToken: {
          name: getSessionCookieName(),
          options: getSessionCookieOptions(7 * 24 * 60 * 60), // 7 days
        },
        callbackUrl: {
          name: isSecureSessionCookie() ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
          options: {
            sameSite: isSecureSessionCookie() ? 'none' : 'lax',
            path: '/',
            secure: isSecureSessionCookie(),
          },
        },
        csrfToken: {
          name: isSecureSessionCookie() ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: isSecureSessionCookie(),
          },
        },
        pkceCodeVerifier: {
          name: isSecureSessionCookie() ? '__Secure-next-auth.pkce.code_verifier' : 'next-auth.pkce.code_verifier',
          options: {
            httpOnly: true,
            sameSite: isSecureSessionCookie() ? 'none' : 'lax',
            path: '/',
            secure: isSecureSessionCookie(),
            maxAge: 60 * 15,
          },
        },
        state: {
          name: isSecureSessionCookie() ? '__Secure-next-auth.state' : 'next-auth.state',
          options: {
            httpOnly: true,
            sameSite: isSecureSessionCookie() ? 'none' : 'lax',
            path: '/',
            secure: isSecureSessionCookie(),
            maxAge: 60 * 15,
          },
        },
        nonce: {
          name: isSecureSessionCookie() ? '__Secure-next-auth.nonce' : 'next-auth.nonce',
          options: {
            httpOnly: true,
            sameSite: isSecureSessionCookie() ? 'none' : 'lax',
            path: '/',
            secure: isSecureSessionCookie(),
          },
        },
      },

      secret: NEXTAUTH_SECRET,

      providers: [
        GoogleProvider({
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
        }),

        AppleProvider({
          clientId: process.env.APPLE_ID || '',
          // Apple's client secret is not static: it is an ES256 JWT generated
          // from the .p8 signing key (see apple-provider-secret.ts). Returns ''
          // when not configured, which leaves the provider unavailable without
          // affecting the other providers.
          clientSecret: getAppleClientSecret(),
        }),

        CredentialsProvider({
          id: 'credentials',
          name: 'Email',
          credentials: {
            email: { type: 'email' },
            password: { type: 'password' },
            portal: { type: 'text' },
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

              // Enforce portal isolation
              const portal = credentials.portal || 'default';
              const role = result.user.role;
              const isAdmin = role === 'admin' || role === 'superadmin';

              if (portal === 'admin' && !isAdmin) {
                throw new Error('Unauthorized. Please use the consumer login.');
              }

              console.log('✅ Credentials provider: Authentication successful for:', result.user.email);

              // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
              // The JWT callback will further minimize this, but we should start minimal here
              return {
                id: String(result.user.id).substring(0, 100),
                email: String(result.user.email).substring(0, 255),
                name: String(result.user.name || '').substring(0, 100),
                role: result.user.role,
                userLifecycleState: result.user.userLifecycleState,
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
        }       ),

        LinkedInProvider({
          clientId: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          authorization: {
            params: {
              scope: 'r_liteprofile r_emailaddress w_member_social',
            },
          },
          profile(profile) {
            // Extract profile picture from nested displayImage~ object
            let imageUrl = '';
            if (profile.profilePicture?.['displayImage~']?.elements) {
              const elements = profile.profilePicture['displayImage~'].elements;
              if (elements.length > 0 && elements[0].identifiers?.length > 0) {
                imageUrl = elements[0].identifiers[0].identifier;
              }
            }
            
            return {
              id: profile.id || '',
              name: `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || profile.id || '',
              email: profile.emailAddress || '',
              image: imageUrl,
              role: 'user' as const,
              type: 'user' as const,
            };
          },
        }),

        // Passwordless Provider
        CredentialsProvider({
          id: 'passwordless',
          name: 'Passwordless Login',
          credentials: {
            email: { type: 'email' },
            verificationCode: { type: 'text' },
            preVerified: { type: 'text' }, // Flag to skip code verification (user already verified)
            portal: { type: 'text' },
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

                // Enforce portal isolation
                const portal = credentials.portal || 'default';
                const role = userDoc.role;
                const isAdmin = role === 'admin' || role === 'superadmin';

                if (portal === 'admin' && !isAdmin) {
                  throw new Error('Unauthorized. Please use the consumer login.');
                }

                // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
                  const userData = {
                    id: String((userDoc._id as any).toString()).substring(0, 100),
                    email: String(userDoc.email).substring(0, 255),
                    name: String(`${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User').substring(0, 100),
                    role: userDoc.role,
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
              const user = await User.findOne({
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
                
                // Check for anonymous user to merge
                try {
                  const headersList = await headers();
                  const cookieHeader = headersList.get('cookie');
                  if (cookieHeader) {
                    const match = cookieHeader.match(/buildairesume_anonymous_token=([^;]+)/);
                    if (match && match[1]) {
                      const anonymousToken = match[1];
                      console.log('🔄 Merging anonymous user during passwordless signup:', anonymousToken);
                      await UserService.mergeAnonymousUser(anonymousToken, userDoc._id.toString());
                      
                      // Fetch updated user doc to get merged onboarding state
                      const updatedUser = await User.findById(userDoc._id).lean().exec();
                      if (updatedUser) userDoc = updatedUser;
                    }
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to merge anonymous user during passwordless signup:', err);
                }
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

              // Enforce portal isolation
              const portal = credentials.portal || 'default';
              const role = userDoc.role;
              const isAdmin = role === 'admin' || role === 'superadmin';

              if (portal === 'admin' && !isAdmin) {
                throw new Error('Unauthorized. Please use the consumer login.');
              }

              // CRITICAL: Return only minimal user data to prevent JWT token from becoming too large
              const userData = {
                id: String((userDoc._id as any).toString()).substring(0, 100),
                email: String(userDoc.email).substring(0, 255),
                name: String(`${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User').substring(0, 100),
                role: userDoc.role,
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
      ],

      callbacks: {
         async signIn({ user, account, profile }) {
          // Handle OAuth sign-in
          if (account?.provider === 'google' || account?.provider === 'apple' || account?.provider === 'linkedin') {
            try {
              let linkedInAccessToken: string | undefined;
              let linkedInId: string | undefined;
              
              // For LinkedIn, we need to fetch the full profile to get email
              // since the initial profile might not have it
              if (account.provider === 'linkedin') {
                linkedInAccessToken = account.access_token as string;
                linkedInId = account.providerAccountId;
                
                // Fetch full LinkedIn profile to get email and complete data
                try {
                  const profileRes = await fetch('https://api.linkedin.com/v2/me', {
                    headers: {
                      'Authorization': `Bearer ${linkedInAccessToken}`,
                      'X-Restli-Protocol-Version': '2.0.0',
                    },
                  });
                  
                  if (profileRes.ok) {
                    const linkedInProfile = await profileRes.json();
                    // Update user data with LinkedIn profile info
                    user.id = linkedInProfile.id || user.id;
                    user.name = `${linkedInProfile.localizedFirstName || ''} ${linkedInProfile.localizedLastName || ''}`.trim() || user.name;
                    
                    // Fetch email separately
                    const emailRes = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
                      headers: {
                        'Authorization': `Bearer ${linkedInAccessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0',
                      },
                    });
                    
                    if (emailRes.ok) {
                      const emailData = await emailRes.json();
                      const emailAddress = emailData.elements?.[0]?.['handle~']?.emailAddress;
                      if (emailAddress) {
                        user.email = emailAddress;
                      }
                    }
                  }
                } catch (error) {
                  console.error('LinkedIn profile fetch error:', error);
                  // Continue with basic profile data
                }
              }
              
              const oauthUser = await UserService.findOrCreateOAuthUser({
                email: user.email || '',
                name: user.name || '',
                image: user.image || undefined,
                providerId: account.providerAccountId || (account.id ? String(account.id) : '') || '',
                provider: account.provider,
              });

              if (oauthUser) {
                // Check for anonymous user to merge
                try {
                  const headersList = await headers();
                  const cookieHeader = headersList.get('cookie');
                  if (cookieHeader) {
                    const match = cookieHeader.match(/buildairesume_anonymous_token=([^;]+)/);
                    if (match && match[1]) {
                      const anonymousToken = match[1];
                      console.log('🔄 Merging anonymous user during OAuth sign-in:', anonymousToken);
                      await UserService.mergeAnonymousUser(anonymousToken, oauthUser.id);
                    }
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to merge anonymous user during OAuth sign-in:', err);
                }

                user.id = oauthUser.id;
            (user as any).userLifecycleState = oauthUser.userLifecycleState;
                // Store LinkedIn-specific data in user object for JWT callback
                if (linkedInAccessToken) {
                  (user as any).linkedInId = linkedInId;
                  (user as any).linkedInAccessToken = linkedInAccessToken;
                }
              }

              return !!oauthUser;
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
            // Generate a unique jti for this session
            token.jti = crypto.randomUUID();

            // Record login session in MongoDB
            try {
              let ip = 'unknown';
              let userAgent = '';
              let location: string | undefined;

              try {
                const headersList = await headers();
                ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';
                userAgent = headersList.get('user-agent') || '';
                const regionInfo = await detectUserRegion(ip);
                if (regionInfo) location = regionInfo.countryName;
              } catch {
                // headers() may fail outside a request scope
              }

              await SessionService.createSession({
                userId: String(user.id),
                jti: token.jti,
                ip,
                userAgent,
                provider: (user as any).authProvider || 'credentials',
                location,
              });
            } catch (error: any) {
              // Do NOT swallow this silently — it is the most likely cause of a session
              // that can never validate. Log the name/message explicitly (an Error object
              // serialises poorly in some log pipelines) and include the id we tried to
              // cast, since a non-ObjectId userId is the usual reason this throws.
              console.error(
                '❌ Failed to record login session — the token will have no LoginSession row.',
                {
                  name: error?.name,
                  message: error?.message,
                  userId: String(user.id),
                  jti: token.jti,
                }
              );
            }

            // Only store essential identifiers - fetch full data in session callback
            // Ensure all values are strings and limited in length
            token.id = String(user.id || '').substring(0, 100);
            token.email = String(user.email || '').substring(0, 255);

            // Capture role from the user object (set by authorize or OAuth callback)
            const userRole = (user as any).role || 'user';
            const userType = (user as any).type || (userRole === 'admin' || userRole === 'superadmin' ? 'admin' : 'user');
            
            token.type = String(userType).substring(0, 50);
            token.role = String(userRole).substring(0, 50);

            // If it's an admin, we can optionally store the name
            if (userType === 'admin') {
              const name = user.name || (user.email as string)?.split('@')[0] || 'Admin';
              token.name = String(name).substring(0, 100); // Limit name length
            }

            // Store LinkedIn-specific data if present (encrypted)
            if ((user as any).linkedInId) {
              token.linkedInId = String((user as any).linkedInId).substring(0, 100);
            }
            if ((user as any).linkedInAccessToken) {
              try {
                // Encrypt token before storing in JWT
                token.linkedInAccessToken = encryptToken((user as any).linkedInAccessToken);
              } catch (error) {
                console.error('Failed to encrypt LinkedIn token:', error);
                // Don't fail the entire auth if encryption fails
              }
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

          // Store LinkedIn data in token (encrypted)
          if (token.linkedInId) {
            cleanedToken.linkedInId = String(token.linkedInId).substring(0, 100);
          }
          if (token.linkedInAccessToken) {
            cleanedToken.linkedInAccessToken = token.linkedInAccessToken;
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
          // Check if this is an admin user
          const isAdmin = token.type === 'admin' || token.role === 'admin' || token.role === 'superadmin';

          // Validate session jti against LoginSession collection
          // Old JWTs without jti get a grace period (they'll expire naturally in 7 days)
          if (token.jti && typeof token.jti === 'string') {
            try {
              const state = await SessionService.getSessionState(token.jti);

              if (state === 'revoked' || state === 'expired') {
                // An explicit decision (admin revocation, or genuine expiry). Fail closed.
                console.warn(`⚠️ Session jti ${token.jti} is ${state} — forcing re-auth`);
                return { user: null, expires: '' } as any;
              }

              if (state === 'missing') {
                // No LoginSession row for a jti that is in a validly-signed token.
                //
                // This must NOT sign the user out. Session recording is best-effort and
                // its failure is swallowed by a catch that only logs (see the jwt
                // callback), so treating "no row" as "revoked" turned any write failure
                // into a total auth outage — 2FA, credentials and OAuth all bounced
                // straight back to /sign-in.
                //
                // Revocation sets `revokedAt` rather than deleting the row, and
                // cleanupSessions only deletes already-expired rows, so allowing
                // `missing` here does not weaken revocation. Warn loudly so the
                // underlying write failure stays visible, and re-record below so the
                // session becomes revocable again.
                console.warn(
                  `⚠️ Session jti ${token.jti} has no LoginSession row — allowing (signed token) and re-recording`
                );
              }

              // Touch session to update lastActiveAt (throttled to once per 5 min)
              const lastTouch = (token as any)._lastTouch as number | undefined;
              const now = Date.now();
              if (!lastTouch || now - lastTouch > 5 * 60 * 1000) {
                (token as any)._lastTouch = now;
                if (state === 'missing') {
                  // `ensureSession` is idempotent: parallel requests that all observed
                  // `missing` before any of them wrote converge on one row instead of
                  // losing a race on the `jti_1` unique index. See SessionService.
                  (async () => {
                    let ip = 'unknown';
                    let userAgent = '';
                    let location: string | undefined;
                    try {
                      const headersList = await headers();
                      ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';
                      userAgent = headersList.get('user-agent') || '';
                      const regionInfo = await detectUserRegion(ip);
                      if (regionInfo) location = regionInfo.countryName;
                    } catch {}

                    await SessionService.ensureSession({
                      userId: String(token.id),
                      jti: token.jti,
                      ip,
                      userAgent,
                      location,
                      provider: 'credentials',
                    });
                  })().catch((e) => console.error('Failed to re-record session:', e));
                } else {
                  SessionService.touchSession(token.jti).catch(() => {});
                }
              }
            } catch (error) {
              // Don't fail the session if validation errors — but log it
              console.error('Session validation error:', error);
            }
          }

          // Fetch fresh user data from cache or DB for all users with an ID
          if (token && session?.user && token.id) {
            try {
              const userData = await UnifiedAuthService.fetchUserData(token.id as string);

              if (userData) {
                // Store essential fields from DB
                session.user.id = userData.id;
                session.user.email = userData.email || (token.email as string) || '';
                session.user.name = userData.name || '';
                session.user.image = userData.image ?? undefined;
                (session.user as any).role = userData.role || token.role || 'user';
                (session.user as any).type = isAdmin ? 'admin' : 'user';
                (session.user as any).planKey = userData.planKey || (isAdmin ? 'admin' : 'free');
                (session.user as any).userLifecycleState = token.userLifecycleState || userData.userLifecycleState || 'ACTIVE';
                (session.user as any).subscriptionStatus = userData.subscriptionStatus || (isAdmin ? 'active' : 'inactive');
              } else {
                // Fallback to token data if user not found in User model (e.g., direct AdminAuth user)
                session.user.id = (token.id as string) || '';
                session.user.email = (token.email as string) || '';
                session.user.name = (token.name as string) || (token.email as string)?.split('@')[0] || '';
                (session.user as any).role = (token.role as string) || (isAdmin ? 'admin' : 'user');
                (session.user as any).type = isAdmin ? 'admin' : 'user';
                (session.user as any).planKey = isAdmin ? 'admin' : 'free';
                (session.user as any).subscriptionStatus = isAdmin ? 'active' : 'inactive';
              }
              
              // Add LinkedIn data to session if present in token
              if (token.linkedInId) {
                (session.user as any).linkedInId = token.linkedInId;
              }
              if (token.linkedInAccessToken) {
                try {
                  // Decrypt token for use in server-side API calls
                  (session.user as any).linkedInAccessToken = decryptToken(token.linkedInAccessToken as string);
                } catch (error) {
                  console.error('Failed to decrypt LinkedIn token for session:', error);
                }
              }
            } catch (error) {
              console.error('❌ Error in session callback:', error);
              // Fallback to minimal token data on error
              session.user.id = (token.id as string) || '';
              session.user.email = (token.email as string) || '';
              (session.user as any).role = (token.role as string) || (isAdmin ? 'admin' : 'user');
              (session.user as any).type = isAdmin ? 'admin' : 'user';
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

        async redirect({ url, baseUrl }) {
          const envUrl = process.env.NEXTAUTH_URL;
          let canonicalOrigin = baseUrl;
          if (envUrl) {
            try {
              const parsedEnv = envUrl.startsWith('http://') || envUrl.startsWith('https://')
                ? envUrl
                : `https://${envUrl}`;
              canonicalOrigin = new URL(parsedEnv).origin;
            } catch {
              // fallback to baseUrl
            }
          }

          if (url) {
            // NextAuth accepts relative values — prefer relative when possible.
            if (url.startsWith('/') && !url.startsWith('//')) {
              return url;
            }

            // Return an absolute URL only when one is supplied and matches trusted origins
            try {
              const parsed = new URL(url);
              if (
                parsed.origin === canonicalOrigin ||
                parsed.origin === baseUrl ||
                parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1'
              ) {
                return new URL(parsed.pathname + parsed.search + parsed.hash, canonicalOrigin).toString();
              }
            } catch {
              // invalid URL
            }
          }

          return '/';
        },
      },

      pages: {
        signIn: '/sign-in',
        error: '/auth/error',
        verifyRequest: '/auth/verify-email',
      },

      debug: false, // Explicitly disable debug mode to prevent leaking secrets in logs

      // trustHost is primarily for NextAuth v5 but included here for better proxy support
      // @ts-ignore pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
      trustHost: true,

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
          // Revoke the login session
          if (token?.jti && typeof token.jti === 'string') {
            try {
              await SessionService.revokeSession(token.jti);
            } catch (error) {
              console.error('Failed to revoke session on signOut:', error);
            }
          }
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
      
      // Try User collection first
      let userDoc = await User.findById(userId)
        .select('_id email firstName lastName avatar role currentPlanKey subscription.status')
        .lean()
        .exec();

      // If not found in User, check AdminAuth
      if (!userDoc) {
        const AdminAuth = (await import('@/models/AdminAuth')).default;
        const adminUser = await AdminAuth.findById(userId).lean().exec();
        
        if (adminUser) {
          userDoc = {
            ...adminUser,
            firstName: 'Admin',
            lastName: 'User',
            role: adminUser.role || 'admin',
          };
        }
      }

      if (!userDoc) {
        return null;
      }

      // Handle the case where userDoc might be an array (rare MongoDB edge case)
      const doc = Array.isArray(userDoc) ? userDoc[0] : userDoc;
      if (!doc) return null;

      // Create minimal user data object
      let avatarUrl: string | null = null;
      if (doc.avatar) {
        if (typeof doc.avatar === 'string' && doc.avatar.length < 1000) {
          avatarUrl = doc.avatar;
        } else if (typeof doc.avatar === 'object') {
          avatarUrl = (doc.avatar as any).url || null;
        }
      }

const userData = {
        id: String(doc._id),
        email: doc.email || '',
        name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'User',
        image: avatarUrl,
        role: doc.role || 'user',
        planKey: doc.currentPlanKey || 'free',
        subscriptionStatus: (doc as any).subscription?.status || 'inactive',
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

