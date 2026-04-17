'use client';

import React from 'react';
import { Activity, X, User, FileText, Settings, Shield, Database, Mail, Bell, DollarSign } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user' | 'template' | 'system' | 'notification' | 'payment' | 'security' | 'database' | 'email';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  priority?: 'low' | 'medium' | 'high';
}

interface RecentActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({ 
  isOpen, 
  onClose, 
  activities, 
  loading, 
  error, 
  onRefresh 
}) => {
  const getActivityIcon = (type: string, icon: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      user: <User size={16} className="text-blue-500" />,
      template: <FileText size={16} className="text-green-500" />,
      system: <Settings size={16} className="text-purple-500" />,
      notification: <Bell size={16} className="text-yellow-500" />,
      payment: <DollarSign size={16} className="text-green-500" />,
      security: <Shield size={16} className="text-red-500" />,
      database: <Database size={16} className="text-orange-500" />,
      email: <Mail size={16} className="text-blue-500" />,
      file: <FileText size={16} className="text-green-500" />,
      briefcase: <Activity size={16} className="text-indigo-500" />,
      settings: <Settings size={16} className="text-purple-500" />,
      shield: <Shield size={16} className="text-red-500" />
    };
    
    return iconMap[icon] || iconMap[type] || <Activity size={16} className="text-gray-500" />;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-emerald-700';
      case 'error': return 'text-red-700';
      case 'warning': return 'text-amber-800';
      case 'info': return 'text-slate-700';
      default: return 'text-slate-600';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-[9999] flex flex-col"
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-emerald-700 mr-2" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        
        {/* Consolidated Notifications */}
        <div className="space-y-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">Live Updates</span>
              </div>
              <span className="text-xs text-slate-500">{activities.length} activities</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Real-time monitoring of system events, user actions, and application activities
            </p>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-emerald-700">System Health</span>
              </div>
              <span className="text-xs text-emerald-700">All systems operational</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Database, API, and services running normally with optimal performance
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 text-red-500 mx-auto mb-2">⚠️</div>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`border-l-4 ${getPriorityColor(activity.priority)} bg-white p-4 rounded-r-lg hover:bg-slate-50 transition-colors border border-slate-200/60`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type, activity.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.title}
                      </p>
                      <span className="text-xs text-slate-500 ml-2">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                    {activity.status && (
                      <div className="flex items-center mt-2">
                        <span className={`text-xs ${getStatusColor(activity.status)}`}>
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {activities.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-700">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Activity className="h-4 w-4 mr-2" />
          Refresh Activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivityPanel;
