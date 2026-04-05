import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
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
import type { ValidationResult, ValidationWarning } from '@/lib/validation/cv-preview-validator';
import { Issue, type IssueType, type IssueSeverity, type IssuePriority } from '@/lib/pill-engine/types';
import { useContextToasts } from '@/hooks/useContextToasts';
import { mergeIssues, surgicalFixesToIssues } from '@/lib/services/surgicalFixToIssueAdapter';

export interface FloatingPulsePillHandle {
    focusFix: (fixId: string) => void;
}

interface FloatingPulsePillProps {
    className?: string;
    atsResult?: ATSResult | null;
    isLoading?: boolean;
    /** When true, suppresses pill engine auto-analysis (during CV surgeon scan) */
    isScanning?: boolean;
    analysisMode?: AnalysisMode;
    /** CV layout validation result — merged into smart context suggestions */
    validationResult?: ValidationResult | null;
    /** DOM element to portal panels into (e.g. side panel container). When set, panels render there instead of below the pill. */
    portalTarget?: HTMLElement | null;
    /** Called when an issue is hovered — for highlighting the affected text in preview */
    onIssueHover?: (fieldPath: string | null) => void;
    /** Called when any panel opens/closes — parent uses this to show/hide the side panel container */
    onPanelOpenChange?: (isOpen: boolean) => void;
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

export default forwardRef(function FloatingPulsePill({
    className = "",
    atsResult,
    isLoading = false,
    isScanning = false,
    analysisMode = 'insufficient-data',
    validationResult,
    portalTarget,
    onIssueHover,
    onPanelOpenChange,
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
}: FloatingPulsePillProps, ref: React.Ref<FloatingPulsePillHandle>) {
    const { state, dispatch } = useResumeEnhancer();
    const [showScorecard, setShowScorecard] = useState(true); // Default expanded
    const [showContextCard, setShowContextCard] = useState(false);
    const [focusedFixId, setFocusedFixId] = useState<string | null>(null);

    // Expose focusFix method to parent via ref
    useImperativeHandle(ref, () => ({
        focusFix: (fixId: string) => {
            setShowContextCard(true);
            setShowScorecard(false);
            setFocusedFixId(fixId);
            // Clear focused state after animation completes
            setTimeout(() => setFocusedFixId(null), 2000);
        }
    }), []);

    // Pill Engine Integration (Command Center)
    // Suppress auto-analysis during CV surgeon scan to prevent loop
    const { issues, healthScore, masterScore, atsScore, isAnalyzing: isEngineAnalyzing, scoreResult } = usePillEngine(
        state.cvData,
        state.cvType,
        keywordAnalysis || state.keywordGapAnalysis,
        { quietMode: true },
        isScanning // Suppress pill engine during scan
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
            // Use CentralScoreManager calculated score
            const calcScore = isJourneyCV && scoreResult?.atsScore
                ? scoreResult.atsScore.total
                : (scoreResult?.cvScore?.total ?? 0);
            setCurrentFixScore(calcScore);
        }
    }, [state.fixAnnotations, isFixingAll, scoreResult, isJourneyCV]);

