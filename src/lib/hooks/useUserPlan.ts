import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserPlan, hasAIAccess, hasSpecificAIAccess } from '@/lib/utils/userPlanUtils';

export function useUserPlan() {
  const { data: session } = useSession();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user data including plan information
        const response = await fetch('/api/user');
        const data = await response.json();

        if (data.success && data.user) {
          const plan: UserPlan = {
            currentPlanKey: data.user.currentPlanKey || 'free',
            subscription: data.user.subscription
          };
          setUserPlan(plan);
        } else {
          // Default to free plan if no data
          setUserPlan({
            currentPlanKey: 'free',
            subscription: {
              planKey: 'free',
              status: 'active'
            }
          });
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
        setError('Failed to load user plan');
        // Default to free plan on error
        setUserPlan({
          currentPlanKey: 'free',
          subscription: {
            planKey: 'free',
            status: 'active'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, [session?.user?.email]);

  const hasAI = hasAIAccess(userPlan);
  const hasBasicAI = hasSpecificAIAccess(userPlan, 'basic');
  const hasAdvancedAI = hasSpecificAIAccess(userPlan, 'advanced');

  return {
    userPlan,
    loading,
    error,
    hasAI,
    hasBasicAI,
    hasAdvancedAI,
    refetch: () => {
      setLoading(true);
      // Trigger refetch by updating session dependency
    }
  };
}
