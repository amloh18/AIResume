'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NotificationType, NotificationPriority } from '@/models/Notification';

export default function NotificationTester() {
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [userId, setUserId] = useState('');
  const [notificationType, setNotificationType] = useState<NotificationType>('system_update');
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification to verify the notification system is working correctly.');
  const [priority, setPriority] = useState<NotificationPriority>('medium');
  const [actionType, setActionType] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [interactive, setInteractive] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  const handleSendTestNotification = async () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'Please enter a user ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Use notification service directly via API
      const response = await fetch('/api/notifications/create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: notificationType,
          title,
          message,
          priority,
          actionType: actionType || undefined,
          actionData: actionUrl ? { url: actionUrl } : undefined,
          interactive,
          channels: ['in-app', 'email'],
          persistent: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Notification sent successfully!' });
        toast({
          title: 'Success',
          description: 'Test notification sent successfully. Check the notification panel and your email.',
        });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send notification' });
        toast({
          title: 'Error',
          description: data.error || 'Failed to send notification',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to send notification' });
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickTestTemplates = [
    {
      name: 'Documents Ready',
      type: 'documents_ready' as NotificationType,
      title: 'Documents Ready!',
      message: 'Your documents for Software Engineer at Tech Corp are ready. Edit or apply to the job.',
      priority: 'high' as NotificationPriority,
      interactive: true,
      actionType: 'review_job',
      actionUrl: '/studio',
    },
    {
      name: 'Interview Follow-up',
      type: 'interview_follow_up' as NotificationType,
      title: 'Interview Scheduled!',
      message: 'Congratulations! You have an interview for Software Engineer at Tech Corp. Don\'t forget to send a follow-up email after the interview.',
      priority: 'high' as NotificationPriority,
      interactive: true,
      actionType: 'review_job',
      actionUrl: '/dashboard',
    },
    {
      name: 'Job Applied',
      type: 'job_applied' as NotificationType,
      title: 'Application Submitted!',
      message: 'Great! You\'ve applied to Software Engineer at Tech Corp. Good luck!',
      priority: 'medium' as NotificationPriority,
      interactive: true,
      actionType: 'review_job',
      actionUrl: '/dashboard',
    },
    {
      name: 'System Update',
      type: 'system_update' as NotificationType,
      title: 'System Update',
      message: 'We\'ve made some improvements to the platform. Check out what\'s new!',
      priority: 'low' as NotificationPriority,
      interactive: false,
    },
    {
      name: 'Urgent Alert',
      type: 'system_update' as NotificationType,
      title: 'Urgent: Action Required',
      message: 'Your account requires immediate attention. Please review your settings.',
      priority: 'urgent' as NotificationPriority,
      interactive: true,
      actionType: 'view_offer',
      actionUrl: '/dashboard/settings',
    },
  ];

  const loadTemplate = (template: typeof quickTestTemplates[0]) => {
    setNotificationType(template.type);
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority);
    setInteractive(template.interactive || false);
    setActionType(template.actionType || '');
    setActionUrl(template.actionUrl || '');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Test System
          </CardTitle>
          <CardDescription>
            Test the notification system by sending test notifications to users. Notifications will appear as toasts and in the notification panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Test Templates */}
          <div>
            <Label className="mb-2 block">Quick Test Templates</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickTestTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate(template)}
                  className="justify-start text-left h-auto py-2"
                >
                  <div className="flex-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {template.priority} priority
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* User ID */}
          <div>
            <Label htmlFor="userId">User ID *</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID to send test notification"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the MongoDB user ID (ObjectId) to send the notification to
            </p>
          </div>

          {/* Notification Type */}
          <div>
            <Label htmlFor="notificationType">Notification Type</Label>
            <Select value={notificationType} onValueChange={(value) => setNotificationType(value as NotificationType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documents_ready">Documents Ready</SelectItem>
                <SelectItem value="interview_follow_up">Interview Follow-up</SelectItem>
                <SelectItem value="job_applied">Job Applied</SelectItem>
                <SelectItem value="job_status_check">Job Status Check</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="deadline_approaching">Deadline Approaching</SelectItem>
                <SelectItem value="deadline_due_today">Deadline Due Today</SelectItem>
                <SelectItem value="deadline_missed">Deadline Missed</SelectItem>
                <SelectItem value="membership_expiring">Membership Expiring</SelectItem>
                <SelectItem value="membership_expired">Membership Expired</SelectItem>
                <SelectItem value="discount_offer">Discount Offer</SelectItem>
                <SelectItem value="system_update">System Update</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="mt-1"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message"
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as NotificationPriority)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interactive Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="interactive"
                checked={interactive}
                onChange={(e) => setInteractive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="interactive" className="cursor-pointer">
                Interactive Notification (with action button)
              </Label>
            </div>

            {interactive && (
              <>
                <div>
                  <Label htmlFor="actionType">Action Type</Label>
                  <Input
                    id="actionType"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    placeholder="e.g., review_job, move_to_next_stage, view_offer"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="actionUrl">Action URL</Label>
                  <Input
                    id="actionUrl"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="e.g., /dashboard, /studio"
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-md flex items-center gap-2 ${
              result.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span className={result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                {result.message}
              </span>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendTestNotification}
            disabled={loading || !userId}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Notifications will appear as toast notifications in the top-right corner</p>
            <p>• Notifications will also be saved to the notification panel (bell icon)</p>
            <p>• Email notifications will be sent if email channel is enabled for the user</p>
            <p>• Check the browser console for any errors</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

