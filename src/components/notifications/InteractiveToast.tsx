'use client';

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toast, ToastAction, ToastDescription, ToastTitle } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { INotification } from '@/models/Notification';
import { useNotifications } from '@/contexts/NotificationContext';

interface InteractiveToastProps {
  notification: INotification;
}

export function InteractiveToast({ notification }: InteractiveToastProps) {
  const { handleNotificationAction, markAsRead } = useNotifications();
  const { toast } = useToast();

  const handleAction = async (actionType: string) => {
    try {
      await handleNotificationAction(notification._id.toString(), actionType);
      toast({
        title: 'Success',
        description: 'Action completed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete action',
        variant: 'destructive',
      });
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'move_to_next_stage':
        return 'Move to Next Stage';
      case 'review_job':
        return 'Review Job';
      case 'view_offer':
        return 'View Offer';
      default:
        return 'View Details';
    }
  };

  return (
    <Toast>
      <div className="grid gap-1">
        <ToastTitle>{notification.title}</ToastTitle>
        <ToastDescription>{notification.message}</ToastDescription>
      </div>
      {notification.interactive && notification.actionType && (
        <ToastAction
          altText={getActionLabel(notification.actionType)}
          onClick={() => handleAction(notification.actionType!)}
        >
          {getActionLabel(notification.actionType)}
        </ToastAction>
      )}
    </Toast>
  );
}

