import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelRightClose, PanelRightOpen, Sparkles, Zap, Eye, Target, Component, PenTool } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { getScoreColor } from '@/lib/utils/cv-scoring';
import { CVScoringService, type ScoreResult } from '@/lib/services/cv-scoring-service';
import ScorecardPanel, { type ATSResult } from './panels/ScorecardPanel';
import SuggestionCard from './panels/SuggestionCard';
import FixCardPanel from './panels/FixCardPanel';
import RecruiterModePanel, { type RecruiterFeatures } from './panels/RecruiterModePanel';
import ATSModePanel, { type ATSFeatures } from './panels/ATSModePanel';
import type { FixAnnotation } from './annotations/fix-annotation';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';

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
}: FloatingPulsePillProps) {
    const { state, dispatch } = useResumeEnhancer();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [showScorecard, setShowScorecard] = useState(false);

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

    // Calculate score using CVScoringService (single source of truth) - must be before useEffects that use it
    const scoreResult = useMemo(() => {
        if (!state.cvData) return null;
        return CVScoringService.getFullScoreResult(
            state.cvData,
            state.keywordGapAnalysis || undefined,
            state.atsScoreCap
        );
    }, [state.cvData, state.keywordGapAnalysis, state.atsScoreCap]);

    // Derived values - use CVScoringService score instead of AI-generated atsResult
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
        if (!onApplyFix || fixQueue.length === 0) return;

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

    // Display score and color info
    const displayScore = isJourneyCV && scoreResult?.atsScore
        ? scoreResult.atsScore.total
        : (scoreResult?.cvScore?.total ?? 0);
    const scoreInfo = getScoreColor(displayScore);
    const pendingCount = (state.fixAnnotations || []).filter((f: any) => f.status === 'open').length;

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
                                    if (pendingCount > 0) {
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
                                    {pendingCount > 0 ? 'Fix All' : 'Scan ATS'}
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

                    {/* Section 3: Surgeon Toggle (Toggles Suggestion Card) */}
                    {onToggleSidebar && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSidebar(); // Toggles state.showSurgeonOverlay
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-white/5 shadow-lg ${state.showSurgeonOverlay
                                ? 'bg-[#80FF00] text-black hover:bg-[#70e600] ring-2 ring-[#80FF00]/20'
                                : 'bg-[#1a1a1a] text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            title={state.showSurgeonOverlay ? "Close Suggestions" : "Open Suggestions"}
                        >
                            {state.showSurgeonOverlay ? <PanelRightClose size={18} className="rotate-90" /> : <PanelRightOpen size={18} className="rotate-90" />}
                        </button>
                    )}
                    {/* Badge Notification */}
                    {pendingCount > 0 && !state.showSurgeonOverlay && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#80FF00] rounded-full flex items-center justify-center border-2 border-[#1a1a1a] shadow-lg pointer-events-none">
                            <span className="text-[9px] font-bold text-black">{pendingCount}</span>
                        </div>
                    )}
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
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={onOpenReport}
                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 py-2 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        <Zap size={14} /> Report
                                    </button>
                                </div>
                                <div className="h-px bg-white/10" />
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

                {/* Dropdown: ATS Mode Panel */}
                <AnimatePresence>
                    {viewMode === 'ats' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="self-end mt-2 z-10 origin-top-right"
                        >
                            <ATSModePanel
                                cvData={state.cvData}
                                jobData={state.jobData}
                                templateName={state.selectedTemplate?.name}
                                features={atsFeatures}
                                onFeaturesChange={setATSFeatures}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dropdown: Suggestion Card (Right alignment) */}
                <AnimatePresence>
                    {state.showSurgeonOverlay && viewMode === 'edit' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="self-end mt-2 z-10 origin-top-right"
                        >
                            <SuggestionCard
                                fixAnnotations={state.fixAnnotations || []}
                                activeFixId={state.activeFixId ?? null}
                                onSelectFix={(fixId) => dispatch({ type: 'SET_ACTIVE_FIX', payload: fixId })}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
