'use client';

import React, { useState } from 'react';
import { Send, Users, Target, DollarSign, BarChart3, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { NotificationType } from '@/models/Notification';

export default function NotificationManager() {
  const [activeTab, setActiveTab] = useState<'send' | 'offers' | 'analytics'>('send');
  const [sending, setSending] = useState(false);

  // Send notification form state
  const [notificationForm, setNotificationForm] = useState({
    type: 'system_update' as NotificationType,
    title: '',
    message: '',
    targetAudience: 'all',
    planFilter: '',
    channels: ['in-app'],
    persistent: false,
    expiresAt: '',
  });

  // Discount offer form state
  const [offerForm, setOfferForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'amount',
    value: '',
    expiryDate: '',
    targetAudience: 'all',
    planFilter: '',
    title: '',
    message: '',
  });

  const handleSendNotification = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationForm),
      });

      if (response.ok) {
        alert('Notification sent successfully!');
        // Reset form
        setNotificationForm({
          type: 'system_update',
          title: '',
          message: '',
          targetAudience: 'all',
          planFilter: '',
          channels: ['in-app'],
          persistent: false,
          expiresAt: '',
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateOffer = async () => {
    try {
      const response = await fetch('/api/admin/notifications/create-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerForm),
      });

      if (response.ok) {
        alert('Discount offer created and sent successfully!');
        // Reset form
        setOfferForm({
          code: '',
          discountType: 'percentage',
          value: '',
          expiryDate: '',
          targetAudience: 'all',
          planFilter: '',
          title: '',
          message: '',
        });
      } else {
        throw new Error('Failed to create offer');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      alert('Failed to create offer. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Notification Manager</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Send notifications and manage promotional offers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="offers">
            <DollarSign className="h-4 w-4 mr-2" />
            Discount Offers
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>
                Send a notification to all users or a specific segment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Notification Type</Label>
                <Select
                  value={notificationForm.type}
                  onValueChange={(value) =>
                    setNotificationForm({ ...notificationForm, type: value as NotificationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_update">System Update</SelectItem>
                    <SelectItem value="discount_offer">Discount Offer</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={notificationForm.title}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, title: e.target.value })
                  }
                  placeholder="Notification title"
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={notificationForm.message}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, message: e.target.value })
                  }
                  placeholder="Notification message"
                  rows={4}
                />
              </div>

              <div>
                <Label>Target Audience</Label>
                <Select
                  value={notificationForm.targetAudience}
                  onValueChange={(value) =>
                    setNotificationForm({ ...notificationForm, targetAudience: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="free">Free Plan Users</SelectItem>
                    <SelectItem value="paid">Paid Plan Users</SelectItem>
                    <SelectItem value="new">New Users (Last 30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Delivery Channels</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationForm.channels.includes('in-app')}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...notificationForm.channels, 'in-app']
                          : notificationForm.channels.filter((c) => c !== 'in-app');
                        setNotificationForm({ ...notificationForm, channels });
                      }}
                    />
                    <Label>In-App</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationForm.channels.includes('email')}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...notificationForm.channels, 'email']
                          : notificationForm.channels.filter((c) => c !== 'email');
                        setNotificationForm({ ...notificationForm, channels });
                      }}
                    />
                    <Label>Email</Label>
                  </div>
                </div>
              </div>

              <Button onClick={handleSendNotification} disabled={sending}>
                {sending ? 'Sending...' : 'Send Notification'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Discount Offer</CardTitle>
              <CardDescription>
                Create and send a promotional discount offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Discount Code</Label>
                <Input
                  value={offerForm.code}
                  onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })}
                  placeholder="SUMMER2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={offerForm.discountType}
                    onValueChange={(value: any) =>
                      setOfferForm({ ...offerForm, discountType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={offerForm.value}
                    onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })}
                    placeholder={offerForm.discountType === 'percentage' ? '20' : '50'}
                  />
                </div>
              </div>

              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={offerForm.expiryDate}
                  onChange={(e) => setOfferForm({ ...offerForm, expiryDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Offer Title</Label>
                <Input
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  placeholder="Special Summer Offer!"
                />
              </div>

              <div>
                <Label>Offer Message</Label>
                <Textarea
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                  placeholder="Get 20% off on all plans..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Target Audience</Label>
                <Select
                  value={offerForm.targetAudience}
                  onValueChange={(value) =>
                    setOfferForm({ ...offerForm, targetAudience: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="free">Free Plan Users</SelectItem>
                    <SelectItem value="paid">Paid Plan Users</SelectItem>
                    <SelectItem value="new">New Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateOffer}>Create & Send Offer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Analytics</CardTitle>
              <CardDescription>View notification performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

