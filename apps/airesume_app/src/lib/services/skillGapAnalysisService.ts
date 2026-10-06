/**
 * Skill Gap Analysis Service
 * Analyzes job descriptions against Master CV to identify skill gaps
 * Categorizes skills and determines match status
 */

import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { parseRobustJson } from '@/lib/utils/json-parser';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { createHash } from 'crypto';

export interface SkillGapAnalysis {
  overallMatchScore: number;
  lastAnalyzed: Date;
  jobDescriptionHash?: string;
  masterCVUpdatedAt?: Date;
  categories: SkillCategory[];
}

export interface SkillCategory {
  name: string;
  requiredSkills: number;
  matchedSkills: number;
  skills: SkillAnalysis[];
}

export interface SkillAnalysis {
  name: string;
  status: 'mastered' | 'transferable' | 'critical-gap';
  priority: 'critical' | 'high' | 'medium';
  jdContext: string;
  cvEvidence?: string;
  courseRecommendation?: {
    provider: string;
    title: string;
    url: string;
    estimatedHours: number;
  };
  cvRephraseSuggestion?: string;
}

export class SkillGapAnalysisService {
  /**
   * Generate hash for job description to detect changes
   */
  static generateJobDescriptionHash(jobDescription: string): string {
    return createHash('sha256').update(jobDescription).digest('hex');
  }

  /**
   * Helper to sanitize and parse JSON from AI responses
   * Handles common issues like trailing commas, unescaped characters, etc.
   */
  /**
   * Helper to sanitize and parse JSON from AI responses
   * Uses shared robust parser
   */
  private static sanitizeAndParseJSON(jsonString: string): any {
    try {
      return parseRobustJson(jsonString, { debug: true });
    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      throw error;
    }
  }

  /**
   * Check if cached analysis is still valid
   */
  static isCacheValid(
    cachedAnalysis: any,
    currentJobDescriptionHash: string,
    masterCVUpdatedAt: Date
  ): boolean {
    if (!cachedAnalysis || !cachedAnalysis.lastAnalyzed) {
      return false;
    }

    // Check if job description changed
    if (cachedAnalysis.jobDescriptionHash !== currentJobDescriptionHash) {
      return false;
    }

    // Check if master CV was updated after analysis
    if (cachedAnalysis.masterCVUpdatedAt) {
      const cachedCVDate = new Date(cachedAnalysis.masterCVUpdatedAt);
      const currentCVDate = new Date(masterCVUpdatedAt);
      if (currentCVDate > cachedCVDate) {
        return false;
      }
    }

    // Check if analysis is older than 30 days (optional refresh)
    const analysisDate = new Date(cachedAnalysis.lastAnalyzed);
    const daysSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAnalysis > 30) {
      return false;
    }

