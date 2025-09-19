'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, User, Briefcase, GraduationCap, Award, Star, Upload, FileText, X, Trash2, Code } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface MasterCVCreationWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

const MasterCVCreationWizard: React.FC<MasterCVCreationWizardProps> = ({ onComplete, onBack }) => {
  const { state, dispatch } = useOnboarding();
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wizardSteps = [
    {
      id: 'upload',
      title: 'Upload CV',
      description: 'Upload your existing CV to auto-fill information',
      icon: Upload,
      component: CVUploadStep
    },
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
      id: 'projects',
      title: 'Projects',
      description: 'Your key projects and accomplishments',
      icon: Code,
      component: ProjectsStep
    },
    {
      id: 'skills',
      title: 'Skills & Achievements',
      description: 'Your key skills and accomplishments',
      icon: Award,
      component: SkillsStep
    }
  ];

  // Helper function to format dates for month input (YYYY-MM format) - from CVUpload
  const asMonth = (value: any): string => {
    if (!value || typeof value !== 'string') {
      console.log('🔍 asMonth: Invalid input:', value, 'type:', typeof value);
      return '';
    }
    const trimmed = value.trim();
    console.log('🔍 asMonth processing:', trimmed);
    
    // Accept YYYY-MM, YYYY-MM-DD, YYYY
    const yyyyMm = trimmed.match(/^\d{4}-(0[1-9]|1[0-2])$/);
    if (yyyyMm) {
      console.log('✅ asMonth: YYYY-MM format:', yyyyMm[0]);
      return yyyyMm[0];
    }
    const yyyyMmDd = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    if (yyyyMmDd) {
      const result = `${yyyyMmDd[1]}-${yyyyMmDd[2]}`;
      console.log('✅ asMonth: YYYY-MM-DD format:', trimmed, '->', result);
      return result;
    }
    const yyyy = trimmed.match(/^(\d{4})$/);
    if (yyyy) {
      const result = `${yyyy[1]}-01`;
      console.log('✅ asMonth: YYYY format:', trimmed, '->', result);
      return result;
    }
    
    // Try to parse other common date formats
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const result = `${year}-${month}`;
        console.log('✅ asMonth: Parsed date:', trimmed, '->', result);
        return result;
      }
    } catch (error) {
      console.log('❌ asMonth: Failed to parse date:', trimmed, error);
    }
    
    console.log('❌ asMonth: No match for:', trimmed);
    return '';
  };

  const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, 1000);
  };

  const splitName = (fullName: string): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1).join('') };
  };

  const mapParsedDataToForm = (data: any) => {
    console.log('🔍 MasterCVCreationWizard - Mapping parsed data:', data);
    
    // Handle direct parsing API structure (CVData interface)
    if (data.personalInfo && data.education && data.experience && data.skills && data.projects) {
      return data; // Already in correct format
    }
    
    // Map from universal CV schema to form schema
    const basics = data.basics || {};
    const profiles: Array<any> = Array.isArray(basics.profiles) ? basics.profiles : [];
    const linkedIn = profiles.find(p => String(p.network || '').toLowerCase().includes('linkedin'))?.url || '';
    const github = profiles.find(p => String(p.network || '').toLowerCase().includes('github'))?.url || '';
    const name = splitName(basics.name || '');

    // Map education with proper field mapping
    const education = Array.isArray(data.education) ? data.education.map((e: any) => ({
      institution: sanitizeString(e?.institution || ''),
      degree: sanitizeString(e?.studyType || ''),
      field: sanitizeString(e?.area || ''),
      location: sanitizeString(''),
      startDate: asMonth(e?.startDate),
      endDate: asMonth(e?.endDate),
      current: !e?.endDate || e?.endDate === '',
      gpa: sanitizeString(e?.score || ''),
      description: sanitizeString('')
    })) : [];

    // Map work experience with proper field mapping
    const experience = Array.isArray(data.work) ? data.work.map((w: any) => ({
      company: sanitizeString(w?.name || ''),
      position: sanitizeString(w?.position || ''),
      location: sanitizeString(''),
      startDate: asMonth(w?.startDate),
      endDate: asMonth(w?.endDate),
      current: !w?.endDate || w?.endDate === '',
      description: sanitizeString(w?.summary || ''),
      achievements: Array.isArray(w?.highlights) ? w.highlights.map(sanitizeString).filter(Boolean) : []
    })) : [];

    // Map skills with proper field mapping
    const skills = Array.isArray(data.skills) ? data.skills.map((s: any) => ({
      category: sanitizeString(s?.name || 'Skills'),
      skills: Array.isArray(s?.keywords) ? s.keywords.map(sanitizeString).filter(Boolean) : []
    })).filter(skill => skill.category && skill.skills.length > 0) : [];

    // Map projects with proper field mapping
    const projects = Array.isArray(data.projects) ? data.projects.map((p: any) => ({
      title: sanitizeString(p?.name || ''),
      description: sanitizeString(p?.description || ''),
      technologies: Array.isArray(p?.highlights) ? p.highlights.map(sanitizeString).filter(Boolean) : [],
      url: sanitizeString(p?.url || ''),
      github: sanitizeString(''),
      startDate: asMonth(p?.startDate),
      endDate: asMonth(p?.endDate),
      current: !p?.endDate || p?.endDate === ''
    })).filter(project => project.title) : [];

    return {
      personalInfo: {
        firstName: name.firstName,
        lastName: name.lastName,
        email: sanitizeString(basics.email || ''),
        phone: sanitizeString(basics.phone || ''),
        location: sanitizeString(basics.location?.city || ''),
        website: sanitizeString(basics.url || ''),
        linkedin: sanitizeString(linkedIn),
        github: sanitizeString(github),
        summary: sanitizeString(basics.summary || '')
      },
      education,
      experience,
      skills,
      projects
    };
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse CV');
      }
      
      const result = await response.json();
      console.log('🔍 MasterCVCreationWizard - CV parsing result:', result);
      
      if (result.personalInfo || result.basics) {
        // Map the parsed data to our form structure
        const mappedData = mapParsedDataToForm(result);
        console.log('🔍 MasterCVCreationWizard - Mapped data:', mappedData);
        
        // Update the onboarding context with parsed information
        dispatch({
          type: 'SET_CV_DATA',
          payload: {
            ...state.cvData,
            basics: {
              ...state.cvData.basics,
              name: mappedData.personalInfo.firstName + ' ' + mappedData.personalInfo.lastName,
              email: mappedData.personalInfo.email,
              phone: mappedData.personalInfo.phone,
              summary: mappedData.personalInfo.summary,
              url: mappedData.personalInfo.website,
              location: {
                ...state.cvData.basics.location,
                city: mappedData.personalInfo.location
              }
            },
            work: mappedData.experience.map((exp: any) => ({
              name: exp.company,
              position: exp.position,
              startDate: exp.startDate,
              endDate: exp.endDate,
              summary: exp.description,
              highlights: exp.achievements
            })),
            education: mappedData.education.map((edu: any) => ({
              institution: edu.institution,
              studyType: edu.degree,
              area: edu.field,
              startDate: edu.startDate,
              endDate: edu.endDate,
              score: edu.gpa
            })),
            projects: mappedData.projects.map((proj: any) => ({
              name: proj.title,
              description: proj.description,
              startDate: proj.startDate,
              endDate: proj.endDate,
              highlights: proj.technologies,
              url: proj.url
            })),
            skills: mappedData.skills.map((skill: any) => ({
              name: skill.category,
              keywords: skill.skills
            }))
          }
        });
        
        setShowUpload(false);
        console.log('✅ MasterCVCreationWizard - CV data updated successfully');
      } else {
        setUploadError('Failed to parse CV data');
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      setUploadError(error instanceof Error ? error.message : 'An error occurred while parsing the CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

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
              {currentWizardStep === 0 ? (
                <CVUploadStep
                  isUploading={isUploading}
                  uploadError={uploadError}
                  showUpload={showUpload}
                  setShowUpload={setShowUpload}
                  handleFileSelect={handleFileSelect}
                  fileInputRef={fileInputRef}
                />
              ) : (
                <CurrentStepComponent />
              )}
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

  // Initialize with one empty experience if none exist
  React.useEffect(() => {
    if (state.cvData.work.length === 0) {
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
          work: [newExperience]
        }
      });
    }
  }, []);

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

  const removeExperience = (index: number) => {
    if (state.cvData.work.length > 1) {
      const updatedWork = state.cvData.work.filter((_, i) => i !== index);
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          work: updatedWork
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Work Experience</h2>
        <p className="text-white/60">Add your professional experience</p>
      </div>

      {state.cvData.work.map((experience, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">Experience {index + 1}</h3>
            {state.cvData.work.length > 1 && (
              <button
                onClick={() => removeExperience(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove experience"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Company</label>
              <input
                type="text"
                value={experience.name || ''}
                onChange={(e) => updateExperience(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Position</label>
              <input
                type="text"
                value={experience.position || ''}
                onChange={(e) => updateExperience(index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Job title"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Start Date</label>
              <input
                type="month"
                value={experience.startDate || ''}
                onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">End Date</label>
              <input
                type="month"
                value={experience.endDate || ''}
                onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Leave empty if current job"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Job Description</label>
            <textarea
              value={experience.summary || ''}
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

  // Initialize with one empty education if none exist
  React.useEffect(() => {
    if (state.cvData.education.length === 0) {
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
          education: [newEducation]
        }
      });
    }
  }, []);

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

  const removeEducation = (index: number) => {
    if (state.cvData.education.length > 1) {
      const updatedEducation = state.cvData.education.filter((_, i) => i !== index);
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          education: updatedEducation
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Education</h2>
        <p className="text-white/60">Add your educational background</p>
      </div>

      {state.cvData.education.map((education, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">Education {index + 1}</h3>
            {state.cvData.education.length > 1 && (
              <button
                onClick={() => removeEducation(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove education"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Institution</label>
              <input
                type="text"
                value={education.institution || ''}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="University or school name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Degree</label>
              <input
                type="text"
                value={education.studyType || ''}
                onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., Bachelor's, Master's"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Field of Study</label>
              <input
                type="text"
                value={education.area || ''}
                onChange={(e) => updateEducation(index, 'area', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., Computer Science, Business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">GPA/Grade (Optional)</label>
              <input
                type="text"
                value={education.score || ''}
                onChange={(e) => updateEducation(index, 'score', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., 3.8/4.0, First Class"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Start Date</label>
              <input
                type="month"
                value={education.startDate || ''}
                onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">End Date</label>
              <input
                type="month"
                value={education.endDate || ''}
                onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Leave empty if current"
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

const ProjectsStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  // Initialize with one empty project if none exist
  React.useEffect(() => {
    if (state.cvData.projects.length === 0) {
      const newProject = {
        name: '',
        startDate: '',
        endDate: '',
        description: '',
        highlights: [''],
        url: ''
      };

      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          projects: [newProject]
        }
      });
    }
  }, []);

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
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        projects: [...state.cvData.projects, newProject]
      }
    });
  };

  const updateProject = (index: number, field: string, value: string | string[]) => {
    const updatedProjects = [...state.cvData.projects];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        projects: updatedProjects
      }
    });
  };

  const removeProject = (index: number) => {
    if (state.cvData.projects.length > 1) {
      const updatedProjects = state.cvData.projects.filter((_, i) => i !== index);
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          projects: updatedProjects
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Projects</h2>
        <p className="text-white/60">Add your key projects and accomplishments</p>
      </div>

      {state.cvData.projects.map((project, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">Project {index + 1}</h3>
            {state.cvData.projects.length > 1 && (
              <button
                onClick={() => removeProject(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove project"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Project Name</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Project title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Project URL (Optional)</label>
              <input
                type="url"
                value={project.url || ''}
                onChange={(e) => updateProject(index, 'url', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="https://project-url.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Start Date</label>
              <input
                type="month"
                value={project.startDate || ''}
                onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">End Date</label>
              <input
                type="month"
                value={project.endDate || ''}
                onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Leave empty if ongoing"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Project Description</label>
            <textarea
              value={project.description || ''}
              onChange={(e) => updateProject(index, 'description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
              placeholder="Describe the project, your role, and key achievements..."
            />
          </div>
        </div>
      ))}

      <motion.button
        onClick={addProject}
        className="w-full py-3 border-2 border-dashed border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 rounded-lg transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        + Add Project
      </motion.button>
    </div>
  );
};

const SkillsStep: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  // Initialize with one empty skill category if none exist
  React.useEffect(() => {
    if (state.cvData.skills.length === 0) {
      const newSkill = {
        name: 'Technical Skills',
        level: 'Intermediate',
        keywords: ['']
      };

      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          skills: [newSkill]
        }
      });
    }
  }, []);

  const addSkill = () => {
    const newSkill = {
      name: '',
      level: 'Intermediate',
      keywords: ['']
    };

    dispatch({
      type: 'SET_CV_DATA',
      payload: {
        ...state.cvData,
        skills: [...state.cvData.skills, newSkill]
      }
    });
  };

  const updateSkill = (index: number, field: string, value: string | string[]) => {
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

  const removeSkill = (index: number) => {
    if (state.cvData.skills.length > 1) {
      const updatedSkills = state.cvData.skills.filter((_, i) => i !== index);
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          skills: updatedSkills
        }
      });
    }
  };

  const addKeywordToSkill = (skillIndex: number) => {
    const updatedSkills = [...state.cvData.skills];
    updatedSkills[skillIndex].keywords = [...updatedSkills[skillIndex].keywords, ''];
    updateSkill(skillIndex, 'keywords', updatedSkills[skillIndex].keywords);
  };

  const updateKeyword = (skillIndex: number, keywordIndex: number, value: string) => {
    const updatedSkills = [...state.cvData.skills];
    updatedSkills[skillIndex].keywords[keywordIndex] = value;
    updateSkill(skillIndex, 'keywords', updatedSkills[skillIndex].keywords);
  };

  const removeKeyword = (skillIndex: number, keywordIndex: number) => {
    const updatedSkills = [...state.cvData.skills];
    if (updatedSkills[skillIndex].keywords.length > 1) {
      updatedSkills[skillIndex].keywords = updatedSkills[skillIndex].keywords.filter((_, i) => i !== keywordIndex);
      updateSkill(skillIndex, 'keywords', updatedSkills[skillIndex].keywords);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Skills & Expertise</h2>
        <p className="text-white/60">Highlight your key skills and competencies</p>
      </div>

      {state.cvData.skills.map((skill, index) => (
        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">Skill Category {index + 1}</h3>
            {state.cvData.skills.length > 1 && (
              <button
                onClick={() => removeSkill(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove skill category"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category Name</label>
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => updateSkill(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="e.g., Technical Skills, Soft Skills"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Proficiency Level</label>
              <select
                value={skill.level || 'Intermediate'}
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
          <div>
            <label className="block text-sm font-medium text-white mb-2">Skills</label>
            <div className="space-y-2">
              {(skill.keywords || ['']).map((keyword, keywordIndex) => (
                <div key={keywordIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={keyword || ''}
                    onChange={(e) => updateKeyword(index, keywordIndex, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    placeholder="e.g., JavaScript, React, Node.js"
                  />
                  {(skill.keywords || []).length > 1 && (
                    <button
                      onClick={() => removeKeyword(index, keywordIndex)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Remove skill"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addKeywordToSkill(index)}
                className="flex items-center gap-2 px-3 py-2 text-lime-400 hover:text-lime-300 transition-colors text-sm"
              >
                + Add Skill
              </button>
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
        + Add Skill Category
      </motion.button>
    </div>
  );
};

// CV Upload Step Component
const CVUploadStep: React.FC<{
  isUploading: boolean;
  uploadError: string;
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}> = ({ isUploading, uploadError, showUpload, setShowUpload, handleFileSelect, fileInputRef }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Your CV</h2>
        <p className="text-white/60">Upload your existing CV to automatically fill in your details</p>
      </div>

      {!showUpload ? (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <FileText size={40} className="text-lime-400" />
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25"
            >
              Upload CV
            </button>
            
            <button
              onClick={() => setShowUpload(false)}
              className="text-white/60 hover:text-white transition-colors text-lg font-medium flex items-center gap-2 mx-auto"
            >
              Or start from scratch →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
            <Upload size={48} className="text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Choose CV File</h3>
            <p className="text-white/60 mb-4">Supports PDF, DOCX, and image files</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-lime-400 text-black px-6 py-3 rounded-lg font-medium hover:bg-lime-300 transition-colors"
            >
              Select File
            </button>
          </div>

          {uploadError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <X size={16} />
                {uploadError}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="p-4 bg-lime-500/10 border border-lime-500/20 rounded-lg text-lime-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lime-400"></div>
                Processing your CV...
              </div>
            </div>
          )}

          <button
            onClick={() => setShowUpload(false)}
            className="text-white/60 hover:text-white transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
          >
            ← Back to options
          </button>
        </div>
      )}
    </div>
  );
};

export default MasterCVCreationWizard;