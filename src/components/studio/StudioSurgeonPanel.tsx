'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Briefcase,
    GraduationCap,
    Code,
    Award,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    X,
    Wand2,
    AlertTriangle,
} from 'lucide-react';
import type { FixAnnotation, FixCategory } from '@/components/resume-enhancer/annotations/fix-annotation';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { getFieldPathLabel } from '@/lib/utils/fieldPathLabels';

// ============================================================================
// Props
// ============================================================================

interface StudioSurgeonPanelProps {
    cvData: UnifiedCVDataStructure | null;
    fixAnnotations: FixAnnotation[];
    activeFixId: string | null;
    onSelectFix: (fixId: string) => void;
    onApplyFix: (fix: FixAnnotation) => void;
    onDismissFix: (fixId: string) => void;
    onUpdateField: (section: string, field: string, value: string, index?: number) => void;
}

// ============================================================================
// Section Components
// ============================================================================

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    expanded: boolean;
    onToggle: () => void;
    fixCount: number;
}

function SectionHeader({ icon, title, expanded, onToggle, fixCount }: SectionHeaderProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a230f] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a230f]/80 transition-colors"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
                {fixCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#80FF00]/20 text-[#80FF00]">
                        {fixCount}
                    </span>
                )}
            </div>
            {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
        </button>
    );
}

// ============================================================================
// Field with Suggestion Card
// ============================================================================

interface FieldWithSuggestionProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    fix?: FixAnnotation;
    onApplyFix?: () => void;
    onDismissFix?: () => void;
    isActiveFix?: boolean;
    onSelectFix?: () => void;
    multiline?: boolean;
    placeholder?: string;
}

