
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Trophy, Sparkles, Target, Flame, Play } from 'lucide-react';
import ReadinessChart from './ReadinessChart';
import ModuleList from './ModuleList';

interface InterviewHubProps {
    session: any;
    questionsByModule: any;
}

const InterviewHub: React.FC<InterviewHubProps> = ({ session, questionsByModule }) => {
    const router = useRouter();

    const targetRole = session?.targetRole || 'Interview Prep';
    const jobId = session?.jobId?._id || session?.jobId || session?._id || '';
    const company = session?.jobId?.company || '';
    const readinessScore = session?.readinessScore || 0; 
    const currentStreak = session?.currentStreak || 0;
    const modules = session?.modules || [];

    // Find the next best question (first pending/drafted question)
    let nextQuestion = null;
    let nextModuleId = null;
    if (modules && questionsByModule) {
        for (const mod of modules) {
            const qs = questionsByModule[mod.id] || [];
            const pending = qs.find((q: any) => q.status !== 'completed' && q.userAnswer?.status !== 'analyzed');
            if (pending) {
                nextQuestion = pending;
                nextModuleId = mod.id;
                break;
            }
        }
    }

    return (
        <div className="h-full bg-[#f3f2ee] dark:bg-[#1a230f] min-h-screen font-sans">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/interview')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {targetRole} {company ? `| ${company} Prep` : 'Prep'}
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">a Time • {modules.length} Modules</p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700">
                        <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Stats & Widgets */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Your Readiness */}
                    <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                        <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 self-start">
                            <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            Your Readiness
                        </h2>
                        
                        <div className="flex justify-center mb-6">
                            <ReadinessChart score={readinessScore} />
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            You're <span className="font-bold text-purple-600 dark:text-purple-400">2 sessions</span> away from feeling interview-ready.
                        </p>

                        <button className="w-full py-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                            Keep practicing to improve your score! 
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                        </button>
                    </div>

                    {/* AI Coach */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 shadow-sm text-white relative overflow-hidden">
                        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-yellow-300 opacity-80" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
                            </div>
                            <h3 className="font-bold text-lg">AI Coach</h3>
                        </div>
                        <p className="text-sm text-purple-100 mb-6 leading-relaxed relative z-10 font-medium">
                            You've skipped high-impact questions in Talent Acquisition. Completing 2-3 more hard questions will boost your readiness faster.
                        </p>
                        <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-xl transition-colors flex items-center justify-between px-4 text-sm relative z-10">
                            Focus on High Impact Questions
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                    </div>

                    {/* Today's Goal */}
                    <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <h3 className="font-bold text-gray-900 dark:text-white">Today's Goal</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 ml-8">Answer 3 questions</p>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-600 rounded-full" style={{ width: '33%' }} />
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">1/3</span>
                        </div>
                    </div>

                    {/* Your Streak */}
                    <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Flame className="w-6 h-6 text-orange-500 fill-current" />
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Your Streak</h3>
                                <p className="text-sm font-medium text-gray-500"><span className="text-xl font-black text-gray-900 dark:text-white mr-1">{currentStreak}</span> days</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                // For visual placeholder: highlight days based on currentStreak mod 7
                                const isActive = i < Math.min(currentStreak, 7) || (currentStreak > 0 && i === 0);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                            isActive 
                                            ? 'bg-purple-600 text-white' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-transparent'
                                        }`}>
                                            {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">{day}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Need help getting started? */}
                    <div className="bg-white dark:bg-[#141810] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors group">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Need help getting started?</h3>
                            <p className="text-xs text-gray-500">See how Interview Coach works</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Play className="w-4 h-4 text-blue-500 fill-current" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Modules List */}
                <div className="lg:col-span-9 space-y-8">
                    
                    {/* Continue Where You Left Off */}
                    {nextQuestion && (
                        <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 md:p-8 border border-purple-100 dark:border-purple-900/30 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-blue-500"></div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                </div>
                                <h2 className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">Continue Where You Left Off</h2>
                            </div>
                            
                            <div className="bg-white dark:bg-[#0a0c08] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 block">Next Best Question</span>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                                            {nextQuestion.question || nextQuestion.content?.question || 'Question text not available'}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-md uppercase ${
                                                (nextQuestion.difficulty || nextQuestion.content?.difficulty || '').toLowerCase() === 'hard' 
                                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                                                : (nextQuestion.difficulty || nextQuestion.content?.difficulty || '').toLowerCase() === 'medium'
                                                ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                            }`}>
                                                {nextQuestion.difficulty || nextQuestion.content?.difficulty || 'Medium'}
                                            </span>
                                            {(nextQuestion.category || nextQuestion.content?.tags?.[0]) && (
                                                <span className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-md">
                                                    {nextQuestion.category || nextQuestion.content?.tags?.[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => router.push(`/dashboard/interview/practice/${nextQuestion.id || nextQuestion._id}?jobId=${jobId}`)}
                                        className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Answering
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Learning Path</h2>
                        <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 bg-white dark:bg-[#141810]">
                            Expand All
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                    </div>

                    <ModuleList
                        modules={modules}
                        questionsByModule={questionsByModule}
                        jobId={jobId}
                    />
                </div>
            </div>
        </div>
    );
};

export default InterviewHub;
