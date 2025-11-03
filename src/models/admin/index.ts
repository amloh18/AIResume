import AdminUser from './AdminUser';
import EmailCampaign from './EmailCampaign';

export { AdminUser, EmailCampaign };

// Re-export admin models with getter functions for backward compatibility
export const getAdminUser = () => AdminUser;
export const getEmailCampaign = () => EmailCampaign;
