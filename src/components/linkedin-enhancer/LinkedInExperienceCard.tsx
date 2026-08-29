'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Calendar, Sparkles, AlertCircle, RefreshCw, Check, Edit2 } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import { ExperienceGuard } from './CharacterGuard';
import type { LinkedInExperienceEntry } from '@/types/linkedin';
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';

interface LinkedInExperienceCardProps {
    data: LinkedInExperienceEntry[];
}

export default function LinkedInExperienceCard({ data }: LinkedInExperienceCardProps) {
    const { triggerEnhancement, state } = useLinkedInEnhancer();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
                <h2 className="text-h3 font-semibold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-500 text-small">No experience data available</p>
            </motion.div>
        );
    }

    const validData = data.filter(exp => exp && exp.original_data);

    if (validData.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
                <h2 className="text-h3 font-semibold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-500 text-small">No experience data available</p>
            </motion.div>
        );
    }

    const hasEnhancements = validData.some(exp => exp.status === 'GENERATED' || exp.status === 'ACCEPTED' || exp.status === 'APPLIED' || (exp.enhanced_data && exp.enhanced_data.title));
    const isError = state.error && validData.some(exp => exp.status === 'ORIGINAL');
    const isLoading = state.isEnhancing && validData.some(exp => exp.status === 'ORIGINAL');

    const handleRetry = () => {
        if (state.selectedCvId && state.selectedCvType) {
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        }
    };

    // Calculate an average confidence score or use a fallback
    const confidenceScore = hasEnhancements ? 
        Math.round(validData.reduce((acc, exp) => acc + (exp.enhanced_data?.confidence_score || 90), 0) / validData.length) : 0;

    const allEnhancedContent = validData.map(exp => {
        const title = exp.enhanced_data?.title || exp.original_data?.role || '';
        const bullets = exp.enhanced_data?.description_bullets?.length > 0
            ? exp.enhanced_data.description_bullets.join('\n• ')
            : exp.original_data?.description || '';
        return `${title}\n${exp.original_data?.company || ''}${exp.original_data?.duration ? ` | ${exp.original_data.duration}` : ''}\n${bullets ? '• ' + bullets : ''}`;
    }).join('\n\n---\n\n');

    const allAccepted = validData.every(exp => exp.status === 'ACCEPTED' || exp.status === 'APPLIED');

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border ${allAccepted ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-[var(--border-primary)]'}`}
        >
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
                {/* Original Column */}
                <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Original Experience</span>
                    </div>
                    <div className="space-y-6">
                        {validData.map((experience, index) => (
                            <ExperienceEntry key={experience.id || index} data={experience} index={index} isEnhancedView={false} isLast={index === validData.length - 1} />
                        ))}
                    </div>
                </div>
 
                {/* Enhanced Column */}
                <div className="flex-1 p-6 relative flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-small font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI Enhanced
                            </span>
                            {hasEnhancements && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-small font-bold">
                                    {confidenceScore}% Match
                                </span>
                            )}
                            {allAccepted && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-small font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> All Accepted
                                </span>
                            )}
                        </div>
                        {hasEnhancements && <CopyAllButton content={allEnhancedContent} label="Copy All" />}
                    </div>
 
                    {isLoading ? (
                        <div className="space-y-6 flex-1">
                            {[1, 2].map(i => (
                                <div key={i} className="animate-pulse flex gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                    <div className="flex-1 space-y-2 mt-1">
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                        <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-gray-100 rounded w-full mt-3"></div>
                                        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                                    </div>
                                </div>
                            ))}
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
                        <div className="space-y-6 flex-1">
                            {validData.map((experience, index) => (
                                <ExperienceEntry key={experience.id || index} data={experience} index={index} isEnhancedView={true} isLast={index === validData.length - 1} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-small text-gray-500 italic flex-1 flex items-center justify-center">No enhancements generated yet.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
 
interface ExperienceEntryProps {
    data: LinkedInExperienceEntry;
    index: number;
    isEnhancedView: boolean;
    isLast: boolean;
}
 
function ExperienceEntry({ data, index, isEnhancedView, isLast }: ExperienceEntryProps) {
    const { dispatch } = useLinkedInEnhancer();
    const originalData = data.original_data || {};
    const enhancedData = data.enhanced_data || { title: '', description_bullets: [], tagged_skills: [], improvement_notes: '' };

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(enhancedData.title || '');
    const [editedBullets, setEditedBullets] = useState(enhancedData.description_bullets?.join('\n') || '');

    const hasEnhancements = enhancedData.title && enhancedData.description_bullets?.length > 0;
    
    const displayTitle = isEnhancedView && hasEnhancements ? enhancedData.title : originalData.role || '';
    const displayBullets = isEnhancedView && hasEnhancements
        ? enhancedData.description_bullets
        : originalData.description
            ? originalData.description
                .split(/\n|(?<=[.!?])\s+(?=[A-Z])/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            : [];

    const descriptionLength = displayBullets.join('\n').length;

    const handleAccept = () => {
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'experience', id: data.id, status: 'ACCEPTED' } });
    };

    const handleSaveEdit = () => {
        const newBullets = editedBullets.split('\n').map(b => b.trim()).filter(b => b.length > 0);
        // Note: dispatching a complex SET_ENHANCED_SECTIONS just for one item might need custom logic or we rely on the backend.
        // For now, we update status to ACCEPTED. 
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section: 'experience', id: data.id, status: 'ACCEPTED' } });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedTitle(enhancedData.title);
        setEditedBullets(enhancedData.description_bullets?.join('\n'));
        setIsEditing(false);
    };

    return (
        <div className={`relative ${!isLast ? 'pb-6 border-b border-gray-100' : ''}`}>
            <div className="flex gap-4">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        {isEnhancedView && isEditing ? (
                            <input 
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full text-small font-semibold text-gray-900 p-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                        ) : (
                            <div className="text-small font-semibold text-gray-900 flex-1">
                                {displayTitle}
                                {isEnhancedView && data.status === 'ACCEPTED' && <Check className="inline-block w-3 h-3 text-blue-600 ml-1" />}
                            </div>
                        )}
                        {!isEnhancedView && (
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('mori-cv-selection', {
                                        detail: { 
                                            path: `work[${index}].summary`, 
                                            text: originalData.description 
                                        }
                                    }));
                                }}
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded transition-colors shrink-0"
                            >
                                <Sparkles className="w-2.5 h-2.5" /> Edit with Mori
                            </button>
                        )}
                    </div>

                    <div className="text-small text-gray-700 mt-0.5">
                        {`${originalData.company || ''}${originalData.employment_type ? ` · ${originalData.employment_type}` : ''}`}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                        {originalData.duration && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{originalData.duration}</span>
                            </div>
                        )}
                        {originalData.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{originalData.location}</span>
                            </div>
                        )}
                    </div>

                    {isEnhancedView && isEditing ? (
                        <div className="mt-2 space-y-2">
                            <textarea 
                                value={editedBullets}
                                onChange={(e) => setEditedBullets(e.target.value)}
                                className="w-full text-small text-gray-700 p-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                                placeholder="Enter bullets, one per line"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCancelEdit} className="text-[10px] text-gray-500 hover:text-gray-700">Cancel</button>
                                <button onClick={handleSaveEdit} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                            </div>
                        </div>
                    ) : (
                        displayBullets.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {displayBullets.map((bullet, idx) => (
                                    <div key={idx} className="text-small text-gray-700 pl-3 relative">
                                        <span className="absolute left-0 top-1.5 w-1 h-1 bg-gray-400 rounded-full" />
                                        {isEnhancedView ? <CopyableText text={bullet} className="p-0.5 -ml-0.5 rounded hover:bg-gray-50 transition-colors" showIcon={false} /> : bullet}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {isEnhancedView && hasEnhancements && enhancedData.tagged_skills?.length > 0 && !isEditing && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {enhancedData.tagged_skills.map((skill, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-[10px] text-blue-700 rounded border border-blue-100">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}

                    {isEnhancedView && hasEnhancements && enhancedData.improvement_notes && !isEditing && (
                        <div className="mt-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                            <p className="text-[10px] text-blue-800 leading-tight">
                                <span className="font-semibold block mb-0.5">Why this change?</span>
                                {enhancedData.improvement_notes}
                            </p>
                        </div>
                    )}

                    {isEnhancedView && displayBullets.length > 0 && !isEditing && (
                        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                            <ExperienceGuard current={descriptionLength} />
                            <div className="flex gap-1">
                                <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {data.status !== 'ACCEPTED' && (
                                    <button onClick={handleAccept} className="flex items-center gap-1 px-2.5 py-1 bg-[#013f2e] text-white hover:bg-[#025c43] rounded-lg text-[10px] font-bold shadow-xs transition-all">
                                        <Check className="w-3 h-3" /> Accept
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
