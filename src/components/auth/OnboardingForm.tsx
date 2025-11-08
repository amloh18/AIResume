'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Linkedin,
  Github,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Plus,
  Edit3,
  Eye,
  Save,
  Star,
  PlusCircle,
  Upload,
  FileText
} from 'lucide-react';
import CVUpload from '@/components/cv-parser/CVUpload';

interface OnboardingFormProps {
  isOpen: boolean;
  onComplete: (data: any) => void;
  onBack: () => void;
  userData: any;
  selectedRole: 'student' | 'professional' | 'recruiter' | null;
}

interface CVFormData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    summary: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    gpa: string;
    description: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  skills: Array<{
    category: string;
    skills: string[];
  }>;
  projects: Array<{
    title: string;
    description: string;
    technologies: string[];
    url: string;
    github: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
}

type OnboardingStep = 'upload' | 'form' | 'complete';

const OnboardingForm: React.FC<OnboardingFormProps> = ({
  isOpen,
  onComplete,
  onBack,
  userData,
  selectedRole
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('upload');
  const [currentSection, setCurrentSection] = useState(0);
  const [cvData, setCvData] = useState<any>(null);
  const [formData, setFormData] = useState<CVFormData>({
    personalInfo: {
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: [],
    projects: []
  });

  const sections = [
    { id: 'personal', title: 'Personal Info', icon: User, color: 'from-blue-400 to-blue-600' },
    { id: 'education', title: 'Education', icon: GraduationCap, color: 'from-green-400 to-green-600' },
    { id: 'experience', title: 'Experience', icon: Briefcase, color: 'from-purple-400 to-purple-600' },
    { id: 'skills', title: 'Skills', icon: Star, color: 'from-yellow-400 to-yellow-600' },
    { id: 'projects', title: 'Projects', icon: Globe, color: 'from-red-400 to-red-600' }
  ];

  useEffect(() => {
    if (cvData) {
      console.log('OnboardingForm received cvData:', cvData);
      
      // Handle the data structure properly
      const updatedFormData = { ...formData };
      
      // Handle personal info
      if (cvData.personalInfo && typeof cvData.personalInfo === 'object') {
        updatedFormData.personalInfo = {
          ...updatedFormData.personalInfo,
          ...cvData.personalInfo
        };
      }
      
      // Handle other sections
      if (cvData.education && Array.isArray(cvData.education)) {
        updatedFormData.education = cvData.education;
      }
      
      if (cvData.experience && Array.isArray(cvData.experience)) {
        updatedFormData.experience = cvData.experience;
      }
      
      if (cvData.skills && Array.isArray(cvData.skills)) {
        updatedFormData.skills = cvData.skills;
      }
      
      if (cvData.projects && Array.isArray(cvData.projects)) {
        updatedFormData.projects = cvData.projects;
      }
      
      setFormData(updatedFormData);
    }
  }, [cvData]);

  const handleCVParsed = (parsedData: any) => {
    console.log('OnboardingForm: handleCVParsed called with:', parsedData);
    setCvData(parsedData);
    setCurrentStep('form');
  };

  const handleSkipUpload = () => {
    setCurrentStep('form');
  };

  const updateFormData = (section: keyof CVFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const addEducation = () => {
    const newEducation = {
      institution: '',
      degree: '',
      field: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, newEducation]
    }));
  };

  const addExperience = () => {
    const newExperience = {
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: ['']
    };
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, newExperience]
    }));
  };

  const addSkillCategory = () => {
    const newCategory = {
      category: '',
      skills: ['']
    };
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, newCategory]
    }));
  };

  const addProject = () => {
    const newProject = {
      title: '',
      description: '',
      technologies: [''],
      url: '',
      github: '',
      startDate: '',
      endDate: '',
      current: false
    };
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, newProject]
    }));
  };

  const handleComplete = () => {
    setCurrentStep('complete');
    // Auto-complete after a short delay
    setTimeout(() => {
      onComplete(formData);
    }, 2000);
  };

  const handleBack = () => {
    if (currentStep === 'form') {
      if (currentSection > 0) {
        setCurrentSection(currentSection - 1);
      } else {
        setCurrentStep('upload');
      }
    } else if (currentStep === 'upload') {
      onBack();
    }
  };

  const canProceed = () => {
    if (currentStep === 'form') {
      // Check if current section has required fields
      const currentSectionData = sections[currentSection];
      if (currentSectionData.id === 'personal') {
        return formData.personalInfo.firstName && formData.personalInfo.lastName && formData.personalInfo.email;
      }
      return true; // Other sections are optional
    }
    return false;
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
          <input
            type="text"
            value={formData.personalInfo.firstName}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, firstName: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
          <input
            type="text"
            value={formData.personalInfo.lastName}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, lastName: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={formData.personalInfo.email}
          onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, email: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={formData.personalInfo.phone}
          onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, phone: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
          placeholder="Enter your phone number"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
        <input
          type="text"
          value={formData.personalInfo.location}
          onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, location: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
          placeholder="City, Country"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Professional Summary</label>
        <textarea
          value={formData.personalInfo.summary}
          onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, summary: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 resize-none"
          rows={4}
          placeholder="Tell us about your background, experience, and career goals..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Website (Optional)</label>
          <input
            type="url"
            value={formData.personalInfo.website}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, website: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
            placeholder="https://yourwebsite.com"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">LinkedIn (Optional)</label>
          <input
            type="url"
            value={formData.personalInfo.linkedin}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, linkedin: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">GitHub (Optional)</label>
          <input
            type="url"
            value={formData.personalInfo.github}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, github: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
            placeholder="https://github.com/yourusername"
          />
        </div>
      </div>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-6">
      {formData.education.length === 0 ? (
        <div className="text-center py-8">
          <GraduationCap size={48} className="text-white/40 mx-auto mb-4" />
          <p className="text-white/60 mb-4">No education entries yet</p>
          <button
            onClick={addEducation}
            className="bg-lime-400/20 text-lime-400 px-4 py-2 rounded-lg hover:bg-lime-400/30 transition-colors"
          >
            Add Education
          </button>
        </div>
      ) : (
        <>
          {formData.education.map((edu, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Institution</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].institution = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="University/College name"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Degree</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].degree = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="e.g., Bachelor's, Master's"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Field of Study</label>
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].field = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={edu.location}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].location = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="month"
                    value={edu.startDate}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].startDate = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                  <input
                    type="month"
                    value={edu.endDate}
                    onChange={(e) => {
                      const updatedEducation = [...formData.education];
                      updatedEducation[index].endDate = e.target.value;
                      updateFormData('education', updatedEducation);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    disabled={edu.current}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={edu.description}
                  onChange={(e) => {
                    const updatedEducation = [...formData.education];
                    updatedEducation[index].description = e.target.value;
                    updateFormData('education', updatedEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 resize-none"
                  rows={3}
                  placeholder="Brief description of your studies, achievements, or relevant coursework..."
                />
              </div>
            </div>
          ))}
          <button
            onClick={addEducation}
            className="w-full bg-lime-400/20 text-lime-400 px-4 py-3 rounded-xl hover:bg-lime-400/30 transition-colors border border-lime-400/30"
          >
            <Plus size={20} className="inline mr-2" />
            Add Another Education
          </button>
        </>
      )}
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-6">
      {formData.experience.length === 0 ? (
        <div className="text-center py-8">
          <Briefcase size={48} className="text-white/40 mx-auto mb-4" />
          <p className="text-white/60 mb-4">No work experience entries yet</p>
          <button
            onClick={addExperience}
            className="bg-lime-400/20 text-lime-400 px-4 py-2 rounded-lg hover:bg-lime-400/30 transition-colors"
          >
            Add Experience
          </button>
        </div>
      ) : (
        <>
          {formData.experience.map((exp, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => {
                      const updatedExperience = [...formData.experience];
                      updatedExperience[index].company = e.target.value;
                      updateFormData('experience', updatedExperience);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => {
                      const updatedExperience = [...formData.experience];
                      updatedExperience[index].position = e.target.value;
                      updateFormData('experience', updatedExperience);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={exp.location}
                    onChange={(e) => {
                      const updatedExperience = [...formData.experience];
                      updatedExperience[index].location = e.target.value;
                      updateFormData('experience', updatedExperience);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => {
                      const updatedExperience = [...formData.experience];
                      updatedExperience[index].startDate = e.target.value;
                      updateFormData('experience', updatedExperience);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                  <input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => {
                      const updatedExperience = [...formData.experience];
                      updatedExperience[index].endDate = e.target.value;
                      updateFormData('experience', updatedExperience);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    disabled={exp.current}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-white/80 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => {
                        const updatedExperience = [...formData.experience];
                        updatedExperience[index].current = e.target.checked;
                        updateFormData('experience', updatedExperience);
                      }}
                      className="mr-2"
                    />
                    Currently working here
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => {
                    const updatedExperience = [...formData.experience];
                    updatedExperience[index].description = e.target.value;
                    updateFormData('experience', updatedExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 resize-none"
                  rows={3}
                  placeholder="Describe your role, responsibilities, and achievements..."
                />
              </div>
            </div>
          ))}
          <button
            onClick={addExperience}
            className="w-full bg-lime-400/20 text-lime-400 px-4 py-3 rounded-xl hover:bg-lime-400/30 transition-colors border border-lime-400/30"
          >
            <Plus size={20} className="inline mr-2" />
            Add Another Experience
          </button>
        </>
      )}
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-6">
      {formData.skills.length === 0 ? (
        <div className="text-center py-8">
          <Star size={48} className="text-white/40 mx-auto mb-4" />
          <p className="text-white/60 mb-4">No skills added yet</p>
          <button
            onClick={addSkillCategory}
            className="bg-lime-400/20 text-lime-400 px-4 py-2 rounded-lg hover:bg-lime-400/30 transition-colors"
          >
            Add Skills
          </button>
        </div>
      ) : (
        <>
          {formData.skills.map((skillCategory, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="mb-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={skillCategory.category}
                  onChange={(e) => {
                    const updatedSkills = [...formData.skills];
                    updatedSkills[index].category = e.target.value;
                    updateFormData('skills', updatedSkills);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                  placeholder="e.g., Programming Languages, Tools, Soft Skills"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
                {skillCategory.skills.map((skill, skillIndex) => (
                  <div key={skillIndex} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => {
                        const updatedSkills = [...formData.skills];
                        updatedSkills[index].skills[skillIndex] = e.target.value;
                        updateFormData('skills', updatedSkills);
                      }}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                      placeholder="Skill name"
                    />
                    <button
                      onClick={() => {
                        const updatedSkills = [...formData.skills];
                        updatedSkills[index].skills.splice(skillIndex, 1);
                        updateFormData('skills', updatedSkills);
                      }}
                      className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updatedSkills = [...formData.skills];
                    updatedSkills[index].skills.push('');
                    updateFormData('skills', updatedSkills);
                  }}
                  className="w-full bg-lime-400/20 text-lime-400 px-4 py-3 rounded-xl hover:bg-lime-400/30 transition-colors border border-lime-400/30"
                >
                  <Plus size={20} className="inline mr-2" />
                  Add Skill
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addSkillCategory}
            className="w-full bg-lime-400/20 text-lime-400 px-4 py-3 rounded-xl hover:bg-lime-400/30 transition-colors border border-lime-400/30"
          >
            <Plus size={20} className="inline mr-2" />
            Add Another Skill Category
          </button>
        </>
      )}
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      {formData.projects.length === 0 ? (
        <div className="text-center py-8">
          <Globe size={48} className="text-white/40 mx-auto mb-4" />
          <p className="text-white/60 mb-4">No projects added yet</p>
          <button
            onClick={addProject}
            className="bg-lime-400/20 text-lime-400 px-4 py-2 rounded-lg hover:bg-lime-400/30 transition-colors"
          >
            Add Project
          </button>
        </div>
      ) : (
        <>
          {formData.projects.map((project, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Project Title</label>
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => {
                      const updatedProjects = [...formData.projects];
                      updatedProjects[index].title = e.target.value;
                      updateFormData('projects', updatedProjects);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Technologies</label>
                  <input
                    type="text"
                    value={project.technologies.join(', ')}
                    onChange={(e) => {
                      const updatedProjects = [...formData.projects];
                      updatedProjects[index].technologies = e.target.value.split(',').map(t => t.trim());
                      updateFormData('projects', updatedProjects);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="React, Node.js, MongoDB"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Project URL</label>
                  <input
                    type="url"
                    value={project.url}
                    onChange={(e) => {
                      const updatedProjects = [...formData.projects];
                      updatedProjects[index].url = e.target.value;
                      updateFormData('projects', updatedProjects);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="https://project-url.com"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">GitHub URL</label>
                  <input
                    type="url"
                    value={project.github}
                    onChange={(e) => {
                      const updatedProjects = [...formData.projects];
                      updatedProjects[index].github = e.target.value;
                      updateFormData('projects', updatedProjects);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                    placeholder="https://github.com/username/project"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={project.description}
                  onChange={(e) => {
                    const updatedProjects = [...formData.projects];
                    updatedProjects[index].description = e.target.value;
                    updateFormData('projects', updatedProjects);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 resize-none"
                  rows={3}
                  placeholder="Describe your project, its features, and your role..."
                />
              </div>
            </div>
          ))}
          <button
            onClick={addProject}
            className="w-full bg-lime-400/20 text-lime-400 px-4 py-3 rounded-xl hover:bg-lime-400/30 transition-colors border border-lime-400/30"
          >
            <Plus size={20} className="inline mr-2" />
            Add Another Project
          </button>
        </>
      )}
    </div>
  );

  const renderSection = () => {
    const currentSectionData = sections[currentSection];
    switch (currentSectionData.id) {
      case 'personal':
        return renderPersonalInfo();
      case 'education':
        return renderEducation();
      case 'experience':
        return renderExperience();
      case 'skills':
        return renderSkills();
      case 'projects':
        return renderProjects();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-6xl bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Complete Your CV</h2>
              <p className="text-white/60">
                {currentStep === 'upload' && 'Upload your existing CV or start from scratch'}
                {currentStep === 'form' && `Fill in your ${sections[currentSection].title.toLowerCase()}`}
                {currentStep === 'complete' && 'Setting up your account...'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {currentStep === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400/20 to-lime-500/20 flex items-center justify-center">
                      <Upload size={48} className="text-lime-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Upload Your CV</h3>
                    <p className="text-white/60">Upload your existing CV to automatically fill in the form, or start from scratch</p>
                  </div>
                  
                  <CVUpload
                    onCVParsed={handleCVParsed}
                    onClose={() => {}}
                  />
                  
                  <div className="text-center">
                    <button
                      onClick={handleSkipUpload}
                      className="text-lime-400 hover:text-lime-300 transition-colors"
                    >
                      Or start from scratch →
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Section Navigation */}
                  <div className="flex items-center justify-center gap-4 mb-8">
                    {sections.map((section, index) => (
                      <div key={section.id} className="flex items-center">
                        <button
                          onClick={() => setCurrentSection(index)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                            currentSection === index
                              ? 'bg-lime-400 text-black'
                              : index < currentSection
                              ? 'bg-green-500 text-white'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {index < currentSection ? (
                            <CheckCircle size={16} />
                          ) : (
                            <section.icon size={16} />
                          )}
                        </button>
                        {index < sections.length - 1 && (
                          <div
                            className={`w-8 h-1 transition-all duration-300 ${
                              index < currentSection ? 'bg-green-500' : 'bg-white/10'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Section Content */}
                  <div className="min-h-[400px]">
                    {renderSection()}
                  </div>
                </motion.div>
              )}

              {currentStep === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-6"
                >
                  <motion.div
                    className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <CheckCircle size={32} className="text-black" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">CV Complete!</h3>
                    <p className="text-white/60">Setting up your account and creating your first CV...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {currentStep !== 'complete' && (
              <div className="flex items-center justify-between mt-8">
                <motion.button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 text-white/60 hover:text-white transition-colors"
                  whileHover={{ x: -5 }}
                >
                  <ArrowLeft size={16} />
                  Back
                </motion.button>

                <div className="flex gap-4">
                  {currentStep === 'form' && currentSection < sections.length - 1 && (
                    <motion.button
                      onClick={() => setCurrentSection(currentSection + 1)}
                      className="flex items-center gap-2 px-8 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Next
                      <ArrowRight size={16} />
                    </motion.button>
                  )}

                  {currentStep === 'form' && currentSection === sections.length - 1 && (
                    <motion.button
                      onClick={handleComplete}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 shadow-2xl shadow-lime-400/25"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Complete Setup
                      <CheckCircle size={16} />
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingForm; 