'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MessageSquare, LayoutTemplate, ArrowUpRight, Globe, Zap, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContentAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

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
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
            {/* Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Content <span className="text-emerald-500">Analytics</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                        Layout Performance • Social Proof Telemetry
                    </p>
                </div>
            </div>

            {/* Content Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Blueprints', val: data?.totalTemplates || 0, sub: 'Layout Nodes', icon: LayoutTemplate, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Signal Feedback', val: data?.totalTestimonials || 0, sub: 'Identity Reviews', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Global Velocity', val: `${data?.globalVelocity || 0}%`, sub: 'Ingestion Rate', icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Market Reach', val: Math.round(data?.marketReach || 0).toLocaleString(), sub: 'Nodes Influenced', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((m, i) => (
                    <motion.div key={i} variants={item} className="bg-[#111111] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-between h-44 group hover:border-white/20 transition-all shadow-2xl">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                                <m.icon className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">{m.label}</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{m.val}</p>
                            <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest mt-1">{m.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Popular Layouts Chart */}
                <motion.div variants={item} className="lg:col-span-7 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Layout Saturation</h3>
                            <p className="text-white/30 text-xs font-bold mt-1 uppercase tracking-widest">Blueprint Usage Frequency</p>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.popularTemplates}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Categories Matrix */}
                <motion.div variants={item} className="lg:col-span-5 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Sector Clusters</h3>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-10">Layout Classification Density</p>
                    
                    <div className="flex-1 relative min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={data.templatesByCategory} 
                                    cx="50%" cy="50%" 
                                    innerRadius={80} outerRadius={110} 
                                    paddingAngle={10} dataKey="count" nameKey="_id" stroke="none"
                                >
                                    {data.templatesByCategory.map((entry: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Diversity Index</span>
                            <span className="text-3xl font-black text-white">{(data.templatesByCategory.length / data.totalTemplates * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-10">
                        {data.templatesByCategory.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate">{item._id}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
