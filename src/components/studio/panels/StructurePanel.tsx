'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  ChevronDown, 
  Plus, 
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { DocumentType, StudioSessionContext, JobData } from '@/types/studio';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Import existing CV form components
import PersonalInfoForm from '../forms/PersonalInfoForm';
import WorkExperienceSection from '../forms/WorkExperienceSection';
import EducationSection from '../forms/EducationSection';
import SkillsSection from '../forms/SkillsSection';
import ProjectsSection from '../forms/ProjectsSection';

// Import new form components for unified schema
import VolunteerSection from '../forms/VolunteerSection';
import AwardsSection from '../forms/AwardsSection';
import CertificatesSection from '../forms/CertificatesSection';
import PublicationsSection from '../forms/PublicationsSection';
import LanguagesSection from '../forms/LanguagesSection';
import InterestsSection from '../forms/InterestsSection';
import ReferencesSection from '../forms/ReferencesSection';

interface StructurePanelProps {
  documentType: DocumentType;
  documentData: UnifiedCVDataStructure | string;
  sessionContext: StudioSessionContext;
  availableJobs: JobData[];
  selectedJobId?: string;
  onUpdateDocument: (data: UnifiedCVDataStructure | string) => void;
  onSelectJob: (jobId: string) => void;
}

/**
 * Structure Panel Component
 * 
 * This panel dynamically adapts its content based on:
 * 1. Document Type (CV vs Cover Letter)
 * 2. Studio Mode (Journey vs Standalone)
 * 3. Job Context (ATS-ready or dormant)
 */
