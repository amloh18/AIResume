'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Settings, 
  Code, 
  Award, 
  Trophy, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  ArrowLeft, 
  ArrowRight,
  Eye,
  Heart,
  BookOpen,
  Globe,
  Star,
  Users,
  FileText,
  X
} from 'lucide-react';
import CVPreviewModal from './CVPreviewModal';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface MasterCVBuilderStepProps {
  onNext: () => void;
  onBack: () => void;
}

const sections = [
  { id: 'personal', title: 'Personal Information', icon: User, color: 'blue' },
  { id: 'experience', title: 'Work Experience', icon: Briefcase, color: 'green' },
  { id: 'education', title: 'Education', icon: GraduationCap, color: 'purple' },
  { id: 'skills', title: 'Skills', icon: Settings, color: 'orange' },
  { id: 'projects', title: 'Projects', icon: Code, color: 'pink' },
  { id: 'awards', title: 'Awards & Recognitions', icon: Award, color: 'yellow' },
  { id: 'certifications', title: 'Certifications', icon: Trophy, color: 'cyan' }
];

const additionalSections = [
  { id: 'volunteer', title: 'Volunteer Work', icon: Heart, color: 'red' },
  { id: 'publications', title: 'Publications', icon: BookOpen, color: 'indigo' },
  { id: 'languages', title: 'Languages', icon: Globe, color: 'teal' },
  { id: 'interests', title: 'Interests', icon: Star, color: 'amber' },
  { id: 'references', title: 'References', icon: Users, color: 'violet' },
  { id: 'summary', title: 'Summary', icon: FileText, color: 'emerald' }
];

// Simple toolbar wrapper - toolbar operates on currently focused editor
function ToolbarWrapper({ showAIButton, fieldType, onAIGenerate, isGenerating }: {
  showAIButton?: boolean;
  fieldType?: 'summary' | 'experience' | 'other';
  onAIGenerate?: () => void;
  isGenerating?: boolean;
}) {
  return (
    <WYSIWYGToolbar
      showAIButton={showAIButton}
      fieldType={fieldType}
      onAIGenerate={onAIGenerate}
      isGenerating={isGenerating}
    />
  );
}

