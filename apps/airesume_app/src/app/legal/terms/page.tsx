import { Metadata } from 'next';
import LegalCenter from '../page';

export const metadata: Metadata = {
  title: 'Terms of Service | AIResume',
  description: 'Review the Terms of Service and user agreement governing your use of the AIResume platform.',
  alternates: {
    canonical: 'https://buildairesume.com/legal/terms',
  },
};

export default function TermsSubpage() {
  return <LegalCenter defaultTab="terms" />;
}
