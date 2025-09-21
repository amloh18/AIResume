/**
 * CV Progress Calculation Service
 * Calculates completion percentage based on CV data sections
 */

export class CVProgressService {
  /**
   * Calculate CV completion percentage
   * @param cv - CV object with cvData
   * @returns Completion percentage (0-100)
   */
  static calculateCompletionPercentage(cv: any): number {
    // If CV is published, it's considered complete
    if (cv.status === 'published') return 100;
    
    // If CV is archived, return 0
    if (cv.status === 'archived') return 0;
    
    // Calculate completion based on CV sections
    let totalScore = 0;
    let maxScore = 0;
    
    // Section weights (total = 100)
    const sectionWeights = {
      personalInfo: 25,    // Name, email, phone, location, summary
      experience: 30,      // Work experience entries
      education: 20,       // Education entries
      skills: 15,          // Skills and competencies
      projects: 10         // Projects and achievements
    };
    
    // Check personal info section
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = this.calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;
    
    // Check experience section
    if (cv.cvData?.work) {
      const experienceScore = this.calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;
    
    // Check education section
    if (cv.cvData?.education) {
      const educationScore = this.calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;
    
    // Check skills section
    if (cv.cvData?.skills) {
      const skillsScore = this.calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;
    
    // Check projects section
    if (cv.cvData?.projects) {
      const projectsScore = this.calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;
    
    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Calculate personal info section score
   */
  private static calculatePersonalInfoScore(basics: any): number {
    let score = 0;
    let maxFields = 5; // name, email, phone, location, summary
    
    if (basics.name && basics.name.trim()) score++;
    if (basics.email && basics.email.trim()) score++;
    if (basics.phone && basics.phone.trim()) score++;
    if (basics.location && (basics.location.city || basics.location.address)) score++;
    if (basics.summary && basics.summary.trim() && basics.summary.trim().length > 50) score++;
    
    return (score / maxFields) * 100;
  }

  /**
   * Calculate experience section score
   */
  private static calculateExperienceScore(work: any[]): number {
    if (!work || work.length === 0) return 0;
    
    let totalScore = 0;
    const maxFieldsPerJob = 5; // name, position, startDate, summary, highlights
    
    work.forEach(job => {
      let jobScore = 0;
      
      if (job.name && job.name.trim()) jobScore++;
      if (job.position && job.position.trim()) jobScore++;
      if (job.startDate) jobScore++;
      if (job.summary && job.summary.trim()) jobScore++;
      if (job.highlights && job.highlights.length > 0) jobScore++;
      
      totalScore += (jobScore / maxFieldsPerJob) * 100;
    });
    
    // Average score across all jobs, with bonus for having multiple jobs
    const averageScore = totalScore / work.length;
    const jobCountBonus = Math.min(work.length * 10, 30); // Up to 30% bonus for 3+ jobs
    
    return Math.min(averageScore + jobCountBonus, 100);
  }

  /**
   * Calculate education section score
   */
  private static calculateEducationScore(education: any[]): number {
    if (!education || education.length === 0) return 0;
    
    let totalScore = 0;
    const maxFieldsPerEducation = 4; // institution, studyType, area, startDate
    
    education.forEach(edu => {
      let eduScore = 0;
      
      if (edu.institution && edu.institution.trim()) eduScore++;
      if (edu.studyType && edu.studyType.trim()) eduScore++;
      if (edu.area && edu.area.trim()) eduScore++;
      if (edu.startDate) eduScore++;
      
      totalScore += (eduScore / maxFieldsPerEducation) * 100;
    });
    
    // Average score across all education entries
    return totalScore / education.length;
  }

  /**
   * Calculate skills section score
   */
  private static calculateSkillsScore(skills: any[]): number {
    if (!skills || skills.length === 0) return 0;
    
    const totalSkills = skills.reduce((count, skillGroup) => {
      return count + (skillGroup.keywords ? skillGroup.keywords.length : 0);
    }, 0);
    
    // Score based on number of skills and skill groups
    const skillGroupsScore = Math.min(skills.length * 20, 60); // Up to 60% for 3+ skill groups
    const skillCountScore = Math.min(totalSkills * 2, 40); // Up to 40% for 20+ skills
    
    return skillGroupsScore + skillCountScore;
  }

  /**
   * Calculate projects section score
   */
  private static calculateProjectsScore(projects: any[]): number {
    if (!projects || projects.length === 0) return 0;
    
    let totalScore = 0;
    const maxFieldsPerProject = 4; // name, description, highlights, url
    
    projects.forEach(project => {
      let projectScore = 0;
      
      if (project.name && project.name.trim()) projectScore++;
      if (project.description && project.description.trim()) projectScore++;
      if (project.highlights && project.highlights.length > 0) projectScore++;
      if (project.url && project.url.trim()) projectScore++;
      
      totalScore += (projectScore / maxFieldsPerProject) * 100;
    });
    
    // Average score across all projects, with bonus for having multiple projects
    const averageScore = totalScore / projects.length;
    const projectCountBonus = Math.min(projects.length * 15, 30); // Up to 30% bonus for 2+ projects
    
    return Math.min(averageScore + projectCountBonus, 100);
  }

  /**
   * Get progress status text based on percentage
   */
  static getProgressStatus(percentage: number): string {
    if (percentage >= 90) return 'Complete';
    if (percentage >= 70) return 'Nearly done';
    if (percentage >= 50) return 'In progress';
    if (percentage >= 25) return 'Getting started';
    return 'Just started';
  }

  /**
   * Get progress color based on percentage
   */
  static getProgressColor(percentage: number): { bg: string; text: string; border: string } {
    if (percentage >= 90) {
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-300',
        border: 'border-green-400/30'
      };
    }
    if (percentage >= 70) {
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-300',
        border: 'border-blue-400/30'
      };
    }
    if (percentage >= 50) {
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-300',
        border: 'border-yellow-400/30'
      };
    }
    if (percentage >= 25) {
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-300',
        border: 'border-orange-400/30'
      };
    }
    return {
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      border: 'border-red-400/30'
    };
  }
}
