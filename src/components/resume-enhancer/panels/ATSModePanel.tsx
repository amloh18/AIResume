'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    FileText,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Copy,
    Check
} from 'lucide-react';
import {
    getPlainTextCV,
    detectUnparseableElements,
    calculateParsingConfidence,
    matchKeywordsAgainstCV,
    type ParseableIssue,
    type KeywordMatch
} from '@/lib/utils/cv-analysis-utils';
import type { UnifiedCVDataStructure } from '@/types/cv';

// ============================================================================
// Types
// ============================================================================

export interface ATSFeatures {
    plainText: boolean;
    keywordHeatmap: boolean;
    parsingConfidence: boolean;
}

interface ATSModePanelProps {
    cvData: UnifiedCVDataStructure | null;
    jobData?: {
        jobDescription?: string;
        description?: string;
        requiredSkills?: string[];
        keywords?: string[];
    } | null;
    templateName?: string;
    features: ATSFeatures;
    onFeaturesChange: (features: ATSFeatures) => void;
}

// ============================================================================
// Helper: Extract keywords from JD
// ============================================================================

function extractKeywordsFromJD(jd: string): string[] {
    if (!jd) return [];

    // Common tech/business keywords patterns
    const keywords: Set<string> = new Set();

    // Extract capitalized terms (likely proper nouns/technologies)
    const capitalizedPattern = /\b[A-Z][a-zA-Z0-9+#.]*(?:\s+[A-Z][a-zA-Z0-9+#.]*)*\b/g;
    const capitalizedMatches = jd.match(capitalizedPattern) || [];
    capitalizedMatches.forEach(m => {
        if (m.length > 2 && !['The', 'This', 'That', 'With', 'From', 'Your', 'Our'].includes(m)) {
            keywords.add(m);
        }
    });

    // Extract common tech stack patterns
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

    // Extract years of experience requirements
    const yearsPattern = /(\d+)\+?\s*(?:years?|yrs?)/gi;
    const yearsMatches = jd.match(yearsPattern) || [];
    yearsMatches.forEach(m => keywords.add(m));

    return Array.from(keywords).slice(0, 30); // Limit to 30 keywords
}

// ============================================================================
// Helper Components
// ============================================================================

const ConfidenceGauge = ({ score }: { score: number }) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor';

    return (
        <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <motion.circle
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: score / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        cx="32"
                        cy="32"
                        r="28"
                        stroke={color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{score}</span>
                </div>
            </div>
            <div>
                <div className="text-sm font-medium" style={{ color }}>{label}</div>
                <div className="text-[10px] text-white/40">Parse Confidence</div>
            </div>
        </div>
    );
};

const KeywordBadge = ({ match }: { match: KeywordMatch }) => (
    <div
        className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${match.found
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
    >
        {match.found ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
        {match.keyword}
        {match.found && match.frequency > 1 && (
            <span className="ml-1 px-1 bg-green-500/30 rounded text-[8px]">×{match.frequency}</span>
        )}
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function ATSModePanel({
    cvData,
    jobData,
    templateName,
    features,
    onFeaturesChange,
}: ATSModePanelProps) {
    const [showPlainText, setShowPlainText] = useState(false);
    const [showIssues, setShowIssues] = useState(false);
    const [copied, setCopied] = useState(false);

    // Parse JD keywords
    const jdKeywords = useMemo(() => {
        const jd = jobData?.jobDescription || jobData?.description || '';
        const provided = jobData?.requiredSkills || jobData?.keywords || [];

        if (provided.length > 0) return provided;
        return extractKeywordsFromJD(jd);
    }, [jobData]);

    // Compute analysis
    const plainText = useMemo(() => getPlainTextCV(cvData), [cvData]);
    const issues = useMemo(() => detectUnparseableElements(templateName, cvData), [templateName, cvData]);
    const confidence = useMemo(() => calculateParsingConfidence(issues), [issues]);
    const keywordMatches = useMemo(() => matchKeywordsAgainstCV(cvData, jdKeywords), [cvData, jdKeywords]);

    const matchedCount = keywordMatches.filter(k => k.found).length;
    const missingCount = keywordMatches.filter(k => !k.found).length;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleFeature = (key: keyof ATSFeatures) => {
        onFeaturesChange({ ...features, [key]: !features[key] });
    };

    return (
        <div className="w-80 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#80FF00]/20 flex items-center justify-center">
                    <Target size={16} className="text-[#80FF00]" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">ATS Mode</h3>
                    <p className="text-[10px] text-white/40">Machine Vision Simulation</p>
                </div>
            </div>

            {/* Parsing Confidence */}
            <div className="px-4 py-3 border-b border-white/10">
                <ConfidenceGauge score={confidence} />

                {/* Issues List */}
                {issues.length > 0 && (
                    <div className="mt-3">
                        <button
                            onClick={() => setShowIssues(!showIssues)}
                            className="w-full flex items-center justify-between text-xs"
                        >
                            <span className="text-orange-400 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {issues.length} potential issue{issues.length > 1 ? 's' : ''}
                            </span>
                            {showIssues ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                        </button>

                        <AnimatePresence>
                            {showIssues && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-2 space-y-1 overflow-hidden"
                                >
                                    {issues.map((issue, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-2 rounded text-[10px] ${issue.severity === 'error'
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                                }`}
                                        >
                                            <div className="font-medium">{issue.type.toUpperCase()}</div>
                                            <div className="text-white/50">{issue.description}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Keyword Heatmap */}
            {jdKeywords.length > 0 && (
                <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider">JD Keywords</span>
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-green-400">{matchedCount} matched</span>
                            <span className="text-white/20">|</span>
                            <span className="text-red-400">{missingCount} missing</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {keywordMatches.slice(0, 20).map((match, idx) => (
                            <KeywordBadge key={idx} match={match} />
                        ))}
                        {keywordMatches.length > 20 && (
                            <span className="px-2 py-1 text-[10px] text-white/40">
                                +{keywordMatches.length - 20} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Plain Text Preview */}
            <div className="px-4 py-3 border-b border-white/10">
                <div
                    onClick={() => setShowPlainText(!showPlainText)}
                    className="w-full flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#80FF00]" />
                        <span className="text-xs font-medium text-white">Plain Text Parse</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy plain text"
                        >
                            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-white/40" />}
                        </button>
                        {showPlainText ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                    </div>
                </div>

                <AnimatePresence>
                    {showPlainText && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 overflow-hidden"
                        >
                            <pre className="p-3 bg-black rounded-lg text-[9px] text-[#80FF00] font-mono max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {plainText || 'No CV data to parse'}
                            </pre>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Feature Toggle Hint */}
            <div className="px-4 py-2 bg-white/5">
                <p className="text-[9px] text-white/30 text-center">
                    ATS systems strip formatting and read only plain text
                </p>
            </div>
        </div>
    );
}
