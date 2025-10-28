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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cv']));
  const [expandedCVSections, setExpandedCVSections] = useState<Set<string>>(new Set(['personal_header', 'work_experience', 'education']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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

  const toggleAllCVSections = () => {
    const allSectionIds = ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer', 'awards', 'publications', 'interests', 'references'];
    const allExpanded = allSectionIds.every(id => expandedCVSections.has(id));
    
    if (allExpanded) {
      setExpandedCVSections(new Set());
    } else {
      setExpandedCVSections(new Set(allSectionIds));
    }
  };

  const sections = [
    {
      id: 'cv',
      title: 'Create & Edit Your CV',
      icon: FileText,
      content: (
        <div className="p-6 space-y-4">
          {/* Header with Collapse All/Expand All Button */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">CV Sections</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCVSections}
              className="bg-[#2D332D] border-[#2D332D] text-white hover:bg-[#3D433D]"
            >
              {expandedCVSections.size === 12 ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>

          {/* Personal Information */}
          <Collapsible
            open={expandedCVSections.has('personal_header')}
            onOpenChange={() => toggleCVSection('personal_header')}
          >
            <div className={`border rounded-xl ${expandedCVSections.has('personal_header') ? 'border-[#2D332D]' : 'border-[#2D332D] bg-[#1A201A]'}`}>
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
                  onUpdate={(field, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(`basics.${field}`, value);
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

          {/* Work Experience */}
          <Collapsible
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
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField('work', data);
                    } else {
                      onUpdateCV?.({ ...cvData, work: data });
                    }
                  }}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Education */}
          <Collapsible
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
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, education: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new education item
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
                    // Remove education item
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

          {/* Skills */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, skills: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new skill item
                    const newSkills = [...(cvData?.skills || []), {
                      name: '',
                      level: '',
                      keywords: []
                    }];
                    if (onUpdateField) {
                      onUpdateField('skills', newSkills);
                    } else {
                      onUpdateCV?.({ ...cvData, skills: newSkills });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove skill item
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

          {/* Projects */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new project item
                    const newProjects = [...(cvData?.projects || []), {
                      name: '',
                      description: '',
                      startDate: '',
                      endDate: '',
                      highlights: [],
                      url: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('projects', newProjects);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: newProjects });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove project item
                    const newProjects = (cvData?.projects || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('projects', newProjects);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: newProjects });
                    }
                  }}
                  jobData={jobContext}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Certificates */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new certificate item
                    const newCertificates = [...(cvData?.certificates || []), {
                      name: '',
                      issuer: '',
                      date: '',
                      url: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove certificate item
                    const newCertificates = (cvData?.certificates || []).filter((_, i) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                  jobData={jobContext}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Languages */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, languages: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new language item
                    const newLanguages = [...(cvData?.languages || []), {
                      language: '',
                      fluency: 'intermediate'
                    }];
                    if (onUpdateField) {
                      onUpdateField('languages', newLanguages);
                    } else {
                      onUpdateCV?.({ ...cvData, languages: newLanguages });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove language item
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

          {/* Volunteer Experience */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new volunteer item
                    const newVolunteer = [...(cvData?.volunteer || []), {
                      organization: '',
                      position: '',
                      startDate: '',
                      endDate: '',
                      summary: '',
                      highlights: []
                    }];
                    if (onUpdateField) {
                      onUpdateField('volunteer', newVolunteer);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: newVolunteer });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove volunteer item
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

          {/* Awards & Recognition */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new award item
                    const newAwards = [...(cvData?.awards || []), {
                      title: '',
                      date: '',
                      awarder: '',
                      summary: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('awards', newAwards);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: newAwards });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove award item
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

          {/* Publications */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new publication item
                    const newPublications = [...(cvData?.publications || []), {
                      name: '',
                      publisher: '',
                      releaseDate: '',
                      url: '',
                      summary: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('publications', newPublications);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: newPublications });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove publication item
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

          {/* Interests */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, interests: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new interest item
                    const newInterests = [...(cvData?.interests || []), ''];
                    if (onUpdateField) {
                      onUpdateField('interests', newInterests);
                    } else {
                      onUpdateCV?.({ ...cvData, interests: newInterests });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove interest item
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

          {/* References */}
          <Collapsible
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
                  onUpdate={(path, value) => {
                    // Use onUpdateField for proper nested updates
                    if (onUpdateField) {
                      onUpdateField(path, value);
                    } else {
                      onUpdateCV?.({ ...cvData, references: data });
                    }
                  }}
                  onAdd={() => {
                    // Add new reference item
                    const newReferences = [...(cvData?.references || []), {
                      name: '',
                      reference: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('references', newReferences);
                    } else {
                      onUpdateCV?.({ ...cvData, references: newReferences });
                    }
                  }}
                  onRemove={(index) => {
                    // Remove reference item
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
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div key={section.id}>
          <Card className="bg-transparent border-transparent">
            <Collapsible
              open={expandedSections.has(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-6 h-auto hover:bg-[#2D332D] text-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#2D332D] rounded-xl">
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-semibold text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>
                  {expandedSections.has(section.id) ? (
                    <ChevronUp className="w-5 h-5 text-white" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <Separator className="mb-6" />
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {section.content}
                  </motion.div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      ))}
    </div>
  );
}
