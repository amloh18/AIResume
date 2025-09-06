'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UserIcon from '@/components/ui/UserIcon';

interface PageHeaderProps {
  title: string;
  description: string;
  user: {
    name: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
  };
  showSettings?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  user, 
  showSettings = true 
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between py-6">
        {/* Title and Description */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-base text-gray-600 dark:text-white/60 mt-2">{description}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Bell size={18} />
          </button>
          {/* Theme Toggle */}
          <ThemeToggle variant="compact" />
          {/* Settings (hide on settings page) */}
          {showSettings && (
            <button onClick={() => router.push('/dashboard/settings')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Settings size={18} />
            </button>
          )}
          {/* User Profile */}
          <div className="pl-2 ml-1">
            <UserIcon user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
