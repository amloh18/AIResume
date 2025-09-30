import React from 'react';
import { motion } from 'framer-motion';

// Base shimmer animation
const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear'
    }
  }
};

// Base skeleton component with optimized shimmer
const BaseSkeleton: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}> = ({ className = '', width, height, rounded = 'md' }) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`bg-gradient-to-r from-gray-200/60 to-gray-300/40 dark:from-gray-700/60 dark:to-gray-600/40 relative overflow-hidden ${roundedClasses[rounded]} ${className}`}
      style={style}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-gray-400/20 to-transparent"
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
      />
    </div>
  );
};

// Analytics Dashboard Skeleton
export const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <BaseSkeleton height={32} width={200} />
        <BaseSkeleton height={16} width={300} />
      </div>
      <BaseSkeleton height={40} width={120} />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-widget-premium rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <BaseSkeleton height={20} width={100} />
            <BaseSkeleton height={24} width={24} rounded="full" />
          </div>
          <BaseSkeleton height={32} width={80} className="mb-2" />
          <BaseSkeleton height={14} width={120} />
        </div>
      ))}
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* CV Health Score */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={150} className="mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="text-center">
              <BaseSkeleton height={128} width={128} rounded="full" className="mx-auto mb-4" />
              <BaseSkeleton height={16} width={80} className="mx-auto mb-2" />
              <BaseSkeleton height={14} width={60} className="mx-auto" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <BaseSkeleton key={i} height={40} width="100%" />
              ))}
            </div>
          </div>
        </div>

        {/* Application Hub */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={150} className="mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-white/10 rounded-lg">
                <BaseSkeleton height={40} width={40} rounded="full" />
                <div className="flex-1 space-y-2">
                  <BaseSkeleton height={16} width="60%" />
                  <BaseSkeleton height={14} width="40%" />
                </div>
                <BaseSkeleton height={32} width={80} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Intelligence Dashboard */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={150} className="mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <BaseSkeleton height={16} width="80%" />
                <BaseSkeleton height={8} width="100%" />
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={150} className="mb-6" />
          <BaseSkeleton height={200} width="100%" />
        </div>
      </div>
    </div>
  </div>
);

// Canvas Page Skeleton
export const CanvasSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <BaseSkeleton height={32} width={200} />
        <BaseSkeleton height={16} width={300} />
      </div>
      <BaseSkeleton height={40} width={120} />
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left Column - CV Cards */}
      <div className="xl:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <BaseSkeleton height={24} width={150} />
          <BaseSkeleton height={32} width={100} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-widget-premium rounded-xl p-6">
              <BaseSkeleton height={200} width="100%" className="mb-4" />
              <BaseSkeleton height={20} width="80%" className="mb-2" />
              <BaseSkeleton height={14} width="60%" className="mb-4" />
              <div className="flex items-center justify-between">
                <BaseSkeleton height={32} width={80} />
                <div className="flex gap-2">
                  <BaseSkeleton height={32} width={32} rounded="full" />
                  <BaseSkeleton height={32} width={32} rounded="full" />
                  <BaseSkeleton height={32} width={32} rounded="full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* CV Tips */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={120} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <BaseSkeleton height={16} width="90%" />
                <BaseSkeleton height={14} width="70%" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={120} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <BaseSkeleton height={32} width={32} rounded="full" />
                <div className="flex-1 space-y-1">
                  <BaseSkeleton height={14} width="80%" />
                  <BaseSkeleton height={12} width="60%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Application Journey Page Skeleton
export const ApplicationJourneySkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <BaseSkeleton height={32} width={200} />
        <BaseSkeleton height={16} width={300} />
      </div>
      <div className="flex gap-3">
        <BaseSkeleton height={40} width={100} />
        <BaseSkeleton height={40} width={120} />
      </div>
    </div>

    {/* Filters */}
    <div className="flex items-center gap-4 p-4 glass-widget-premium rounded-xl">
      <BaseSkeleton height={32} width={120} />
      <BaseSkeleton height={32} width={100} />
      <BaseSkeleton height={32} width={200} />
    </div>

    {/* Journey Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-widget-premium rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <BaseSkeleton height={20} width={120} />
            <BaseSkeleton height={24} width={24} rounded="full" />
          </div>
          <BaseSkeleton height={16} width="80%" className="mb-2" />
          <BaseSkeleton height={14} width="60%" className="mb-4" />
          
          {/* Progress Bar */}
          <div className="mb-4">
            <BaseSkeleton height={8} width="100%" />
          </div>
          
          <div className="flex items-center justify-between">
            <BaseSkeleton height={14} width={80} />
            <div className="flex gap-2">
              <BaseSkeleton height={28} width={28} rounded="full" />
              <BaseSkeleton height={28} width={28} rounded="full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Application Tracker Skeleton
export const ApplicationTrackerSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <BaseSkeleton height={32} width={200} />
        <BaseSkeleton height={16} width={300} />
      </div>
      <BaseSkeleton height={40} width={120} />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-widget-premium rounded-xl p-6 text-center">
          <BaseSkeleton height={32} width={32} rounded="full" className="mx-auto mb-3" />
          <BaseSkeleton height={24} width={60} className="mx-auto mb-2" />
          <BaseSkeleton height={14} width={80} className="mx-auto" />
        </div>
      ))}
    </div>

    {/* Applications Table */}
    <div className="glass-widget-premium rounded-xl overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <BaseSkeleton height={24} width={150} />
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BaseSkeleton height={40} width={40} rounded="full" />
                <div className="space-y-2">
                  <BaseSkeleton height={16} width={150} />
                  <BaseSkeleton height={14} width={100} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <BaseSkeleton height={24} width={80} />
                <BaseSkeleton height={32} width={32} rounded="full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Settings Page Skeleton
export const SettingsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <BaseSkeleton height={32} width={200} />
      <BaseSkeleton height={16} width={300} />
    </div>

    {/* Settings Sections */}
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-widget-premium rounded-xl p-6">
          <BaseSkeleton height={24} width={150} className="mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-2">
                  <BaseSkeleton height={16} width={120} />
                  <BaseSkeleton height={14} width={200} />
                </div>
                <BaseSkeleton height={32} width={60} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Generic Page Skeleton
export const PageSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  showActions?: boolean;
}> = ({ title = "Loading...", subtitle = "Please wait", showActions = true }) => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <BaseSkeleton height={32} width={200} />
        <BaseSkeleton height={16} width={300} />
      </div>
      {showActions && <BaseSkeleton height={40} width={120} />}
    </div>

    {/* Content Area */}
    <div className="glass-widget-premium rounded-xl p-8 text-center">
      <BaseSkeleton height={64} width={64} rounded="full" className="mx-auto mb-4" />
      <BaseSkeleton height={24} width={200} className="mx-auto mb-2" />
      <BaseSkeleton height={16} width={300} className="mx-auto" />
    </div>
  </div>
);

export default {
  AnalyticsSkeleton,
  CanvasSkeleton,
  ApplicationJourneySkeleton,
  ApplicationTrackerSkeleton,
  SettingsSkeleton,
  PageSkeleton,
  BaseSkeleton
};
