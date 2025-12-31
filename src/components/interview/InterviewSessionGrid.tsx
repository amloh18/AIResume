
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Briefcase, GraduationCap, ChevronRight, BarChart } from 'lucide-react';

interface Session {
    _id: string;
    targetRole: string;
    readinessScore: number;
    lastPracticedAt: string;
    jobId: {
        _id: string;
        jobTitle: string;
        company: string;
        status: string;
        companyLogo?: string;
        location?: string;
    };
    updatedAt: string;
}

const InterviewSessionGrid: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
    const router = useRouter();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        // Check if date is invalid
        if (isNaN(date.getTime())) return 'Never';

        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
            Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            'day'
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => (
                <motion.div
                    key={session._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => router.push(`/interview-coach/${session.jobId._id}`)}
                    className="group relative bg-white dark:bg-[#141810] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                >
                    {/* Hover Effect Border */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-lime-500/30 rounded-2xl transition-colors pointer-events-none" />

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                                {session.jobId?.companyLogo ? (
                                    <img
                                        src={session.jobId.companyLogo}
                                        alt={session.jobId.company}
                                        className="w-full h-full object-contain"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <span>{session.jobId?.company?.substring(0, 2).toUpperCase() || '??'}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                                    {session.targetRole}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    {session.jobId?.company || 'Unknown Company'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Readiness Score */}
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <BarChart className="w-3.5 h-3.5" />
                                Readiness
                            </span>
                            <span className={`text-lg font-bold ${session.readinessScore >= 80 ? 'text-green-500' :
                                session.readinessScore >= 50 ? 'text-yellow-500' :
                                    'text-gray-400'
                                }`}>
                                {session.readinessScore}%
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Practiced {formatDate(session.lastPracticedAt)}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button className="w-full py-2.5 bg-lime-500 text-black font-bold text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 flex items-center justify-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Continue Prep
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default InterviewSessionGrid;
