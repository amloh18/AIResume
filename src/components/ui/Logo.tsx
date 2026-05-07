import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBoth?: boolean; // Show both collapsed and expanded logos inline
}

const Logo = ({ className = '', size = 'md', showBoth = false }: LogoProps) => {
  const sizeMap = {
    sm: { img: 64 },
    md: { img: 88 },
    lg: { img: 128 }
  };

  if (showBoth) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Collapsed Logo */}
        <Image
          src="/images/logo_cvcircle.png"
          alt="CVCircle Logo"
          width={sizeMap[size].img}
          height={sizeMap[size].img}
          className="object-contain"
          priority
        />
        {/* Expanded Logo */}
        <Image
          src="/images/logo.png"
          alt="CVCircle Full Logo"
          width={sizeMap[size].img * 1.2}
          height={sizeMap[size].img}
          className="object-contain"
          priority
        />
      </div>
    );
  }

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
    </div>
  );
};

export default Logo;
