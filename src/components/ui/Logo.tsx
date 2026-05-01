import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeMap = {
    sm: { img: 64 },
    md: { img: 88 },
    lg: { img: 128 }
  };

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
