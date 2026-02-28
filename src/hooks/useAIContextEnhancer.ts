import { useState, useCallback } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Issue } from '@/lib/pill-engine/types';

interface AIContextEnhancerConfig {
    userId?: string;
    onConsumeCredit?: (amount: number) => Promise<boolean>;
}

interface EnhanceSnippetResult {
    id: string;
    content: string;
    originalSnippet: string;
    issue: string;
}

export function useAIContextEnhancer({ userId, onConsumeCredit }: AIContextEnhancerConfig = {}) {
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<EnhanceSnippetResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const enhanceSnippet = useCallback(async (
        issue: Issue, 
        snippet: string, 
        context?: {
            cvData?: UnifiedCVDataStructure;
            jobData?: any;
            sectionType?: string;
        }
    ) => {
        setIsEnhancing(true);
        setAiSuggestion(null);
        setError(null);

        try {
            // 1. Gatekeeper: Check Credit (if credit system is configured)
            if (onConsumeCredit) {
                const success = await onConsumeCredit(1);
                if (!success) {
                    setError('Insufficient credits for AI enhancement');
                    setIsEnhancing(false);
                    return;
                }
            }

            // 2. Construct the enhancement prompt
            const prompt = buildEnhancementPrompt(issue, snippet, context?.sectionType);

            // 3. Call the real AI API
            const response = await fetch('/api/ai/improve-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    cvData: context?.cvData,
                    jobData: context?.jobData,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to enhance content');
            }

            setAiSuggestion({
                id: issue.id,
                content: data.content.trim(),
                originalSnippet: snippet,
                issue: issue.message,
            });

        } catch (err) {
            console.error("AI Context Enhancement failed:", err);
            setError(err instanceof Error ? err.message : 'AI enhancement failed');
        } finally {
            setIsEnhancing(false);
        }
    }, [onConsumeCredit]);

    const clearSuggestion = useCallback(() => {
        setAiSuggestion(null);
        setError(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isEnhancing,
        aiSuggestion,
        error,
        enhanceSnippet,
        clearSuggestion,
        clearError,
    };
}

/**
 * Builds a context-aware prompt for snippet enhancement
 */
function buildEnhancementPrompt(
    issue: Issue, 
    snippet: string, 
    sectionType?: string
): string {
    const sectionContext = sectionType || issue.section || 'resume';
    
    // Determine the type of improvement needed based on issue type
    let improvementFocus = '';
    
    switch (issue.type) {
        case 'MISSING_METRICS':
        case 'WEAK_VERB':
            improvementFocus = `
                Focus on:
                - Adding quantifiable metrics (use [X]% or [Number] placeholders if exact numbers unknown)
                - Using strong impact verbs (led, increased, reduced, optimized, delivered)
                - Following the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]"
            `;
            break;
            
        case 'TENSE_GRAMMAR':
            improvementFocus = `
                Focus on:
                - Correcting verb tenses (past tense for completed work, present for ongoing)
                - Ensuring grammatical consistency
                - Maintaining professional tone
            `;
            break;
            
        case 'KEYWORD_GAP':
            improvementFocus = `
                Focus on:
                - Naturally incorporating relevant industry keywords
                - Maintaining readability while optimizing for ATS
                - Using keywords in context, not just listing them
            `;
            break;
            
        case 'BULLET_TOO_SHORT':
            improvementFocus = `
                Focus on:
                - Expanding with specific details and context
                - Adding measurable outcomes
                - Providing more depth while staying concise
            `;
            break;
            
        case 'BULLET_TOO_LONG':
            improvementFocus = `
                Focus on:
                - Condensing to essential information
                - Removing redundancy
                - Keeping impact while being concise (aim for 1-2 lines)
            `;
            break;
            
        case 'PASSIVE_VOICE':
            improvementFocus = `
                Focus on:
                - Converting passive voice to active voice
                - Starting sentences with action verbs
                - Making statements more direct and impactful
            `;
            break;
            
        case 'VAGUE_ADJECTIVE':
            improvementFocus = `
                Focus on:
                - Replacing vague terms (good, great, excellent) with specific achievements
                - Adding concrete examples or metrics
                - Being more precise about accomplishments
            `;
            break;
            
        default:
            improvementFocus = `
                Focus on:
                - Using strong action verbs
                - Adding quantifiable results where possible
                - Making content more impactful and professional
            `;
    }

    return `
Improve the following ${sectionContext} content for a resume:

Original Content:
"${snippet}"

Issue Identified: ${issue.message}

${improvementFocus}

Return ONLY the improved content without explanations, markdown formatting, or bullet point symbols.
The improved content should be ready to use directly in a resume.
`;
}

export type { EnhanceSnippetResult };
