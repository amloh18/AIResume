import mongoose from 'mongoose';
import User from '@/models/User';
import AdminUser from '@/models/admin/AdminUser';
import connectDB from '@/lib/database';
import { getAdminConnection } from '@/lib/admin-database-connection';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  newUsers: number;
  updatedUsers: number;
  errors: string[];
}

/**
 * Syncs users from cvcircle.users to cvcircle_admin.users
 * This function extracts essential user data for campaign targeting
 */
export async function syncUsersToAdmin(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    syncedCount: 0,
    newUsers: 0,
    updatedUsers: 0,
    errors: [],
  };

  try {
    console.log('🔄 Starting user sync from cvcircle to cvcircle_admin...');

    // Connect to both databases
    await connectDB(); // Main database
    const adminConnection = await getAdminConnection(); // Admin database

    if (!adminConnection) {
      throw new Error('Failed to connect to admin database');
    }

    // Get AdminUser model from admin connection
    const AdminUserModel = adminConnection.models.AdminUser || 
      adminConnection.model('AdminUser', AdminUser.schema);

    // Fetch all users from main database
    const users = await User.find({}).lean();
    console.log(`📊 Found ${users.length} users in main database`);

    for (const user of users) {
      try {
        // Check if user already exists in admin database
        const existingAdminUser = await AdminUserModel.findOne({
          mainUserId: user._id,
        });

        // Prepare admin user data
        const adminUserData = {
          mainUserId: user._id,
          email: user.email,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || 'User',
          authProvider: user.authProvider || 'credentials',
          isEmailVerified: user.isEmailVerified || false,
          currentPlanKey: user.currentPlanKey || 'free',
          subscriptionStatus: user.subscription?.status || 'inactive',
          subscriptionStartDate: user.subscription?.startDate,
          subscriptionEndDate: user.subscription?.endDate,
          usage: {
            cvJourneyCount: user.usage?.cvJourneyCount || 0,
            cvCreatedCount: user.usage?.cvCreatedCount || 0,
            journeysCreated: user.usage?.journeysCreated || 0,
            exportCount: user.usage?.exportCount || 0,
            atsCheckCount: user.usage?.atsCheckCount || 0,
          },
          lastActiveAt: user.lastActiveAt,
          registrationDate: user.createdAt || new Date(),
          isDeleted: user.isDeleted || false,
          deletedAt: user.deletedAt,
          lastSyncedAt: new Date(),
        };

        if (existingAdminUser) {
          // Update existing user
          await AdminUserModel.findByIdAndUpdate(
            existingAdminUser._id,
            {
              ...adminUserData,
              syncVersion: (existingAdminUser.syncVersion || 0) + 1,
              // Preserve campaign tracking data
              emailCampaigns: existingAdminUser.emailCampaigns,
            },
            { new: true }
          );
          result.updatedUsers++;
        } else {
          // Create new admin user
          await AdminUserModel.create({
            ...adminUserData,
            emailCampaigns: {
              received: 0,
              opened: 0,
              clicked: 0,
              unsubscribed: false,
            },
          });
          result.newUsers++;
        }

        result.syncedCount++;
      } catch (error: any) {
        console.error(`❌ Error syncing user ${user.email}:`, error.message);
        result.errors.push(`User ${user.email}: ${error.message}`);
      }
    }

    console.log(`✅ User sync completed:
      - Total synced: ${result.syncedCount}
      - New users: ${result.newUsers}
      - Updated users: ${result.updatedUsers}
      - Errors: ${result.errors.length}
    `);

    result.success = true;
    return result;

  } catch (error: any) {
    console.error('❌ User sync failed:', error);
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Sync a single user to admin database
 */
export async function syncSingleUser(userId: string): Promise<boolean> {
  try {
    await connectDB();
    const adminConnection = await getAdminConnection();

    if (!adminConnection) {
      throw new Error('Failed to connect to admin database');
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    const AdminUserModel = adminConnection.models.AdminUser || 
      adminConnection.model('AdminUser', AdminUser.schema);

    const adminUserData = {
      mainUserId: user._id,
      email: user.email,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      authProvider: user.authProvider || 'credentials',
      isEmailVerified: user.isEmailVerified || false,
      currentPlanKey: user.currentPlanKey || 'free',
      subscriptionStatus: user.subscription?.status || 'inactive',
      subscriptionStartDate: user.subscription?.startDate,
      subscriptionEndDate: user.subscription?.endDate,
      usage: {
        cvJourneyCount: user.usage?.cvJourneyCount || 0,
        cvCreatedCount: user.usage?.cvCreatedCount || 0,
        journeysCreated: user.usage?.journeysCreated || 0,
        exportCount: user.usage?.exportCount || 0,
        atsCheckCount: user.usage?.atsCheckCount || 0,
      },
      lastActiveAt: user.lastActiveAt,
      registrationDate: user.createdAt || new Date(),
      isDeleted: user.isDeleted || false,
      deletedAt: user.deletedAt,
      lastSyncedAt: new Date(),
    };

    const existingUser = await AdminUserModel.findOne({ mainUserId: user._id });

    if (existingUser) {
      await AdminUserModel.findByIdAndUpdate(existingUser._id, {
        ...adminUserData,
        syncVersion: (existingUser.syncVersion || 0) + 1,
        emailCampaigns: existingUser.emailCampaigns,
      });
    } else {
      await AdminUserModel.create({
        ...adminUserData,
        emailCampaigns: {
          received: 0,
          opened: 0,
          clicked: 0,
          unsubscribed: false,
        },
      });
    }

    return true;
  } catch (error: any) {
    console.error('❌ Single user sync failed:', error);
    return false;
  }
}

/**
 * Get targeted users based on campaign filters
 */
export async function getTargetedUsers(filters: any): Promise<any[]> {
  try {
    // Skip during build time to avoid database connection issues
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('⚠️ getTargetedUsers: Skipping during build time');
      return [];
    }

    // Add safety check for filters
    if (!filters || typeof filters !== 'object') {
      console.warn('⚠️ getTargetedUsers: Invalid filters provided, returning empty array');
      return [];
    }

    const adminConnection = await getAdminConnection();
    if (!adminConnection) {
      throw new Error('Failed to connect to admin database');
    }

    const AdminUserModel = adminConnection.models.AdminUser || 
      adminConnection.model('AdminUser', AdminUser.schema);

    const query: any = {
      'emailCampaigns.unsubscribed': false, // Never target unsubscribed users
    };

    // Apply membership plan filter
    if (filters.membershipPlans && Array.isArray(filters.membershipPlans) && filters.membershipPlans.length > 0) {
      query.currentPlanKey = { $in: filters.membershipPlans };
    }

    // Apply user age filter (new users)
    if (filters.userAge && typeof filters.userAge === 'object') {
      const now = new Date();
      if (filters.userAge.type === 'new_users' && typeof filters.userAge.days === 'number') {
        const daysAgo = new Date(now.getTime() - filters.userAge.days * 24 * 60 * 60 * 1000);
        query.registrationDate = { $gte: daysAgo };
      } else if (filters.userAge.type === 'existing_users' && typeof filters.userAge.days === 'number') {
        const daysAgo = new Date(now.getTime() - filters.userAge.days * 24 * 60 * 60 * 1000);
        query.registrationDate = { $lt: daysAgo };
      }
    }

    // Apply registration date range
    if (filters.registrationDateRange) {
      query.registrationDate = {};
      if (filters.registrationDateRange.startDate) {
        query.registrationDate.$gte = new Date(filters.registrationDateRange.startDate);
      }
      if (filters.registrationDateRange.endDate) {
        query.registrationDate.$lte = new Date(filters.registrationDateRange.endDate);
      }
    }

    // Apply last active range
    if (filters.lastActiveRange) {
      query.lastActiveAt = {};
      if (filters.lastActiveRange.startDate) {
        query.lastActiveAt.$gte = new Date(filters.lastActiveRange.startDate);
      }
      if (filters.lastActiveRange.endDate) {
        query.lastActiveAt.$lte = new Date(filters.lastActiveRange.endDate);
      }
    }

    // Apply usage metrics
    if (filters.usageMetrics) {
      if (filters.usageMetrics.minCVsCreated !== undefined) {
        query['usage.cvCreatedCount'] = { $gte: filters.usageMetrics.minCVsCreated };
      }
      if (filters.usageMetrics.maxCVsCreated !== undefined) {
        query['usage.cvCreatedCount'] = { 
          ...query['usage.cvCreatedCount'],
          $lte: filters.usageMetrics.maxCVsCreated 
        };
      }
      if (filters.usageMetrics.minJourneysCompleted !== undefined) {
        query['usage.journeysCreated'] = { $gte: filters.usageMetrics.minJourneysCompleted };
      }
      if (filters.usageMetrics.maxJourneysCompleted !== undefined) {
        query['usage.journeysCreated'] = {
          ...query['usage.journeysCreated'],
          $lte: filters.usageMetrics.maxJourneysCompleted
        };
      }
    }

    // Apply email verified filter
    if (filters.emailVerified !== undefined) {
      query.isEmailVerified = filters.emailVerified;
    }

    // Apply deleted users filter
    if (filters.isDeleted !== undefined) {
      query.isDeleted = filters.isDeleted;
    }

    const users = await AdminUserModel.find(query).lean();
    return users;

  } catch (error: any) {
    console.error('❌ Get targeted users failed:', error);
    return [];
  }
}

