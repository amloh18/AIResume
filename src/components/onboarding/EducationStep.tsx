'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, Star, Languages } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface EducationStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function EducationStep({ onNext, onBack }: EducationStepProps) {
  const { state, dispatch } = useOnboarding();
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddLanguage, setShowAddLanguage] = useState(false);

  const addEducation = () => {
    const newEducation = {
      institution: '',
      url: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      courses: ['']
    };

    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        education: [...state.cvData.education, newEducation]
      }
    });
    setShowAddEducation(false);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updatedEducation = [...state.cvData.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { education: updatedEducation }
    });
  };

  const removeEducation = (index: number) => {
    const updatedEducation = state.cvData.education.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { education: updatedEducation }
    });
  };

  const addSkill = () => {
    const newSkill = {
      name: '',
      level: '',
      keywords: ['']
    };

    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        skills: [...state.cvData.skills, newSkill]
      }
    });
    setShowAddSkill(false);
  };

  const updateSkill = (index: number, field: string, value: any) => {
    const updatedSkills = [...state.cvData.skills];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { skills: updatedSkills }
    });
  };

  const removeSkill = (index: number) => {
    const updatedSkills = state.cvData.skills.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { skills: updatedSkills }
    });
  };

  const addLanguage = () => {
    const newLanguage = {
      language: '',
      fluency: ''
    };

    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        languages: [...state.cvData.languages, newLanguage]
      }
    });
    setShowAddLanguage(false);
  };

  const updateLanguage = (index: number, field: string, value: string) => {
    const updatedLanguages = [...state.cvData.languages];
    updatedLanguages[index] = { ...updatedLanguages[index], [field]: value };
    
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { languages: updatedLanguages }
    });
  };

  const removeLanguage = (index: number) => {
    const updatedLanguages = state.cvData.languages.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: { languages: updatedLanguages }
    });
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
          Education & Skills
        </h2>
        <p className="text-xl text-white/60">
          Add your educational background, skills, and languages
        </p>
      </motion.div>

      {/* Education Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <GraduationCap size={24} className="text-lime-400" />
            Education
          </h3>
          <button
            onClick={() => setShowAddEducation(true)}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Education
          </button>
        </div>

        <AnimatePresence>
          {state.cvData.education.map((education, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-base font-semibold text-white">Education {index + 1}</h4>
                <button
                  onClick={() => removeEducation(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={education.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="Enter institution name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Degree Type
                  </label>
                  <input
                    type="text"
                    value={education.studyType}
                    onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="e.g., Bachelor's, Master's"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={education.area}
                    onChange={(e) => updateEducation(index, 'area', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="e.g., Computer Science"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    GPA/Score
                  </label>
                  <input
                    type="text"
                    value={education.score}
                    onChange={(e) => updateEducation(index, 'score', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="e.g., 3.8/4.0"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={education.startDate}
                    onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={education.endDate}
                    onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddEducation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center p-6 border-2 border-dashed border-white/20 rounded-xl"
          >
            <p className="text-white/60 mb-4">Add your education</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={addEducation}
                className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-300 transition-colors"
              >
                Add Education
              </button>
              <button
                onClick={() => setShowAddEducation(false)}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Skills Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Star size={24} className="text-lime-400" />
            Skills
          </h3>
          <button
            onClick={() => setShowAddSkill(true)}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Skill
          </button>
        </div>

        <AnimatePresence>
          {state.cvData.skills.map((skill, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-base font-semibold text-white">Skill {index + 1}</h4>
                <button
                  onClick={() => removeSkill(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Skill Category
                  </label>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="e.g., Programming Languages"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Proficiency Level
                  </label>
                  <select
                    value={skill.level}
                    onChange={(e) => updateSkill(index, 'level', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  >
                    <option value="">Select level</option>
                    <option value="Expert">Expert</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Beginner">Beginner</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skill.keywords.join(', ')}
                  onChange={(e) => updateSkill(index, 'keywords', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  placeholder="e.g., JavaScript, React, Node.js"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddSkill && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center p-6 border-2 border-dashed border-white/20 rounded-xl"
          >
            <p className="text-white/60 mb-4">Add a new skill category</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={addSkill}
                className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-300 transition-colors"
              >
                Add Skill
              </button>
              <button
                onClick={() => setShowAddSkill(false)}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Languages Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Languages size={24} className="text-lime-400" />
            Languages
          </h3>
          <button
            onClick={() => setShowAddLanguage(true)}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Language
          </button>
        </div>

        <AnimatePresence>
          {state.cvData.languages.map((language, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-base font-semibold text-white">Language {index + 1}</h4>
                <button
                  onClick={() => removeLanguage(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Language
                  </label>
                  <input
                    type="text"
                    value={language.language}
                    onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                    placeholder="e.g., English"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Fluency Level
                  </label>
                  <select
                    value={language.fluency}
                    onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                  >
                    <option value="">Select fluency</option>
                    <option value="Native speaker">Native speaker</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Basic">Basic</option>
                  </select>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddLanguage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center p-6 border-2 border-dashed border-white/20 rounded-xl"
          >
            <p className="text-white/60 mb-4">Add a new language</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={addLanguage}
                className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-300 transition-colors"
              >
                Add Language
              </button>
              <button
                onClick={() => setShowAddLanguage(false)}
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
        transition={{ duration: 0.5, delay: 0.4 }}
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
          onClick={onNext}
          className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 flex items-center gap-2"
        >
          Complete Setup
          <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
