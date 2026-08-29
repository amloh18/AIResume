import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Download, FileText, Mail, Loader2 } from 'lucide-react';
import CVPreviewDocument from '@/components/cv-preview/CVPreviewDocument';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { Button } from '@/components/ui';
import { ITemplate } from '@/types/template';

interface DocumentPreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'cv' | 'coverLetter';
  documentData: any; // CV data or Cover Letter content
  documentId?: string;
  documentTitle?: string;
  cvData?: any; // Required for Cover Letter Preview
  jobData?: any; // Required for Cover Letter Preview
  template?: ITemplate | null;
  isLoading?: boolean;
  onEdit?: () => void;
  onDownload?: () => void;
}

export default function DocumentPreviewSidebar({
  isOpen,
  onClose,
  documentType,
  documentData,
  documentId,
  documentTitle,
  cvData,
  jobData,
  template,
  isLoading = false,
  onEdit,
  onDownload,
}: DocumentPreviewSidebarProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const resolvedId = documentId || documentData?._id || documentData?.id;
  const resolvedTitle = documentTitle || documentData?.title || (documentType === 'cv' ? 'CV Preview' : 'Cover Letter Preview');

  const handleEditClick = () => {
    if (typeof onEdit === 'function') {
      onEdit();
      onClose();
      return;
    }

    onClose();
    if (documentType === 'cv') {
      if (resolvedId) {
        router.push(`/editor?cvId=${resolvedId}`);
      } else {
        router.push('/editor');
      }
    } else {
      if (resolvedId) {
        router.push(`/editor?tab=cover-letter&clId=${resolvedId}`);
      } else {
        router.push('/editor?tab=cover-letter');
      }
    }
  };

  const handleDownloadClick = () => {
    if (typeof onDownload === 'function') {
      onDownload();
      return;
    }

    if (resolvedId) {
      const url = documentType === 'cv'
        ? `/api/cvs/${resolvedId}/download?format=pdf`
        : `/api/cover-letters/${resolvedId}/download`;
      window.open(url, '_blank');
    } else {
      window.print();
    }
  };

  const isContentLoading = isLoading || (!documentData && !cvData);

  return (
    <AnimatePresence>
      <motion.div
        key="preview-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100001]"
        onClick={onClose}
      />
      <motion.div
        key="preview-panel"
        initial={{ x: 'calc(100% + 12px)' }}
        animate={{ x: 0 }}
        exit={{ x: 'calc(100% + 12px)' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-3 top-3 bottom-3 h-auto bg-white dark:bg-[#141810] shadow-2xl z-[100002] flex flex-col rounded-2xl overflow-hidden w-full md:w-[60vw] lg:w-[50vw] border border-gray-200/80 dark:border-white/10"
      >
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-200 dark:border-white/10 flex-shrink-0 gap-3">
          {/* Header Title Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 flex items-center justify-center shrink-0">
              {documentType === 'cv' ? <FileText className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-small font-bold text-gray-900 dark:text-white truncate">
                {resolvedTitle}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {documentType === 'cv' ? 'Curriculum Vitae' : 'Cover Letter'}
              </p>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadClick}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
              disabled={isContentLoading}
            >
              Download PDF
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleEditClick}
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
            >
              Edit in Builder
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-[#1a201a]">
          <div className="max-w-4xl mx-auto bg-white dark:bg-white rounded-lg shadow-sm overflow-hidden min-h-full">
            {isContentLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-lime-400" />
                <span className="text-small font-semibold text-gray-600 dark:text-gray-300">
                  Loading document preview...
                </span>
              </div>
            ) : documentType === 'cv' ? (
              <CVPreviewDocument
                cvData={documentData?.cvData || documentData}
                template={template || documentData?.template || null}
                theme="light"
              />
            ) : (
              <CoverLetterPreview
                content={documentData?.content || documentData?.body || (typeof documentData === 'string' ? documentData : '')}
                cvData={cvData || documentData?.cvData || {}}
                jobData={jobData || documentData?.jobData || {}}
                selectedCVData={cvData || documentData?.cvData || {}}
                header={documentData?.header}
                body={documentData?.body}
                footer={documentData?.footer}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
