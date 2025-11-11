'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  avatar?: string;
  role?: string;
  isEmailVerified?: boolean;
  authProvider?: string;
  currentPlanKey?: string;
  subscription?: {
    planName: string;
    planKey?: string;
    status: string;
    credits: number;
    endDate?: string;
  };
  settings?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseUserDataReturn {
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Standardized hook for fetching user data from the database
 * This ensures all dashboard pages use the same user data source
 */
export function useUserData(): UseUserDataReturn {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 useUserData - Fetching user data for:', session.user.email);

      // Use the standardized /api/user endpoint
      const response = await fetch('/api/user');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('User data response is not JSON. Content-Type:', contentType);
        throw new Error('Invalid response format from server');
      }

      const result = await response.json();

      if (result.success && result.user) {
        console.log('✅ useUserData - User data fetched successfully:', result.user);
        setUserData(result.user);
      } else {
        throw new Error(result.error || 'Failed to fetch user data');
      }
    } catch (err: any) {
      console.error('❌ useUserData - Error fetching user data:', err);
      setError(err.message || 'Failed to fetch user data');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Fetch user data when session is available
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (status === 'unauthenticated') {
      setLoading(false);
      setUserData(null);
      return;
    }

    if (session?.user?.email) {
      fetchUserData();
    }
  }, [session?.user?.email, status, fetchUserData]);

  // Listen for user profile updates from other components
  useEffect(() => {
    const handleUserProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail.user;
      const refreshUserData = event.detail.refreshUserData;
      
      if (refreshUserData) {
        console.log('🔄 useUserData - Refreshing user data due to profile update');
        fetchUserData();
      } else if (updatedUser) {
        console.log('🔄 useUserData - Received user profile update:', updatedUser);
        setUserData(prev => ({
          ...prev,
          ...updatedUser,
          // Ensure we have the correct structure
          id: updatedUser.id || prev?.id,
          firstName: updatedUser.firstName || prev?.firstName,
          lastName: updatedUser.lastName || prev?.lastName,
          email: updatedUser.email || prev?.email,
          username: updatedUser.username || prev?.username,
          avatar: updatedUser.avatar || updatedUser.profilePhoto || prev?.avatar,
        }));
      }
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, []);

  return {
    userData,
    loading,
    error,
    refetch: fetchUserData
  };
}

/**
 * Helper function to get display name from user data
 */
export function getUserDisplayName(userData: UserData | null): string {
  if (!userData) return 'User';
  
  if (userData.firstName && userData.lastName) {
    return `${userData.firstName} ${userData.lastName}`;
  }
  
  if (userData.firstName) {
    return userData.firstName;
  }
  
  if (userData.username) {
    return userData.username;
  }
  
  return 'User';
}

/**
 * Helper function to get user email
 */
export function getUserEmail(userData: UserData | null): string {
  return userData?.email || '';
}

/**
 * Helper function to get user avatar
 */
export function getUserAvatar(userData: UserData | null): string {
  return userData?.avatar || '';
}
