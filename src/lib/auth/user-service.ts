import 'server-only';
import { userRepository } from '@/lib/repositories/user-repository';
import { getConnection } from '@/lib/database/connection-manager';

/**
 * User Authentication Service
 * 
 * Contains business logic for user authentication operations.
 * This separates authentication logic from data access.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  role?: string;
  planKey?: string;
  subscriptionStatus?: string;
  requiresTwoFactor?: boolean; // Flag to indicate 2FA is required
  isB2b?: boolean;
}

export interface AuthenticationResult {
  user: AuthenticatedUser | null;
  error?: string;
}

export class UserService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(
    email: string,
    password: string
  ): Promise<AuthenticationResult> {
    try {
      await getConnection();

      // Find user by email with password in regular User collection
      let user = await userRepository.findByEmailWithPassword(email);
      let isAdminCollection = false;

      if (!user) {
        // Fallback: Check AdminAuth collection
        const AdminAuth = (await import('@/models/AdminAuth')).default;
        const adminUser = await AdminAuth.findOne({ email: email.toLowerCase() }).select('+password').lean().exec();
        
        if (adminUser) {
          user = adminUser as any;
          isAdminCollection = true;
        }
      }

      if (!user) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Check if user has a password (OAuth users don't have passwords)
      if (!user.password) {
        return { user: null, error: 'Please sign in with Google' };
      }

      // Check if email is verified (only for regular users, admins are assumed verified)
      if (!isAdminCollection && !user.isEmailVerified) {
        return { user: null, error: 'Please verify your email before signing in' };
      }

      // Verify password
      let isPasswordValid = false;
      const userId = (user as any)._id.toString();

      if (isAdminCollection) {
        // AdminAuth uses bcrypt directly in its method, but since we are lean, we use bcrypt here
        const bcrypt = await import('bcryptjs');
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        isPasswordValid = await userRepository.verifyPassword(userId, password);
      }

      if (!isPasswordValid) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Update last login
      if (isAdminCollection) {
        const AdminAuth = (await import('@/models/AdminAuth')).default;
        await AdminAuth.findByIdAndUpdate(userId, { lastLogin: new Date() });
      } else {
        await userRepository.updateLastLogin(userId);
      }

      return {
        user: {
          id: userId,
          email: user.email,
          name: isAdminCollection ? 'Admin User' : `${user.firstName} ${user.lastName}`,
          image: (user as any).avatar || null,
          role: user.role || 'user',
          planKey: (user as any).currentPlanKey || (isAdminCollection ? 'pro_lifetime' : 'free'),
          subscriptionStatus: (user as any).subscription?.status || (isAdminCollection ? 'active' : 'inactive'),
          isB2b: isAdminCollection ? true : !!(user as any).b2b?.tenantId,
        },
      };
    } catch (error: any) {
      console.error('❌ Authentication error:', error.message);
      return { user: null, error: 'Authentication failed' };
    }
  }

  /**
   * Find or create OAuth user (Google, Apple, etc.)
   */
  static async findOrCreateOAuthUser(data: {
    email: string;
    name: string;
    image?: string;
    providerId: string;
    provider: string;
  }): Promise<AuthenticatedUser | null> {
    try {
      await getConnection();

      const userEmail = data.email.toLowerCase();
      let existingUser = await userRepository.findByEmail(userEmail);

      if (existingUser) {
        // Update existing user using repository
        const userId = (existingUser as any)._id.toString();
        const updated = await userRepository.updateById(userId, {
          $set: {
            lastLogin: new Date(),
            avatar: data.image || existingUser.avatar,
            isEmailVerified: true,
          },
        } as any);
        
        if (updated) {
          existingUser = updated;
        }
        console.log(`✅ Existing ${data.provider} user updated:`, userId);
      } else {
        // Create new user using repository
        const userName = data.name || '';
        const nameParts = userName ? userName.split(' ') : ['User'];
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';

        existingUser = await userRepository.createGoogleUser({ // Assuming createGoogleUser just creates an OAuth user
          email: userEmail,
          firstName,
          lastName,
          avatar: data.image,
          authProviderId: data.providerId || `${data.provider}_${data.providerId}`,
        });
        console.log(`✅ New ${data.provider} user created:`, existingUser._id);
      }

      return {
        id: (existingUser as any)._id.toString(),
        email: existingUser.email,
        name: `${existingUser.firstName} ${existingUser.lastName}`,
        image: existingUser.avatar || null,
        role: existingUser.role || 'user',
        planKey: existingUser.currentPlanKey || 'free',
        subscriptionStatus: existingUser.subscription?.status || 'inactive',
        isB2b: !!(existingUser as any).b2b?.tenantId,
      };
    } catch (error: any) {
      console.error(`❌ Error finding/creating ${data.provider} user:`, error);
      return null;
    }
  }

  /**
   * Merge anonymous user data into a real user account
   */
  static async mergeAnonymousUser(anonymousToken: string, realUserId: string): Promise<boolean> {
    try {
      await getConnection();
      const anonUser = await userRepository.findByAnonymousToken(anonymousToken);
      if (!anonUser) {
        console.log('⚠️ No anonymous user found for token:', anonymousToken);
        return false;
      }

      const anonUserId = anonUser._id.toString();
      console.log(`🔄 Merging anonymous user ${anonUserId} into real user ${realUserId}`);

      // 1. Transfer Primary CV and any other CVs
      const CV = (await import('@/models/CV')).default;
      const cvUpdateResult = await CV.updateMany(
        { userId: anonUserId },
        { $set: { userId: realUserId } }
      );
      console.log(`✅ Transferred ${cvUpdateResult.modifiedCount} CVs to real user`);

      // 2. Transfer Onboarding data and set lifecycle state
      // We merge onboarding data, preferring anonymous data if present
      const realUser = await userRepository.findById(realUserId);
      const mergedOnboarding = {
        ...(realUser?.onboarding || {}),
        ...(anonUser.onboarding || {})
      };

      await userRepository.updateById(realUserId, {
        $set: {
          onboarding: mergedOnboarding,
          userLifecycleState: 'AUTHENTICATED'
        }
      } as any);

      // 3. Delete anonymous user
      await userRepository.deleteById(anonUserId);
      console.log(`✅ Anonymous user ${anonUserId} deleted after merge`);

      return true;
    } catch (error) {
      console.error('❌ Error merging anonymous user:', error);
      return false;
    }
  }
}

