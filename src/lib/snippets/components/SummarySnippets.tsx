'use client';

import React from 'react';

interface SummarySnippetProps {
  text: string;
  className?: string;
}

export const SummaryJustifiedSnippet: React.FC<SummarySnippetProps> = ({ text, className = '' }) => (
  <div
    className={`summary-justified ${className}`}
    style={{
      fontSize: '11px',
      lineHeight: '1.55',
      color: '#374151',
      textAlign: 'justify',
    }}
  >
    {text}
  </div>
);

export const SummarySpacedSnippet: React.FC<SummarySnippetProps> = ({ text, className = '' }) => (
  <div
    className={`summary-spaced ${className}`}
    style={{
      fontSize: '11px',
      lineHeight: '1.6',
      color: '#374151',
    }}
  >
    {text.split('\n').filter(Boolean).map((paragraph, i) => (
      <p key={i} style={{ margin: '0 0 8px 0' }}>{paragraph}</p>
    ))}
  </div>
);

export const SummaryHighlightedSnippet: React.FC<SummarySnippetProps> = ({ text, className = '' }) => (
  <div
    className={`summary-highlighted ${className}`}
    style={{
      fontSize: '11px',
      lineHeight: '1.55',
      color: '#374151',
      textAlign: 'justify',
      padding: '8px 12px',
      backgroundColor: '#f9fafb',
      borderLeft: '3px solid #111827',
      borderRadius: '0 4px 4px 0',
    }}
  >
    {text}
  </div>
);
