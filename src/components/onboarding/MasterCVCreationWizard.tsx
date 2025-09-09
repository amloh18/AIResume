'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, User, Briefcase, GraduationCap, Award, Star } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface MasterCVCreationWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

const MasterCVCreationWizard: React.FC<MasterCVCreationWizardProps> = ({ onComplete, onBack }) => {
  const { state, dispatch } = useOnboarding();
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const wizardSteps = [
    {
      id: 'personal',
      title: 'Personal Details',
      description: 'Basic information about you',
      icon: User,
      component: PersonalDetailsStep
    },
    {
      id: 'experience',
      title: 'Work Experience',
      description: 'Your professional background',
      icon: Briefcase,
      component: ExperienceStep
    },
    {
      id: 'education',
      title: 'Education',
      description: 'Your educational background',
      icon: GraduationCap,
      component: EducationStep
    },
    {
      id: 'skills',
      title: 'Skills & Achievements',
      description: 'Your key skills and accomplishments',
      icon: Award,
      component: SkillsStep
    }
  ];

  const handleNext = () => {
    if (currentWizardStep < wizardSteps.length - 1) {
      setCurrentWizardStep(currentWizardStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentWizardStep > 0) {
      setCurrentWizardStep(currentWizardStep - 1);
    } else {
      onBack();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Mark CV data as master CV
      dispatch({ 
        type: 'SET_CV_DATA', 
        payload: { 
          ...state.cvData,
          isMaster: true 
        } 
      });
      onComplete();
    } catch (error) {
      console.error('Error completing master CV creation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CurrentStepComponent = wizardSteps[currentWizardStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="flex items-center justify-center gap-2 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Star className="h-6 w-6 text-lime-400" />
            <h1 className="text-3xl font-bold text-white">Create Your Master CV</h1>
            <Star className="h-6 w-6 text-lime-400" />
          </motion.div>
          <motion.p
            className="text-white/60 text-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            This will be your comprehensive CV that you can duplicate and customize for specific jobs
          </motion.p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {wizardSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                  index === currentWizardStep
                    ? 'bg-lime-500/20 border border-lime-500/30'
                    : index < currentWizardStep
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === currentWizardStep
                      ? 'bg-lime-400 text-black'
                      : index < currentWizardStep
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white/60'
                  }`}
                >
                  {index < currentWizardStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-white">{step.title}</div>
                  <div className="text-xs text-white/60">{step.description}</div>
                </div>
              </motion.div>
              {index < wizardSteps.length - 1 && (
                <div className="w-8 h-0.5 bg-white/20 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <motion.div
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWizardStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <motion.button
              onClick={handlePrevious}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft className="h-4 w-4" />
              {currentWizardStep === 0 ? 'Back' : 'Previous'}
            </motion.button>

            <div className="text-center">
              <div className="text-sm text-white/60">
                Step {currentWizardStep + 1} of {wizardSteps.length}
              </div>
              <div className="text-xs text-white/40 mt-1">
                {wizardSteps[currentWizardStep].title}
              </div>
            </div>

            <motion.button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Creating...
                </>
              ) : currentWizardStep === wizardSteps.length - 1 ? (
                <>
                  Complete Master CV
                  <CheckCircle className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Step Components
const PersonalDetailsStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  const updatePersonalInfo = (field: string, value: string) => {
    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        basics: {
          ...state.cvData.basics,
          [field]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Personal Information</h2>
        <p className="text-white/60">Let's start with your basic details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Full Name</label>
          <input
            type="text"
            value={state.cvData.basics.name}
            onChange={(e) => updatePersonalInfo('name', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Professional Title</label>
          <input
            type="text"
            value={state.cvData.basics.label}
            onChange={(e) => updatePersonalInfo('label', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
            placeholder="e.g., Software Engineer, Marketing Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Email</label>
          <input
            type="email"
            value={state.cvData.basics.email}
            onChange={(e) => updatePersonalInfo('email', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Phone</label>
          <input
            type="tel"
            value={state.cvData.basics.phone}
            onChange={(e) => updatePersonalInfo('phone', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Professional Summary</label>
        <textarea
          value={state.cvData.basics.summary}
          onChange={(e) => updatePersonalInfo('summary', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent resize-none"
          placeholder="A brief summary of your professional background and key strengths..."
        />
      </div>
    </div>
  );
};

const ExperienceStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  const addExperience = () => {
    const newExperience = {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: ['']
    };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        work: [...state.cvData.work, newExperience]
      }
    });
  };

  const updateExperience = (index: number, field: string, value: string | string[]) => {
    const updatedWork = [...state.cvData.work];
    updatedWork[index] = { ...updatedWork[index], [field]: value };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        work: updatedWork
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Work Experience</h2>
        <p className="text-white/60">Add your professional experience</p>
      </div>

      {state.cvData.work.map((experience, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Company</label>
              <input
                type="text"
                value={experience.name}
                onChange={(e) => updateExperience(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Position</label>
              <input
                type="text"
                value={experience.position}
                onChange={(e) => updateExperience(index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Job title"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Description</label>
            <textarea
              value={experience.summary}
              onChange={(e) => updateExperience(index, 'summary', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
              placeholder="Describe your role and responsibilities..."
            />
          </div>
        </div>
      ))}

      <motion.button
        onClick={addExperience}
        className="w-full py-3 border-2 border-dashed border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 rounded-lg transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        + Add Work Experience
      </motion.button>
    </div>
  );
};

const EducationStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

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

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        education: [...state.cvData.education, newEducation]
      }
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updatedEducation = [...state.cvData.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        education: updatedEducation
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Education</h2>
        <p className="text-white/60">Add your educational background</p>
      </div>

      {state.cvData.education.map((education, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Institution</label>
              <input
                type="text"
                value={education.institution}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="University or school name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Degree</label>
              <input
                type="text"
                value={education.studyType}
                onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., Bachelor's, Master's"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Field of Study</label>
              <input
                type="text"
                value={education.area}
                onChange={(e) => updateEducation(index, 'area', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., Computer Science, Business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">GPA/Grade (Optional)</label>
              <input
                type="text"
                value={education.score}
                onChange={(e) => updateEducation(index, 'score', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., 3.8/4.0, First Class"
              />
            </div>
          </div>
        </div>
      ))}

      <motion.button
        onClick={addEducation}
        className="w-full py-3 border-2 border-dashed border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 rounded-lg transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        + Add Education
      </motion.button>
    </div>
  );
};

const SkillsStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  const addSkill = () => {
    const newSkill = {
      name: '',
      level: 'Intermediate',
      keywords: []
    };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        skills: [...state.cvData.skills, newSkill]
      }
    });
  };

  const updateSkill = (index: number, field: string, value: string) => {
    const updatedSkills = [...state.cvData.skills];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        skills: updatedSkills
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Skills & Expertise</h2>
        <p className="text-white/60">Highlight your key skills and competencies</p>
      </div>

      {state.cvData.skills.map((skill, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Skill/Technology</label>
              <input
                type="text"
                value={skill.name}
                onChange={(e) => updateSkill(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., JavaScript, Project Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Proficiency Level</label>
              <select
                value={skill.level}
                onChange={(e) => updateSkill(index, 'level', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
        </div>
      ))}

      <motion.button
        onClick={addSkill}
        className="w-full py-3 border-2 border-dashed border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 rounded-lg transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        + Add Skill
      </motion.button>
    </div>
  );
};

export default MasterCVCreationWizard;