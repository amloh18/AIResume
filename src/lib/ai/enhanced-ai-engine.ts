import { AIContext, SectionType, getSectionLabel, formatContextForPrompt } from './ai-context';
import { AIService, AIResponse } from '@/lib/ai-service';

export interface Suggestion {
  id: string;
  type: 'improve' | 'expand' | 'reword' | 'add_metric' | 'fix_grammar';
  original: string;
  suggestion: string;
  confidence: number;
  reasoning: string;
}

export interface ResumeScore {
  overall: number;
  atsScore: number;
  sections: {
    [key: string]: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
  };
  strengths: string[];
  improvements: string[];
}

export class EnhancedAIEngine {
  static async improveBullet(bullet: string, context: AIContext): Promise<AIResponse> {
    const prompt = `Improve this bullet point for a ${context.role} position${context.company ? ` at ${context.company}` : ''}.

Current bullet: "${bullet}"

Context: ${formatContextForPrompt(context)}

Improve it by:
1. Adding quantifiable metrics where possible
2. Using action verbs
3. Being specific and concise
4. Highlighting impact/results

Return ONLY the improved bullet point, nothing else.`;

    return AIService.generateNewContent(prompt, undefined, 'gemini');
  }

  static async generateAchievements(role: string, company: string, context: AIContext): Promise<AIResponse> {
    const prompt = `Generate 5 quantifiable achievements for a ${role} position at ${company}.

Context: ${formatContextForPrompt(context)}

Generate achievements that:
1. Use numbers and metrics (%, $, users, etc.)
2. Show impact and results
3. Are specific and measurable
4. Use strong action verbs

Format as bullet points, one per line.`;

    return AIService.generateNewContent(prompt, undefined, 'gemini');
  }

  static async suggestImprovements(text: string, context: AIContext): Promise<Suggestion[]> {
    const prompt = `Analyze this text and provide improvement suggestions.

Text: "${text}"
Context: ${formatContextForPrompt(context)}

For each suggestion, provide:
- type: improve | expand | reword | add_metric | fix_grammar
- original: the original text
- suggestion: the improved version
- confidence: 0-1 score
- reasoning: why this improvement helps

Return as JSON array of suggestions.`;

    const response = await AIService.generateNewContent(prompt, undefined, 'gemini');
    
    if (response.success && response.content) {
      try {
        return JSON.parse(response.content);
      } catch {
        return [];
      }
    }
    return [];
  }

  static async optimizeForATS(
    resumeData: any,
    jobDescription: string,
    context: AIContext
  ): Promise<AIResponse> {
    const prompt = `Optimize this resume for ATS (Applicant Tracking System) based on the job description.

Job Description:
${jobDescription}

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

Context: ${formatContextForPrompt(context)}

Optimize by:
1. Incorporating relevant keywords from job description
2. Ensuring proper formatting for ATS parsing
3. Matching required skills
4. Highlighting relevant experience

Return the optimized resume as JSON with the same structure.`;

    return AIService.generateNewContent(prompt, undefined, 'gemini');
  }

