import React from 'react';

interface SkeletonLayoutProps {
  lines?: number;
  showChips?: boolean;
  showButton?: boolean;
}

const SkeletonLayout: React.FC<SkeletonLayoutProps> = ({ 
  lines = 3, 
  showChips = true, 
  showButton = true 
}) => {
  return (
    <div className="space-y-4" data-testid="skeleton-layout">
      {/* Skeleton lines */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton-line h-3 bg-gray-600 rounded animate-pulse"
            style={{
              width: `${Math.random() * 40 + 60}%`
            }}
          />
        ))}
      </div>

      {/* Skeleton chips */}
      {showChips && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-chip w-16 h-5 bg-gray-600 rounded-full animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Skeleton button */}
      {showButton && (
        <div className="flex justify-end">
          <div className="skeleton-button w-20 h-8 bg-gray-600 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default SkeletonLayout;
