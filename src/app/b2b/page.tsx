import React from 'react';
import B2BLandingPage from '@/components/b2b/B2BLandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CVCircle B2B | Enterprise AI Recruitment Intelligence',
  description: 'Scale your recruitment platform with CVCircle Enterprise. AI-powered CV parsing, ATS scoring, and candidate screening infrastructure.',
  keywords: ['recruitment api', 'cv parsing api', 'ats scoring engine', 'hr tech sdk', 'ai recruitment'],
};

export default function B2BPage() {
  return <B2BLandingPage />;
}
