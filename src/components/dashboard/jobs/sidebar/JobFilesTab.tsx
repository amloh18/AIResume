'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, Loader2, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { CVJourney } from '@/types/cv';
import { JobApplication } from '@/types/job';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import CVPreviewThumbnail from '@/components/dashboard/CVPreviewThumbnail';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { getAllTemplates } from '@/lib/templates/template-utils';
import { DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import toast from 'react-hot-toast';

interface JobFilesTabProps {
  job: JobApplication;
  primaryJourney: CVJourney | undefined;
  previewLoading: 'cv' | 'coverLetter' | null;
  handleOpenDocumentPreview: (type: 'cv' | 'coverLetter') => Promise<void>;
  runSidebarAction: (actionId: any) => Promise<void>;
  journeyCardData: any;
  user: any;
  onRefresh?: () => void | Promise<void>;
}

// Reusable LazyThumbnail layout matching Step1Dashboard
const LazyThumbnail = ({ item, isCoverLetter = false, cvData = null }: { item: any, isCoverLetter?: boolean, cvData?: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const aspectRatio = 794 / 1123; // A4 aspect ratio
      let renderWidth = containerWidth;
      let renderHeight = containerWidth / aspectRatio;

      if (renderHeight > containerHeight) {
        renderHeight = containerHeight;
        renderWidth = containerHeight * aspectRatio;
      }

      setDimensions({ width: renderWidth, height: renderHeight });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const templateObj = useMemo(() => {
    if (item.template && (item.template.zones || item.template.type)) return item.template;
    
    let idToFind = item.template?.id || item.template?._id || '';
    if (!idToFind && item.cvData?.metadata?.canvasTemplate) {
      const canvasTpl = item.cvData.metadata.canvasTemplate;
      if (canvasTpl.zones || canvasTpl.type) {
        return canvasTpl;
      }
      idToFind = canvasTpl.id || canvasTpl._id || '';
    }
    if (!idToFind && typeof item.templateId === 'string') {
      idToFind = item.templateId;
    } else if (!idToFind && item.templateId && typeof item.templateId === 'object') {
      if (item.templateId.zones || item.templateId.type) {
        return item.templateId;
      }
      idToFind = item.templateId.id || item.templateId._id || '';
    } else if (!idToFind && item.metadata?.templateId) {
      idToFind = item.metadata.templateId;
    }

    if (idToFind) {
      const foundTemplate = CANVAS_TEMPLATES.find(t => t.id === idToFind)
        || getAllTemplates().find(t => t.id === idToFind || t._id === idToFind);
      if (foundTemplate) return foundTemplate;
    }

    return CANVAS_TEMPLATES.find(t => t.id === '1-col') || CANVAS_TEMPLATES[0] || null;
  }, [item.template, item.templateId, item.metadata?.templateId, item.cvData]);

  if (!isCoverLetter && templateObj) {
    return (
      <CVPreviewThumbnail
        cvData={item.cvData || DEFAULT_UNIFIED_CV_DATA}
        template={templateObj}
        className="bg-white pointer-events-none"
      />
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white pointer-events-none">
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <div
          className="relative overflow-hidden bg-white shrink-0"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: '794px',
              height: '1123px',
              transform: `scale(${dimensions.width / 794})`,
              transformOrigin: 'top left',
            }}
          >
            <CoverLetterPreview
              content={item.content || item.body || ''}
              cvData={cvData || item.cvData}
              jobData={item.jobData}
              selectedCVData={cvData || item.cvData}
              header={item.header}
              body={item.body}
              footer={item.footer}
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-full p-4 flex flex-col gap-3 bg-white relative overflow-hidden pointer-events-none">
          <div className="space-y-1.5 border-b border-gray-100 pb-2">
            <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-2.5 w-1/4 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-[95%] bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-[90%] bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};

const JobFilesTab: React.FC<JobFilesTabProps> = ({
  job,
  primaryJourney,
  previewLoading,
  handleOpenDocumentPreview,
  runSidebarAction,
  journeyCardData,
  user,
  onRefresh
}) => {
  const router = useRouter();

  const cvId = job.relationship?.documents?.cv?.id || primaryJourney?.cvId;
  const coverLetterId = job.relationship?.documents?.coverLetter?.id || primaryJourney?.coverLetterId;

  const [cvDoc, setCvDoc] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvDeletedOrMissing, setCvDeletedOrMissing] = useState(false);

  const [clDoc, setClDoc] = useState<any>(null);
  const [clLoading, setClLoading] = useState(false);
  const [clDeletedOrMissing, setClDeletedOrMissing] = useState(false);

  // Fetch Tailored CV
  useEffect(() => {
    const fetchCV = async () => {
      setCvDeletedOrMissing(false);
      if (!user?.id || !cvId) {
        setCvDoc(null);
        return;
      }
      setCvLoading(true);
      try {
        const response = await authenticatedFetchWithUserId(`/api/cvs/${cvId}`, user.id);
        if (response.status === 404) {
          setCvDeletedOrMissing(true);
          setCvDoc(null);
          return;
        }
        const result = await response.json();
        const data = result?.data?.cv || result?.cv;
        if (response.ok && data) {
          setCvDoc(data);
        } else {
          setCvDeletedOrMissing(true);
        }
      } catch (e) {
        console.error("Failed to load CV thumbnail data:", e);
        setCvDeletedOrMissing(true);
      } finally {
        setCvLoading(false);
      }
    };
    void fetchCV();
  }, [cvId, user?.id]);

  // Fetch Tailored Cover Letter
  useEffect(() => {
    const fetchCL = async () => {
      setClDeletedOrMissing(false);
      if (!user?.id || !coverLetterId) {
        setClDoc(null);
        return;
      }
      setClLoading(true);
      try {
        const response = await authenticatedFetchWithUserId(`/api/cover-letters/${coverLetterId}`, user.id);
        if (response.status === 404) {
          setClDeletedOrMissing(true);
          setClDoc(null);
          return;
        }
        const result = await response.json();
        const data = result?.coverLetter || result?.data?.coverLetter;
        if (response.ok && data) {
          setClDoc(data);
        } else {
          setClDeletedOrMissing(true);
        }
      } catch (e) {
        console.error("Failed to load Cover Letter thumbnail data:", e);
        setClDeletedOrMissing(true);
      } finally {
        setClLoading(false);
      }
    };
    void fetchCL();
  }, [coverLetterId, user?.id]);

  // Action Handlers
  const handleDeleteCV = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !cvId) return;
    if (!window.confirm("Are you sure you want to delete this tailored CV? This action cannot be undone.")) return;

    try {
      const response = await authenticatedFetchWithUserId(`/api/cvs/${cvId}`, user.id, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Tailored CV deleted successfully.");
        setCvDoc(null);
        setCvDeletedOrMissing(true);
        if (onRefresh) await onRefresh();
      } else {
        toast.error("Failed to delete CV.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting CV.");
    }
  };

  const handleDeleteCL = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !coverLetterId) return;
    if (!window.confirm("Are you sure you want to delete this tailored Cover Letter? This action cannot be undone.")) return;

    try {
      const response = await authenticatedFetchWithUserId(`/api/cover-letters/${coverLetterId}`, user.id, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Tailored Cover Letter deleted successfully.");
        setClDoc(null);
        setClDeletedOrMissing(true);
        if (onRefresh) await onRefresh();
      } else {
        toast.error("Failed to delete Cover Letter.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting Cover Letter.");
    }
  };

  return (
    <div className="space-y-5">
      <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Tailored Files</h4>
      
      {(job.relationship?.journey || primaryJourney) ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Tailored CV Thumbnail or Regenerate Card */}
          {cvId && !cvDeletedOrMissing ? (
            <div className="flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-visible group">
              <div className="relative aspect-[1/1.414] w-full rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl border border-gray-250 dark:border-white/5 transition-all duration-300">
                {cvLoading || !cvDoc ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#151a12]">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <>
                    <LazyThumbnail item={cvDoc} />
                    
                    {/* Floating Action Overlay on Hover */}
                    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={() => void handleOpenDocumentPreview('cv')}
                        disabled={previewLoading === 'cv'}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                        title="Full Preview"
                      >
                        {previewLoading === 'cv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => router.push(`/editor?mode=edit&cvId=${cvId}`)}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                        title="Edit CV"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleDeleteCV}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete CV"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Bottom overlay with text */}
                    <div className="step-one-thumbnail-overlay absolute inset-x-0 bottom-0 z-20 px-3 pt-8 pb-3 text-white">
                      <h5 className="text-[11px] font-bold text-white truncate drop-shadow-sm leading-snug">
                        Tailored CV
                      </h5>
                      <p className="text-[9px] text-white/70 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                        Ready to view
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-250 dark:border-white/10 bg-gray-50/10 dark:bg-white/5 p-4 text-center aspect-[1/1.414] w-full flex flex-col items-center justify-center gap-2 transition-all">
              <Sparkles className="w-6 h-6 text-gray-400 dark:text-gray-650" />
              <div className="text-center px-1">
                <p className="text-[11px] font-bold text-gray-900 dark:text-white">CV Not Found</p>
                <p className="text-[9px] text-gray-500 mt-0.5">Generate customized CV for this role</p>
              </div>
              <button
                onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 text-[10px] font-bold transition shadow-sm"
              >
                Regenerate
              </button>
            </div>
          )}

          {/* Tailored Cover Letter Thumbnail or Regenerate Card */}
          {coverLetterId && !clDeletedOrMissing ? (
            <div className="flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-visible group">
              <div className="relative aspect-[1/1.414] w-full rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl border border-gray-250 dark:border-white/5 transition-all duration-300">
                {clLoading || !clDoc ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#151a12]">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <>
                    <LazyThumbnail item={clDoc} isCoverLetter={true} cvData={cvDoc?.cvData} />
                    
                    {/* Floating Action Overlay on Hover */}
                    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={() => void handleOpenDocumentPreview('coverLetter')}
                        disabled={previewLoading === 'coverLetter'}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                        title="Full Preview"
                      >
                        {previewLoading === 'coverLetter' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${coverLetterId}`)}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                        title="Edit Cover Letter"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleDeleteCL}
                        className="w-7 h-7 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Cover Letter"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Bottom overlay with text */}
                    <div className="step-one-thumbnail-overlay absolute inset-x-0 bottom-0 z-20 px-3 pt-8 pb-3 text-white">
                      <h5 className="text-[11px] font-bold text-white truncate drop-shadow-sm leading-snug">
                        Tailored CL
                      </h5>
                      <p className="text-[9px] text-white/70 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                        Ready to view
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-250 dark:border-white/10 bg-gray-50/10 dark:bg-white/5 p-4 text-center aspect-[1/1.414] w-full flex flex-col items-center justify-center gap-2 transition-all">
              <Sparkles className="w-6 h-6 text-gray-400 dark:text-gray-650" />
              <div className="text-center px-1">
                <p className="text-[11px] font-bold text-gray-900 dark:text-white">CL Not Found</p>
                <p className="text-[9px] text-gray-500 mt-0.5">Generate customized CL for this role</p>
              </div>
              <button
                onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 text-[10px] font-bold transition shadow-sm"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center">
          <p className="text-small text-gray-500 dark:text-gray-400 mb-3">No tailored documents linked to this stage yet.</p>
          <button
            onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white px-3.5 py-2 text-small font-bold transition hover:bg-emerald-600"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open Journey Editor
          </button>
        </div>
      )}
    </div>
  );
};

export default JobFilesTab;
