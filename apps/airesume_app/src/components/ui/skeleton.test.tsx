import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import PageSkeleton from './PageSkeleton';
import { Skeleton, SkeletonText } from './Skeleton';

describe('Skeleton primitives', () => {
  it('renders a skeleton block with the skeleton-block class', () => {
    const html = renderToStaticMarkup(<Skeleton className="h-6 w-24" />);
    expect(html).toContain('skeleton-block');
    expect(html).toContain('h-6');
  });

  it('renders the requested number of text lines', () => {
    const html = renderToStaticMarkup(<SkeletonText lines={3} />);
    expect((html.match(/skeleton-block/g) || []).length).toBe(3);
  });
});

describe('PageSkeleton', () => {
  it('renders skeleton blocks and a status role, with no fake heading text', () => {
    const html = renderToStaticMarkup(<PageSkeleton cards={4} />);
    expect(html).toContain('role="status"');
    expect((html.match(/skeleton-block/g) || []).length).toBeGreaterThan(0);
    // Page chrome comes from the real page — the skeleton must not invent text.
    const text = html.replace(/<[^>]*>/g, '').trim();
    expect(text).toBe('');
  });
});
