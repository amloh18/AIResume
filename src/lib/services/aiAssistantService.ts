import { CVData } from '@/lib/stores/cvStore';
import { Job } from '@/lib/stores/jobStore';
import { ATSAnalysis, AISuggestion } from '@/lib/stores/aiStore';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

export class AIAssistantService {
  // ATS Score calculation
  static async calculateATSScore(cvData: CVData, jobData: Job | null): Promise<ATSAnalysis> {
    const system = `You are an ATS (Applicant Tracking System) analyzer. Analyze the CV against the job description and provide a comprehensive ATS score and analysis.

Respond with ONLY valid JSON in this exact format:
{
  "score": number (0-100),
  "missingKeywords": ["keyword1", "keyword2"],
  "weakKeywords": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Guidelines:
- Score based on keyword match, structure, formatting, and completeness
- Missing keywords: important job requirements not found in CV
- Weak keywords: present but could be emphasized more
- Strengths: what the CV does well
- Suggestions: specific improvements to increase ATS score`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job Title: ${jobData.title}\nCompany: ${jobData.company}\nDescription: ${jobData.description}\nRequirements: ${jobData.requirements?.join(', ')}\nSkills: ${jobData.skills?.join(', ')}` : 'No specific job context provided. Analyze for general ATS compliance.';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Provide ATS analysis:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Content Optimizer
  static async optimizeContent(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are a CV content optimizer. Analyze the CV and provide specific suggestions to improve content for better impact and job alignment.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Suggestion Title",
    "content": "Detailed suggestion content",
    "type": "improvement|addition|replacement",
    "section": "experience|summary|skills|education",
    "field": "specific field if applicable"
  }
]

Focus on:
- Making achievements more impactful and quantifiable
- Improving summary to be more compelling
- Optimizing skills section alignment
- Enhancing experience descriptions`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title} at ${jobData.company}\nRequirements: ${jobData.requirements?.join(', ')}` : 'General optimization';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Provide optimization suggestions:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Quantification Assistant
  static async quantifyAchievements(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are a quantification specialist. Find vague statements in the CV and suggest specific, measurable improvements.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Quantify: [original statement]",
    "content": "Improved version with numbers and metrics",
    "type": "improvement",
    "section": "experience",
    "field": "description or achievements"
  }
]

Examples:
- "Led team" → "Led 8-person cross-functional team"
- "Improved performance" → "Improved system performance by 40%"
- "Increased sales" → "Increased sales by 25% over 6 months"`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title} at ${jobData.company}` : 'General quantification';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Find vague statements and suggest quantified improvements:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Skills & Keywords Mapper
  static async mapSkillsAndKeywords(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are a skills and keywords mapper. Analyze the CV skills against job requirements and provide mapping suggestions.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Skill: [skill name]",
    "content": "Analysis and suggestions for this skill",
    "type": "improvement|addition",
    "section": "skills",
    "field": "skill category or specific skill"
  }
]

Analyze:
- Skills that match job requirements (highlight these)
- Skills that partially match (suggest enhancements)
- Missing critical skills (suggest additions)
- Skills that could be better positioned`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title}\nRequired Skills: ${jobData.skills?.join(', ')}\nRequirements: ${jobData.requirements?.join(', ')}` : 'General skills analysis';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Provide skills mapping analysis:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Gap Analyzer
  static async analyzeGaps(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are a gap analyzer. Identify gaps between the CV and job requirements and suggest ways to address them.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Gap: [missing qualification]",
    "content": "Detailed analysis and suggestions to address this gap",
    "type": "addition",
    "section": "experience|education|skills|certifications",
    "field": "specific area"
  }
]

Focus on:
- Missing qualifications or certifications
- Experience gaps
- Skill gaps
- Education requirements
- Industry-specific knowledge`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title}\nRequirements: ${jobData.requirements?.join(', ')}\nSkills: ${jobData.skills?.join(', ')}` : 'General gap analysis';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Identify gaps and provide suggestions:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Achievement Generator
  static async generateAchievements(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are an achievement generator. Transform basic job descriptions into impactful, STAR-format achievements.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Achievement for: [job/role]",
    "content": "STAR-format achievement with Situation, Task, Action, Result",
    "type": "improvement",
    "section": "experience",
    "field": "achievements"
  }
]

STAR Format:
- Situation: Context and challenge
- Task: What needed to be done
- Action: What you did
- Result: Quantifiable outcome

Make achievements specific, measurable, and impactful.`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title}\nFocus on achievements relevant to: ${jobData.requirements?.join(', ')}` : 'General achievement generation';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Generate STAR-format achievements:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Summary Builder
  static async buildTailoredSummary(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    const system = `You are a summary builder. Create a compelling, job-specific professional summary.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Tailored Summary",
    "content": "Professional summary tailored to the job",
    "type": "replacement",
    "section": "summary",
    "field": "summary"
  }
]

