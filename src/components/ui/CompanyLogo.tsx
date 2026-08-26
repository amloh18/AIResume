'use client';

import React, { useMemo, useState } from 'react';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

/* ------------------------------------------------------------------ */
/* Free logo sources (tried in order, then the initials fallback)      */
/* ------------------------------------------------------------------ */

const LOGO_SOURCES: Array<{ id: string; build: (domain: string) => string }> = [
  { id: 'clearbit', build: (domain) => `https://logo.clearbit.com/${domain}` },
  { id: 'google-favicon', build: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128` },
];

/**
 * Cache of the resolution result per company name, so a company that already
 * failed a logo source (or resolved to initials) never retries on re-render.
 */
const resolvedCache = new Map<string, number>();

/** jobId → last logo URL persisted, so we never PUT the same URL twice. */
const persistedUrls = new Map<string, string>();

/** "Google" / "Meta Platforms, Inc." / "google.com" → "google.com" */
function normalizeCompany(company?: string | null): string {
  const raw = (company || '').trim();
  if (!raw) return '';
  // Already a domain (e.g. parsed from a job posting).
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(raw)) return raw.toLowerCase();
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(inc|llc|ltd|limited|co|corp|corporation|company|gmbh|sa|srl|plc|technologies|technology|tech|systems|group|holdings|industries|software|solutions|labs|global|intl|international|services|partners)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
  if (!slug) return '';
  return `${slug}.com`;
}

/** "Meta Platforms" → "MP", "Google" → "GO" */
function initialsOf(company?: string | null): string {
  const words = (company || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  const first = words[0][0] || '';
  const second = words.length > 1 ? words[1][0] || '' : words[0][1] || '';
  return `${first}${second}`.toUpperCase();
}

interface CompanyLogoProps {
  company?: string | null;
  /** Square size in px. Defaults to 20. */
  size?: number;
  className?: string;
  /** A logo URL already persisted on the record (e.g. job.companyLogo). */
  logoUrl?: string | null;
  /** When set, a successfully resolved logo URL is persisted back to this job. */
  jobId?: string | null;
}

export default function CompanyLogo({ company, size = 20, className = '', logoUrl, jobId }: CompanyLogoProps) {
  const cacheKey = (company || '').trim().toLowerCase() || 'empty';
  const domain = useMemo(() => normalizeCompany(company), [company]);

  const [stage, setStage] = useState<number>(() => resolvedCache.get(cacheKey) ?? 0);
  const [stageKey, setStageKey] = useState<string>(cacheKey);
  const [persistedUrl, setPersistedUrl] = useState<string | null>(logoUrl || null);

  // Render-time adjustment (React's documented pattern): when the company
  // changes, reset to the cached outcome (or start the logo chain over).
  // Runs during render instead of an effect to avoid set-state-in-effect.
  if (stageKey !== cacheKey) {
    setStageKey(cacheKey);
    setStage(resolvedCache.get(cacheKey) ?? 0);
    setPersistedUrl(logoUrl || null);
  }

  if (!company) return null;

  // A URL already persisted on the record wins immediately (no fetch chain).
  const src = persistedUrl || (stage < LOGO_SOURCES.length ? LOGO_SOURCES[stage].build(domain) : null);
  const showInitials = !src || !domain;

  const handleError = () => {
    if (persistedUrl) {
      // The persisted URL is broken — drop it and fall through to the fetch chain.
      setPersistedUrl(null);
      return;
    }
    setStage((prev) => {
      const next = prev + 1;
      resolvedCache.set(cacheKey, next);
      return next;
    });
  };

  const handleLoad = () => {
    if (!jobId || !src || persistedUrl) return; // only persist freshly resolved URLs
    if (persistedUrls.get(jobId) === src) return;
    persistedUrls.set(jobId, src);
    // Fire-and-forget: persist the resolved logo so repeat views load instantly
    // instead of hitting the logo service again.
    authenticatedFetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyLogo: src }),
    }).catch((err) => console.warn('Failed to persist company logo:', err));
  };

  const boxStyle = { width: size, height: size };

  if (showInitials) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-[var(--bg-tertiary)] font-semibold text-[var(--text-secondary)] ${className}`}
        style={{ ...boxStyle, fontSize: Math.max(8, Math.round(size * 0.42)) }}
        title={company}
      >
        {initialsOf(company)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/60 dark:bg-white/10 ${className}`}
      style={boxStyle}
      title={company}
    >
      <img
        src={src}
        alt={`${company} logo`}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-contain"
        onError={handleError}
        onLoad={handleLoad}
      />
    </span>
  );
}