export function StructurePanel({
  documentType,
  documentData,
  sessionContext,
  availableJobs,
  selectedJobId,
  onUpdateDocument,
  onSelectJob
}: StructurePanelProps) {
  // CV Mode Structure Panel
  if (documentType === 'cv') {
    return (
      <div className="space-y-4">
        {/* Job Context Section */}
        <JobContextSection
          sessionContext={sessionContext}
          availableJobs={availableJobs}
          selectedJobId={selectedJobId}
          onSelectJob={onSelectJob}
        />

        {/* CV Sections */}
        <CVStructureSections
          cvData={documentData as UnifiedCVDataStructure}
          onUpdateCV={onUpdateDocument}
          jobContext={selectedJobId ? availableJobs.find(j => j.id === selectedJobId) : undefined}
        />
      </div>
    );
  }

  // Cover Letter Mode Structure Panel
  return (
    <div className="space-y-4">
      {/* Job Context Section - Always visible for cover letters */}
      <JobContextSection
        sessionContext={sessionContext}
        availableJobs={availableJobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        forceVisible={true}
      />

      {/* Cover Letter Structure */}
      <CoverLetterStructureSection
        content={documentData as string}
        onUpdateContent={onUpdateDocument}
        jobContext={selectedJobId ? availableJobs.find(j => j.id === selectedJobId) : undefined}
      />
    </div>
  );
}

/**
 * Job Context Section
 * Shows different content based on studio mode
 */
function JobContextSection({
  sessionContext,
  availableJobs,
  selectedJobId,
  onSelectJob,
  forceVisible = false
}: {
  sessionContext: StudioSessionContext;
  availableJobs: JobData[];
  selectedJobId?: string;
  onSelectJob: (jobId: string) => void;
  forceVisible?: boolean;
}) {
  const showJobSelector = sessionContext.mode === 'standalone' || forceVisible;
  const linkedJob = sessionContext.mode === 'journey' ? sessionContext.linkedJob : 
                   selectedJobId ? availableJobs.find(j => j.id === selectedJobId) : undefined;

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Briefcase className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Job Context</h3>
        {linkedJob && (
          <Badge variant="secondary" size="sm">
            {sessionContext.mode === 'journey' ? 'Linked' : 'Selected'}
          </Badge>
        )}
      </div>

      {/* Journey Mode - Display linked job */}
      {sessionContext.mode === 'journey' && linkedJob && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Automatically linked to journey
            </span>
          </div>
          
          <div className="p-3 bg-white dark:bg-gray-700 rounded border">
            <h4 className="font-medium text-gray-900 dark:text-white">{linkedJob.jobTitle}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{linkedJob.company}</p>
            {linkedJob.priority && (
              <Badge variant="outline" size="sm" className="mt-2">
                {linkedJob.priority} priority
              </Badge>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            ATS analysis will automatically use job requirements from this position.
          </p>
        </motion.div>
      )}

      {/* Standalone Mode - Job selector */}
      {showJobSelector && (
        <div className="space-y-3">
          {!selectedJobId && (
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No job selected - ATS features are disabled</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Link to Job (Optional)
            </label>
            <Select value={selectedJobId || ''} onValueChange={onSelectJob}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job for ATS analysis..." />
              </SelectTrigger>
              <SelectContent>
                {availableJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{job.jobTitle}</span>
                      <span className="text-sm text-gray-500">{job.company}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJobId && linkedJob && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  ATS Analysis Enabled
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Your {documentType} will be analyzed against requirements for {linkedJob.jobTitle} at {linkedJob.company}.
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CV Structure Sections
 * Renders collapsible CV form sections
 */
function CVStructureSections({
  cvData,
  onUpdateCV,
  jobContext
}: {
  cvData: UnifiedCVDataStructure;
  onUpdateCV: (data: UnifiedCVDataStructure) => void;
  jobContext?: JobData;
}) {
  const [openSections, setOpenSections] = React.useState<Set<string>>(new Set(['personal_header', 'work_experience']));

  const toggleSection = (sectionId: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);
  };

  const updateCVField = (field: string, value: any) => {
    const fieldPath = field.split('.');
    const updatedData = { ...cvData };
    
    let current = updatedData;
    for (let i = 0; i < fieldPath.length - 1; i++) {
      current = current[fieldPath[i]];
    }
    current[fieldPath[fieldPath.length - 1]] = value;
    
    onUpdateCV(updatedData);
  };

  const sections = [
    { id: 'personal_header', title: 'Personal Information', icon: '👤' },
    { id: 'work_experience', title: 'Work Experience', icon: '💼' },
    { id: 'education', title: 'Education', icon: '🎓' },
    { id: 'skills', title: 'Skills', icon: '🛠️' },
    { id: 'projects', title: 'Projects', icon: '🚀' },
    { id: 'certificates', title: 'Certificates', icon: '📜' },
    { id: 'languages', title: 'Languages', icon: '🌐' },
    { id: 'volunteer', title: 'Volunteer Experience', icon: '🤝' },
    { id: 'awards', title: 'Awards & Recognition', icon: '🏆' },
    { id: 'publications', title: 'Publications', icon: '📚' }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">CV Sections</h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setOpenSections(openSections.size === sections.length ? new Set() : new Set(sections.map(s => s.id)))}
        >
          {openSections.size === sections.length ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {sections.map((section) => (
        <Collapsible
          key={section.id}
          open={openSections.has(section.id)}
          onOpenChange={() => toggleSection(section.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-3 h-auto hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{section.icon}</span>
                <span className="font-medium">{section.title}</span>
                {section.id === 'work_experience' && jobContext && (
                  <Badge variant="secondary" size="sm">ATS</Badge>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${openSections.has(section.id) ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-3 pb-3">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 ml-6"
            >
              {renderSectionContent(section.id, cvData, updateCVField, jobContext)}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

/**
 * Render section content based on section ID
 */
function renderSectionContent(
  sectionId: string, 
  cvData: UnifiedCVDataStructure, 
  updateCVField: (field: string, value: any) => void,
  jobContext?: JobData
) {
  switch (sectionId) {
    case 'personal_header':
      return (
        <PersonalInfoForm
          personalInfo={cvData.basics || {}}
          onUpdate={updateCVField}
          cvData={cvData}
          jobData={jobContext}
          userId=""
        />
      );
    
    case 'work_experience':
      return (
        <WorkExperienceSection
          data={cvData.work || []}
          onUpdate={updateCVField}
          onAdd={() => {}} // Implement add logic
          onRemove={() => {}} // Implement remove logic
          jobData={jobContext}
          userId=""
        />
      );
    
    case 'volunteer':
      return (
        <VolunteerSection
          data={cvData.volunteer || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'education':
      return (
        <EducationSection
          data={cvData.education || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
          jobData={jobContext}
          userId=""
        />
      );
    
    case 'awards':
      return (
        <AwardsSection
          data={cvData.awards || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'certificates':
      return (
        <CertificatesSection
          data={cvData.certificates || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'publications':
      return (
        <PublicationsSection
          data={cvData.publications || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'skills':
      return (
        <SkillsSection
          data={cvData.skills || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'languages':
      return (
        <LanguagesSection
          data={cvData.languages || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'interests':
      return (
        <InterestsSection
          data={cvData.interests || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'references':
      return (
        <ReferencesSection
          data={cvData.references || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    case 'projects':
      return (
        <ProjectsSection
          data={cvData.projects || []}
          onUpdate={updateCVField}
          onAdd={() => {}}
          onRemove={() => {}}
        />
      );
    
    default:
      return (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Section content coming soon...</p>
        </div>
      );
  }
}

/**
 * Cover Letter Structure Section
 */
function CoverLetterStructureSection({
  content,
  onUpdateContent,
  jobContext
}: {
  content: string;
  onUpdateContent: (content: string) => void;
  jobContext?: JobData;
}) {
  const [template, setTemplate] = React.useState<string>('professional');

  const templates = [
    { id: 'professional', name: 'Professional', description: 'Standard business format' },
    { id: 'creative', name: 'Creative', description: 'More personal and engaging' },
    { id: 'technical', name: 'Technical', description: 'Focus on technical skills' }
  ];

  const generateTemplate = (templateId: string) => {
    const templates = {
      professional: `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobContext?.jobTitle || '[Position]'} position at ${jobContext?.company || '[Company]'}. With my background and experience, I am confident I would be a valuable addition to your team.

In my previous roles, I have demonstrated [relevant experience/skills]. I am particularly excited about this opportunity because [specific reason related to the company/role].

I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to ${jobContext?.company || '[Company]'}'s continued success.

Sincerely,
[Your Name]`,
      
      creative: `Hello ${jobContext?.company || '[Company]'} Team,

I was thrilled to discover the ${jobContext?.jobTitle || '[Position]'} opening at ${jobContext?.company || '[Company]'}. Your company's [mention something specific about the company] resonates strongly with my professional values and career aspirations.

[Personal story or connection to the role/company]

I'm excited about the possibility of bringing my [relevant skills] to your team and contributing to [specific company goals/projects].

Looking forward to the opportunity to connect!

Best regards,
[Your Name]`,
      
      technical: `Dear Hiring Team,

I am applying for the ${jobContext?.jobTitle || '[Position]'} role at ${jobContext?.company || '[Company]'}. My technical background in [relevant technologies] aligns well with your requirements.

Key qualifications:
• [Technical skill 1]
• [Technical skill 2]
• [Technical skill 3]

I am excited about the opportunity to contribute to ${jobContext?.company || '[Company]'}'s technical challenges and would welcome the chance to discuss my qualifications further.

Best regards,
[Your Name]`
    };

    onUpdateContent(templates[templateId] || templates.professional);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Cover Letter Structure</h3>
        
        {jobContext && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 mb-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                AI-Powered Suggestions Available
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Templates will be customized for {jobContext.jobTitle} at {jobContext.company}
            </p>
          </motion.div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Quick Templates
          </label>
          <div className="grid gap-2">
            {templates.map((tmpl) => (
              <Button
                key={tmpl.id}
                variant="outline"
                size="sm"
                onClick={() => generateTemplate(tmpl.id)}
                className="justify-start h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">{tmpl.name}</div>
                  <div className="text-xs text-gray-500">{tmpl.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Content Analysis
        </label>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Word Count:</span>
              <span className="font-medium ml-2">{content.split(' ').length}</span>
            </div>
            <div>
              <span className="text-gray-500">Reading Time:</span>
              <span className="font-medium ml-2">{Math.ceil(content.split(' ').length / 200)} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
