import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Activity {
  id: string;
  type: string;
  action: string;
  title: string;
  timestamp: string;
  description: string;
  actionable?: boolean;
  actionText?: string;
  actionUrl?: string;
}

interface UseRecentActivityReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useRecentActivity = (limit: number = 5): UseRecentActivityReturn => {
  const { data: session, status } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to get activities from the analytics API
      const analyticsResponse = await fetch(`/api/analytics?userId=${session.user.id}`);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.success && analyticsData.data?.recentActivity) {
          setActivities(analyticsData.data.recentActivity.slice(0, limit));
          setLoading(false);
          return;
        }
      }

      // Fallback to the activity API
      const activityResponse = await fetch(`/api/activity?userId=${session.user.id}&limit=${limit}`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        if (activityData.success && activityData.data?.activities) {
          // Transform activity data to match our interface
          const transformedActivities = activityData.data.activities.map((activity: any) => ({
            id: activity.id || activity._id,
            type: activity.type,
            action: activity.description,
            title: activity.metadata?.title || activity.description,
            timestamp: activity.createdAt,
            description: activity.description,
            actionable: false,
            actionText: undefined,
            actionUrl: undefined
          }));
          setActivities(transformedActivities);
        } else {
          // If no real activities, show some default activities
          setActivities([
            {
              id: '1',
              type: 'cv',
              action: 'Created CV',
              title: 'Product Manager CV',
              timestamp: new Date().toISOString(),
              description: 'Created Product Manager CV',
              actionable: false,
              actionText: undefined,
              actionUrl: undefined
            },
            {
              id: '2',
              type: 'cv',
              action: 'Updated CV',
              title: 'Software Engineer CV',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              description: 'Updated Software Engineer CV',
              actionable: false,
              actionText: undefined,
              actionUrl: undefined
            },
            {
              id: '3',
              type: 'cv',
              action: 'Published CV',
              title: 'Designer CV',
              timestamp: new Date(Date.now() - 172800000).toISOString(),
              description: 'Published Designer CV',
              actionable: false,
              actionText: undefined,
              actionUrl: undefined
            }
          ]);
        }
      } else {
        throw new Error('Failed to fetch activities');
      }
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setError('Failed to load recent activities');
      // Show default activities on error
      setActivities([
        {
          id: '1',
          type: 'cv',
          action: 'Created CV',
          title: 'Product Manager CV',
          timestamp: new Date().toISOString(),
          description: 'Created Product Manager CV',
          actionable: false,
          actionText: undefined,
          actionUrl: undefined
        },
        {
          id: '2',
          type: 'cv',
          action: 'Updated CV',
          title: 'Software Engineer CV',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          description: 'Updated Software Engineer CV',
          actionable: false,
          actionText: undefined,
          actionUrl: undefined
        },
        {
          id: '3',
          type: 'cv',
          action: 'Published CV',
          title: 'Designer CV',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          description: 'Published Designer CV',
          actionable: false,
          actionText: undefined,
          actionUrl: undefined
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [session?.user?.id, limit]);

  const refetch = () => {
    fetchActivities();
  };

  return {
    activities,
    loading,
    error,
    refetch
  };
};
