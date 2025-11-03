import React from 'react';

interface SkeletonLayoutProps {
  lines?: number;
  showChips?: boolean;
  showButton?: boolean;
  className?: string;
}

const SkeletonLayout: React.FC<SkeletonLayoutProps> = ({
  lines = 4,
  showChips = false,
  showButton = false,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Text lines skeleton */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 bg-gray-300 rounded animate-pulse"
            style={{
              width: index === lines - 1 ? '60%' : '100%'
            }}
          />
        ))}
      </div>

      {/* Chips skeleton */}
      {showChips && (
        <div className="flex flex-wrap gap-2 mt-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-6 bg-gray-300 rounded-full animate-pulse"
              style={{
                width: `${Math.floor(Math.random() * 60) + 40}px`
              }}
            />
          ))}
        </div>
      )}

      {/* Button skeleton */}
      {showButton && (
        <div className="mt-4">
          <div className="h-8 bg-gray-300 rounded animate-pulse w-32" />
        </div>
      )}
    </div>
  );
};

export default SkeletonLayout;

