'use client';

interface SkeletonProps {
  className?: string;
}

/**
 * A single pulsing skeleton block.
 *
 * Mirrors the dashboard's neutral card palette via the app's design tokens and
 * animates with a soft shimmer (see `.skeleton-block` in globals.css). Use it
 * for loading placeholders inside cards/sections — keep real headings and
 * static chrome outside skeletons so the UI renders immediately.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton-block ${className}`} />;
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/**
 * A stack of text-like skeleton lines (title + muted body lines).
 * Perfect for replacing "Loading…" text inside panels.
 */
export function SkeletonText({ lines = 2, className = '' }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton-block ${i === 0 ? 'h-4 w-3/4' : 'h-3 w-1/2'}`}
        />
      ))}
    </div>
  );
}
