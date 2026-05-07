'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  FileText, 
  Edit3, 
  Columns, 
  Keyboard, 
  Maximize2,
  Minimize2
} from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { ResumeEditor } from '@/components/editor/ResumeEditor';

export type InputMode = 'form' | 'editor' | 'split';

export interface DualInputSystemProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  onDataChange: (data: UnifiedCVDataStructure) => void;
  mode?: InputMode;
  onModeChange?: (mode: InputMode) => void;
  className?: string;
}

export const DualInputSystem: React.FC<DualInputSystemProps> = ({
  cvData,
  template,
  onDataChange,
  mode = 'form',
  onModeChange,
  className = '',
}) => {
  const [editorContent, setEditorContent] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const handleModeChange = useCallback((newMode: InputMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    }
  }, [onModeChange]);

  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
  }, []);

  const handleEditorSave = useCallback(() => {
    console.log('Saving editor content:', editorContent);
  }, [editorContent]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    setActiveSection(activeSection === sectionId ? null : sectionId);
  }, [activeSection]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        const modes: InputMode[] = ['form', 'editor', 'split'];
        const currentIndex = modes.indexOf(mode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        handleModeChange(nextMode);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [mode, handleModeChange]);

  if (!cvData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No resume data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dual-input-system flex flex-col h-full ${className}`}>
      <div className="mode-toolbar flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1">
          <ModeButton
            mode="form"
            label="Form"
            icon={FileText}
            isActive={mode === 'form'}
            onClick={() => handleModeChange('form')}
          />
          <ModeButton
            mode="editor"
            label="Editor"
            icon={Edit3}
            isActive={mode === 'editor'}
            onClick={() => handleModeChange('editor')}
          />
          <ModeButton
            mode="split"
            label="Split"
            icon={Columns}
            isActive={mode === 'split'}
            onClick={() => handleModeChange('split')}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Keyboard size={14} />
          <span>Ctrl+E to switch</span>
        </div>
      </div>

      <div className="content-area flex-1 overflow-hidden">
        {mode === 'form' && (
          <FormModeView 
            cvData={cvData}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
          />
        )}

        {mode === 'editor' && (
          <EditorModeView
            initialContent={editorContent}
            onChange={handleEditorChange}
            onSave={handleEditorSave}
          />
        )}

        {mode === 'split' && (
          <SplitModeView
            cvData={cvData}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
            editorContent={editorContent}
            onEditorChange={handleEditorChange}
            onEditorSave={handleEditorSave}
          />
        )}
      </div>
    </div>
  );
};

interface ModeButtonProps {
  mode: InputMode;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const ModeButton: React.FC<ModeButtonProps> = ({ mode, label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

interface FormModeViewProps {
  cvData: UnifiedCVDataStructure;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

const FormModeView: React.FC<FormModeViewProps> = ({ cvData, collapsedSections, onToggleSection }) => {
  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-2xl mx-auto space-y-4">
        <FormSection
          id="basics"
          title="Personal Information"
          isOpen={!collapsedSections.basics}
          onToggle={() => onToggleSection('basics')}
        >
           <div className="grid grid-cols-4 gap-4">
             <FormField label="Full Name" value={cvData.basics?.name} />
             <FormField label="Job Title" value={cvData.basics?.label} />
             <FormField label="Email" value={cvData.basics?.email} />
             <FormField label="Phone" value={cvData.basics?.phone} />
             <FormField label="Location" value={cvData.basics?.location?.city} className="col-span-4" />
           </div>
          <FormField label="Summary" value={cvData.basics?.summary} multiline />
        </FormSection>

        <FormSection
          id="work"
          title="Work Experience"
          isOpen={!collapsedSections.work}
          onToggle={() => onToggleSection('work')}
        >
          {cvData.work?.map((job, index) => (
            <WorkItem key={index} job={job} />
          ))}
        </FormSection>

        <FormSection
          id="education"
          title="Education"
          isOpen={!collapsedSections.education}
          onToggle={() => onToggleSection('education')}
        >
          {cvData.education?.map((edu, index) => (
            <EducationItem key={index} edu={edu} />
          ))}
        </FormSection>

        <FormSection
          id="skills"
          title="Skills"
          isOpen={!collapsedSections.skills}
          onToggle={() => onToggleSection('skills')}
        >
          <div className="flex flex-wrap gap-2">
            {cvData.skills && Array.isArray(cvData.skills) && cvData.skills.map((skill: any, index: number) => (
              <span key={index} className="px-3 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-full text-sm">
                {typeof skill === 'string' ? skill : (skill?.name || skill?.category || '')}
              </span>
            ))}
          </div>
        </FormSection>
      </div>
    </div>
  );
};

const FormSection: React.FC<{
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ id, title, isOpen, onToggle, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="font-medium">{title}</span>
      {isOpen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
    {isOpen && <div className="px-4 pb-4">{children}</div>}
  </div>
);

const FormField: React.FC<{
  label: string;
  value?: string;
  multiline?: boolean;
  className?: string;
}> = ({ label, value, multiline, className = '' }) => (
  <div className={className}>
    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
    {multiline ? (
      <textarea
        value={value || ''}
        readOnly
        className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 resize-none"
        rows={3}
      />
    ) : (
      <input
        type="text"
        value={value || ''}
        readOnly
        className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
      />
    )}
  </div>
);

const WorkItem: React.FC<{ job: any }> = ({ job }) => (
   <div className="p-4 bg-white dark:bg-gray-900 rounded-lg mb-3">
     <div className="grid grid-cols-4 gap-4">
       <FormField label="Company" value={job?.company} />
       <FormField label="Position" value={job?.position} />
       <FormField label="Start Date" value={job?.startDate} />
       <FormField label="End Date" value={job?.endDate} />
     </div>
     <FormField label="Summary" value={job?.summary} multiline />
   </div>
);

const EducationItem: React.FC<{ edu: any }> = ({ edu }) => (
   <div className="p-4 bg-white dark:bg-gray-900 rounded-lg mb-3">
     <div className="grid grid-cols-4 gap-4">
       <FormField label="Institution" value={edu?.institution} />
       <FormField label="Degree" value={edu?.studyType} />
       <FormField label="Area" value={edu?.area} />
       <FormField label="End Date" value={edu?.endDate} />
     </div>
   </div>
);

interface EditorModeViewProps {
  initialContent: string;
  onChange: (content: string) => void;
  onSave: () => void;
}

const EditorModeView: React.FC<EditorModeViewProps> = ({ initialContent, onChange, onSave }) => (
  <div className="h-full">
    <ResumeEditor
      initialContent={initialContent}
      onChange={onChange}
      onSave={onSave}
    />
  </div>
);

interface SplitModeViewProps {
  cvData: UnifiedCVDataStructure;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  editorContent: string;
  onEditorChange: (content: string) => void;
  onEditorSave: () => void;
}

const SplitModeView: React.FC<SplitModeViewProps> = ({
  cvData,
  collapsedSections,
  onToggleSection,
  editorContent,
  onEditorChange,
  onEditorSave,
}) => (
  <div className="h-full flex">
    <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <FormModeView
        cvData={cvData}
        collapsedSections={collapsedSections}
        onToggleSection={onToggleSection}
      />
    </div>
    <div className="w-1/2 overflow-hidden">
      <ResumeEditor
        initialContent={editorContent}
        onChange={onEditorChange}
        onSave={onEditorSave}
        resumeData={cvData}
      />
    </div>
  </div>
);

export default DualInputSystem;