'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Trash2, ArrowRight, ArrowLeft, Calendar, Building, MapPin } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface ExperienceStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function ExperienceStep({ onNext, onBack }: ExperienceStepProps) {
  const { state, dispatch } = useOnboarding();
  const [showAddWork, setShowAddWork] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset navigation state when component mounts or when step changes
  useEffect(() => {
    setIsNavigating(false);
  }, [state.currentStep]);

  const addWorkExperience = () => {
    const newWork = {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: ['']
    };

    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        work: [...state.cvData.work, newWork]
      }
    });
    setShowAddWork(false);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updatedWork = [...state.cvData.work];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { work: updatedWork }
    });
  };

  const removeWorkExperience = (index: number) => {
    const updatedWork = state.cvData.work.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { work: updatedWork }
    });
  };

  const addProject = () => {
    const newProject = {
      name: '',
      startDate: '',
      endDate: '',
      description: '',
      highlights: [''],
      url: ''
    };

    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        projects: [...state.cvData.projects, newProject]
      }
    });
    setShowAddProject(false);
  };

  const updateProject = (index: number, field: string, value: any) => {
    const updatedProjects = [...state.cvData.projects];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { projects: updatedProjects }
    });
  };

  const removeProject = (index: number) => {
    const updatedProjects = state.cvData.projects.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { projects: updatedProjects }
    });
  };

  const handleNext = () => {
    console.log('🔍 ExperienceStep - handleNext called');
    console.log('🔍 ExperienceStep - isNavigating:', isNavigating);
    
    // Prevent multiple clicks
    if (isNavigating) {
      console.log('⚠️ ExperienceStep - Already navigating, ignoring click');
      return;
    }
    
    console.log('✅ ExperienceStep - Calling onNext');
    setIsNavigating(true);
    
    // Add a small delay to ensure state updates are processed
    setTimeout(() => {
      onNext();
    }, 100);
  };

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
          Work Experience & Projects
        </h2>
        <p className="text-xl text-white/60">
          Add your professional experience and notable projects
        </p>
      </motion.div>

      {/* Work Experience Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Briefcase size={24} className="text-lime-400" />
            Work Experience
          </h3>
          <button
            onClick={() => setShowAddWork(true)}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Experience
          </button>
        </div>

        <AnimatePresence>
          {state.cvData.work.map((work, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-base font-semibold text-white">Experience {index + 1}</h4>
                <button
                  onClick={() => removeWorkExperience(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                                        <label className="block text-white/80 text-xs font-medium mb-2">
                        Company Name
                      </label>
                  <input
                    type="text"
                    value={work.name}
                    onChange={(e) => updateWorkExperience(index, 'name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    value={work.position}
                    onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="Enter your position"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={work.startDate}
                    onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={work.endDate}
                    onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  Job Description
                </label>
                <textarea
                  value={work.summary}
                  onChange={(e) => updateWorkExperience(index, 'summary', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Describe your role and responsibilities..."
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddWork && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center p-6 border-2 border-dashed border-white/20 rounded-xl"
          >
            <p className="text-white/60 mb-4">Add your work experience</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={addWorkExperience}
                className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-300 transition-colors"
              >
                Add Experience
              </button>
              <button
                onClick={() => setShowAddWork(false)}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Projects Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building size={24} className="text-lime-400" />
            Projects
          </h3>
          <button
            onClick={() => setShowAddProject(true)}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>

        <AnimatePresence>
          {state.cvData.projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-base font-semibold text-white">Project {index + 1}</h4>
                <button
                  onClick={() => removeProject(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => updateProject(index, 'name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={project.url}
                    onChange={(e) => updateProject(index, 'url', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="https://project-url.com"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={project.startDate}
                    onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={project.endDate}
                    onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  Project Description
                </label>
                <textarea
                  value={project.description}
                  onChange={(e) => updateProject(index, 'description', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Describe the project and your role..."
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddProject && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center p-6 border-2 border-dashed border-white/20 rounded-xl"
          >
            <p className="text-white/60 mb-4">Add a new project</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={addProject}
                className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-300 transition-colors"
              >
                Add Project
              </button>
              <button
                onClick={() => setShowAddProject(false)}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={isNavigating}
          className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isNavigating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              Continuing...
            </>
          ) : (
            <>
              Continue to Education
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
