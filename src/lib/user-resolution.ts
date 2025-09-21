/**
 * User Resolution Utilities
 * 
 * Core utilities for resolving external authentication provider IDs
 * to internal MongoDB ObjectIds. This is the cornerstone of the new
 * relational architecture.
 */

import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models';

export interface UserResolution {
  success: boolean;
  mongoUserId?: mongoose.Types.ObjectId;
  authProviderId?: string;
  authProvider?: string;
  error?: string;
}

export interface AuthContext {
  mongoUserId: mongoose.Types.ObjectId;
  authProviderId: string;
  authProvider: string;
  email: string;
}

/**
 * Core function: Resolve authProviderId to MongoDB ObjectId
 * This is the single source of truth for user identification
 */
export async function resolveUserFromAuthProvider(
  authProviderId: string,
  authProvider: string = 'firebase'
): Promise<UserResolution> {
  try {
    if (!authProviderId) {
      return {
        success: false,
        error: 'Auth provider ID is required'
      };
    }

    // Find user by authProviderId
    const user = await User.findOne({ 
      authProviderId,
      authProvider 
    }).lean();

    if (!user) {
      return {
        success: false,
        error: 'User not found in database'
      };
    }

    return {
      success: true,
      mongoUserId: user._id,
      authProviderId: user.authProviderId,
      authProvider: user.authProvider
    };
  } catch (error) {
    console.error('Error resolving user from auth provider:', error);
    return {
      success: false,
      error: 'Database error during user resolution'
    };
  }
}

/**
 * Extract auth context from NextAuth session
 */
export async function getAuthContextFromSession(request?: NextRequest): Promise<AuthContext | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    // Extract the auth provider ID from the session
    // This will depend on your NextAuth configuration
    let authProviderId: string;
    let authProvider: string;

    // Firebase users
    if (session.user.id && session.user.id.length > 20) {
      authProviderId = session.user.id;
      authProvider = 'firebase';
    }
    // Google OAuth users
    else if (session.user.email && !session.user.id) {
      authProviderId = session.user.email;
      authProvider = 'google';
    }
    // NextAuth users
    else {
      authProviderId = session.user.id || session.user.email;
      authProvider = 'nextauth';
    }

    // Resolve to MongoDB ObjectId
    const resolution = await resolveUserFromAuthProvider(authProviderId, authProvider);
    
    if (!resolution.success || !resolution.mongoUserId) {
      return null;
    }

    return {
      mongoUserId: resolution.mongoUserId,
      authProviderId: resolution.authProviderId!,
      authProvider: resolution.authProvider!,
      email: session.user.email
    };
  } catch (error) {
    console.error('Error getting auth context from session:', error);
    return null;
  }
}

/**
 * Create or update user from authentication session
 * Used during login/registration
 */
export async function createOrUpdateUserFromAuth(
  authProviderId: string,
  authProvider: string,
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }
): Promise<UserResolution> {
  try {
    // Check if user already exists
    let user = await User.findOne({ authProviderId, authProvider });

    if (user) {
      // Update existing user
      user.email = userInfo.email;
      user.firstName = userInfo.firstName;
      user.lastName = userInfo.lastName;
      if (userInfo.avatar) {
        user.avatar = userInfo.avatar;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        authProviderId,
        authProvider,
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        avatar: userInfo.avatar,
        isEmailVerified: true, // Assume verified if from external provider
        lastLogin: new Date()
      });
      await user.save();
    }

    return {
      success: true,
      mongoUserId: user._id,
      authProviderId: user.authProviderId,
      authProvider: user.authProvider
    };
  } catch (error) {
    console.error('Error creating/updating user from auth:', error);
    return {
      success: false,
      error: 'Failed to create or update user'
    };
  }
}

/**
 * Middleware function to ensure authenticated context
 * Returns the MongoDB ObjectId for use in subsequent queries
 */
export async function requireAuthContext(request?: NextRequest): Promise<AuthContext> {
  const authContext = await getAuthContextFromSession(request);
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  return authContext;
}

/**
 * Validate that a user owns a resource
 */
export async function validateUserOwnership(
  resourceUserId: mongoose.Types.ObjectId | string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    // Convert to string for comparison
    const resourceUserIdStr = resourceUserId.toString();
    const authUserIdStr = authContext.mongoUserId.toString();
    
    return resourceUserIdStr === authUserIdStr;
  } catch (error) {
    console.error('Error validating user ownership:', error);
    return false;
  }
}

/**
 * Legacy support: Migrate old firebaseUid references
 * This helps during the transition period
 */
export async function migrateFirebaseUidToUserId(firebaseUid: string): Promise<mongoose.Types.ObjectId | null> {
  try {
    const user = await User.findOne({ 
      authProviderId: firebaseUid,
      authProvider: 'firebase'
    }).lean();
    
    return user?._id || null;
  } catch (error) {
    console.error('Error migrating Firebase UID:', error);
    return null;
  }
}

/**
 * Utility to get user's MongoDB ObjectId from various ID formats
 * Supports both new and legacy ID formats during transition
 */
export async function resolveUserIdFromMixed(
  userId: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  try {
    // If it's already an ObjectId, return it
    if (mongoose.Types.ObjectId.isValid(userId)) {
      return new mongoose.Types.ObjectId(userId);
    }
    
    // If it's a string, try to resolve from authProviderId
    const userIdStr = userId.toString();
    
    // First try Firebase UID format
    if (userIdStr.length > 20 && !userIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      return await migrateFirebaseUidToUserId(userIdStr);
    }
    
    // Try as email
    if (userIdStr.includes('@')) {
      const user = await User.findOne({ 
        authProviderId: userIdStr,
        authProvider: 'google'
      }).lean();
      return user?._id || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving mixed user ID:', error);
    return null;
  }
}
