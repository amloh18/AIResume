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
  name: string;
  image?: string | null;
  role: string;
  planKey: string;
  subscriptionStatus?: string;
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

      // Find user by email with password
      const user = await userRepository.findByEmailWithPassword(email);

      if (!user) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Check if user has a password (OAuth users don't have passwords)
      if (!user.password) {
        return { user: null, error: 'Please sign in with Google' };
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return { user: null, error: 'Please verify your email before signing in' };
      }

      // Verify password using repository method
      const userId = (user as any)._id.toString();
      const isPasswordValid = await userRepository.verifyPassword(userId, password);

      if (!isPasswordValid) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Update last login using repository
      await userRepository.updateLastLogin(userId);

      return {
        user: {
          id: userId,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatar || null,
          role: user.role || 'user',
          planKey: user.currentPlanKey || 'free',
          subscriptionStatus: user.subscription?.status || 'inactive',
        },
      };
    } catch (error: any) {
      console.error('❌ Authentication error:', error.message);
      return { user: null, error: 'Authentication failed' };
    }
  }

  /**
   * Authenticate admin user
   */
  static async authenticateAdmin(
    email: string,
    password: string
  ): Promise<AuthenticationResult> {
    try {
      await getConnection();

      // Find admin user by email
      const user = await userRepository.findByEmailWithPassword(email);

      if (!user || !['admin', 'superadmin'].includes(user.role as string)) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Check if user has a password
      if (!user.password) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Verify password using repository method
      const userId = (user as any)._id.toString();
      const isPasswordValid = await userRepository.verifyPassword(userId, password);

      if (!isPasswordValid) {
        return { user: null, error: 'Invalid credentials' };
      }

      // Update last login using repository
      await userRepository.updateLastLogin(userId);

      return {
        user: {
          id: userId,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatar || null,
          role: user.role || 'user',
          planKey: user.currentPlanKey || 'free',
          subscriptionStatus: user.subscription?.status || 'inactive',
        },
      };
    } catch (error: any) {
      console.error('❌ Admin authentication error:', error.message);
      return { user: null, error: 'Authentication failed' };
    }
  }

  /**
   * Find or create Google OAuth user
   */
  static async findOrCreateGoogleUser(data: {
    email: string;
    name: string;
    image?: string;
    googleId: string;
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
        console.log('✅ Existing Google user updated:', userId);
      } else {
        // Create new user using repository
        const userName = data.name || '';
        const nameParts = userName ? userName.split(' ') : ['User'];
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';

        existingUser = await userRepository.createGoogleUser({
          email: userEmail,
          firstName,
          lastName,
          avatar: data.image,
          authProviderId: data.googleId || `google_${data.googleId}`,
        });
        console.log('✅ New Google user created:', existingUser._id);
      }

      return {
        id: (existingUser as any)._id.toString(),
        email: existingUser.email,
        name: `${existingUser.firstName} ${existingUser.lastName}`,
        image: existingUser.avatar || null,
        role: existingUser.role || 'user',
        planKey: existingUser.currentPlanKey || 'free',
        subscriptionStatus: existingUser.subscription?.status || 'inactive',
      };
    } catch (error: any) {
      console.error('❌ Error finding/creating Google user:', error);
      return null;
    }
  }
}

