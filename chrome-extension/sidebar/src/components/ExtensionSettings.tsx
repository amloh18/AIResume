import React, { useState } from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useExtensionAuth } from '../hooks/useExtensionAuth';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

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
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="flex-1 p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => navigate('/extension/dashboard')}
            className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-lime-500" />
          </button>
        </div>

        {user && (
          <div className="p-4 border border-white/10 rounded-lg bg-dark-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center text-white font-semibold">
                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">
                  {user.name || 'User'}
                </p>
                <p className="text-sm text-white/70">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              Account
            </h3>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 border border-red-800 hover:bg-red-900/20 text-red-400 font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              Extension
            </h3>
            <p className="text-sm text-white/70">
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ExtensionSettings;