    // MERGE FIX ANNOTATIONS INTO ISSUES FOR SMART CONTEXT
    // Using the centralized SurgicalFixToIssueAdapter
    // Deduplicates by ID to prevent issues from appearing twice when scan runs multiple times
    const allIssues = useMemo(() => {
        const engineIssues = issues || [];
        
        // Convert fixAnnotations to SurgicalFix format
        const surgicalFixes = (state.fixAnnotations || [])
            .filter(f => f.status === 'open')
            .map(fix => ({
                id: fix.id,
                section: fix.fieldPath?.split(/[.[]/)[0] || 'basics',
                category: fix.category as any,
                severity: fix.severity as any,
                fieldPath: fix.fieldPath,
                issue: fix.issue,
                original_text: fix.originalText || '',
                fixed_text: fix.replacementText || '',
                impact_score_delta: fix.impactScoreDelta || 0,
                status: 'pending' as const,
            }));

        // Convert validation warnings to issues
        const validationIssues = (validationResult?.warnings || []).map(w => {
            const ruleToType: Record<string, IssueType> = {
                'profile-max-lines': 'SUMMARY_TOO_LONG',
                'profile-max-chars': 'SUMMARY_TOO_LONG',
                'missing-name': 'EMPTY_SECTION',
                'missing-email': 'UNPROFESSIONAL_EMAIL',
                'missing-summary': 'GENERIC_OBJECTIVE',
                'long-url': 'VISUAL_DENSITY',
                'job-description-format': 'LOW_BULLET_COUNT',
                'bullet-action-verb': 'WEAK_VERB',
                'max-bullets': 'UNBALANCED_DETAIL',
                'required-dates': 'CHRONOLOGY_ERROR',
                'required-fields': 'EMPTY_SECTION',
                'recommended-fields': 'EMPTY_SECTION',
                'skill-max-words': 'VISUAL_DENSITY',
            };

            return {
                id: w.id,
                type: ruleToType[w.rule] || 'IMPROVEMENT',
                severity: (w.type === 'error' ? 'critical' : w.type === 'warning' ? 'warning' : 'info') as IssueSeverity,
                priority: (w.type === 'error' ? 'critical' : 'suggestion') as IssuePriority,
                tier: w.type === 'error' ? 1 : w.type === 'warning' ? 2 : 3,
                section: (w.section === 'work_experience' ? 'work' : w.section === 'personal_header' ? 'basics' : w.section),
                sectionId: w.section,
                message: w.message,
                meta: { field: w.field, rule: w.rule },
                deepLink: { section: w.section === 'work_experience' ? 'work' : w.section === 'personal_header' ? 'basics' : w.section },
            } as Issue;
        });

        // Use the adapter to merge engine + surgical fixes, then append validation issues
        const merged = mergeIssues(engineIssues, surgicalFixes);
        const allRaw = [...merged, ...validationIssues] as Issue[];
        
        // Deduplicate by ID - surgical fixes take priority over engine issues
        const seenIds = new Set<string>();
        const deduplicated: Issue[] = [];
        
        // First pass: add surgical fixes (they have suggestedFixId)
        for (const issue of allRaw) {
            if (issue.suggestedFixId && !seenIds.has(issue.suggestedFixId)) {
                seenIds.add(issue.suggestedFixId);
                deduplicated.push(issue);
            }
        }
        
        // Second pass: add remaining issues that weren't deduplicated
        for (const issue of allRaw) {
            const checkId = issue.suggestedFixId || issue.id;
            if (!seenIds.has(checkId)) {
                seenIds.add(checkId);
                deduplicated.push(issue);
            }
        }
        
        return deduplicated;
    }, [issues, state.fixAnnotations, validationResult]);

    // Auto-open smart context when suggestions are available - Only on initial load if needed
    // Removed to allow manual toggle without side effects on scorecard state
    /*
    useEffect(() => {
        if (allIssues.length > 0 && !showContextCard) {
            setShowContextCard(true);
            setShowScorecard(false);
        }
    }, [allIssues.length, showContextCard]);
    */

    // Notify parent when any panel opens/closes - Disabled as sidebar column is removed
    /*
    const hasAnyPanelOpen = showScorecard || showContextCard || isFixingAll || viewMode === 'recruiter';
    useEffect(() => {
        onPanelOpenChange?.(hasAnyPanelOpen);
    }, [hasAnyPanelOpen, onPanelOpenChange]);
    */

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
    };

    const handleIssueClick = (issue: Issue) => {
        // Scroll to section and highlight it in the preview
        if (issue.deepLink) {
            const targetId = issue.deepLink.sectionId || issue.deepLink.section;
            let element = document.getElementById(targetId)
                || document.getElementById(`section-${issue.deepLink.section}`)
                || document.querySelector(`[data-section-id="${targetId}"]`);

            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-[#80FF00]', 'transition-all', 'duration-500');
                setTimeout(() => {
                    element?.classList.remove('ring-2', 'ring-[#80FF00]');
                }, 2000);
            }
        }

        // Highlight the specific field in the preview
        const fieldPath = issue?.meta?.field || issue?.deepLink?.field || null;
        if (fieldPath) {
            onIssueHover?.(fieldPath);
            setTimeout(() => onIssueHover?.(null), 3000);
        }
    };

    const handleAiAssist = (issue: Issue) => {
        // Find the matching fix annotation for this issue
        const matchingFix = (state.fixAnnotations || []).find(
            f => f.status === 'open' && (f.id === issue.suggestedFixId || f.fieldPath === issue.deepLink?.field)
        );

        if (matchingFix && onApplyFixRef.current) {
            // Apply the fix directly via the AI-recommended replacement
            onApplyFixRef.current(matchingFix);
        } else {
            // Scroll to the section in the WYSIWYG canvas for inline editing
            const sectionId = issue.deepLink?.section || issue.section;
            if (sectionId) {
                const sectionMap: Record<string, string> = {
                    'work': 'experience',
                    'work_experience': 'experience',
                    'skills': 'skills',
                    'summary': 'summary',
                    'education': 'education',
                    'projects': 'projects',
                    'basics': 'header',
                    'personal_header': 'header',
                    'personal': 'header',
                    'certificates': 'certifications',
                    'certifications': 'certifications',
                };
                const canvasCategory = sectionMap[sectionId] || sectionId;

                // Try to scroll to the section in the canvas via data attribute
                const sectionEl = document.querySelector(`[data-snippet-category="${canvasCategory}"]`);
                if (sectionEl) {
                    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sectionEl.classList.add('ring-2', 'ring-[#80FF00]', 'transition-all', 'duration-500');
                    setTimeout(() => {
                        sectionEl?.classList.remove('ring-2', 'ring-[#80FF00]');
                    }, 2000);
                } else {
                    // Fallback: dispatch event for backward compatibility
                    window.dispatchEvent(new CustomEvent('openSectionEditor', {
                        detail: {
                            sectionId: canvasCategory,
                            issueId: issue.id,
                            suggestedFixId: issue.suggestedFixId
                        }
                    }));
                }
            }
        }
    };

