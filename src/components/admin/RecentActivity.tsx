'use client';

import React from 'react';
import { 
  User, 
  FileText, 
  Settings, 
  Activity, 
  Clock,
  CheckCircle,
  Trash2,
  Save
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user' | 'template' | 'system' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  status?: 'success' | 'error' | 'warning';
}

const RecentActivity: React.FC = () => {
  // Mock data - in a real app, this would come from props or context
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'user',
      title: 'New user registered',
      description: 'john.doe@example.com joined the platform',
      timestamp: '2 minutes ago',
      icon: <User size={16} className="text-blue-500" />
    },
    {
      id: '2',
      type: 'template',
      title: 'Template created',
      description: 'Modern Professional CV template was created successfully',
      timestamp: '5 minutes ago',
      icon: <CheckCircle size={16} className="text-green-500" />,
      status: 'success'
    },
    {
      id: '3',
      type: 'template',
      title: 'Template deleted',
      description: 'Old CV template was removed from the system',
      timestamp: '10 minutes ago',
      icon: <Trash2 size={16} className="text-red-500" />,
      status: 'error'
    },
    {
      id: '4',
      type: 'template',
      title: 'Template updated',
      description: 'Professional template settings were modified',
      timestamp: '15 minutes ago',
      icon: <Save size={16} className="text-blue-500" />,
      status: 'success'
    },
    {
      id: '5',
      type: 'system',
      title: 'System maintenance',
      description: 'Database backup completed successfully',
      timestamp: '1 hour ago',
      icon: <Settings size={16} className="text-purple-500" />
    },
    {
      id: '6',
      type: 'user',
      title: 'User activity',
      description: 'User completed CV generation process',
      timestamp: '2 hours ago',
      icon: <Activity size={16} className="text-green-500" />
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      default:
        return 'border-l-gray-300 dark:border-l-gray-600';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 transition-colors ${getStatusColor(activity.status)}`}
          >
            <div className="flex-shrink-0 mt-1">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.title}
              </p>
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