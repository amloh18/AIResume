import { CVDataStructure } from '@/types/cv';
import { Job } from '@/lib/stores/jobStore';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  suggestedSkills: string[];
  recommendations: string[];
}

export interface AIImprovement {
  improvedText: string;
  changes: string[];
}

export class AIService {
  // Mock ATS score calculation
  static async calculateATSScore(cvData: CVDataStructure, jobData: Job | null): Promise<ATSAnalysis> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let score = 100;
    const missingKeywords: string[] = [];
    const suggestedSkills: string[] = [];
    const recommendations: string[] = [];
    
    // Basic field validation
    if (!cvData.basics.name) {
      score -= 20;
      recommendations.push('Add your full name');
    }
    
    if (!cvData.basics.email) {
      score -= 15;
      recommendations.push('Add your email address');
    }
    
    if (!cvData.basics.summary) {
      score -= 10;
      recommendations.push('Add a professional summary');
    }
    
    if (!cvData.work || cvData.work.length === 0) {
      score -= 25;
      recommendations.push('Add work experience');
    }
    
    if (!cvData.education || cvData.education.length === 0) {
      score -= 15;
      recommendations.push('Add education information');
    }
    
    if (!cvData.skills || cvData.skills.length === 0) {
      score -= 15;
      recommendations.push('Add relevant skills');
    }
    
    // Mock job-specific analysis
    if (jobData) {
      const jobKeywords = this.extractKeywords(jobData.description || '');
      const cvText = this.extractCVText(cvData);
      
      jobKeywords.forEach(keyword => {
        if (!cvText.toLowerCase().includes(keyword.toLowerCase())) {
          missingKeywords.push(keyword);
          score -= 2;
        }
      });
      
      // Mock suggested skills based on job
      if (jobData.title?.toLowerCase().includes('developer')) {
        suggestedSkills.push('JavaScript', 'React', 'Node.js', 'Git');
      } else if (jobData.title?.toLowerCase().includes('designer')) {
        suggestedSkills.push('Figma', 'Adobe Creative Suite', 'UI/UX', 'Prototyping');
      } else if (jobData.title?.toLowerCase().includes('manager')) {
        suggestedSkills.push('Leadership', 'Project Management', 'Agile', 'Team Management');
      }
    }
    
    return {
      score: Math.max(0, score),
      missingKeywords,
      suggestedSkills,
      recommendations
    };
  }
  
  // Mock description improvement
  static async improveDescription(
    currentText: string, 
    jobData: Job | null, 
    cvData: CVDataStructure
  ): Promise<AIImprovement> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock improvement logic
    let improvedText = currentText;
    const changes: string[] = [];
    
    if (jobData) {
      // Add job-specific keywords
      const jobKeywords = this.extractKeywords(jobData.description || '');
      jobKeywords.slice(0, 3).forEach(keyword => {
        if (!improvedText.toLowerCase().includes(keyword.toLowerCase())) {
          improvedText += ` Experienced in ${keyword}.`;
          changes.push(`Added keyword: ${keyword}`);
        }
      });
    }
    
    // Add action verbs if missing
    const actionVerbs = ['developed', 'implemented', 'managed', 'led', 'created', 'designed'];
    const hasActionVerbs = actionVerbs.some(verb => improvedText.toLowerCase().includes(verb));
    
    if (!hasActionVerbs) {
      improvedText = `Successfully ${improvedText}`;
      changes.push('Added action verb for impact');
    }
    
    // Add quantifiable results if missing
    if (!improvedText.match(/\d+/)) {
      improvedText += ' Achieved measurable results and improved efficiency by 25%.';
      changes.push('Added quantifiable results');
    }
    
    return {
      improvedText,
      changes
    };
  }
  
  // Mock keyword extraction
  private static extractKeywords(text: string): string[] {
    const commonKeywords = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Docker',
      'Agile', 'Scrum', 'Git', 'REST API', 'TypeScript', 'MongoDB', 'PostgreSQL',
      'Leadership', 'Project Management', 'Team Management', 'Communication',
      'UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research'
    ];
    
    return commonKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  // Mock CV text extraction
  private static extractCVText(cvData: CVDataStructure): string {
    let text = '';
    
    // Personal info
    text += `${cvData.basics.name} `;
    text += cvData.basics.summary || '';
    
    // Experience
    cvData.work?.forEach(exp => {
      text += `${exp.position} ${exp.company} ${exp.description || ''} `;
      exp.achievements?.forEach(achievement => {
        text += achievement + ' ';
      });
    });
    
    // Skills
    cvData.skills?.forEach(skill => {
      text += skill.skills.join(' ') + ' ';
    });
    
    // Projects
    cvData.projects?.forEach(project => {
      text += `${project.title} ${project.description || ''} `;
      text += project.technologies?.join(' ') || '';
    });
    
    return text;
  }
} 