// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, RefreshCw, Settings, Bell, Palette, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CalendarSyncSettingsProps {
  userSettings: any;
  onUpdateSettings: (settings: any) => void;
}

export default function CalendarSyncSettings({ userSettings, onUpdateSettings }: CalendarSyncSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const calendarSettings = userSettings?.advanced?.integrations?.calendar || {
    connected: false,
    provider: 'google',
    syncEnabled: false,
    syncSettings: {
      includeInterviews: true,
      includeFollowUps: true,
      includeDeadlines: true,
      reminderMinutes: 60,
      colorCoding: true,
    }
  };

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/calendar/auth');
      const data = await response.json();
      
      if (data.success) {
        // Open Google OAuth in popup
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for the popup to close
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            // Check if auth was successful by trying to get user settings
            window.location.reload();
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to initiate calendar connection');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: calendarSettings.accessToken,
          refreshToken: calendarSettings.refreshToken,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLastSyncTime(new Date());
      } else {
        throw new Error(data.error || 'Failed to sync to calendar');
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const updatedSettings = {
        ...userSettings,
        advanced: {
          ...userSettings.advanced,
          integrations: {
            ...userSettings.advanced.integrations,
            calendar: {
              ...calendarSettings,
              connected: false,
              accessToken: undefined,
              refreshToken: undefined,
              syncEnabled: false,
            }
          }
        }
      };

      onUpdateSettings(updatedSettings);
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const handleSyncSettingChange = (key: string, value: any) => {
    const updatedSettings = {
      ...userSettings,
      advanced: {
        ...userSettings.advanced,
        integrations: {
          ...userSettings.advanced.integrations,
          calendar: {
            ...calendarSettings,
            syncSettings: {
              ...calendarSettings.syncSettings,
              [key]: value,
            }
          }
        }
      }
    };

    onUpdateSettings(updatedSettings);
  };

  const handleSyncEnabledChange = (enabled: boolean) => {
    const updatedSettings = {
      ...userSettings,
      advanced: {
        ...userSettings.advanced,
        integrations: {
          ...userSettings.advanced.integrations,
          calendar: {
            ...calendarSettings,
            syncEnabled: enabled,
          }
        }
      }
    };

    onUpdateSettings(updatedSettings);
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your job applications with your calendar to stay organized and never miss important deadlines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${calendarSettings.connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                {calendarSettings.connected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-medium">
                  {calendarSettings.connected ? 'Connected to Google Calendar' : 'Not Connected'}
                </p>
                {calendarSettings.connected && lastSyncTime && (
                  <p className="text-small text-gray-500">
                    Last synced: {formatLastSync(lastSyncTime)}
                  </p>
                )}
              </div>
            </div>
            
            {calendarSettings.connected ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectCalendar}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectCalendar}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? 'Connecting...' : 'Connect Calendar'}
              </Button>
            )}
          </div>

          {calendarSettings.connected && (
            <>
              <Separator />
              
              {/* Sync Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-enabled" className="text-body font-medium">
                      Enable Calendar Sync
                    </Label>
                    <p className="text-small text-gray-500">
                      Automatically sync job applications to your calendar
                    </p>
                  </div>
                  <Switch
                    id="sync-enabled"
                    checked={calendarSettings.syncEnabled}
                    onCheckedChange={handleSyncEnabledChange}
                  />
                </div>

                {calendarSettings.syncEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Sync Settings
                      </h4>
                      
                      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-interviews" className="text-small">
                            Include Interviews
                          </Label>
                          <Switch
                            id="include-interviews"
                            checked={calendarSettings.syncSettings.includeInterviews}
                            onCheckedChange={(checked) => handleSyncSettingChange('includeInterviews', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-followups" className="text-small">
                            Include Follow-ups
                          </Label>
                          <Switch
                            id="include-followups"
                            checked={calendarSettings.syncSettings.includeFollowUps}
                            onCheckedChange={(checked) => handleSyncSettingChange('includeFollowUps', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-deadlines" className="text-small">
                            Include Deadlines
                          </Label>
                          <Switch
                            id="include-deadlines"
                            checked={calendarSettings.syncSettings.includeDeadlines}
                            onCheckedChange={(checked) => handleSyncSettingChange('includeDeadlines', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="color-coding" className="text-small">
                            Color Coding
                          </Label>
                          <Switch
                            id="color-coding"
                            checked={calendarSettings.syncSettings.colorCoding}
                            onCheckedChange={(checked) => handleSyncSettingChange('colorCoding', checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-small flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Reminder Time (minutes before event)
                        </Label>
                        <div className="px-3">
                          <Slider
                            value={[calendarSettings.syncSettings.reminderMinutes]}
                            onValueChange={(value) => handleSyncSettingChange('reminderMinutes', value[0])}
                            max={1440}
                            min={0}
                            step={15}
                            className="w-full"
                          />
                          <div className="flex justify-between text-small text-gray-500 mt-1">
                            <span>0 min</span>
                            <span>{calendarSettings.syncSettings.reminderMinutes} min</span>
                            <span>24 hours</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-blue-100">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-small font-medium text-blue-900">
                      What gets synced to your calendar:
                    </p>
                    <ul className="text-small text-blue-700 space-y-1">
                      <li>• Job applications (excluding "created" status)</li>
                      <li>• Interview schedules and details</li>
                      <li>• Follow-up reminders</li>
                      <li>• Application deadlines</li>
                      <li>• Color-coded by application status</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