function FieldWithSuggestion({
    label,
    value,
    onChange,
    fix,
    onApplyFix,
    onDismissFix,
    isActiveFix = false,
    onSelectFix,
    multiline = false,
    placeholder,
}: FieldWithSuggestionProps) {
    const hasFix = !!fix && fix.status === 'open';

    return (
        <div
            className={`space-y-2 p-3 rounded-lg border transition-colors ${isActiveFix
                    ? 'border-[#80FF00]/50 bg-[#80FF00]/5'
                    : hasFix
                        ? 'border-amber-500/30 bg-amber-500/5 cursor-pointer'
                        : 'border-transparent'
                }`}
            onClick={() => hasFix && onSelectFix?.()}
        >
            {label && (
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {label}
                    {hasFix && (
                        <span className="flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-[10px]">Has suggestion</span>
                        </span>
                    )}
                </label>
            )}

            {/* Input Field */}
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]"
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]"
                />
            )}

            {/* Green Suggestion Card */}
            <AnimatePresence>
                {hasFix && isActiveFix && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-[#80FF00]/10 border border-[#80FF00]/30 rounded-lg space-y-3">
                            {/* Issue description */}
                            <div className="text-xs text-gray-600 dark:text-gray-300">{fix.issue}</div>

                            {/* Current text (if different from replacement) */}
                            {fix.originalText && fix.originalText !== fix.replacementText && (
                                <div className="space-y-1">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Current</div>
                                    <div className="text-xs text-gray-400 line-through p-2 bg-red-500/10 rounded border border-red-500/20">
                                        {fix.originalText}
                                    </div>
                                </div>
                            )}

                            {/* Suggested text */}
                            {fix.replacementText && (
                                <div className="space-y-1">
                                    <div className="text-[10px] text-[#80FF00] uppercase tracking-wide font-semibold flex items-center gap-1">
                                        <Wand2 className="w-3 h-3" />
                                        Suggested
                                    </div>
                                    <div className="text-sm text-[#80FF00] p-2 bg-[#80FF00]/10 rounded border border-[#80FF00]/30">
                                        {fix.replacementText}
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onApplyFix?.();
                                    }}
                                    className="flex-1 px-3 py-1.5 bg-[#80FF00] text-black text-xs font-semibold rounded-lg hover:bg-[#70e600] transition-colors flex items-center justify-center gap-1"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Apply
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDismissFix?.();
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StudioSurgeonPanel({
    cvData,
    fixAnnotations,
    activeFixId,
    onSelectFix,
    onApplyFix,
    onDismissFix,
    onUpdateField,
}: StudioSurgeonPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        personal: true,
        work: true,
        skills: true,
        education: false,
    });

    // Get fixes for a specific field path
    const getFixForField = useCallback((fieldPath: string): FixAnnotation | undefined => {
        return fixAnnotations.find(
            (f) => f.fieldPath === fieldPath && f.status === 'open'
        );
    }, [fixAnnotations]);

    // Count fixes per section
    const fixCountBySection = useMemo(() => {
        const counts: Record<string, number> = { personal: 0, work: 0, skills: 0, education: 0 };
        fixAnnotations
            .filter((f) => f.status === 'open')
            .forEach((f) => {
                if (f.fieldPath.includes('basics') || f.fieldPath.includes('summary')) {
                    counts.personal = (counts.personal || 0) + 1;
                } else if (f.fieldPath.includes('work')) {
                    counts.work = (counts.work || 0) + 1;
                } else if (f.fieldPath.includes('skill')) {
                    counts.skills = (counts.skills || 0) + 1;
                } else if (f.fieldPath.includes('education')) {
                    counts.education = (counts.education || 0) + 1;
                }
            });
        return counts;
    }, [fixAnnotations]);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    if (!cvData) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-[#141810] border-l border-gray-200 dark:border-white/10">
                <div className="text-center text-gray-400">
                    <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No CV data loaded</p>
                </div>
            </div>
        );
    }

    // Find active fix
    const activeFix = activeFixId ? fixAnnotations.find((f) => f.id === activeFixId) : undefined;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#141810] border-l border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-lime-100 dark:bg-[#80FF00]/20 rounded-lg">
                        <Wand2 className="w-4 h-4 text-lime-600 dark:text-[#80FF00]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">CV Surgeon</h3>
                        <p className="text-xs text-gray-500">Edit your CV with AI suggestions</p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Personal Info Section */}
                <div className="space-y-2">
                    <SectionHeader
                        icon={<User className="w-4 h-4 text-blue-500" />}
                        title="Personal Info"
                        expanded={expandedSections.personal}
                        onToggle={() => toggleSection('personal')}
                        fixCount={fixCountBySection.personal}
                    />
                    <AnimatePresence>
                        {expandedSections.personal && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-1"
                            >
                                <FieldWithSuggestion
                                    label="Name"
                                    value={cvData.basics?.name || ''}
                                    onChange={(v) => onUpdateField('basics', 'name', v)}
                                    placeholder="Your full name"
                                />
                                <FieldWithSuggestion
                                    label="Title"
                                    value={cvData.basics?.label || ''}
                                    onChange={(v) => onUpdateField('basics', 'label', v)}
                                    placeholder="Professional title"
                                />
                                <FieldWithSuggestion
                                    label="Summary"
                                    value={cvData.basics?.summary || ''}
                                    onChange={(v) => onUpdateField('basics', 'summary', v)}
                                    fix={getFixForField('basics.summary')}
                                    isActiveFix={activeFix?.fieldPath === 'basics.summary'}
                                    onSelectFix={() => {
                                        const fix = getFixForField('basics.summary');
                                        if (fix) onSelectFix(fix.id);
                                    }}
                                    onApplyFix={() => {
                                        const fix = getFixForField('basics.summary');
                                        if (fix) onApplyFix(fix);
                                    }}
                                    onDismissFix={() => {
                                        const fix = getFixForField('basics.summary');
                                        if (fix) onDismissFix(fix.id);
                                    }}
                                    multiline
                                    placeholder="Brief professional summary"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Work Experience Section */}
                {cvData.work && cvData.work.length > 0 && (
                    <div className="space-y-2">
                        <SectionHeader
                            icon={<Briefcase className="w-4 h-4 text-purple-500" />}
                            title="Work Experience"
                            expanded={expandedSections.work}
                            onToggle={() => toggleSection('work')}
                            fixCount={fixCountBySection.work}
                        />
                        <AnimatePresence>
                            {expandedSections.work && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-3"
                                >
                                    {cvData.work.map((job: any, index: number) => {
                                        const fieldPath = `work[${index}].summary`;
                                        const fix = getFixForField(fieldPath);
                                        return (
                                            <div key={index} className="px-3 py-2 bg-gray-50 dark:bg-[#1a230f]/50 rounded-lg">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                    {job.position || job.title} at {job.name || job.company}
                                                </div>
                                                <FieldWithSuggestion
                                                    label=""
                                                    value={job.summary || ''}
                                                    onChange={(v) => onUpdateField('work', 'summary', v, index)}
                                                    fix={fix}
                                                    isActiveFix={activeFix?.id === fix?.id}
                                                    onSelectFix={() => fix && onSelectFix(fix.id)}
                                                    onApplyFix={() => fix && onApplyFix(fix)}
                                                    onDismissFix={() => fix && onDismissFix(fix.id)}
                                                    multiline
                                                    placeholder="Describe your responsibilities and achievements"
                                                />
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Skills Section */}
                {cvData.skills && cvData.skills.length > 0 && (
                    <div className="space-y-2">
                        <SectionHeader
                            icon={<Code className="w-4 h-4 text-green-500" />}
                            title="Skills"
                            expanded={expandedSections.skills}
                            onToggle={() => toggleSection('skills')}
                            fixCount={fixCountBySection.skills}
                        />
                        <AnimatePresence>
                            {expandedSections.skills && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2"
                                >
                                    {cvData.skills.map((skillGroup: any, index: number) => (
                                        <div key={index} className="px-3 py-2 bg-gray-50 dark:bg-[#1a230f]/50 rounded-lg">
                                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                {skillGroup.name || skillGroup.category || 'Skills'}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(skillGroup.keywords || skillGroup.skills || []).map((skill: string, skillIndex: number) => (
                                                    <span
                                                        key={skillIndex}
                                                        className="px-2 py-0.5 text-xs bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Education Section */}
                {cvData.education && cvData.education.length > 0 && (
                    <div className="space-y-2">
                        <SectionHeader
                            icon={<GraduationCap className="w-4 h-4 text-orange-500" />}
                            title="Education"
                            expanded={expandedSections.education}
                            onToggle={() => toggleSection('education')}
                            fixCount={fixCountBySection.education}
                        />
                        <AnimatePresence>
                            {expandedSections.education && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2"
                                >
                                    {cvData.education.map((edu: any, index: number) => (
                                        <div key={index} className="px-3 py-2 bg-gray-50 dark:bg-[#1a230f]/50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {edu.studyType} in {edu.area}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {edu.institution}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
