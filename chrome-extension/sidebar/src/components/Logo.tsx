import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showIcon = true,
  className = '' 
}) => {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-base' },
    md: { icon: 'w-8 h-8', text: 'text-lg' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <div className={`${currentSize.icon} rounded-lg bg-[#80FF00] flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <svg 
            width={size === 'sm' ? '16' : size === 'md' ? '20' : '28'} 
            height={size === 'sm' ? '16' : size === 'md' ? '20' : '28'} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shield with document - CVCircle logo design */}
            <path d="M12 2L8 4V6C8 7.1 8.9 8 10 8H14C15.1 8 16 7.1 16 6V4L12 2Z" fill="white" opacity="0.95"/>
            <rect x="6" y="6" width="12" height="14" rx="2" fill="white" opacity="0.98"/>
            {/* Document lines */}
            <line x1="9" y1="10" x2="15" y2="10" stroke="#1a230f" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="13" x2="15" y2="13" stroke="#1a230f" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="16" x2="13" y2="16" stroke="#1a230f" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Folded corner */}
            <path d="M16 6L18 8H16V6Z" fill="white" opacity="0.9"/>
            <line x1="16" y1="6" x2="18" y2="8" stroke="#1a230f" strokeWidth="1" opacity="0.3"/>
          </svg>
        </div>
      )}
      <span className={`${currentSize.text} font-bold`}>
        <span className="text-[#80FF00]">CV</span>
        <span className="text-gray-900 dark:text-white">Circle</span>
      </span>
    </div>
  );
};

export default Logo;

