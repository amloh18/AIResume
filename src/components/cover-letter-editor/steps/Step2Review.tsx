'use client';

import React, { useState, useEffect } from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { Save, CheckCircle2, XCircle, Loader2, Eye, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { COVER_LETTER_TEMPLATES } from '@/lib/templates/cover-letter-templates';
// TODO: CoverLetterTemplateContent was deleted - need to reimplement or use alternative
// import CoverLetterTemplateContent from '@/components/studio/CoverLetterTemplateContent';
import DownloadModal from '@/components/ui/DownloadModal';

interface Step2ReviewProps {
  userId: string;
  onSave?: () => void;
}

export default function Step2Review({ userId, onSave }: Step2ReviewProps) {
  const { state, updateCoverLetter, dispatch, setTemplate } = useCoverLetterEditor();
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState(state.coverLetterTitle);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Sync title with state when it changes externally
  useEffect(() => {
    setTitle(state.coverLetterTitle);
  }, [state.coverLetterTitle]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const coverLetterData = {
        title: title,
        content: '', // DO NOT send merged content - store header/body/footer separately
        header: state.coverLetterData.header,
        body: state.coverLetterData.body,
        footer: state.coverLetterData.footer,
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
          // Route to canvas with cover letter tab active
          router.push('/dashboard/canvas?tab=coverLetter');
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Step2Review - Error saving cover letter:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save cover letter');
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = state.coverLetterData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = state.coverLetterData.content.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Split View: Preview Left, Info Right */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left Pane (50%) - Final Preview */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center bg-gray-50 dark:bg-[#1a230f] min-h-0" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <div style={{ width: `${100 / zoom}%`, maxWidth: '100%' }}>
              <CoverLetterPreview
                content="" // Content will be merged on-the-fly in preview
                cvData={state.cvData || {}}
                jobData={state.jobData || {}}
                selectedCVData={state.cvData || {}}
                template={state.selectedTemplate}
                header={state.coverLetterData.header}
                body={state.coverLetterData.body}
                footer={state.coverLetterData.footer}
              />
            </div>
          </div>
        </div>

        {/* Right Pane (50%) - Save controls and summary */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Cover Letter Info */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setTitle(newTitle);
                    dispatch({ type: 'SET_COVER_LETTER_TITLE', payload: newTitle });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-sm font-semibold"
                  placeholder="Enter cover letter title"
                />
              </div>
              
              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Template</label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm font-semibold">
                    {state.selectedTemplate?.name || 'None selected'}
                  </span>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-2 bg-lime-500 dark:bg-[#99FF00] hover:bg-lime-600 dark:hover:bg-[#88e600] text-black rounded-lg transition-colors text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-[#313a28] rounded-lg p-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Page Size</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPageSize('A4')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageSize === 'A4'
                        ? 'bg-lime-500 dark:bg-[#99FF00] text-black'
                        : 'bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1f2a15]'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    onClick={() => setPageSize('Letter')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageSize === 'Letter'
                        ? 'bg-lime-500 dark:bg-[#99FF00] text-black'
                        : 'bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1f2a15]'
                    }`}
                  >
                    US Letter
                  </button>
                </div>
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

            {/* Download Button */}
            <button
              onClick={async () => {
                // Save first if not saved
                if (!state.coverLetterId) {
                  await handleSave();
                  // Wait a bit for the save to complete
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                setShowDownloadModal(true);
              }}
              disabled={isSaving}
              className="w-full mb-4 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

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
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-[#141810] rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose a Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#313a28] rounded-lg transition-colors text-gray-600 dark:text-gray-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <CoverLetterTemplateContent
                selectedTemplate={state.selectedTemplate}
                onTemplateSelect={(template) => {
                  setTemplate(template);
                  setShowTemplateModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={async (documentType, format) => {
          setIsDownloading(true);
          try {
            let coverLetterId = state.coverLetterId;
            
            if (!coverLetterId) {
              await handleSave();
              await new Promise(resolve => setTimeout(resolve, 500));
              coverLetterId = state.coverLetterId;
            }
            
            if (coverLetterId && documentType === 'coverLetter') {
              const formatParam = format === 'doc' ? 'docx' : format;
              window.open(`/api/cover-letters/${coverLetterId}/download?format=${formatParam}&paperSize=${pageSize}`, '_blank');
            }
            
            setShowDownloadModal(false);
          } catch (error) {
            console.error('Download error:', error);
          } finally {
            setIsDownloading(false);
          }
        }}
        hasCV={false}
        hasCoverLetter={true}
        isDownloading={isDownloading}
        coverLetterId={state.coverLetterId}
        userId={userId}
      />
    </div>
  );
}

