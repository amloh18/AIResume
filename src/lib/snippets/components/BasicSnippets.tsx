'use client';

import React from 'react';

interface ContactItem {
  type: 'email' | 'phone' | 'location' | 'url' | 'linkedin';
  value: string;
}

interface BasicSnippetProps {
  contacts: ContactItem[];
  showIcons?: boolean;
  className?: string;
}

const ICONS: Record<string, React.ReactNode> = {
  email: <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>,
  phone: <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>,
  location: <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>,
  url: <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>,
  linkedin: <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" /></svg>,
};

export const BasicInlineBarSnippet: React.FC<BasicSnippetProps> = ({ contacts, showIcons = true, className = '' }) => (
  <div
    className={`basic-inline-bar ${className}`}
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '6px',
      fontSize: '10.5px',
      color: '#4b5563',
    }}
  >
    {contacts.map((c, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span style={{ color: '#9ca3af', userSelect: 'none' }}>|</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          {showIcons && <span style={{ opacity: 0.7, flexShrink: 0 }}>{ICONS[c.type]}</span>}
          {c.value}
        </span>
      </React.Fragment>
    ))}
  </div>
);

export const BasicStackedSnippet: React.FC<BasicSnippetProps> = ({ contacts, showIcons = true, className = '' }) => (
  <div
    className={`basic-stacked ${className}`}
    style={{
      fontSize: '10.5px',
      lineHeight: '1.5',
    }}
  >
    {contacts.map((c, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#374151' }}>
        {showIcons && <span style={{ opacity: 0.65, flexShrink: 0, width: '11px', height: '11px' }}>{ICONS[c.type]}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</span>
      </div>
    ))}
  </div>
);

export const BasicMinimalSnippet: React.FC<BasicSnippetProps> = ({ contacts, className = '' }) => (
  <div
    className={`basic-minimal ${className}`}
    style={{
      fontSize: '10.5px',
      color: '#4b5563',
      lineHeight: '1.5',
    }}
  >
    {contacts.map((c, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span style={{ margin: '0 6px', color: '#9ca3af' }}>·</span>}
        <span>{c.value}</span>
      </React.Fragment>
    ))}
  </div>
);
