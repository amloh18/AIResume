'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Briefcase, FileText, User, Mic, LayoutDashboard, Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import CoverLetterPreviewModal from '@/components/notifications/CoverLetterPreviewModal';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export default function GlobalCommandBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any>({
        jobs: [],
        cvs: [],
        coverLetters: []
    });
    const [isLoading, setIsLoading] = useState(false);

    // Modal / Sidebar States
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [showJobModal, setShowJobModal] = useState(false);
    const [journeysForJob, setJourneysForJob] = useState<any[]>([]);

    const [showCVModal, setShowCVModal] = useState(false);
    const [selectedCVData, setSelectedCVData] = useState<UnifiedCVDataStructure | null>(null);

    const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
    const [selectedCoverLetterData, setSelectedCoverLetterData] = useState<any>(null);
    const [coverLetterCVData, setCoverLetterCVData] = useState<any>(null);
    const [coverLetterJobData, setCoverLetterJobData] = useState<any>(null);

    const router = useRouter();
    const { user } = useUnifiedAuth();

    // Listen to trigger from GlobalSearchBar
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
        };
        window.addEventListener('open-global-command-bar', handleOpen);
        return () => window.removeEventListener('open-global-command-bar', handleOpen);
    }, []);

    // Listen to Keyboard events
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

    // Reset search on close
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setResults({ jobs: [], cvs: [], coverLetters: [] });
        }
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        if (search.length < 2) {
            setResults({ jobs: [], cvs: [], coverLetters: [] });
            return;
        }

        const timeoutId = setTimeout(() => {
            performSearch(search);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, user?.id]);

    const performSearch = async (searchQuery: string) => {
        if (!user?.id || searchQuery.length < 2) {
            setResults({ jobs: [], cvs: [], coverLetters: [] });
            return;
        }

        setIsLoading(true);
        try {
            const response = await authenticatedFetchWithUserId(
                `/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`,
                user.id
            );

            if (!response.ok) {
                console.error('Search API error:', response.status, response.statusText);
                setResults({ jobs: [], cvs: [], coverLetters: [] });
                return;
            }

            const data = await response.json();

            if (data.success && data.data) {
                setResults(data.data);
            } else {
                console.error('Search response error:', data);
                setResults({ jobs: [], cvs: [], coverLetters: [] });
            }
        } catch (error) {
            console.error('Search error:', error);
            setResults({ jobs: [], cvs: [], coverLetters: [] });
        } finally {
            setIsLoading(false);
        }
    };

    const handleJobClick = async (job: any) => {
        if (!user?.id) return;

        try {
            let jobResponse = await authenticatedFetchWithUserId(`/api/jobs/${job.id}`, user.id);
            if (!jobResponse.ok) {
                jobResponse = await authenticatedFetchWithUserId(`/api/jobs?id=${job.id}`, user.id);
            }

            if (!jobResponse.ok) return;

            const jobData = await jobResponse.json();
            if (jobData.success && (jobData.data?.job || jobData.job)) {
                const fetchedJob = jobData.data?.job || jobData.job;

                try {
                    const journeysResponse = await authenticatedFetchWithUserId(
                        `/api/application-journey?jobId=${job.id}`,
                        user.id
                    );
                    const journeysData = await journeysResponse.json();
                    setJourneysForJob(journeysData.success && journeysData.data?.journeys ? journeysData.data.journeys : []);
                } catch (err) {
                    console.error('Error fetching journeys:', err);
                    setJourneysForJob([]);
                }

                setSelectedJob(fetchedJob);
                setShowJobModal(true);
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error loading job:', error);
        }
    };

    const handleCVClick = async (cv: any) => {
        if (!user?.id) return;

        try {
            const cvResponse = await authenticatedFetchWithUserId(
                `/api/cvs/${cv.id}?userId=${user.id}`,
                user.id
            );

            if (!cvResponse.ok) return;

            const cvData = await cvResponse.json();
            if (cvData.success && cvData.data?.cv) {
                const cvObj = cvData.data.cv;
                const unifiedCVData = cvObj.cvData || cvObj;

                if (unifiedCVData && (unifiedCVData.basics || unifiedCVData.name)) {
                    setSelectedCVData(unifiedCVData as UnifiedCVDataStructure);
                    setShowCVModal(true);
                    setIsOpen(false);
                }
            }
        } catch (error) {
            console.error('Error loading CV:', error);
        }
    };

    const handleCoverLetterClick = async (coverLetter: any) => {
        if (!user?.id) return;

        try {
            const clResponse = await authenticatedFetchWithUserId(
                `/api/cover-letters/${coverLetter.id}?userId=${user.id}`,
                user.id
            );

            if (!clResponse.ok) return;

            const clData = await clResponse.json();
            if (clData.success && clData.coverLetter) {
                const coverLetterData = {
                    title: clData.coverLetter.title || 'Untitled Cover Letter',
                    content: clData.coverLetter.content || '',
                    metadata: clData.coverLetter.metadata || {}
                };

                let cvData = null;
                let jobData = null;

                if (coverLetter.journeyId || clData.coverLetter.journeyId) {
                    try {
                        const journeyId = coverLetter.journeyId || clData.coverLetter.journeyId;
                        const journeyResponse = await authenticatedFetchWithUserId(
                            `/api/application-journey?journeyId=${journeyId}`,
                            user.id
                        );
                        if (journeyResponse.ok) {
                            const journeyData = await journeyResponse.json();
                            if (journeyData.success && journeyData.data?.journey) {
                                const journey = journeyData.data.journey;

                                if (journey.cvId) {
                                    const cvRes = await authenticatedFetchWithUserId(
                                        `/api/cvs/${journey.cvId}?userId=${user.id}`,
                                        user.id
                                    );
                                    if (cvRes.ok) {
                                        const cvResult = await cvRes.json();
                                        if (cvResult.success && cvResult.data?.cv) {
                                            cvData = cvResult.data.cv.cvData || cvResult.data.cv;
                                        }
                                    }
                                }

                                if (journey.jobId) {
                                    const jobRes = await authenticatedFetchWithUserId(
                                        `/api/jobs?id=${journey.jobId}`,
                                        user.id
                                    );
                                    if (jobRes.ok) {
                                        const jobResult = await jobRes.json();
                                        if (jobResult.success && jobResult.data?.job) {
                                            jobData = jobResult.data.job;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching data for cover letter preview:', err);
                    }
                }

                setCoverLetterCVData(cvData);
                setCoverLetterJobData(jobData);
                setSelectedCoverLetterData(coverLetterData);
                setShowCoverLetterModal(true);
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error loading Cover Letter:', error);
        }
    };

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

    const hasSearchResults = results.jobs.length > 0 || results.cvs.length > 0 || results.coverLetters.length > 0;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 md:px-0">
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
                            {/* Search Input Area */}
                            <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
                                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent px-4 py-4 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-small md:text-body"
                                    placeholder="Type a command or search jobs, CVs, cover letters..."
                                />
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="text-small text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded shrink-0"
                                >
                                    ESC
                                </button>
                            </div>

                            {/* Options & Results List */}
                            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
                                {isLoading ? (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-small">
                                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-lime-500 border-t-transparent mr-2 align-middle"></div>
                                        Searching...
                                    </div>
                                ) : (filteredCommands.length === 0 && !hasSearchResults) ? (
                                    <div className="p-8 text-center text-gray-500 text-small">No results found.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Navigation/Commands Section */}
                                        {filteredCommands.length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                                                    Navigation
                                                </div>
                                                <div className="space-y-0.5">
                                                    {filteredCommands.map((cmd) => {
                                                        const Icon = cmd.icon;
                                                        return (
                                                            <button
                                                                key={cmd.id}
                                                                onClick={() => handleSelect(cmd.route)}
                                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors text-left group"
                                                            >
                                                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                                                    <Icon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                                </div>
                                                                <span className="font-medium text-small text-gray-900 dark:text-white">{cmd.title}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Jobs Section */}
                                        {search.length >= 2 && results.jobs.length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                                                    Jobs ({results.jobs.length})
                                                </div>
                                                <div className="space-y-0.5">
                                                    {results.jobs.map((job: any) => (
                                                        <button
                                                            key={job.id}
                                                            onClick={() => handleJobClick(job)}
                                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors text-left group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                                                    <Briefcase className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="font-medium text-small text-gray-900 dark:text-white block truncate">{job.title}</span>
                                                                    <span className="text-small text-gray-500 dark:text-gray-400 block truncate">{job.company}{job.location && ` • ${job.location}`}</span>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                                                                job.status === 'applied' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-800/30' :
                                                                job.status === 'interview' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30' :
                                                                job.status === 'offer' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30' :
                                                                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                                            }`}>
                                                                {job.status}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* CVs Section */}
                                        {search.length >= 2 && results.cvs.length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                                                    CVs ({results.cvs.length})
                                                </div>
                                                <div className="space-y-0.5">
                                                    {results.cvs.map((cv: any) => (
                                                        <button
                                                            key={cv.id}
                                                            onClick={() => handleCVClick(cv)}
                                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors text-left group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                                                    <FileText className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="font-medium text-small text-gray-900 dark:text-white block truncate">{cv.title}</span>
                                                                </div>
                                                            </div>
                                                            {cv.isMaster && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-lime-100 dark:bg-lime-950/30 text-lime-700 dark:text-lime-400 border border-lime-200/50 dark:border-lime-800/30 rounded-full font-medium shrink-0">
                                                                    Master
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cover Letters Section */}
                                        {search.length >= 2 && results.coverLetters.length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                                                    Cover Letters ({results.coverLetters.length})
                                                </div>
                                                <div className="space-y-0.5">
                                                    {results.coverLetters.map((cl: any) => (
                                                        <button
                                                            key={cl.id}
                                                            onClick={() => handleCoverLetterClick(cl)}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors text-left group"
                                                        >
                                                            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                                                <Mail className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-medium text-small text-gray-900 dark:text-white block truncate">{cl.title}</span>
                                                                {cl.targetCompany && (
                                                                    <span className="text-small text-gray-500 dark:text-gray-400 block truncate">For: {cl.targetCompany}</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sidebar / Modal rendering (rendered outside AnimatePresence so they persist when Command Bar is closed) */}
            {showJobModal && selectedJob && (
                <JobSidebar
                    job={selectedJob}
                    journeys={journeysForJob}
                    onClose={() => {
                        setShowJobModal(false);
                        setSelectedJob(null);
                        setJourneysForJob([]);
                    }}
                    onRefresh={async () => {
                        if (selectedJob && user?.id) {
                            const journeysResponse = await authenticatedFetchWithUserId(
                                `/api/application-journey?jobId=${selectedJob.id}`,
                                user.id
                            );
                            const journeysData = await journeysResponse.json();
                            setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
                        }
                    }}
                />
            )}

            {showCVModal && selectedCVData && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => {
                    setShowCVModal(false);
                    setSelectedCVData(null);
                }}>
                    <div className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                            <h2 className="text-h3 font-bold text-gray-900 dark:text-white">CV Preview</h2>
                            <button
                                onClick={() => {
                                    setShowCVModal(false);
                                    setSelectedCVData(null);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <CVPreviewContent cvData={selectedCVData} />
                        </div>
                    </div>
                </div>
            )}

            {showCoverLetterModal && selectedCoverLetterData && (
                <CoverLetterPreviewModal
                    isOpen={showCoverLetterModal}
                    onClose={() => {
                        setShowCoverLetterModal(false);
                        setSelectedCoverLetterData(null);
                        setCoverLetterCVData(null);
                        setCoverLetterJobData(null);
                    }}
                    coverLetterData={selectedCoverLetterData}
                    cvData={coverLetterCVData}
                    jobData={coverLetterJobData}
                />
            )}
        </>
    );
}