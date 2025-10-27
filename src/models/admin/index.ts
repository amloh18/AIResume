export { default as AdminUser } from './AdminUser';
export { default as EmailCampaign } from './EmailCampaign';

// Re-export admin models with getter functions for backward compatibility
export const getAdminUser = () => AdminUser;
export const getEmailCampaign = () => EmailCampaign;
