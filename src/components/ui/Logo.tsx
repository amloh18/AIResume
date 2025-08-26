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
    <div className={`font-extrabold font-sans ${sizeClasses[size]} ${className}`}>
      <span className="text-lime-400">CV</span>
      <span className="text-gray-600">CIRCLE</span>
    </div>
  );
};

export default Logo;