export default function MasterCVBuilderStep({ onNext, onBack }: MasterCVBuilderStepProps) {
  const context = useAICareerReport();
  const { data: session } = useSession();
  
  if (!context) {
    return <div className="min-h-screen bg-[#1A261A] flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }
  
  const { state, dispatch } = context;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState<{ [key: string]: boolean }>({});

  // Initialize available sections if empty
  React.useEffect(() => {
    if (state.availableSections.length === 0) {
      dispatch({
        type: 'SET_AVAILABLE_SECTIONS',
        payload: sections
      });
    }
  }, [dispatch, state.availableSections.length]);

  const updateCVData = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        [field]: value
      }
    });
  };

  const updateBasicInfo = (field: string, value: string) => {
    updateCVData('basics', {
      ...state.cvData.basics,
      [field]: value
    });
  };

  const addWorkExperience = () => {
    const newWork = {
      name: '',
      position: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: ['']
    };
    updateCVData('work', [...state.cvData.work, newWork]);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updatedWork = [...state.cvData.work];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    updateCVData('work', updatedWork);
  };

  const removeWorkExperience = (index: number) => {
    const updatedWork = state.cvData.work.filter((_, i) => i !== index);
    updateCVData('work', updatedWork);
  };

  const addEducation = () => {
    const newEducation = {
      institution: '',
      studyType: '',
      area: '',
      startDate: '',
      endDate: '',
      gpa: '',
      courses: [],
      description: ''
    };
    updateCVData('education', [...state.cvData.education, newEducation]);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updatedEducation = [...state.cvData.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    updateCVData('education', updatedEducation);
  };

  const removeEducation = (index: number) => {
    const updatedEducation = state.cvData.education.filter((_, i) => i !== index);
    updateCVData('education', updatedEducation);
  };

  const addCertification = () => {
    const newCert = {
      name: '',
      issuer: '',
      date: '',
      url: '',
      description: ''
    };
    updateCVData('certificates', [...(state.cvData.certificates || []), newCert]);
  };

  const updateCertification = (index: number, field: string, value: any) => {
    const updatedCerts = [...state.cvData.certificates];
    updatedCerts[index] = { ...updatedCerts[index], [field]: value };
    updateCVData('certificates', updatedCerts);
  };

  const removeCertification = (index: number) => {
    const updatedCerts = state.cvData.certificates.filter((_, i) => i !== index);
    updateCVData('certificates', updatedCerts);
  };

  // AI generation handlers
  const handleAIGenerate = async (type: 'summary' | 'experience', fieldId: string, currentContent: string, workIndex?: number) => {
    setGeneratingAI(prev => ({ ...prev, [fieldId]: true }));
    
    try {
      const response = await fetch('/api/ai/fix-and-improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: currentContent,
          type,
          cvData: state.cvData,
          jobData: state.jobData || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI content');
      }

      const result = await response.json();
      
      if (result.success && result.content) {
        if (type === 'summary') {
          updateBasicInfo('summary', result.content);
        } else if (type === 'experience' && workIndex !== undefined) {
          updateWorkExperience(workIndex, 'summary', result.content);
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setGeneratingAI(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const addNewSection = (sectionId: string) => {
    console.log('Adding new section:', sectionId);
    
    // Add to available sections
    const sectionToAdd = additionalSections.find(s => s.id === sectionId);
    if (sectionToAdd) {
      dispatch({
        type: 'ADD_SECTION',
        payload: sectionToAdd
      });
      console.log('Section added to available sections:', sectionToAdd);
    }

    // Initialize CV data for the new section
    switch (sectionId) {
      case 'volunteer':
        updateCVData('volunteer', [...(state.cvData.volunteer || []), {
          organization: '',
          position: '',
          startDate: '',
          endDate: '',
          summary: ''
        }]);
        break;
      case 'publications':
        updateCVData('publications', [...(state.cvData.publications || []), {
          name: '',
          publisher: '',
          releaseDate: '',
          url: '',
          summary: ''
        }]);
        break;
      case 'languages':
        updateCVData('languages', [...(state.cvData.languages || []), {
          language: '',
          fluency: 'Native'
        }]);
        break;
      case 'interests':
        updateCVData('interests', [...(state.cvData.interests || []), {
          name: '',
          keywords: []
        }]);
        break;
      case 'references':
        updateCVData('references', [...(state.cvData.references || []), {
          name: '',
          reference: '',
          position: '',
          company: ''
        }]);
        break;
      case 'summary':
        // This would typically be part of the basics section, but we can add it as a separate field
        updateCVData('basics', {
          ...state.cvData.basics,
          summary: state.cvData.basics.summary || ''
        });
        break;
    }
    
    console.log('CV data after adding section:', state.cvData);
    setShowAddSectionModal(false);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dynamic section renderer
  const renderSection = (section: any, index: number) => {
    const Icon = section.icon;
    const isCollapsed = collapsedSections.has(section.id);
    
    const getColorClasses = (color: string) => {
      const colorMap: { [key: string]: string } = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
        pink: 'from-pink-500 to-pink-600',
        yellow: 'from-yellow-500 to-yellow-600',
        cyan: 'from-cyan-500 to-cyan-600',
        red: 'from-red-500 to-red-600',
        indigo: 'from-indigo-500 to-indigo-600',
        teal: 'from-teal-500 to-teal-600',
        amber: 'from-amber-500 to-amber-600',
        violet: 'from-violet-500 to-violet-600',
        emerald: 'from-emerald-500 to-emerald-600'
      };
      return colorMap[color] || 'from-gray-500 to-gray-600';
    };

    return (
      <motion.div
        key={section.id}
        id={section.id}
        className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${getColorClasses(section.color)} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">{section.title}</h3>
          </div>
          <button
            onClick={() => toggleSectionCollapse(section.id)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-6">
            {renderSectionContent(section.id)}
          </div>
        )}
      </motion.div>
    );
  };

  // Render content for each section type
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'personal':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                value={state.cvData.basics.name?.split(' ')[0] || ''}
                onChange={(e) => {
                  const lastName = state.cvData.basics.name?.split(' ').slice(1).join(' ') || '';
                  updateBasicInfo('name', `${e.target.value} ${lastName}`.trim());
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Enter your first name"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                value={state.cvData.basics.name?.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => {
                  const firstName = state.cvData.basics.name?.split(' ')[0] || '';
                  updateBasicInfo('name', `${firstName} ${e.target.value}`.trim());
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Enter your last name"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={state.cvData.basics.email || ''}
                onChange={(e) => updateBasicInfo('email', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={state.cvData.basics.phone || ''}
                onChange={(e) => updateBasicInfo('phone', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="+1234567890"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">LinkedIn Profile</label>
              <input
                type="url"
                value={state.cvData.basics.profiles?.[0]?.url || ''}
                onChange={(e) => {
                  const profiles = [...(state.cvData.basics.profiles || [])];
                  if (profiles.length === 0) {
                    profiles.push({ network: 'LinkedIn', url: e.target.value, username: '' });
                  } else {
                    profiles[0] = { ...profiles[0], url: e.target.value };
                  }
                  updateCVData('basics', { ...state.cvData.basics, profiles });
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="linkedin.com/in/yourprofile"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Personal Website</label>
              <input
                type="url"
                value={state.cvData.basics.url || ''}
                onChange={(e) => updateBasicInfo('url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="yourwebsite.com"
              />
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white/80 text-sm font-medium">Professional Summary</label>
                <ToolbarWrapper
                  showAIButton={true}
                  fieldType="summary"
                  onAIGenerate={() => handleAIGenerate('summary', 'professional-summary', state.cvData.basics.summary || '')}
                  isGenerating={generatingAI['professional-summary'] || false}
                />
              </div>
              <WYSIWYGEditor
                value={state.cvData.basics.summary || ''}
                onChange={(value) => updateBasicInfo('summary', value)}
                rows={4}
                placeholder="Write a brief summary of your professional background and key achievements..."
              />
            </div>
          </div>
        );

      case 'experience':
        return (
          <>
            {state.cvData.work.map((work, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">
                    {work.position || 'Job Title'} at {work.name || 'Company'}
                  </h4>
                  <button
                    onClick={() => removeWorkExperience(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Job Title</label>
                    <input
                      type="text"
                      value={work.position || ''}
                      onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Senior Developer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Company</label>
                    <input
                      type="text"
                      value={work.name || ''}
                      onChange={(e) => updateWorkExperience(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Tech Corp"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="text"
                      value={work.startDate || ''}
                      onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="January 2018"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                    <input
                      type="text"
                      value={work.endDate || ''}
                      onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="May 2023"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper
                      showAIButton={true}
                      fieldType="experience"
                      onAIGenerate={() => handleAIGenerate('experience', `work-experience-${index}`, work.summary || '', index)}
                      isGenerating={generatingAI[`work-experience-${index}`] || false}
                    />
                  </div>
                  <WYSIWYGEditor
                    value={work.summary || ''}
                    onChange={(value) => updateWorkExperience(index, 'summary', value)}
                    rows={4}
                    placeholder="Describe your key responsibilities and achievements..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={addWorkExperience}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Work Experience
            </button>
          </>
        );

      case 'education':
        return (
          <>
            {state.cvData.education.map((edu, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">
                    {edu.studyType || 'Degree'} in {edu.area || 'Field'} at {edu.institution || 'University'}
                  </h4>
                  <button
                    onClick={() => removeEducation(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Degree</label>
                    <input
                      type="text"
                      value={edu.studyType || ''}
                      onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="M.Sc. Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">University</label>
                    <input
                      type="text"
                      value={edu.institution || ''}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="University Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Graduation Year</label>
                    <input
                      type="text"
                      value={edu.endDate || ''}
                      onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="2017"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={edu.description || ''}
                    onChange={(value) => updateEducation(index, 'description', value)}
                    rows={3}
                    placeholder="Describe your education, achievements, relevant coursework, or academic honors..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={addEducation}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Education
            </button>
          </>
        );

      case 'skills':
        return (
          <div className="space-y-6">
            {(state.cvData.skills || []).map((skillGroup, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">
                    {skillGroup.category || 'Skill Category'}
                  </h4>
                  <button
                    onClick={() => {
                      const updatedSkills = state.cvData.skills?.filter((_, i) => i !== index) || [];
                      updateCVData('skills', updatedSkills);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Category</label>
                    <input
                      type="text"
                      value={skillGroup.category || ''}
                      onChange={(e) => {
                        const updatedSkills = [...(state.cvData.skills || [])];
                        updatedSkills[index] = { ...updatedSkills[index], category: e.target.value };
                        updateCVData('skills', updatedSkills);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Programming Languages, Frameworks, Tools..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
                    <textarea
                      value={skillGroup.skills?.join(', ') || ''}
                      onChange={(e) => {
                        const skillNames = e.target.value.split(',').map(name => name.trim()).filter(name => name);
                        const updatedSkills = [...(state.cvData.skills || [])];
                        updatedSkills[index] = { ...updatedSkills[index], skills: skillNames };
                        updateCVData('skills', updatedSkills);
                      }}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
                      placeholder="JavaScript, React, Node.js, Python..."
                    />
                    <p className="text-white/60 text-sm mt-1">Separate skills with commas</p>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newSkillGroup = { category: '', skills: [] };
                updateCVData('skills', [...(state.cvData.skills || []), newSkillGroup]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Skill Category
            </button>
          </div>
        );

      case 'projects':
        return (
          <>
            {state.cvData.projects?.map((project, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{project.name || 'Project Name'}</h4>
                  <button
                    onClick={() => {
                      const updatedProjects = state.cvData.projects?.filter((_, i) => i !== index) || [];
                      updateCVData('projects', updatedProjects);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Project Name</label>
                    <input
                      type="text"
                      value={project.name || ''}
                      onChange={(e) => {
                        const updatedProjects = [...(state.cvData.projects || [])];
                        updatedProjects[index] = { ...updatedProjects[index], name: e.target.value };
                        updateCVData('projects', updatedProjects);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="E-commerce Platform"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Technologies</label>
                    <input
                      type="text"
                      value={project.keywords?.join(', ') || ''}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                        const updatedProjects = [...(state.cvData.projects || [])];
                        updatedProjects[index] = { ...updatedProjects[index], keywords };
                        updateCVData('projects', updatedProjects);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="React, Node.js, MongoDB"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={project.description || ''}
                    onChange={(value) => {
                      const updatedProjects = [...(state.cvData.projects || [])];
                      updatedProjects[index] = { ...updatedProjects[index], description: value };
                      updateCVData('projects', updatedProjects);
                    }}
                    rows={3}
                    placeholder="Describe the project and your role..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newProject = {
                  name: '',
                  description: '',
                  keywords: [],
                  url: ''
                };
                updateCVData('projects', [...(state.cvData.projects || []), newProject]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Project
            </button>
          </>
        );

      case 'awards':
        return (
          <>
            {state.cvData.awards?.map((award, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{award.title || 'Award Title'}</h4>
                  <button
                    onClick={() => {
                      const updatedAwards = state.cvData.awards?.filter((_, i) => i !== index) || [];
                      updateCVData('awards', updatedAwards);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Award Title</label>
                    <input
                      type="text"
                      value={award.title || ''}
                      onChange={(e) => {
                        const updatedAwards = [...(state.cvData.awards || [])];
                        updatedAwards[index] = { ...updatedAwards[index], title: e.target.value };
                        updateCVData('awards', updatedAwards);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Employee of the Year"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
                    <input
                      type="text"
                      value={award.date || ''}
                      onChange={(e) => {
                        const updatedAwards = [...(state.cvData.awards || [])];
                        updatedAwards[index] = { ...updatedAwards[index], date: e.target.value };
                        updateCVData('awards', updatedAwards);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="2023"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={award.summary || ''}
                    onChange={(value) => {
                      const updatedAwards = [...(state.cvData.awards || [])];
                      updatedAwards[index] = { ...updatedAwards[index], summary: value };
                      updateCVData('awards', updatedAwards);
                    }}
                    rows={3}
                    placeholder="Describe the award and its significance..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newAward = {
                  title: '',
                  date: '',
                  summary: ''
                };
                updateCVData('awards', [...(state.cvData.awards || []), newAward]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Award
            </button>
          </>
        );

      case 'certifications':
        return (
          <>
            {state.cvData.certificates?.map((cert, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{cert.name || 'Certification Name'}</h4>
                  <button
                    onClick={() => removeCertification(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Certification Name</label>
                    <input
                      type="text"
                      value={cert.name || ''}
                      onChange={(e) => updateCertification(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="AWS Certified Solutions Architect"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Issuer</label>
                    <input
                      type="text"
                      value={cert.issuer || ''}
                      onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Amazon Web Services"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
                    <input
                      type="text"
                      value={cert.date || ''}
                      onChange={(e) => updateCertification(index, 'date', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="2023"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
                    <input
                      type="url"
                      value={cert.url || ''}
                      onChange={(e) => updateCertification(index, 'url', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="https://aws.amazon.com/certification/"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={cert.description || ''}
                    onChange={(value) => updateCertification(index, 'description', value)}
                    rows={3}
                    placeholder="Describe the certification, its relevance, or what you learned..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={addCertification}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Certification
            </button>
          </>
        );

      // Additional sections
      case 'volunteer':
        return (
          <>
            {state.cvData.volunteer?.map((vol, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{vol.organization || 'Organization'}</h4>
                  <button
                    onClick={() => {
                      const updatedVolunteer = state.cvData.volunteer?.filter((_, i) => i !== index) || [];
                      updateCVData('volunteer', updatedVolunteer);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Organization</label>
                    <input
                      type="text"
                      value={vol.organization || ''}
                      onChange={(e) => {
                        const updatedVolunteer = [...(state.cvData.volunteer || [])];
                        updatedVolunteer[index] = { ...updatedVolunteer[index], organization: e.target.value };
                        updateCVData('volunteer', updatedVolunteer);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Red Cross"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
                    <input
                      type="text"
                      value={vol.position || ''}
                      onChange={(e) => {
                        const updatedVolunteer = [...(state.cvData.volunteer || [])];
                        updatedVolunteer[index] = { ...updatedVolunteer[index], position: e.target.value };
                        updateCVData('volunteer', updatedVolunteer);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Volunteer Coordinator"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="text"
                      value={vol.startDate || ''}
                      onChange={(e) => {
                        const updatedVolunteer = [...(state.cvData.volunteer || [])];
                        updatedVolunteer[index] = { ...updatedVolunteer[index], startDate: e.target.value };
                        updateCVData('volunteer', updatedVolunteer);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="January 2022"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                    <input
                      type="text"
                      value={vol.endDate || ''}
                      onChange={(e) => {
                        const updatedVolunteer = [...(state.cvData.volunteer || [])];
                        updatedVolunteer[index] = { ...updatedVolunteer[index], endDate: e.target.value };
                        updateCVData('volunteer', updatedVolunteer);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="December 2022"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Description</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={vol.summary || ''}
                    onChange={(value) => {
                      const updatedVolunteer = [...(state.cvData.volunteer || [])];
                      updatedVolunteer[index] = { ...updatedVolunteer[index], summary: value };
                      updateCVData('volunteer', updatedVolunteer);
                    }}
                    rows={3}
                    placeholder="Describe your volunteer work and impact..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newVolunteer = {
                  organization: '',
                  position: '',
                  startDate: '',
                  endDate: '',
                  summary: ''
                };
                updateCVData('volunteer', [...(state.cvData.volunteer || []), newVolunteer]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Volunteer Experience
            </button>
          </>
        );

      case 'languages':
        return (
          <div className="space-y-4">
            {(state.cvData.languages || []).map((lang, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">
                    {lang.language || 'Language'}
                  </h4>
                  <button
                    onClick={() => {
                      const updatedLanguages = state.cvData.languages?.filter((_, i) => i !== index) || [];
                      updateCVData('languages', updatedLanguages);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Language Name</label>
                    <input
                      type="text"
                      value={lang.language || ''}
                      onChange={(e) => {
                        const updatedLanguages = [...(state.cvData.languages || [])];
                        updatedLanguages[index] = { ...updatedLanguages[index], language: e.target.value };
                        updateCVData('languages', updatedLanguages);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="English"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Fluency Level</label>
                    <select
                      value={lang.fluency || ''}
                      onChange={(e) => {
                        const updatedLanguages = [...(state.cvData.languages || [])];
                        updatedLanguages[index] = { ...updatedLanguages[index], fluency: e.target.value };
                        updateCVData('languages', updatedLanguages);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    >
                      <option value="">Select fluency level</option>
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Basic">Basic</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newLanguage = { language: '', fluency: '' };
                updateCVData('languages', [...(state.cvData.languages || []), newLanguage]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Language
            </button>
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Interests</label>
              <textarea
                value={state.cvData.interests?.map(interest => interest.name).join(', ') || ''}
                onChange={(e) => {
                  const interestNames = e.target.value.split(',').map(name => name.trim()).filter(name => name);
                  const interests = interestNames.map(name => ({ name, keywords: [] }));
                  updateCVData('interests', interests);
                }}
                rows={4}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
                placeholder="Photography, Hiking, Cooking, Reading, Travel..."
              />
              <p className="text-white/60 text-sm mt-1">Separate interests with commas</p>
            </div>
          </div>
        );

      case 'references':
        return (
          <>
            {state.cvData.references?.map((ref, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{ref.name || 'Reference Name'}</h4>
                  <button
                    onClick={() => {
                      const updatedReferences = state.cvData.references?.filter((_, i) => i !== index) || [];
                      updateCVData('references', updatedReferences);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={ref.name || ''}
                      onChange={(e) => {
                        const updatedReferences = [...(state.cvData.references || [])];
                        updatedReferences[index] = { ...updatedReferences[index], name: e.target.value };
                        updateCVData('references', updatedReferences);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
                    <input
                      type="text"
                      value={(ref as any).position || ''}
                      onChange={(e) => {
                        const updatedReferences = [...(state.cvData.references || [])];
                        updatedReferences[index] = { ...updatedReferences[index], position: e.target.value } as any;
                        updateCVData('references', updatedReferences);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Senior Manager"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Company</label>
                    <input
                      type="text"
                      value={(ref as any).company || ''}
                      onChange={(e) => {
                        const updatedReferences = [...(state.cvData.references || [])];
                        updatedReferences[index] = { ...updatedReferences[index], company: e.target.value } as any;
                        updateCVData('references', updatedReferences);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Tech Corp"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={ref.reference || ''}
                      onChange={(e) => {
                        const updatedReferences = [...(state.cvData.references || [])];
                        updatedReferences[index] = { ...updatedReferences[index], reference: e.target.value };
                        updateCVData('references', updatedReferences);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="john.smith@company.com"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newReference = {
                  name: '',
                  position: '',
                  company: '',
                  reference: ''
                };
                updateCVData('references', [...(state.cvData.references || []), newReference]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Reference
            </button>
          </>
        );

      case 'publications':
        return (
          <>
            {state.cvData.publications?.map((pub, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{pub.name || 'Publication Title'}</h4>
                  <button
                    onClick={() => {
                      const updatedPublications = state.cvData.publications?.filter((_, i) => i !== index) || [];
                      updateCVData('publications', updatedPublications);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={pub.name || ''}
                      onChange={(e) => {
                        const updatedPublications = [...(state.cvData.publications || [])];
                        updatedPublications[index] = { ...updatedPublications[index], name: e.target.value };
                        updateCVData('publications', updatedPublications);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Research Paper Title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Publisher</label>
                    <input
                      type="text"
                      value={pub.publisher || ''}
                      onChange={(e) => {
                        const updatedPublications = [...(state.cvData.publications || [])];
                        updatedPublications[index] = { ...updatedPublications[index], publisher: e.target.value };
                        updateCVData('publications', updatedPublications);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Journal Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
                    <input
                      type="text"
                      value={pub.releaseDate || ''}
                      onChange={(e) => {
                        const updatedPublications = [...(state.cvData.publications || [])];
                        updatedPublications[index] = { ...updatedPublications[index], releaseDate: e.target.value };
                        updateCVData('publications', updatedPublications);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="2023"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
                    <input
                      type="url"
                      value={pub.url || ''}
                      onChange={(e) => {
                        const updatedPublications = [...(state.cvData.publications || [])];
                        updatedPublications[index] = { ...updatedPublications[index], url: e.target.value };
                        updateCVData('publications', updatedPublications);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="https://example.com/publication"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white/80 text-sm font-medium">Summary</label>
                    <ToolbarWrapper />
                  </div>
                  <WYSIWYGEditor
                    value={pub.summary || ''}
                    onChange={(value) => {
                      const updatedPublications = [...(state.cvData.publications || [])];
                      updatedPublications[index] = { ...updatedPublications[index], summary: value };
                      updateCVData('publications', updatedPublications);
                    }}
                    rows={3}
                    placeholder="Brief description of the publication..."
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newPublication = {
                  name: '',
                  publisher: '',
                  releaseDate: '',
                  url: '',
                  summary: ''
                };
                updateCVData('publications', [...(state.cvData.publications || []), newPublication]);
              }}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add another Publication
            </button>
          </>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-white/60">This section is not yet implemented.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-[#1A201A]">
      {/* Sticky Sidebar */}
      <div className="w-20 md:w-80 flex-shrink-0 p-2 md:p-4">
        <div className="bg-[#222B22] rounded-2xl border border-white/10 h-full flex flex-col shadow-xl">
          {/* Sidebar Header with Step Info */}
          <div className="p-3 md:p-6 border-b border-white/10">
            <div className="text-center mb-4">
              <div className="text-[#80FF00] font-bold text-sm md:text-lg mb-1">Step 2 of 3</div>
              <div className="text-lg md:text-xl font-bold text-white mb-2 hidden md:block">Details Sections</div>
              <div className="text-white/70 text-xs md:text-sm leading-relaxed hidden md:block">
                Review and edit your CV sections.<br />
                Click on a section title to navigate.
              </div>
            </div>
            
          </div>
          
          {/* Section Navigation */}
          <div className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
            {state.availableSections.map((section) => {
              const IconComponent = section.icon;
              const isActive = state.activeSection === section.id;
              
              return (
                <motion.button
                  key={section.id}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_SECTION', payload: section.id });
                    scrollToSection(section.id);
                  }}
                  className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={section.title}
                >
                  {React.createElement(IconComponent, { size: 18 })}
                  <span className="font-medium text-xs md:text-sm hidden md:block">{section.title}</span>
                </motion.button>
              );
            })}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-2 md:p-4 border-t border-white/10">
            <button 
              onClick={() => setShowAddSectionModal(true)}
              className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5"
              title="Add New Section"
            >
              <Plus size={18} />
              <span className="font-medium text-xs md:text-sm hidden md:block">Add New Section</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-full">
        <div className="p-6">
          {/* Dynamic Sections */}
          {state.availableSections.map((section, index) => renderSection(section, index))}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/10">
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={20} />
              Previous: Enter Details
            </motion.button>
            
            <motion.button
              onClick={onNext}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black rounded-lg font-semibold hover:from-[#70e600] hover:to-[#60d600] transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Finish & Save CV
              <ArrowRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#222B22] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Section</h2>
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {additionalSections.map((section) => {
                const IconComponent = section.icon;
                const isAlreadyAdded = state.availableSections.some(s => s.id === section.id);
                
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => !isAlreadyAdded && addNewSection(section.id)}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                      isAlreadyAdded
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    }`}
                    whileHover={!isAlreadyAdded ? { scale: 1.05 } : {}}
                    whileTap={!isAlreadyAdded ? { scale: 0.95 } : {}}
                    disabled={isAlreadyAdded}
                  >
                    {React.createElement(IconComponent, { size: 32 })}
                    <span className="font-medium text-sm text-center">{section.title}</span>
                    {isAlreadyAdded && (
                      <span className="text-xs text-white/50">Already Added</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* CV Preview Modal */}
      {showPreview && (
        <CVPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          cvData={state.cvData}
        />
      )}
    </div>
  );
}
