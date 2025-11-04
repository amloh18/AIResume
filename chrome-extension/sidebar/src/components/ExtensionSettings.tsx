import React, { useState } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useExtensionAuth } from '../hooks/useExtensionAuth';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

const ExtensionSettings: React.FC = () => {
  const { user, logout } = useExtensionAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/extension/auth');
    setIsLoggingOut(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-lime-500" size={24} />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Settings
        </h2>
      </div>
      
      <div className="flex items-center justify-center py-4 border-b border-gray-200 dark:border-white/10">
        <Logo size="md" />
      </div>

      {user && (
        <div className="p-4 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-dark-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center text-white font-semibold">
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.name || 'User'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Account
          </h3>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Extension
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExtensionSettings;

