'use client';

import React, { useState, useMemo } from 'react';
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
import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';

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

  // Get visible sections using centralized selector - computed once
  const visibleSectionsList = useMemo(
    () => getVisibleCVSections(cvData, 'cv'),
    [cvData]
  );

  // Create fast lookup Set for O(1) visibility checks
  const visibleSectionIds = useMemo(
    () => new Set(visibleSectionsList.map(s => s.type)),
    [visibleSectionsList]
  );

  // Simple visibility check using pre-computed Set
  const isSectionVisible = (sectionId: string): boolean => {
    return visibleSectionIds.has(sectionId);
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

  // Use visible sections from selector (maintains order from structure)
  const visibleSections = visibleSectionsList.map(s => s.type);

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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-2xl ${
                    expandedCVSections.has('personal_header') ? '' : 'rounded-b-2xl'
                  }`}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('work_experience') ? '' : 'rounded-b-xl'
                  }`}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('education') ? '' : 'rounded-b-xl'
                  }`}
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
                  onUpdate={(data) => {
                    if (onUpdateField) {
                      onUpdateField('education', data);
                    } else {
                      onUpdateCV?.({ ...cvData, education: data });
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
                      courses: [],
                      description: ''
                    }];
                    if (onUpdateField) {
                      onUpdateField('education', newEducation);
                    } else {
                      onUpdateCV?.({ ...cvData, education: newEducation });
                    }
                  }}
                  onRemove={(index) => {
                    const newEducation = (cvData?.education || []).filter((_: any, i: number) => i !== index);
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('skills') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newSkills = (cvData?.skills || []).filter((_: any, i: number) => i !== index);
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('projects') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newProjects = (cvData?.projects || []).filter((_: any, i: number) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('projects', newProjects);
                    } else {
                      onUpdateCV?.({ ...cvData, projects: newProjects });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('certificates') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newCertificates = [...(cvData?.certificates || []), { name: '', issuer: '', date: '', url: '', description: '' }];
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                  onRemove={(index) => {
                    const newCertificates = (cvData?.certificates || []).filter((_: any, i: number) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('certificates', newCertificates);
                    } else {
                      onUpdateCV?.({ ...cvData, certificates: newCertificates });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('languages') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newLanguages = (cvData?.languages || []).filter((_: any, i: number) => i !== index);
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('volunteer') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newVolunteer = (cvData?.volunteer || []).filter((_: any, i: number) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('volunteer', newVolunteer);
                    } else {
                      onUpdateCV?.({ ...cvData, volunteer: newVolunteer });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('awards') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newAwards = (cvData?.awards || []).filter((_: any, i: number) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('awards', newAwards);
                    } else {
                      onUpdateCV?.({ ...cvData, awards: newAwards });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('publications') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newPublications = (cvData?.publications || []).filter((_: any, i: number) => i !== index);
                    if (onUpdateField) {
                      onUpdateField('publications', newPublications);
                    } else {
                      onUpdateCV?.({ ...cvData, publications: newPublications });
                    }
                  }}
                  jobData={jobContext}
                  userId={userId}
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('interests') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newInterests = (cvData?.interests || []).filter((_: any, i: number) => i !== index);
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
                  className={`w-full justify-between p-4 h-auto hover:bg-[#2D332D] text-white rounded-t-xl ${
                    expandedCVSections.has('references') ? '' : 'rounded-b-xl'
                  }`}
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
                    const newReferences = (cvData?.references || []).filter((_: any, i: number) => i !== index);
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

  // Show loading state if cvData is not available yet
  if (!cvData) {
    return (
      <div className="h-full w-full bg-[#1A201A] flex items-center justify-center">
        <div className="text-center text-white/60">
          <p>Loading CV data...</p>
        </div>
      </div>
    );
  }

  // Show message if no sections are visible (shouldn't happen, but handle gracefully)
  if (visibleSections.length === 0) {
    return (
      <div className="h-full w-full bg-[#1A201A]">
        <div className="pt-6 px-6 pb-6">
          <div className="text-center text-white/60 py-8">
            <p className="mb-2">No sections available</p>
            <p className="text-sm">Add sections to your CV to get started.</p>
          </div>
        </div>
      </div>
    );
  }

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