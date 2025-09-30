'use client';

import React from 'react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface CVHealthScoreProps {
  cvData: UnifiedCVDataStructure | null;
  cvTitle?: string;
}

// Helper functions for calculating individual section scores
const calculatePersonalInfoScore = (basics: any): number => {
  if (!basics) return 0;
  
  let score = 0;
  
  // Check string fields
  if (basics.name && typeof basics.name === 'string' && basics.name.trim()) score += 20;
  if (basics.email && typeof basics.email === 'string' && basics.email.trim()) score += 20;
  if (basics.phone && typeof basics.phone === 'string' && basics.phone.trim()) score += 20;
  if (basics.summary && typeof basics.summary === 'string' && basics.summary.trim()) score += 20;
  
  // Check location object
  if (basics.location && typeof basics.location === 'object') {
    if (basics.location.city || basics.location.region || basics.location.address) {
      score += 20;
    }
  }
  
  return Math.min(100, score);
};

const calculateExperienceScore = (work: any[]): number => {
  if (!work || work.length === 0) return 0;
  
  let totalScore = 0;
  const maxEntries = 3; // Consider up to 3 most recent experiences
  
  work.slice(0, maxEntries).forEach(experience => {
    let entryScore = 0;
    
    // Unified schema uses 'name' for company name
    if (experience.name && typeof experience.name === 'string' && experience.name.trim()) entryScore += 25;
    if (experience.position && typeof experience.position === 'string' && experience.position.trim()) entryScore += 25;
    if (experience.startDate) entryScore += 20;
    if (experience.summary && typeof experience.summary === 'string' && experience.summary.trim()) entryScore += 30;
    
    totalScore += entryScore;
  });
  
  return Math.min(100, totalScore / Math.min(work.length, maxEntries));
};

const calculateEducationScore = (education: any[]): number => {
  if (!education || education.length === 0) return 0;
  
  let totalScore = 0;
  const maxEntries = 2; // Consider up to 2 most recent education entries
  
  education.slice(0, maxEntries).forEach(edu => {
    let entryScore = 0;
    
    if (edu.institution && typeof edu.institution === 'string' && edu.institution.trim()) entryScore += 40;
    if (edu.area && typeof edu.area === 'string' && edu.area.trim()) entryScore += 30;
    if (edu.startDate) entryScore += 15;
    // Unified schema uses 'score' not 'gpa'
    if (edu.score && typeof edu.score === 'string' && edu.score.trim()) entryScore += 15;
    
    totalScore += entryScore;
  });
  
  return Math.min(100, totalScore / Math.min(education.length, maxEntries));
};

const calculateSkillsScore = (skills: any[]): number => {
  if (!skills || skills.length === 0) return 0;
  
  let totalScore = 0;
  const maxSkills = 10; // Consider up to 10 skills
  
  skills.slice(0, maxSkills).forEach(skill => {
    let skillScore = 0;
    
    if (skill.name && typeof skill.name === 'string' && skill.name.trim()) skillScore += 50;
    if (skill.level && typeof skill.level === 'string' && skill.level.trim()) skillScore += 30;
    if (skill.keywords && Array.isArray(skill.keywords) && skill.keywords.length > 0) skillScore += 20;
    
    totalScore += skillScore;
  });
  
  return Math.min(100, totalScore / Math.min(skills.length, maxSkills));
};

const calculateProjectsScore = (projects: any[]): number => {
  if (!projects || projects.length === 0) return 0;
  
  let totalScore = 0;
  const maxProjects = 3; // Consider up to 3 most relevant projects
  
  projects.slice(0, maxProjects).forEach(project => {
    let projectScore = 0;
    
    if (project.name && typeof project.name === 'string' && project.name.trim()) projectScore += 30;
    if (project.description && typeof project.description === 'string' && project.description.trim()) projectScore += 40;
    if (project.url && typeof project.url === 'string' && project.url.trim()) projectScore += 15;
    // Unified schema uses 'highlights' not 'keywords' for projects
    if (project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0) projectScore += 15;
    
    totalScore += projectScore;
  });
  
  return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
};

// Main function to calculate CV completion percentage
const calculateCompletionPercentage = (cvData: UnifiedCVDataStructure | null): number => {
  if (!cvData) return 0;
  
  let totalScore = 0;
  let maxScore = 0;
  
  const sectionWeights = { personalInfo: 25, experience: 30, education: 20, skills: 15, projects: 10 };
  
  if (cvData.basics) {
    const personalInfoScore = calculatePersonalInfoScore(cvData.basics);
    totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
  }
  maxScore += sectionWeights.personalInfo;
  
  if (cvData.work) {
    const experienceScore = calculateExperienceScore(cvData.work);
    totalScore += (experienceScore * sectionWeights.experience) / 100;
  }
  maxScore += sectionWeights.experience;
  
  if (cvData.education) {
    const educationScore = calculateEducationScore(cvData.education);
    totalScore += (educationScore * sectionWeights.education) / 100;
  }
  maxScore += sectionWeights.education;
  
  if (cvData.skills) {
    const skillsScore = calculateSkillsScore(cvData.skills);
    totalScore += (skillsScore * sectionWeights.skills) / 100;
  }
  maxScore += sectionWeights.skills;
  
  if (cvData.projects) {
    const projectsScore = calculateProjectsScore(cvData.projects);
    totalScore += (projectsScore * sectionWeights.projects) / 100;
  }
  maxScore += sectionWeights.projects;
  
  const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return Math.max(0, Math.min(100, completionPercentage));
};

const CVHealthScore: React.FC<CVHealthScoreProps> = ({ cvData, cvTitle = 'Master CV' }) => {
  const healthScore = calculateCompletionPercentage(cvData);
  
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
    return { label: 'Needs Improvement', color: 'text-red-400', bgColor: 'bg-red-500' };
  };

  const status = getStatus(healthScore);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - healthScore / 100);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">CV Completion Score</h3>
          <p className="text-xs text-white/60 mt-1">Measures completeness, not ATS compatibility</p>
        </div>
        <div className="text-sm text-white/60">{cvTitle}</div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="none" 
              className="text-white/20" 
            />
            <defs>
              <linearGradient id="cvHealthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              stroke="url(#cvHealthGradient)" 
              strokeWidth="8" 
              fill="none" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              className="transition-all duration-1000 ease-out" 
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{healthScore}%</span>
          </div>
        </div>

        {/* Status and Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${status.bgColor}`}></div>
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
          
          <div className="text-xs text-white/60 space-y-1">
            <div>Complete your CV sections to improve your score</div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-white/40">Personal Info</span>
              <span className="text-white/40">Experience</span>
              <span className="text-white/40">Education</span>
              <span className="text-white/40">Skills</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVHealthScore;
