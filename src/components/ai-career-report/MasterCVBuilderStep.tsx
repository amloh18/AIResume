'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Award, 
  Trophy, 
  Plus, 
  Trash2,
  ArrowRight,
  ArrowLeft,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut
} from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { useSession, signOut } from 'next-auth/react';

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
      courses: []
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

  const addSkillCategory = () => {
    const newSkill = {
      category: '',
      skills: []
    };
    updateCVData('skills', [...state.cvData.skills, newSkill]);
  };

  const updateSkill = (index: number, field: string, value: any) => {
    const updatedSkills = [...state.cvData.skills];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    updateCVData('skills', updatedSkills);
  };

  const removeSkill = (index: number) => {
    const updatedSkills = state.cvData.skills.filter((_, i) => i !== index);
    updateCVData('skills', updatedSkills);
  };

  const addProject = () => {
    const newProject = {
      name: '',
      description: '',
      url: '',
      keywords: [],
      startDate: '',
      endDate: '',
      highlights: []
    };
    updateCVData('projects', [...state.cvData.projects, newProject]);
  };

  const updateProject = (index: number, field: string, value: any) => {
    const updatedProjects = [...state.cvData.projects];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    updateCVData('projects', updatedProjects);
  };

  const removeProject = (index: number) => {
    const updatedProjects = state.cvData.projects.filter((_, i) => i !== index);
    updateCVData('projects', updatedProjects);
  };

  const addAward = () => {
    const newAward = {
      title: '',
      date: '',
      awarder: '',
      summary: ''
    };
    updateCVData('awards', [...(state.cvData.awards || []), newAward]);
  };

  const updateAward = (index: number, field: string, value: any) => {
    const updatedAwards = [...(state.cvData.awards || [])];
    updatedAwards[index] = { ...updatedAwards[index], [field]: value };
    updateCVData('awards', updatedAwards);
  };

  const removeAward = (index: number) => {
    const updatedAwards = (state.cvData.awards || []).filter((_, i) => i !== index);
    updateCVData('awards', updatedAwards);
  };

  const addCertification = () => {
    const newCert = {
      name: '',
      date: '',
      issuer: '',
      url: ''
    };
    updateCVData('certificates', [...state.cvData.certificates, newCert]);
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

  return (
    <div className="flex h-screen bg-[#1A261A]">
      {/* Sticky Sidebar */}
      <div className="w-80 flex-shrink-0 p-4">
        <div className="sticky top-4 bg-[#222B22] rounded-2xl border border-white/10 h-[calc(100vh-2rem)] flex flex-col shadow-xl">
          {/* Sidebar Header with Step Info */}
          <div className="p-6 border-b border-white/10">
            <div className="text-center mb-4">
              <div className="text-[#80FF00] font-bold text-lg mb-1">Step 2 of 3</div>
              <div className="text-xl font-bold text-white mb-2">Details Sections</div>
              <div className="text-white/70 text-sm leading-relaxed">
                Review and edit your CV sections.<br />
                Click on a section title to navigate.
              </div>
            </div>
            
            {/* Logout Button for Authenticated Users */}
            {session?.user && (
              <motion.button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </motion.button>
            )}
          </div>
          
          {/* Section Navigation */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = state.activeSection === section.id;
              
              return (
                <motion.button
                  key={section.id}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_SECTION', payload: section.id });
                    scrollToSection(section.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span className="font-medium">{section.title}</span>
                </motion.button>
              );
            })}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/10">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5">
              <Plus size={18} />
              <span className="font-medium">Add New Section</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Personal Information Section */}
          <motion.div
            id="personal"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Personal Information</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('personal')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('personal') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('personal') && (
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
                  <label className="block text-white/80 text-sm font-medium mb-2">Professional Summary</label>
                  <textarea
                    value={state.cvData.basics.summary || ''}
                    onChange={(e) => updateBasicInfo('summary', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
                    placeholder="Write a brief summary of your professional background and key achievements..."
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Work Experience Section */}
          <motion.div
            id="experience"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Work Experience</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('experience')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('experience') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('experience') && (
              <div className="space-y-6">
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
                      <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={work.summary || ''}
                        onChange={(e) => updateWorkExperience(index, 'summary', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
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
              </div>
            )}
          </motion.div>

          {/* Education Section */}
          <motion.div
            id="education"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Education</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('education')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('education') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('education') && (
              <div className="space-y-6">
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
                  </div>
                ))}
                
                <button
                  onClick={addEducation}
                  className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add another Education
                </button>
              </div>
            )}
          </motion.div>

          {/* Skills Section */}
          <motion.div
            id="skills"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Skills</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('skills')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('skills') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('skills') && (
              <div className="space-y-6">
                {state.cvData.skills.map((skill, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">{skill.name || 'Skill Category'}</h4>
                      <button
                        onClick={() => removeSkill(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Skill Category</label>
                        <input
                          type="text"
                          value={skill.category || skill.name || ''}
                          onChange={(e) => updateSkill(index, 'category', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="Programming Languages"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Skills (comma separated)</label>
                        <input
                          type="text"
                          value={skill.skills?.join(', ') || skill.keywords?.join(', ') || ''}
                          onChange={(e) => updateSkill(index, 'skills', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="JavaScript, Python, Java, C#, Go"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addSkillCategory}
                  className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add another Skill Category
                </button>
              </div>
            )}
          </motion.div>

          {/* Projects Section */}
          <motion.div
            id="projects"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Projects</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('projects')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('projects') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('projects') && (
              <div className="space-y-6">
                {state.cvData.projects.map((project, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">{project.name || 'Project Title'}</h4>
                      <button
                        onClick={() => removeProject(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Project Title</label>
                        <input
                          type="text"
                          value={project.name || ''}
                          onChange={(e) => updateProject(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="Portfolio Website"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Project Link</label>
                        <input
                          type="url"
                          value={project.url || ''}
                          onChange={(e) => updateProject(index, 'url', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="github.com/username/project"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={project.description || ''}
                        onChange={(e) => updateProject(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
                        placeholder="Describe your project and key features..."
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addProject}
                  className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add another Project
                </button>
              </div>
            )}
          </motion.div>

          {/* Awards Section */}
          <motion.div
            id="awards"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Awards & Recognitions</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('awards')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('awards') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('awards') && (
              <div className="space-y-6">
                {(state.cvData.awards || []).map((award, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">{award.title || 'Award Name'}</h4>
                      <button
                        onClick={() => removeAward(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Award Name</label>
                        <input
                          type="text"
                          value={award.title || ''}
                          onChange={(e) => updateAward(index, 'title', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="Employee of the Year"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Awarding Organization</label>
                        <input
                          type="text"
                          value={award.awarder || ''}
                          onChange={(e) => updateAward(index, 'awarder', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="Tech Corp"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Date Awarded</label>
                        <input
                          type="text"
                          value={award.date || ''}
                          onChange={(e) => updateAward(index, 'date', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="December 2022"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addAward}
                  className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add another Award
                </button>
              </div>
            )}
          </motion.div>

          {/* Certifications Section */}
          <motion.div
            id="certifications"
            className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Certifications</h3>
              </div>
              <button
                onClick={() => toggleSectionCollapse('certifications')}
                className="text-white/60 hover:text-white transition-colors"
              >
                {collapsedSections.has('certifications') ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!collapsedSections.has('certifications') && (
              <div className="space-y-6">
                {state.cvData.certificates.map((cert, index) => (
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
                          placeholder="AWS Certified Developer - Associate"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Issuing Organization</label>
                        <input
                          type="text"
                          value={cert.issuer || ''}
                          onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Date Issued</label>
                        <input
                          type="text"
                          value={cert.date || ''}
                          onChange={(e) => updateCertification(index, 'date', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="June 2021"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Credential ID (Optional)</label>
                        <input
                          type="text"
                          value={cert.url || ''}
                          onChange={(e) => updateCertification(index, 'url', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                          placeholder="ABC123DEF456"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={cert.description || ''}
                        onChange={(e) => updateCertification(index, 'description', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
                        placeholder="Brief description of the certification and its relevance..."
                        rows={3}
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
              </div>
            )}
          </motion.div>

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
    </div>
  );
}