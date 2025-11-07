export interface AIRequest {
  prompt: string;
  context?: string;
  type: 'rewrite' | 'optimize' | 'suggest' | 'generate';
  section?: string;
  provider?: 'gemini' | 'auto';
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  details?: string;
  type?: string;
  section?: string;
  provider?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  status: string;
}

export class AIService {
  private static geminiUrl = '/api/ai/gemini';

  static async generateContent(request: AIRequest): Promise<AIResponse> {
    const { provider = 'auto', ...requestData } = request;

    // Always use Gemini (auto defaults to Gemini)
    if (provider === 'auto' || provider === 'gemini') {
      return await this.callGemini(requestData);
    }

    return {
      success: false,
      error: 'Invalid provider specified',
      details: 'Provider must be gemini or auto'
    };
  }

  private static async callGemini(request: Omit<AIRequest, 'provider'>): Promise<AIResponse> {
    try {
      const response = await fetch(this.geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to generate content',
          details: data.details || 'Unknown error occurred',
          provider: 'gemini'
        };
      }

      return {
        success: true,
        content: data.content,
        type: data.type,
        section: data.section,
        provider: 'gemini'
      };
    } catch (error) {
      console.error('Gemini Service error:', error);
      return {
        success: false,
        error: 'Network error',
        details: 'Failed to connect to Gemini service',
        provider: 'gemini'
      };
    }
  }


  static async rewriteContent(content: string, section?: string, provider?: 'gemini' | 'auto'): Promise<AIResponse> {
    return this.generateContent({
      prompt: content,
      type: 'rewrite',
      section,
      provider
    });
  }

  static async optimizeContent(content: string, section?: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    return this.generateContent({
      prompt: content,
      type: 'optimize',
      section,
      provider
    });
  }

  static async suggestImprovements(content: string, section?: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    return this.generateContent({
      prompt: content,
      type: 'suggest',
      section,
      provider
    });
  }

  static async generateNewContent(prompt: string, context?: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    return this.generateContent({
      prompt,
      context,
      type: 'generate',
      provider
    });
  }

  // CV-specific AI helpers
  static async generateProfessionalSummary(role: string, experience: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Generate a professional summary for a ${role} with ${experience} of experience.`;
    return this.generateNewContent(prompt, `Role: ${role}, Experience: ${experience}`, provider);
  }

  static async generateAchievements(role: string, company: string, responsibilities: string[], provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Generate 3-5 quantifiable achievements for a ${role} position at ${company}.`;
    const context = `Responsibilities: ${responsibilities.join(', ')}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async optimizeForATS(content: string, jobTitle: string, keywords: string[], provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Optimize this content for ATS systems targeting a ${jobTitle} position.`;
    const context = `Keywords to include: ${keywords.join(', ')}\n\nContent: ${content}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async generateSkillsDescription(skill: string, level: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Write a professional description for ${skill} at ${level} level.`;
    return this.generateNewContent(prompt, undefined, provider);
  }

  static async generateCoverLetter(jobTitle: string, company: string, experience: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Generate a professional cover letter for a ${jobTitle} position at ${company}.`;
    const context = `Candidate experience: ${experience}`;
    return this.generateNewContent(prompt, context, provider);
  }

  // Job-specific tailoring methods
  static async extractJobKeywords(jobDescription: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Extract the most important keywords and skills from this job description for ATS optimization. Return them as a comma-separated list.`;
    return this.generateNewContent(prompt, jobDescription, provider);
  }

  static async tailorContentForJob(content: string, job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Tailor the following content to match the job requirements and company culture. Make it more relevant and compelling for this specific position.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}\n\nContent to tailor: ${content}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async generateJobSpecificCoverLetter(job: Job, candidateExperience: string, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Write a compelling cover letter specifically tailored for this job position.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}\nCandidate Experience: ${candidateExperience}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async alignExperienceWithJob(experience: string, job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Rewrite this experience to better align with the job requirements and highlight relevant skills and achievements.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}\n\nExperience to align: ${experience}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async optimizeSkillsForJob(skills: string, job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Optimize and reorder these skills to match the job requirements and prioritize the most relevant ones.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}\n\nSkills to optimize: ${skills}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async generateJobSpecificSummary(role: string, experience: string, job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Write a professional summary specifically tailored for this job position.`;
    const context = `Role: ${role}\nExperience: ${experience}\nJob Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async analyzeJobRequirements(job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Analyze this job description and provide insights on key requirements, preferred qualifications, and what the company is looking for in a candidate.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}`;
    return this.generateNewContent(prompt, context, provider);
  }

  static async suggestImprovementsForJob(content: string, job: Job, provider?: 'gemini' | 'perplexity' | 'auto'): Promise<AIResponse> {
    const prompt = `Analyze this content against the job requirements and provide specific suggestions for improvement to make it more relevant and compelling.`;
    const context = `Job Title: ${job.title}\nCompany: ${job.company}\nJob Description: ${job.description || 'No description provided'}\n\nContent to analyze: ${content}`;
    return this.generateNewContent(prompt, context, provider);
  }

  // Provider status check
  static async checkProviderStatus(provider: 'gemini'): Promise<{ available: boolean; error?: string }> {
    try {
      const url = this.geminiUrl;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test',
          type: 'generate'
        }),
      });

      return {
        available: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 