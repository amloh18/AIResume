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
    let completed = 0;
    let total = 0;

    // Check basics
    if (state.cvData.basics.name) completed++;
    if (state.cvData.basics.email) completed++;
    if (state.cvData.basics.summary) completed++;
    total += 3;

    // Check work experience
    if (state.cvData.work.length > 0) completed++;
    total++;

    // Check education
    if (state.cvData.education.length > 0) completed++;
    total++;

    // Check skills
    if (state.cvData.skills.length > 0) completed++;
    total++;

    return Math.round((completed / total) * 100);
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
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-white">
                    Profile Completion
                  </h3>
                  <p className="text-lime-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                    Your CV profile is 100% complete
                  </p>
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