  static async detectKeywordGaps(
    resumeData: any,
    jobDescription: string
  ): Promise<string[]> {
    const prompt = `Analyze this job description and resume to find missing keywords.

Job Description:
${jobDescription}

Resume Skills: ${JSON.stringify(resumeData.skills || [])}
Resume Experience: ${JSON.stringify(resumeData.work || [])}

Return a JSON array of keywords from the job description that are missing from the resume.`;

    const response = await AIService.generateNewContent(prompt, undefined, 'gemini');
    
    if (response.success && response.content) {
      try {
        const keywords = JSON.parse(response.content);
        return Array.isArray(keywords) ? keywords : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  static async rewriteResume(
    resumeData: any,
    targetRole: string
  ): Promise<AIResponse> {
    const prompt = `Rewrite this resume for a ${targetRole} position.

Current Resume:
${JSON.stringify(resumeData, null, 2)}

Rewrite to:
1. Tailor all content to ${targetRole} role
2. Highlight relevant skills and experience
3. Use industry-appropriate language
4. Emphasize transferable skills

Return as JSON with the same structure.`;

    return AIService.generateNewContent(prompt, undefined, 'gemini');
  }

  static async scoreResume(resumeData: any): Promise<ResumeScore> {
    const prompt = `Analyze this resume and provide a comprehensive score.

Resume:
${JSON.stringify(resumeData, null, 2)}

Provide a JSON response with:
{
  overall: number (0-100),
  atsScore: number (0-100),
  sections: {
    basics: { score: number, issues: string[], suggestions: string[] },
    work: { score: number, issues: string[], suggestions: string[] },
    education: { score: number, issues: string[], suggestions: string[] },
    skills: { score: number, issues: string[], suggestions: string[] },
    projects: { score: number, issues: string[], suggestions: string[] }
  },
  strengths: string[],
  improvements: string[]
}`;

    const response = await AIService.generateNewContent(prompt, undefined, 'gemini');
    
    if (response.success && response.content) {
      try {
        return JSON.parse(response.content);
      } catch {
        return {
          overall: 50,
          atsScore: 50,
          sections: {},
          strengths: [],
          improvements: ['Unable to analyze resume'],
        };
      }
    }
    return {
      overall: 50,
      atsScore: 50,
      sections: {},
      strengths: [],
      improvements: ['AI service unavailable'],
    };
  }
}

export const generateSectionPrompt = (
  section: SectionType,
  data: any,
  action: 'improve' | 'generate' | 'analyze',
  context: AIContext
): string => {
  const sectionLabel = getSectionLabel(section);
  const contextStr = formatContextForPrompt(context);

  switch (action) {
    case 'improve':
      return `Improve the ${sectionLabel} section of this resume.

Context: ${contextStr}

Current data: ${JSON.stringify(data)}

Provide improved version that:
1. Is more impactful and professional
2. Uses appropriate keywords
3. Is well-structured
4. Highlights key strengths`;

    case 'generate':
      return `Generate new content for the ${sectionLabel} section.

Context: ${contextStr}

Generate appropriate content based on:
- Role: ${context.role}
- Company: ${context.company}
- Related experience: ${JSON.stringify(context.relatedSections || {})}`;

    case 'analyze':
      return `Analyze the ${sectionLabel} section.

Context: ${contextStr}

Data: ${JSON.stringify(data)}

Provide:
1. Score (0-100)
2. Issues to fix
3. Suggestions for improvement`;

    default:
      return '';
  }
};

export const getSectionAwarePrompt = (
  section: SectionType,
  bullet: string,
  context: AIContext
): string => {
  const sectionLabel = getSectionLabel(section);
  
  const sectionPrompts: Record<SectionType, string> = {
    basics: `You are helping improve the personal info section. Focus on making the summary more compelling and professional.`,
    work: `You are helping improve work experience bullet points. Use strong action verbs, quantify achievements, and show impact.`,
    education: `You are helping improve education entries. Highlight relevant coursework, achievements, and skills gained.`,
    skills: `You are helping improve the skills section. Group related skills and ensure they're relevant to the target role.`,
    projects: `You are helping improve project descriptions. Focus on technical challenges, solutions, and outcomes.`,
    certificates: `You are helping improve certificate entries. Highlight the value and relevance of each certification.`,
    languages: `You are helping improve language entries. Specify proficiency levels clearly.`,
    volunteer: `You are helping improve volunteer experience. Focus on impact and transferable skills.`,
    awards: `You are helping improve award entries. Highlight the significance and criteria for each award.`,
    publications: `You are helping improve publication entries. Focus on impact and relevance.`,
  };

  return `${sectionPrompts[section]}

Current bullet: "${bullet}"
Target Role: ${context.role}
${context.company ? `Company: ${context.company}` : ''}

Improve this to be more impactful and professional.`;
};