'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Eye,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import PersonalInfoForm from './forms/PersonalInfoForm';
import WorkExperienceSection from './forms/WorkExperienceSection';
import EducationSection from './forms/EducationSection';
import SkillsSection from './forms/SkillsSection';
import ProjectsSection from './forms/ProjectsSection';
import CertificatesSection from './forms/CertificatesSection';
import LanguagesSection from './forms/LanguagesSection';
import VolunteerSection from './forms/VolunteerSection';
import AwardsSection from './forms/AwardsSection';
import PublicationsSection from './forms/PublicationsSection';
import InterestsSection from './forms/InterestsSection';
import ReferencesSection from './forms/ReferencesSection';

interface RestructuredStudioLayoutProps {
  // Job Section Props
  jobData: any;
  onJobChange?: () => void;
  
  // ATS Section Props
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  userId: string;
  cvData: any;
  cvId: string;
  onUpdateField?: (path: string, value: any) => void;
  onScoreUpdate?: (score: number) => void;
  
  // CV Creation Props
  onUpdateCV?: (data: any) => void;
  jobContext?: any;
}

export default function RestructuredStudioLayout({
  jobData,
  onJobChange,
  selectedJobId,
  onJobSelection,
  userId,
  cvData,
  cvId,
  onUpdateField,
  onScoreUpdate,
  onUpdateCV,
  jobContext
}: RestructuredStudioLayoutProps) {
  const [expandedCVSections, setExpandedCVSections] = useState<Set<string>>(new Set(['personal_header']));

  // Function to check if a section should be visible based on structure OR legacy data
  const isSectionVisible = (sectionId: string): boolean => {
    if (!cvData) return false;
    
    // Check structure visibility first (source of truth for new architecture)
    if (cvData.structure?.sections && Array.isArray(cvData.structure.sections)) {
      const structureSection = cvData.structure.sections.find(s => s.type === sectionId);
      if (structureSection) {
        // If section exists in structure, use its visibility flag
        return structureSection.visible !== false;
      }
    }
    
    // Fallback: check legacy data for backward compatibility
    // Personal header is always visible
    if (sectionId === 'personal_header') return true;
    
    // For other sections, check if they have been initialized (array exists, even if empty)
    switch (sectionId) {
      case 'work_experience':
        return Array.isArray(cvData.work);
      case 'education':
        return Array.isArray(cvData.education);
      case 'skills':
        return Array.isArray(cvData.skills);
      case 'projects':
        return Array.isArray(cvData.projects);
      case 'certificates':
        return Array.isArray(cvData.certificates);
      case 'languages':
        return Array.isArray(cvData.languages);
      case 'volunteer':
        return Array.isArray(cvData.volunteer);
      case 'awards':
        return Array.isArray(cvData.awards);
      case 'publications':
        return Array.isArray(cvData.publications);
      case 'interests':
        return Array.isArray(cvData.interests);
      case 'references':
        return Array.isArray(cvData.references);
      default:
        return false;
    }
  };

  // Helper function to check if section has actual data (for UI indicators)
  const hasSectionData = (sectionId: string): boolean => {
    if (!cvData) return false;
    
    switch (sectionId) {
      case 'personal_header':
        return !!(cvData.basics?.name || cvData.basics?.email || cvData.basics?.phone);
      case 'work_experience':
        return Array.isArray(cvData.work) && cvData.work.length > 0;
      case 'education':
        return Array.isArray(cvData.education) && cvData.education.length > 0;
      case 'skills':
        return Array.isArray(cvData.skills) && cvData.skills.length > 0;
      case 'projects':
        return Array.isArray(cvData.projects) && cvData.projects.length > 0;
      case 'certificates':
        return Array.isArray(cvData.certificates) && cvData.certificates.length > 0;
      case 'languages':
        return Array.isArray(cvData.languages) && cvData.languages.length > 0;
      case 'volunteer':
        return Array.isArray(cvData.volunteer) && cvData.volunteer.length > 0;
      case 'awards':
        return Array.isArray(cvData.awards) && cvData.awards.length > 0;
      case 'publications':
        return Array.isArray(cvData.publications) && cvData.publications.length > 0;
      case 'interests':
        return Array.isArray(cvData.interests) && cvData.interests.length > 0;
      case 'references':
        return Array.isArray(cvData.references) && cvData.references.length > 0;
      default:
        return false;
    }
  };

  const toggleCVSection = (sectionId: string) => {
    const newExpanded = new Set(expandedCVSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedCVSections(newExpanded);
  };

  // Define all possible sections
  const allSectionIds = ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer', 'awards', 'publications', 'interests', 'references'];
  
  // Show sections based on structure visibility OR legacy data initialization
  const visibleSections = allSectionIds.filter(id => isSectionVisible(id));

  // Helper function to render section based on ID
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'personal_header':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('personal_header')}
            onOpenChange={() => toggleCVSection('personal_header')}
          >
            <div className="bg-white/5 rounded-2xl border border-white/10">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <span className="font-medium">Personal Information</span>
                  </div>
                  {expandedCVSections.has('personal_header') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <PersonalInfoForm
                  data={cvData?.basics || {}}
                  onUpdate={(field: string, value: any) => {
                    if (onUpdateField) {
                      if (field.includes('.')) {
                        onUpdateField(`basics.${field}`, value);
                      } else {
                        onUpdateField(`basics.${field}`, value);
                      }
                    } else {
                      onUpdateCV?.({ ...cvData, basics: { ...cvData?.basics, [field]: value } });
                    }
                  }}
                  cvData={cvData}
                  jobData={jobContext}
                  userId={userId}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      
      case 'work_experience':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('work_experience')}
            onOpenChange={() => toggleCVSection('work_experience')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('work_experience') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💼</span>
                    <span className="font-medium">Work Experience</span>
                  </div>
                  {expandedCVSections.has('work_experience') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <WorkExperienceSection
                  data={cvData?.work || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('work', data);
                    } else {
                      onUpdateCV?.({ ...cvData, work: data });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      
      case 'education':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('education')}
            onOpenChange={() => toggleCVSection('education')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('education') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎓</span>
                    <span className="font-medium">Education</span>
                  </div>
                  {expandedCVSections.has('education') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <EducationSection
                  data={cvData?.education || []}
                  onUpdate={(path, value) => {
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, education: value });
                    }
                  }}
                  onAdd={() => {
                    const newEducation = [...(cvData?.education || []), {
                      institution: '',
                      area: '',
                      studyType: '',
                      startDate: '',
                      endDate: '',
                      score: '',
                      courses: []
                    }];
                    if (onUpdateField) {
                      onUpdateField('education', newEducation);
                    } else {
                      onUpdateCV?.({ ...cvData, education: newEducation });
                    }
                  }}
                  onRemove={(index) => {
                    const newEducation = (cvData?.education || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('education', newEducation);
                    } else {
                      onUpdateCV?.({ ...cvData, education: newEducation });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      
      case 'skills':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('skills')}
            onOpenChange={() => toggleCVSection('skills')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('skills') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🛠️</span>
                    <span className="font-medium">Skills</span>
                  </div>
                  {expandedCVSections.has('skills') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <SkillsSection
                  data={cvData?.skills || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('skills', data);
                    } else {
                      onUpdateCV?.({ ...cvData, skills: data });
                    }
                  }}
                  onAdd={() => {
                    const newSkills = [...(cvData?.skills || []), { name: '', level: '', keywords: [] }];
                    if (onUpdateField) {
                      onUpdateField('skills', newSkills);
                    } else {
                      onUpdateCV?.({ ...cvData, skills: newSkills });
                    }
                  }}
                  onRemove={(index) => {
                    const newSkills = (cvData?.skills || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('skills', newSkills);
                    } else {
                      onUpdateCV?.({ ...cvData, skills: newSkills });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'projects':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('projects')}
            onOpenChange={() => toggleCVSection('projects')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('projects') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🚀</span>
                    <span className="font-medium">Projects</span>
                  </div>
                  {expandedCVSections.has('projects') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <ProjectsSection
                  data={cvData?.projects || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('projects', data);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: data });
                    }
                  }}
                  onAdd={() => {
                    const newProjects = [...(cvData?.projects || []), { name: '', description: '', startDate: '', endDate: '', highlights: [], url: '' }];
                    if (onUpdateField) {
                      onUpdateField('projects', newProjects);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: newProjects });
                    }
                  }}
                  onRemove={(index) => {
                    const newProjects = (cvData?.projects || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('projects', newProjects);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: newProjects });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'certificates':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('certificates')}
            onOpenChange={() => toggleCVSection('certificates')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('certificates') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📜</span>
                    <span className="font-medium">Certificates</span>
                  </div>
                  {expandedCVSections.has('certificates') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <CertificatesSection
                  data={cvData?.certificates || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('certificates', data);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: data });
                    }
                  }}
                  onAdd={() => {
                    const newCertificates = [...(cvData?.certificates || []), { name: '', issuer: '', date: '', url: '' }];
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                  onRemove={(index) => {
                    const newCertificates = (cvData?.certificates || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'languages':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('languages')}
            onOpenChange={() => toggleCVSection('languages')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('languages') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🌐</span>
                    <span className="font-medium">Languages</span>
                  </div>
                  {expandedCVSections.has('languages') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <LanguagesSection
                  data={cvData?.languages || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('languages', data);
                    } else {
                      onUpdateCV?.({ ...cvData, languages: data });
                    }
                  }}
                  onAdd={() => {
                    const newLanguages = [...(cvData?.languages || []), { language: '', fluency: 'intermediate' }];
                    if (onUpdateField) {
                      onUpdateField('languages', newLanguages);
                    } else {
                      onUpdateCV?.({ ...cvData, languages: newLanguages });
                    }
                  }}
                  onRemove={(index) => {
                    const newLanguages = (cvData?.languages || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('languages', newLanguages);
                    } else {
                      onUpdateCV?.({ ...cvData, languages: newLanguages });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'volunteer':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('volunteer')}
            onOpenChange={() => toggleCVSection('volunteer')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('volunteer') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🤝</span>
                    <span className="font-medium">Volunteer Experience</span>
                  </div>
                  {expandedCVSections.has('volunteer') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <VolunteerSection
                  data={cvData?.volunteer || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('volunteer', data);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: data });
                    }
                  }}
                  onAdd={() => {
                    const newVolunteer = [...(cvData?.volunteer || []), { organization: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] }];
                    if (onUpdateField) {
                      onUpdateField('volunteer', newVolunteer);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: newVolunteer });
                    }
                  }}
                  onRemove={(index) => {
                    const newVolunteer = (cvData?.volunteer || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('volunteer', newVolunteer);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: newVolunteer });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'awards':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('awards')}
            onOpenChange={() => toggleCVSection('awards')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('awards') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <span className="font-medium">Awards & Recognition</span>
                  </div>
                  {expandedCVSections.has('awards') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <AwardsSection
                  data={cvData?.awards || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('awards', data);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: data });
                    }
                  }}
                  onAdd={() => {
                    const newAwards = [...(cvData?.awards || []), { title: '', date: '', awarder: '', summary: '' }];
                    if (onUpdateField) {
                      onUpdateField('awards', newAwards);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: newAwards });
                    }
                  }}
                  onRemove={(index) => {
                    const newAwards = (cvData?.awards || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('awards', newAwards);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: newAwards });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'publications':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('publications')}
            onOpenChange={() => toggleCVSection('publications')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('publications') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📚</span>
                    <span className="font-medium">Publications</span>
                  </div>
                  {expandedCVSections.has('publications') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <PublicationsSection
                  data={cvData?.publications || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('publications', data);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: data });
                    }
                  }}
                  onAdd={() => {
                    const newPublications = [...(cvData?.publications || []), { name: '', publisher: '', releaseDate: '', url: '', summary: '' }];
                    if (onUpdateField) {
                      onUpdateField('publications', newPublications);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: newPublications });
                    }
                  }}
                  onRemove={(index) => {
                    const newPublications = (cvData?.publications || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('publications', newPublications);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: newPublications });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'interests':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('interests')}
            onOpenChange={() => toggleCVSection('interests')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('interests') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎯</span>
                    <span className="font-medium">Interests</span>
                  </div>
                  {expandedCVSections.has('interests') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <InterestsSection
                  data={cvData?.interests || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('interests', data);
                    } else {
                      onUpdateCV?.({ ...cvData, interests: data });
                    }
                  }}
                  onAdd={() => {
                    const newInterests = [...(cvData?.interests || []), { name: '', keywords: [] }];
                    if (onUpdateField) {
                      onUpdateField('interests', newInterests);
                    } else {
                      onUpdateCV?.({ ...cvData, interests: newInterests });
                    }
                  }}
                  onRemove={(index) => {
                    const newInterests = (cvData?.interests || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('interests', newInterests);
                    } else {
                      onUpdateCV?.({ ...cvData, interests: newInterests });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      case 'references':
        return (
          <Collapsible
            key={sectionId}
            open={expandedCVSections.has('references')}
            onOpenChange={() => toggleCVSection('references')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('references') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👥</span>
                    <span className="font-medium">References</span>
                  </div>
                  {expandedCVSections.has('references') ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <ReferencesSection
                  data={cvData?.references || []}
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('references', data);
                    } else {
                      onUpdateCV?.({ ...cvData, references: data });
                    }
                  }}
                  onAdd={() => {
                    const newReferences = [...(cvData?.references || []), { name: '', reference: '', position: '', company: '' }];
                    if (onUpdateField) {
                      onUpdateField('references', newReferences);
                    } else {
                      onUpdateCV?.({ ...cvData, references: newReferences });
                    }
                  }}
                  onRemove={(index) => {
                    const newReferences = (cvData?.references || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('references', newReferences);
                    } else {
                      onUpdateCV?.({ ...cvData, references: newReferences });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full bg-[#1A201A]">
      <div className="pt-6 px-6 pb-6 space-y-4">
      {/* Header with Collapse All/Expand All Button */}
      {visibleSections.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">CV Sections</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (visibleSections.length === 0) return;
              const allExpanded = visibleSections.every((id: string) => expandedCVSections.has(id));
              if (allExpanded) {
                setExpandedCVSections(new Set());
              } else {
                setExpandedCVSections(new Set(visibleSections));
              }
            }}
            className="bg-[#2D332D] border-[#2D332D] text-white hover:bg-[#3D433D]"
          >
            {visibleSections.length > 0 && visibleSections.every((id: string) => expandedCVSections.has(id)) ? 'Collapse All' : 'Expand All'}
          </Button>
        </div>
      )}

      {/* Render visible sections (based on structure or initialization) */}
        <div className="space-y-2 pb-6">
        {visibleSections.map((sectionId: string) => renderSection(sectionId))}
        </div>
      </div>
    </div>
  );
}