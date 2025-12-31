import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Sparkles, Zap, X } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { getScoreColor } from '@/lib/utils/cv-scoring';
import ScorecardPanel, { type ATSResult } from './panels/ScorecardPanel';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';

interface FloatingPulsePillProps {
    className?: string;
    atsResult?: ATSResult | null;
    isLoading?: boolean;
    analysisMode?: AnalysisMode;
}

export default function FloatingPulsePill({
    className = "",
    atsResult,
    isLoading = false,
    analysisMode = 'insufficient-data',
}: FloatingPulsePillProps) {
    const { state, dispatch } = useResumeEnhancer();
    const [position, setPosition] = useState({ x: 0, y: 0 });

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

    const handleSurgeonToggle = (e: React.MouseEvent) => {
        // Prevent toggle if dragging (using a small threshold or checking drag state? simplified for now as click vs drag distinction)
        // Framer motion usually handles click vs drag well.
        e.stopPropagation();
        dispatch({ type: 'SET_SHOW_SURGEON_OVERLAY', payload: !state.showSurgeonOverlay });
    };

    // Use ATS score if available, otherwise fall back to surgeon score
    const displayScore = atsResult?.overall_score ?? state.cvScore;
    const scoreInfo = getScoreColor(displayScore);

    const hasSuggestions = state.surgicalFixes.filter(f => f.status === 'pending').length > 0;
    const pendingCount = state.surgicalFixes.filter(f => f.status === 'pending').length;

    // Determine status label based on score
    const getStatusLabel = (score: number) => {
        if (score >= 90) return 'Perfect';
        if (score >= 80) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Needs Work';
        return 'Critical';
    };

    const statusLabel = getStatusLabel(displayScore);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: position.x, y: position.y }}
                animate={{ opacity: 1, x: position.x, y: position.y }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                className={`flex flex-col gap-3 z-[9999] items-end ${className || (state.showSurgeonOverlay ? 'absolute bottom-4 right-4' : 'fixed top-4 right-4')} `}
            >
                {/* 1. Main Score Pill */}
                <div
                    onClick={handleSurgeonToggle}
                    className="relative flex items-center bg-[#1a1a1a] rounded-full p-1 pr-12 cursor-pointer shadow-2xl border border-white/5 transition-transform hover:scale-[1.02] active:scale-[0.98] group select-none z-20 min-w-[240px]"
                    style={{
                        boxShadow: `0 0 30px ${scoreInfo.color}40`,
                    }}
                >
                    {/* Score Circle - Left */}
                    <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-[#111] border border-white/10 mr-4">
                        {/* Glow effect behind text */}
                        <div
                            className="absolute inset-0 rounded-full opacity-20 blur-md"
                            style={{ backgroundColor: scoreInfo.color }}
                        />
                        <span
                            className="text-xl font-bold relative z-10"
                            style={{ color: scoreInfo.color }}
                        >
                            {displayScore}
                        </span>
                    </div>

                    {/* Text Info */}
                    <div className="flex flex-col mr-8 flex-grow">
                        <div className="flex items-baseline gap-1.5">
                            <span
                                className="text-2xl font-bold leading-none tracking-tight"
                                style={{ color: scoreInfo.color }}
                            >
                                {displayScore}
                            </span>
                            <span className="text-sm text-white/30 font-medium">/100</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold whitespace-nowrap">CV SCORE</span>
                            <div className="w-px h-2 bg-white/20" />
                            <span className="text-xs font-bold text-white tracking-wide whitespace-nowrap">{statusLabel}</span>
                        </div>
                    </div>

                    {/* Action Icon */}
                    <div className="flex items-center gap-3 ml-auto">
                        {state.showSurgeonOverlay ? (
                            <X className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 text-[#80FF00]" />
                                <Zap className="w-5 h-5 text-white/20" />
                            </>
                        )}
                    </div>

                    {/* Badge Notification */}
                    {pendingCount > 0 && !state.showSurgeonOverlay && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#80FF00] rounded-full flex items-center justify-center border-2 border-[#1a1a1a] shadow-lg">
                            <span className="text-[10px] font-bold text-black">{pendingCount}</span>
                        </div>
                    )}
                </div>

                {/* EXPANDED: Scorecard Panel Slide-down */}
                <AnimatePresence>
                    {state.showSurgeonOverlay && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} // Bezier for smooth drawer feel
                            className="w-[320px] bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden origin-top-right z-10"
                        >
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <ScorecardPanel
                                    atsResult={atsResult || null}
                                    isLoading={isLoading}
                                    analysisMode={analysisMode}
                                    compact={true}
                                    scoreLabel="Optimization Score"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
