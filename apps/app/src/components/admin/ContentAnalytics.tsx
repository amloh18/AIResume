'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MessageSquare, LayoutTemplate, ArrowUpRight, Globe, Zap, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/hot-toast';

export default function ContentAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            try {
                const response = await fetch('/api/admin/analytics/content');
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b'];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">


            {/* Broadcast System Alert Panel */}
            <motion.div variants={item} className="bg-[#111216] border border-red-500/20 hover:border-red-500/30 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                        <Shield className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-tight">System Emergency Broadcast</h2>
                        <p className="text-[10px] text-white/40 font-medium mt-0.5">Send Global System-Wide In-App Push Alerts</p>
                    </div>
                </div>

                <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-col gap-1">
                        <label className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Alert Message Title</label>
                        <input
                            type="text"
                            placeholder="System Maintenance Scheduled"
                            id="alert-title"
                            defaultValue="System Maintenance Update"
                            className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Message Content</label>
                        <textarea
                          id="alert-message"
                          placeholder="Brief technical update notification description..."
                          rows={2}
                          className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-200 outline-none focus:border-red-500/30 transition-all resize-none"
                        />
                    </div>
                    <button
                        onClick={async () => {
                          if (isBroadcasting) return;
                          const title = (document.getElementById('alert-title') as HTMLInputElement)?.value || 'System Update';
                          const msg = (document.getElementById('alert-message') as HTMLTextAreaElement)?.value || 'AIResume platform performance optimizations are undergoing live maintenance.';
                          try {
                            setIsBroadcasting(true);
                            const res = await fetch('/api/notifications/send-all-types', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ title, message: msg, type: 'system_update', actionType: 'dismiss' })
                            });
                            if (res.ok) {
                              toast.success('System-wide notification queued for delivery');
                            } else {
                              const body = await res.json().catch(() => ({}));
                              toast.error(body.error || "Couldn't dispatch the broadcast. Try again.");
                            }
                          } catch (err) {
                            toast.error("Couldn't dispatch the broadcast. Check your connection and try again.");
                          } finally {
                            setIsBroadcasting(false);
                          }
                        }}
                        disabled={isBroadcasting}
                        className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isBroadcasting ? (
                            <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        ) : (
                            <Zap className="w-3.5 h-3.5" />
                        )}
                        {isBroadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}
                    </button>
                </div>
            </motion.div>

            {/* Content Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active Blueprints', val: data?.totalTemplates || 0, sub: 'Layout Nodes', icon: LayoutTemplate, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Signal Feedback', val: data?.totalTestimonials || 0, sub: 'Identity Reviews', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Global Velocity', val: `${data?.globalVelocity || 0}%`, sub: 'Ingestion Rate', icon: Globe, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Market Reach', val: Math.round(data?.marketReach || 0).toLocaleString(), sub: 'Nodes Influenced', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((m, i) => (
                    <motion.div key={i} variants={item} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-white/10 transition-all shadow-lg">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                                <m.icon className="w-4 h-4" />
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
                            <p className="text-2xl font-black text-white tracking-tight">{m.val}</p>
                            <p className="text-[10px] font-medium text-white/30">{m.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Popular Layouts Chart */}
                <motion.div variants={item} className="lg:col-span-7 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">Layout Saturation</h3>
                            <p className="text-xs text-white/40 mt-0.5">Blueprint Usage Frequency</p>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.popularTemplates}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Categories Matrix */}
                <motion.div variants={item} className="lg:col-span-5 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight mb-1">Sector Clusters</h3>
                        <p className="text-xs text-white/40 mb-4">Layout Classification Density</p>
                        
                        <div className="relative min-h-[160px]">
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie 
                                        data={data.templatesByCategory} 
                                        cx="50%" cy="50%" 
                                        innerRadius={55} outerRadius={80} 
                                        paddingAngle={6} dataKey="count" nameKey="_id" stroke="none"
                                    >
                                        {data.templatesByCategory.map((entry: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Diversity</span>
                                <span className="text-2xl font-black text-white">{(data.templatesByCategory.length / data.totalTemplates * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {data.templatesByCategory.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-[10px] font-semibold text-white/60 truncate">{item._id}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
