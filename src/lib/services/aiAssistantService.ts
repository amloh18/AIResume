import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';
import { AISuggestion } from '@/lib/stores/aiStore';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  strengths: string[];
  suggestions: string[];
}

export class AIAssistantService {
  // Section guidelines based on the image
  private static readonly SECTION_GUIDELINES = {
    contactInfo: {
      recommendedLength: '1-2 lines',
      keyFocus: 'Clarity, professional links (LinkedIn/GitHub)'
    },
    summary: {
      recommendedLength: '3-4 lines (~50-80 words)',
      keyFocus: 'High-level pitch, top skills, career goal'
    },
    workExperience: {
      recommendedLength: '3-5 bullet points per role',
      keyFocus: 'Quantified achievements, action verbs, results'
    },
    education: {
      recommendedLength: '1-2 lines per degree',
      keyFocus: 'Brevity, highest qualification first'
    },
    skills: {
      recommendedLength: 'Keyword list (~15-25 skills)',
      keyFocus: 'Categorized, relevant hard skills'
    },
    projects: {
      recommendedLength: '2-3 projects, 2-3 bullets each',
      keyFocus: 'Practical application, personal contribution, tech stack'
    },
    certificates: {
      recommendedLength: '1 line per item',
      keyFocus: 'Credibility, recognition'
    }
  };

