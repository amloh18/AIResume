'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getMongoDBUserId } from '@/lib/utils/userIdUtils';

export const useCVSetup = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasCV, setHasCV] = useState(false);
  const hasCheckedRef = useRef(false); // Prevent multiple checks
  const isCheckingRef = useRef(false); // Prevent concurrent checks

  const getUserIdFromLocalStorage = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id;
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
    return null;
  };

  useEffect(() => {
    const checkUserCV = async () => {
      // Prevent multiple simultaneous checks
      if (isCheckingRef.current || hasCheckedRef.current) {
        console.log('🔍 useCVSetup - Skipping check (already checking or checked)');
        return;
      }

      if (status === 'loading') {
        console.log('🔍 useCVSetup - Session still loading');
        return;
      }
      
      // Check for custom session if NextAuth session is not available
      const customSession = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
      const isCustomAuthenticated = !!customSession;
      const isAuthenticated = status === 'authenticated' || isCustomAuthenticated;
      
      console.log('🔍 useCVSetup - Authentication check', { 
        nextAuthStatus: status, 
        isCustomAuthenticated, 
        isAuthenticated 
      });
      
      if (!isAuthenticated) {
        console.log('🔍 useCVSetup - User not authenticated');
        setIsChecking(false);
        hasCheckedRef.current = true;
        return;
      }

      // Check if user just completed onboarding first (before API call)
      if (typeof window !== 'undefined') {
        const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
        if (fromOnboarding) {
          console.log('🎉 useCVSetup - User just completed onboarding, trusting CV exists');
          setHasCV(true);
          setIsChecking(false);
          hasCheckedRef.current = true;
          // Clear the flag after using it
          sessionStorage.removeItem('fromOnboarding');
          return;
        }
      }

      isCheckingRef.current = true;

      try {
        // Get MongoDB user ID (handles both MongoDB ObjectId and Google OAuth ID)
        const userId = await getMongoDBUserId();
        console.log('🔍 useCVSetup - Session user ID:', session?.user?.id);
        console.log('🔍 useCVSetup - Final MongoDB user ID:', userId);
        console.log('🔍 useCVSetup - Session status:', status);
        
        if (userId) {
          console.log('🔍 useCVSetup - Making API call to:', `/api/cvs?userId=${userId}&projection=full`);
          const response = await fetch(`/api/cvs?userId=${userId}&projection=full`);
          console.log('🔍 useCVSetup - CV API response status:', response.status);
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('🔍 useCVSetup - Response content type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
              const textResponse = await response.text();
              console.error('❌ useCVSetup - Non-JSON response received:', textResponse.substring(0, 500));
              setHasCV(false);
              return;
            }
            
            const data = await response.json();
            console.log('🔍 useCVSetup - CV API response data:', data);
            
            // Ensure we have the correct data structure
            if (!data.success) {
              console.error('❌ useCVSetup - API returned success: false');
              setHasCV(false);
              return;
            }
            
            const userCVs = data.data?.cvs || [];
            console.log('🔍 useCVSetup - User CVs found:', userCVs.length);
            
            // Check if user has any master CVs
            // Handle both old format (isMaster at root) and new format (metadata.isMaster)
            const hasMasterCV = userCVs.some((cv: any) => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            });
            console.log('🔍 useCVSetup - User has master CV:', hasMasterCV);
            
            // Set hasCV based on master CV existence
            setHasCV(hasMasterCV);
            
            // If user has master CV, clear any onboarding flags
            if (hasMasterCV && typeof window !== 'undefined') {
              console.log('✅ User has master CV, clearing onboarding flags');
              sessionStorage.removeItem('fromOnboarding');
              sessionStorage.removeItem('needsCVSetup');
            }
            
            console.log('🔍 useCVSetup - Final hasCV state:', hasMasterCV);
          } else {
            console.error('❌ useCVSetup - API call failed:', response.status);
            setHasCV(false);
          }
        } else {
          console.log('❌ useCVSetup - No valid user ID found');
          setHasCV(false);
        }
      } catch (error) {
        console.error('Error checking user CVs:', error);
        // If there's an error, assume no CVs to be safe
        setHasCV(false);
      } finally {
        setIsChecking(false);
        hasCheckedRef.current = true;
        isCheckingRef.current = false;
      }
    };

    checkUserCV();
  }, [session, status]); // Removed router from dependencies to prevent unnecessary re-runs

  // Reset check when session changes significantly
  useEffect(() => {
    if (status === 'loading') {
      hasCheckedRef.current = false;
      setIsChecking(true);
    }
  }, [status]);

  return { hasCV, isChecking };
};
