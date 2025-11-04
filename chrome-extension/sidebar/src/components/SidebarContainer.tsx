import React from 'react';
import { X } from 'lucide-react';

interface SidebarContainerProps {
  children: React.ReactNode;
}

const SidebarContainer: React.FC<SidebarContainerProps> = ({ children }) => {
  const handleClose = () => {
    // Send message to content script to hide sidebar
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'EXTENSION_SIDEBAR_CLOSE' }, '*');
    }
  };

  return (
    <div className="extension-sidebar dark:bg-dark-bg bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            <span className="text-lime-500">CV</span>
            <span className="text-gray-900 dark:text-white">CIRCLE</span>
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close sidebar"
        >
          <X size={20} className="text-gray-600 dark:text-white/60" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default SidebarContainer;

