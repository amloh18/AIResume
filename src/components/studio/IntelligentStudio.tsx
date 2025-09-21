'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Mail, 
  Briefcase, 
  Eye, 
  Settings, 
  BarChart3,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { useStudio } from '@/hooks/useStudio';
import { StudioInitParams, DocumentType } from '@/types/studio';

// Dynamic Left Panel Components
import { StructurePanel } from './panels/StructurePanel';
import { DesignPanel } from './panels/DesignPanel';
import { ATSPanel } from './panels/ATSPanel';

// Right Panel Components
import { PreviewPanel } from './panels/PreviewPanel';

// UI Components
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface IntelligentStudioProps {
  // URL Parameters (from router)
  searchParams?: {
    journeyId?: string;
    documentId?: string;
    documentType?: DocumentType;
    userId?: string;
  };
}

/**
 * Intelligent Studio Component
 * 
 * This component implements your proposed architecture:
 * 1. Entry Point Logic - Determines mode from URL parameters
 * 2. Context-Aware State Management - Loads appropriate data
 * 3. Dynamic Left Panel - Adapts to document type and mode
 * 4. Live ATS Integration - Job-aware analysis
 * 5. Template-Based Preview - Real-time rendering
 */
export default function IntelligentStudio({ searchParams }: IntelligentStudioProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { state, actions } = useStudio();

  // Extract parameters from URL
  const journeyId = searchParams?.journeyId || urlSearchParams.get('journeyId');
  const documentId = searchParams?.documentId || urlSearchParams.get('documentId');
  const documentType = (searchParams?.documentType || urlSearchParams.get('documentType') || 'cv') as DocumentType;
  const userId = searchParams?.userId || urlSearchParams.get('userId') || '';

  // Initialize Studio on mount
  useEffect(() => {
    const initParams: StudioInitParams = {
      journeyId: journeyId || undefined,
      documentId: documentId || undefined,
      documentType,
      userId
    };

    console.log('🎯 IntelligentStudio initializing with params:', initParams);
    actions.initializeSession(initParams);
  }, [journeyId, documentId, documentType, userId]);

  // Render loading state
  if (state.isLoading) {
    return <StudioLoadingState />;
  }

  // Render error state
  if (state.error) {
    return <StudioErrorState error={state.error} onRetry={() => window.location.reload()} />;
  }

  const { sessionContext } = state;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Studio Header */}
      <StudioHeader 
        sessionContext={sessionContext}
        saveStatus={state.saveStatus}
        onSave={actions.saveDocument}
        onExit={actions.exitStudio}
        onNavigateToJourney={actions.navigateToJourney}
      />

      {/* Main Studio Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Dynamic Content */}
        <AnimatePresence>
          {state.leftPanelVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <DynamicLeftPanel 
                state={state}
                actions={actions}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Document Editor Area */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <DocumentEditor 
                documentType={state.sessionContext.documentType}
                documentData={state.documentData}
                documentTitle={state.documentTitle}
                onUpdateDocument={actions.updateDocument}
                onUpdateTitle={(title) => {
                  // Update title logic
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <AnimatePresence>
          {state.rightPanelVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 500, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <PreviewPanel 
                documentType={state.sessionContext.documentType}
                documentData={state.documentData}
                templateId={state.selectedTemplateId}
                designOverrides={state.designOverrides}
                previewSettings={state.previewSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Studio Header Component
 * Displays context-aware information and actions
 */
function StudioHeader({ 
  sessionContext, 
  saveStatus, 
  onSave, 
  onExit, 
  onNavigateToJourney 
}: {
  sessionContext: any;
  saveStatus: string;
  onSave: () => void;
  onExit: () => void;
  onNavigateToJourney: () => void;
}) {
  return (
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit Studio
        </Button>

        <div className="flex items-center space-x-2">
          {sessionContext.documentType === 'cv' ? (
            <FileText className="w-5 h-5 text-blue-500" />
          ) : (
            <Mail className="w-5 h-5 text-green-500" />
          )}
          
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              {sessionContext.mode === 'journey' && sessionContext.linkedJob ? (
                `${sessionContext.documentType === 'cv' ? 'CV' : 'Cover Letter'} for ${sessionContext.linkedJob.jobTitle}`
              ) : (
                `Editing ${sessionContext.documentType === 'cv' ? 'CV' : 'Cover Letter'}`
              )}
            </h1>
            
            {sessionContext.mode === 'journey' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sessionContext.linkedJob?.company} • Journey ID: {sessionContext.journeyId}
              </p>
            )}
          </div>
        </div>

        {sessionContext.mode === 'journey' && (
          <Badge variant="secondary" className="text-xs">
            Journey Mode
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Save Status */}
        <div className="flex items-center space-x-2">
          {saveStatus === 'saving' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {saveStatus === 'saved' && 'All changes saved'}
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
        </div>

        {/* Action Buttons */}
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        {sessionContext.mode === 'journey' && (
          <Button variant="outline" size="sm" onClick={onNavigateToJourney}>
            <Briefcase className="w-4 h-4 mr-2" />
            View Journey
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Dynamic Left Panel
 * Changes content based on document type and mode
 */
function DynamicLeftPanel({ state, actions }: { state: any; actions: any }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Tabs value={state.activeLeftTab} onValueChange={actions.setActiveLeftTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="ats">
              ATS
              {state.atsAnalysis && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {state.atsAnalysis.score}%
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="structure" className="mt-0">
              <StructurePanel
                documentType={state.sessionContext.documentType}
                documentData={state.documentData}
                sessionContext={state.sessionContext}
                availableJobs={state.availableJobs}
                selectedJobId={state.selectedJobId}
                onUpdateDocument={actions.updateDocument}
                onSelectJob={actions.selectJob}
              />
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <DesignPanel
                selectedTemplateId={state.selectedTemplateId}
                designOverrides={state.designOverrides}
                onSwitchTemplate={actions.switchTemplate}
                onUpdateDesign={(overrides) => {
                  // Update design overrides
                }}
              />
            </TabsContent>

            <TabsContent value="ats" className="mt-0">
              <ATSPanel
                sessionContext={state.sessionContext}
                selectedJobId={state.selectedJobId}
                atsAnalysis={state.atsAnalysis}
                availableJobs={state.availableJobs}
                onSelectJob={actions.selectJob}
                onRunAnalysis={actions.runATSAnalysis}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Document Editor Component
 * Renders appropriate editor based on document type
 */
function DocumentEditor({ 
  documentType, 
  documentData, 
  documentTitle, 
  onUpdateDocument, 
  onUpdateTitle 
}: any) {
  if (documentType === 'cv') {
    return (
      <div className="space-y-6">
        <div>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none w-full"
            placeholder="CV Title"
          />
        </div>
        
        {/* CV Editor Components */}
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">Personal Information</h3>
            {/* Personal info form fields */}
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">Work Experience</h3>
            {/* Work experience form fields */}
          </div>
          
          {/* More CV sections */}
        </div>
      </div>
    );
  } else {
    return (
      <div className="space-y-6">
        <div>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none w-full"
            placeholder="Cover Letter Title"
          />
        </div>
        
        <div>
          <textarea
            value={documentData as string}
            onChange={(e) => onUpdateDocument(e.target.value)}
            className="w-full h-96 p-4 border border-gray-200 dark:border-gray-700 rounded-lg resize-none"
            placeholder="Write your cover letter content here..."
          />
        </div>
      </div>
    );
  }
}

/**
 * Loading State Component
 */
function StudioLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Loading Studio...
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Preparing your workspace
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error State Component
 */
function StudioErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Studio Error
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {error}
          </p>
        </div>
        <Button onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
