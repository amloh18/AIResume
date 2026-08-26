import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  priority?: boolean;
}

const Logo = ({ className = '', size = 'md', priority = true }: LogoProps) => {
  const sizeMap = {
    xs: 36,
    sm: 48,
    md: 60,
    lg: 72
  };

  const dim = sizeMap[size] || 60;

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative flex items-center justify-center">
        <Image
          src="/images/logo.svg"
          alt="AIResume Logo"
          width={dim}
          height={dim}
          className="object-contain"
          style={{ width: `${dim}px`, height: `${dim}px` }}
          priority={priority}
        />
      </div>
    </div>
  );
};

export default Logo;
