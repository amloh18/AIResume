'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Context & Components
import { LinkedInEnhancerProvider, useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';
import LinkedInEnhancerDashboard from './LinkedInEnhancerDashboard';
import LinkedInHeader from './LinkedInHeader';
import LinkedInHeroCard from './LinkedInHeroCard';
import LinkedInAboutCard from './LinkedInAboutCard';
import LinkedInExperienceCard from './LinkedInExperienceCard';
import LinkedInEducationCard from './LinkedInEducationCard';
import LinkedInProjectsCard from './LinkedInProjectsCard';
import LinkedInSkillsCard from './LinkedInSkillsCard';
import LinkedInLanguagesCard from './LinkedInLanguagesCard';
import LinkedInRecommendationsSidebar from './LinkedInRecommendationsSidebar';
import LinkedInLeftSidebar from './LinkedInLeftSidebar';
import { PanelRightClose, PanelRightOpen, CheckSquare } from 'lucide-react';
import BrowserExtensionModal from './BrowserExtensionModal';
import SuccessFeedbackModal from './SuccessFeedbackModal';

// Types
import type { CVSelectionItem } from '@/types/linkedin';
import { LINKEDIN_COLORS } from '@/types/linkedin';

export default function LinkedInEnhancementFlow({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
    const router = useRouter();
    const { state, dispatch, setTone, selectCv, triggerEnhancement } = useLinkedInEnhancer();
     const [availableCvs, setAvailableCvs] = useState<CVSelectionItem[]>([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
    const [showInsights, setShowInsights] = useState(false);
    const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
        hero: true,
        about: true,
        experience: true,
        education: true,
        projects: true,
        skills_matrix: true,
        languages: true
    });
    const [isFetchingFromLinkedIn, setIsFetchingFromLinkedIn] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Modal states
    const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [appliedSectionsCount, setAppliedSectionsCount] = useState(0);

    // Fetch user profile image from settings
    useEffect(() => {
        async function fetchUserProfile() {
            try {
                const response = await fetch('/api/user/profile');
                if (response.ok) {
                    const data = await response.json();
                    setUserProfileImage(data.user?.image || data.user?.picture || null);
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        }
        fetchUserProfile();
    }, []);

    // Fetch available CVs on mount
    useEffect(() => {
        async function fetchCvs() {
            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                // Fetch Master CV from correct endpoint
                const masterResponse = await fetch('/api/cvs/master');
                let masterCv: CVSelectionItem | null = null;

                if (masterResponse.ok) {
                    const masterData = await masterResponse.json();
                    // Response format: { success: true, data: { masterCV: {...} } }
                    if (masterData.success && masterData.data?.masterCV) {
                        const mcv = masterData.data.masterCV;
                        masterCv = {
                            id: mcv.id || mcv._id,
                            name: 'Master CV',
                            type: 'master' as const,
                            updatedAt: mcv.updatedAt || new Date().toISOString(),
                        };
                    }
                }

                // Fetch Standalone CVs
                const cvsResponse = await fetch('/api/cv?type=standalone');
                let standaloneCvs: CVSelectionItem[] = [];

                if (cvsResponse.ok) {
                    const cvsData = await cvsResponse.json();
                    if (Array.isArray(cvsData)) {
                        standaloneCvs = cvsData.map((cv: any) => ({
                            id: cv._id || cv.id,
                            name: cv.documentName || cv.title || 'Untitled CV',
                            type: 'standalone' as const,
                            updatedAt: cv.updatedAt || new Date().toISOString(),
                        }));
                    }
                }

                const allCvs = [
                    ...(masterCv ? [masterCv] : []),
                    ...standaloneCvs,
                ];

                setAvailableCvs(allCvs);

                // Auto-select first CV (Master CV if available)
                if (allCvs.length > 0) {
                    const firstCv = allCvs[0];
                    selectCv(firstCv.id, firstCv.type);
                    await loadCvData(firstCv.id, firstCv.type);
                } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }

                setInitialLoadComplete(true);
            } catch (error) {
                console.error('Failed to fetch CVs:', error);
                dispatch({ type: 'SET_ERROR', payload: 'Failed to load CVs' });
                dispatch({ type: 'SET_LOADING', payload: false });
                setInitialLoadComplete(true);
            }
        }

        fetchCvs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load CV data and transform to LinkedIn sections
    const loadCvData = useCallback(async (cvId: string, cvType: 'master' | 'standalone') => {
        try {
            const endpoint = cvType === 'master' ? '/api/cvs/master' : `/api/cv/${cvId}`;
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error('Failed to load CV');
            }

            const data = await response.json();
            // Master CV response: { success, data: { masterCV: { cvData: {...} } } }
            // Standalone CV response: { cvData: {...} } or the direct CV object
            const cvData = cvType === 'master'
                ? data.data?.masterCV?.cvData || data.data?.masterCV
                : data.cvData || data;

            // Transform CV data to LinkedIn sections
            const sections = transformCvToLinkedInSections(cvData);

            dispatch({
                type: 'LOAD_CV_DATA',
                payload: { sections, cvId, cvType },
            });

            // Trigger enhancement immediately after state update
            // Use requestAnimationFrame to ensure state is committed
            requestAnimationFrame(() => {
                triggerEnhancement(cvId, cvType, false);
            });

            dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
            console.error('Failed to load CV data:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load CV data' });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [dispatch, triggerEnhancement]);

     // Handle CV selection change
    const handleCvSelect = useCallback(async (id: string, type: 'master' | 'standalone') => {
        selectCv(id, type);
        dispatch({ type: 'SET_LOADING', payload: true });
        await loadCvData(id, type);
    }, [selectCv, loadCvData, dispatch]);

    // Fetch CV data from LinkedIn
    const handleFetchFromLinkedIn = useCallback(async () => {
        setIsFetchingFromLinkedIn(true);
        setFetchError(null);
        
        try {
            const response = await fetch('/api/linkedin/import');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch from LinkedIn');
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                // Transform the LinkedIn data to LinkedIn sections
                const sections = transformCvToLinkedInSections(data.data);
                
                // Create a temporary CV entry
                const tempCv: CVSelectionItem = {
                    id: `linkedin_${Date.now()}`,
                    name: 'LinkedIn Profile',
                    type: 'standalone',
                    updatedAt: new Date().toISOString(),
                };
                
                // Add to available CVs and select it
                setAvailableCvs([tempCv]);
                selectCv(tempCv.id, tempCv.type);
                
                // Load the data
                dispatch({
                    type: 'LOAD_CV_DATA',
                    payload: { sections, cvId: tempCv.id, cvType: tempCv.type },
                });
                
                // Trigger enhancement
                requestAnimationFrame(() => {
                    triggerEnhancement(tempCv.id, tempCv.type, false);
                });
                
                dispatch({ type: 'SET_LOADING', payload: false });
            } else {
                throw new Error(data.error || 'Failed to fetch from LinkedIn');
            }
        } catch (error: any) {
            console.error('LinkedIn fetch error:', error);
            setFetchError(error.message || 'Failed to fetch from LinkedIn');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch from LinkedIn' });
            dispatch({ type: 'SET_LOADING', payload: false });
        } finally {
            setIsFetchingFromLinkedIn(false);
        }
    }, [dispatch, selectCv, triggerEnhancement]);

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
    const handleToneChangeWithRegenerate = useCallback((tone: 'Professional' | 'Visionary' | 'Technical' | 'Relatable') => {
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

    // Show loading state with skeleton sections while checking for CVs
    if (!initialLoadComplete) {
        return (
            <div
                className="min-h-screen flex flex-col bg-[#f3f2ee] dark:bg-[#1a230f]"
            >
                <LinkedInHeader
                    availableCvs={[]}
                    selectedCvId={null}
                    onCvSelect={() => { }}
                    onRegenerate={() => { }}
                    isEnhancing={false}
                    currentTone={state.user_context.tone_selection}
                    onToneChange={setTone}
                />
                {/* Show skeleton sections instead of loading card */}
                <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-100 rounded w-full" />
                                        <div className="h-4 bg-gray-100 rounded w-5/6" />
                                        <div className="h-4 bg-gray-100 rounded w-4/6" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                                    <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
                                    <div className="space-y-2">
                                        <div className="h-3 bg-gray-100 rounded w-full" />
                                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // No CVs available
    if (initialLoadComplete && availableCvs.length === 0) {
        return (
            <div
                className="min-h-screen flex flex-col bg-[#f3f2ee] dark:bg-[#1a230f]"
            >
                <LinkedInHeader
                    availableCvs={[]}
                    selectedCvId={null}
                    onCvSelect={() => { }}
                    onRegenerate={() => { }}
                    isEnhancing={false}
                    currentTone={state.user_context.tone_selection}
                    onToneChange={setTone}
                />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Create a CV First
                        </h2>
                        <p className="text-gray-600 mb-6">
                            To enhance your LinkedIn profile, you'll need to create a Master CV or standalone CV first.
                        </p>
                        <motion.button
                            onClick={() => router.push('/editor')}
                            className="px-6 py-2.5 rounded-lg text-white font-medium"
                            style={{ backgroundColor: LINKEDIN_COLORS.PRIMARY_BLUE }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Create CV
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col bg-[#f3f2ee] dark:bg-[#1a230f]"
        >
             {/* Header */}
            <LinkedInHeader
                availableCvs={availableCvs}
                selectedCvId={state.selectedCvId}
                onCvSelect={handleCvSelect}
                onRegenerate={handleRegenerate}
                isEnhancing={state.isEnhancing}
                currentTone={state.user_context.tone_selection}
                onToneChange={setTone}
                onToneChangeWithRegenerate={handleToneChangeWithRegenerate}
                onFetchFromLinkedIn={handleFetchFromLinkedIn}
                isFetchingFromLinkedIn={isFetchingFromLinkedIn}
            />

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                {/* Loading State */}
                <AnimatePresence mode="wait">
                    {state.isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            {/* Left Column Skeleton */}
                            <div className="lg:col-span-2 space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-5/6" />
                                            <div className="h-4 bg-gray-100 rounded w-4/6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Right Column Skeleton */}
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                                        <div className="h-16 bg-gray-100 rounded" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : state.error && state.sections.hero.status === 'ORIGINAL' ? (
                        // Show skeleton sections if AI failed and no enhanced data
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            {/* Error Banner */}
                            <div className="lg:col-span-3 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-800 font-medium">AI Enhancement Failed</p>
                                    <p className="text-red-600 text-sm">{state.error}</p>
                                </div>
                                <motion.button
                                    onClick={handleRegenerate}
                                    className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Retry
                                </motion.button>
                            </div>

                            {/* Skeleton Sections */}
                            <div className="lg:col-span-2 space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-5/6" />
                                            <div className="h-4 bg-gray-100 rounded w-4/6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                                        <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-full" />
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                        <p className="text-red-600 text-sm">{state.error}</p>
                                    </div>
                                    <motion.button
                                        onClick={handleRegenerate}
                                        className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Retry
                                    </motion.button>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
                                {/* Left Sidebar */}
                                <div className="w-full lg:w-72 flex-shrink-0 sticky top-[72px]">
                                    <LinkedInLeftSidebar userProfileImage={userProfileImage} />
                                </div>

                                {/* Main Content - Cards */}
                                <div className="flex-1 min-w-0 space-y-4">
                                    {/* Toolbar */}
                                    <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-[72px] z-30">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700">Preview Changes</span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                                {Object.values(state.sections).filter(s => s.status === 'ACCEPTED').length} accepted
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <motion.button
                                                onClick={() => setShowInsights(!showInsights)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {showInsights ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                                                {showInsights ? 'Hide Insights' : 'Show Insights'}
                                            </motion.button>
                                            
                                            <motion.a
                                                href="https://www.linkedin.com/in/me/edit/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <span>Open LinkedIn</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </motion.a>
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
                                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                                        <div className="mb-4 text-center">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to apply these changes?</h3>
                                            <p className="text-gray-600 text-sm">
                                                Select the sections you want to apply. Our browser extension will safely guide you through updating your LinkedIn profile.
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                                                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                                                            !isModified ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 border-gray-100' :
                                                            selectedSections[key] 
                                                                ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500' 
                                                                : 'bg-white border-gray-200 hover:border-blue-300'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedSections[key]}
                                                            disabled={!isModified}
                                                            onChange={(e) => setSelectedSections(prev => ({...prev, [key]: e.target.checked}))}
                                                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-medium text-gray-800">{label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-center">
                                            <motion.button
                                                onClick={handlePreviewAndApply}
                                                disabled={getSelectedSectionsCount() === 0}
                                                className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-full shadow-md transition-colors ${
                                                    getSelectedSectionsCount() === 0
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-[#0a66c2] hover:bg-[#004182] text-white'
                                                }`}
                                                whileHover={getSelectedSectionsCount() > 0 ? { scale: 1.05 } : {}}
                                                whileTap={getSelectedSectionsCount() > 0 ? { scale: 0.95 } : {}}
                                            >
                                                <CheckSquare className="w-5 h-5" />
                                                <span>Preview & Apply Changes</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Sidebar - Recommendations */}
                                {showInsights && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20, width: 0 }}
                                        animate={{ opacity: 1, x: 0, width: 'auto' }}
                                        exit={{ opacity: 0, x: 20, width: 0 }}
                                        className="w-full lg:w-80 flex-shrink-0 space-y-4"
                                    >
                                        <LinkedInRecommendationsSidebar
                                            sideCards={state.side_cards}
                                            careerGuide={state.career_guide}
                                            audit={state.audit}
                                            isLoading={state.isEnhancing}
                                        />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Enhancement Loading Overlay - Only show on regenerate */}
            <AnimatePresence>
                {state.showEnhancingOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 w-full"
                        >
                            {/* Animated AI brain icon */}
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    animate={{
                                        rotate: 360,
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                                        scale: { duration: 1.5, repeat: Infinity }
                                    }}
                                    style={{ opacity: 0.2 }}
                                />
                                <motion.div
                                    className="absolute inset-2 rounded-full bg-white flex items-center justify-center shadow-inner"
                                >
                                    <motion.span
                                        className="text-2xl"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        🧠
                                    </motion.span>
                                </motion.div>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                                Enhancing Your Profile
                            </h3>
                            <p className="text-sm text-gray-500 mb-6 text-center">
                                AI is optimizing your LinkedIn presence
                            </p>

                            {/* Animated AI Steps */}
                            <div className="space-y-3 mb-6">
                                {[
                                    { label: 'Analyzing CV structure...', icon: '📊', delay: 0 },
                                    { label: 'Extracting key achievements...', icon: '🎯', delay: 1.5 },
                                    { label: 'Identifying power keywords...', icon: '🔍', delay: 3 },
                                    { label: 'Optimizing for SEO...', icon: '✨', delay: 4.5 },
                                    { label: 'Generating LinkedIn-ready content...', icon: '📝', delay: 6 },
                                ].map((step, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="flex items-center gap-3 text-sm"
                                        initial={{ opacity: 0.3, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: step.delay * 0.3, duration: 0.5 }}
                                    >
                                        <motion.span
                                            animate={{
                                                scale: [1, 1.3, 1],
                                                opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{
                                                delay: step.delay * 0.3,
                                                duration: 1.5,
                                                repeat: Infinity
                                            }}
                                        >
                                            {step.icon}
                                        </motion.span>
                                        <motion.span
                                            className="text-gray-700"
                                            animate={{ opacity: [0.5, 1] }}
                                            transition={{ delay: step.delay * 0.3 + 0.2 }}
                                        >
                                            {step.label}
                                        </motion.span>
                                        <motion.div
                                            className="ml-auto"
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: step.delay * 0.3 + 1 }}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                                <motion.span
                                                    className="text-green-600 text-xs"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: step.delay * 0.3 + 1.2 }}
                                                >
                                                    ✓
                                                </motion.span>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Shimmer progress bar */}
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%]"
                                    initial={{ width: '0%' }}
                                    animate={{
                                        width: '100%',
                                        backgroundPosition: ['0% 0%', '200% 0%']
                                    }}
                                    transition={{
                                        width: { duration: 8, ease: 'easeInOut' },
                                        backgroundPosition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
                                    }}
                                />
                            </div>

                            <p className="text-xs text-gray-400 mt-3 text-center">
                                This typically takes 10-15 seconds
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
        </div>
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
        education: education.map((edu: any, idx: number) => ({
            id: edu.id || edu._id || `edu_${idx}`,
            institution: edu.institution || edu.school || edu.university || '',
            degree: edu.degree || edu.qualification || '',
            field: edu.field || edu.fieldOfStudy || edu.major || '',
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
                ? skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill || '')
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
