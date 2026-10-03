'use client';

import React from 'react';
import { Inbox, SearchX, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        {icon || <Inbox className="w-7 h-7 text-white/30" />}
      </div>
      <h3 className="text-sm font-bold text-white/80 mb-1">{title}</h3>
      <p className="text-xs text-white/40 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl bg-white/5 ${className}`}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] rounded-xl px-3 py-2 space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded w-1/2 animate-pulse" />
            <div className="h-3.5 bg-white/5 rounded w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="w-16 h-5 bg-white/5 rounded-full animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-white/5 rounded w-1/4 animate-pulse" />
        <div className="h-2.5 bg-white/5 rounded w-1/6 animate-pulse" />
      </div>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <div key={i} className="h-3 bg-white/5 rounded w-16 animate-pulse" />
      ))}
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-white/5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-5 bg-white/5 rounded w-14 animate-pulse" />
            <div className="h-3 bg-white/5 rounded w-16 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className="w-7 h-7 text-white/30" />}
      title={`No results for "${query}"`}
      description="Try a different search term or clear filters to see all results."
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-8 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <h3 className="text-sm font-bold text-red-400 mb-1">Something went wrong</h3>
      <p className="text-xs text-white/40 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
