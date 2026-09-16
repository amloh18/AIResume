'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Context & Components
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';
import LinkedInHeader from './LinkedInHeader';
import LinkedInHeroCard from './LinkedInHeroCard';
import LinkedInAboutCard from './LinkedInAboutCard';
import LinkedInExperienceCard from './LinkedInExperienceCard';
import LinkedInEducationCard from './LinkedInEducationCard';
import LinkedInProjectsCard from './LinkedInProjectsCard';
import LinkedInSkillsCard from './LinkedInSkillsCard';
import LinkedInLanguagesCard from './LinkedInLanguagesCard';
import LinkedInRecommendationsSidebar from './LinkedInRecommendationsSidebar';
import LinkedInEnhancerSkeleton from './LinkedInEnhancerSkeleton';
import { CheckSquare, X } from 'lucide-react';
import BrowserExtensionModal from './BrowserExtensionModal';
import SuccessFeedbackModal from './SuccessFeedbackModal';

// Types
import type { CVSelectionItem, LinkedInUserContext, LinkedInCvType } from '@/types/linkedin';
import { LINKEDIN_COLORS } from '@/types/linkedin';

// Job statuses that mean the application journey is finished. Journey CVs linked
// to those jobs are not selected as the default source.
const TERMINAL_JOB_STATUSES = new Set([
  'rejected', 'accepted', 'withdrawn', 'archived', 'closed', 'declined',
]);

/**
 * Resolve the source CV the LinkedIn enhancer should enhance.
 *
 * Priority:
 *   1. The CV of the user's most recent active job-application journey
 *      (a `journey` CV) — this is the tailored document they are actively
 *      preparing, so it becomes the default LinkedIn source.
 *   2. The Master CV.
 *   3. The most recently updated standalone CV.
 */
