// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import EmailCampaignManager from '@/components/admin/EmailCampaignManager';

export default function EmailCampaignsPage() {
  return <EmailCampaignManager />;
}

