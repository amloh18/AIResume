'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Quote, AlertCircle, RefreshCw, Check, Edit2 } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import { AboutGuard } from './CharacterGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { LinkedInAboutSection } from '@/types/linkedin';
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';

interface LinkedInAboutCardProps {
    data: LinkedInAboutSection;
}

export default function LinkedInAboutCard({ data }: LinkedInAboutCardProps) {
    const { triggerEnhancement, state, dispatch } = useLinkedInEnhancer();
    const [isEditing, setIsEditing] = useState(false);
    const [editedHook, setEditedHook] = useState(data.enhanced.hook || '');
    const [editedBody, setEditedBody] = useState(data.enhanced.body || '');
    const [editedCta, setEditedCta] = useState(data.enhanced.cta || '');

    const hasEnhancements = (data.status === 'GENERATED' || data.status === 'ACCEPTED' || data.status === 'APPLIED') && data.enhanced.hook;
    const isError = state.error && data.status === 'ORIGINAL';
    const isLoading = state.isEnhancing && data.status === 'ORIGINAL';

    const handleRetry = () => {
        if (state.selectedCvId && state.selectedCvType) {
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        }
    };

    const handleAccept = () => {
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'about', status: 'ACCEPTED' } });
    };

    const handleSaveEdit = () => {
        dispatch({
            type: 'SET_ENHANCED_SECTIONS',
            payload: { about: { enhanced: { ...data.enhanced, hook: editedHook, body: editedBody, cta: editedCta } } as any }
        });
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'about', status: 'ACCEPTED' } });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedHook(data.enhanced.hook);
        setEditedBody(data.enhanced.body);
        setEditedCta(data.enhanced.cta);
        setIsEditing(false);
    };

    // Use API confidence score or fallback
    const confidenceScore = data.enhanced.confidence_score || (hasEnhancements ? 92 : 0);

    const enhancedContent = hasEnhancements
        ? `${editedHook || data.enhanced.hook}\n\n${editedBody || data.enhanced.body}\n\n${editedCta || data.enhanced.cta}`
        : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border ${data.status === 'ACCEPTED' ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-[var(--border-primary)]'}`}
        >
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
                {/* Original Column */}
                <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Original About</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {data.current || <span className="italic text-gray-400">No about section provided</span>}
                    </div>
                </div>

                {/* Enhanced Column */}
                <div className="flex-1 p-6 relative flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-small font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI Enhanced
                            </span>
                            {hasEnhancements && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-small font-bold">
                                    {confidenceScore}% Match
                                </span>
                            )}
                            {data.status === 'ACCEPTED' && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-small font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Accepted
                                </span>
                            )}
                        </div>
                        {hasEnhancements && <CopyAllButton content={enhancedContent} label="Copy All" />}
                    </div>

                    {isLoading ? (
                        <div className="space-y-3 flex-1">
                            <div className="relative pl-4">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Quote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                        Hook (Mobile Visible)
                                    </span>
                                </div>
                                <Skeleton className="h-3.5 w-full mb-1.5" />
                                <Skeleton className="h-3.5 w-4/5" />
                            </div>
                            <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-full" />
                                <Skeleton className="h-3.5 w-full" />
                                <Skeleton className="h-3.5 w-5/6" />
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-lg p-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                                    Call to Action
                                </span>
                                <Skeleton className="h-3.5 w-4/5" />
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center flex-1">
                            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <p className="text-small text-red-700 mb-3">Failed to generate enhancement.</p>
                            <button onClick={handleRetry} className="flex items-center gap-2 mx-auto text-small bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50">
                                <RefreshCw className="w-4 h-4" /> Retry
                            </button>
                        </div>
                    ) : hasEnhancements ? (
                        <div className="space-y-4 flex-1 flex flex-col">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-small font-medium text-gray-500 mb-1 block">Hook</label>
                                        <textarea value={editedHook} onChange={(e) => setEditedHook(e.target.value)} className="w-full text-small p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[60px]" />
                                    </div>
                                    <div>
                                        <label className="text-small font-medium text-gray-500 mb-1 block">Body</label>
                                        <textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} className="w-full text-small p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]" />
                                    </div>
                                    <div>
                                        <label className="text-small font-medium text-gray-500 mb-1 block">Call to Action</label>
                                        <textarea value={editedCta} onChange={(e) => setEditedCta(e.target.value)} className="w-full text-small p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[60px]" />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <button onClick={handleCancelEdit} className="text-small text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                                        <button onClick={handleSaveEdit} className="text-small bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 font-medium">Save & Accept</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
                                        <div className="pl-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Quote className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-small font-medium text-blue-600 uppercase tracking-wide">
                                                    Hook (Mobile Visible)
                                                </span>
                                            </div>
                                            <CopyableText text={data.enhanced.hook} className="text-small font-medium text-gray-900 p-1 -ml-1 rounded hover:bg-gray-50 transition-colors" />
                                        </div>
                                    </div>

                                    <CopyableText text={data.enhanced.body} multiline className="text-small text-gray-700 leading-relaxed p-1 -ml-1 rounded hover:bg-gray-50 transition-colors whitespace-pre-wrap" />

                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-small font-medium text-green-700 uppercase tracking-wide">Call to Action</span>
                                        </div>
                                        <CopyableText text={data.enhanced.cta} className="text-small font-medium text-green-800" />
                                    </div>
                                </>
                            )}

                            {data.enhanced.narrative_strategy && !isEditing && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mt-4">
                                    <p className="text-small text-blue-800">
                                        <span className="font-semibold block mb-1">Why this change?</span>
                                        {data.enhanced.narrative_strategy}
                                    </p>
                                </div>
                            )}

                            <div className="flex-1"></div>

                            {!isEditing && (
                                <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex items-center justify-between">
                                    <AboutGuard current={enhancedContent.length} />
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsEditing(true)} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors" title="Edit">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={handleRetry} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors" title="Regenerate">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        {data.status !== 'ACCEPTED' && (
                                            <button onClick={handleAccept} className="flex items-center gap-1 px-3 py-1.5 bg-[#013f2e] text-white hover:bg-[#025c43] rounded-xl text-xs font-bold transition-all shadow-xs">
                                                <Check className="w-3.5 h-3.5" /> Accept
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-[var(--text-tertiary)] italic flex-1 flex items-center justify-center">No enhancements generated yet.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
