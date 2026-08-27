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
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
            {/* Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Alert <span className="text-emerald-500">Center</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                        Manage Notifications • Multiple Channels
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="flex items-center gap-2 bg-white/5 border border-white/5 p-1 rounded-2xl w-fit">
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
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/40 hover:text-white"
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Telemetry Tab */}
                <TabsContent value="overview" className="space-y-10 mt-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Sent', val: '1,234', icon: Send, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { label: 'Click Rate', val: '45.2%', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                            { label: 'Active Offers', val: '3', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        ].map((m, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between h-36 group hover:bg-white/[0.08] transition-all shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                                        <m.icon className="w-6 h-6" />
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{m.label}</p>
                                    <p className="text-3xl font-black text-white">{m.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center h-[300px]">
                        <div className="p-4 bg-white/5 rounded-2xl mb-4">
                            <Activity className="w-8 h-8 text-white/20" />
                        </div>
                        <h4 className="text-white/40 font-black uppercase tracking-widest text-xs">Live Activity</h4>
                        <p className="text-white/20 text-[10px] uppercase font-bold mt-2">No notifications sent recently</p>
                    </div>
                </TabsContent>

                {/* Broadcast Tab */}
                <TabsContent value="send" className="mt-10">
                    <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-white/2">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Create Notification</h3>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Send alert to specific groups</p>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Category</Label>
                                    <Select value={notificationForm.type} onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v as NotificationType })}>
                                        <SelectTrigger className="bg-black/40 border-white/5 focus:ring-emerald-500/20 rounded-2xl py-6 text-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                            <SelectItem value="system_update">App Update</SelectItem>
                                            <SelectItem value="discount_offer">Discount Offer</SelectItem>
                                            <SelectItem value="achievement">User Milestone</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Target Users</Label>
                                    <Select value={notificationForm.targetAudience} onValueChange={(v) => setNotificationForm({ ...notificationForm, targetAudience: v })}>
                                        <SelectTrigger className="bg-black/40 border-white/5 focus:ring-emerald-500/20 rounded-2xl py-6 text-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="free">Free Users</SelectItem>
                                            <SelectItem value="paid">Premium Users</SelectItem>
                                            <SelectItem value="new">New Users</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Title</Label>
                                <Input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} className="bg-black/40 border-white/5 focus:border-emerald-500/50 rounded-2xl py-6 text-white" placeholder="Notification title" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Message</Label>
                                <Textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} className="bg-black/40 border-white/5 focus:border-emerald-500/50 rounded-2xl min-h-[120px] text-white" placeholder="Enter message here..." />
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Platforms</Label>
                                <div className="flex gap-6">
                                    {['in-app', 'email'].map(channel => (
                                        <label key={channel} className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${notificationForm.channels.includes(channel) ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-transparent group-hover:border-white/20'}`}>
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={notificationForm.channels.includes(channel)} onChange={(e) => {
                                                const channels = e.target.checked ? [...notificationForm.channels, channel] : notificationForm.channels.filter(c => c !== channel);
                                                setNotificationForm({ ...notificationForm, channels });
                                            }} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${notificationForm.channels.includes(channel) ? 'text-white' : 'text-white/20'}`}>{channel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSendNotification} disabled={sending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl py-8 shadow-lg shadow-emerald-500/20 uppercase tracking-[0.2em] text-xs">
                                {sending ? 'Sending...' : 'Send Alert Now'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Test Lab Tab */}
                <TabsContent value="test" className="mt-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="p-8 border-b border-white/5 bg-white/2">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Verify single user alert</h3>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Send test alert to a specific ID</p>
                                </div>
                                <div className="p-10 space-y-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">User ID</Label>
                                        <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} className="bg-black/40 border-white/5 focus:border-emerald-500/50 rounded-2xl py-6 text-white font-mono text-xs" placeholder="Paste MongoDB User ID" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Alert Type</Label>
                                            <Select value={testType} onValueChange={(v) => setTestType(v as NotificationType)}>
                                                <SelectTrigger className="bg-black/40 border-white/5 rounded-2xl py-6 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                                    <SelectItem value="system_update">App Update</SelectItem>
                                                    <SelectItem value="discount_offer">Discount</SelectItem>
                                                    <SelectItem value="job_applied">Status Change</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Importance</Label>
                                            <Select value={testPriority} onValueChange={(v) => setTestPriority(v as NotificationPriority)}>
                                                <SelectTrigger className="bg-black/40 border-white/5 rounded-2xl py-6 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button onClick={handleSendTestNotification} disabled={testLoading || !testUserId} className="w-full bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl py-8 border border-white/5 uppercase tracking-[0.2em] text-xs transition-all">
                                        {testLoading ? 'Sending...' : 'Send Test Alert'}
                                    </Button>

                                    <AnimatePresence>
                                        {testResult && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl flex items-center gap-3 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{testResult.message}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8">Quick Actions</h3>
                                <div className="space-y-4">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between bg-emerald-500 text-white border-none hover:bg-emerald-400 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px]"
                                        onClick={handleSendAllTestTypes}
                                        disabled={sendingAllTest || !testUserId}
                                    >
                                        Send All Test Types
                                        <Zap className="h-4 w-4" />
                                    </Button>

                                    <div className="pt-8 border-t border-white/5">
                                        <Label className="mb-4 block text-[9px] uppercase font-black tracking-widest text-white/20">Saved Templates</Label>
                                        <div className="space-y-2">
                                            {[
                                                { name: 'App Update', icon: Shield },
                                                { name: 'System Error', icon: AlertCircle },
                                                { name: 'Rewards', icon: Sparkles }
                                            ].map((t, i) => (
                                                <button
                                                    key={i}
                                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                                                >
                                                    <span className="text-[10px] font-black text-white/40 group-hover:text-white uppercase tracking-widest">{t.name}</span>
                                                    <t.icon className="w-4 h-4 text-white/20 group-hover:text-emerald-400" />
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
                <TabsContent value="history" className="mt-10">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="p-6 bg-white/5 rounded-3xl mb-6">
                            <History className="h-12 w-12 text-white/10" />
                        </div>
                        <h4 className="text-white/40 font-black uppercase tracking-widest text-sm">Notification History</h4>
                        <p className="text-white/20 text-[10px] uppercase font-bold mt-4 leading-relaxed max-w-sm">History is currently being prepared for display. Check back soon for full access.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
