'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowLeft, ArrowRight, Download, Eye } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Complete Your Setup
        </h2>
        <p className="text-xl text-white/60">
          Review your information and complete your CVCircle profile
        </p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center">
            <CheckCircle size={48} className="text-black" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Profile Completion</h3>
            <p className="text-white/60">Your CV profile is {completionPercentage}% complete</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-lime-400 to-lime-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>

          <div className="text-sm text-white/60">
            {completionPercentage >= 80 ? (
              <span className="text-lime-400">Excellent! Your profile is ready.</span>
            ) : completionPercentage >= 60 ? (
              <span className="text-yellow-400">Good progress! Consider adding more details.</span>
            ) : (
              <span className="text-red-400">Please add more information to complete your profile.</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* CV Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Eye size={24} className="text-lime-400" />
            CV Preview
          </h3>
          <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2">
            <Download size={16} />
            Download PDF
          </button>
        </div>

        {/* CV Preview Content */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center border-b border-white/10 pb-4">
              <h4 className="text-2xl font-bold text-white">
                {state.cvData.basics.name || 'Your Name'}
              </h4>
              <p className="text-lime-400 text-lg">
                {state.cvData.basics.label || 'Professional Title'}
              </p>
              <div className="flex items-center justify-center gap-4 mt-2 text-white/60 text-sm">
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
              <div>
                <h5 className="text-lg font-semibold text-white mb-2">Professional Summary</h5>
                <p className="text-white/80 text-sm leading-relaxed">
                  {state.cvData.basics.summary}
                </p>
              </div>
            )}

            {/* Work Experience */}
            {state.cvData.work.length > 0 && (
              <div>
                <h5 className="text-lg font-semibold text-white mb-3">Work Experience</h5>
                <div className="space-y-3">
                  {state.cvData.work.slice(0, 2).map((work, index) => (
                    <div key={index} className="border-l-2 border-lime-400 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-semibold text-white">{work.position}</h6>
                          <p className="text-lime-400 text-sm">{work.name}</p>
                        </div>
                        <span className="text-white/60 text-sm">
                          {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                        </span>
                      </div>
                      {work.summary && (
                        <p className="text-white/80 text-sm mt-1">{work.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {state.cvData.education.length > 0 && (
              <div>
                <h5 className="text-lg font-semibold text-white mb-3">Education</h5>
                <div className="space-y-3">
                  {state.cvData.education.slice(0, 2).map((education, index) => (
                    <div key={index} className="border-l-2 border-lime-400 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-semibold text-white">{education.institution}</h6>
                          <p className="text-lime-400 text-sm">
                            {education.studyType} in {education.area}
                          </p>
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

            {/* Skills */}
            {state.cvData.skills.length > 0 && (
              <div>
                <h5 className="text-lg font-semibold text-white mb-3">Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {state.cvData.skills.slice(0, 3).map((skill, index) => (
                    <div key={index} className="bg-lime-400/20 text-lime-400 px-3 py-1 rounded-full text-sm">
                      {skill.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-gradient-to-r from-lime-400/10 to-lime-500/10 border border-lime-400/20 rounded-2xl p-8"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-lime-500 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles size={32} className="text-black" />
          </div>
          <h3 className="text-2xl font-bold text-white">Welcome to CVCircle!</h3>
          <p className="text-white/80 text-lg leading-relaxed">
            Your professional CV profile has been created successfully. You can now access your dashboard to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-2">Create CVs</h4>
              <p className="text-white/60 text-sm">Build multiple CV versions for different roles</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-2">Track Applications</h4>
              <p className="text-white/60 text-sm">Monitor your job applications and progress</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-2">AI Assistance</h4>
              <p className="text-white/60 text-sm">Get AI-powered insights and suggestions</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          disabled={isLoading}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <button
          onClick={onComplete}
          disabled={isLoading || completionPercentage < 50}
          className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Creating Your Profile...
            </>
          ) : (
            <>
              Complete Setup & Go to Dashboard
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </motion.div>

      {/* Warning for incomplete profiles */}
      {completionPercentage < 50 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center"
        >
          <p className="text-red-400 text-sm">
            Please complete at least 50% of your profile to continue. Add more information to your CV.
          </p>
        </motion.div>
      )}
    </div>
  );
}
