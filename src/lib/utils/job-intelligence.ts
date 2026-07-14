import { JobApplication } from '@/types/job';

export const getDaysSinceLastUpdate = (job: JobApplication) => {
  const lastUpdate = new Date(job.updatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
};

export const isFollowUpNeeded = (job: JobApplication) => {
  const days = getDaysSinceLastUpdate(job);

  switch (job.status) {
    case 'applied':
    case 'interview':
    case 'offer':
      return days >= 3;
    case 'rejected':
      return false;
    default:
      return false;
  }
};

export const getFollowUpSuggestion = (job: JobApplication, days: number) => {
  switch (job.status) {
    case 'applied':
      return `It's been ${days} days since you applied. Consider sending a polite follow-up email to check on your application status.`;
    case 'interview':
      return `It's been ${days} days since your interview. Consider reaching out to thank them and inquire about next steps.`;
    case 'offer':
      return `It's been ${days} days since receiving the offer. Make sure to respond within their deadline.`;
    default:
      return '';
  }
};

export const getFollowUpEmailSubject = (job: JobApplication) => {
  switch (job.status) {
    case 'applied':
      return `Following up on ${job.jobTitle} Application`;
    case 'screening':
      return `Re: ${job.jobTitle} Application - Screening Stage`;
    case 'interview':
      return `Thank you for the ${job.jobTitle} Interview`;
    case 'offer':
      return `Re: ${job.jobTitle} Offer`;
    case 'accepted':
      return `Acceptance: ${job.jobTitle} Position`;
    case 'rejected':
      return `Thank you - ${job.jobTitle} Application`;
    default:
      return 'Follow-up';
  }
};
