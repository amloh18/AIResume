import { Metadata } from 'next';
import LegalCenter from '../page';

export const metadata: Metadata = {
  title: 'Cookie Policy | AIResume',
  description: 'Understand how AIResume uses cookies and tracking technologies to improve your experience.',
  alternates: {
    canonical: 'https://buildairesume.com/legal/cookies',
  },
};

export default function CookiesSubpage() {
  return <LegalCenter defaultTab="cookies" />;
}
