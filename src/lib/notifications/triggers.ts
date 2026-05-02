// @ts-nocheck
import { NOTIFICATION_TEMPLATES, TemplateVariables, getExpiryDate } from './templates';
import { globalFrequencyManager } from './frequency';
import notificationService from '@/lib/services/notificationService';

export async function triggerApplicationStageNotification(
  userId: string,
  fromStage: string,
  toStage: string,
  variables: TemplateVariables
): Promise<void> {
  const stagePair = `${fromStage}_${toStage}`.toUpperCase();
  const templateKey = `STAGE_${stagePair}` as keyof typeof NOTIFICATION_TEMPLATES.APPLICATION_TRACKER;
  
  const template = NOTIFICATION_TEMPLATES.APPLICATION_TRACKER[templateKey];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for stage transition: ${fromStage} -> ${toStage}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    `${variables.company}_${toStage}`
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export async function triggerATSScoreNotification(
  userId: string,
  notificationType: 'SCORE_GENERATED' | 'SCORE_IMPROVED' | 'LOW_ATS_WARNING',
  variables: TemplateVariables
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.ATS_SCORE[notificationType];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for ATS score type: ${notificationType}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    `${variables.company}_ats_${notificationType}`
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export async function triggerPaymentNotification(
  userId: string,
  notificationType: keyof typeof NOTIFICATION_TEMPLATES.PAYMENT,
  variables: TemplateVariables
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.PAYMENT[notificationType];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for payment type: ${notificationType}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    notificationType
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export async function triggerCVDocumentNotification(
  userId: string,
  notificationType: keyof typeof NOTIFICATION_TEMPLATES.CV_DOCUMENT,
  variables: TemplateVariables
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.CV_DOCUMENT[notificationType];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for CV document type: ${notificationType}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    notificationType
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export async function triggerAnalyticsNotification(
  userId: string,
  notificationType: keyof typeof NOTIFICATION_TEMPLATES.ANALYTICS,
  variables: TemplateVariables
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.ANALYTICS[notificationType];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for analytics type: ${notificationType}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    notificationType
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export async function triggerSystemNotification(
  userId: string,
  notificationType: keyof typeof NOTIFICATION_TEMPLATES.SYSTEM,
  variables: TemplateVariables
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.SYSTEM[notificationType];
  
  if (!template || typeof template !== 'function') {
    console.warn(`No notification template for system type: ${notificationType}`);
    return;
  }

  const notification = template(variables);
  
  const canSend = globalFrequencyManager.canSendNotification(
    notification.category,
    userId,
    notificationType
  );

  if (!canSend.allowed) {
    console.log(`Skipping notification: ${canSend.reason}`);
    return;
  }

  await notificationService.createNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    category: notification.category,
    interactive: notification.interactive,
    actionType: notification.actionType,
    actionUrl: notification.actionUrl,
    persistent: notification.persistent,
    channels: notification.channels,
    expiresAt: getExpiryDate(notification.expiryHours),
  });
}

export const NotificationTriggers = {
  applicationStage: triggerApplicationStageNotification,
  atsScore: triggerATSScoreNotification,
  payment: triggerPaymentNotification,
  cvDocument: triggerCVDocumentNotification,
  analytics: triggerAnalyticsNotification,
  system: triggerSystemNotification,
};
