'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Wand2, 
  Loader2,
  Briefcase,
  GraduationCap,
  Code,
  Calendar,
  Building,
  MapPin
} from 'lucide-react';

interface CoreExperienceStepProps {
  cvData: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CoreExperienceStep({ cvData, onUpdate, onNext, onBack }: CoreExperienceStepProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['work']));
  const [aiRefining, setAiRefining] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

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
    
    onUpdate({
      work: [...(cvData.work || []), newWork]
    });
  };

  const updateWorkExperience = (index: number, field: string, value: string | string[]) => {
    const updatedWork = [...(cvData.work || [])];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    onUpdate({ work: updatedWork });
  };

  const removeWorkExperience = (index: number) => {
    const updatedWork = [...(cvData.work || [])];
    updatedWork.splice(index, 1);
    onUpdate({ work: updatedWork });
  };

  const addEducation = () => {
    const newEducation = {
      institution: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      courses: []
    };
    
    onUpdate({
      education: [...(cvData.education || []), newEducation]
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updatedEducation = [...(cvData.education || [])];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    onUpdate({ education: updatedEducation });
  };

  const removeEducation = (index: number) => {
    const updatedEducation = [...(cvData.education || [])];
    updatedEducation.splice(index, 1);
    onUpdate({ education: updatedEducation });
  };

  const addProject = () => {
    const newProject = {
      name: '',
      description: '',
      url: '',
      keywords: [],
      highlights: ['']
    };
    
    onUpdate({
      projects: [...(cvData.projects || []), newProject]
    });
  };

  const updateProject = (index: number, field: string, value: string | string[]) => {
    const updatedProjects = [...(cvData.projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    onUpdate({ projects: updatedProjects });
  };

  const removeProject = (index: number) => {
    const updatedProjects = [...(cvData.projects || [])];
    updatedProjects.splice(index, 1);
    onUpdate({ projects: updatedProjects });
  };

  const refineWithAI = async (section: string, index: number, content: string) => {
    if (!content.trim()) return;
    
    setAiRefining(`${section}-${index}`);
    
    try {
      const response = await fetch('/api/ai/refine-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type: 'resume_bullets'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const refinedContent = result.refinedContent || content;
        
        if (section === 'work') {
          updateWorkExperience(index, 'summary', refinedContent);
        } else if (section === 'projects') {
          updateProject(index, 'description', refinedContent);
        }
      }
    } catch (error) {
      console.error('AI refinement error:', error);
    } finally {
      setAiRefining(null);
    }
  };

  const sections = [
    {
      id: 'work',
      title: 'Work Experience',
      icon: Briefcase,
      color: 'from-blue-400 to-blue-600',
      data: cvData.work || [],
      addFunction: addWorkExperience,
      updateFunction: updateWorkExperience,
      removeFunction: removeWorkExperience
    },
    {
      id: 'education',
      title: 'Education',
      icon: GraduationCap,
      color: 'from-green-400 to-green-600',
      data: cvData.education || [],
      addFunction: addEducation,
      updateFunction: updateEducation,
      removeFunction: removeEducation
    },
    {
      id: 'projects',
      title: 'Projects',
      icon: Code,
      color: 'from-purple-400 to-purple-600',
      data: cvData.projects || [],
      addFunction: addProject,
      updateFunction: updateProject,
      removeFunction: removeProject
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Core Experience
          </h2>
          <p className="text-xl text-white/60">
            Add your work experience, education, and projects. Use AI to refine your descriptions.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${section.color} rounded-lg flex items-center justify-center`}>
                    <section.icon size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                    <p className="text-white/60 text-sm">
                      {section.data.length} {section.data.length === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight size={20} className="text-white/60" />
                </motion.div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {expandedSections.has(section.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-4"
                  >
                    {section.data.map((item: any, index: number) => (
                      <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-white">
                            {section.id === 'work' ? item.position || 'Work Experience' :
                             section.id === 'education' ? item.studyType || 'Education' :
                             item.name || 'Project'}
                          </h4>
                          <button
                            onClick={() => section.removeFunction(index)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {section.id === 'work' && (
                            <>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Company</label>
                                <div className="relative">
                                  <Building size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                                  <input
                                    type="text"
                                    value={item.name || ''}
                                    onChange={(e) => section.updateFunction(index, 'name', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                    placeholder="Company name"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Position</label>
                                <input
                                  type="text"
                                  value={item.position || ''}
                                  onChange={(e) => section.updateFunction(index, 'position', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="Job title"
                                />
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Start Date</label>
                                <div className="relative">
                                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                                  <input
                                    type="month"
                                    value={item.startDate || ''}
                                    onChange={(e) => section.updateFunction(index, 'startDate', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">End Date</label>
                                <div className="relative">
                                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                                  <input
                                    type="month"
                                    value={item.endDate || ''}
                                    onChange={(e) => section.updateFunction(index, 'endDate', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {section.id === 'education' && (
                            <>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Institution</label>
                                <input
                                  type="text"
                                  value={item.institution || ''}
                                  onChange={(e) => section.updateFunction(index, 'institution', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="University or school name"
                                />
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Degree</label>
                                <input
                                  type="text"
                                  value={item.studyType || ''}
                                  onChange={(e) => section.updateFunction(index, 'studyType', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="e.g., Bachelor's, Master's"
                                />
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Field of Study</label>
                                <input
                                  type="text"
                                  value={item.area || ''}
                                  onChange={(e) => section.updateFunction(index, 'area', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="e.g., Computer Science, Business"
                                />
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">GPA/Grade (Optional)</label>
                                <input
                                  type="text"
                                  value={item.score || ''}
                                  onChange={(e) => section.updateFunction(index, 'score', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="e.g., 3.8/4.0, First Class"
                                />
                              </div>
                            </>
                          )}

                          {section.id === 'projects' && (
                            <>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">Project Name</label>
                                <input
                                  type="text"
                                  value={item.name || ''}
                                  onChange={(e) => section.updateFunction(index, 'name', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="Project name"
                                />
                              </div>
                              <div>
                                <label className="block text-white/80 text-xs font-medium mb-2">URL (Optional)</label>
                                <input
                                  type="url"
                                  value={item.url || ''}
                                  onChange={(e) => section.updateFunction(index, 'url', e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="https://project-url.com"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Description with AI Refinement */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-white/80 text-xs font-medium">
                              Description
                            </label>
                            <button
                              onClick={() => refineWithAI(section.id, index, item.summary || item.description || '')}
                              disabled={!item.summary && !item.description || aiRefining === `${section.id}-${index}`}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {aiRefining === `${section.id}-${index}` ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Wand2 size={12} />
                              )}
                              {aiRefining === `${section.id}-${index}` ? 'Refining...' : 'Refine with AI'}
                            </button>
                          </div>
                          <textarea
                            value={item.summary || item.description || ''}
                            onChange={(e) => section.updateFunction(index, section.id === 'projects' ? 'description' : 'summary', e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 resize-none"
                            rows={3}
                            placeholder={`Describe your ${section.id === 'work' ? 'role and responsibilities' : section.id === 'education' ? 'academic achievements' : 'project details and technologies used'}...`}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add Button */}
                    <button
                      onClick={section.addFunction}
                      className="w-full py-3 border-2 border-dashed border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add {section.title}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors"
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
