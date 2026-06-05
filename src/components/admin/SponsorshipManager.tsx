"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle, Loader2, Database, Shield, Zap, Globe, ArrowUpRight, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';

export default function SponsorshipManager() {
    const { toast } = useToast();
    const [country, setCountry] = useState<'uk' | 'us'>('uk');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<{ imported: number; updated: number; errors: number; message?: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ title: "No file selected", variant: "destructive" });
            return;
        }

        setLoading(true);
        setStats(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('country', country);

        try {
            const response = await fetch('/api/admin/sponsorships/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Update Failed");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Stream Reader Missing");

            const decoder = new TextDecoder();
            let buffer = '';

            toast({ title: "Syncing Data", description: "Updating records in database..." });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        if (event.type === 'complete') {
                            setStats(event.stats);
                            setFile(null);
                            toast({ title: "Database Updated", description: event.message });
                        }
                    } catch (err) {}
                }
            }
        } catch (error: any) {
            toast({ title: "Sync Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    if (!mounted) return null;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
            {/* Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Data <span className="text-emerald-500">Center</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                        Manage Sponsorship Records • UK & USA
                    </p>
                </div>
            </div>

            {/* Sector Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Records', val: country === 'uk' ? '64K' : '142K', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Accuracy', val: '99.9%', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Update Speed', val: 'Fast', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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

            <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="p-8 border-b border-white/5 bg-white/2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Database className="w-5 h-5 text-emerald-500" />
                        Sync Records
                    </h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Export or Import Database Entries</p>
                </div>

                <div className="p-10">
                    <Tabs value={country} onValueChange={(v) => setCountry(v as 'uk' | 'us')} className="space-y-10">
                        <TabsList className="bg-white/5 border border-white/5 p-1 rounded-2xl w-fit">
                            <TabsTrigger value="uk" className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-white/40">UK Records</TabsTrigger>
                            <TabsTrigger value="us" className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-white/40">USA Records</TabsTrigger>
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={country} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-emerald-400 font-black uppercase tracking-widest text-xs">File Requirements ({country.toUpperCase()})</h4>
                                        <ul className="grid grid-cols-1 gap-3 text-[10px] font-bold text-emerald-400/60 uppercase tracking-[0.15em]">
                                            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Company Name Mapping</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> License / Tax ID</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Status & Expiry Data</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                        <a 
                                            href={`/api/admin/sponsorships/download?country=${country}`}
                                            download
                                            className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 text-white/60 hover:text-white"
                                        >
                                            <FileText className="w-4 h-4 text-emerald-500" />
                                            Download Current Dataset
                                        </a>
                                        <p className="text-[8px] text-center text-white/20 font-black uppercase tracking-widest">Last Export: Today</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="space-y-8 pt-10 border-t border-white/5">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Upload Data (.CSV)</Label>
                                <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] border-dashed group hover:border-emerald-500/30 transition-all text-center">
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <Input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="bg-white/5 border-white/5 text-white/40 file:bg-white/10 file:text-white file:border-0 file:rounded-xl file:px-6 file:py-2 file:mr-4 hover:file:bg-emerald-500 hover:file:text-black transition-all cursor-pointer h-16 flex items-center max-w-sm mx-auto"
                                    />
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-6">Maximum File Size: 4MB</p>
                                </div>
                            </div>

                            {stats && (
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-10 bg-white/[0.05] border border-emerald-500/20 rounded-[2.5rem] shadow-xl">
                                    <div className="flex items-center gap-3 mb-8">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-black text-white uppercase tracking-widest">Update Successful</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8">
                                        <div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">New Entries</span>
                                            <span className="text-3xl font-black text-emerald-500">{stats.imported.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Updated</span>
                                            <span className="text-3xl font-black text-blue-500">{stats.updated.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Errors</span>
                                            <span className="text-3xl font-black text-red-500">{stats.errors.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl py-8 shadow-lg shadow-emerald-500/20 uppercase tracking-[0.2em] text-xs transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Updating Records...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-5 w-5" />
                                        Sync Now
                                    </>
                                )}
                            </Button>
                        </div>
                    </Tabs>
                </div>
            </div>
        </motion.div>
    );
}
