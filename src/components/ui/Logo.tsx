import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className={`font-black font-sans ${sizeClasses[size]} ${className}`} style={{ fontWeight: 900 }}>
      <span className="text-lime-400">CV</span><span className="text-gray-600 dark:text-gray-300">Circle.io</span>
    </div>
  );
};

export default Logo;
