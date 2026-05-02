// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Shield, Bell, Eye, Globe, Settings as SettingsIcon, User, Lock } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  experience?: string;
  isEmailVerified: boolean;
}

interface UserSettings {
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  timezone: string;
  languagePreference: string;
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange?: string;
    loginAttempts: number;
    lockedUntil?: string;
    trustedDevices: Array<{
      deviceId: string;
      deviceName: string;
      lastUsed: string;
      ipAddress: string;
      userAgent: string;
    }>;
  };
  detailedNotifications: {
    email: {
      enabled: boolean;
      marketing: boolean;
      security: boolean;
      updates: boolean;
      reminders: boolean;
      weeklyDigest: boolean;
    };
    push: {
      enabled: boolean;
      marketing: boolean;
      security: boolean;
      updates: boolean;
      reminders: boolean;
    };
    sms: {
      enabled: boolean;
      security: boolean;
      reminders: boolean;
    };
    frequency: string;
  };
  privacy: {
    profileVisibility: string;
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    allowSearchEngines: boolean;
    dataSharing: {
      analytics: boolean;
      marketing: boolean;
      thirdParty: boolean;
    };
    cookiePreferences: {
      necessary: boolean;
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
    };
  };
  preferences: {
    dashboard: {
      layout: string;
      defaultView: string;
      itemsPerPage: number;
      showTutorials: boolean;
    };
    cv: {
      defaultTemplate: string;
      autoSave: boolean;
      autoSaveInterval: number;
      exportFormat: string;
      watermark: boolean;
    };
    jobSearch: {
      defaultFilters: Record<string, any>;
      autoApply: boolean;
      maxApplicationsPerDay: number;
      preferredJobTypes: string[];
      salaryRange: {
        min: number;
        max: number;
        currency: string;
      };
    };
    accessibility: {
      fontSize: string;
      highContrast: boolean;
      reducedMotion: boolean;
      screenReader: boolean;
    };
  };
  communication: {
    preferredLanguage: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    numberFormat: string;
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/settings');
      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data.profile);
        setSettings(result.data.settings);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/user/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Settings updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (field: string, value: any) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  const handleSettingsChange = (path: string, value: any) => {
    if (settings) {
      const keys = path.split('.');
      const newSettings = { ...settings };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      setSettings(newSettings);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile || !settings) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>Failed to load settings. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and professional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    {profile.isEmailVerified ? (
                      <Badge variant="default">Verified</Badge>
                    ) : (
                      <Badge variant="destructive">Unverified</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profile.username || ''}
                    onChange={(e) => handleProfileChange('username', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location || ''}
                    onChange={(e) => handleProfileChange('location', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profile.company || ''}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profile.jobTitle || ''}
                    onChange={(e) => handleProfileChange('jobTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={profile.industry || ''}
                    onChange={(e) => handleProfileChange('industry', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select
                    value={profile.experience || 'mid'}
                    onValueChange={(value) => handleProfileChange('experience', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Professional Summary</Label>
                <Textarea
                  id="summary"
                  value={profile.summary || ''}
                  onChange={(e) => handleProfileChange('summary', e.target.value)}
                  rows={4}
                  placeholder="Tell us about your professional background..."
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Links</h3>
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website || ''}
                      onChange={(e) => handleProfileChange('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={profile.linkedin || ''}
                      onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={profile.github || ''}
                      onChange={(e) => handleProfileChange('github', e.target.value)}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveProfile} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.security.twoFactorEnabled ? (
                      <Badge variant="default">Enabled</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      {settings.security.twoFactorEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Change Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Trusted Devices</h3>
                  <div className="space-y-2">
                    {settings.security.trustedDevices.map((device, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{device.deviceName}</p>
                          <p className="text-sm text-muted-foreground">
                            Last used: {new Date(device.lastUsed).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      </div>
                    ))}
                    {settings.security.trustedDevices.length === 0 && (
                      <p className="text-muted-foreground">No trusted devices</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-enabled">Enable email notifications</Label>
                    <Switch
                      id="email-enabled"
                      checked={settings.detailedNotifications.email.enabled}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.email.enabled', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-security">Security alerts</Label>
                    <Switch
                      id="email-security"
                      checked={settings.detailedNotifications.email.security}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.email.security', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-updates">Product updates</Label>
                    <Switch
                      id="email-updates"
                      checked={settings.detailedNotifications.email.updates}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.email.updates', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-reminders">Reminders</Label>
                    <Switch
                      id="email-reminders"
                      checked={settings.detailedNotifications.email.reminders}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.email.reminders', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-marketing">Marketing emails</Label>
                    <Switch
                      id="email-marketing"
                      checked={settings.detailedNotifications.email.marketing}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.email.marketing', checked)
                      }
                    />
                  </div>
                </div>

                <Separator />

                <h3 className="font-semibold">Push Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-enabled">Enable push notifications</Label>
                    <Switch
                      id="push-enabled"
                      checked={settings.detailedNotifications.push.enabled}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.push.enabled', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-security">Security alerts</Label>
                    <Switch
                      id="push-security"
                      checked={settings.detailedNotifications.push.security}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.push.security', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-updates">Product updates</Label>
                    <Switch
                      id="push-updates"
                      checked={settings.detailedNotifications.push.updates}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('detailedNotifications.push.updates', checked)
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="frequency">Notification Frequency</Label>
                  <Select
                    value={settings.detailedNotifications.frequency}
                    onValueChange={(value) => 
                      handleSettingsChange('detailedNotifications.frequency', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                      <SelectItem value="monthly">Monthly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy and data sharing preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Profile Visibility</h3>
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Who can see your profile</Label>
                  <Select
                    value={settings.privacy.profileVisibility}
                    onValueChange={(value) => 
                      handleSettingsChange('privacy.profileVisibility', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="contacts-only">Contacts Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <h3 className="font-semibold">Information Sharing</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-email">Show email address</Label>
                    <Switch
                      id="show-email"
                      checked={settings.privacy.showEmail}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.showEmail', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-phone">Show phone number</Label>
                    <Switch
                      id="show-phone"
                      checked={settings.privacy.showPhone}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.showPhone', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-location">Show location</Label>
                    <Switch
                      id="show-location"
                      checked={settings.privacy.showLocation}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.showLocation', checked)
                      }
                    />
                  </div>
                </div>

                <Separator />

                <h3 className="font-semibold">Data Sharing</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="analytics">Analytics data</Label>
                    <Switch
                      id="analytics"
                      checked={settings.privacy.dataSharing.analytics}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.dataSharing.analytics', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="marketing">Marketing data</Label>
                    <Switch
                      id="marketing"
                      checked={settings.privacy.dataSharing.marketing}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.dataSharing.marketing', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="third-party">Third-party sharing</Label>
                    <Switch
                      id="third-party"
                      checked={settings.privacy.dataSharing.thirdParty}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('privacy.dataSharing.thirdParty', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Privacy Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>Customize your application experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Appearance</h3>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => handleSettingsChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <h3 className="font-semibold">Language & Region</h3>
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={settings.communication.preferredLanguage}
                      onValueChange={(value) => 
                        handleSettingsChange('communication.preferredLanguage', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.communication.timezone}
                      onValueChange={(value) => 
                        handleSettingsChange('communication.timezone', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <h3 className="font-semibold">CV Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save">Auto-save</Label>
                    <Switch
                      id="auto-save"
                      checked={settings.preferences.cv.autoSave}
                      onCheckedChange={(checked) => 
                        handleSettingsChange('preferences.cv.autoSave', checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-format">Default export format</Label>
                    <Select
                      value={settings.preferences.cv.exportFormat}
                      onValueChange={(value) => 
                        handleSettingsChange('preferences.cv.exportFormat', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word Document</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
