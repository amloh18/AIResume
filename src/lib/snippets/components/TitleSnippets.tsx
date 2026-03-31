'use client';

import React from 'react';

interface TitleSnippetProps {
  children: React.ReactNode;
  className?: string;
}

export const TitleBorderedSnippet: React.FC<TitleSnippetProps> = ({ children, className = '' }) => (
  <div
    className={`section-title-bordered ${className}`}
    style={{
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: '#111827',
      margin: '0 0 6px 0',
      paddingBottom: '4px',
      borderBottom: '1px solid #d1d5db',
    }}
  >
    {children}
  </div>
);

export const TitleMinimalSnippet: React.FC<TitleSnippetProps> = ({ children, className = '' }) => (
  <div
    className={`section-title-minimal ${className}`}
    style={{
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: '#111827',
      margin: '0 0 6px 0',
    }}
  >
    {children}
  </div>
);

export const TitleAccentSnippet: React.FC<TitleSnippetProps> = ({ children, className = '' }) => (
  <div
    className={`section-title-accent ${className}`}
    style={{
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: '#111827',
      margin: '0 0 6px 0',
      paddingLeft: '10px',
      borderLeft: '3px solid #111827',
    }}
  >
    {children}
  </div>
);

export const TitleSpacedSnippet: React.FC<TitleSnippetProps> = ({ children, className = '' }) => (
  <div
    className={`section-title-spaced ${className}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: '#111827',
      margin: '0 0 6px 0',
    }}
  >
    <span>{children}</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#d1d5db' }} />
  </div>
);
