'use client';

import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-32 h-32'
};

const iconSizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 48
};

/**
 * UserAvatar Component
 * Displays user avatar with fallback to generated avatar or icon
 * 
 * @param src - Image source URL
 * @param name - User's name (used for fallback avatar generation)
 * @param alt - Alt text for image
 * @param size - Avatar size (xs, sm, md, lg, xl)
 * @param className - Additional CSS classes
 * @param showFallback - Whether to show fallback icon when no image
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  alt,
  size = 'md',
  className = '',
  showFallback = true
}) => {
  const sizeClass = sizeMap[size];
  const iconSize = iconSizeMap[size];
  
  // Generate fallback avatar URL using ui-avatars.com
  const fallbackAvatar = name 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=84cc16&color=fff&size=128`
    : null;
  
  const avatarSrc = src || fallbackAvatar;
  const altText = alt || name || 'User avatar';

  return (
    <div 
      className={`${sizeClass} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center ${className}`}
      title={altText}
    >
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt={altText}
          width={128}
          height={128}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : showFallback ? (
        <User size={iconSize} className="text-gray-500 dark:text-gray-300" />
      ) : null}
    </div>
  );
};

export default UserAvatar;
