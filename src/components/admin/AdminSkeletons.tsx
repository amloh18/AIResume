'use client';

import React from 'react';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/SkeletonLoader';

// Admin-specific skeleton components
export const AdminKPISkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={40} variant="circular" />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Skeleton height={16} width="60%" />
              <Skeleton height={32} width={32} variant="circular" />
            </div>
            <Skeleton height={32} width="70%" className="mb-2" />
            <Skeleton height={14} width="40%" />
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
      </div>
    </div>
  );
};

export const AdminUserManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <Skeleton height={16} width="60%" className="mb-4" />
            <Skeleton height={32} width="70%" className="mb-2" />
            <Skeleton height={14} width="40%" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Skeleton height={24} width={150} />
            <Skeleton height={40} width={200} />
          </div>
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    </div>
  );
};

export const AdminSystemHealthSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* System Status Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Skeleton height={16} width="60%" />
              <Skeleton height={24} width={24} variant="circular" />
            </div>
            <Skeleton height={32} width="70%" className="mb-2" />
            <div className="space-y-2">
              <Skeleton height={12} width="80%" />
              <Skeleton height={12} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
      </div>
    </div>
  );
};

export const AdminTemplateManagerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* Template Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <Skeleton height={200} width="100%" className="mb-4" />
            <Skeleton height={20} width="80%" className="mb-2" />
            <Skeleton height={16} width="60%" className="mb-4" />
            <div className="flex items-center justify-between">
              <Skeleton height={32} width={80} />
              <Skeleton height={32} width={80} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminAIAnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* AI Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <Skeleton height={16} width="60%" className="mb-4" />
            <Skeleton height={32} width="70%" className="mb-2" />
            <Skeleton height={14} width="40%" />
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Skeleton height={24} width="50%" className="mb-4" />
          <SkeletonChart className="h-64" />
        </div>
      </div>
    </div>
  );
};

export const AdminPricingPlanSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* Pricing Plans Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <Skeleton height={24} width="60%" className="mb-4" />
            <Skeleton height={32} width="40%" className="mb-4" />
            <div className="space-y-2 mb-6">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} height={16} width="80%" />
              ))}
            </div>
            <Skeleton height={40} width="100%" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminTestimonialSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* Testimonials Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Skeleton height={40} width={40} variant="circular" className="mr-3" />
              <div>
                <Skeleton height={16} width="60%" className="mb-1" />
                <Skeleton height={14} width="40%" />
              </div>
            </div>
            <Skeleton height={16} width="100%" className="mb-2" />
            <Skeleton height={16} width="90%" className="mb-2" />
            <Skeleton height={16} width="70%" />
          </div>
        ))}
      </div>
    </div>
  );
};
