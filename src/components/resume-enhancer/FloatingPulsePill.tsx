import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Zap, Eye, Target, Component, PenTool } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { getScoreColor } from '@/lib/utils/cv-scoring';
import { usePillEngine } from '@/hooks/usePillEngine';
import ScorecardPanel, { type ATSResult } from './panels/ScorecardPanel';

import FixCardPanel from './panels/FixCardPanel';
import RecruiterModePanel, { type RecruiterFeatures } from './panels/RecruiterModePanel';
import ATSModePanel, { type ATSFeatures } from './panels/ATSModePanel';
import SmartContextCard from './panels/SmartContextCard';
import { Lightbulb } from 'lucide-react';
import type { FixAnnotation } from './annotations/fix-annotation';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';
import { Issue } from '@/lib/pill-engine/types';

interface FloatingPulsePillProps {
    className?: string;
    atsResult?: ATSResult | null;
    isLoading?: boolean;
    analysisMode?: AnalysisMode;
    // Sidebar Control (now just Toggle)
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    // Actions
    onFixATS?: () => void;
    onOpenReport?: () => void;
    // View Mode
    viewMode?: string;
    onViewModeChange?: (mode: any) => void;
    onAddKeyword?: (keyword: string) => void;
    onApplyFix?: (fix: FixAnnotation) => void;
    keywordAnalysis?: any;
    // New props for context warning
    onSetRole?: () => void;
    onAddJD?: () => void;
}

