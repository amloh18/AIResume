'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home,
    Save,
    Loader2,
    CheckCircle2,
    Settings,
    User,
    LogOut,
    ChevronDown,
    X,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

// Context
import { StudioProvider, useStudio } from './StudioContext';

// Types
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { PillarScores } from '@/types/studio';

// Services
import { CVScoringService } from '@/lib/services/cv-scoring-service';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { analyzeCV } from './utils/studio-service';

// Layout Components
import StudioLayout from './StudioLayout';
import ATSFixModeLayout from './ats-fix-mode/ATSFixModeLayout';

// ============================================================================
// Props
// ============================================================================

interface StudioContainerProps {
    userId: string;
    cvId?: string;
    journeyId?: string;
    mode?: 'standalone' | 'journey';
}

// ============================================================================
// Inner Component (uses context)
// ============================================================================

function StudioContent({ userId, cvId, journeyId, mode = 'standalone' }: StudioContainerProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { state, dispatch, enterATSFixMode, exitATSFixMode } = useStudio();

    // Local UI state
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ============================================================================
    // Initialization
    // ============================================================================

    useEffect(() => {
        const initializeStudio = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                let loadedCvData: UnifiedCVDataStructure | null = null;
                let loadedJobData: any = null;
                let savedCvId: string | null = null;

                // Load CV data
                if (cvId) {
                    const response = await authenticatedFetchWithUserId(`/api/cvs/${cvId}`, userId);
                    if (response.ok) {
                        const data = await response.json();
                        loadedCvData = data.cvData || data.data?.cvData;
                        savedCvId = cvId;
                        dispatch({ type: 'SET_CV_ID', payload: cvId });
                        dispatch({ type: 'SET_CV_TITLE', payload: data.title || data.data?.title || 'Untitled CV' });
                    }
                }

                // Load journey and job data
                if (journeyId) {
                    dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });

                    const journeyResponse = await authenticatedFetchWithUserId(
                        `/api/application-journey/${journeyId}`,
                        userId
                    );
                    if (journeyResponse.ok) {
                        const journeyData = await journeyResponse.json();
                        const journey = journeyData.data || journeyData;

                        // Load associated job
                        if (journey.jobId) {
                            const jobResponse = await authenticatedFetchWithUserId(
                                `/api/jobs/${journey.jobId}`,
                                userId
                            );
                            if (jobResponse.ok) {
                                loadedJobData = await jobResponse.json();
                                dispatch({ type: 'SET_JOB_DATA', payload: loadedJobData.data || loadedJobData });
                            }
                        }

                        // Load CV from journey if not already loaded
                        if (!loadedCvData && journey.cvId) {
                            const cvResponse = await authenticatedFetchWithUserId(
                                `/api/cvs/${journey.cvId}`,
                                userId
                            );
                            if (cvResponse.ok) {
                                const cvData = await cvResponse.json();
                                loadedCvData = cvData.cvData || cvData.data?.cvData;
                                savedCvId = journey.cvId;
                                dispatch({ type: 'SET_CV_ID', payload: journey.cvId });
                                dispatch({ type: 'SET_CV_TITLE', payload: cvData.title || 'Untitled CV' });
                            }
                        }
                    }
                }

                // Set CV data and run full analysis
                if (loadedCvData) {
                    dispatch({ type: 'SET_CV_DATA', payload: loadedCvData });

                    // Run full analysis with CV Surgeon integration
                    try {
                        setIsAnalyzing(true);
                        dispatch({ type: 'SET_ANALYZING', payload: true });

                        const analysisResult = await analyzeCV(loadedCvData, {
                            userId,
                            cvId: savedCvId || undefined,
                            targetRole: loadedJobData?.jobTitle || loadedJobData?.title || '',
                            jobData: loadedJobData,
                            useCache: true,
                        });

                        dispatch({ type: 'SET_CV_SCORE', payload: analysisResult.cvScore });
                        dispatch({ type: 'SET_PILLAR_SCORES', payload: analysisResult.pillarScores });
                        dispatch({ type: 'SET_ANNOTATIONS', payload: analysisResult.annotations });
                        dispatch({ type: 'SET_SECTION_ANALYSES', payload: analysisResult.sectionAnalyses });

                        if (analysisResult.atsScore !== null) {
                            dispatch({ type: 'SET_ATS_SCORE', payload: analysisResult.atsScore });
                        }
                    } catch (analysisError) {
                        console.error('Analysis failed, falling back to basic scoring:', analysisError);

                        // Fallback to basic scoring
                        const scoreResult = CVScoringService.calculateCVScore(loadedCvData);
                        dispatch({ type: 'SET_CV_SCORE', payload: scoreResult.total });

                        const pillarScores: PillarScores = {
                            completeness: Math.round((scoreResult.completeness / 25) * 20),
                            impactVerbs: scoreResult.impactVerbs,
                            quantification: scoreResult.quantification,
                            formatting: Math.round((scoreResult.formatting / 15) * 20),
                            readability: scoreResult.readability,
                        };
                        dispatch({ type: 'SET_PILLAR_SCORES', payload: pillarScores });

                        if (loadedJobData?.jobDescription) {
                            const atsResult = CVScoringService.calculateATSScore(
                                loadedCvData,
                                loadedJobData.jobDescription
                            );
                            dispatch({ type: 'SET_ATS_SCORE', payload: atsResult.total });
                        }
                    } finally {
                        setIsAnalyzing(false);
                        dispatch({ type: 'SET_ANALYZING', payload: false });
                    }
                }

                dispatch({ type: 'SET_LOADING', payload: false });
            } catch (error) {
                console.error('Failed to initialize Studio:', error);
                dispatch({ type: 'SET_ERROR', payload: 'Failed to load CV data' });
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        initializeStudio();
    }, [cvId, journeyId, userId, dispatch]);

    // ============================================================================
    // Handlers
    // ============================================================================

    const handleSave = useCallback(async () => {
        if (!state.cvData || !state.cvId) return;

        setSaveStatus('saving');
        dispatch({ type: 'SET_SAVING', payload: true });

        try {
            const response = await authenticatedFetchWithUserId(
                `/api/cvs/${state.cvId}`,
                userId,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cvData: state.cvData,
                        title: state.cvTitle,
                    }),
                }
            );

            if (!response.ok) throw new Error('Save failed');

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    }, [state.cvData, state.cvId, state.cvTitle, userId, dispatch]);

    const handleExit = useCallback(() => {
        router.push('/dashboard?tab=cvs');
    }, [router]);

    const handleSignOut = useCallback(() => {
        signOut({ callbackUrl: '/' });
    }, []);

    // ============================================================================
    // Loading State
    // ============================================================================

    if (state.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0d07]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-lime-500 dark:border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                        {isAnalyzing ? 'Analyzing your CV...' : 'Loading Studio...'}
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="studio-page min-h-screen bg-white dark:bg-[#0a0d07] text-gray-900 dark:text-white flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-[#141810] sticky top-0 z-[100] shadow-sm border-b border-gray-200 dark:border-white/10">
                <div className="w-full px-4 py-2">
                    <div className="flex items-center justify-between">
                        {/* Left: Logo & Title */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleExit}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                title="Go back"
                            >
                                <Home className="w-5 h-5 text-gray-700 dark:text-white" />
                            </button>
                            <h1 className="font-bold">
                                <span className="text-xl text-gray-900 dark:text-white">Studio</span>
                                <span className="text-sm ml-2">
                                    BY <span className="text-lime-600 dark:text-[#80FF00]">CV</span>
                                    <span className="text-gray-900 dark:text-white">Circle</span>
                                </span>
                            </h1>
                        </div>

                        {/* Center: CV Title (editable) */}
                        <div className="flex-1 max-w-md mx-4">
                            <input
                                type="text"
                                value={state.cvTitle}
                                onChange={(e) => dispatch({ type: 'SET_CV_TITLE', payload: e.target.value })}
                                className="w-full text-center text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 rounded-lg px-2 py-1 text-gray-900 dark:text-white"
                                placeholder="Untitled CV"
                            />
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center space-x-2">
                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={saveStatus === 'saving'}
                                className="px-3 py-1.5 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-black rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5"
                            >
                                {saveStatus === 'saving' ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : saveStatus === 'success' ? (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Saved!</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save</span>
                                    </>
                                )}
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <div className="w-7 h-7 rounded-full bg-lime-500 dark:bg-[#80FF00] flex items-center justify-center text-black text-xs font-bold">
                                        {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>

                                <AnimatePresence>
                                    {showUserMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a230f] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 py-1 z-50"
                                        >
                                            <button
                                                onClick={() => router.push('/settings')}
                                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                            >
                                                <Settings className="w-4 h-4" />
                                                <span>Settings</span>
                                            </button>
                                            <button
                                                onClick={() => router.push('/profile')}
                                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                            >
                                                <User className="w-4 h-4" />
                                                <span>Profile</span>
                                            </button>
                                            <hr className="my-1 border-gray-200 dark:border-white/10" />
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Sign Out</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    {state.viewMode === 'default' ? (
                        <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <StudioLayout
                                cvData={state.cvData}
                                userId={userId}
                                onATSFixClick={enterATSFixMode}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="ats-fix"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <ATSFixModeLayout
                                cvData={state.cvData}
                                userId={userId}
                                onClose={exitATSFixMode}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

// ============================================================================
// Main Component with Provider
// ============================================================================

export default function StudioContainer(props: StudioContainerProps) {
    return (
        <StudioProvider>
            <StudioContent {...props} />
        </StudioProvider>
    );
}
