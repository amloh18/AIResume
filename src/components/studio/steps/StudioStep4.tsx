'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useStudio } from '@/components/studio/StudioContext';
import { AlertCircle, Eye, Palette, X, FileText, Download, Target, Award, TrendingUp, AlertTriangle, CheckCircle2, Shield, Sparkles, BookOpen } from 'lucide-react';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { downloadAsPDF } from '@/lib/utils/download';
import { CVScoringService } from '@/lib/services/cv-scoring-service';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';

export default function StudioStep4() {
    const { state, dispatch } = useStudio();
    const router = useRouter();
    const [zoom, setZoom] = useState(1);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ITemplate | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    // Calculate scores using the scoring service
    const scoreResult = useMemo(() => {
        return CVScoringService.getFullScoreResult(
            state.cvData,
            undefined,
            100
        );
    }, [state.cvData]);

    const primaryScore = state.atsScore !== null
        ? state.atsScore
        : scoreResult.cvScore.total;
    const primaryScoreLabel = state.atsScore !== null ? 'ATS Match' : 'Profile Strength';

    const getScoreColor = (score: number): string => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreBgColor = (score: number): string => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const handleDownload = async () => {
        if (!selectedTemplate) {
            alert('Please select a template before downloading');
            return;
        }

        setIsDownloading(true);
        try {
            const filename = `${state.cvTitle || 'CV'}.pdf`;

            let previewElement: HTMLElement | null = null;
            if (previewRef.current) {
                previewElement = previewRef.current.querySelector('.cv-preview-container') as HTMLElement ||
                    previewRef.current.querySelector('[class*="cv-preview"]') as HTMLElement ||
                    previewRef.current;
            }

            await downloadAsPDF(
                previewElement || previewRef.current || document.body,
                filename,
                state.cvId || undefined,
                {
                    paperSize: 'A4',
                    orientation: 'portrait',
                    jobTitle: state.jobData?.title || state.targetRole
                }
            );
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download CV. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleTemplateSelect = (template: ITemplate) => {
        setSelectedTemplate(template);
        setShowTemplateModal(false);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Split View: Info Left, Preview Right */}
            <div className="flex-1 flex gap-3 overflow-hidden">
                {/* Left Panel - Info (50%) */}
                <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Review Your Resume
                        </h2>
                        <p className="text-xs text-gray-500">
                            Take a final look before exporting
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Primary Score Display */}
                        <div className="bg-gray-50 dark:bg-[#1a230f] rounded-lg p-4 text-center shadow-sm">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getScoreBgColor(primaryScore)} text-black font-bold text-2xl mb-2 shadow-lg`}>
                                {primaryScore}%
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{primaryScoreLabel}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Grade: <span className={`font-bold ${getScoreColor(primaryScore)}`}>{scoreResult.overallGrade}</span>
                            </p>
                        </div>

                        {/* Score Breakdown */}
                        <div className="bg-gray-50 dark:bg-[#1a230f] rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-[#80FF00]" />
                                <p className="text-xs font-medium text-gray-900 dark:text-white">Score Breakdown</p>
                            </div>

                            <div className="space-y-2">
                                <ScoreBar label="Completeness" value={scoreResult.cvScore.completeness} max={25} />
                                <ScoreBar label="Impact Verbs" value={scoreResult.cvScore.impactVerbs} max={20} />
                                <ScoreBar label="Quantification" value={scoreResult.cvScore.quantification} max={20} />
                                <ScoreBar label="Formatting" value={scoreResult.cvScore.formatting} max={15} />
                                <ScoreBar label="Readability" value={scoreResult.cvScore.readability} max={20} />
                            </div>
                        </div>

                        {/* Recommendations */}
                        {scoreResult.recommendations.length > 0 && (
                            <div className="bg-gray-50 dark:bg-[#1a230f] rounded-lg p-3 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-[#80FF00]" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-white">Recommendations</p>
                                </div>
                                <ul className="space-y-1">
                                    {scoreResult.recommendations.slice(0, 3).map((rec, i) => (
                                        <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                                            <span className="text-[#80FF00]">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Template Info */}
                        <div className="bg-gray-50 dark:bg-[#1a230f] rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Template</p>
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {selectedTemplate?.name || 'None'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTemplateModal(true)}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5"
                                >
                                    <Palette className="w-3.5 h-3.5" />
                                    <span>Change</span>
                                </button>
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="mt-3">
                            <button
                                onClick={() => setShowDownloadModal(true)}
                                disabled={!selectedTemplate}
                                className="w-full px-4 py-3 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className="w-5 h-5" />
                                <span>Download CV</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Preview (50%) */}
                <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm">
                    {/* Preview Header with Controls */}
                    <div className="p-3 bg-white dark:bg-[#141810] flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Preview</h3>
                        <div className="flex items-center space-x-3">
                            <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Zoom: {Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                    className="px-2 py-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded text-xs"
                                >
                                    -
                                </button>
                                <button
                                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                                    className="px-2 py-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded text-xs"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4" ref={previewRef}>
                        {selectedTemplate ? (
                            <CVPreviewContent
                                cvData={state.cvData}
                                templateName={selectedTemplate.name}
                                templateStyles={{
                                    primaryColor: selectedTemplate.globalStyles?.primaryColor,
                                    secondaryColor: selectedTemplate.globalStyles?.secondaryColor,
                                    backgroundColor: selectedTemplate.globalStyles?.backgroundColor,
                                    fontFamily: selectedTemplate.globalStyles?.fontFamily,
                                    fontSize: selectedTemplate.globalStyles?.fontSize,
                                    lineHeight: selectedTemplate.globalStyles?.lineHeight,
                                }}
                                customCSS={selectedTemplate.globalStyles?.customCSS}
                                jobData={state.jobData}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center py-8">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">
                                        No template selected. Please select a template.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Template Selector Modal */}
            <AnimatePresence>
                {showTemplateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
                        onClick={() => setShowTemplateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Select Template
                                </h2>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-900 dark:text-white" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <TemplateSelector
                                    selectedTemplate={selectedTemplate}
                                    onTemplateSelect={handleTemplateSelect}
                                    cvData={state.cvData}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Download Modal */}
            <DownloadModal
                isOpen={showDownloadModal}
                onClose={() => setShowDownloadModal(false)}
                onDownload={async (documentType: DocumentType, format: FormatType) => {
                    if (documentType === 'cv' && format === 'pdf') {
                        await handleDownload();
                    }
                    setShowDownloadModal(false);
                }}
                hasCV={true}
                hasCoverLetter={false}
                isDownloading={isDownloading}
                cvId={state.cvId || undefined}
            />
        </div>
    );
}

/**
 * Score bar component for breakdown display
 */
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
    const percentage = (value / max) * 100;

    const getBarColor = (pct: number): string => {
        if (pct >= 80) return 'bg-green-500';
        if (pct >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-24 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full ${getBarColor(percentage)}`}
                />
            </div>
            <span className="text-xs text-gray-500 w-10 text-right">
                {value}/{max}
            </span>
        </div>
    );
}