    // REALTIME TOAST NOTIFICATIONS FOR CONTEXT ISSUES
    useContextToasts(allIssues, {
        onFix: handleIssueClick,
        onDismiss: (issueId) => {
            // Optional: Track dismissals in state if needed
            console.log('Issue dismissed:', issueId);
        },
        onAiAssist: (issue) => {
            handleAiAssist(issue);
        },
        enabled: true // Could make this conditional based on user preferences
    });

    // Use Engine Health Score for Journey CVs/Command Center Mode
    // Fallback to legacy calc if needed, but Engine is primary for Command Center
    // FIX: Prioritize CentralScoreManager result (scoreResult) for Journey CVs to match backend
    const displayScore = isJourneyCV
        ? (scoreResult?.atsScore?.total ?? Math.round(atsScore))
        : Math.round(masterScore);
    const scoreInfo = getScoreColor(displayScore);
    const pendingCount = allIssues.length; // Use merged issues count

    // Only show "Fix All" if we actually have surgical fixes in the queue
    const fixableCount = (state.fixAnnotations || []).filter(f => f.status === 'open').length;

    // ─── PANELS CONTENT ────────────────────────────────────
    function renderPanels() {
        return (
            <div className="absolute top-full mt-3 left-0 w-full flex flex-col gap-3 pointer-events-none z-[100]">
                {/* Scorecard Panel - ALWAYS TOP */}
                <AnimatePresence>
                    {showScorecard && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden origin-top pointer-events-auto"
                        >
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
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

                {/* Smart Context Card */}
                <AnimatePresence>
                    {showContextCard && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden origin-top pointer-events-auto max-h-[60vh] overflow-y-auto custom-scrollbar"
                        >
                            <SmartContextCard
                                issues={allIssues}
                                onFix={handleIssueClick}
                                onDismiss={(id) => { }}
                                onAiAssist={handleAiAssist}
                                onIssueHover={(issue) => {
                                    const fieldPath = issue?.meta?.field || issue?.deepLink?.field || null;
                                    onIssueHover?.(fieldPath);
                                }}
                                focusedIssueId={focusedFixId}
                                onSetRole={onSetRole || undefined}
                                onAddJD={onAddJD || undefined}
                                showMissingContextWarning={analysisMode === 'insufficient-data'}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fix All Progress Panel */}
                <AnimatePresence>
                    {isFixingAll && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full pointer-events-auto origin-top"
                        >
                            <FixCardPanel
                                fixes={fixQueue}
                                currentScore={currentFixScore}
                                targetScore={100}
                                onCancel={cancelFixing}
                                onComplete={() => setIsFixingAll(false)}
                                isFinished={fixQueue.every(f => f.status === 'completed')}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recruiter Mode Panel */}
                <AnimatePresence>
                    {viewMode === 'recruiter' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full pointer-events-auto origin-top"
                        >
                            <RecruiterModePanel
                                cvData={state.cvData}
                                features={recruiterFeatures}
                                onFeaturesChange={setRecruiterFeatures}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    const panelsContent = renderPanels();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative inline-block z-[150] max-sm:fixed max-sm:top-[72px] max-sm:left-1/2 max-sm:-translate-x-1/2 ${className}`}
        >
                {/* 1. Main Control Bar */}
                <div
                    className="relative flex items-center bg-[#1a1a1a] rounded-full p-1.5 shadow-2xl border border-white/5 transition-transform hover:scale-[1.01] active:scale-[0.99] group select-none z-[120] gap-4"
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
                                if (allIssues.length === 0) return null;

                                const hasCritical = allIssues.some(i => i.priority === 'critical' || i.severity === 'critical');
                                const hasAi = allIssues.some(i => i.priority === 'ai-insight');
                                const hasSuggestion = allIssues.some(i => i.severity === 'warning' || i.priority === 'suggestion');

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
                                        className={`relative z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-white/5 shadow-lg ${showContextCard
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

                {/* Panels Rendering: Always inline below pill now as requested */}
                {panelsContent}
            </motion.div>
    );
})

