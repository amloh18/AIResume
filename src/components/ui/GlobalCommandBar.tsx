'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Briefcase, FileText, User, Mic, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalCommandBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const commands = [
        { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
        { id: 'tracker', title: 'Job Tracker', icon: Briefcase, route: '/dashboard/jobs' },
        { id: 'cv-builder', title: 'Master CV Builder', icon: FileText, route: '/editor' },
        { id: 'interview-coach', title: 'Interview Coach', icon: Mic, route: '/dashboard/interview' },
        { id: 'settings', title: 'Settings & Billing', icon: User, route: '/dashboard/settings' },
    ];

    const filteredCommands = commands.filter((cmd) =>
        cmd.title.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (route: string) => {
        setIsOpen(false);
        setSearch('');
        router.push(route);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="relative w-full max-w-xl bg-white dark:bg-[#141810] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
                    >
                        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent px-4 py-4 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                placeholder="Type a command or search..."
                            />
                            <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">ESC</div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {filteredCommands.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No results found.</div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredCommands.map((cmd) => {
                                        const Icon = cmd.icon;
                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={() => handleSelect(cmd.route)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-left group"
                                            >
                                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{cmd.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}