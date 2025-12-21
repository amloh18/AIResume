'use client';

import React, { useState } from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { Save, CheckCircle2, XCircle, Loader2, Eye, ZoomIn, ZoomOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Step3PreviewProps {
  userId: string;
  onSave?: () => void;
}

export default function Step3Preview({ userId, onSave }: Step3PreviewProps) {
  const { state, updateCoverLetter } = useCoverLetterEditor();
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const coverLetterData = {
        title: state.coverLetterTitle,
        content: state.coverLetterData.content,
        header: state.coverLetterData.header,
        body: state.coverLetterData.body,
        status: state.coverLetterData.status || 'draft',
        cvId: state.coverLetterData.cvId,
        jobId: state.coverLetterData.jobId,
        journeyId: state.coverLetterData.journeyId || state.journeyId,
        templateId: state.selectedTemplate?.id
      };

      let response;
      if (state.coverLetterId) {
        // Update existing cover letter
        response = await fetch(`/api/cover-letters/${state.coverLetterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...coverLetterData
          })
        });
      } else {
        // Create new cover letter
        response = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...coverLetterData
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save cover letter' }));
        throw new Error(errorData.error || 'Failed to save cover letter');
      }

      const result = await response.json();
      const savedId = result.data?.id || result.data?.coverLetter?.id || result.id;

      if (savedId) {
        updateCoverLetter({ id: savedId });
      }

      setSaveStatus('success');
      if (onSave) {
        onSave();
      }

      // Auto-redirect after 1.5 seconds on success
      setTimeout(() => {
        if (state.journeyId) {
          router.push(`/dashboard/tracker?journeyId=${state.journeyId}`);
        } else {
          router.push('/dashboard/canvas');
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Step3Preview - Error saving cover letter:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save cover letter');
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = state.coverLetterData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = state.coverLetterData.content.length;

  return (
    <div className="flex flex-col h-full">
      {/* Split View: Info Left, Preview Right */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Pane (50%) - Save controls and summary */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Review & Save
            </h2>
            
            {/* Cover Letter Info */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Title</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {state.coverLetterTitle}
                </p>
              </div>
              
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Template</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {state.selectedTemplate?.name || 'None selected'}
                </p>
              </div>
              
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statistics</p>
                <div className="flex gap-4 text-sm text-gray-900 dark:text-white">
                  <span>{wordCount} words</span>
                  <span>{characterCount} characters</span>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">
                  {state.coverLetterData.status || 'draft'}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || saveStatus === 'success'}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                saveStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-lime-500 dark:bg-[#99FF00] text-black hover:bg-lime-600 dark:hover:bg-[#88e600]'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Saved Successfully!</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Save Failed</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Cover Letter</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {saveError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (50%) - Final Preview */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Preview Header with Controls */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Final Preview</h3>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-200" />
              <span className="text-xs text-gray-600 dark:text-gray-200">
                Zoom: {Math.round(zoom * 100)}%
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="px-2 py-1 bg-gray-100 dark:bg-[#313a28] hover:bg-gray-200 dark:hover:bg-[#3a4530] text-gray-900 dark:text-white rounded text-xs"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="px-2 py-1 bg-gray-100 dark:bg-[#313a28] hover:bg-gray-200 dark:hover:bg-[#3a4530] text-gray-900 dark:text-white rounded text-xs"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div style={{ width: `${100 / zoom}%` }}>
              <CoverLetterPreview
                content={state.coverLetterData.content}
                cvData={state.cvData || {}}
                jobData={state.jobData || {}}
                selectedCVData={state.cvData || {}}
                template={state.selectedTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

