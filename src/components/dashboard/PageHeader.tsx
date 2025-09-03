'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  description: string;
  user: {
    name: string;
    email: string;
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
    <div className="sticky top-0 z-30 -mt-2 xl:-mt-0 mb-6 bg-gradient-to-br from-black/70 via-gray-900/70 to-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40 rounded-xl border border-white/10">
      <div className="flex items-center justify-between py-4 px-4">
        {/* Title and Description */}
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
            <Bell size={18} />
          </button>
          {/* Theme Toggle */}
          <button aria-label="Toggle Theme" onClick={toggleTheme} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* Settings (hide on settings page) */}
          {showSettings && (
            <button onClick={() => router.push('/dashboard/settings')} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
              <Settings size={18} />
            </button>
          )}
          {/* Profile compact */}
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-white/10">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black text-xs font-bold">
              {(user.name || 'U').slice(0,1).toUpperCase()}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm text-white">{user.name}</div>
              <div className="text-xs text-white/50">{user.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
