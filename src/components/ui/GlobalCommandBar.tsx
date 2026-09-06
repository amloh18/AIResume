'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Briefcase,
  FileText,
  User,
  Mic,
  LayoutDashboard,
  Mail,
  X,
  Target,
  Kanban,
  Linkedin,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Link2,
  CheckCircle2,
  Building2,
  MapPin,
  Clock,
  Layers,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import DocumentPreviewSidebar from '@/components/dashboard/jobs/DocumentPreviewSidebar';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  external?: boolean;
  badge?: string;
  color: string;
  bg: string;
}

const SIDEBAR_TOOLS: ToolItem[] = [
  {
    id: 'editor',
    title: 'Documents',
    description: 'CVs, cover letters & master profile',
    icon: Target,
    route: '/dashboard/jobs?tab=documents',
    badge: 'PRO',
    color: 'text-emerald-700 dark:text-lime-400',
    bg: 'bg-emerald-500/10 dark:bg-lime-500/10',
  },
  {
    id: 'tracker',
    title: 'Tracker',
    description: 'Job pipeline & kanban',
    icon: Kanban,
    route: '/dashboard/jobs?tab=applications',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
  },
  {
    id: 'jobs',
    title: 'Jobs',
    description: 'Search & auto-apply (Beta)',
    icon: Briefcase,
    route: '/dashboard/jobs',
    badge: 'BETA',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
  },
  {
    id: 'interview',
    title: 'Interview Coach',
    description: 'AI mock prep & questions',
    icon: Mic,
    route: '/dashboard/interview',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 dark:bg-purple-500/10',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    description: 'Profile review & optimizer',
    icon: Linkedin,
    route: '/linkedin-enhancer',
    badge: 'NEW',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 dark:bg-sky-500/10',
  },
  {
    id: 'extension',
    title: 'Extension',
    description: '1-Click apply Chrome extension',
    icon: ExternalLink,
    route: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb',
    external: true,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/10',
  },
];

