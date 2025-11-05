import React, { useState, useEffect } from 'react';

interface ExtensionIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconFile?: 'icon16' | 'icon32' | 'icon48' | 'icon128';
}

const ExtensionIcon: React.FC<ExtensionIconProps> = ({ 
  size = 'md', 
  className = '',
  iconFile = 'icon32'
}) => {
  const [iconUrl, setIconUrl] = useState<string>('');
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const currentSize = sizeClasses[size];
  
  useEffect(() => {
    // Get icon URL from extension runtime
    const getIconUrl = () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          return chrome.runtime.getURL(`icons/${iconFile}.png`);
        }
      } catch (error) {
        console.error('Error getting extension icon URL:', error);
      }
      // Fallback - use a data URL or placeholder
      return '';
    };
    
    setIconUrl(getIconUrl());
  }, [iconFile]);

  if (!iconUrl) {
    // Fallback: show a simple colored square if icon can't be loaded
    return (
      <div className={`${currentSize} rounded-lg bg-[#80FF00] flex items-center justify-center ${className}`}>
        <span className="text-dark-bg font-bold text-xs">CV</span>
      </div>
    );
  }

  return (
    <img 
      src={iconUrl}
      alt="CVCircle"
      className={`${currentSize} ${className} object-contain`}
      onError={(e) => {
        // Fallback on error
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `${currentSize} rounded-lg bg-[#80FF00] flex items-center justify-center ${className}`;
        fallback.innerHTML = '<span class="text-dark-bg font-bold text-xs">CV</span>';
        target.parentNode?.replaceChild(fallback, target);
      }}
    />
  );
};

export default ExtensionIcon;

