
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, CheckCircle, TrendingUp, Flame, 
    Filter, Plus, ChevronDown, Play, Star, 
    Target, MessageSquare, Lightbulb, MoreHorizontal, Info, Sparkles, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useUserData } from '@/lib/hooks/useUserData';

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    status: string;
    companyLogo?: string;
    location?: string;
    jobType?: string;
    appliedDate?: string;
    interviewCoach?: {
        readinessScore?: number;
        status?: string;
        modules?: any[];
        questions?: any[];
    };
}

interface Stats {
    totalOpportunities: number;
    completedSessions: number;
    averageScore: number;
    currentStreak: number;
}

interface InterviewCoachContainerProps {
    userId: string;
}

const InterviewCoachContainer: React.FC<InterviewCoachContainerProps> = ({ userId }) => {
    const router = useRouter();
    const { openPaymentModal } = usePaymentModal();
    const { userData, loading: userLoading } = useUserData();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalOpportunities: 0,
        completedSessions: 0,
        averageScore: 0,
        currentStreak: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/interview/dashboard');
            const data = await response.json();

            if (data.success) {
                setJobs(data.jobs || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleStartPractice = (jobId: string) => {
        router.push(`/dashboard/interview/${jobId}`);
    };

    const handleAddNewRole = () => {
        router.push('/dashboard/jobs');
    };

    const hasJobs = jobs.length > 0;

    // Filter jobs based on active tab
    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'All') return true;
        if (activeTab === 'In Progress') return job.interviewCoach?.status === 'ready';
        if (activeTab === 'Completed') return job.status.toLowerCase() === 'offer' || job.status.toLowerCase() === 'rejected'; // rough guess
        if (activeTab === 'Archived') return false; // placeholder
        return true;
    });

    const getJobIcon = (title: string, company: string) => {
        // Return first letter of company if available
        if (company) return company.charAt(0).toUpperCase();
        return title.charAt(0).toUpperCase();
    };

    const getIconBgColor = (company: string) => {
        const c = (company || '').toLowerCase();
        if (c.includes('google')) return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
        if (c.includes('microsoft')) return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
        if (c.includes('amazon')) return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
        if (c.includes('linkedin')) return 'bg-[#0A66C2] text-white';
        // random colors based on string length
        const colors = [
            'bg-blue-500 text-white',
            'bg-purple-500 text-white',
            'bg-pink-500 text-white',
            'bg-indigo-500 text-white',
            'bg-teal-500 text-white'
        ];
        return colors[c.length % colors.length];
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0c08] flex flex-col font-sans">
            <div className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-8 py-8 w-full">
                
                {/* Breadcrumbs & Header */}
                <div className="mb-8">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <span className="cursor-pointer hover:text-gray-900 transition-colors" onClick={() => router.push('/dashboard')}>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-900 dark:text-gray-200">Interview Coach</span>
                    </div>
                    <h1 className="text-3xl md:text-[32px] font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        Interview Coach
                        <Sparkles className="w-6 h-6 text-purple-500" />
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base">
                        Practice for your upcoming interviews with AI-powered coaching.
                    </p>
                </div>

                {/* Top Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {/* Total Opportunities */}
                    <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Opportunities</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{stats.totalOpportunities}</span>
                            <span className="text-[11px] text-gray-400">{stats.totalOpportunities > 0 ? 'Active interview prep' : 'Start preparing for your next role'}</span>
                        </div>
                    </div>

                    {/* Completed Sessions */}
                    <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 relative overflow-hidden">
                        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 z-10">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex flex-col z-10">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Completed Sessions</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{stats.completedSessions}</span>
                            <span className="text-[11px] text-gray-400">{stats.completedSessions > 0 ? 'Great job!' : 'No sessions completed yet'}</span>
                        </div>
                        {stats.completedSessions > 0 && (
                            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                                <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 40C20 40 20 20 40 20C60 20 60 10 80 10C90 10 95 5 100 0V40H0Z" fill="#22c55e" />
                                    <path d="M0 40C20 40 20 20 40 20C60 20 60 10 80 10C90 10 95 5 100 0" stroke="#22c55e" strokeWidth="2" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Average Score */}
                    <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 relative overflow-hidden">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 z-10">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex flex-col z-10">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Average Score</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{stats.averageScore > 0 ? `${stats.averageScore}%` : '-'}</span>
                            <span className="text-[11px] text-green-500 font-medium">{stats.averageScore > 0 ? '+12% vs last month' : <span className="text-gray-400 font-normal">Complete a session to see insights</span>}</span>
                        </div>
                        {stats.averageScore > 0 && (
                            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                                <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 40C15 40 20 30 35 30C50 30 55 15 70 15C85 15 90 5 100 0V40H0Z" fill="#3b82f6" />
                                    <path d="M0 40C15 40 20 30 35 30C50 30 55 15 70 15C85 15 90 5 100 0" stroke="#3b82f6" strokeWidth="2" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Current Streak */}
                    <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                            <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Streak</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{stats.currentStreak} days</span>
                            <span className="text-[11px] text-orange-500 font-medium">{stats.currentStreak > 0 ? 'Keep it up!' : 'Start your streak today!'}</span>
                        </div>
                    </div>
                </div>

                {/* Section Header: Your Opportunities */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Opportunities</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#141810]">
                            <Filter className="w-4 h-4" />
                            All Status
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        <button onClick={handleAddNewRole} className="flex items-center justify-center gap-2 px-4 py-2 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors w-full sm:w-auto">
                            <Plus className="w-4 h-4" />
                            New Opportunity
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-800 mb-6">
                    {['All', 'In Progress', 'Completed', 'Archived'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold transition-colors relative ${
                                activeTab === tab 
                                    ? 'text-purple-600 dark:text-purple-400' 
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                ) : !hasJobs ? (
                    /* Empty State (Image 1) */
                    <div className="flex flex-col items-center justify-center py-16 border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-[#141810] shadow-sm mb-8">
                        <div className="relative mb-6">
                            <div className="w-40 h-40 bg-purple-50 dark:bg-purple-900/10 rounded-full flex items-center justify-center relative z-10">
                                {/* Placeholder Graphic matching the clipboard */}
                                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="35" y="25" width="50" height="70" rx="4" fill="#a855f7" />
                                    <rect x="40" y="30" width="40" height="60" rx="2" fill="white" />
                                    <circle cx="60" cy="45" r="8" fill="#e9d5ff" />
                                    <rect x="50" y="58" width="20" height="4" rx="2" fill="#e9d5ff" />
                                    <rect x="45" y="70" width="8" height="4" rx="2" fill="#d8b4fe" />
                                    <rect x="58" y="70" width="22" height="4" rx="2" fill="#f3e8ff" />
                                    <rect x="45" y="80" width="8" height="4" rx="2" fill="#d8b4fe" />
                                    <rect x="58" y="80" width="15" height="4" rx="2" fill="#f3e8ff" />
                                </svg>
                                {/* Sparkles around */}
                                <Sparkles className="absolute top-0 right-0 w-6 h-6 text-purple-300" />
                                <Sparkles className="absolute bottom-4 left-0 w-4 h-4 text-purple-300" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            You haven't added any opportunities yet
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm text-sm">
                            Add your first job opportunity and let AI help you prepare with personalized interview practice.
                        </p>
                        <button
                            onClick={handleAddNewRole}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 mb-4"
                        >
                            + Add Your First Opportunity
                        </button>
                        <button className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition-colors">
                            <Play className="w-4 h-4" /> Learn how it works
                        </button>
                    </div>
                ) : (
                    /* Non-Empty State (Image 2) List View */
                    <div className="flex flex-col gap-4 mb-8">
                        {filteredJobs.map((job, idx) => {
                            const progress = job.interviewCoach?.status === 'ready' ? 
                                Math.max(10, (job.interviewCoach?.questions?.filter(q => q.status === 'completed').length || 0) / (job.interviewCoach?.questions?.length || 1) * 100) 
                                : 0;
                                
                            return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={job._id} 
                                    className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center gap-6"
                                >
                                    {/* Left: Logo & Job Details */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${getIconBgColor(job.company)}`}>
                                            {getJobIcon(job.jobTitle, job.company)}
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                                {job.jobTitle} | {job.company}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.jobType || 'Full-time'}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Applied {job.appliedDate ? new Date(job.appliedDate).toLocaleDateString() : 'recently'}</span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="w-full max-w-[200px]">
                                                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                                    <span>Interview Prep Progress</span>
                                                    <span className={progress > 50 ? 'text-green-500' : 'text-orange-500'}>{Math.round(progress)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${progress > 50 ? 'bg-green-500' : 'bg-orange-500'}`} 
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Next Up */}
                                    <div className="hidden md:flex flex-col w-48 border-l border-gray-100 dark:border-gray-800 pl-6">
                                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Next Up</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {job.interviewCoach?.status === 'ready' ? 'Continue Module' : 'Generate Plan'}
                                        </span>
                                        <span className="text-xs text-gray-500">{job.interviewCoach?.questions?.length || 0} questions</span>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button 
                                            onClick={() => handleStartPractice(job._id)}
                                            className="flex-1 md:flex-none px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            Continue Practice
                                        </button>
                                        <button className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Bottom Sections */}
                {hasJobs ? (
                    // Bottom Section for Non-Empty State (Improve Your Performance & Daily Tip)
                    <div className="flex flex-col gap-4 mt-8">
                        {/* Improve Performance */}
                        <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="flex items-center gap-4 min-w-[250px]">
                                <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                                    <Star className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Improve Your Performance</h3>
                                    <p className="text-xs text-gray-500">Focus on these areas to boost your interview success.</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                                {[
                                    { title: 'Behavioral Questions', score: '74%', icon: <MessageSquare className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                    { title: 'Technical Skills', score: '68%', icon: <Target className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                    { title: 'Communication', score: '82%', icon: <MessageSquare className="w-4 h-4 text-green-500" />, bg: 'bg-green-50 dark:bg-green-900/20' },
                                    { title: 'Problem Solving', score: '71%', icon: <Lightbulb className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-900/20' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 cursor-pointer transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-gray-900 dark:text-white">{item.title}</span>
                                                <span className="text-[10px] text-gray-500">Score: {item.score}</span>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90 group-hover:text-purple-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily Tip */}
                        <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Daily Tip</h3>
                                    <p className="text-xs text-gray-500">Use the STAR method (Situation, Task, Action, Result) to structure your behavioral answers.</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors whitespace-nowrap">
                                View All Tips
                            </button>
                        </div>
                    </div>
                ) : (
                    // Bottom Section for Empty State (Not sure where to start?)
                    <div className="bg-white dark:bg-[#141810] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-8">
                        <div className="flex items-start gap-4 max-w-xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                                <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Not sure where to start?</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Follow these steps to get the most out of Interview Coach.</p>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                            {[
                                { title: 'Add an Opportunity', desc: "Enter the role you're preparing for", icon: <Briefcase className="w-4 h-4 text-purple-500" /> },
                                { title: 'Choose Focus Areas', desc: "Select what you want to improve", icon: <Target className="w-4 h-4 text-green-500" /> },
                                { title: 'Start Practicing', desc: "Answer AI-curated interview questions", icon: <Play className="w-4 h-4 text-blue-500 fill-current" /> },
                                { title: 'Track Progress', desc: "Review insights and improve", icon: <TrendingUp className="w-4 h-4 text-orange-500" /> }
                            ].map((step, i) => (
                                <div key={i} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-purple-200 dark:hover:border-purple-800 transition-colors flex items-start gap-3 cursor-pointer group">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-sm transition-all">
                                        {step.icon}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{step.title}</span>
                                        <span className="text-[10px] text-gray-500 leading-tight">{step.desc}</span>
                                    </div>
                                    <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90 ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default InterviewCoachContainer;
