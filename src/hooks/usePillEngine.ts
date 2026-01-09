import { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Issue, PillConfig } from '@/lib/pill-engine';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';

const DEFAULT_CONFIG: PillConfig = {
    quietMode: true,
};

const QUIET_MODE_DEBOUNCE_MS = 2000;
const ACTIVE_MODE_DEBOUNCE_MS = 800;

export function usePillEngine(
    cvData: UnifiedCVDataStructure,
    cvType: 'master' | 'journey' | 'standalone' = 'standalone',
    keywordAnalysis?: any | null, // using any to avoid import loop or strict type check if types not exported, but preferably import KeywordGapAnalysisResult
    config: PillConfig = DEFAULT_CONFIG
) {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Full Score Result
    const [scoreResult, setScoreResult] = useState<any>(null); // Type as ScoreResult

    const cvDataRef = useRef(cvData);
    const analysisRef = useRef(keywordAnalysis);
    const typeRef = useRef(cvType);

    useEffect(() => {
        cvDataRef.current = cvData;
        analysisRef.current = keywordAnalysis;
        typeRef.current = cvType;
    }, [cvData, keywordAnalysis, cvType]);

    const runAnalysis = useCallback(async () => {
        setIsAnalyzing(true);
        try {
            const manager = CentralScoreManager.getInstance();
            const result = await manager.refreshScore(
                cvDataRef.current,
                typeRef.current,
                analysisRef.current
            );

            setScoreResult(result);
            setIssues(result.issues);
        } catch (e) {
            console.error("Central Score Manager Analysis Failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Trigger Logic
    useEffect(() => {
        const timeoutMs = config.quietMode ? QUIET_MODE_DEBOUNCE_MS : ACTIVE_MODE_DEBOUNCE_MS;
        const timer = setTimeout(runAnalysis, timeoutMs);
        return () => clearTimeout(timer);
    }, [cvData, keywordAnalysis, cvType, config.quietMode, runAnalysis]);

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
        triggerAnalysis
    };
}
