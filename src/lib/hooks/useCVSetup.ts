import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

      const userId = session?.user?.id || getUserIdFromLocalStorage();
      console.log('🔍 useCVSetup - Session user ID:', session?.user?.id);
      console.log('🔍 useCVSetup - LocalStorage user ID:', getUserIdFromLocalStorage());
      console.log('🔍 useCVSetup - Final user ID:', userId);
      
      if (userId) {
        try {
          const response = await fetch(`/api/cvs?userId=${userId}`);
          console.log('🔍 useCVSetup - CV API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🔍 useCVSetup - CV API response data:', data);
            const userCVs = data.data?.cvs || data.data?.data || data.cvs || [];
            console.log('🔍 useCVSetup - User CVs found:', userCVs.length);
            console.log('🔍 useCVSetup - Data structure keys:', Object.keys(data.data || {}));
            setHasCV(userCVs.length > 0);
            
            // Check if user just completed onboarding
            const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
            const needsCVSetup = sessionStorage.getItem('needsCVSetup') === 'true';
            
            // If user just completed onboarding, don't redirect back
            if (fromOnboarding) {
              console.log('🎉 User completed onboarding, staying on dashboard');
              sessionStorage.removeItem('fromOnboarding');
              sessionStorage.removeItem('needsCVSetup');
              setHasCV(true); // Trust that CV was created
              return;
            }
            
            // If user has no CVs and is on dashboard, redirect to onboarding
            if ((userCVs.length === 0 || needsCVSetup) && window.location.pathname === '/dashboard') {
              console.log('🔄 No CVs found, redirecting to onboarding');
              sessionStorage.removeItem('needsCVSetup'); // Clear the flag
              router.push('/onboarding');
            }
          }
        } catch (error) {
          console.error('Error checking user CVs:', error);
        }
      }
      
      setIsChecking(false);
    };

    checkUserCV();
  }, [session, status, router]);

  return { hasCV, isChecking };
};
