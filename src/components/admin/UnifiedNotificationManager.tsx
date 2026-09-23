'use client';

import React, { useState, useEffect } from 'react';
import {
    Send, Users, Target, DollarSign, BarChart3, Plus, X, Bell, CheckCircle, 
    XCircle, AlertCircle, Megaphone, Beaker, History, Zap, Shield, Sparkles,
    TrendingUp, ArrowUpRight, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { NotificationType, NotificationPriority } from '@/models/Notification';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnifiedNotificationManager() {
    const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'test' | 'offers' | 'history'>('overview');
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
    const [testTitle, setTestTitle] = useState('Test Alert');
    const [testMessage, setTestMessage] = useState('This is an automated system test.');
    const [testPriority, setTestPriority] = useState<NotificationPriority>('medium');
    const [testInteractive, setTestInteractive] = useState(false);
    const [testActionType, setTestActionType] = useState('');
    const [testActionUrl, setTestActionUrl] = useState('');
    const [testChannels, setTestChannels] = useState<('in-app' | 'email')[]>(['in-app']);
    const [sendingAllTest, setSendingAllTest] = useState(false);

    const handleSendNotification = async () => {
        setSending(true);
        try {
            const response = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationForm),
            });

            if (response.ok) {
                toast({ title: 'Alert Sent', description: 'All targeted users have been notified.' });
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
            }
        } catch (error) {
            toast({ title: 'Failed to send alert', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const handleSendTestNotification = async () => {
        if (!testUserId) {
            toast({ title: 'User ID Required', variant: 'destructive' });
            return;
        }
        setTestLoading(true);
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
                    channels: testChannels,
                    persistent: false,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setTestResult({ success: true, message: 'Test alert sent successfully' });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
        } finally {
            setTestLoading(false);
        }
    };

    const handleSendAllTestTypes = async () => {
        if (!testUserId) return;
        setSendingAllTest(true);
        try {
            const response = await fetch('/api/notifications/send-all-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: testUserId }),
            });
            const data = await response.json();
            if (data.success) toast({ title: 'All test types sent' });
        } catch (error: any) {
            toast({ title: 'Test Failed', variant: 'destructive' });
        } finally {
            setSendingAllTest(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0 }
    };

    if (!mounted) return null;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Command Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Notification & Alert Center
                    </h1>
                    <p className="text-xs text-white/40 mt-0.5">
                        Manage system-wide broadcasts, offers, test dispatches, and channel delivery
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl w-fit">
                    {[
                        { id: 'overview', icon: BarChart3, label: 'Overview' },
                        { id: 'send', icon: Megaphone, label: 'Send Alert' },
                        { id: 'test', icon: Beaker, label: 'Send Test' },
                        { id: 'offers', icon: DollarSign, label: 'Offers' },
                        { id: 'history', icon: History, label: 'History' }
                    ].map(tab => (
                        <TabsTrigger 
                            key={tab.id} 
                            value={tab.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/50 hover:text-white"
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Telemetry Tab */}
                <TabsContent value="overview" className="space-y-5 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Sent', val: '1,234', icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                            { label: 'Click Rate', val: '45.2%', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Active Offers', val: '3', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        ].map((m, i) => (
                            <div key={i} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-28 group hover:border-white/10 transition-all shadow-lg">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                                        <m.icon className="w-4 h-4" />
                                    </div>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
                                    <p className="text-2xl font-black text-white tracking-tight">{m.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#111216] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                        <div className="p-3 bg-white/5 rounded-xl mb-3">
                            <Activity className="w-6 h-6 text-white/30" />
                        </div>
                        <h4 className="text-white/60 font-bold text-xs uppercase tracking-wider">Live Activity</h4>
                        <p className="text-white/30 text-xs mt-1">No notifications sent recently</p>
                    </div>
                </TabsContent>

                {/* Broadcast Tab */}
                <TabsContent value="send" className="mt-4">
                    <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 sm:p-5 border-b border-white/5">
                            <h3 className="text-sm font-bold text-white tracking-tight">Create Notification</h3>
                            <p className="text-xs text-white/40 mt-0.5">Send alert to specific groups</p>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Category</Label>
                                    <Select value={notificationForm.type} onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v as NotificationType })}>
                                        <SelectTrigger className="bg-black/40 border-white/10 focus:ring-emerald-500/20 rounded-xl h-9 text-xs text-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                            <SelectItem value="system_update">App Update</SelectItem>
                                            <SelectItem value="discount_offer">Discount Offer</SelectItem>
                                            <SelectItem value="achievement">User Milestone</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Target Users</Label>
                                    <Select value={notificationForm.targetAudience} onValueChange={(v) => setNotificationForm({ ...notificationForm, targetAudience: v })}>
                                        <SelectTrigger className="bg-black/40 border-white/10 focus:ring-emerald-500/20 rounded-xl h-9 text-xs text-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="free">Free Users</SelectItem>
                                            <SelectItem value="paid">Premium Users</SelectItem>
                                            <SelectItem value="new">New Users</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Title</Label>
                                <Input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} className="bg-black/40 border-white/10 focus:border-emerald-500/50 rounded-xl h-9 text-xs text-white" placeholder="Notification title" />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Message</Label>
                                <Textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} className="bg-black/40 border-white/10 focus:border-emerald-500/50 rounded-xl min-h-[90px] text-xs text-white resize-none" placeholder="Enter message here..." />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Platforms</Label>
                                <div className="flex gap-4">
                                    {['in-app', 'email'].map(channel => (
                                        <label key={channel} className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${notificationForm.channels.includes(channel) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-transparent group-hover:border-white/20'}`}>
                                                <CheckCircle className="w-3 h-3" />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={notificationForm.channels.includes(channel)} onChange={(e) => {
                                                const channels = e.target.checked ? [...notificationForm.channels, channel] : notificationForm.channels.filter(c => c !== channel);
                                                setNotificationForm({ ...notificationForm, channels });
                                            }} />
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${notificationForm.channels.includes(channel) ? 'text-white' : 'text-white/40'}`}>{channel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSendNotification} disabled={sending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-2.5 text-xs shadow-md">
                                {sending ? 'Sending...' : 'Send Alert Now'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Test Lab Tab */}
                <TabsContent value="test" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                                <div className="p-4 sm:p-5 border-b border-white/5">
                                    <h3 className="text-sm font-bold text-white tracking-tight">Verify Single User Alert</h3>
                                    <p className="text-xs text-white/40 mt-0.5">Send test alert to a specific ID</p>
                                </div>
                                <div className="p-4 sm:p-5 space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">User ID</Label>
                                        <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} className="bg-black/40 border-white/10 focus:border-emerald-500/50 rounded-xl h-9 text-white font-mono text-xs" placeholder="Paste MongoDB User ID" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Alert Type</Label>
                                            <Select value={testType} onValueChange={(v) => setTestType(v as NotificationType)}>
                                                <SelectTrigger className="bg-black/40 border-white/10 rounded-xl h-9 text-xs text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                                    <SelectItem value="system_update">App Update</SelectItem>
                                                    <SelectItem value="discount_offer">Discount</SelectItem>
                                                    <SelectItem value="job_applied">Status Change</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Importance</Label>
                                            <Select value={testPriority} onValueChange={(v) => setTestPriority(v as NotificationPriority)}>
                                                <SelectTrigger className="bg-black/40 border-white/10 rounded-xl h-9 text-xs text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button onClick={handleSendTestNotification} disabled={testLoading || !testUserId} className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl py-2.5 border border-white/10 text-xs transition-all">
                                        {testLoading ? 'Sending...' : 'Send Test Alert'}
                                    </Button>

                                    <AnimatePresence>
                                        {testResult && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl flex items-center gap-2 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                <span className="text-xs font-semibold">{testResult.message}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-xl py-2 text-xs font-semibold shadow-md"
                                        onClick={handleSendAllTestTypes}
                                        disabled={sendingAllTest || !testUserId}
                                    >
                                        Send All Test Types
                                        <Zap className="h-3.5 w-3.5" />
                                    </Button>

                                    <div className="pt-4 border-t border-white/5">
                                        <Label className="mb-2 block text-[10px] uppercase font-bold tracking-wider text-white/40">Saved Templates</Label>
                                        <div className="space-y-1.5">
                                            {[
                                                { name: 'App Update', icon: Shield },
                                                { name: 'System Error', icon: AlertCircle },
                                                { name: 'Rewards', icon: Sparkles }
                                            ].map((t, i) => (
                                                <button
                                                    key={i}
                                                    className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all group text-xs text-white/60 hover:text-white"
                                                >
                                                    <span className="font-semibold">{t.name}</span>
                                                    <t.icon className="w-3.5 h-3.5 text-white/30 group-hover:text-emerald-400" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4">
                    <div className="bg-[#111216] border border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-xl">
                        <div className="p-4 bg-white/5 rounded-2xl mb-3">
                            <History className="h-8 w-8 text-white/30" />
                        </div>
                        <h4 className="text-white/70 font-bold text-sm">Notification History</h4>
                        <p className="text-white/30 text-xs mt-1 max-w-sm">History is currently being prepared for display. Check back soon for full access.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
