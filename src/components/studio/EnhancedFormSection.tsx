'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  GripVertical,
  Sparkles,
  Crown,
  Target,
  TrendingUp
} from 'lucide-react';
import AIEnhancedFormField from './AIEnhancedFormField';
import ATSScoreGauge from '@/components/ui/ATSScoreGauge';
import JobSelector from './JobSelector';
import CVParserButton from './CVParserButton';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';
import { useUserPlan } from '@/lib/hooks/useUserPlan';

interface EnhancedFormSectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isExpanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  progress?: number;
  hasAI?: boolean;
  aiFeatures?: string[];
  className?: string;
}

interface FormSectionProps {
  section: {
    id: string;
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    fields: Array<{
      key: string;
      label: string;
      type: 'input' | 'textarea';
      placeholder?: string;
      fieldType?: string;
      required?: boolean;
      maxLength?: number;
      rows?: number;
    }>;
  };
  data: any;
  onUpdate: (path: string, value: any) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const EnhancedFormSection: React.FC<EnhancedFormSectionProps> = ({
  title,
  icon: Icon,
  isExpanded = true,
  onToggle,
  children,
  progress = 0,
  hasAI = false,
  aiFeatures = [],
  className = ''
}) => {
  const { hasAI: userHasAI } = useUserPlan();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-lime-200/50 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm ${className}`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-lime-50/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Icon size={20} className="text-lime-600" />
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          
          {/* Progress indicator */}
          {progress > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-lime-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* AI Features Badge */}
          {hasAI && userHasAI && aiFeatures.length > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-lime-100 text-lime-700 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-medium">AI</span>
            </div>
          )}
          
          {/* PRO Badge for non-AI users */}
          {hasAI && !userHasAI && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-medium">PRO</span>
            </div>
          )}
          
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  data,
  onUpdate,
  cvData,
  jobData,
  isExpanded = true,
  onToggle
}) => {
  const { hasAI } = useUserPlan();
  const [isDragging, setIsDragging] = useState(false);

  const calculateProgress = () => {
    if (!data) return 0;
    
    const filledFields = section.fields.filter(field => {
      const value = data[field.key];
      return value && value.toString().trim().length > 0;
    });
    
    return Math.round((filledFields.length / section.fields.length) * 100);
  };

  const getAIFeatures = () => {
    const features = [];
    if (section.id === 'basics') features.push('Summary Optimization', 'Professional Tone');
    if (section.id === 'work') features.push('Achievement Quantification', 'Action Verbs');
    if (section.id === 'skills') features.push('Keyword Matching', 'Skill Categorization');
    if (section.id === 'projects') features.push('Impact Description', 'Tech Stack');
    return features;
  };

  return (
    <EnhancedFormSection
      title={section.title}
      icon={section.icon}
      isExpanded={isExpanded}
      onToggle={onToggle}
      progress={calculateProgress()}
      hasAI={hasAI}
      aiFeatures={getAIFeatures()}
    >
      <div className="space-y-4">
        {section.fields.map((field) => (
          <AIEnhancedFormField
            key={field.key}
            type={field.type}
            value={data[field.key] || ''}
            onChange={(value) => onUpdate(field.key, value)}
            label={field.label}
            placeholder={field.placeholder}
            fieldType={field.fieldType as any}
            cvData={cvData}
            jobData={jobData}
            required={field.required}
            maxLength={field.maxLength}
            rows={field.rows}
            showCharacterCount={field.maxLength ? true : false}
          />
        ))}
      </div>
    </EnhancedFormSection>
  );
};

// Specialized section components
export const PersonalInfoSection: React.FC<{
  data: any;
  onUpdate: (path: string, value: any) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
  atsScore?: number | null;
  selectedJobId?: string | null;
  onJobSelection?: (jobId: string | null) => void;
  userId?: string;
}> = ({ data, onUpdate, cvData, jobData, isExpanded, onToggle, atsScore, selectedJobId, onJobSelection, userId }) => {
  const { User } = require('lucide-react');
  
  const fields = [
    { key: 'name', label: 'Full Name', type: 'input' as const, required: true, maxLength: 100, placeholder: 'Enter your full name', rows: undefined },
    { key: 'label', label: 'Professional Title', type: 'input' as const, fieldType: 'position' as const, maxLength: 100, placeholder: 'e.g., Software Engineer', rows: undefined },
    { key: 'email', label: 'Email', type: 'input' as const, required: true, maxLength: 100, placeholder: 'your.email@example.com', rows: undefined },
    { key: 'phone', label: 'Phone', type: 'input' as const, maxLength: 20, placeholder: '+1 (555) 123-4567', rows: undefined },
  ];

  const summaryField = { 
    key: 'summary', 
    label: 'Professional Summary', 
    type: 'textarea' as const, 
    fieldType: 'summary' as const, 
    rows: 4, 
    maxLength: 500, 
    placeholder: 'Write a brief professional summary...',
    required: false
  };

  return (
    <EnhancedFormSection
      title="Personal Information"
      icon={User}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Professional Summary', 'Title Optimization', 'Contact Details']}
    >
      <div className="space-y-6">
        {/* ATS Score and Personal Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ATS Score Column */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">ATS Score</h3>
              <div className="flex items-center justify-center">
                <ATSScoreGauge 
                  score={atsScore || 0} 
                  size="lg" 
                  showLabel={false}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {atsScore ? `${atsScore}% Match` : 'No job selected'}
              </div>
            </div>
            
            {/* Job Selector */}
            <div className="w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Target Job</h3>
              <p className="text-sm text-gray-600 mb-3">Select a job to calculate ATS score</p>
              <JobSelector
                selectedJobId={selectedJobId || null}
                onJobSelection={onJobSelection || (() => {})}
                userId={userId || ''}
              />
            </div>

            {/* CV Parser */}
            <div className="w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Fill</h3>
              <p className="text-sm text-gray-600 mb-3">Upload your existing CV to auto-fill fields</p>
              <CVParserButton
                onDataParsed={(parsedData) => {
                  // Update personal information fields
                  if (parsedData.basics) {
                    Object.keys(parsedData.basics).forEach(key => {
                      if (parsedData.basics[key]) {
                        onUpdate(key, parsedData.basics[key]);
                      }
                    });
                  }
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Personal Info Fields Column */}
          <div className="space-y-4">
            {fields.map((field) => (
              <AIEnhancedFormField
                key={field.key}
                type={field.type}
                fieldType={field.fieldType}
                label={field.label}
                value={data[field.key] || ''}
                onChange={(value) => onUpdate(field.key, value)}
                placeholder={field.placeholder}
                required={field.required}
                disabled={false}
                maxLength={field.maxLength}
                rows={field.rows || undefined}
                showCharacterCount={field.maxLength ? true : false}
                cvData={cvData}
                jobData={jobData}
              />
            ))}
          </div>
        </div>

        {/* Professional Summary - Full Width */}
        <div className="pt-4 border-t border-gray-200">
          <AIEnhancedFormField
            type={summaryField.type}
            fieldType={summaryField.fieldType}
            label={summaryField.label}
            value={data[summaryField.key] || ''}
            onChange={(value) => onUpdate(summaryField.key, value)}
            placeholder={summaryField.placeholder}
            required={summaryField.required}
            disabled={false}
            maxLength={summaryField.maxLength}
            rows={summaryField.rows}
            showCharacterCount={summaryField.maxLength ? true : false}
            cvData={cvData}
            jobData={jobData}
          />
        </div>
      </div>
    </EnhancedFormSection>
  );
};

export const WorkExperienceSection: React.FC<{
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ data, onUpdate, onAdd, onRemove, cvData, jobData, isExpanded, onToggle }) => {
  const { Briefcase } = require('lucide-react');

  return (
    <EnhancedFormSection
      title="Work Experience"
      icon={Briefcase}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Achievement Quantification', 'Action Verbs', 'Impact Description']}
    >
      <div className="space-y-4">
        {data.map((work, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Position {index + 1}</h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remove position"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIEnhancedFormField
                type="input"
                value={work.position || ''}
                onChange={(value) => onUpdate(`work.${index}.position`, value)}
                label="Job Title"
                placeholder="e.g., Senior Software Engineer"
                fieldType="position"
                cvData={cvData}
                jobData={jobData}
                required
                maxLength={100}
              />
              
              <AIEnhancedFormField
                type="input"
                value={work.name || ''}
                onChange={(value) => onUpdate(`work.${index}.name`, value)}
                label="Company"
                placeholder="e.g., Google Inc."
                fieldType="company"
                cvData={cvData}
                jobData={jobData}
                required
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <AIEnhancedFormField
                type="input"
                value={work.startDate || ''}
                onChange={(value) => onUpdate(`work.${index}.startDate`, value)}
                label="Start Date"
                placeholder="e.g., Jan 2020"
                maxLength={20}
              />
              
              <AIEnhancedFormField
                type="input"
                value={work.endDate || ''}
                onChange={(value) => onUpdate(`work.${index}.endDate`, value)}
                label="End Date"
                placeholder="e.g., Present"
                maxLength={20}
              />
            </div>

            <div className="mt-4">
              <AIEnhancedFormField
                type="textarea"
                value={work.summary || ''}
                onChange={(value) => onUpdate(`work.${index}.summary`, value)}
                label="Role Description"
                placeholder="Describe your responsibilities and achievements..."
                fieldType="description"
                cvData={cvData}
                jobData={jobData}
                rows={3}
                maxLength={500}
                showCharacterCount
              />
            </div>

            <div className="mt-4">
              <AIEnhancedFormField
                type="textarea"
                value={work.highlights?.join('\n') || ''}
                onChange={(value) => onUpdate(`work.${index}.highlights`, value.split('\n').filter(line => line.trim()))}
                label="Key Achievements"
                placeholder="• Led team of 5 developers\n• Increased efficiency by 25%\n• Delivered project ahead of schedule"
                fieldType="highlights"
                cvData={cvData}
                jobData={jobData}
                rows={4}
                maxLength={1000}
                showCharacterCount
              />
            </div>
          </motion.div>
        ))}

        <motion.button
          type="button"
          onClick={onAdd}
          className="w-full p-4 border-2 border-dashed border-lime-300 rounded-lg text-lime-600 hover:border-lime-400 hover:text-lime-700 transition-colors flex items-center justify-center space-x-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-4 w-4" />
          <span>Add Work Experience</span>
        </motion.button>
      </div>
    </EnhancedFormSection>
  );
};

export const ProjectsSection: React.FC<{
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ data, onUpdate, onAdd, onRemove, cvData, jobData, isExpanded, onToggle }) => {
  const { FolderOpen } = require('lucide-react');

  return (
    <EnhancedFormSection
      title="Projects"
      icon={FolderOpen}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Project Description', 'Technology Stack', 'Impact Quantification']}
    >
      <div className="space-y-4">
        {data.map((project, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Project {index + 1}</h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remove project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIEnhancedFormField
                type="input"
                fieldType="projects"
                label="Project Name"
                value={project.name || ''}
                onChange={(value) => onUpdate(`projects.${index}.name`, value)}
                placeholder="e.g., E-commerce Platform"
                required={true}
                disabled={false}
                maxLength={100}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="projects"
                label="Technologies Used"
                value={project.technologies?.join(', ') || ''}
                onChange={(value) => onUpdate(`projects.${index}.technologies`, value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="e.g., React, Node.js, MongoDB"
                required={false}
                disabled={false}
                maxLength={150}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="projects"
                label="Project URL"
                value={project.url || ''}
                onChange={(value) => onUpdate(`projects.${index}.url`, value)}
                placeholder="e.g., https://github.com/username/project"
                required={false}
                disabled={false}
                maxLength={200}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="projects"
                label="Role"
                value={project.role || ''}
                onChange={(value) => onUpdate(`projects.${index}.role`, value)}
                placeholder="e.g., Full Stack Developer, Team Lead"
                required={false}
                disabled={false}
                maxLength={100}
                cvData={cvData}
                jobData={jobData}
              />
            </div>

            <div className="mt-4">
              <AIEnhancedFormField
                type="textarea"
                fieldType="projects"
                label="Project Description"
                value={project.description || ''}
                onChange={(value) => onUpdate(`projects.${index}.description`, value)}
                placeholder="Describe the project, your role, key achievements, and impact..."
                required={true}
                disabled={false}
                rows={4}
                maxLength={500}
                cvData={cvData}
                jobData={jobData}
              />
            </div>
          </motion.div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-lime-400 hover:text-lime-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </button>
      </div>
    </EnhancedFormSection>
  );
};

export const LanguagesSection: React.FC<{
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ data, onUpdate, onAdd, onRemove, cvData, jobData, isExpanded, onToggle }) => {
  const { Globe } = require('lucide-react');

  return (
    <EnhancedFormSection
      title="Languages"
      icon={Globe}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Language Proficiency', 'Relevance to Job']}
    >
      <div className="space-y-4">
        {data.map((language, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Language {index + 1}</h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remove language"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIEnhancedFormField
                type="input"
                fieldType="skills"
                label="Language"
                value={language.language || ''}
                onChange={(value) => onUpdate(`languages.${index}.language`, value)}
                placeholder="e.g., English, Spanish, French"
                required={true}
                disabled={false}
                maxLength={50}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="skills"
                label="Proficiency Level"
                value={language.fluency || ''}
                onChange={(value) => onUpdate(`languages.${index}.fluency`, value)}
                placeholder="e.g., Native, Fluent, Intermediate, Basic"
                required={true}
                disabled={false}
                maxLength={50}
                cvData={cvData}
                jobData={jobData}
              />
            </div>
          </motion.div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-lime-400 hover:text-lime-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Language</span>
        </button>
      </div>
    </EnhancedFormSection>
  );
};

export const CertificationsSection: React.FC<{
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ data, onUpdate, onAdd, onRemove, cvData, jobData, isExpanded, onToggle }) => {
  const { Award } = require('lucide-react');

  return (
    <EnhancedFormSection
      title="Certifications"
      icon={Award}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Certification Relevance', 'Expiry Management']}
    >
      <div className="space-y-4">
        {data.map((cert, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Certification {index + 1}</h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remove certification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIEnhancedFormField
                type="input"
                fieldType="certificates"
                label="Certification Name"
                value={cert.name || ''}
                onChange={(value) => onUpdate(`certificates.${index}.name`, value)}
                placeholder="e.g., AWS Certified Solutions Architect"
                required={true}
                disabled={false}
                maxLength={100}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="certificates"
                label="Issuing Organization"
                value={cert.issuer || ''}
                onChange={(value) => onUpdate(`certificates.${index}.issuer`, value)}
                placeholder="e.g., Amazon Web Services"
                required={true}
                disabled={false}
                maxLength={100}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="certificates"
                label="Issue Date"
                value={cert.date || ''}
                onChange={(value) => onUpdate(`certificates.${index}.date`, value)}
                placeholder="e.g., January 2023"
                required={false}
                disabled={false}
                maxLength={50}
                cvData={cvData}
                jobData={jobData}
              />

              <AIEnhancedFormField
                type="input"
                fieldType="certificates"
                label="Expiry Date"
                value={cert.expiryDate || ''}
                onChange={(value) => onUpdate(`certificates.${index}.expiryDate`, value)}
                placeholder="e.g., January 2026"
                required={false}
                disabled={false}
                maxLength={50}
                cvData={cvData}
                jobData={jobData}
              />
            </div>

            <div className="mt-4">
              <AIEnhancedFormField
                type="textarea"
                fieldType="certificates"
                label="Description"
                value={cert.description || ''}
                onChange={(value) => onUpdate(`certificates.${index}.description`, value)}
                placeholder="Brief description of the certification and its relevance..."
                required={false}
                disabled={false}
                rows={2}
                maxLength={200}
                cvData={cvData}
                jobData={jobData}
              />
            </div>
          </motion.div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-lime-400 hover:text-lime-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Certification</span>
        </button>
      </div>
    </EnhancedFormSection>
  );
};

export const SkillsSection: React.FC<{
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ data, onUpdate, onAdd, onRemove, cvData, jobData, isExpanded, onToggle }) => {
  const { Zap } = require('lucide-react');

  return (
    <EnhancedFormSection
      title="Skills & Expertise"
      icon={Zap}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasAI={true}
      aiFeatures={['Keyword Matching', 'Skill Categorization', 'ATS Optimization']}
    >
      <div className="space-y-4">
        {data.map((skill, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Skill Category {index + 1}</h4>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                title="Remove skill category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIEnhancedFormField
                type="input"
                value={skill.name || ''}
                onChange={(value) => onUpdate(`skills.${index}.name`, value)}
                label="Category Name"
                placeholder="e.g., Technical Skills"
                fieldType="skills"
                cvData={cvData}
                jobData={jobData}
                required
                maxLength={50}
              />
              
              <AIEnhancedFormField
                type="input"
                value={skill.level || ''}
                onChange={(value) => onUpdate(`skills.${index}.level`, value)}
                label="Proficiency Level"
                placeholder="e.g., Advanced"
                maxLength={20}
              />
            </div>

            <div className="mt-4">
              <AIEnhancedFormField
                type="textarea"
                value={skill.keywords?.join(', ') || ''}
                onChange={(value) => onUpdate(`skills.${index}.keywords`, value.split(',').map(k => k.trim()).filter(k => k))}
                label="Skills & Keywords"
                placeholder="e.g., JavaScript, React, Node.js, TypeScript, AWS"
                fieldType="skills"
                cvData={cvData}
                jobData={jobData}
                rows={2}
                maxLength={500}
                showCharacterCount
              />
            </div>
          </motion.div>
        ))}

        <motion.button
          type="button"
          onClick={onAdd}
          className="w-full p-4 border-2 border-dashed border-lime-300 rounded-lg text-lime-600 hover:border-lime-400 hover:text-lime-700 transition-colors flex items-center justify-center space-x-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-4 w-4" />
          <span>Add Skill Category</span>
        </motion.button>
      </div>
    </EnhancedFormSection>
  );
};

export default EnhancedFormSection;