export default function GlobalCommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{
    jobs: any[];
    cvs: any[];
    coverLetters: any[];
  }>({
    jobs: [],
    cvs: [],
    coverLetters: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // In-memory search cache & abort controller to guarantee zero disappearing / flickering
  const searchCache = useRef<Map<string, any>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Job Sidebar State
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [journeysForJob, setJourneysForJob] = useState<any[]>([]);

  // Document Preview Sidebar State
  const [previewDoc, setPreviewDoc] = useState<{
    type: 'cv' | 'coverLetter';
    id: string;
    title: string;
    data: any;
    cvData?: any;
    jobData?: any;
    template?: any;
    isLoading?: boolean;
  } | null>(null);

  const router = useRouter();
  const { user } = useUnifiedAuth();

  // Listen to trigger from GlobalSearchBar
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-global-command-bar', handleOpen);
    return () => window.removeEventListener('open-global-command-bar', handleOpen);
  }, []);

  const handleToolSelect = useCallback(
    (tool: ToolItem) => {
      setIsOpen(false);
      setSearch('');
      if (tool.external) {
        window.open(tool.route, '_blank');
      } else {
        router.push(tool.route);
      }
    },
    [router]
  );

  const filteredTools = SIDEBAR_TOOLS.filter(
    (tool) =>
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase())
  );

  // Listen to Keyboard events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (isOpen) {
        const num = parseInt(e.key, 10);
        // Pressing 1-6 when search is empty or when Alt/Ctrl is held triggers the corresponding tool
        if (num >= 1 && num <= 6 && (!search.trim() || e.altKey || (e.ctrlKey && !e.metaKey))) {
          const targetTool = filteredTools[num - 1] || SIDEBAR_TOOLS[num - 1];
          if (targetTool) {
            e.preventDefault();
            e.stopPropagation();
            handleToolSelect(targetTool);
          }
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, search, filteredTools, handleToolSelect]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setResults({ jobs: [], cvs: [], coverLetters: [] });
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim().toLowerCase();
      if (!user?.id || trimmed.length < 2) {
        setResults({ jobs: [], cvs: [], coverLetters: [] });
        setIsLoading(false);
        return;
      }

      // Check cache first for 0ms instant display
      if (searchCache.current.has(trimmed)) {
        setResults(searchCache.current.get(trimmed));
        setIsLoading(false);
        return;
      }

      // Abort previous in-flight search request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const response = await authenticatedFetchWithUserId(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=15`,
          user.id
        );

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (data.success && data.data) {
          searchCache.current.set(trimmed, data.data);
          // Only update if this is still the active search term
          setResults(data.data);
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Search error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // Debounced search trigger
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setResults({ jobs: [], cvs: [], coverLetters: [] });
      setIsLoading(false);
      return;
    }

    // If already in cache, load immediately
    if (searchCache.current.has(trimmed.toLowerCase())) {
      setResults(searchCache.current.get(trimmed.toLowerCase()));
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(trimmed);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [search, performSearch]);

  const handleJobClick = async (jobId: string) => {
    if (!jobId) return;

    // Immediately close command bar and open JobSidebar with initial data
    setIsOpen(false);
    const existingJob = results.jobs.find((j) => j.id === jobId || j._id === jobId);
    setSelectedJob(
      existingJob
        ? {
            ...existingJob,
            _id: jobId,
            id: jobId,
            jobTitle: existingJob.title || existingJob.jobTitle,
          }
        : { id: jobId, _id: jobId }
    );
    setShowJobModal(true);

    try {
      let jobResponse = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user?.id);
      if (!jobResponse.ok) {
        jobResponse = await fetch(`/api/jobs/${jobId}`);
      }
      if (!jobResponse.ok) {
        jobResponse = await fetch(`/api/jobs?id=${jobId}`);
      }

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        const fetchedJob = jobData.data?.job || jobData.job || jobData;
        if (fetchedJob) {
          setSelectedJob((prev: any) => ({ ...prev, ...fetchedJob }));
        }
      }

      if (user?.id) {
        try {
          const journeysResponse = await authenticatedFetchWithUserId(
            `/api/application-journey?jobId=${jobId}`,
            user.id
          );
          const journeysData = await journeysResponse.json();
          setJourneysForJob(journeysData.success && journeysData.data?.journeys ? journeysData.data.journeys : []);
        } catch (err) {
          console.error('Error fetching journeys:', err);
        }
      }
    } catch (error) {
      console.error('Error loading job details:', error);
    }
  };

  const handleCVClick = async (cvId: string, cvTitle?: string) => {
    if (!cvId) return;

    // Immediately close command bar and open DocumentPreviewSidebar with loading state
    setIsOpen(false);
    setPreviewDoc({
      type: 'cv',
      id: cvId,
      title: cvTitle || 'CV Preview',
      data: null,
      cvData: null,
      isLoading: true,
    });

    try {
      let cvResponse = await authenticatedFetchWithUserId(
        `/api/cvs/${cvId}`,
        user?.id
      );
      if (!cvResponse.ok) {
        cvResponse = await fetch(`/api/cvs/${cvId}`);
      }

      if (cvResponse.ok) {
        const cvData = await cvResponse.json();
        const cvObj = cvData.data?.cv || cvData.cv || cvData.data;
        if (cvObj) {
          const unifiedCVData = cvObj.cvData || cvObj;
          setPreviewDoc({
            type: 'cv',
            id: cvId,
            title: cvTitle || cvObj.title || 'CV Preview',
            data: unifiedCVData,
            cvData: unifiedCVData,
            template: cvObj.template || cvObj.metadata?.canvasTemplate || null,
            isLoading: false,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error loading CV:', error);
    }

    setPreviewDoc((prev) => (prev ? { ...prev, isLoading: false } : null));
  };

  const handleCoverLetterClick = async (clId: string, clTitle?: string) => {
    if (!clId) return;

    // Immediately close command bar and open DocumentPreviewSidebar with loading state
    setIsOpen(false);
    setPreviewDoc({
      type: 'coverLetter',
      id: clId,
      title: clTitle || 'Cover Letter Preview',
      data: null,
      cvData: null,
      jobData: null,
      isLoading: true,
    });

    try {
      let clResponse = await authenticatedFetchWithUserId(
        `/api/cover-letters/${clId}`,
        user?.id
      );
      if (!clResponse.ok) {
        clResponse = await fetch(`/api/cover-letters/${clId}`);
      }

      if (clResponse.ok) {
        const clData = await clResponse.json();
        const coverLetterObj = clData.coverLetter || clData.data?.coverLetter || clData.data;

        if (coverLetterObj) {
          let cvData = null;
          let jobData = null;

          if (coverLetterObj.journeyId) {
            try {
              const journeyResponse = await fetch(
                `/api/application-journey?journeyId=${coverLetterObj.journeyId}`
              );
              if (journeyResponse.ok) {
                const journeyResult = await journeyResponse.json();
                const journey = journeyResult.data?.journey || journeyResult.journey;

                if (journey?.cvId) {
                  const cvRes = await fetch(`/api/cvs/${journey.cvId}`);
                  if (cvRes.ok) {
                    const cvResult = await cvRes.json();
                    const foundCV = cvResult.data?.cv || cvResult.cv;
                    if (foundCV) {
                      cvData = foundCV.cvData || foundCV;
                    }
                  }
                }

                if (journey?.jobId) {
                  const jobRes = await fetch(`/api/jobs?id=${journey.jobId}`);
                  if (jobRes.ok) {
                    const jobResult = await jobRes.json();
                    jobData = jobResult.data?.job || jobResult.job;
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching journey data for cover letter:', err);
            }
          }

          setPreviewDoc({
            type: 'coverLetter',
            id: clId,
            title: clTitle || coverLetterObj.title || 'Cover Letter Preview',
            data: coverLetterObj,
            cvData: cvData,
            jobData: jobData,
            isLoading: false,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error loading Cover Letter:', error);
    }

    setPreviewDoc((prev) => (prev ? { ...prev, isLoading: false } : null));
  };

  const hasSearchResults =
    results.jobs.length > 0 || results.cvs.length > 0 || results.coverLetters.length > 0;

  // Separate master CVs from tailored CVs for clean grouping
  const masterCVs = results.cvs.filter((cv) => cv.isMaster);
  const tailoredCVs = results.cvs.filter((cv) => !cv.isMaster);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] sm:pt-[10vh] px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#141810] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10"
            >
              {/* Search Input Header */}
              <div className="flex items-center px-4 sm:px-5 border-b border-gray-100 dark:border-white/10 relative">
                <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  className="w-full bg-transparent px-3.5 py-4 outline-none border-0 ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0 text-gray-900 dark:text-white placeholder-gray-400 text-small md:text-body font-medium"
                  placeholder="Search jobs, CVs, cover letters, or press 1-6 for tools..."
                />
                {isLoading && (
                  <div className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 dark:border-lime-500 border-t-transparent shrink-0" />
                )}
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white mr-1.5"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg shrink-0 border border-gray-200/80 dark:border-white/10"
                >
                  ESC
                </button>
              </div>

              {/* Options & Results List */}
              <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-5 scrollbar-thin space-y-5">
                {/* 1. Default Tools Grid (Inline Tiles) */}
                {(!search || filteredTools.length > 0) && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-2.5 flex items-center justify-between">
                      <span>{search ? 'Matching Tools' : 'Platform Tools & Workspace'}</span>
                      {!search && (
                        <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">
                          Press <kbd className="px-1 py-0.5 font-mono text-[9px] bg-gray-100 dark:bg-white/10 rounded">1</kbd>-<kbd className="px-1 py-0.5 font-mono text-[9px] bg-gray-100 dark:bg-white/10 rounded">6</kbd> to jump
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredTools.map((tool, index) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => handleToolSelect(tool)}
                            className="flex flex-col items-start p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] hover:bg-gray-100/80 dark:hover:bg-white/5 hover:border-[#013f2e]/30 dark:hover:border-lime-500/30 transition-all text-left group cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full mb-2">
                              <div className={`p-2 rounded-xl ${tool.bg} ${tool.color} transition-transform group-hover:scale-105`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {tool.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#013f2e]/10 dark:bg-lime-500/10 text-[#013f2e] dark:text-lime-400 border border-[#013f2e]/20 dark:border-lime-500/20">
                                    {tool.badge}
                                  </span>
                                )}
                                <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 shadow-xs group-hover:border-[#013f2e]/30 dark:group-hover:border-lime-500/30 group-hover:text-[#013f2e] dark:group-hover:text-lime-400 transition-colors">
                                  {index + 1}
                                </kbd>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-lime-400 transition-colors">
                              {tool.title}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {tool.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Search Results Sections */}
                {search.length >= 2 && (
                  <div className="space-y-4">
                    {/* No Results Fallback */}
                    {!isLoading && filteredTools.length === 0 && !hasSearchResults && (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-small rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                        No documents or tools matching &ldquo;{search}&rdquo;
                      </div>
                    )}

                    {/* Master CV (Profile) Section */}
                    {masterCVs.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-lime-400 uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
                          <Crown className="w-3 h-3" /> Master Profile
                        </div>
                        <div className="space-y-1.5">
                          {masterCVs.map((cv: any) => (
                            <div
                              key={cv.id}
                              onClick={() => handleCVClick(cv.id, cv.title)}
                              className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-emerald-500/[0.04] dark:bg-lime-500/[0.04] border border-emerald-500/20 dark:border-lime-500/20 hover:border-emerald-500/40 dark:hover:border-lime-500/40 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 rounded-xl">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate group-hover:text-emerald-700 dark:group-hover:text-lime-400 transition-colors">
                                      {cv.title}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                                      Primary Master CV • Click to preview in sidebar
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-lime-400 border border-emerald-200 dark:border-emerald-800 rounded-full font-bold shrink-0">
                                  Master Profile
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Jobs Section */}
                    {results.jobs.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-2">
                          Saved Jobs & Pipeline ({results.jobs.length})
                        </div>
                        <div className="space-y-2">
                          {results.jobs.map((job: any) => (
                            <div
                              key={job.id}
                              onClick={() => handleJobClick(job.id)}
                              className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 hover:border-[#013f2e]/30 dark:hover:border-lime-500/30 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 rounded-xl shrink-0">
                                    <Briefcase className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate group-hover:text-emerald-700 dark:group-hover:text-lime-400 transition-colors">
                                      {job.title}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3 h-3 shrink-0 inline" />
                                      {job.company}
                                      {job.location && (
                                        <>
                                          <span>•</span>
                                          <MapPin className="w-3 h-3 shrink-0 inline" />
                                          {job.location}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize shrink-0 border ${
                                  job.status === 'applied'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                    : job.status === 'interview' || job.status === 'interviewing'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                    : job.status === 'offer'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10'
                                }`}>
                                  {job.status}
                                </span>
                              </div>

                              {/* Connected info for this job */}
                              {(job.connectedCv || job.connectedCoverLetter) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1 mr-1">
                                    <Link2 className="w-3 h-3" /> Connected:
                                  </span>
                                  {job.connectedCv && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCVClick(job.connectedCv.id, job.connectedCv.title);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 transition-colors"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[140px]">{job.connectedCv.title}</span>
                                    </button>
                                  )}
                                  {job.connectedCoverLetter && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCoverLetterClick(job.connectedCoverLetter.id, job.connectedCoverLetter.title);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100 transition-colors"
                                    >
                                      <Mail className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[140px]">{job.connectedCoverLetter.title}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tailored CVs Section */}
                    {tailoredCVs.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-2">
                          Tailored CVs ({tailoredCVs.length})
                        </div>
                        <div className="space-y-2">
                          {tailoredCVs.map((cv: any) => (
                            <div
                              key={cv.id}
                              onClick={() => handleCVClick(cv.id, cv.title)}
                              className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 hover:border-blue-500/30 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {cv.title}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                                      Tailored CV Document • Click to preview
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                  Preview →
                                </span>
                              </div>

                              {/* Connected Job / Cover Letter info */}
                              {(cv.connectedJob || cv.connectedCoverLetter) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1 mr-1">
                                    <Link2 className="w-3 h-3" /> Linked to:
                                  </span>
                                  {cv.connectedJob && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJobClick(cv.connectedJob.id);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors"
                                    >
                                      <Briefcase className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[150px]">
                                        {cv.connectedJob.title} {cv.connectedJob.company ? `@ ${cv.connectedJob.company}` : ''}
                                      </span>
                                    </button>
                                  )}
                                  {cv.connectedCoverLetter && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCoverLetterClick(cv.connectedCoverLetter.id, cv.connectedCoverLetter.title);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100 transition-colors"
                                    >
                                      <Mail className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[140px]">{cv.connectedCoverLetter.title}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cover Letters Section */}
                    {results.coverLetters.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-2">
                          Cover Letters ({results.coverLetters.length})
                        </div>
                        <div className="space-y-2">
                          {results.coverLetters.map((cl: any) => (
                            <div
                              key={cl.id}
                              onClick={() => handleCoverLetterClick(cl.id, cl.title)}
                              className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 hover:border-purple-500/30 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                                    <Mail className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                      {cl.title}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                                      {cl.targetCompany ? `Target: ${cl.targetCompany}` : 'Cover Letter • Click to preview'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                  Preview →
                                </span>
                              </div>

                              {/* Connected Job / CV info */}
                              {(cl.connectedJob || cl.connectedCv) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1 mr-1">
                                    <Link2 className="w-3 h-3" /> Linked to:
                                  </span>
                                  {cl.connectedJob && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJobClick(cl.connectedJob.id);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors"
                                    >
                                      <Briefcase className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[150px]">
                                        {cl.connectedJob.title} {cl.connectedJob.company ? `@ ${cl.connectedJob.company}` : ''}
                                      </span>
                                    </button>
                                  )}
                                  {cl.connectedCv && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCVClick(cl.connectedCv.id, cl.connectedCv.title);
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 transition-colors"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      <span className="truncate max-w-[140px]">{cl.connectedCv.title}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Sidebar for Job Results */}
      {showJobModal && selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={journeysForJob}
          onClose={() => {
            setShowJobModal(false);
            setSelectedJob(null);
            setJourneysForJob([]);
          }}
          onRefresh={async () => {
            if (selectedJob && user?.id) {
              const journeysResponse = await authenticatedFetchWithUserId(
                `/api/application-journey?jobId=${selectedJob.id}`,
                user.id
              );
              const journeysData = await journeysResponse.json();
              setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
            }
          }}
        />
      )}

      {/* Unified Document Preview Sidebar for both CV and Cover Letter Results */}
      {previewDoc && (
        <DocumentPreviewSidebar
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentType={previewDoc.type === 'coverLetter' ? 'coverLetter' : 'cv'}
          documentData={previewDoc.data}
          documentId={previewDoc.id}
          documentTitle={previewDoc.title}
          cvData={previewDoc.cvData}
          jobData={previewDoc.jobData}
          template={previewDoc.template}
          isLoading={previewDoc.isLoading}
        />
      )}
    </>
  );
}