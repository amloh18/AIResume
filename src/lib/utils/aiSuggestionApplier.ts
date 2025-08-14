import { CVData } from '@/lib/stores/cvStore';
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
    cvData: CVData, 
    onUpdateField: (path: string, value: any) => void
  ): SuggestionApplicationResult {
    try {
      const updatedFields: string[] = [];

      switch (suggestion.section) {
        case 'summary':
          if (suggestion.field === 'summary') {
            onUpdateField('personalInfo.summary', suggestion.content);
            updatedFields.push('personalInfo.summary');
          }
          break;

        case 'skills':
          this.applySkillsSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'experience':
          this.applyExperienceSuggestion(suggestion, cvData, onUpdateField, updatedFields);
          break;

        case 'achievements':
          this.applyAchievementSuggestion(suggestion, cvData, onUpdateField, updatedFields);
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
    cvData: CVData,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'addition') {
      // Add new skills to existing category or create new category
      const category = suggestion.field || 'Technical Skills';
      const existingCategory = cvData.skills.find(s => s.category === category);
      
      if (existingCategory) {
        // Extract skills from suggestion content
        const newSkills = this.extractSkillsFromText(suggestion.content);
        const updatedSkills = [...existingCategory.skills, ...newSkills.filter(skill => !existingCategory.skills.includes(skill))];
        onUpdateField(`skills.${existingCategory.id}.skills`, updatedSkills);
        updatedFields.push(`skills.${existingCategory.id}.skills`);
      } else {
        // Create new skills category
        const newSkills = this.extractSkillsFromText(suggestion.content);
        const newCategory = {
          id: Date.now().toString(),
          category,
          skills: newSkills
        };
        onUpdateField('skills', [...cvData.skills, newCategory]);
        updatedFields.push('skills');
      }
    } else if (suggestion.type === 'improvement') {
      // Improve existing skills section
      const category = suggestion.field;
      if (category) {
        const existingCategory = cvData.skills.find(s => s.category === category);
        if (existingCategory) {
          const improvedSkills = this.extractSkillsFromText(suggestion.content);
          onUpdateField(`skills.${existingCategory.id}.skills`, improvedSkills);
          updatedFields.push(`skills.${existingCategory.id}.skills`);
        }
      }
    }
  }

  /**
   * Apply experience-related suggestions
   */
  private static applyExperienceSuggestion(
    suggestion: AISuggestion,
    cvData: CVData,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'improvement' && suggestion.field) {
      // Find the experience entry to update
      const experienceIndex = cvData.experience.findIndex(exp => 
        exp.jobTitle.toLowerCase().includes(suggestion.field!.toLowerCase()) ||
        exp.company.toLowerCase().includes(suggestion.field!.toLowerCase())
      );

      if (experienceIndex !== -1) {
        const experience = cvData.experience[experienceIndex];
        if (suggestion.content.includes('description')) {
          onUpdateField(`experience.${experienceIndex}.description`, suggestion.content);
          updatedFields.push(`experience.${experienceIndex}.description`);
        } else if (suggestion.content.includes('achievement')) {
          // Add as new achievement
          const newAchievements = [...experience.achievements, suggestion.content];
          onUpdateField(`experience.${experienceIndex}.achievements`, newAchievements);
          updatedFields.push(`experience.${experienceIndex}.achievements`);
        }
      }
    }
  }

  /**
   * Apply achievement-related suggestions
   */
  private static applyAchievementSuggestion(
    suggestion: AISuggestion,
    cvData: CVData,
    onUpdateField: (path: string, value: any) => void,
    updatedFields: string[]
  ) {
    if (suggestion.type === 'improvement' && suggestion.field) {
      // Find the experience entry to add achievement to
      const experienceIndex = cvData.experience.findIndex(exp => 
        exp.jobTitle.toLowerCase().includes(suggestion.field!.toLowerCase()) ||
        exp.company.toLowerCase().includes(suggestion.field!.toLowerCase())
      );

      if (experienceIndex !== -1) {
        const experience = cvData.experience[experienceIndex];
        const newAchievements = [...experience.achievements, suggestion.content];
        onUpdateField(`experience.${experienceIndex}.achievements`, newAchievements);
        updatedFields.push(`experience.${experienceIndex}.achievements`);
      }
    }
  }

  /**
   * Extract skills from text content
   */
  private static extractSkillsFromText(text: string): string[] {
    // Common skill patterns
    const skillPatterns = [
      /\b[A-Z][a-z]+(?:\.[A-Z][a-z]+)*\b/g, // Capitalized words
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g // Multi-word skills
    ];

    const skills = new Set<string>();
    
    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        // Filter out common non-skill words
        const nonSkills = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'];
        if (!nonSkills.includes(match.toLowerCase()) && match.length > 2) {
          skills.add(match);
        }
      });
    });

    return Array.from(skills);
  }

  /**
   * Validate if a suggestion can be applied
   */
  static canApplySuggestion(suggestion: AISuggestion, cvData: CVData): boolean {
    switch (suggestion.section) {
      case 'summary':
        return true; // Always can apply to summary
      
      case 'skills':
        return true; // Always can apply to skills
      
      case 'experience':
        return cvData.experience.length > 0;
      
      case 'achievements':
        return cvData.experience.length > 0;
      
      case 'cover-letter':
        return true; // Always can apply to cover letter
      
      default:
        return false;
    }
  }
}
