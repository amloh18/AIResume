'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Sparkles,
  Crown,
  User
} from 'lucide-react';
import AIEnhancedFormField from './AIEnhancedFormField';
// import ATSScoreGauge from '@/components/ui/ATSScoreGauge'; // TODO: Create component if needed
import JobSelector from './JobSelector';
// import CVParserButton from './CVParserButton'; // TODO: Create component if needed
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
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
      className={`bg-white/95 dark:bg-[#1a230f] border border-lime-200/50 dark:border-white/10 rounded-lg overflow-hidden shadow-sm ${className}`}
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
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
          {/* ATS Score Column */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">ATS Score</h3>
              <div className="flex items-center justify-center">
                {/* TODO: Implement ATSScoreGauge component */}
                <div className="text-2xl font-bold text-blue-600">{atsScore || 0}%</div>
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
              {/* TODO: Implement CVParserButton component */}
              <div className="text-sm text-gray-500">CV Parser coming soon</div>
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
            
            {/* Location Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                readOnly={false}
                disabled={false}
                value={(() => {
                  const city = data?.location?.city || '';
                  const region = data?.location?.region || '';
                  return city && region ? `${city}, ${region}` : city || region || '';
                })()}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const parts = inputValue.split(', ').map(p => p.trim());
                  const updatedLocation = {
                    ...(data?.location || {}),
                    city: parts[0] || '',
                    region: parts[1] || ''
                  };
                  onUpdate('location', updatedLocation);
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-text"
                placeholder="City, Region"
              />
            </div>
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

export default EnhancedFormSection;