    return true;
  }

  /**
   * Extract CV text for analysis
   */
  private static extractCVText(cvData: UnifiedCVDataStructure): string {
    const parts: string[] = [];

    // Summary
    if (cvData.basics?.summary) {
      parts.push(`Summary: ${cvData.basics.summary}`);
    }

    // Skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      const allSkills: string[] = [];
      cvData.skills.forEach((skillCategory: any) => {
        if (skillCategory.category) {
          allSkills.push(skillCategory.category);
        }
        if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
          allSkills.push(...skillCategory.skills);
        }
      });
      if (allSkills.length > 0) {
        parts.push(`Skills: ${allSkills.join(', ')}`);
      }
    }

    // Work Experience
    if (cvData.work && Array.isArray(cvData.work)) {
      const workEntries = cvData.work.map((job: any) => {
        const highlights = job.highlights?.join('. ') || '';
        return `${job.position} at ${job.name}: ${job.summary || ''} ${highlights}`;
      });
      parts.push(`Work Experience: ${workEntries.join(' | ')}`);
    }

    // Projects
    if (cvData.projects && Array.isArray(cvData.projects)) {
      const projectEntries = cvData.projects.map((proj: any) => {
        const highlights = proj.highlights?.join('. ') || '';
        const keywords = proj.keywords?.join(', ') || '';
        return `${proj.name}: ${proj.description || ''} ${highlights} Technologies: ${keywords}`;
      });
      parts.push(`Projects: ${projectEntries.join(' | ')}`);
    }

    // Education
    if (cvData.education && Array.isArray(cvData.education)) {
      const eduEntries = cvData.education.map((edu: any) => {
        return `${edu.studyType} in ${edu.area} from ${edu.institution}`;
      });
      parts.push(`Education: ${eduEntries.join(' | ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Analyze skill gap between job description and CV
   */
  static async analyzeSkillGap(
    jobDescription: string,
    cvData: UnifiedCVDataStructure,
    jobTitle?: string,
    company?: string
  ): Promise<SkillGapAnalysis> {
    const cvText = this.extractCVText(cvData);

    const systemPrompt = `You are an expert career analyst specializing in skill gap analysis. Your task is to extract skills from job descriptions, categorize them, and compare them against CV data to identify gaps.
    
IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting (no \`\`\`json blocks). Do not include any introductory text.`;

    const userPrompt = `Analyze the following job description and compare it against the provided CV data.

JOB DETAILS:
Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}
Description:
${jobDescription}

CV DATA:
${cvText}

Your task:
1. Extract all required skills from the job description
2. Dynamically categorize skills into logical groups based on the job's actual requirements. Common categories include:
   - Technical Skills (Hard Skills): programming languages, tools, frameworks, platforms, data analysis tools
   - Domain Expertise (Industry Knowledge): industry-specific knowledge, domain expertise, business knowledge
   - Delivery & Tools (Delivery): dashboards, reporting, visualization, governance, CI/CD, DevOps
   - Soft Skills (Communication): communication, project management, stakeholder management, leadership, collaboration
   - Create additional categories as needed based on the JD (e.g., "Design Skills", "Sales Skills", "Operations")
   - Do NOT force skills into predefined categories — create categories that naturally fit the job

3. For each skill, determine the match status:
   - "mastered": The skill is explicitly mentioned in the CV with quantifiable metrics or clear evidence
   - "transferable": The skill is implied or a functional equivalent exists (e.g., CV mentions "Tableau" but JD requires "Power BI")
   - "critical-gap": The skill is explicitly required by the JD but completely missing or only vaguely mentioned in the CV

4. Determine priority for gaps:
   - "critical": Skills mentioned in "Key Accountabilities" or marked as "required"/"must have"
   - "high": Skills marked as "important" or frequently mentioned
   - "medium": Skills marked as "preferred" or "nice to have"

5. For each skill, provide:
   - The exact context from the job description (jdContext)
   - Evidence from CV if matched (cvEvidence)
   - For transferable skills, suggest how to rephrase CV to better match JD terminology (cvRephraseSuggestion)

Return a JSON object with this exact structure:
{
  "overallMatchScore": <number 0-100>,
  "categories": [
    {
      "name": "<dynamic category name based on JD>",
      "requiredSkills": <number>,
      "matchedSkills": <number>,
      "skills": [
        {
          "name": "<skill name>",
          "status": "mastered" | "transferable" | "critical-gap",
          "priority": "critical" | "high" | "medium",
          "jdContext": "<exact text from job description mentioning this skill>",
          "cvEvidence": "<evidence from CV if matched, optional>",
          "cvRephraseSuggestion": "<suggested CV rephrase for transferable skills, optional>"
        }
      ]
    }
  ]
}

Be thorough and accurate. Include all skills mentioned in the job description. Create 3-6 natural categories based on the JD content.`;

    try {
      const result = await callAIWithFallback({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 4096,
        model: 'gemini-2.5-flash-lite'
      });

      const text = result.content;

      // Parse JSON from AI response with sanitization
      const parsed = this.sanitizeAndParseJSON(text);

      // Validate and structure the response
      const analysis: SkillGapAnalysis = {
        overallMatchScore: Math.min(100, Math.max(0, parsed.overallMatchScore || 0)),
        lastAnalyzed: new Date(),
        jobDescriptionHash: this.generateJobDescriptionHash(jobDescription),
        categories: (parsed.categories || []).map((cat: any) => ({
          name: cat.name || '',
          requiredSkills: cat.requiredSkills || 0,
          matchedSkills: cat.matchedSkills || 0,
          skills: (cat.skills || []).map((skill: any) => ({
            name: skill.name || '',
            status: skill.status || 'critical-gap',
            priority: skill.priority || 'medium',
            jdContext: skill.jdContext || '',
            cvEvidence: skill.cvEvidence,
            cvRephraseSuggestion: skill.cvRephraseSuggestion
          }))
        }))
      };

      return analysis;
    } catch (error) {
      console.error('Skill gap analysis error (continuing with default):', error);
      // Return default safe analysis instead of throwing
      return {
        overallMatchScore: 50,
        lastAnalyzed: new Date(),
        jobDescriptionHash: this.generateJobDescriptionHash(jobDescription),
        categories: [
          {
            name: "General Skills",
            requiredSkills: 5,
            matchedSkills: 0,
            skills: []
          }
        ]
      };
    }
  }
}

