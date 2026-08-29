'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Sparkles, AlertCircle, RefreshCw, Check, Edit2, ArrowRight, X } from 'lucide-react';
import Image from 'next/image';
import CopyableText, { CopyAllButton } from './CopyableText';
import { HeadlineGuard } from './CharacterGuard';
import type { LinkedInHeroSection } from '@/types/linkedin';
import { LINKEDIN_COLORS } from '@/types/linkedin';
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';

interface LinkedInHeroCardProps {
    data: LinkedInHeroSection;
    userProfileImage?: string | null;
}

export default function LinkedInHeroCard({ data, userProfileImage }: LinkedInHeroCardProps) {
    const { triggerEnhancement, state, dispatch } = useLinkedInEnhancer();
    const [isEditing, setIsEditing] = useState(false);
    const [editedHeadline, setEditedHeadline] = useState(data.enhanced.headline || '');

    const hasEnhancements = (data.status === 'GENERATED' || data.status === 'ACCEPTED' || data.status === 'APPLIED') && data.enhanced.headline;
    const isError = state.error && data.status === 'ORIGINAL';
    const isLoading = state.isEnhancing && data.status === 'ORIGINAL';

    const profilePhoto = userProfileImage || data.current.photoUrl;

    const handleRetry = () => {
        if (state.selectedCvId && state.selectedCvType) {
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        }
    };

    const handleAccept = () => {
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'hero', status: 'ACCEPTED' } });
    };

    const handleSaveEdit = () => {
        // Update the enhanced headline in context and set to ACCEPTED
        dispatch({
            type: 'SET_ENHANCED_SECTIONS',
            payload: { hero: { enhanced: { ...data.enhanced, headline: editedHeadline } } as any }
        });
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'hero', status: 'ACCEPTED' } });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedHeadline(data.enhanced.headline);
        setIsEditing(false);
    };

    // Use API confidence score or fallback
    const confidenceScore = data.enhanced.confidence_score || (hasEnhancements ? 95 : 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border ${data.status === 'ACCEPTED' ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-[var(--border-primary)]'}`}
        >
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
                {/* Original Column */}
                <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Original Profile</span>
                        {data.current.headline && (
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('mori-cv-selection', {
                                        detail: { path: 'basics.label', text: data.current.headline }
                                    }));
                                }}
                                className="text-xs text-emerald-700 dark:text-lime-400 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg transition-colors border border-emerald-500/20"
                            >
                                <Sparkles className="w-3 h-3" /> Edit with Mori
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0" style={{ backgroundColor: LINKEDIN_COLORS.PRIMARY_BLUE }}>
                            {profilePhoto ? (
                                <Image src={profilePhoto} alt={data.current.name || 'Profile'} width={64} height={64} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold">{data.current.name?.charAt(0) || 'U'}</div>
                            )}
                        </div>
                        <div>
                            <div className="text-h3 font-bold text-gray-900">{data.current.name}</div>
                            <div className="text-small text-gray-600 mt-1">{data.current.headline || 'No headline provided'}</div>
                            <div className="flex items-center gap-1 text-small text-gray-500 mt-2">
                                <MapPin className="w-3 h-3" />
                                <span>{data.current.location || 'No location'}</span>
                            </div>
                        </div>
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
                        {hasEnhancements && <CopyAllButton content={editedHeadline || data.enhanced.headline || ''} label="Copy" />}
                    </div>

                    {isLoading ? (
                        <div className="animate-pulse space-y-3 flex-1">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
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
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 opacity-50" style={{ backgroundColor: LINKEDIN_COLORS.PRIMARY_BLUE }}>
                                    {profilePhoto ? (
                                        <Image src={profilePhoto} alt={data.current.name || 'Profile'} width={64} height={64} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold">{data.current.name?.charAt(0) || 'U'}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-h3 font-bold text-gray-900">{data.current.name}</div>
                                    
                                    {isEditing ? (
                                        <div className="mt-2 space-y-2">
                                            <textarea 
                                                value={editedHeadline}
                                                onChange={(e) => setEditedHeadline(e.target.value)}
                                                className="w-full text-small font-medium text-gray-900 p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[80px]"
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={handleCancelEdit} className="text-small text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                                                <button onClick={handleSaveEdit} className="text-small bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 font-medium">Save & Accept</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <CopyableText text={data.enhanced.headline} className="text-small font-medium text-gray-900 mt-1 p-1 -ml-1 rounded hover:bg-gray-50 transition-colors" />
                                            <HeadlineGuard current={data.enhanced.headline.length} />
                                        </>
                                    )}

                                    <div className="flex items-center gap-1 text-small text-gray-600 mt-2">
                                        <MapPin className="w-3 h-3" />
                                        <span>{data.enhanced.location_suggestion || data.current.location}</span>
                                    </div>
                                </div>
                            </div>

                            {data.enhanced.rationale && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mt-4">
                                    <p className="text-small text-blue-800">
                                        <span className="font-semibold block mb-1">Why this change?</span>
                                        {data.enhanced.rationale}
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex-1"></div>

                            {/* Actions Footer */}
                            {!isEditing && (
                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border-primary)]">
                                    <div className="flex flex-wrap gap-1.5">
                                        {data.enhanced.seo_keywords_used.map((keyword, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md text-[10px] font-semibold border border-[var(--border-primary)]">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={handleRetry}
                                            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                            title="Regenerate"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        {data.status !== 'ACCEPTED' && (
                                            <button 
                                                onClick={handleAccept}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-[#013f2e] text-white hover:bg-[#025c43] rounded-xl text-xs font-bold transition-all shadow-xs"
                                            >
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