export default function FloatingPulsePill({
    className = "",
    atsResult,
    isLoading = false,
    analysisMode = 'insufficient-data',
    onToggleSidebar,
    onFixATS,
    onOpenReport,
    viewMode,
    onViewModeChange,
    onAddKeyword,
    onApplyFix,
    keywordAnalysis,
    onSetRole,
    onAddJD
}: FloatingPulsePillProps) {
    const { state, dispatch } = useResumeEnhancer();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [showScorecard, setShowScorecard] = useState(false);
    const [showContextCard, setShowContextCard] = useState(false); // Valid default to false (Idle state)

    // Pill Engine Integration (Command Center)
    const { issues, healthScore, masterScore, atsScore, isAnalyzing: isEngineAnalyzing, scoreResult } = usePillEngine(
        state.cvData,
        state.cvType,
        keywordAnalysis || state.keywordGapAnalysis, // Use prop or state
        { quietMode: true }
    );

    // Mode-specific feature states
    const [recruiterFeatures, setRecruiterFeatures] = useState<RecruiterFeatures>({
        heatmap: true,
        impactHighlighting: true,
        redFlags: true,
        speedRead: false,
    });
    const [atsFeatures, setATSFeatures] = useState<ATSFeatures>({
        plainText: true,
        keywordHeatmap: true,
        parsingConfidence: true,
    });

    // Fix All State
    const [isFixingAll, setIsFixingAll] = useState(false);
    const [fixQueue, setFixQueue] = useState<any[]>([]);
    const [currentFixScore, setCurrentFixScore] = useState(0);

    // Ref to access latest onApplyFix during async loop to avoid stale closures (CRITICAL)
    const onApplyFixRef = useRef(onApplyFix);
    useEffect(() => {
        onApplyFixRef.current = onApplyFix;
    }, [onApplyFix]);

    // Derived values
    const isJourneyCV = state.cvType === 'journey';

    // Prepare queue when fixes change
    useEffect(() => {
        if (state.fixAnnotations?.length > 0 && !isFixingAll) {
            const openFixes = state.fixAnnotations
                .filter(f => f.status === 'open')
                .map(f => ({
                    id: f.id,
                    issue: f.issue,
                    impactScoreDelta: f.impactScoreDelta,
                    status: 'pending'
                }));
            setFixQueue(openFixes);
            // Use CVScoringService calculated score
            const calcScore = isJourneyCV && scoreResult?.atsScore
                ? scoreResult.atsScore.total
                : (scoreResult?.cvScore?.total ?? 0);
            setCurrentFixScore(calcScore);
        }
    }, [state.fixAnnotations, isFixingAll, scoreResult, isJourneyCV]);

    const handleFixAll = async () => {
        // Debugging: Log to see if function fires
        console.log('Fix All Triggered', { onApplyFix: !!onApplyFix, queueLen: fixQueue.length });

        if (!onApplyFix || fixQueue.length === 0) {
            // If queue is empty but we clicked Fix All, maybe we meant to Scan?
            // But button label handles that. 
            // Just in case, try scan if empty.
            if (fixQueue.length === 0 && onFixATS) {
                onFixATS();
            }
            return;
        }

        setIsFixingAll(true);
        setShowScorecard(false);
        if (onToggleSidebar && state.showSurgeonOverlay) onToggleSidebar();

        // Process each fix
        for (let i = 0; i < fixQueue.length; i++) {
            const fixItem = fixQueue[i];

            // 1. Mark as processing
            setFixQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));

            // Artificial delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 800));

            // 2. Apply Fix
            const originalFix = state.fixAnnotations.find(f => f.id === fixItem.id);
            if (originalFix && onApplyFixRef.current) {
                onApplyFixRef.current(originalFix);

                // Update local score visualization
                if (fixItem.impactScoreDelta) {
                    setCurrentFixScore(prev => Math.min(100, prev + fixItem.impactScoreDelta));
                }
            }

            // 3. Mark as completed
            setFixQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'completed' } : f));

            // Short pause between items
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Keep panel open for a moment to show success? 
        // Or let user dismiss it via "See Results" button in panel.
    };

    const cancelFixing = () => {
        setIsFixingAll(false);
        // Maybe reload fresh state?
    };

    useEffect(() => {
        const savedPos = localStorage.getItem('cvcircle_pill_position');
        if (savedPos) {
            try {
                setPosition(JSON.parse(savedPos));
            } catch (e) {
                console.error('Failed to parse saved position', e);
            }
        }
    }, []);

    const handleDragEnd = (event: any, info: any) => {
        const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
        setPosition(newPos);
        localStorage.setItem('cvcircle_pill_position', JSON.stringify(newPos));
    };

    const handleIssueClick = (issue: Issue) => {
        // Scroll to section and highlight it
        if (issue.deepLink) {
            // Attempt to find element by ID or Section ID
            const targetId = issue.deepLink.sectionId || issue.deepLink.section;
            // Use broader selector search if exact ID fails
            // Assuming sections act as anchors with IDs like 'work-experience' or 'section-work' or just the UUID
            let element = document.getElementById(targetId)
                || document.getElementById(`section-${issue.deepLink.section}`)
                || document.querySelector(`[data-section-id="${targetId}"]`);

            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Simple highlight effect
                element.classList.add('ring-2', 'ring-[#80FF00]', 'transition-all', 'duration-500');
                setTimeout(() => {
                    element?.classList.remove('ring-2', 'ring-[#80FF00]');
                }, 2000);
            }
        }

        // Dispatch a custom event to open the floating form editor for this section
        // This allows Step3BuilderSurgeon to handle opening the editor
        const sectionId = issue.deepLink?.section || issue.section;
        if (sectionId) {
            // Map section names to editor-compatible IDs
            const sectionMap: Record<string, string> = {
                'work': 'work',
                'work_experience': 'work',
                'skills': 'skills',
                'summary': 'personal', // Summary is part of personal info
                'education': 'education',
                'projects': 'projects',
                'basics': 'personal',
                'personal_header': 'personal'
            };
            const editorSectionId = sectionMap[sectionId] || sectionId;

            // Dispatch event for the editor to open
            window.dispatchEvent(new CustomEvent('openSectionEditor', {
                detail: {
                    sectionId: editorSectionId,
                    issueId: issue.id,
                    suggestedFixId: issue.suggestedFixId
                }
            }));
        }
    };

    // Use Engine Health Score for Journey CVs/Command Center Mode
    // Fallback to legacy calc if needed, but Engine is primary for Command Center
    // FIX: Prioritize CVScoringService result (scoreResult) for Journey CVs to match backend
    const displayScore = isJourneyCV
        ? (scoreResult?.atsScore?.total ?? Math.round(atsScore))
        : Math.round(masterScore);
    const scoreInfo = getScoreColor(displayScore);
    const pendingCount = issues.length; // Use Engine issues count

    // Only show "Fix All" if we actually have surgical fixes in the queue
    const fixableCount = (state.fixAnnotations || []).filter(f => f.status === 'open').length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: position.x, y: position.y }}
                animate={{ opacity: 1, x: position.x, y: position.y }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                className={`flex flex-col gap-0 z-[9999] items-end ${className || 'fixed top-[88px] right-6'} `}
            >
                {/* 1. Main Control Bar */}
                <div
                    className="relative flex items-center bg-[#1a1a1a] rounded-full p-1.5 shadow-2xl border border-white/5 transition-transform hover:scale-[1.01] active:scale-[0.99] group select-none z-20 gap-4"
                    style={{
                        boxShadow: `0 0 30px ${scoreInfo.color}40`,
                    }}
                >
                    {/* Section 1: Merged Score & Fix ATS Pill */}
                    <div className="flex items-center bg-[#111] rounded-full border border-white/10 overflow-hidden relative group/score">
                        {/* Loading Wave Animation Background */}
                        {isLoading && (
                            <motion.div
                                className="absolute inset-0 z-0"
                                style={{ backgroundColor: `${scoreInfo.color}33` }} // 20% opacity (approx 33 hex)
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                        )}

                        {/* Score Part */}
                        <div
                            onClick={() => setShowScorecard(!showScorecard)}
                            className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors z-10"
                        >
                            {/* Static Glow */}
                            <div
                                className="absolute inset-0 rounded-full opacity-20 blur-md"
                                style={{ backgroundColor: scoreInfo.color }}
                            />
                            <span
                                className="text-sm font-bold relative z-10"
                                style={{ color: scoreInfo.color }}
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    displayScore
                                )}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-5 bg-white/10 z-10" />

                        {/* Fix ATS Part */}
                        {isFixingAll ? (
                            <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 h-full z-10">
                                <div className="w-2 h-2 rounded-full bg-[#80FF00] animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                                    Fixing...
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (fixableCount > 0) {
                                        handleFixAll();
                                    } else {
                                        // Auto-open scorecard when Scan ATS is clicked
                                        setShowScorecard(true);
                                        onFixATS?.();
                                    }
                                }}
                                className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 h-full z-10 hover:bg-white/5 transition-colors group/btn"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#80FF00] group-hover/btn:text-[#90ff33] transition-colors">
                                    {fixableCount > 0 ? 'Fix All' : 'Scan ATS'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Section 2: View Mode Toggles (Central) */}
                    {onViewModeChange && (
                        <div className="flex bg-white/5 rounded-full p-1 h-10 items-center">
                            {[
                                { id: 'edit', icon: PenTool, label: 'Edit', desc: 'Interactive Builder' },
                                { id: 'recruiter', icon: Eye, label: 'Recruiter', desc: 'Human View' },
                                { id: 'ats', icon: Target, label: 'ATS', desc: 'Robot View' },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={(e) => { e.stopPropagation(); onViewModeChange(mode.id); }}
                                    title={mode.desc}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${viewMode === mode.id
                                        ? 'bg-[#80FF00]/20 text-[#80FF00] shadow-sm'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <mode.icon size={12} />
                                    <span className="hidden sm:inline">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Section 2b: Smart Context Toggle */}
                    <div className="relative">
                        {(() => {
                            // Glow Logic Helper
                            const getGlowConfig = () => {
                                if (issues.length === 0) return null;

                                const hasCritical = issues.some(i => i.priority === 'critical' || i.severity === 'critical');
                                const hasAi = issues.some(i => i.priority === 'ai-insight');
                                const hasSuggestion = issues.some(i => i.severity === 'warning' || i.priority === 'suggestion');

                                if (hasCritical) return { color: 'rgba(255, 0, 0, 0.6)', duration: 1 };      // Fast
                                if (hasAi) return { color: 'rgba(138, 43, 226, 0.5)', duration: 2.5 };      // Breathing
                                if (hasSuggestion) return { color: 'rgba(255, 165, 0, 0.4)', duration: 3 }; // Slow
                                return null;
                            };

                            const glow = getGlowConfig();

                            return (
                                <div className="relative">
                                    {/* Animated Glow Layer */}
                                    {glow && !showContextCard && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full z-0"
                                            animate={{
                                                boxShadow: [
                                                    `0 0 0px ${glow.color}`,
                                                    `0 0 20px ${glow.color}`,
                                                    `0 0 0px ${glow.color}`
                                                ]
                                            }}
                                            transition={{
                                                duration: glow.duration,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowContextCard(!showContextCard);
                                        }}
                                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-white/5 shadow-lg ${showContextCard
                                            ? 'bg-[#80FF00] text-black hover:bg-[#70e600] ring-2 ring-[#80FF00]/20'
                                            : 'bg-[#1a1a1a] text-white/40 hover:text-white hover:bg-white/5'
                                            }`}
                                        title="Smart Context Helper"
                                    >
                                        <Lightbulb size={18} />
                                    </button>

                                    {/* Context Badge (Keep existing logic but z-index above glow) */}
                                    {pendingCount > 0 && !showContextCard && (
                                        <div className="absolute -top-1 -right-1 z-20 w-5 h-5 bg-[#80FF00] rounded-full flex items-center justify-center border-2 border-[#1a1a1a] shadow-lg pointer-events-none">
                                            <span className="text-[9px] font-bold text-black">{pendingCount}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>



                </div>

                {/* Dropdown 1: Scorecard Panel (Left/Main alignment) */}
                <AnimatePresence>
                    {showScorecard && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden origin-top-right z-10 self-end mt-2"
                        >
                            <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
                                <ScorecardPanel
                                    atsResult={atsResult || null}
                                    scoreResult={scoreResult}
                                    cvType={state.cvType}
                                    isLoading={isLoading}
                                    analysisMode={analysisMode}
                                    compact={true}
                                    scoreLabel={isJourneyCV ? 'ATS Score' : 'CV Score'}
                                    onAddKeyword={onAddKeyword}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dropdown: Smart Context Card */}
                <AnimatePresence>
                    {showContextCard && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden origin-top-right z-30 self-end mt-2"
                        >
                            <SmartContextCard
                                issues={issues}
                                onFix={handleIssueClick}
                                onDismiss={(id) => { /* TODO: Implement dismiss/ignore logic */ }}
                                onAiAssist={(issue) => {
                                    // Placeholder for Tier 2 Trigger
                                    console.log('AI Assist Triggered', issue);
                                    // TODO: Implement AI Hook Call
                                }}
                                onSetRole={onSetRole || undefined}
                                onAddJD={onAddJD || undefined}
                                showMissingContextWarning={analysisMode === 'insufficient-data'}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dropdown: Fix All Progress Panel */}
                <AnimatePresence>
                    {isFixingAll && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full self-end mt-2 z-20 origin-top"
                        >
                            <FixCardPanel
                                fixes={fixQueue}
                                currentScore={currentFixScore}
                                targetScore={100} // or calc max potential
                                onCancel={cancelFixing}
                                onComplete={() => setIsFixingAll(false)}
                                isFinished={fixQueue.every(f => f.status === 'completed')}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dropdown: Recruiter Mode Panel */}
                <AnimatePresence>
                    {viewMode === 'recruiter' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="self-end mt-2 z-10 origin-top-right"
                        >
                            <RecruiterModePanel
                                cvData={state.cvData}
                                features={recruiterFeatures}
                                onFeaturesChange={setRecruiterFeatures}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>


            </motion.div>
        </AnimatePresence>
    );
}
