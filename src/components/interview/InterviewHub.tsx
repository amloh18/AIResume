
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, MoreVertical, Trophy } from 'lucide-react';
import ReadinessChart from './ReadinessChart';
import ModuleList from './ModuleList';

interface InterviewHubProps {
    session: any;
    questionsByModule: any;
}

const InterviewHub: React.FC<InterviewHubProps> = ({ session, questionsByModule }) => {
    const router = useRouter();

    // Handle both new embedded data and legacy session structure
    const targetRole = session?.targetRole || 'Interview Prep';
    const jobId = session?.jobId?._id || session?.jobId || session?._id || '';
    const company = session?.jobId?.company || '';
    const readinessScore = session?.readinessScore || 0;
    const modules = session?.modules || [];

    return (
        <div className="h-full bg-gray-50 dark:bg-[#0a0a0a] min-h-screen">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/interview')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {targetRole} Prep
                            </h1>
                            <p className="text-sm text-gray-500">{company} • {modules.length} Modules</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Readiness & Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Readiness Score
                        </h2>
                        <div className="flex justify-center py-4">
                            <ReadinessChart score={readinessScore} />
                        </div>
                        <div className="text-center text-sm text-gray-500 mt-2">
                            {readinessScore < 50 ? "Let's get started!" : readinessScore < 80 ? "Making good progress." : "You're ready to ace this!"}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-lime-500/10 to-lime-500/5 dark:from-lime-500/20 dark:to-lime-500/5 rounded-2xl p-6 border border-lime-500/20">
                        <h3 className="font-bold text-lime-700 dark:text-lime-400 mb-2">Pro Tip</h3>
                        <p className="text-sm text-lime-900 dark:text-lime-200">
                            Focus on the "Technical" module first. It has the highest weight for this role based on the job description.
                        </p>
                    </div>
                </div>

                {/* Right Column: Modules List */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Your Learning Path</h2>
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
