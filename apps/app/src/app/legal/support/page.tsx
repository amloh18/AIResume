import { Metadata } from 'next';
import LegalCenter from '../page';

export const metadata: Metadata = {
  title: 'Support & Help Center | AIResume',
  description: 'Get help, contact customer support, and find answers to common questions about AIResume.',
  alternates: {
    canonical: 'https://buildairesume.com/legal/support',
  },
};

export default function SupportSubpage() {
  return <LegalCenter defaultTab="support" />;
}
