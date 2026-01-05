import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestionCardProps {
    fixAnnotations: any[];
    activeFixId: string | null;
    onSelectFix: (fixId: string) => void;
}

export default function SuggestionCard({ fixAnnotations = [], activeFixId, onSelectFix }: SuggestionCardProps) {
    const openFixes = fixAnnotations.filter(f => f.status === 'open');
    const criticalFixes = openFixes.filter(f => f.severity === 'high');
    const improvements = openFixes.filter(f => f.severity !== 'high');

    return (
        <div className="w-[360px] min-w-[360px] max-w-[360px] bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-160px)]">
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#80FF00]" />
                    <span className="text-sm font-semibold text-white">Fix Queue</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#80FF00]/20 text-[#80FF00]">
                        {openFixes.length}
                    </span>
                </div>

                {/* Critical Fixes */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-white">Critical</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-300">
                            {criticalFixes.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {criticalFixes.length === 0 ? (
                            <div className="text-xs text-white/50 italic">No critical fixes.</div>
                        ) : (
                            criticalFixes.map((fix, idx) => (
                                <button
                                    key={fix.id || `critical-${idx}`}
                                    onClick={() => onSelectFix(fix.id)}
                                    className={`w-full text-left p-2 rounded-lg transition-colors ${activeFixId === fix.id
                                        ? 'bg-[#80FF00]/20 border border-[#80FF00]/40'
                                        : 'bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="text-xs font-medium text-white line-clamp-2">{fix.issue}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-white/50">{fix.category}</span>
                                        <span className="text-[10px] text-[#80FF00]">+{fix.impactScoreDelta || 0}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Improvements */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-white">Improvements</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-200">
                            {improvements.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {improvements.map((fix, idx) => (
                            <button
                                key={fix.id || `improvement-${idx}`}
                                onClick={() => onSelectFix(fix.id)}
                                className={`w-full text-left p-2 rounded-lg transition-colors ${activeFixId === fix.id
                                    ? 'bg-[#80FF00]/20 border border-[#80FF00]/40'
                                    : 'bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-xs font-medium text-white line-clamp-2">{fix.issue}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-white/50">{fix.category}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
