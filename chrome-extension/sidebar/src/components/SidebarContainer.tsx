import React from 'react';
import { X } from 'lucide-react';
import ExtensionIcon from './ExtensionIcon';

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
    <div className="extension-sidebar dark bg-dark-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-dark-card">
        <ExtensionIcon size="md" iconFile="icon48" />
        <button
          onClick={handleClose}
          className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
          aria-label="Close sidebar"
        >
          <X size={20} className="text-white/70" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default SidebarContainer;

