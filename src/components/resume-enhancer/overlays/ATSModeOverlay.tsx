'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getPlainTextCV,
    detectUnparseableElements,
    calculateParsingConfidence,
    matchKeywordsAgainstCV,
    type ParseableIssue,
    type KeywordMatch
} from '@/lib/utils/cv-analysis-utils';
import type { UnifiedCVDataStructure } from '@/types/cv';
import type { ATSFeatures } from '../panels/ATSModePanel';

// ============================================================================
// Types
// ============================================================================

interface ATSModeOverlayProps {
    cvData: UnifiedCVDataStructure | null;
    jobData?: {
        jobDescription?: string;
        description?: string;
        requiredSkills?: string[];
        keywords?: string[];
    } | null;
    templateName?: string;
    features: ATSFeatures;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Extract Keywords Helper (duplicated for independence)
// ============================================================================

function extractKeywordsFromJD(jd: string): string[] {
    if (!jd) return [];

    const keywords: Set<string> = new Set();

    // Common tech/business keywords patterns
    const techPatterns = [
        /\b(?:React|Vue|Angular|Node\.?js|Python|Java|JavaScript|TypeScript|Go|Rust|C\+\+|C#|\.NET|Ruby|PHP|Swift|Kotlin)\b/gi,
        /\b(?:AWS|GCP|Azure|Docker|Kubernetes|K8s|Terraform|Jenkins|CI\/CD|DevOps)\b/gi,
        /\b(?:SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch|GraphQL|REST|API)\b/gi,
        /\b(?:Agile|Scrum|Kanban|JIRA|Confluence|Git|GitHub|GitLab|Bitbucket)\b/gi,
        /\b(?:Machine Learning|ML|AI|Deep Learning|NLP|Computer Vision|Data Science)\b/gi,
    ];

    techPatterns.forEach(pattern => {
        const matches = jd.match(pattern) || [];
        matches.forEach(m => keywords.add(m));
    });

    return Array.from(keywords).slice(0, 20);
}

// ============================================================================
// Parsing Confidence Banner
// ============================================================================

const ParsingConfidenceBanner = ({
    score,
    issues
}: {
    score: number;
    issues: ParseableIssue[];
}) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 left-2 right-2 flex items-center justify-between px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 z-20"
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${color}20`, color }}
                >
                    {score}
                </div>
                <div>
                    <div className="text-xs font-medium text-white">Parse Confidence: {label}</div>
                    {issues.length > 0 && (
                        <div className="text-[9px] text-orange-400">{issues.length} potential issue{issues.length > 1 ? 's' : ''}</div>
                    )}
                </div>
            </div>
            <div className="text-[8px] text-white/40 uppercase tracking-wider">ATS View</div>
        </motion.div>
    );
};

// ============================================================================
// Keyword Match Sidebar
// ============================================================================

const KeywordSidebar = ({ matches }: { matches: KeywordMatch[] }) => {
    if (matches.length === 0) return null;

    const matchedCount = matches.filter(m => m.found).length;
    const percent = Math.round((matchedCount / matches.length) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-2 right-2 w-40 max-h-48 overflow-y-auto bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 z-20 custom-scrollbar"
        >
            <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/90">
                <span className="text-[9px] text-white/60 uppercase tracking-wider">Keywords</span>
                <span className="text-[10px] font-medium text-[#80FF00]">{percent}%</span>
            </div>
            <div className="p-2 space-y-1">
                {matches.slice(0, 15).map((match, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center gap-1.5 text-[9px] ${match.found ? 'text-green-400' : 'text-red-400/70'
                            }`}
                    >
                        <span>{match.found ? '✓' : '✗'}</span>
                        <span className={match.found ? '' : 'line-through'}>{match.keyword}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// ============================================================================
// X-Ray Effect Overlay
// ============================================================================

const XRayEffect = () => (
    <>
        <style>{`
      .ats-xray-active .cv-page-custom,
      .ats-xray-active .cv-page {
        filter: grayscale(100%) !important;
        opacity: 0.85 !important;
      }
      
      .ats-xray-active .cv-page-custom::before,
      .ats-xray-active .cv-page::before {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 3px,
          rgba(128, 255, 0, 0.03) 3px,
          rgba(128, 255, 0, 0.03) 4px
        );
        pointer-events: none;
        z-index: 1;
      }
    `}</style>

        {/* Scanline animation effect */}
        <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear'
            }}
            className="absolute left-0 right-0 h-1 pointer-events-none z-10"
            style={{
                background: 'linear-gradient(to bottom, transparent, rgba(128, 255, 0, 0.3), transparent)',
                boxShadow: '0 0 20px rgba(128, 255, 0, 0.5)',
            }}
        />
    </>
);

// ============================================================================
// Main Overlay Component
// ============================================================================

export default function ATSModeOverlay({
    cvData,
    jobData,
    templateName,
    features,
    containerRef,
}: ATSModeOverlayProps) {
    // Parse JD keywords
    const jdKeywords = useMemo(() => {
        const jd = jobData?.jobDescription || jobData?.description || '';
        const provided = jobData?.requiredSkills || jobData?.keywords || [];

        if (provided.length > 0) return provided;
        return extractKeywordsFromJD(jd);
    }, [jobData]);

    // Compute analysis
    const issues = useMemo(() =>
        features.parsingConfidence ? detectUnparseableElements(templateName, cvData) : [],
        [templateName, cvData, features.parsingConfidence]
    );
    const confidence = useMemo(() => calculateParsingConfidence(issues), [issues]);
    const keywordMatches = useMemo(() =>
        features.keywordHeatmap ? matchKeywordsAgainstCV(cvData, jdKeywords) : [],
        [cvData, jdKeywords, features.keywordHeatmap]
    );

    // Parse Plain Text for full display
    const plainText = useMemo(() => getPlainTextCV(cvData), [cvData]);
    React.useEffect(() => {
        if (containerRef?.current) {
            containerRef.current.classList.add('ats-xray-active');
            return () => {
                containerRef.current?.classList.remove('ats-xray-active');
            };
        }
    }, [containerRef]);

    return (
        <AnimatePresence>
            <div className="absolute inset-0 z-10 bg-[#0d1117] flex flex-col font-mono text-sm overflow-hidden">
                {/* Header / HUD */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
                        <span className="text-[#3fb950] font-bold tracking-wider">TERMINAL_VIEW :: ATS_PARSE_PREVIEW</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8b949e]">
                        <span>CHARS: {plainText.length}</span>
                        <span>LINES: {plainText.split('\n').length}</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        <pre className="whitespace-pre-wrap text-[#c9d1d9] leading-relaxed font-mono">
                            {plainText || 'No parseable content found.'}
                        </pre>
                    </div>
                </div>

                {/* Sidebars (kept floating on top of this view) */}

                {/* Parsing Confidence Banner */}
                {features.parsingConfidence && (
                    <ParsingConfidenceBanner score={confidence} issues={issues} />
                )}

                {/* Keyword Match Sidebar */}
                {features.keywordHeatmap && keywordMatches.length > 0 && (
                    <KeywordSidebar matches={keywordMatches} />
                )}
            </div>
        </AnimatePresence>
    );
}
