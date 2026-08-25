import { Metadata } from 'next';
import LegalCenter from '../page';

export const metadata: Metadata = {
  title: 'Privacy Policy | AIResume',
  description: 'Learn how AIResume collects, uses, and protects your personal data and resume information.',
  alternates: {
    canonical: 'https://buildairesume.com/legal/privacy',
  },
};

export default function PrivacySubpage() {
  return <LegalCenter defaultTab="privacy" />;
}
