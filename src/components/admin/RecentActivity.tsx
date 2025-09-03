'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  Settings, 
  Activity, 
  Clock,
  CheckCircle,
  Trash2,
  Save,
  AlertCircle,
  DollarSign,
  Shield,
  Database,
  Cloud,
  CreditCard,
  Mail,
  Bell
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user' | 'template' | 'system' | 'notification' | 'payment' | 'security' | 'database' | 'email';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  status?: 'success' | 'error' | 'warning' | 'info';
  priority?: 'low' | 'medium' | 'high';
}

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dynamic activity data
  const generateDynamicActivities = (): ActivityItem[] => {
    const activityTypes = [
      {
        type: 'user' as const,
        titles: ['New user registered', 'User profile updated', 'User subscription changed', 'User logged in'],
        descriptions: [
          'john.doe@example.com joined the platform',
          'User updated their profile information',
          'User upgraded to Premium plan',
          'User logged in from new device'
        ],
        icon: <User size={16} className="text-blue-500" />,
        status: 'success' as const
      },
      {
        type: 'template' as const,
        titles: ['Template created', 'Template updated', 'Template deleted', 'Template published'],
        descriptions: [
          'Modern Professional CV template was created',
          'Template settings were modified',
          'Old template was removed from system',
          'Template is now live for users'
        ],
        icon: <FileText size={16} className="text-green-500" />,
        status: 'success' as const
      },
      {
        type: 'payment' as const,
        titles: ['Payment received', 'Payment failed', 'Subscription renewed', 'Refund processed'],
        descriptions: [
          'Payment of $29.99 received successfully',
          'Payment processing failed - insufficient funds',
          'Monthly subscription automatically renewed',
          'Refund of $29.99 processed for user'
        ],
        icon: <DollarSign size={16} className="text-green-500" />,
        status: 'success' as const
      },
      {
        type: 'system' as const,
        titles: ['System maintenance', 'Backup completed', 'Performance optimization', 'Security scan'],
        descriptions: [
          'Scheduled system maintenance completed',
          'Database backup completed successfully',
          'System performance optimized',
          'Security vulnerability scan completed'
        ],
        icon: <Settings size={16} className="text-purple-500" />,
        status: 'success' as const
      },
      {
        type: 'security' as const,
        titles: ['Login attempt', 'Password reset', 'Account locked', 'Security alert'],
        descriptions: [
          'Failed login attempt from unknown IP',
          'Password reset requested by user',
          'Account temporarily locked due to suspicious activity',
          'Security alert: multiple failed login attempts'
        ],
        icon: <Shield size={16} className="text-red-500" />,
        status: 'warning' as const
      },
      {
        type: 'database' as const,
        titles: ['Database backup', 'Data migration', 'Index optimization', 'Connection restored'],
        descriptions: [
          'Automated database backup completed',
          'Data migration to new cluster successful',
          'Database indexes optimized for performance',
          'Database connection restored after maintenance'
        ],
        icon: <Database size={16} className="text-blue-500" />,
        status: 'success' as const
      },
      {
        type: 'email' as const,
        titles: ['Email sent', 'Email failed', 'Newsletter sent', 'Welcome email'],
        descriptions: [
          'Password reset email sent successfully',
          'Email delivery failed - invalid address',
          'Monthly newsletter sent to subscribers',
          'Welcome email sent to new user'
        ],
        icon: <Mail size={16} className="text-blue-500" />,
        status: 'success' as const
      }
    ];

    const timeIntervals = [
      '2 minutes ago', '5 minutes ago', '10 minutes ago', '15 minutes ago',
      '30 minutes ago', '1 hour ago', '2 hours ago', '3 hours ago',
      '6 hours ago', '12 hours ago', '1 day ago', '2 days ago'
    ];

    const generatedActivities: ActivityItem[] = [];
    
    // Generate 8-12 random activities
    const numActivities = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < numActivities; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const titleIndex = Math.floor(Math.random() * activityType.titles.length);
      const timeIndex = Math.floor(Math.random() * timeIntervals.length);
      
      // Add some variation to status
      let status = activityType.status;
      if (Math.random() < 0.1) { // 10% chance of error
        status = 'error';
      } else if (Math.random() < 0.2) { // 20% chance of warning
        status = 'warning';
      }

      generatedActivities.push({
        id: `activity-${i + 1}`,
        type: activityType.type,
        title: activityType.titles[titleIndex],
        description: activityType.descriptions[titleIndex],
        timestamp: timeIntervals[timeIndex],
        icon: activityType.icon,
        status: status,
        priority: Math.random() < 0.3 ? 'high' : Math.random() < 0.5 ? 'medium' : 'low'
      });
    }

    // Sort by time (most recent first)
    return generatedActivities.sort((a, b) => {
      const timeA = parseInt(a.timestamp.split(' ')[0]);
      const timeB = parseInt(b.timestamp.split(' ')[0]);
      return timeA - timeB;
    });
  };

  useEffect(() => {
    // Simulate loading and fetching data
    const loadActivities = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dynamicActivities = generateDynamicActivities();
      setActivities(dynamicActivities);
      setLoading(false);
    };

    loadActivities();

    // Refresh activities every 5 minutes
    const interval = setInterval(() => {
      const newActivities = generateDynamicActivities();
      setActivities(newActivities);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'info':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-gray-300 dark:border-l-gray-600';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-3 rounded-lg border-l-4 border-l-gray-300 dark:border-l-gray-600">
                <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded mt-1"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        <div className="flex items-center space-x-2">
          <Bell size={16} className="text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{activities.length} activities</span>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${getStatusColor(activity.status)}`}
          >
            <div className="flex-shrink-0 mt-1">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </p>
                {activity.priority && (
                  <span className={`text-xs font-medium ${getPriorityColor(activity.priority)}`}>
                    {activity.priority.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </p>
              <div className="flex items-center mt-1">
                <Clock size={12} className="text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <Activity size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity; 