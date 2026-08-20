import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SkillGapAnalysisService } from '@/lib/services/skillGapAnalysisService';
import { parseRobustJson } from '@/lib/utils/json-parser';
import mongoose from 'mongoose';

/**
 * Cleans the raw string from AI to ensure it's valid JSON.
 * Removes Markdown code blocks and conversational text.
 */
function cleanGeminiJson(text: string): string {
    if (!text) return '{}';

    // 1. Remove Markdown code blocks (```json ... ```)
    let cleanText = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').replace(/```/g, '');

    // 2. Find the start and end of the JSON object
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    return cleanText;
}


export class InterviewCoachService {

    /**
     * Generates a personalized interview preparation plan with Gap & Edge analysis
     * Uses experience-based question volume: <3 years = 10, 3-8 = 12, >8 = 15 questions
     */
    static async generateInterviewPlan(
        jobDescription: string,
        cvData: UnifiedCVDataStructure,
        jobTitle: string,
        company: string,
        missingKeywords?: string[]
    ): Promise<{ modules: any[], questions: any[] }> {

        // Calculate years of experience from CV
        const yearsOfExperience = this.calculateExperience(cvData);
        const questionCount = yearsOfExperience < 3 ? 10 : yearsOfExperience <= 8 ? 12 : 15;

        console.log(`📊 Detected ${yearsOfExperience} years experience → Generating ${questionCount} questions`);

        // Define the strict JSON schema for Gemini
        const interviewSchema = {
            description: "Interview preparation plan with Gap & Edge analysis",
            type: "OBJECT",
            properties: {
                summary: {
                    type: "OBJECT",
                    properties: {
                        detected_experience_years: { type: "NUMBER" },
                        generated_question_count: { type: "NUMBER" },
                        focus_areas: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["detected_experience_years", "generated_question_count", "focus_areas"]
                },
                modules: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING" },
                            title: { type: "STRING" },
                            description: { type: "STRING" },
                            questions: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        id: { type: "STRING" },
                                        category: { type: "STRING" },
                                        text: { type: "STRING" },
                                        difficulty: { type: "STRING", enum: ["Easy", "Medium", "Hard"] },
                                        rationale: { type: "STRING" },
                                        candidate_context: {
                                            type: "OBJECT",
                                            properties: {
                                                edge: { type: "STRING" },
                                                gap: { type: "STRING" },
                                                strategy: { type: "STRING" }
                                            },
                                            required: ["edge", "gap", "strategy"]
                                        },
                                        sample_answer: { type: "STRING" }
                                    },
                                    required: ["id", "category", "text", "difficulty", "rationale", "candidate_context", "sample_answer"]
                                }
                            }
                        },
                        required: ["id", "title", "description", "questions"]
                    }
                }
            },
            required: ["summary", "modules"]
        };

        const cvContext = this.formatCVForPrompt(cvData);
        const skillGapsContext = missingKeywords?.length
            ? `\nSKILL GAPS IDENTIFIED:\n${missingKeywords.join(', ')}\nCreate harder questions for these gaps and suggest pivot strategies.`
            : '';

        const prompt = `You are an elite Technical Interview Coach and Hiring Manager with 20+ years of experience at top-tier tech companies.

Your goal is to generate a highly personalized interview preparation plan in JSON format.

INPUT DATA:
----------------
TARGET JOB:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}
${skillGapsContext}

CANDIDATE CV:
${cvContext}
----------------

INSTRUCTIONS:

1. ANALYZE SENIORITY & VOLUME:
   - Based on the CV work history, the candidate has approximately ${yearsOfExperience} years of experience.
   - Generate exactly ${questionCount} high-impact questions.
   ${yearsOfExperience > 8 ? '- Focus heavily on System Design and Leadership for this senior profile.' : ''}

2. DETERMINE CATEGORIES (MODULES):
   - Create 2-4 categories dynamically based on the Job Description.
   - Standard categories: "Technical", "Behavioral", "Cultural Fit".
   - Domain specific categories if JD mentions specific tech (e.g., "DevOps", "System Design", "Leadership").

3. GENERATE QUESTIONS (THE "GAP & EDGE" LOGIC):
   For every question, analyze the match between CV and JD:
   - edge: Find a SPECIFIC project, metric, or achievement from the CV that proves competence. Use actual company names and numbers from the CV. Do NOT hallucinate.
   - gap: What is missing? What risk does the interviewer see? Be honest about weaknesses.
   - strategy: How should the candidate pivot from their existing experience to address the gap?
   - sample_answer: Write a FULL, first-person script as if the candidate is speaking. Use the STAR method but DO NOT label the sections. Must use specific details from the CV (Edge). DO NOT write generic advice like 'Use the STAR method'. Write the actual words they should say.

4. OUTPUT FORMAT:
   Return ONLY valid JSON matching the schema. No markdown, no explanations.`;

        try {
            console.log('🔍 Generating structured interview plan for:', jobTitle, 'at', company);

            const result = await callAIWithFallback({
                prompt: prompt,
                temperature: 0.4,
                model: 'gemini-2.5-flash-lite', // Match other services
                responseMimeType: 'application/json',
                responseSchema: interviewSchema,
                maxTokens: 8192 // Prevent truncation for large outputs
            });

            // Clean and parse the response
            let parsedData;
            try {
                const cleanedText = cleanGeminiJson(result.content);
                parsedData = JSON.parse(cleanedText);
            } catch (parseError) {
                console.error('❌ JSON Parse Failed. Raw AI Output (first 500 chars):', result.content?.substring(0, 500) + '...');
                // Try the robust parser as fallback
                parsedData = parseRobustJson(result.content);
            }

            console.log('📝 AI returned:', {
                moduleCount: parsedData?.modules?.length || 0,
                questionCount: parsedData?.summary?.generated_question_count || 0,
                focusAreas: parsedData?.summary?.focus_areas || []
            });

            // Transform AI output to match embedded schema structure
            const modules: any[] = [];
            const questions: any[] = [];
            let globalQuestionIndex = 0;

            parsedData.modules.forEach((mod: any, modIndex: number) => {
                const questionIds = mod.questions.map((q: any) => q.id);

                modules.push({
                    id: mod.id,
                    name: mod.title,
                    description: mod.description,
                    questionIds: questionIds
                });

                mod.questions.forEach((q: any) => {
                    questions.push({
                        id: q.id,
                        category: q.category,
                        question: q.text,
                        difficulty: q.difficulty,
                        aiContext: {
                            rationale: q.rationale,
                            edge: q.candidate_context.edge,
                            gap: q.candidate_context.gap,
                            sampleAnswer: q.sample_answer
                        },
                        isSavedToCheatSheet: false,
                        status: 'pending',
                        userAnswer: ''
                    });
                    globalQuestionIndex++;
                });
            });

            console.log(`✅ Generated ${modules.length} modules with ${questions.length} questions`);
            return { modules, questions };

        } catch (error) {
            console.error('❌ Interview generation failed, using fallback plan:', error);
            return this.getFallbackPlan(jobTitle, company);
        }
    }

    /**
     * Calculate total years of experience from CV work history
     */
    private static calculateExperience(cv: UnifiedCVDataStructure): number {
        if (!cv.work || cv.work.length === 0) return 0;

        let totalMonths = 0;
        cv.work.forEach(job => {
            if (job.startDate) {
                const start = new Date(job.startDate);
                const end = job.endDate ? new Date(job.endDate) : new Date();
                const months = (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth());
                totalMonths += Math.max(0, months);
            }
        });

        return Math.round(totalMonths / 12);
    }

    /**
     * Minimal fallback plan if AI generation fails
     */
    private static getFallbackPlan(jobTitle: string, company: string): { modules: any[], questions: any[] } {
        const modules = [{
            id: 'fallback-general',
            name: 'General Interview Prep',
            description: 'Standard interview questions to get you started',
            questionIds: ['q-fallback-1', 'q-fallback-2', 'q-fallback-3']
        }];

        const questions = [
            {
                id: 'q-fallback-1',
                category: 'Behavioral',
                question: 'Tell me about yourself and your experience relevant to this role.',
                difficulty: 'Easy',
                aiContext: {
                    rationale: 'This opener assesses your communication skills and professional narrative.',
                    edge: 'Use your most relevant experience and achievements.',
                    gap: 'Avoid rambling or being too generic.',
                    sampleAnswer: `In my career, I've focused on [relevant area]. Most recently, I [specific achievement]. I'm excited about ${jobTitle} at ${company} because [connection to role].`
                },
                isSavedToCheatSheet: false,
                status: 'pending',
                userAnswer: ''
            },
            {
                id: 'q-fallback-2',
                category: 'Behavioral',
                question: 'What is your greatest professional achievement?',
                difficulty: 'Medium',
                aiContext: {
                    rationale: 'Interviewers want to see what you consider significant and how you measure success.',
                    edge: 'Pick an achievement with quantifiable impact.',
                    gap: 'Avoid achievements that seem small or unrelated to the role.',
                    sampleAnswer: 'At [Company], I led [specific project] that resulted in [measurable outcome]. I achieved this by [specific actions].'
                },
                isSavedToCheatSheet: false,
                status: 'pending',
                userAnswer: ''
            },
            {
                id: 'q-fallback-3',
                category: 'Behavioral',
                question: 'Why do you want to work at this company?',
                difficulty: 'Easy',
                aiContext: {
                    rationale: 'Tests whether you researched the company and have genuine interest.',
                    edge: 'Show specific knowledge about the company.',
                    gap: 'Generic answers suggest low interest.',
                    sampleAnswer: `I'm drawn to ${company} because of [specific reason]. My experience in [area] aligns with your work on [company initiative].`
                },
                isSavedToCheatSheet: false,
                status: 'pending',
                userAnswer: ''
            }
        ];

        return { modules, questions };
    }

    /**
     * Analyzes a user's answer to a specific question
     */
    static async analyzeAnswer(
        questionText: string,
        userAnswer: string,
        jobContext: string,
        cvContext: string = ''
    ): Promise<any> {
        const systemPrompt = `### ROLE
You are the "AI Resume Interview Coach," an expert recruiter and career strategist. Your goal is to provide a high-end, brutal-yet-constructive analysis of a user's spoken interview response.

### CONTEXT
You will be provided with two key pieces of data:
1. **User Master CV:** The core professional history of the user.
2. **Interview Question:** The specific challenge the user is currently answering.

### ANALYSIS CRITERIA
For every response, you must evaluate:
- **Accuracy:** Does the answer align with the facts in their CV?
- **The "Edge":** Identify a specific skill or achievement from their CV that they *failed* to mention but would strengthen the answer.
- **STAR Method:** Does the answer follow a Situation, Task, Action, Result structure?

### OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object with the following keys:
{
  "score": (integer 0-100),
  "feedback_summary": (string, 1-2 sentences on overall impact),
  "what_you_did_well": [list of strings],
  "areas_to_improve": [list of strings],
  "your_edge": (string, a specific "missed opportunity" from their CV context),
  "ai_enhanced_version": (string, a rewritten, high-impact version of their response)
}

### TONE
Professional, encouraging, and luxury-focused. Avoid generic advice; be hyper-specific to the provided CV data.`;

        const userPrompt = `
      Question: "${questionText}"
      Job Context: ${jobContext}
      
      Candidate CV:
      ${cvContext}
      
      Candidate Answer:
      "${userAnswer}"
    `;

        try {
            const result = await callAIWithFallback({
                prompt: userPrompt,
                systemPrompt,
                temperature: 0.6,
                model: 'gemini-2.5-flash-lite'
            });

            return parseRobustJson(result.content);

        } catch (error) {
            console.error('❌ Answer analysis failed:', error);
            // Fallback for UI if AI fails
            return {
                score: 0,
                what_you_did_well: ["Could not analyze at this time"],
                areas_to_improve: ["Please try again"],
                ai_enhanced_version: userAnswer,
                feedback_summary: "Analysis failed due to a system error.",
                your_edge: "Please try again later."
            };
        }
    }

    private static formatCVForPrompt(cv: UnifiedCVDataStructure): string {
        // Simplified CV extraction
        const work = cv.work?.map(w => `${w.position} at ${w.name}: ${w.highlights?.slice(0, 2).join('. ')}`).join('\n') || '';
        const projects = cv.projects?.map(p => `${p.name}: ${p.description}`).join('\n') || '';
        return `Work Experience:\n${work}\n\nProjects:\n${projects}`;
    }
}
