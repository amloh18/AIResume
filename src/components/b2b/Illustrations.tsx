import React from 'react';

export const AnalyticsIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="400" height="300" rx="20" fill="currentColor" fillOpacity="0.02" />
    <path d="M50 250L350 250" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 250L50 50" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
    <path d="M80 250L80 180" stroke="currentColor" strokeOpacity="0.8" strokeWidth="30" strokeLinecap="round" />
    <path d="M140 250L140 120" stroke="currentColor" strokeOpacity="0.6" strokeWidth="30" strokeLinecap="round" />
    <path d="M200 250L200 160" stroke="currentColor" strokeOpacity="0.9" strokeWidth="30" strokeLinecap="round" />
    <path d="M260 250L260 90" stroke="currentColor" strokeOpacity="0.7" strokeWidth="30" strokeLinecap="round" />
    <path d="M320 250L320 60" stroke="currentColor" strokeOpacity="1" strokeWidth="30" strokeLinecap="round" />
    <circle cx="320" cy="60" r="12" fill="currentColor" />
    <circle cx="260" cy="90" r="12" fill="currentColor" />
    <circle cx="200" cy="160" r="12" fill="currentColor" />
    <circle cx="140" cy="120" r="12" fill="currentColor" />
    <circle cx="80" cy="180" r="12" fill="currentColor" />
    <path d="M80 180L140 120L200 160L260 90L320 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SandboxIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="400" height="300" rx="20" fill="currentColor" fillOpacity="0.02" />
    <rect x="50" y="50" width="300" height="200" rx="12" stroke="currentColor" strokeOpacity="0.8" strokeWidth="6" />
    <path d="M50 90L350 90" stroke="currentColor" strokeOpacity="0.8" strokeWidth="6" />
    <circle cx="75" cy="70" r="6" fill="currentColor" fillOpacity="0.4" />
    <circle cx="95" cy="70" r="6" fill="currentColor" fillOpacity="0.4" />
    <circle cx="115" cy="70" r="6" fill="currentColor" fillOpacity="0.4" />
    <path d="M80 130L120 170L80 210" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M140 210L200 210" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="230" y="120" width="90" height="100" rx="8" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="4" />
    <path d="M250 145L290 145" stroke="currentColor" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
    <path d="M250 165L300 165" stroke="currentColor" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
    <path d="M250 185L280 185" stroke="currentColor" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
