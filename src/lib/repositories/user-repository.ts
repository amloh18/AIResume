import 'server-only';
import User, { IUser } from '@/models/User';
import { BaseRepository } from './base-repository';
import { FilterQuery } from 'mongoose';

/**
 * User Repository
 * 
 * Handles all User model data access operations.
 * Extends BaseRepository with User-specific queries.
 */
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne(
      { email: email.toLowerCase() } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Find user by email with password (for authentication)
   */
  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.findOne(
      { email: email.toLowerCase() } as FilterQuery<IUser>,
      { select: '+password', lean: true }
    );
  }

  /**
   * Find user by auth provider ID
   */
  async findByAuthProviderId(authProviderId: string): Promise<IUser | null> {
    return this.findOne(
      { authProviderId } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Find user by Firebase UID (deprecated - use findByAuthProviderId instead)
   * @deprecated Use findByAuthProviderId instead
   */
  async findByFirebaseUid(firebaseUid: string): Promise<IUser | null> {
    return this.findOne(
      { authProviderId: firebaseUid, authProvider: 'firebase' } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Create Google OAuth user
   */
  async createGoogleUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    authProviderId: string;
  }): Promise<IUser> {
    return this.create({
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      authProvider: 'nextauth',
      authProviderId: data.authProviderId,
      isEmailVerified: true,
      role: 'user',
      currentPlanKey: 'free',
      lastLogin: new Date(),
    } as Partial<IUser>);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.updateById(userId, { lastLogin: new Date() } as any);
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.model.findById(userId).select('+password');
    if (!user || !user.password) return false;
    return user.comparePassword(password);
  }

  /**
   * Update user's subscription
   */
  async updateSubscription(
    userId: string,
    subscription: Partial<IUser['subscription']>
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        subscription,
        currentPlanKey: subscription.planKey || 'free',
      },
    } as any);
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    userId: string,
    field: 'cvJourneyCount' | 'cvCreatedCount' | 'journeysCreated' | 'exportCount' | 'atsCheckCount'
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $inc: { [`usage.${field}`]: 1 },
    } as any);
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(userId: string): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        'usage.cvJourneyCount': 0,
        'usage.cvCreatedCount': 0,
        'usage.journeysCreated': 0,
        'usage.exportCount': 0,
        'usage.atsCheckCount': 0,
        'usage.lastResetDate': new Date(),
      },
    } as any);
  }

  /**
   * Find users by subscription status
   */
  async findBySubscriptionStatus(
    status: 'active' | 'inactive' | 'cancelled' | 'expired'
  ): Promise<IUser[]> {
    return this.find(
      { 'subscription.status': status } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Find users by plan
   */
  async findByPlan(
    planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly'
  ): Promise<IUser[]> {
    return this.find(
      { currentPlanKey: planKey } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Find admin users
   */
  async findAdmins(): Promise<IUser[]> {
    return this.find(
      { role: { $in: ['admin', 'superadmin'] } } as FilterQuery<IUser>,
      { lean: true }
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profile: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      location?: string;
      website?: string;
      linkedin?: string;
      github?: string;
      summary?: string;
      company?: string;
      jobTitle?: string;
      industry?: string;
      experience?: 'entry' | 'mid' | 'senior' | 'executive';
    }
  ): Promise<IUser | null> {
    return this.updateById(userId, { $set: profile } as any);
  }

  /**
   * Grant grace period to user (admin function)
   */
  async grantGracePeriod(
    userId: string,
    gracePeriod: IUser['gracePeriod'],
    grantedBy: string
  ): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        gracePeriod: {
          ...gracePeriod,
          grantedBy,
          grantedAt: new Date(),
        },
      },
    } as any);
  }

  /**
   * Revoke grace period
   */
  async revokeGracePeriod(userId: string): Promise<IUser | null> {
    return this.updateById(userId, {
      $set: {
        'gracePeriod.isActive': false,
      },
    } as any);
  }
}

// Export singleton instance
export const userRepository = new UserRepository();