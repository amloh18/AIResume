'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface CompletionStepProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function CompletionStep({ onComplete, onBack, isLoading }: CompletionStepProps) {
  const { state } = useOnboarding();

  const getCompletionPercentage = () => {
    // New completion logic: 100% if all criteria are met
    const criteria = {
      hasPersonalInfo: false,
      hasWorkExperience: false,
      hasEducation: false,
      hasSkills: false,
      hasProjects: false,
      hasMinimumWorkRecords: false,
      hasMinimumEducationRecords: false,
      hasMinimumSkillsRecords: false,
      hasMinimumProjectsRecords: false,
      hasMasterDegree: false,
      hasBachelorDegree: false
    };

    // Check personal info (name, email, phone, summary)
    if (state.cvData.basics?.name && state.cvData.basics?.email && 
        state.cvData.basics?.phone && state.cvData.basics?.summary) {
      criteria.hasPersonalInfo = true;
    }

    // Check work experience (minimum 2 records)
    if (state.cvData.work && state.cvData.work.length >= 2) {
      criteria.hasWorkExperience = true;
      criteria.hasMinimumWorkRecords = true;
    } else if (state.cvData.work && state.cvData.work.length >= 1) {
      criteria.hasWorkExperience = true;
    }

    // Check education (minimum 2 records, prefer Master's)
    if (state.cvData.education && state.cvData.education.length >= 2) {
      criteria.hasEducation = true;
      criteria.hasMinimumEducationRecords = true;
      
      // Check for Master's degree
      const hasMaster = state.cvData.education.some(edu => 
        edu.studyType?.toLowerCase().includes('master') || 
        edu.studyType?.toLowerCase().includes('msc') ||
        edu.studyType?.toLowerCase().includes('mba')
      );
      criteria.hasMasterDegree = hasMaster;
      
      // Check for Bachelor's degree
      const hasBachelor = state.cvData.education.some(edu => 
        edu.studyType?.toLowerCase().includes('bachelor') || 
        edu.studyType?.toLowerCase().includes('bsc') ||
        edu.studyType?.toLowerCase().includes('ba')
      );
      criteria.hasBachelorDegree = hasBachelor;
    } else if (state.cvData.education && state.cvData.education.length >= 1) {
      criteria.hasEducation = true;
      
      // Check for Bachelor's degree (acceptable for freshers)
      const hasBachelor = state.cvData.education.some(edu => 
        edu.studyType?.toLowerCase().includes('bachelor') || 
        edu.studyType?.toLowerCase().includes('bsc') ||
        edu.studyType?.toLowerCase().includes('ba')
      );
      criteria.hasBachelorDegree = hasBachelor;
    }

    // Check skills (minimum 1 record)
    if (state.cvData.skills && state.cvData.skills.length >= 1) {
      criteria.hasSkills = true;
      criteria.hasMinimumSkillsRecords = true;
    }

    // Check projects (minimum 1 record)
    if (state.cvData.projects && state.cvData.projects.length >= 1) {
      criteria.hasProjects = true;
      criteria.hasMinimumProjectsRecords = true;
    }

    // Calculate completion based on criteria
    let completionScore = 0;
    let maxScore = 0;

    // Essential criteria (must have)
    const essentialCriteria = [
      'hasPersonalInfo',
      'hasWorkExperience', 
      'hasEducation',
      'hasSkills',
      'hasProjects'
    ];

    essentialCriteria.forEach(criterion => {
      maxScore += 20; // 20 points each
      if (criteria[criterion]) {
        completionScore += 20;
      }
    });

    // Bonus criteria
    if (criteria.hasMinimumWorkRecords) completionScore += 5;
    if (criteria.hasMinimumEducationRecords) completionScore += 5;
    if (criteria.hasMasterDegree) completionScore += 10; // Master's degree bonus
    if (criteria.hasBachelorDegree && !criteria.hasMasterDegree) completionScore += 5; // Bachelor's for freshers

    const completionPercentage = Math.round((completionScore / (maxScore + 25)) * 100);
    return Math.max(0, Math.min(100, completionPercentage));
  };

  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    if (basics.name && basics.name.trim()) score += 20;
    if (basics.email && basics.email.trim()) score += 20;
    if (basics.phone && basics.phone.trim()) score += 15;
    if (basics.summary && basics.summary.trim()) score += 25;
    if (basics.location?.city && basics.location.city.trim()) score += 10;
    if (basics.profiles && basics.profiles.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const calculateExperienceScore = (work: any[]): number => {
    if (!work || work.length === 0) return 0;
    
    let totalScore = 0;
    work.forEach(job => {
      let jobScore = 0;
      if (job.name && job.name.trim()) jobScore += 25;
      if (job.position && job.position.trim()) jobScore += 25;
      if (job.startDate && job.startDate.trim()) jobScore += 15;
      if (job.summary && job.summary.trim()) jobScore += 20;
      if (job.highlights && job.highlights.length > 0) jobScore += 15;
      totalScore += Math.min(jobScore, 100);
    });
    
    return Math.min(totalScore / work.length, 100);
  };

  const calculateEducationScore = (education: any[]): number => {
    if (!education || education.length === 0) return 0;
    
    let totalScore = 0;
    education.forEach(edu => {
      let eduScore = 0;
      if (edu.institution && edu.institution.trim()) eduScore += 30;
      if (edu.studyType && edu.studyType.trim()) eduScore += 25;
      if (edu.area && edu.area.trim()) eduScore += 20;
      if (edu.startDate && edu.startDate.trim()) eduScore += 15;
      if (edu.endDate && edu.endDate.trim()) eduScore += 10;
      totalScore += Math.min(eduScore, 100);
    });
    
    return Math.min(totalScore / education.length, 100);
  };

  const calculateSkillsScore = (skills: any[]): number => {
    if (!skills || skills.length === 0) return 0;
    
    let totalScore = 0;
    skills.forEach(skill => {
      let skillScore = 0;
      if (skill.name && skill.name.trim()) skillScore += 40;
      if (skill.keywords && skill.keywords.length > 0) skillScore += 60;
      totalScore += Math.min(skillScore, 100);
    });
    
    return Math.min(totalScore / skills.length, 100);
  };

  const calculateProjectsScore = (projects: any[]): number => {
    if (!projects || projects.length === 0) return 0;
    
    let totalScore = 0;
    projects.forEach(project => {
      let projectScore = 0;
      if (project.name && project.name.trim()) projectScore += 30;
      if (project.description && project.description.trim()) projectScore += 30;
      if (project.highlights && project.highlights.length > 0) projectScore += 25;
      if (project.url && project.url.trim()) projectScore += 15;
      totalScore += Math.min(projectScore, 100);
    });
    
    return Math.min(totalScore / projects.length, 100);
  };

  const calculateATSScore = () => {
    // ATS Score: 60% ATS-friendly structure + 40% content quality
    let atsScore = 0;
    let contentScore = 0;
    
    // ATS-Friendly Structure (60% weight)
    const atsStructureScore = calculateATSStructureScore();
    atsScore = atsStructureScore * 0.6;
    
    // Content Quality (40% weight)
    const contentQualityScore = calculateContentQualityScore();
    contentScore = contentQualityScore * 0.4;
    
    const finalScore = Math.round(atsScore + contentScore);
    return Math.min(Math.max(finalScore, 0), 100);
  };

  const calculateATSStructureScore = () => {
    let score = 0;
    
    // Essential ATS elements (100 points total)
    if (state.cvData.basics?.name) score += 15;
    if (state.cvData.basics?.email) score += 15;
    if (state.cvData.basics?.phone) score += 10;
    if (state.cvData.basics?.summary) score += 20;
    if (state.cvData.work && state.cvData.work.length > 0) score += 20;
    if (state.cvData.education && state.cvData.education.length > 0) score += 15;
    if (state.cvData.skills && state.cvData.skills.length > 0) score += 5;
    
    return Math.min(score, 100);
  };

  const calculateContentQualityScore = () => {
    let score = 0;
    
    // Content quality metrics (100 points total)
    
    // Summary quality (25 points)
    if (state.cvData.basics?.summary) {
      const summary = state.cvData.basics.summary;
      if (summary.length > 100) score += 10; // Good length
      if (summary.length > 200) score += 5; // Excellent length
      
      // Check for action verbs
      const actionVerbs = ['achieved', 'developed', 'implemented', 'managed', 'led', 'created', 'designed', 'improved', 'increased', 'reduced', 'optimized', 'delivered', 'executed', 'coordinated', 'facilitated', 'established', 'launched', 'streamlined', 'enhanced', 'transformed'];
      const hasActionVerbs = actionVerbs.some(verb => summary.toLowerCase().includes(verb));
      if (hasActionVerbs) score += 10;
    }
    
    // Work experience quality (35 points)
    if (state.cvData.work && state.cvData.work.length > 0) {
      score += 10; // Has work experience
      
      state.cvData.work.forEach(job => {
        if (job.summary && job.summary.length > 50) score += 5;
        if (job.highlights && job.highlights.length > 0) score += 5;
        
        // Check for quantified achievements
        const hasNumbers = /\d+%|\d+\+|\d+ years?|\d+ months?|\$[\d,]+|\d+ people|\d+ team/.test(job.summary || '');
        if (hasNumbers) score += 5;
      });
      
      // Bonus for multiple experiences
      if (state.cvData.work.length >= 2) score += 5;
    }
    
    // Education quality (20 points)
    if (state.cvData.education && state.cvData.education.length > 0) {
      score += 10; // Has education
      
      state.cvData.education.forEach(edu => {
        if (edu.studyType && edu.studyType.toLowerCase().includes('master')) score += 5;
        if (edu.studyType && edu.studyType.toLowerCase().includes('bachelor')) score += 3;
        if (edu.area && edu.area.trim()) score += 2;
      });
    }
    
    // Skills quality (10 points)
    if (state.cvData.skills && state.cvData.skills.length > 0) {
      score += 5; // Has skills
      
      state.cvData.skills.forEach(skill => {
        if (skill.keywords && skill.keywords.length >= 3) score += 3;
        if (skill.keywords && skill.keywords.length >= 5) score += 2;
      });
    }
    
    // Projects quality (10 points)
    if (state.cvData.projects && state.cvData.projects.length > 0) {
      score += 5; // Has projects
      
      state.cvData.projects.forEach(project => {
        if (project.description && project.description.length > 50) score += 3;
        if (project.highlights && project.highlights.length > 0) score += 2;
      });
    }
    
    return Math.min(score, 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-6xl flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Complete Your Setup
          </h2>
          <p className="text-xl text-white/60">
            Review your information and complete your CVCircle profile
          </p>
        </motion.div>

        {/* Profile Completion Card with Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full mb-8"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              {/* Left: Progress and Status */}
              <div className="flex items-center gap-4">
                {/* Circular Progress Bar */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="4"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="rgb(163, 230, 53)"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - completionPercentage / 100) }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Profile Completion
                    </h3>
                    <p className="text-lime-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                      Your CV profile is {completionPercentage}% complete
                    </p>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-semibold text-white/80">
                      ATS Score
                    </h4>
                    <p className="text-blue-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {calculateATSScore()}% ATS-friendly
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Complete Button */}
              <div>
                <button
                  onClick={onComplete}
                  disabled={isLoading || completionPercentage < 50}
                  className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Creating Your Profile...
                    </>
                  ) : (
                    <>
                      Complete Setup & Go to Dashboard
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CV Preview - Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full flex flex-col items-center"
        >

            {/* CV Preview Content - A4 Pages */}
            <div className="space-y-8 relative">
              {/* CV Preview Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Eye size={16} />
                  <span className="text-sm font-medium">CV Preview • A4 Format</span>
                </div>
              </div>
              
              {/* Continuous content with visual page breaks */}
              <div className="cv-content" style={{ width: '210mm' }}>
                {/* Page 1 */}
                <div className="cv-page bg-white/5 border border-white/10 rounded-xl shadow-2xl mb-8" style={{ width: '210mm', minHeight: '297mm' }}>
                  <div className="p-8">
                    {/* Header */}
                    <div className="text-center border-b border-white/10 pb-6 mb-6">
                      <h4 className="text-3xl font-bold text-white mb-2">
                        {state.cvData.basics.name || 'Your Name'}
                      </h4>
                      <p className="text-lime-400 text-xl mb-3">
                        {state.cvData.basics.label || 'Professional Title'}
                      </p>
                      <div className="flex items-center justify-center gap-6 mt-3 text-white/60 text-sm">
                        {state.cvData.basics.email && (
                          <span>{state.cvData.basics.email}</span>
                        )}
                        {state.cvData.basics.phone && (
                          <span>{state.cvData.basics.phone}</span>
                        )}
                        {state.cvData.basics.location.city && (
                          <span>{state.cvData.basics.location.city}</span>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    {state.cvData.basics.summary && (
                      <div className="mb-6">
                        <h5 className="text-xl font-semibold text-white mb-3 border-b border-white/10 pb-1">Professional Summary</h5>
                        <p className="text-white/80 text-base leading-relaxed">
                          {state.cvData.basics.summary}
                        </p>
                      </div>
                    )}

                    {/* Work Experience */}
                    {state.cvData.work.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Work Experience</h5>
                        <div className="space-y-4">
                          {/* First 2 work experiences on page 1 */}
                          {state.cvData.work.slice(0, 2).map((work, index) => (
                            <div key={index} className="border-l-4 border-lime-400 pl-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h6 className="font-semibold text-white text-lg">{work.position}</h6>
                                  <p className="text-lime-400 text-base">{work.name}</p>
                                </div>
                                <span className="text-white/60 text-sm">
                                  {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                                </span>
                              </div>
                              {work.summary && (
                                <div className="text-white/80 text-sm leading-relaxed">
                                  {work.summary.split('\n').map((line, i) => (
                                    <p key={i} className="mb-1">{line}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education - only if work has 2 or fewer entries */}
                    {state.cvData.work.length <= 2 && state.cvData.education.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Education</h5>
                        <div className="space-y-4">
                          {state.cvData.education.map((education, index) => (
                            <div key={index} className="border-l-4 border-lime-400 pl-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h6 className="font-semibold text-white text-lg">{education.institution}</h6>
                                  <p className="text-lime-400 text-base">
                                    {education.studyType} in {education.area}
                                  </p>
                                  {education.gpa && (
                                    <p className="text-white/60 text-sm">GPA: {education.gpa}</p>
                                  )}
                                </div>
                                <span className="text-white/60 text-sm">
                                  {education.startDate && education.endDate ? `${education.startDate} - ${education.endDate}` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills - only if work has 2 or fewer entries */}
                    {state.cvData.work.length <= 2 && state.cvData.skills.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Skills</h5>
                        <div className="flex flex-wrap gap-2">
                          {state.cvData.skills.map((skill, index) => (
                            <div key={index} className="bg-lime-400/20 text-lime-400 px-3 py-2 rounded-full text-sm font-medium">
                              {skill.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Page 2 - Additional work experience and remaining content */}
                {(state.cvData.work.length > 2 || (state.cvData.work.length > 2 && (state.cvData.education.length > 0 || state.cvData.skills.length > 0)) || state.cvData.projects.length > 0) && (
                  <div className="cv-page bg-white/5 border border-white/10 rounded-xl shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
                    <div className="p-8">
                      {/* Continued Work Experience */}
                      {state.cvData.work.length > 2 && (
                        <div className="mb-6">
                          <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Work Experience (Continued)</h5>
                          <div className="space-y-4">
                            {state.cvData.work.slice(2).map((work, index) => (
                              <div key={index + 2} className="border-l-4 border-lime-400 pl-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h6 className="font-semibold text-white text-lg">{work.position}</h6>
                                    <p className="text-lime-400 text-base">{work.name}</p>
                                  </div>
                                  <span className="text-white/60 text-sm">
                                    {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                                  </span>
                                </div>
                                {work.summary && (
                                  <div className="text-white/80 text-sm leading-relaxed">
                                    {work.summary.split('\n').map((line, i) => (
                                      <p key={i} className="mb-1">{line}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education - if not shown on page 1 */}
                      {state.cvData.work.length > 2 && state.cvData.education.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Education</h5>
                          <div className="space-y-4">
                            {state.cvData.education.map((education, index) => (
                              <div key={index} className="border-l-4 border-lime-400 pl-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h6 className="font-semibold text-white text-lg">{education.institution}</h6>
                                    <p className="text-lime-400 text-base">
                                      {education.studyType} in {education.area}
                                    </p>
                                    {education.gpa && (
                                      <p className="text-white/60 text-sm">GPA: {education.gpa}</p>
                                    )}
                                  </div>
                                  <span className="text-white/60 text-sm">
                                    {education.startDate && education.endDate ? `${education.startDate} - ${education.endDate}` : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills - if not shown on page 1 */}
                      {state.cvData.work.length > 2 && state.cvData.skills.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {state.cvData.skills.map((skill, index) => (
                              <div key={index} className="bg-lime-400/20 text-lime-400 px-3 py-2 rounded-full text-sm font-medium">
                                {skill.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {state.cvData.projects.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-1">Projects</h5>
                          <div className="space-y-4">
                            {state.cvData.projects.map((project, index) => (
                              <div key={index} className="border-l-4 border-lime-400 pl-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-semibold text-white text-lg">{project.name}</h6>
                                  <span className="text-white/60 text-sm">
                                    {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                                  </span>
                                </div>
                                {project.description && (
                                  <div className="text-white/80 text-sm leading-relaxed">
                                    {project.description.split('\n').map((line, i) => (
                                      <p key={i} className="mb-1">{line}</p>
                                    ))}
                                  </div>
                                )}
                                {project.url && (
                                  <p className="text-lime-400 text-sm mt-2">
                                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                                      {project.url}
                                    </a>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>



        {/* Warning for incomplete profiles */}
        {completionPercentage < 50 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center mt-6 max-w-4xl"
          >
            <p className="text-red-400 text-sm">
              Please complete at least 50% of your profile to continue. Add more information to your CV.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
