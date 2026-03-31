import { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Issue, PillConfig } from '@/lib/pill-engine';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';

const DEFAULT_CONFIG: PillConfig = {
    quietMode: true,
};

const QUIET_MODE_DEBOUNCE_MS = 3000;
const ACTIVE_MODE_DEBOUNCE_MS = 1500;

export function usePillEngine(
    cvData: UnifiedCVDataStructure,
    cvType: 'master' | 'journey' | 'standalone' = 'standalone',
    keywordAnalysis?: any | null,
    config: PillConfig = DEFAULT_CONFIG,
    /** When true, suppresses automatic re-analysis (e.g., during CV surgeon scan) */
    suppressAutoAnalysis: boolean = false
) {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasRunInitialAnalysis, setHasRunInitialAnalysis] = useState(false);

    // Full Score Result
    const [scoreResult, setScoreResult] = useState<any>(null);

    const cvDataRef = useRef(cvData);
    const analysisRef = useRef(keywordAnalysis);
    const typeRef = useRef(cvType);
    const suppressRef = useRef(suppressAutoAnalysis);
    const analysisCountRef = useRef(0);

    useEffect(() => {
        cvDataRef.current = cvData;
        analysisRef.current = keywordAnalysis;
        typeRef.current = cvType;
        suppressRef.current = suppressAutoAnalysis;
    }, [cvData, keywordAnalysis, cvType, suppressAutoAnalysis]);

    const runAnalysis = useCallback(async () => {
        // Skip if auto-analysis is suppressed (e.g., during CV surgeon scan)
        if (suppressRef.current) {
            return;
        }

        if (!cvDataRef.current) {
            setIsAnalyzing(false);
            return;
        }

        // Prevent concurrent analyses
        analysisCountRef.current++;
        const currentRun = analysisCountRef.current;

        setIsAnalyzing(true);
        try {
            const manager = CentralScoreManager.getInstance();
            const result = await manager.refreshScore(
                cvDataRef.current,
                typeRef.current,
                analysisRef.current
            );

            // Only update state if this is still the latest analysis run
            if (currentRun === analysisCountRef.current) {
                setScoreResult(result);
                setIssues(result.issues);
                setHasRunInitialAnalysis(true);
            }
        } catch (e) {
            console.error("Central Score Manager Analysis Failed", e);
        } finally {
            if (currentRun === analysisCountRef.current) {
                setIsAnalyzing(false);
            }
        }
    }, []);

    // Trigger Logic - only auto-run when NOT suppressed
    useEffect(() => {
        if (suppressAutoAnalysis) return;
        
        const timeoutMs = config.quietMode ? QUIET_MODE_DEBOUNCE_MS : ACTIVE_MODE_DEBOUNCE_MS;
        const timer = setTimeout(runAnalysis, timeoutMs);
        return () => clearTimeout(timer);
    }, [cvData, keywordAnalysis, cvType, config.quietMode, suppressAutoAnalysis, runAnalysis]);

    const triggerAnalysis = useCallback(() => {
        runAnalysis();
    }, [runAnalysis]);

    return {
        issues,
        scoreResult,
        masterScore: scoreResult?.cvScore?.total || 0,
        atsScore: scoreResult?.atsScore?.total || 0,
        healthScore: cvType === 'journey' ? (scoreResult?.atsScore?.total || 0) : (scoreResult?.cvScore?.total || 0),
        isAnalyzing,
        hasRunInitialAnalysis,
        triggerAnalysis
    };
}
