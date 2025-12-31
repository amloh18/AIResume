import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SkillGapAnalysisService } from '@/lib/services/skillGapAnalysisService';
import { parseRobustJson } from '@/lib/utils/json-parser';
import mongoose from 'mongoose';



export class InterviewCoachService {

    /**
     * Generates a full interview preparation plan including modules and questions
     */
    /**
     * Generates a full interview preparation plan including modules and questions
     */
    static async generateInterviewPlan(
        jobDescription: string,
        cvData: UnifiedCVDataStructure,
        jobTitle: string,
        company: string
    ): Promise<{ modules: any[], questions: any[], skillExtracts: string[] }> {

        // Define the Schema (The "Contract" the AI must follow)
        // Using string literals for SchemaType to avoid extra imports and dependency issues
        const interviewSchema = {
            description: "Assessment of candidate fit and interview questions based on CV and JD",
            type: "OBJECT",
            properties: {
                skillGapAnalysis: {
                    type: "OBJECT",
                    properties: {
                        matchScore: { type: "NUMBER", description: "0-100 score of fit" },
                        missingCriticalSkills: {
                            type: "ARRAY",
                            items: { type: "STRING" },
                            description: "Must-have skills from JD not found in CV"
                        },
                        matchedSkills: {
                            type: "ARRAY",
                            items: { type: "STRING" },
                            description: "Skills present in both JD and CV"
                        }
                    },
                    required: ["matchScore", "missingCriticalSkills", "matchedSkills"]
                },
                questionnaire: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            type: { type: "STRING", enum: ["Technical", "Behavioral", "System Design"] },
                            context: { type: "STRING", description: "Why this question matters for this specific candidate based on their CV gaps or strengths." },
                            suggestedAnswerKey: { type: "STRING", description: "Brief bullet points on what a 'Good' answer looks like." }
                        },
                        required: ["question", "type", "context", "suggestedAnswerKey"]
                    }
                }
            },
            required: ["skillGapAnalysis", "questionnaire"]
        };

        const prompt = `
            You are an Expert Technical Interviewer. 
            Analyze the following Candidate CV against the Job Description (JD).
            
            JOB DESCRIPTION:
            ${jobDescription}
            
            CANDIDATE CV:
            ${this.formatCVForPrompt(cvData)}
            
            Target Role: ${jobTitle} at ${company}

            Task:
            1. Perform a ruthless Skill Gap Analysis.
            2. Generate 5-7 highly personalized interview questions. 
            - If the candidate claims a skill (e.g., "React Expert"), verify it with a deep technical question.
            - If the candidate is missing a skill (e.g., "No AWS"), ask a foundational question to check aptitude.
            
            Output must strictly follow the JSON schema provided.
        `;

        try {
            console.log('🔍 Generating structured interview plan...');

            const result = await callAIWithFallback({
                prompt: prompt,
                temperature: 0.4,
                model: 'gemini-2.0-flash-exp', // Structured outputs work best with 1.5 Pro or Flash
                responseMimeType: 'application/json',
                responseSchema: interviewSchema
            });

            // Parse the result - guaranteed to be valid JSON by the schema
            const parsedData = JSON.parse(result.content);

            // Map the structured output to the application's expected format
            const { skillGapAnalysis, questionnaire } = parsedData;

            // Group questions by type to form modules
            const groupedQuestions = questionnaire.reduce((acc: any, item: any) => {
                const type = item.type || 'Technical';
                if (!acc[type]) acc[type] = [];
                acc[type].push(item);
                return acc;
            }, {});

            const modules: any[] = [];
            const questions: any[] = [];
            let moduleIndex = 0;

            for (const [type, items] of Object.entries(groupedQuestions)) {
                // Map type to existing style types
                const normalizedType = type.toLowerCase().replace(' ', '-');
                const moduleId = `${normalizedType}-module`; // e.g. technical-module

                modules.push({
                    id: moduleId,
                    title: `${type} Interview`,
                    type: normalizedType,
                    status: moduleIndex === 0 ? 'in-progress' : 'pending',
                    displayOrder: moduleIndex
                });

                // Add questions for this module
                (items as any[]).forEach((q: any, qIndex: number) => {
                    questions.push({
                        moduleId: moduleId,
                        content: {
                            question: q.question,
                            whyAsked: q.context,
                            difficulty: 'medium', // Default as specific difficulty wasn't in the new schema, or we could add it back
                            tags: [normalizedType]
                        },
                        edgeTip: {
                            content: q.suggestedAnswerKey
                        },
                        displayOrder: qIndex,
                        isHighRelevance: true
                    });
                });

                moduleIndex++;
            }

            // Combine matched and missing skills for extracts
            const skillExtracts = [
                ...(skillGapAnalysis.missingCriticalSkills || []),
                ...(skillGapAnalysis.matchedSkills || [])
            ];

            return { modules, questions, skillExtracts };

        } catch (error) {
            console.error('❌ Interview generation failed, using fallback plan:', error);

            // Minimal Fallback Plan (Legacy structure)
            const fallbackModules = [{
                id: 'fallback-general',
                title: 'General Interview Prep',
                type: 'behavioral',
                status: 'in-progress',
                displayOrder: 0
            }];

            const fallbackQuestions = [
                {
                    moduleId: 'fallback-general',
                    content: {
                        question: "Tell me about yourself and your experience relevant to this role.",
                        whyAsked: "This is a classic opener to gauge your communication skills and professional narrative.",
                        difficulty: "easy",
                        tags: ["introduction", "communication"]
                    },
                    edgeTip: {
                        content: "Keep it under 2 minutes. Focus on your professional journey and why you're a good fit."
                    },
                    displayOrder: 0,
                    isHighRelevance: true
                }
            ];

            return { modules: fallbackModules, questions: fallbackQuestions, skillExtracts: [] };
        }
    }

    /**
     * Analyzes a user's answer to a specific question
     */
    static async analyzeAnswer(
        questionText: string,
        userAnswer: string,
        jobContext: string
    ): Promise<any> {
        const systemPrompt = `You are a senior interview coach. Analyze the candidate's answer using the STAR method (Situation, Task, Action, Result).`;

        const userPrompt = `
      Question: "${questionText}"
      Job Context: ${jobContext}
      
      Candidate Answer:
      "${userAnswer}"
      
      Provide a critique in JSON format:
      {
        "score": <0-100>,
        "strengths": ["point 1", "point 2"],
        "improvements": ["point 1", "point 2"],
        "improvedScript": "Rewritten version of the answer that is 30% better but keeps the candidate's core facts...",
        "sentiment": "positive|neutral|negative"
      }
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
                strengths: ["Could not analyze at this time"],
                improvements: ["Please try again"],
                improvedScript: userAnswer,
                sentiment: "neutral"
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
