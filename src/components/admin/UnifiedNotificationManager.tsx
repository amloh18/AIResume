'use client';

import React, { useState, useEffect } from 'react';
import {
    Send,
    Users,
    Target,
    DollarSign,
    BarChart3,
    Plus,
    X,
    Bell,
    CheckCircle,
    XCircle,
    AlertCircle,
    Megaphone,
    Beaker,
    History
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { NotificationType, NotificationPriority } from '@/models/Notification';

export default function UnifiedNotificationManager() {
    const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'test' | 'offers' | 'history'>('overview');
    const { toast } = useToast();

    // --- Send Notification State ---
    const [sending, setSending] = useState(false);
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

    // --- Test Notification State ---
    const [testUserId, setTestUserId] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [testType, setTestType] = useState<NotificationType>('system_update');
    const [testTitle, setTestTitle] = useState('Test Notification');
    const [testMessage, setTestMessage] = useState('This is a test notification.');
    const [testPriority, setTestPriority] = useState<NotificationPriority>('medium');
    const [testInteractive, setTestInteractive] = useState(false);
    const [testActionType, setTestActionType] = useState('');
    const [testActionUrl, setTestActionUrl] = useState('');
    const [sendingAllTest, setSendingAllTest] = useState(false);

    // --- Discount Offer State ---
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

    // --- Handlers ---

    const handleSendNotification = async () => {
        setSending(true);
        try {
            const response = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationForm),
            });

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Notification sent successfully!',
                });
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
            toast({
                title: 'Error',
                description: 'Failed to send notification. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    const handleSendTestNotification = async () => {
        if (!testUserId) {
            toast({
                title: 'Error',
                description: 'Please enter a user ID',
                variant: 'destructive',
            });
            return;
        }

        setTestLoading(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/notifications/create-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: testUserId,
                    type: testType,
                    title: testTitle,
                    message: testMessage,
                    priority: testPriority,
                    actionType: testActionType || undefined,
                    actionData: testActionUrl ? { url: testActionUrl } : undefined,
                    interactive: testInteractive,
                    channels: ['in-app', 'email'],
                    persistent: false,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setTestResult({ success: true, message: 'Test notification sent!' });
                toast({
                    title: 'Success',
                    description: 'Test notification sent successfully.',
                });
            } else {
                setTestResult({ success: false, message: data.error || 'Failed' });
                toast({
                    title: 'Error',
                    description: data.error || 'Failed to send test notification',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setTestLoading(false);
        }
    };

    const handleSendAllTestTypes = async () => {
        if (!testUserId) {
            toast({
                title: 'Error',
                description: 'Please enter a user ID first',
                variant: 'destructive',
            });
            return;
        }

        setSendingAllTest(true);
        try {
            const response = await fetch('/api/notifications/send-all-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: testUserId }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Success',
                    description: `Sent ${data.summary.success} notifications successfully!`,
                });
                setTestResult({ success: true, message: `Sent ${data.summary.success} notifications!` });
            } else {
                toast({
                    title: 'Error',
                    description: data.error || 'Failed',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setSendingAllTest(false);
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
                toast({
                    title: 'Success',
                    description: 'Discount offer created and sent successfully!',
                });
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
            toast({
                title: 'Error',
                description: 'Failed to create offer.',
                variant: 'destructive',
            });
        }
    };

    const quickTestTemplates = [
        {
            name: 'System Update',
            type: 'system_update' as NotificationType,
            title: 'System Update',
            message: 'We\'ve made some improvements to the platform.',
            priority: 'low' as NotificationPriority,
            interactive: false,
        },
        {
            name: 'Urgent Alert',
            type: 'system_update' as NotificationType,
            title: 'Urgent: Action Required',
            message: 'Your account requires immediate attention.',
            priority: 'urgent' as NotificationPriority,
            interactive: true,
            actionType: 'view_offer',
            actionUrl: '/dashboard/settings',
        },
    ];

    const loadTestTemplate = (template: typeof quickTestTemplates[0]) => {
        setTestType(template.type);
        setTestTitle(template.title);
        setTestMessage(template.message);
        setTestPriority(template.priority);
        setTestInteractive(template.interactive || false);
        setTestActionType(template.actionType || '');
        setTestActionUrl(template.actionUrl || '');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Center</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage, send, and test notifications</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="send">
                        <Megaphone className="h-4 w-4 mr-2" />
                        Send Broadcast
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <Beaker className="h-4 w-4 mr-2" />
                        Test Lab
                    </TabsTrigger>
                    <TabsTrigger value="offers">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Offers
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="h-4 w-4 mr-2" />
                        History
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Total Sent (30d)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">1,234</div>
                                <p className="text-xs text-green-500 flex items-center mt-1">
                                    <span className="mr-1">↑</span> 12% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Open Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">45.2%</div>
                                <p className="text-xs text-green-500 flex items-center mt-1">
                                    <span className="mr-1">↑</span> 2.1% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Active Offers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">3</div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Expiring soon: SUMMER2024
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest notification events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500 text-center py-8">
                                No recent activity to display.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Send Broadcast Tab */}
                <TabsContent value="send" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Broadcast Notification</CardTitle>
                            <CardDescription>Send a message to all users or specific segments.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
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
                                <div className="space-y-2">
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
                            </div>

                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={notificationForm.title}
                                    onChange={(e) =>
                                        setNotificationForm({ ...notificationForm, title: e.target.value })
                                    }
                                    placeholder="e.g., New Feature Alert!"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea
                                    value={notificationForm.message}
                                    onChange={(e) =>
                                        setNotificationForm({ ...notificationForm, message: e.target.value })
                                    }
                                    placeholder="Enter your message here..."
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Delivery Channels</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationForm.channels.includes('in-app')}
                                            onChange={(e) => {
                                                const channels = e.target.checked
                                                    ? [...notificationForm.channels, 'in-app']
                                                    : notificationForm.channels.filter((c) => c !== 'in-app');
                                                setNotificationForm({ ...notificationForm, channels });
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        <span>In-App</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationForm.channels.includes('email')}
                                            onChange={(e) => {
                                                const channels = e.target.checked
                                                    ? [...notificationForm.channels, 'email']
                                                    : notificationForm.channels.filter((c) => c !== 'email');
                                                setNotificationForm({ ...notificationForm, channels });
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        <span>Email</span>
                                    </label>
                                </div>
                            </div>

                            <Button onClick={handleSendNotification} disabled={sending} className="w-full sm:w-auto">
                                {sending ? 'Sending...' : 'Send Broadcast'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Test Lab Tab */}
                <TabsContent value="test" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Test Configuration</CardTitle>
                                    <CardDescription>Send a specific notification to a single user for testing.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Target User ID</Label>
                                        <Input
                                            value={testUserId}
                                            onChange={(e) => setTestUserId(e.target.value)}
                                            placeholder="Enter MongoDB User ID"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={testType} onValueChange={(v) => setTestType(v as NotificationType)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="system_update">System Update</SelectItem>
                                                    <SelectItem value="documents_ready">Documents Ready</SelectItem>
                                                    <SelectItem value="job_applied">Job Applied</SelectItem>
                                                    <SelectItem value="discount_offer">Discount Offer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <Select value={testPriority} onValueChange={(v) => setTestPriority(v as NotificationPriority)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Message</Label>
                                        <Textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={2} />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={testInteractive}
                                                onChange={(e) => setTestInteractive(e.target.checked)}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="font-medium">Interactive (Action Button)</span>
                                        </label>

                                        {testInteractive && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Action Type</Label>
                                                    <Input value={testActionType} onChange={(e) => setTestActionType(e.target.value)} placeholder="e.g. view_offer" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Action URL</Label>
                                                    <Input value={testActionUrl} onChange={(e) => setTestActionUrl(e.target.value)} placeholder="e.g. /dashboard" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Button onClick={handleSendTestNotification} disabled={testLoading || !testUserId} className="w-full">
                                        {testLoading ? 'Sending...' : 'Send Test Notification'}
                                    </Button>

                                    {testResult && (
                                        <div className={`p-3 rounded-md flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                            <span className="text-sm">{testResult.message}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={handleSendAllTestTypes}
                                        disabled={sendingAllTest || !testUserId}
                                    >
                                        <Bell className="mr-2 h-4 w-4" />
                                        Send All Types (Batch Test)
                                    </Button>

                                    <div className="pt-4 border-t">
                                        <Label className="mb-2 block text-xs uppercase text-gray-500">Load Template</Label>
                                        <div className="space-y-2">
                                            {quickTestTemplates.map((t, i) => (
                                                <Button
                                                    key={i}
                                                    variant="ghost"
                                                    className="w-full justify-start text-sm"
                                                    onClick={() => loadTestTemplate(t)}
                                                >
                                                    {t.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Offers Tab */}
                <TabsContent value="offers" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Discount Offer</CardTitle>
                            <CardDescription>Create and distribute promotional codes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={offerForm.code}
                                        onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })}
                                        placeholder="SUMMER2024"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Expiry Date</Label>
                                    <Input
                                        type="date"
                                        value={offerForm.expiryDate}
                                        onChange={(e) => setOfferForm({ ...offerForm, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={offerForm.discountType}
                                        onValueChange={(v: any) => setOfferForm({ ...offerForm, discountType: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Value</Label>
                                    <Input
                                        type="number"
                                        value={offerForm.value}
                                        onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })}
                                        placeholder="20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={offerForm.title}
                                    onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                                    placeholder="Special Summer Sale"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={offerForm.message}
                                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                                    placeholder="Get 20% off..."
                                />
                            </div>

                            <Button onClick={handleCreateOffer}>Create & Distribute Offer</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-gray-500">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Notification history log coming soon.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
