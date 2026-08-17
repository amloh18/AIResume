import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeMap = {
    xs: { img: 36 },
    sm: { img: 64 },
    md: { img: 88 },
    lg: { img: 132 }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative">
        <Image
          src="/images/logo.png"
          alt="CVCircle Logo"
          width={sizeMap[size].img}
          height={sizeMap[size].img}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </div>
    </div>
  );
};

export default Logo;
