import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getMongoDBUserId } from '@/lib/utils/userIdUtils';

export const useCVSetup = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasCV, setHasCV] = useState(false);

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
      if (status === 'loading') return;
      
      if (status === 'unauthenticated') {
        setIsChecking(false);
        return;
      }

      // Get MongoDB user ID (handles both MongoDB ObjectId and Google OAuth ID)
      const userId = await getMongoDBUserId();
      console.log('🔍 useCVSetup - Session user ID:', session?.user?.id);
      console.log('🔍 useCVSetup - Final MongoDB user ID:', userId);
      console.log('🔍 useCVSetup - Session status:', status);
      console.log('🔍 useCVSetup - Session data:', session);
      
      if (userId) {
        
        try {
          console.log('🔍 useCVSetup - Making API call to:', `/api/cvs?userId=${userId}`);
          const response = await fetch(`/api/cvs?userId=${userId}`);
          console.log('🔍 useCVSetup - CV API response status:', response.status);
          console.log('🔍 useCVSetup - CV API response headers:', Object.fromEntries(response.headers.entries()));
          
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
            console.log('🔍 useCVSetup - Data structure keys:', Object.keys(data.data || {}));
            console.log('🔍 useCVSetup - Full API response:', JSON.stringify(data, null, 2));
            console.log('🔍 useCVSetup - userCVs array:', userCVs);
            setHasCV(userCVs.length > 0);
            
            // If user has CVs, clear any onboarding flags
            if (userCVs.length > 0) {
              console.log('✅ User has CVs, clearing onboarding flags');
              sessionStorage.removeItem('fromOnboarding');
              sessionStorage.removeItem('needsCVSetup');
            }
            
            // Check if user just completed onboarding
            const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
            const needsCVSetup = sessionStorage.getItem('needsCVSetup') === 'true';
            
            console.log('🔍 useCVSetup - fromOnboarding flag:', fromOnboarding);
            console.log('🔍 useCVSetup - needsCVSetup flag:', needsCVSetup);
            console.log('🔍 useCVSetup - current pathname:', window.location.pathname);
            
            // If user just completed onboarding, don't redirect back
            if (fromOnboarding) {
              console.log('🎉 User completed onboarding, staying on dashboard');
              console.log('🎉 Setting hasCV to true and skipping CV check');
              setHasCV(true); // Trust that CV was created
              setIsChecking(false);
              return;
            }
            
            // If user has no CVs and is on dashboard, redirect to onboarding
            if ((userCVs.length === 0 || needsCVSetup) && window.location.pathname === '/dashboard') {
              console.log('🔄 No CVs found, redirecting to onboarding');
              console.log('🔄 userCVs.length:', userCVs.length);
              console.log('🔄 needsCVSetup:', needsCVSetup);
              sessionStorage.removeItem('needsCVSetup'); // Clear the flag
              router.push('/onboarding');
            }
          }
        } catch (error) {
          console.error('Error checking user CVs:', error);
          // If there's an error, assume no CVs for safety
          setHasCV(false);
        }
      }
      
      setIsChecking(false);
    };

    checkUserCV();
  }, [session, status, router]);

  return { hasCV, isChecking };
};
