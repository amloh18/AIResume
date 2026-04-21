import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

const Logo = ({ className = '', size = 'md', showText = true, theme = 'auto' }: LogoProps) => {
  const sizeMap = {
    sm: { img: 24, text: 'text-lg' },
    md: { img: 32, text: 'text-2xl' },
    lg: { img: 48, text: 'text-4xl' }
  };

  const textColor = theme === 'light' 
    ? 'text-gray-900' 
    : theme === 'dark' 
      ? 'text-white' 
      : 'text-gray-900 dark:text-white';

  const cvColor = theme === 'light'
    ? 'text-[#81ff00]'
    : theme === 'dark'
      ? 'text-[#81ff00]'
      : 'text-[#81ff00] dark:text-[#81ff00]';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logo.png"
        alt="CVCircle Logo"
        width={sizeMap[size].img}
        height={sizeMap[size].img}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={`font-bold flex items-center leading-none ${sizeMap[size].text}`} style={{ letterSpacing: '-0.5px' }}>
          <span className={cvColor}>CV</span><span className={textColor}>Circle</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
