'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NotificationType } from '@/models/Notification';

interface NotificationPreference {
  enabled: boolean;
  channels: {
    'in-app': boolean;
    email: boolean;
    push: boolean;
  };
}

interface Preferences {
  [key: string]: NotificationPreference;
}

const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
  {
    type: 'job_status_check',
    label: 'Job Status Updates',
    description: 'Reminders to update job application status',
  },
  {
    type: 'follow_up',
    label: 'Follow-up Reminders',
    description: 'Reminders for scheduled follow-ups',
  },
  {
    type: 'deadline_approaching',
    label: 'Deadline Alerts',
    description: 'Notifications when application deadlines are approaching',
  },
  {
    type: 'deadline_due_today',
    label: 'Deadline Due Today',
    description: 'Urgent alerts when deadlines are due today',
  },
  {
    type: 'deadline_missed',
    label: 'Missed Deadlines',
    description: 'Alerts when application deadlines have passed',
  },
  {
    type: 'membership_expiring',
    label: 'Membership Expiry',
    description: 'Notifications when your membership is expiring',
  },
  {
    type: 'membership_expired',
    label: 'Membership Expired',
    description: 'Alerts when your membership has expired',
  },
  {
    type: 'discount_offer',
    label: 'Discount Offers',
    description: 'Special offers and promotional discounts',
  },
  {
    type: 'system_update',
    label: 'System Updates',
    description: 'Important updates about the platform',
  },
  {
    type: 'achievement',
    label: 'Achievements',
    description: 'Milestones and achievements you unlock',
  },
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || {});
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (type: NotificationType, field: string, value: boolean) => {
    const updated = { ...preferences };
    if (!updated[type]) {
      updated[type] = {
        enabled: true,
        channels: { 'in-app': true, email: false, push: false },
      };
    }

    if (field === 'enabled') {
      updated[type].enabled = value;
    } else if (field.startsWith('channel-')) {
      const channel = field.replace('channel-', '') as 'in-app' | 'email' | 'push';
      updated[type].channels[channel] = value;
    }

    setPreferences(updated);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        // Show success message
        alert('Preferences saved successfully!');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPreference = (type: NotificationType): NotificationPreference => {
    return preferences[type] || {
      enabled: true,
      channels: { 'in-app': true, email: false, push: false },
    };
  };

  if (loading) {
    return <div className="p-8 text-center">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Notification Preferences</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Control how and when you receive notifications
        </p>
      </div>

      <div className="space-y-4">
        {notificationTypes.map(({ type, label, description }) => {
          const pref = getPreference(type);

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{label}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                  <Switch
                    checked={pref.enabled}
                    onCheckedChange={(checked) => updatePreference(type, 'enabled', checked)}
                  />
                </div>
              </CardHeader>
              {pref.enabled && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <Label htmlFor={`${type}-in-app`}>In-App</Label>
                      </div>
                      <Switch
                        id={`${type}-in-app`}
                        checked={pref.channels['in-app']}
                        onCheckedChange={(checked) =>
                          updatePreference(type, 'channel-in-app', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <Label htmlFor={`${type}-email`}>Email</Label>
                      </div>
                      <Switch
                        id={`${type}-email`}
                        checked={pref.channels.email}
                        onCheckedChange={(checked) =>
                          updatePreference(type, 'channel-email', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <Label htmlFor={`${type}-push`}>Push Notifications</Label>
                      </div>
                      <Switch
                        id={`${type}-push`}
                        checked={pref.channels.push}
                        onCheckedChange={(checked) =>
                          updatePreference(type, 'channel-push', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