async function resolveDefaultSourceCv(): Promise<CVSelectionItem | null> {
  // 1) Look through the user's journeys for the most recent one that already has
  //    a CV and is not a finished application.
  try {
    const journeyResponse = await fetch('/api/application-journey?limit=40');
    if (journeyResponse.ok) {
      const journeyData = await journeyResponse.json();
      const journeys: any[] = journeyData?.data?.journeys || [];
      const journeysWithCv = journeys.filter((j: any) => j?.cvId);
      const activeJourney =
        journeysWithCv.find((j: any) => {
          const jobStatus = String(j?.jobStatus || '').toLowerCase();
          return !TERMINAL_JOB_STATUSES.has(jobStatus);
        }) || journeysWithCv[0];

      if (activeJourney?.cvId) {
        const journeyName = activeJourney?.jobTitle
          ? `${activeJourney.jobTitle}${activeJourney?.company ? ` · ${activeJourney.company}` : ''}`
          : 'Journey CV';
        return {
          id: activeJourney.cvId,
          name: journeyName,
          type: 'journey' as const,
          updatedAt: activeJourney?.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.error('Failed to resolve journey CV, falling back to CV list:', err);
  }

  // 2/3) Fall back to the CV list. Order: journey -> master -> standalone.
  try {
    const response = await fetch('/api/cvs?type=cv&projection=list');
    if (!response.ok) return null;
    const data = await response.json();
    const cvs: any[] = data?.data?.cvs || [];

    const pick = (cvType: LinkedInCvType) => {
      const cv = cvs.find((c: any) => (c?.cvType || c?.type) === cvType);
      if (!cv) return null;
      return {
        id: cv.id || cv._id,
        name: cv.title || cv.documentName || 'CV',
        type: cvType,
        updatedAt: cv.updatedAt || new Date().toISOString(),
      };
    };

    return pick('journey') || pick('master') || pick('standalone');
  } catch (err) {
    console.error('Failed to resolve source CV:', err);
    return null;
  }
}

export default function LinkedInEnhancementFlow(_props: { onBackToDashboard?: () => void } = {}) {
    const router = useRouter();
    const { state, dispatch, setTone, selectCv, triggerEnhancement } = useLinkedInEnhancer();
    const [availableCvs, setAvailableCvs] = useState<CVSelectionItem[]>([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
    const [showInsights, setShowInsights] = useState(true);
    const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
        hero: true,
        about: true,
        experience: true,
        education: true,
        projects: true,
        skills_matrix: true,
        languages: true
    });
    // Modal states
    const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [appliedSectionsCount, setAppliedSectionsCount] = useState(0);

    // Fetch the user's profile image for the LinkedIn preview header.
    useEffect(() => {
        async function fetchUserProfile() {
            try {
                // /api/user/current returns { success, user: { …, avatar } }.
                // This previously called /api/user/profile, which does not exist
                // on disk, so `response.ok` was always false and the avatar never
                // loaded. It also read `user.image`/`user.picture` — neither field
                // exists on any user payload; the field is `avatar`.
                const response = await fetch('/api/user/current');
                if (response.ok) {
                    const data = await response.json();
                    setUserProfileImage(data.user?.avatar || null);
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        }
        fetchUserProfile();
    }, []);

    // Load CV data and transform to LinkedIn sections
    const loadCvData = useCallback(async (cvId: string, cvType: LinkedInCvType, cvName?: string) => {
        try {
            // Single endpoint covers journey, master and standalone CVs.
            const response = await fetch(`/api/cvs/${cvId}`);

            if (!response.ok) {
                throw new Error('Failed to load CV');
            }

            const data = await response.json();
            // /api/cvs/:id response: { success, data: { cv: { id, cvData, title, ... } } }
            const cv = data?.data?.cv;
            const cvData = cv?.cvData || data?.cvData || data;
            const resolvedName = cvName || cv?.title || 'CV';

            // Transform CV data to LinkedIn sections
            const sections = transformCvToLinkedInSections(cvData);

            dispatch({
                type: 'LOAD_CV_DATA',
                payload: { sections, cvId, cvType, cvName: resolvedName, cvData },
            });

            // Trigger enhancement immediately after state update
            // Use requestAnimationFrame to ensure state is committed
            requestAnimationFrame(() => {
                triggerEnhancement(cvId, cvType, false, cvData);
            });

            dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
            console.error('Failed to load CV data:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load CV data' });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [dispatch, triggerEnhancement]);

    // Fetch the default source CV on mount.
    // Priority: the most recently updated journey CV (the tailored CV from the
    // user's current application journey) -> master CV -> most recent standalone CV.
    useEffect(() => {
        async function fetchCvs() {
            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                const firstCv = await resolveDefaultSourceCv();

                if (!firstCv) {
                    setAvailableCvs([]);
                    dispatch({ type: 'SET_LOADING', payload: false });
                    setInitialLoadComplete(true);
                    return;
                }

                setAvailableCvs([firstCv]);
                selectCv(firstCv.id, firstCv.type, firstCv.name);
                await loadCvData(firstCv.id, firstCv.type, firstCv.name);
                setInitialLoadComplete(true);
            } catch (error) {
                console.error('Failed to fetch CVs:', error);
                dispatch({ type: 'SET_ERROR', payload: 'Failed to load CVs' });
                dispatch({ type: 'SET_LOADING', payload: false });
                setInitialLoadComplete(true);
            }
        }

        fetchCvs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle regenerate
    const handleRegenerate = useCallback(() => {
        if (state.selectedCvId && state.selectedCvType) {
            // Force regenerate = true
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        } else if (availableCvs.length > 0) {
            // Fallback to first CV if state not set
            const firstCv = availableCvs[0];
            triggerEnhancement(firstCv.id, firstCv.type, true);
        }
    }, [triggerEnhancement, state.selectedCvId, state.selectedCvType, availableCvs]);

    // Handle tone change with regeneration
    const handleToneChangeWithRegenerate = useCallback((tone: LinkedInUserContext['tone_selection']) => {
        // Update tone in state
        setTone(tone);
        // Trigger regeneration with new tone
        if (state.selectedCvId && state.selectedCvType) {
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        }
    }, [setTone, triggerEnhancement, state.selectedCvId, state.selectedCvType]);

    // Apply / Preview logic
    const getSelectedSectionsCount = () => {
        return Object.values(selectedSections).filter(Boolean).length;
    };

    const handlePreviewAndApply = () => {
        if (getSelectedSectionsCount() === 0) return;
        setIsBrowserModalOpen(true);
    };

    const handlePreviewOnLinkedIn = () => {
        setIsBrowserModalOpen(false);
        const count = getSelectedSectionsCount();
        setAppliedSectionsCount(count);
        // Simulate extension injection process...
        // Open LinkedIn in a new tab
        window.open('https://www.linkedin.com/in/me/edit/', '_blank');
        
        // Simulate a success feedback loop after a brief delay (acting as the extension's response)
        setTimeout(() => {
            setIsSuccessModalOpen(true);
        }, 3000);
    };

    const handleUndoChanges = () => {
        setIsSuccessModalOpen(false);
        // Here you would implement actual rollback/undo logic
        console.log("Changes undone!");
    };

    // Loading steps for initial load
    const loadingSteps = [
        { label: 'Connecting to profile...', icon: '🔗' },
        { label: 'Fetching your CVs...', icon: '📄' },
        { label: 'Loading Master CV...', icon: '✨' },
        { label: 'Preparing workspace...', icon: '🚀' },
    ];

    // Show loading state with skeleton sections matching actual page UI
    if (!initialLoadComplete) {
        return (
            <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
                <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
                    <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">
                        <LinkedInHeader
                            onRegenerate={() => { }}
                            isEnhancing={false}
                            hasSourceCv={false}
                            currentTone={state.user_context.tone_selection}
                            onToneChange={setTone}
                        />
                        <LinkedInEnhancerSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    // No CVs available
    if (initialLoadComplete && availableCvs.length === 0) {
        return (
            <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
                <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
                    <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">
                        <LinkedInHeader
                            onRegenerate={() => { }}
                            isEnhancing={false}
                            hasSourceCv={false}
                            currentTone={state.user_context.tone_selection}
                            onToneChange={setTone}
                        />
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-lg p-8 max-w-md text-center">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                                    <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-h3 font-bold text-[var(--text-primary)] mb-2">
                                    Create a CV First
                                </h2>
                                <p className="text-[var(--text-secondary)] text-xs sm:text-sm mb-6 leading-relaxed">
                                    To enhance your LinkedIn profile, you&apos;ll need a journey CV or master CV first.
                                </p>
                                <motion.button
                                    onClick={() => router.push('/dashboard/jobs?tab=documents')}
                                    className="px-6 py-2.5 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs transition-colors duration-200 shadow-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Create CV
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
                <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
                    <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">

                        {/* Header — LinkedIn shortcut, tone selector, Enhance Profile */}
                        <LinkedInHeader
                            onRegenerate={handleRegenerate}
                            isEnhancing={state.isEnhancing}
                            hasSourceCv={Boolean(state.selectedCvId)}
                            currentTone={state.user_context.tone_selection}
                            onToneChange={setTone}
                            onToneChangeWithRegenerate={handleToneChangeWithRegenerate}
                            sourceCvName={state.selectedCvName}
                            sourceCvType={state.selectedCvType}
                        />

                    {/* Loading State */}
                    <AnimatePresence mode="wait">
                    {state.isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full"
                        >
                            <LinkedInEnhancerSkeleton />
                        </motion.div>
                    ) : state.error && state.sections.hero.status === 'ORIGINAL' ? (
                        // Show skeleton sections if AI failed and no enhanced data
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full space-y-6"
                        >
                            {/* Error Banner */}
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-800 dark:text-red-300 font-bold text-xs">AI Enhancement Failed</p>
                                    <p className="text-red-600 dark:text-red-400 text-xs">{state.error}</p>
                                </div>
                                <motion.button
                                    onClick={handleRegenerate}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Retry
                                </motion.button>
                            </div>

                            <LinkedInEnhancerSkeleton />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full"
                        >
                            {/* Error Banner - shown when there's an error but we have data to display */}
                            {state.error && (
                                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-red-800 font-medium">Error</p>
                                        <p className="text-red-600 text-small">{state.error}</p>
                                    </div>
                                    <motion.button
                                        onClick={handleRegenerate}
                                        className="px-4 py-1.5 bg-red-600 text-white text-small rounded-lg"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Retry
                                    </motion.button>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
                                {/* Main Content - Cards */}
                                <div className="flex-1 min-w-0 space-y-4">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap justify-between items-center bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4 gap-3 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[var(--text-primary)]">AI Enhancement Plan</span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800/40">
                                                {Object.values(state.sections).filter(s => (s as any).status === 'ACCEPTED').length} accepted
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowInsights(!showInsights)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    showInsights
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                                                        : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)]'
                                                }`}
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
                                                <span>Insights</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section Cards */}
                                    <div id="section-hero"><LinkedInHeroCard data={state.sections.hero} userProfileImage={userProfileImage} /></div>
                                    <div id="section-about"><LinkedInAboutCard data={state.sections.about} /></div>
                                    <div id="section-experience"><LinkedInExperienceCard data={state.sections.experience} /></div>
                                    <div id="section-education"><LinkedInEducationCard data={state.sections.education} /></div>
                                    <div id="section-projects"><LinkedInProjectsCard data={state.sections.projects} /></div>
                                    <div id="section-skills"><LinkedInSkillsCard data={state.sections.skills_matrix} /></div>
                                    <div id="section-languages"><LinkedInLanguagesCard data={state.sections.languages} /></div>

                                    {/* "Ready to apply?" CTA block */}
                                    <div className="mt-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-xs transition-colors">
                                        <div className="mb-4 text-center">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Ready to apply these changes?</h3>
                                            <p className="text-[var(--text-secondary)] text-xs">
                                                Select the sections you want to apply. Our browser extension will safely guide you through updating your LinkedIn profile.
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                                            {Object.entries({
                                                hero: 'Headline & Info',
                                                about: 'About Summary',
                                                experience: 'Experience',
                                                education: 'Education',
                                                projects: 'Projects',
                                                skills_matrix: 'Skills',
                                                languages: 'Languages'
                                            }).map(([key, label]) => {
                                                // Only show if the section has GENERATED or ACCEPTED status
                                                const sectionData = state.sections[key as keyof typeof state.sections];
                                                const isModified = sectionData && (
                                                    (Array.isArray(sectionData) 
                                                         ? sectionData.some((item: any) => item.status && item.status !== 'ORIGINAL')
                                                        : (sectionData as any).status && (sectionData as any).status !== 'ORIGINAL')
                                                );

                                                return (
                                                    <label 
                                                        key={key} 
                                                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                            !isModified ? 'opacity-50 grayscale cursor-not-allowed bg-[var(--bg-tertiary)]/40 border-[var(--border-primary)]' :
                                                            selectedSections[key] 
                                                                ? 'bg-[var(--bg-tertiary)] border-emerald-500 text-emerald-700 dark:text-lime-400 shadow-xs ring-1 ring-emerald-500' 
                                                                : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] hover:border-emerald-500/50'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedSections[key]}
                                                            disabled={!isModified}
                                                            onChange={(e) => setSelectedSections(prev => ({...prev, [key]: e.target.checked}))}
                                                            className="w-3.5 h-3.5 rounded text-emerald-600 border-[var(--border-primary)] focus:ring-emerald-500"
                                                        />
                                                        <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-center">
                                            <motion.button
                                                onClick={handlePreviewAndApply}
                                                disabled={getSelectedSectionsCount() === 0}
                                                className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl shadow-sm transition-all text-xs active:scale-[0.99] ${
                                                    getSelectedSectionsCount() === 0
                                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed border border-[var(--border-primary)]'
                                                        : 'bg-[#013f2e] hover:bg-[#025c43] text-white'
                                                }`}
                                                whileHover={getSelectedSectionsCount() > 0 ? { scale: 1.02 } : {}}
                                                whileTap={getSelectedSectionsCount() > 0 ? { scale: 0.98 } : {}}
                                            >
                                                <CheckSquare className="w-4 h-4" />
                                                <span>Preview & Apply Changes</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Panel - Profile Insights Sidebar */}
                                {showInsights && (
                                    <div className="w-full lg:w-[420px] flex-shrink-0 sticky top-4 h-[calc(100vh-140px)] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xs flex flex-col transition-all duration-300">
                                        <div className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-tertiary)]/50 shrink-0">
                                            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-lime-400 animate-pulse" />
                                                <span>Profile Insights</span>
                                            </h3>
                                            <button
                                                onClick={() => setShowInsights(false)}
                                                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                title="Close Insights"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto min-h-0">
                                            <div className="p-4 h-full">
                                                <LinkedInRecommendationsSidebar
                                                    sideCards={state.side_cards}
                                                    careerGuide={state.career_guide}
                                                    audit={state.audit}
                                                    isLoading={state.isEnhancing}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <BrowserExtensionModal 
                isOpen={isBrowserModalOpen} 
                onClose={() => setIsBrowserModalOpen(false)} 
                onPreview={handlePreviewOnLinkedIn}
                selectedSectionsCount={getSelectedSectionsCount()}
            />

            <SuccessFeedbackModal 
                isOpen={isSuccessModalOpen} 
                onClose={() => setIsSuccessModalOpen(false)} 
                onUndo={handleUndoChanges}
                appliedSectionsCount={appliedSectionsCount}
            />
        </>
    );
}

// Transform CV data to LinkedIn sections format
function transformCvToLinkedInSections(cvData: any) {
    // JSON Resume format uses 'basics' for personal info
    const basics = cvData.basics || {};
    const personalInfo = cvData.personalInfo || cvData.personal_info || {};

    // Merge basics and personalInfo for compatibility
    const name = basics.name || `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || '';
    const summary = basics.summary || cvData.summary || cvData.professionalSummary || '';
    const location = basics.location || {};

    // JSON Resume uses 'work' not 'workExperience'
    const workExperience = cvData.work || cvData.workExperience || cvData.experience || [];
    const education = cvData.education || [];
    const projects = cvData.projects || [];
    // JSON Resume uses array of {name, level, keywords}
    const skills = cvData.skills || [];
    // JSON Resume uses array of {language, fluency}
    const languages = cvData.languages || [];

    return {
        hero: {
            status: 'ORIGINAL' as const,
            current: {
                // JSON Resume uses basics.label for job title/headline
                headline: basics.label || personalInfo.title || personalInfo.jobTitle || '',
                // JSON Resume uses basics.location object
                location: location.city
                    ? `${location.city}${location.region ? `, ${location.region}` : ''}${location.countryCode ? `, ${location.countryCode}` : ''}`
                    : personalInfo.city
                        ? `${personalInfo.city}${personalInfo.country ? `, ${personalInfo.country}` : ''}`
                        : personalInfo.location || '',
                name: name,
                photoUrl: basics.image || personalInfo.photo || '',
                bannerUrl: '',
                connections: '',
            },
            enhanced: {
                headline: '',
                seo_keywords_used: [],
                location_suggestion: '',
                rationale: '',
            },
        },
        about: {
            status: 'ORIGINAL' as const,
            current: typeof summary === 'string' ? summary : summary.text || '',
            enhanced: {
                hook: '',
                body: '',
                cta: '',
                character_count: 0,
                narrative_strategy: '',
            },
        },
        // JSON Resume: work[].name = company, work[].position = job title
        experience: workExperience.map((exp: any, idx: number) => ({
            id: exp.id || exp._id || `exp_${idx}`,
            original_data: {
                role: exp.position || exp.title || exp.role || '',
                // JSON Resume uses 'name' for company name
                company: exp.name || exp.company || exp.employer || '',
                duration: exp.duration || (exp.startDate
                    ? `${exp.startDate}${exp.endDate ? ` - ${exp.endDate}` : ' - Present'}`
                    : ''),
                location: exp.location || '',
                description: Array.isArray(exp.highlights)
                    ? exp.highlights.join('\n')
                    : exp.summary || exp.description || exp.responsibilities || '',
                employment_type: exp.employmentType || '',
            },
            enhanced_data: {
                title: '',
                description_bullets: [],
                tagged_skills: [],
                improvement_notes: '',
            },
        })),
        // Unified cvData uses { institution, area, studyType, startDate, endDate };
        // legacy data uses { school, degree, field } etc. Map both conventions.
        education: education.map((edu: any, idx: number) => ({
            id: edu.id || edu._id || `edu_${idx}`,
            institution: edu.institution || edu.school || edu.university || '',
            degree: edu.studyType || edu.degree || edu.qualification || '',
            field: edu.area || edu.field || edu.fieldOfStudy || edu.major || '',
            grade: edu.grade || edu.gpa || '',
            activities: edu.activities || '',
        })),
        projects: projects.map((proj: any, idx: number) => ({
            id: proj.id || proj._id || `proj_${idx}`,
            original_data: {
                title: proj.name || proj.title || proj.projectName || '',
                date_range: proj.date || proj.duration || (proj.startDate
                    ? `${proj.startDate}${proj.endDate ? ` - ${proj.endDate}` : ''}`
                    : ''),
                associated_with: proj.association || proj.associatedWith || proj.organization || '',
                url: proj.url || proj.link || proj.github || '',
                description: Array.isArray(proj.highlights)
                    ? proj.highlights.join('\n')
                    : proj.description || proj.summary || '',
            },
            enhanced_data: {
                title: '',
                description_bullets: [],
                // JSON Resume uses 'keywords' for project technologies/skills
                tagged_skills: proj.keywords || proj.technologies || proj.skills || [],
                improvement_notes: '',
            },
        })),
        skills_matrix: {
            current: Array.isArray(skills)
                ? skills.flatMap((s: any) => {
                    if (typeof s === 'string') return [s];
                    // Unified/grouped: { category, skills: ['React', ...] }
                    if (Array.isArray(s.skills)) return s.skills.filter(Boolean);
                    return [s.name || s.skill].filter(Boolean);
                })
                : [],
            suggested_additions: [],
            verified_badges_eligible: [],
            top_3_priority: [],
            industry_specific: [],
            interpersonal: [],
        },
        languages: {
            languages: Array.isArray(languages)
                ? languages.map((lang: any) => ({
                    name: typeof lang === 'string' ? lang : lang.language || lang.name || '',
                    proficiency: typeof lang === 'string' ? 'Professional' : lang.proficiency || lang.level || 'Professional',
                }))
                : [],
        },
    };
}
