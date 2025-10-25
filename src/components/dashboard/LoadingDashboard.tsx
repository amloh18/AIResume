'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';

interface LoadingDashboardProps {
  message?: string;
}

const LoadingDashboard: React.FC<LoadingDashboardProps> = ({ 
  message = "Loading Dashboard..." 
}) => {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 mx-auto border-gray-700 border-t-[#99FF00]"></div>
        </div>

        {/* Main Message */}
        <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {message}
        </h2>

        {/* Additional Info */}
        <p className={`text-xs mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Preparing your personalized dashboard...
        </p>
      </div>
    </div>
  );
};

export default LoadingDashboard;