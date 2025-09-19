'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Eye, Save, ArrowLeft, ArrowRight, User, GraduationCap, Briefcase, Star, Globe, PlusCircle } from 'lucide-react';

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

interface InteractiveCVFormProps {
  initialData?: Partial<CVFormData>;
  onSave: (data: CVFormData) => void;
  onBack?: () => void;
}

const InteractiveCVForm: React.FC<InteractiveCVFormProps> = ({ initialData, onSave, onBack }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<CVFormData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
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

  // Helper function to format dates for month input (YYYY-MM format)
  const formatDateForMonthInput = (dateString: string): string => {
    if (!dateString) return '';
    
    console.log('🔍 formatDateForMonthInput received:', dateString, 'type:', typeof dateString);
    
    try {
      // Handle various date formats
      let date: Date;
      
      // If it's already in YYYY-MM format, return as is
      if (/^\d{4}-\d{2}$/.test(dateString)) {
        console.log('✅ Already in YYYY-MM format:', dateString);
        return dateString;
      }
      
      // If it's in YYYY-MM-DD format, extract YYYY-MM
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const result = dateString.substring(0, 7);
        console.log('✅ Extracted YYYY-MM from YYYY-MM-DD:', dateString, '->', result);
        return result;
      }
      
      // Try to parse various date formats
      if (dateString.includes('/')) {
        // Handle DD/MM/YYYY or MM/YYYY formats
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else if (parts.length === 2) {
          // MM/YYYY
          date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
        } else {
          return '';
        }
      } else if (dateString.includes('-')) {
        // Handle DD-MM-YYYY or MM-YYYY formats
        const parts = dateString.split('-');
        if (parts.length === 3) {
          // DD-MM-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else if (parts.length === 2) {
          // MM-YYYY
          date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
        } else {
          return '';
        }
      } else if (/^\d{4}$/.test(dateString)) {
        // Handle YYYY format
        date = new Date(parseInt(dateString), 0, 1);
      } else {
        // Try to parse as a general date
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Return in YYYY-MM format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  useEffect(() => {
    if (initialData) {
      console.log('InteractiveCVForm received initialData:', initialData);
      console.log('InitialData type:', typeof initialData);
      console.log('InitialData keys:', Object.keys(initialData));
      
      // Debug date fields specifically
      if (initialData.education) {
        console.log('🔍 Education dates:', initialData.education.map((edu: any) => ({
          institution: edu.institution,
          startDate: edu.startDate,
          endDate: edu.endDate
        })));
      }
      if (initialData.experience) {
        console.log('🔍 Experience dates:', initialData.experience.map((exp: any) => ({
          company: exp.company,
          startDate: exp.startDate,
          endDate: exp.endDate
        })));
      }
      if (initialData.projects) {
        console.log('🔍 Project dates:', initialData.projects.map((proj: any) => ({
          title: proj.title,
          startDate: proj.startDate,
          endDate: proj.endDate
        })));
      }
      
      // Handle the data structure properly
      const updatedFormData = { ...formData };
      
      // Handle personal info
      if (initialData.personalInfo && typeof initialData.personalInfo === 'object') {
        console.log('Processing personal info:', initialData.personalInfo);
        updatedFormData.personalInfo = {
          ...updatedFormData.personalInfo,
          ...initialData.personalInfo,
          // Add missing fields that the form expects but API doesn't provide
          website: initialData.personalInfo.website || '',
          github: initialData.personalInfo.github || ''
        };
      }
      
      // Handle education - add missing fields
      if (initialData.education && Array.isArray(initialData.education)) {
        console.log('Processing education:', initialData.education);
        updatedFormData.education = initialData.education.map(edu => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || '',
          location: edu.location || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          current: edu.current || false,
          gpa: edu.gpa || '',
          description: edu.description || ''
        }));
      }
      
      // Handle experience - structure is compatible
      if (initialData.experience && Array.isArray(initialData.experience)) {
        console.log('Processing experience:', initialData.experience);
        updatedFormData.experience = initialData.experience.map(exp => ({
          company: exp.company || '',
          position: exp.position || '',
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          current: exp.current || false,
          description: exp.description || '',
          achievements: Array.isArray(exp.achievements) ? exp.achievements : []
        }));
      }
      
      // Handle skills - structure is compatible
      if (initialData.skills && Array.isArray(initialData.skills)) {
        console.log('Processing skills:', initialData.skills);
        updatedFormData.skills = initialData.skills.map(skill => ({
          category: skill.category || 'Skills',
          skills: Array.isArray(skill.skills) ? skill.skills : []
        }));
      }
      
      // Handle projects - add missing fields
      if (initialData.projects && Array.isArray(initialData.projects)) {
        console.log('Processing projects:', initialData.projects);
        updatedFormData.projects = initialData.projects.map(project => ({
          title: project.title || '',
          description: project.description || '',
          technologies: Array.isArray(project.technologies) ? project.technologies : [],
          url: project.url || '',
          github: project.github || '',
          startDate: project.startDate || '',
          endDate: project.endDate || '',
          current: project.current || false
        }));
      }
      
      console.log('InteractiveCVForm setting formData to:', updatedFormData);
      setFormData(updatedFormData);
    } else {
      console.log('No initialData provided to InteractiveCVForm');
    }
  }, [initialData]);

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
    const newSkillCategory = {
      category: '',
      skills: ['']
    };
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, newSkillCategory]
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

  const renderPersonalInfo = () => (
    <motion.div
      key="personal"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
          <input
            type="text"
            value={formData.personalInfo.firstName}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, firstName: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
          <input
            type="text"
            value={formData.personalInfo.lastName}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, lastName: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
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
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
          placeholder="your.email@example.com"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={formData.personalInfo.phone}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, phone: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="+1 234 567 8900"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={formData.personalInfo.location}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, location: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="City, Country"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={formData.personalInfo.website}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, website: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="https://yourwebsite.com"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">LinkedIn</label>
          <input
            type="url"
            value={formData.personalInfo.linkedin}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, linkedin: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="linkedin.com/in/yourprofile"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">GitHub</label>
          <input
            type="url"
            value={formData.personalInfo.github}
            onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, github: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
            placeholder="github.com/yourusername"
          />
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Professional Summary</label>
        <textarea
          value={formData.personalInfo.summary}
          onChange={(e) => updateFormData('personalInfo', { ...formData.personalInfo, summary: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors resize-none"
          placeholder="Write a compelling summary of your professional background, skills, and career objectives..."
        />
      </div>
    </motion.div>
  );

  const renderEducation = () => (
    <motion.div
      key="education"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Education History</h3>
        <motion.button
          onClick={addEducation}
          className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          Add Education
        </motion.button>
      </div>

      <AnimatePresence>
        {formData.education.map((edu, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Institution</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => {
                    const newEducation = [...formData.education];
                    newEducation[index].institution = e.target.value;
                    updateFormData('education', newEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="University Name"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Degree</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => {
                    const newEducation = [...formData.education];
                    newEducation[index].degree = e.target.value;
                    updateFormData('education', newEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="Bachelor's, Master's, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Field of Study</label>
                <input
                  type="text"
                  value={edu.field}
                  onChange={(e) => {
                    const newEducation = [...formData.education];
                    newEducation[index].field = e.target.value;
                    updateFormData('education', newEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="Computer Science, Business, etc."
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="month"
                  value={edu.startDate ? formatDateForMonthInput(edu.startDate) : ''}
                  onChange={(e) => {
                    const newEducation = [...formData.education];
                    newEducation[index].startDate = e.target.value;
                    updateFormData('education', newEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="month"
                  value={edu.endDate ? formatDateForMonthInput(edu.endDate) : ''}
                  onChange={(e) => {
                    const newEducation = [...formData.education];
                    newEducation[index].endDate = e.target.value;
                    updateFormData('education', newEducation);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
              <textarea
                value={edu.description}
                onChange={(e) => {
                  const newEducation = [...formData.education];
                  newEducation[index].description = e.target.value;
                  updateFormData('education', newEducation);
                }}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors resize-none"
                placeholder="Brief description of your studies and achievements..."
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderExperience = () => (
    <motion.div
      key="experience"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Work Experience</h3>
        <motion.button
          onClick={addExperience}
          className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          Add Experience
        </motion.button>
      </div>

      <AnimatePresence>
        {formData.experience.map((exp, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Company</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => {
                    const newExperience = [...formData.experience];
                    newExperience[index].company = e.target.value;
                    updateFormData('experience', newExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="Company Name"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
                <input
                  type="text"
                  value={exp.position}
                  onChange={(e) => {
                    const newExperience = [...formData.experience];
                    newExperience[index].position = e.target.value;
                    updateFormData('experience', newExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="Job Title"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={exp.location}
                  onChange={(e) => {
                    const newExperience = [...formData.experience];
                    newExperience[index].location = e.target.value;
                    updateFormData('experience', newExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="month"
                  value={exp.startDate ? formatDateForMonthInput(exp.startDate) : ''}
                  onChange={(e) => {
                    const newExperience = [...formData.experience];
                    newExperience[index].startDate = e.target.value;
                    updateFormData('experience', newExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="month"
                  value={exp.endDate ? formatDateForMonthInput(exp.endDate) : ''}
                  onChange={(e) => {
                    const newExperience = [...formData.experience];
                    newExperience[index].endDate = e.target.value;
                    updateFormData('experience', newExperience);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
              <textarea
                value={exp.description}
                onChange={(e) => {
                  const newExperience = [...formData.experience];
                  newExperience[index].description = e.target.value;
                  updateFormData('experience', newExperience);
                }}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors resize-none"
                placeholder="Describe your role and responsibilities..."
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderSkills = () => (
    <motion.div
      key="skills"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Skills & Expertise</h3>
        <motion.button
          onClick={addSkillCategory}
          className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          Add Category
        </motion.button>
      </div>

      <AnimatePresence>
        {formData.skills.map((skillCategory, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
          >
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                value={skillCategory.category}
                onChange={(e) => {
                  const newSkills = [...formData.skills];
                  newSkills[index].category = e.target.value;
                  updateFormData('skills', newSkills);
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                placeholder="Technical Skills, Soft Skills, Languages, etc."
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
              <div className="space-y-2">
                {skillCategory.skills.map((skill, skillIndex) => (
                  <div key={skillIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => {
                        const newSkills = [...formData.skills];
                        newSkills[index].skills[skillIndex] = e.target.value;
                        updateFormData('skills', newSkills);
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                      placeholder="Skill name"
                    />
                    <button
                      onClick={() => {
                        const newSkills = [...formData.skills];
                        newSkills[index].skills.splice(skillIndex, 1);
                        updateFormData('skills', newSkills);
                      }}
                      className="px-3 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newSkills = [...formData.skills];
                    newSkills[index].skills.push('');
                    updateFormData('skills', newSkills);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-lime-400 hover:text-lime-300 transition-colors"
                >
                  <PlusCircle size={16} />
                  Add Skill
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderProjects = () => (
    <motion.div
      key="projects"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Projects</h3>
        <motion.button
          onClick={addProject}
          className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          Add Project
        </motion.button>
      </div>

      <AnimatePresence>
        {formData.projects.map((project, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
          >
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Project Title</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => {
                  const newProjects = [...formData.projects];
                  newProjects[index].title = e.target.value;
                  updateFormData('projects', newProjects);
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                placeholder="Project Name"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
              <textarea
                value={project.description}
                onChange={(e) => {
                  const newProjects = [...formData.projects];
                  newProjects[index].description = e.target.value;
                  updateFormData('projects', newProjects);
                }}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors resize-none"
                placeholder="Describe your project..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Project URL</label>
                <input
                  type="url"
                  value={project.url}
                  onChange={(e) => {
                    const newProjects = [...formData.projects];
                    newProjects[index].url = e.target.value;
                    updateFormData('projects', newProjects);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="https://project-url.com"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">GitHub Repository</label>
                <input
                  type="url"
                  value={project.github}
                  onChange={(e) => {
                    const newProjects = [...formData.projects];
                    newProjects[index].github = e.target.value;
                    updateFormData('projects', newProjects);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                  placeholder="https://github.com/username/repo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="month"
                  value={project.startDate ? formatDateForMonthInput(project.startDate) : ''}
                  onChange={(e) => {
                    const newProjects = [...formData.projects];
                    newProjects[index].startDate = e.target.value;
                    updateFormData('projects', newProjects);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="month"
                  value={project.endDate ? formatDateForMonthInput(project.endDate) : ''}
                  onChange={(e) => {
                    const newProjects = [...formData.projects];
                    newProjects[index].endDate = e.target.value;
                    updateFormData('projects', newProjects);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderEducation();
      case 2:
        return renderExperience();
      case 3:
        return renderSkills();
      case 4:
        return renderProjects();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-4">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-300 ${
                    currentSection === index
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black shadow-2xl shadow-lime-400/25'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      currentSection === index ? 'bg-black/20' : 'bg-white/10'
                    }`}>
                      <section.icon size={20} />
                    </div>
                    <span className="font-medium">{section.title}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[600px]">
              <AnimatePresence mode="wait">
                {renderSection()}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/10">
                <motion.button
                  onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                  disabled={currentSection === 0}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    currentSection === 0
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white hover:bg-white/10'
                  }`}
                  whileHover={currentSection > 0 ? { scale: 1.05 } : {}}
                  whileTap={currentSection > 0 ? { scale: 0.95 } : {}}
                >
                  <ArrowLeft size={16} />
                  Previous
                </motion.button>

                <div className="flex items-center gap-2">
                  {sections.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentSection ? 'bg-lime-400' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                {currentSection === sections.length - 1 ? (
                  <motion.button
                    onClick={() => onSave(formData)}
                    className="flex items-center gap-2 px-6 py-3 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Save CV
                    <ArrowRight size={16} />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                    className="flex items-center gap-2 px-6 py-3 text-white hover:bg-white/10 rounded-xl font-medium transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Next
                    <ArrowRight size={16} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InteractiveCVForm; 