Guidelines:
- 2-3 sentences maximum
- Highlight most relevant experience and skills
- Include key achievements
- Match job requirements
- Professional and confident tone`;

    const cvText = this.extractCVText(cvData);
    const jobContext = jobData ? `Job: ${jobData.title} at ${jobData.company}\nRequirements: ${jobData.requirements?.join(', ')}\nSkills: ${jobData.skills?.join(', ')}` : 'General professional summary';

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Create a tailored professional summary:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Cover Letter Draft
  static async draftCoverLetter(cvData: CVData, jobData: Job | null): Promise<AISuggestion[]> {
    if (!jobData) {
      return [{
        id: 'no-job-context',
        title: 'No Job Context',
        content: 'Please select a job to generate a tailored cover letter.',
        type: 'addition',
        section: 'cover-letter',
        field: 'content',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      }];
    }

    const system = `You are a cover letter writer. Create a compelling, personalized cover letter for the specific job.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Cover Letter Draft",
    "content": "Complete cover letter content",
    "type": "replacement",
    "section": "cover-letter",
    "field": "content"
  }
]

Structure:
- Professional greeting
- Opening paragraph: interest and key qualification
- Body: relevant experience and achievements
- Closing: enthusiasm and call to action
- Professional sign-off

Keep it concise (3-4 paragraphs) and specific to the job.`;

    const cvText = this.extractCVText(cvData);
    const jobContext = `Job: ${jobData.title} at ${jobData.company}\nDescription: ${jobData.description}\nRequirements: ${jobData.requirements?.join(', ')}`;

    const prompt = `${system}

CV Content:
${cvText}

Job Context:
${jobContext}

Create a tailored cover letter:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Consistency & Compliance Checker
  static async checkConsistency(cvData: CVData): Promise<AISuggestion[]> {
    const system = `You are a CV consistency and compliance checker. Identify formatting and consistency issues.

Respond with ONLY valid JSON array in this format:
[
  {
    "id": "unique-id",
    "title": "Issue: [specific issue]",
    "content": "Detailed description and fix suggestion",
    "type": "improvement",
    "section": "formatting|consistency",
    "field": "specific area"
  }
]

Check for:
- Inconsistent date formats
- Mixed verb tenses
- Inconsistent bullet point styles
- Formatting inconsistencies
- ATS compliance issues
- Grammar and spelling`;

    const cvText = this.extractCVText(cvData);

    const prompt = `${system}

CV Content:
${cvText}

Identify consistency and compliance issues:`;

    const response = await this.callGeminiAPI(prompt);
    return JSON.parse(response);
  }

  // Helper method to call Gemini API
  private static async callGeminiAPI(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.3, 
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean possible code fences
    return text
      .replace(/```json[\s\S]*?\n/g, '')
      .replace(/```/g, '')
      .trim();
  }

  // Helper method to extract CV text for analysis
  private static extractCVText(cvData: CVData): string {
    let text = '';
    
    // Personal info
    text += `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName} `;
    text += cvData.personalInfo.summary || '';
    
    // Experience
    cvData.experience.forEach(exp => {
      text += `${exp.jobTitle} ${exp.company} ${exp.description || ''} `;
      exp.achievements?.forEach(achievement => {
        text += achievement + ' ';
      });
    });
    
    // Skills
    cvData.skills.forEach(skill => {
      text += skill.skills.join(' ') + ' ';
    });
    
    // Projects
    cvData.projects.forEach(project => {
      text += `${project.title} ${project.description || ''} `;
      text += project.technologies?.join(' ') || '';
    });
    
    // Education
    cvData.education.forEach(edu => {
      text += `${edu.degree} ${edu.institution} ${edu.field} ${edu.description || ''} `;
    });
    
    return text;
  }
}
