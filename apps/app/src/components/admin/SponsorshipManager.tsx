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
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">


            {/* Sector Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Records', val: country === 'uk' ? '64K' : '142K', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Accuracy', val: '99.9%', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Update Speed', val: 'Fast', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((m, i) => (
                    <div key={i} className="bg-[#111216] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-28 group hover:border-white/10 transition-all shadow-xl">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                                <m.icon className="w-4 h-4" />
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{m.label}</p>
                            <p className="text-xl font-bold text-white tracking-tight">{m.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative">
                <div className="p-4 sm:p-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            Sync Records
                        </h3>
                        <p className="text-xs text-white/40 mt-0.5">Export or import sponsorship database entries</p>
                    </div>
                </div>

                <div className="p-4 sm:p-5 space-y-5">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#0a0a0a] border border-white/5 w-fit">
                        <button
                            onClick={() => setCountry('uk')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${country === 'uk' ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            UK Records
                        </button>
                        <button
                            onClick={() => setCountry('us')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${country === 'us' ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            USA Records
                        </button>
                    </div>

                        <AnimatePresence mode="wait">
                            <motion.div key={country} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">File Requirements ({country.toUpperCase()})</h4>
                                        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-400/70">
                                            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Company Name Mapping</li>
                                            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> License / Tax ID</li>
                                            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Status & Expiry Data</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                                        <a 
                                            href={`/api/admin/sponsorships/download?country=${country}`}
                                            download
                                            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-semibold flex items-center justify-center gap-2 text-white/70 hover:text-white"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                            Download Dataset
                                        </a>
                                        <p className="text-[10px] text-white/30 font-medium">Last Export: Today</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/60">Upload Data (.CSV)</Label>
                                <div className="p-6 bg-white/[0.01] border border-white/10 rounded-xl border-dashed hover:border-emerald-500/40 transition-all text-center">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-3">
                                        <Upload className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <Input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="bg-white/5 border-white/10 text-white/60 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 hover:file:bg-emerald-600 hover:file:text-white transition-all cursor-pointer h-10 text-xs flex items-center max-w-sm mx-auto"
                                    />
                                    <p className="text-[10px] text-white/30 font-medium mt-3">Maximum File Size: 4MB • UTF-8 CSV</p>
                                </div>
                            </div>

                            {stats && (
                                <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-white/[0.03] border border-emerald-500/20 rounded-xl shadow-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-semibold text-white">Update Successful</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-0.5">New Entries</span>
                                            <span className="text-xl font-bold text-emerald-400">{stats.imported.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-0.5">Updated</span>
                                            <span className="text-xl font-bold text-blue-400">{stats.updated.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-0.5">Errors</span>
                                            <span className="text-xl font-bold text-red-400">{stats.errors.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-10 shadow-lg shadow-emerald-500/10 text-xs transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating Records...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        Sync Now
                                    </>
                                )}
                            </Button>
                        </div>
                </div>
            </div>
        </motion.div>
    );
}
