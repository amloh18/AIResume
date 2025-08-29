import { CVDataStructure } from '@/types/cv';
import { AISuggestion } from '@/lib/stores/aiStore';

export interface SuggestionApplicationResult {
  success: boolean;
  message: string;
  updatedFields: string[];
}

export class AISuggestionApplier {
  /**
   * Apply an AI suggestion to the CV data
   */
  static applySuggestion(
    suggestion: AISuggestion, 
    cvData: CVDataStructure, 
    onUpdateField: (path: string, value: any) => void
  ): SuggestionApplicationResult {
    try {
      const updatedFields: string[] = [];

      switch (suggestion.section) {
        case 'summary':
          if (suggestion.field === 'summary') {
            onUpdateField('basics.summary', suggestion.content);
            updatedFields.push('basics.summary');
          }
          break;

        case 'skills':
          this.applySkillsSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'work':
          this.applyWorkSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'experience':
          this.applyExperienceSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'achievements':
          this.applyAchievementSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'content':
          this.applyContentSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'cover-letter':
          // For cover letter mode, this would update the cover letter content
          if (suggestion.field === 'content') {
            // This would need to be handled by the cover letter store
            updatedFields.push('coverLetter.content');
          }
          break;

        default:
          return {
            success: false,
            message: `Unknown section: ${suggestion.section}`,
            updatedFields: []
          };
      }

      return {
        success: true,
        message: `Successfully applied suggestion to ${suggestion.section}`,
        updatedFields
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to apply suggestion',
        updatedFields: []
      };
    }
  }

  /**
   * Apply skills-related suggestions
   */
  private static applySkillsSuggestion(
    suggestion: AISuggestion,
    cvData: CVDataStructure,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'addition') {
      // Add new skills to existing category or create new category
      const categoryName = suggestion.field || 'Technical Skills';
      const existingCategory = cvData.skills.find(s => s.name === categoryName);
      
      if (existingCategory) {
        // Extract skills from suggestion content
        const newSkills = this.extractSkillsFromText(suggestion.content);
        const updatedKeywords = [...existingCategory.keywords, ...newSkills.filter(skill => !existingCategory.keywords.includes(skill))];
        const categoryIndex = cvData.skills.findIndex(s => s.name === categoryName);
        onUpdateField(`skills.${categoryIndex}.keywords`, updatedKeywords);
        updatedFields.push(`skills.${categoryIndex}.keywords`);
      } else {
        // Create new skills category
        const newSkills = this.extractSkillsFromText(suggestion.content);
        const newCategory = {
          name: categoryName,
          level: '',
          keywords: newSkills
        };
        onUpdateField('skills', [...cvData.skills, newCategory]);
        updatedFields.push('skills');
      }
    } else if (suggestion.type === 'replacement') {
      // Replace existing skills with new ones
      const newSkills = this.extractSkillsFromText(suggestion.content);
      const categoryName = suggestion.field || 'Technical Skills';
      const existingCategoryIndex = cvData.skills.findIndex(s => s.name === categoryName);
      
      if (existingCategoryIndex !== -1) {
        onUpdateField(`skills.${existingCategoryIndex}.keywords`, newSkills);
        updatedFields.push(`skills.${existingCategoryIndex}.keywords`);
      } else {
        // Create new category if it doesn't exist
        const newCategory = {
          name: categoryName,
          level: '',
          keywords: newSkills
        };
        onUpdateField('skills', [...cvData.skills, newCategory]);
        updatedFields.push('skills');
      }
    }
  }

  /**
   * Apply experience-related suggestions
   */
  private static applyExperienceSuggestion(
    suggestion: AISuggestion,
    cvData: CVDataStructure,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'addition') {
      // Add new work experience
      const newWork = this.parseWorkExperience(suggestion.content);
      onUpdateField('work', [...cvData.work, newWork]);
      updatedFields.push('work');
    } else if (suggestion.type === 'replacement') {
      // Replace specific work experience
      const workIndex = parseInt(suggestion.field || '0');
      if (workIndex >= 0 && workIndex < cvData.work.length) {
        const updatedWork = this.parseWorkExperience(suggestion.content);
        onUpdateField(`work.${workIndex}`, updatedWork);
        updatedFields.push(`work.${workIndex}`);
      }
    }
  }

  /**
   * Apply work-related suggestions
   */
  private static applyWorkSuggestion(
    suggestion: AISuggestion,
    cvData: CVDataStructure,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'improvement') {
      const workIndex = parseInt(suggestion.field || '0');
      if (workIndex >= 0 && workIndex < cvData.work.length) {
        // Update work description
        onUpdateField(`work.${workIndex}.summary`, suggestion.content);
        updatedFields.push(`work.${workIndex}.summary`);
      }
    } else if (suggestion.type === 'addition') {
      // Add new work experience
      const newWork = this.parseWorkExperience(suggestion.content);
      onUpdateField('work', [...cvData.work, newWork]);
      updatedFields.push('work');
    }
  }

  /**
   * Apply content-related suggestions
   */
  private static applyContentSuggestion(
    suggestion: AISuggestion,
    cvData: CVDataStructure,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.field === 'general') {
      // For general content improvements, we might want to show a toast or notification
      // rather than directly applying changes
      console.log('Content improvement suggestion:', suggestion.content);
    }
  }

  /**
   * Apply achievement-related suggestions
   */
  private static applyAchievementSuggestion(
    suggestion: AISuggestion,
    cvData: CVDataStructure,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'addition') {
      // Add achievements to specific work experience
      const workIndex = parseInt(suggestion.field || '0');
      if (workIndex >= 0 && workIndex < cvData.work.length) {
        const newAchievements = this.extractAchievementsFromText(suggestion.content);
        const currentWork = cvData.work[workIndex];
        const updatedHighlights = [...(currentWork.highlights || []), ...newAchievements];
        onUpdateField(`work.${workIndex}.highlights`, updatedHighlights);
        updatedFields.push(`work.${workIndex}.highlights`);
      }
    }
  }

  /**
   * Extract skills from text content
   */
  private static extractSkillsFromText(content: string): string[] {
    // Simple extraction - in a real app, you'd use more sophisticated NLP
    const lines = content.split('\n').filter(line => line.trim());
    const skills: string[] = [];
    
    for (const line of lines) {
      // Look for bullet points or comma-separated skills
      const skillMatch = line.match(/[•\-\*]\s*([^,]+)|([^,]+)/);
      if (skillMatch) {
        const skill = skillMatch[1] || skillMatch[2];
        if (skill && skill.trim().length > 0) {
          skills.push(skill.trim());
        }
      }
    }
    
    return skills.length > 0 ? skills : [content.trim()];
  }

  /**
   * Parse work experience from text
   */
  private static parseWorkExperience(content: string) {
    // Simple parsing - in a real app, you'd use more sophisticated NLP
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      name: 'Company Name',
      position: 'Job Title',
      url: '',
      startDate: '',
      endDate: '',
      summary: content,
      highlights: []
    };
  }

  /**
   * Extract achievements from text
   */
  private static extractAchievementsFromText(content: string): string[] {
    // Simple extraction - in a real app, you'd use more sophisticated NLP
    const lines = content.split('\n').filter(line => line.trim());
    const achievements: string[] = [];
    
    for (const line of lines) {
      // Look for bullet points
      const achievementMatch = line.match(/[•\-\*]\s*(.+)/);
      if (achievementMatch) {
        achievements.push(achievementMatch[1].trim());
      } else if (line.trim().length > 0) {
        achievements.push(line.trim());
      }
    }
    
    return achievements.length > 0 ? achievements : [content.trim()];
  }
}