  static async calculateATSScore(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<ATSAnalysis> {
    try {
      console.log('🔍 AIAssistantService - Starting ATS score calculation');
      
      // Extract text from CV
      const cvText = this.extractCVText(cvData);
      console.log('📄 AIAssistantService - CV text length:', cvText.length);
      
      if (!jobData) {
        console.log('📊 AIAssistantService - No job data, returning baseline score');
        // Baseline analysis without job context
        return {
          score: 75, // Baseline score
          missingKeywords: [],
          strengths: ['Professional experience', 'Education background'],
          suggestions: ['Add more specific skills', 'Include quantifiable achievements']
        };
      }

      // Extract job requirements
      const jobText = `${jobData.title || jobData.jobTitle} ${jobData.description} ${jobData.requirements}`;
      console.log('📄 AIAssistantService - Job text length:', jobText.length);
      
      // Simple keyword matching (in a real app, you'd use more sophisticated NLP)
      const cvKeywords = this.extractKeywords(cvText);
      const jobKeywords = this.extractKeywords(jobText);
      
      console.log('🔑 AIAssistantService - Keywords found:', {
        cvKeywords: cvKeywords.length,
        jobKeywords: jobKeywords.length
      });
      
      const matchingKeywords = cvKeywords.filter(keyword => 
        jobKeywords.some(jobKeyword => 
          jobKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(jobKeyword.toLowerCase())
        )
      );
      
      const score = Math.min(100, Math.round((matchingKeywords.length / jobKeywords.length) * 100));
      const missingKeywords = jobKeywords.filter(keyword => 
        !cvKeywords.some(cvKeyword => 
          cvKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(cvKeyword.toLowerCase())
        )
      );
      
      console.log('📊 AIAssistantService - ATS calculation results:', {
        matchingKeywords: matchingKeywords.length,
        missingKeywords: missingKeywords.length,
        score
      });
      
      return {
        score,
        missingKeywords: missingKeywords.slice(0, 10),
        strengths: matchingKeywords.slice(0, 5),
        suggestions: this.generateSuggestions(missingKeywords)
      };
    } catch (error) {
      console.error('ATS calculation error:', error);
      throw new Error('Failed to calculate ATS score');
    }
  }

  static async optimizeContent(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      // Analyze summary following guidelines
      const summaryGuidelines = this.SECTION_GUIDELINES.summary;
      if (!cvData.basics?.summary || cvData.basics.summary.length < 50) {
        suggestions.push({
          id: 'content-summary',
          title: 'Enhance Professional Summary',
          content: jobData ? 
            `Create a compelling summary (${summaryGuidelines.recommendedLength}) that highlights your experience relevant to ${jobData.title || jobData.jobTitle} at ${jobData.company}. Focus on ${summaryGuidelines.keyFocus}.` :
            `Expand your professional summary to ${summaryGuidelines.recommendedLength}. Focus on ${summaryGuidelines.keyFocus}.`,
          type: 'improvement',
          section: 'summary',
          field: 'summary',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      // Analyze work experience descriptions following guidelines
      const workGuidelines = this.SECTION_GUIDELINES.workExperience;
      if (cvData.work && cvData.work.length > 0) {
        cvData.work.forEach((work, index) => {
          if (!work.summary || work.summary.length < 50) {
            suggestions.push({
              id: `content-work-${index}`,
              title: `Enhance ${work.position} Description`,
              content: `Add more detail to your role at ${work.name}. Include specific responsibilities, achievements, and technologies used.`,
              type: 'improvement',
              section: 'work',
              field: index.toString(),
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          }
        });
      }
      
      // Check for action verbs
      const cvText = this.extractCVText(cvData);
      const actionVerbs = ['developed', 'implemented', 'managed', 'led', 'created', 'designed', 'optimized', 'increased', 'reduced'];
      const hasActionVerbs = actionVerbs.some(verb => cvText.toLowerCase().includes(verb));
      
      if (!hasActionVerbs) {
        suggestions.push({
          id: 'content-action-verbs',
          title: 'Use Strong Action Verbs',
          content: 'Replace passive language with strong action verbs like "developed", "implemented", "managed", "led", "created", "designed", "optimized", "increased", "reduced".',
          type: 'improvement',
          section: 'content',
          field: 'general',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Content optimization error:', error);
      throw new Error('Failed to optimize content');
    }
  }

  static async quantifyAchievements(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      // Analyze work experience for quantification opportunities
      if (cvData.work && cvData.work.length > 0) {
        cvData.work.forEach((work, index) => {
          const workText = `${work.summary} ${work.highlights?.join(' ') || ''}`;
          const hasQuantification = /\d+%|\d+x|\d+% increase|\d+% reduction|increased by|reduced by|improved by|grew by/.test(workText);
          
          if (!hasQuantification && work.summary) {
            suggestions.push({
              id: `quantify-work-${index}`,
              title: `Quantify ${work.position} Achievements`,
              content: `Add specific metrics to your role at ${work.name}. Examples: "increased efficiency by 25%", "reduced costs by $50K", "managed team of 10 people", "improved performance by 3x".`,
              type: 'improvement',
              section: 'work',
              field: index.toString(),
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          }
        });
      }
      
      // Check overall quantification
      const cvText = this.extractCVText(cvData);
      const hasQuantification = /\d+%|\d+x|\d+% increase|\d+% reduction|increased by|reduced by|improved by|grew by/.test(cvText);
      
      if (!hasQuantification) {
        suggestions.push({
          id: 'quantify-general',
          title: 'Add Quantifiable Achievements',
          content: 'Include specific metrics and numbers in your CV to make achievements more impactful. Examples: percentages, dollar amounts, team sizes, timeframes.',
          type: 'improvement',
          section: 'achievements',
          field: 'general',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Quantification error:', error);
      throw new Error('Failed to quantify achievements');
    }
  }

  static async mapSkillsAndKeywords(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      // Extract skills from job description and requirements
      const jobText = `${jobData.description} ${jobData.requirements || ''}`;
      const jobKeywords = this.extractKeywords(jobText);
      
      // Get current CV skills
      const cvSkills = this.extractSkillsFromCV(cvData);
      
      // Find missing skills
      const missingSkills = jobKeywords.filter(keyword => 
        !cvSkills.some(cvSkill => 
          cvSkill.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(cvSkill.toLowerCase())
        )
      );
      
      if (missingSkills.length > 0) {
        // Group skills by category
        const technicalSkills = missingSkills.filter(skill => 
          /javascript|python|java|react|node|sql|aws|docker|kubernetes|git|agile|scrum|typescript|angular|vue|php|ruby|go|rust|swift|kotlin|flutter|react native/i.test(skill)
        );
        const softSkills = missingSkills.filter(skill => 
          /leadership|communication|teamwork|problem-solving|analytical|creative|collaboration|project management|mentoring|presentation|negotiation/i.test(skill)
        );
        
        if (technicalSkills.length > 0) {
          suggestions.push({
            id: 'skills-technical',
            title: 'Add Technical Skills',
            content: `Technical skills to add: ${technicalSkills.slice(0, 8).join(', ')}`,
            type: 'addition',
            section: 'skills',
            field: 'Technical Skills',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
        
        if (softSkills.length > 0) {
          suggestions.push({
            id: 'skills-soft',
            title: 'Add Soft Skills',
            content: `Soft skills to add: ${softSkills.slice(0, 5).join(', ')}`,
            type: 'addition',
            section: 'skills',
            field: 'Soft Skills',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
      }
      
      // Check for skill level improvements
      if (cvSkills.length > 0) {
        suggestions.push({
          id: 'skills-level',
          title: 'Enhance Skill Descriptions',
          content: 'Consider adding proficiency levels (Beginner, Intermediate, Advanced, Expert) to your skills to better match job requirements.',
          type: 'improvement',
          section: 'skills',
          field: 'levels',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Skills mapping error:', error);
      throw new Error('Failed to map skills and keywords');
    }
  }

  static async analyzeGaps(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      // Simple gap analysis
      if (!cvData.work || cvData.work.length < 2) {
        suggestions.push({
          id: 'gap-1',
          title: 'Add More Experience',
          content: 'Consider adding more work experience to strengthen your profile.',
          type: 'addition',
          section: 'experience',
          field: 'work',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Gap analysis error:', error);
      throw new Error('Failed to analyze gaps');
    }
  }

  static async generateAchievements(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      if (cvData.work && cvData.work.length > 0) {
        suggestions.push({
          id: 'achievement-1',
          title: 'Add Achievement',
          content: '• Led a team of 5 developers to deliver project on time\n• Improved system performance by 30%\n• Reduced customer complaints by 25%',
          type: 'addition',
          section: 'achievements',
          field: '0',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Achievement generation error:', error);
      throw new Error('Failed to generate achievements');
    }
  }

  static async buildTailoredSummary(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      suggestions.push({
        id: 'summary-1',
        title: 'Tailored Summary',
        content: `Experienced professional with expertise in ${jobData.title.toLowerCase()} and related technologies. Proven track record of delivering results and driving innovation.`,
        type: 'replacement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
      
      return suggestions;
    } catch (error) {
      console.error('Summary building error:', error);
      throw new Error('Failed to build tailored summary');
    }
  }

  static async draftCoverLetter(cvData: UnifiedCVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      // Use the new cover letter generation API
      try {
        const response = await fetch('/api/ai/cover-letter-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData,
            recipientName: 'Hiring Manager',
            companyName: jobData.company
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.content) {
            suggestions.push({
              id: 'cover-letter-1',
              title: 'Cover Letter Draft',
              content: data.content,
              type: 'replacement',
              section: 'cover-letter',
              field: 'content',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
            return suggestions;
          }
        }
      } catch (apiError) {
        console.error('Cover letter API error:', apiError);
      }
      
      // Fallback to basic cover letter
      suggestions.push({
        id: 'cover-letter-1',
        title: 'Cover Letter Draft',
        content: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobData.title} position at ${jobData.company}. With my background in [relevant experience], I believe I would be a valuable addition to your team.\n\nSincerely,\n${cvData.basics.name}`,
        type: 'replacement',
        section: 'cover-letter',
        field: 'content',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
      
      return suggestions;
    } catch (error) {
      console.error('Cover letter drafting error:', error);
      throw new Error('Failed to draft cover letter');
    }
  }

  static async checkConsistency(cvData: UnifiedCVDataStructure): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      
      const suggestions: AISuggestion[] = [];
      
      // Simple consistency checks
      if (cvText.includes('I') || cvText.includes('me') || cvText.includes('my')) {
        suggestions.push({
          id: 'consistency-1',
          title: 'Use Third Person',
          content: 'Consider using third person instead of first person in your CV for a more professional tone.',
          type: 'improvement',
          section: 'consistency',
          field: 'tone',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Consistency check error:', error);
      throw new Error('Failed to check consistency');
    }
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      /^[a-z]+$/.test(word) &&
      !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );
    return Array.from(new Set(keywords)).slice(0, 20);
  }

  private static extractSkillsFromCV(cvData: UnifiedCVDataStructure): string[] {
    const skills: string[] = [];
    
    // Extract from skills section
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        if (skill.name) skills.push(skill.name);
        if (skill.keywords && Array.isArray(skill.keywords)) {
          skills.push(...skill.keywords);
        }
      });
    }
    
    // Extract from work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        const workText = `${work.position} ${work.summary} ${work.highlights?.join(' ') || ''}`;
        const workKeywords = this.extractKeywords(workText);
        skills.push(...workKeywords);
      });
    }
    
    // Extract from education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvData.education.forEach(edu => {
        const eduText = `${edu.area} ${edu.studyType} ${edu.courses?.join(' ') || ''}`;
        const eduKeywords = this.extractKeywords(eduText);
        skills.push(...eduKeywords);
      });
    }
    
    return [...new Set(skills)];
  }

  private static generateSuggestions(missingKeywords: string[]): string[] {
    return [
      'Add missing keywords to your skills section',
      'Include relevant experience that demonstrates these skills',
      'Consider taking courses to develop missing skills'
    ];
  }

  private static extractCVText(cvData: UnifiedCVDataStructure): string {
    let text = '';
    
    // Add basic information
    text += `${cvData.basics.name} `;
    text += cvData.basics.summary || '';
    
    // Add work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        text += `${work.position} ${work.name} ${work.summary} `;
        if (work.highlights && Array.isArray(work.highlights)) {
          text += work.highlights.join(' ');
        }
      });
    }
    
    // Add skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        text += `${skill.name} `;
        if (skill.keywords && Array.isArray(skill.keywords)) {
          text += skill.keywords.join(' ');
        }
      });
    }
    
    // Add projects
    if (cvData.projects && Array.isArray(cvData.projects)) {
      cvData.projects.forEach(project => {
        text += `${project.name} ${project.description} `;
      });
    }
    
    // Add education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvData.education.forEach(edu => {
        text += `${edu.institution} ${edu.studyType} ${edu.area} `;
      });
    }
    
    return text;
  }

  static async performComprehensiveAnalysis(cvData: UnifiedCVDataStructure, jobData: Job): Promise<any> {
    try {
      console.log('🔍 AIAssistantService - Starting comprehensive analysis...');
      console.log('📊 AIAssistantService - Job data:', {
        id: jobData.id,
        title: jobData.title || jobData.jobTitle,
        company: jobData.company
      });
      
      // Try the new comprehensive ATS analysis API first
      try {
        console.log('🌐 AIAssistantService - Attempting new comprehensive ATS analysis API...');
        const response = await fetch('/api/ai/comprehensive-ats-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData
          }),
        });

        console.log('📡 AIAssistantService - API response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('📄 AIAssistantService - API response:', result);
          
          if (result.success) {
            console.log('✅ AIAssistantService - Comprehensive ATS analysis completed via API');
            return result.data;
          }
        }
      } catch (apiError) {
        console.log('⚠️ AIAssistantService - New API failed, trying legacy API:', apiError);
      }

      // Try the legacy comprehensive analysis API
      try {
        console.log('🌐 AIAssistantService - Attempting legacy API call...');
        const response = await fetch('/api/ai/comprehensive-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData
          }),
        });

        console.log('📡 AIAssistantService - Legacy API response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('📄 AIAssistantService - Legacy API response:', result);
          
          if (result.success) {
            console.log('✅ AIAssistantService - Comprehensive analysis completed via legacy API');
            return result.data;
          }
        }
      } catch (apiError) {
        console.log('⚠️ AIAssistantService - Legacy API failed, falling back to local analysis:', apiError);
      }

      // Fallback to local analysis when API is not available
      console.log('🔄 AIAssistantService - Using local analysis fallback');
      
      console.log('🔧 AIAssistantService - Running local analysis methods...');
      const [contentOptimizer, quantification, skillsMapper, gapAnalyzer, achievementGenerator] = await Promise.all([
        this.optimizeContent(cvData, jobData),
        this.quantifyAchievements(cvData, jobData),
        this.mapSkillsAndKeywords(cvData, jobData),
        this.analyzeGaps(cvData, jobData),
        this.generateAchievements(cvData, jobData)
      ]);
      
      console.log('📊 AIAssistantService - Local analysis results:', {
        contentOptimizer: contentOptimizer.length,
        quantification: quantification.length,
        skillsMapper: skillsMapper.length,
        gapAnalyzer: gapAnalyzer.length,
        achievementGenerator: achievementGenerator.length
      });

      // Create comprehensive analysis structure
      const comprehensiveAnalysis = {
        ATSScoreAndKeywords: {
          score: 75, // Default score
          missingKeywords: [],
          matchedKeywords: [],
          relevanceSummary: "Analysis based on local processing"
        },
        ContentOptimizer: {
          improvements: contentOptimizer.map(s => s.content),
          toneAndClarity: "Content analysis completed",
          redundancies: []
        },
        QuantificationAssistant: {
          recommendations: quantification.map(s => s.content),
          examples: []
        },
        SkillsAndKeywordsMapper: {
          cvSkills: [],
          jobRequiredSkills: [],
          overlap: [],
          gaps: skillsMapper.filter(s => s.content.includes('Skills to add')).map(s => 
            s.content.replace('Skills to add: ', '').split(', ')
          ).flat()
        },
        GapAnalyzer: {
          experienceGaps: [],
          skillGaps: gapAnalyzer.filter(s => s.content.includes('Areas to develop')).map(s => 
            s.content.replace('Areas to develop: ', '').split(', ')
          ).flat(),
          educationGaps: []
        },
        AchievementGenerator: {
          enhancedAchievements: achievementGenerator.map(s => s.content),
          impactStatements: []
        },
        ConsistencyAndCompliance: {
          formatIssues: [],
          complianceIssues: []
        },
        TailoredSummaryBuilder: {
          optimizedSummary: cvData.basics?.summary || "Professional summary",
          elevatorPitch: "Tailored summary based on local analysis"
        },
        FinalATSScore: {
          score: 75,
          summary: "Local analysis completed"
        }
      };

      console.log('✅ AIAssistantService - Local analysis completed');
      return comprehensiveAnalysis;
      
    } catch (error) {
      console.error('❌ AIAssistantService - Analysis error:', error);
      throw new Error('Failed to perform analysis');
    }
  }

  /**
   * Generate AI suggestions following section guidelines
   */
  static async generateSectionSuggestions(
    section: keyof typeof AIAssistantService.SECTION_GUIDELINES,
    cvData: UnifiedCVDataStructure,
    jobData: Job | null
  ): Promise<AISuggestion[]> {
    const guidelines = this.SECTION_GUIDELINES[section];
    const suggestions: AISuggestion[] = [];

    switch (section) {
      case 'summary':
        suggestions.push(...await this.generateSummarySuggestions(cvData, jobData, guidelines));
        break;
      case 'workExperience':
        suggestions.push(...await this.generateWorkExperienceSuggestions(cvData, jobData, guidelines));
        break;
      case 'skills':
        suggestions.push(...await this.generateSkillsSuggestions(cvData, jobData, guidelines));
        break;
      case 'projects':
        suggestions.push(...await this.generateProjectsSuggestions(cvData, jobData, guidelines));
        break;
      case 'education':
        suggestions.push(...await this.generateEducationSuggestions(cvData, jobData, guidelines));
        break;
      case 'certificates':
        suggestions.push(...await this.generateCertificatesSuggestions(cvData, jobData, guidelines));
        break;
    }

    return suggestions;
  }

  /**
   * Generate summary suggestions following guidelines
   */
  private static async generateSummarySuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const summary = cvData.basics?.summary || '';
    const wordCount = summary.split(/\s+/).length;

    if (wordCount < 30) {
      suggestions.push({
        id: 'summary-too-short',
        title: 'Expand Professional Summary',
        content: `Your summary is too brief. Aim for ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (wordCount > 100) {
      suggestions.push({
        id: 'summary-too-long',
        title: 'Condense Professional Summary',
        content: `Your summary is too long. Keep it to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate work experience suggestions following guidelines
   */
  private static async generateWorkExperienceSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    if (cvData.work && cvData.work.length > 0) {
      cvData.work.forEach((work, index) => {
        const highlights = work.highlights || [];
        
        if (highlights.length < 3) {
          suggestions.push({
            id: `work-${index}-few-bullets`,
            title: `Add More Bullet Points to ${work.position || 'Work Experience'}`,
            content: `Add ${guidelines.recommendedLength} for this role. Focus on ${guidelines.keyFocus}.`,
            type: 'improvement',
            section: 'work',
            field: `work.${index}.highlights`,
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }

        if (highlights.length > 5) {
          suggestions.push({
            id: `work-${index}-too-many-bullets`,
            title: `Condense Bullet Points for ${work.position || 'Work Experience'}`,
            content: `Reduce to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
            type: 'improvement',
            section: 'work',
            field: `work.${index}.highlights`,
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate skills suggestions following guidelines
   */
  private static async generateSkillsSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const skills = cvData.skills || [];
    const totalKeywords = skills.reduce((acc, skill) => acc + (skill.keywords?.length || 0), 0);

    if (totalKeywords < 10) {
      suggestions.push({
        id: 'skills-too-few',
        title: 'Add More Skills',
        content: `Include ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'skills',
        field: 'skills',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (totalKeywords > 30) {
      suggestions.push({
        id: 'skills-too-many',
        title: 'Streamline Skills List',
        content: `Reduce to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'skills',
        field: 'skills',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate projects suggestions following guidelines
   */
  private static async generateProjectsSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const projects = cvData.projects || [];

    if (projects.length < 2) {
      suggestions.push({
        id: 'projects-too-few',
        title: 'Add More Projects',
        content: `Include ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'projects',
        field: 'projects',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (projects.length > 4) {
      suggestions.push({
        id: 'projects-too-many',
        title: 'Limit Projects',
        content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'projects',
        field: 'projects',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate education suggestions following guidelines
   */
  private static async generateEducationSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const education = cvData.education || [];

    education.forEach((edu, index) => {
      const description = `${edu.institution} ${edu.area} ${edu.studyType}`.trim();
      if (description.length > 100) {
        suggestions.push({
          id: `education-${index}-too-long`,
          title: 'Condense Education Entry',
          content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
          type: 'improvement',
          section: 'education',
          field: `education.${index}`,
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate certificates suggestions following guidelines
   */
  private static async generateCertificatesSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const certificates = cvData.certificates || [];

    certificates.forEach((cert, index) => {
      const description = `${cert.name} ${cert.issuer}`.trim();
      if (description.length > 80) {
        suggestions.push({
          id: `certificate-${index}-too-long`,
          title: 'Condense Certificate Entry',
          content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
          type: 'improvement',
          section: 'certificates',
          field: `certificates.${index}`,
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
    });

    return suggestions;
  }

  // AI Content Improvement Methods - Updated with new prompting strategy
  static async improveSummary(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'summary',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      // Fallback to local processing
      return this.processLocally(`Improve summary: ${currentText}`);
    } catch (error) {
      console.error('Error improving summary:', error);
      return currentText;
    }
  }

  static async improveDescription(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'workExperience',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      // Fallback to local processing
      return this.processLocally(`Improve description: ${currentText}`);
    } catch (error) {
      console.error('Error improving description:', error);
      return currentText;
    }
  }

  static async improveHighlights(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'workExperience',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      // Fallback to local processing
      return this.processLocally(`Improve highlights: ${currentText}`);
    } catch (error) {
      console.error('Error improving highlights:', error);
      return currentText;
    }
  }

  static async improveAchievements(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const prompt = `Improve these achievements to be more quantifiable:

Current Achievements: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- Add specific numbers, percentages, metrics
- Focus on measurable impact
- Use strong action verbs
- Include timeframes where relevant
- Make achievements more concrete

Return only the improved achievements text.`;

      const response = await this.callAI(prompt);
      return response || currentText;
    } catch (error) {
      console.error('Error improving achievements:', error);
      return currentText;
    }
  }

  static async improveSkills(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const prompt = `Improve this skills section:

Current Skills: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- 15-25 relevant hard skills
- Categorized by type (Technical, Soft Skills, Tools, etc.)
- Include job-relevant keywords
- Remove outdated or irrelevant skills
- Add missing skills from job requirements

Return only the improved skills list.`;

      const response = await this.callAI(prompt);
      return response || currentText;
    } catch (error) {
      console.error('Error improving skills:', error);
      return currentText;
    }
  }

  static async improveProjectDescription(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const prompt = `Improve this project description:

Current Description: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- Focus on practical application
- Include personal contribution
- Mention tech stack and technologies
- Quantify impact where possible
- Keep it concise but informative

Return only the improved project description.`;

      const response = await this.callAI(prompt);
      return response || currentText;
    } catch (error) {
      console.error('Error improving project description:', error);
      return currentText;
    }
  }

  static async improveContent(currentText: string, fieldType: string, cvData: any, jobData: any): Promise<string> {
    try {
      const prompt = `Improve this ${fieldType} content:

Current Content: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Make it more professional, impactful, and relevant to the job context.

Return only the improved content.`;

      const response = await this.callAI(prompt);
      return response || currentText;
    } catch (error) {
      console.error('Error improving content:', error);
      return currentText;
    }
  }

  private static async callAI(prompt: string): Promise<string> {
    try {
      // Use the new improve-content API
      const response = await fetch('/api/ai/improve-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          cvData: {},
          jobData: null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      // Fallback to local processing
      return this.processLocally(prompt);
    } catch (error) {
      console.error('AI API call failed:', error);
      return this.processLocally(prompt);
    }
  }

  private static processLocally(prompt: string): string {
    // Simple local processing as fallback
    // In a real implementation, this would use a local AI model or basic text processing
    console.log('Processing locally:', prompt);
    
    // Return a basic improvement suggestion
    return prompt.includes('summary') ? 
      'Experienced professional with proven track record of delivering results...' :
      prompt.includes('description') ?
      'Led cross-functional teams to deliver high-impact solutions...' :
      prompt.includes('highlights') ?
      '• Increased efficiency by 25% through process optimization\n• Managed team of 5 developers\n• Delivered project 2 weeks ahead of schedule' :
      'Improved content based on best practices...';
  }
}
