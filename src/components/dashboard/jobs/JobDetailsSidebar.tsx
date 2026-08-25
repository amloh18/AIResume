'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Loader2, AlertCircle, CheckCircle2, Trash2, ExternalLink,
  MapPin, Building2, DollarSign, Clock, Tag, FileText, User, Mail,
  Phone, Briefcase, Globe, Link as LinkIcon, Pencil, Plus, ChevronDown,
  ArrowLeft, Copy, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMembership } from '@/lib/hooks/useMembership';
import { parseJobText, type ParsedJobFields } from '@/lib/services/jobTextParser';
import FormattedJobDescription from '@/components/jobs/FormattedJobDescription';

export type JobSidebarMode = 'create' | 'view' | 'edit' | 'parse';

export interface JobFormData {
  _id?: string;
  jobTitle: string;
  company: string;
  location: string;
  jobUrl: string;
  jobDescription: string;
  notes: string;
  salary: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  experience: string;
  jobType: string;
  remote: boolean;
  tags: string[];
  deadline: string;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  source: string;
  priority: 'low' | 'medium' | 'high';
  sponsorship: 'yes' | 'no' | 'unknown';
}

interface JobDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: JobSidebarMode;
  job?: Partial<JobFormData> | null;
  onSave?: (data: JobFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onModeChange?: (mode: JobSidebarMode) => void;
  existingJobs?: { jobTitle?: string; company?: string }[];
  width?: string;
}

const EMPTY_FORM: JobFormData = {
  jobTitle: '',
  company: '',
  location: '',
  jobUrl: '',
  jobDescription: '',
  notes: '',
  salary: {},
  experience: '',
  jobType: 'full-time',
  remote: false,
  tags: [],
  deadline: '',
  contactDetails: { name: '', email: '', phone: '', role: '' },
  source: 'manual',
  priority: 'medium',
  sponsorship: 'unknown',
};

const TAG_SUGGESTIONS = [
  'Remote', 'Hybrid', 'Onsite', 'Full-time', 'Contract', 'Part-time',
  'Sponsorship', 'Visa Required', 'Urgent', 'Startup', 'Enterprise',
  'AI/ML', 'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data',
];

export default function JobDetailsSidebar({
  isOpen,
  onClose,
  mode: initialMode,
  job,
  onSave,
  onDelete,
  onModeChange,
  existingJobs = [],
  width,
}: JobDetailsSidebarProps) {
  const { toast } = useToast();
  const { canAccess } = useMembership();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<JobSidebarMode>(initialMode);
  const [formData, setFormData] = useState<JobFormData>({ ...EMPTY_FORM });
  const [originalData, setOriginalData] = useState<JobFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [parseText, setParseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedJobFields | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync mode with prop
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Load job data when opening
  useEffect(() => {
    if (isOpen && job) {
      const data: JobFormData = {
        ...EMPTY_FORM,
        ...job,
        salary: job.salary || {},
        tags: job.tags || [],
        contactDetails: job.contactDetails || EMPTY_FORM.contactDetails,
      };
      setFormData(data);
      setOriginalData(JSON.parse(JSON.stringify(data)));
    } else if (isOpen && !job) {
      setFormData({ ...EMPTY_FORM });
      setOriginalData(null);
    }
    setErrorMessage('');
    setShowUnsavedWarning(false);
    setParseText('');
    setParsedResult(null);
  }, [isOpen, job]);

  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData);

  const handleClose = useCallback(() => {
    if (hasChanges && (mode === 'edit' || mode === 'create')) {
      setShowUnsavedWarning(true);
      return;
    }
    onClose();
  }, [hasChanges, mode, onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split('.');
      const next = { ...prev };
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.jobTitle.trim()) {
      setErrorMessage('Job title is required');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave?.(formData);
      toast({ title: mode === 'create' ? 'Job Added' : 'Job Updated', description: `${formData.jobTitle} at ${formData.company}` });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData._id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(formData._id);
      toast({ title: 'Job Deleted', description: `${formData.jobTitle} has been removed` });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleParse = async () => {
    if (!parseText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch('/api/jobs/parse-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseText }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setParsedResult(data.data);
        setFormData((prev) => ({
          ...prev,
          jobTitle: data.data.jobTitle || prev.jobTitle,
          company: data.data.company || prev.company,
          location: data.data.location || prev.location,
          jobUrl: data.data.jobUrl || prev.jobUrl,
          jobDescription: data.data.jobDescription || prev.jobDescription,
          salary: data.data.salary || prev.salary,
          experience: data.data.experience || prev.experience,
          jobType: data.data.jobType || prev.jobType,
          remote: data.data.remote ?? prev.remote,
          tags: data.data.skills?.length ? data.data.skills : prev.tags,
        }));
        setMode('create');
        onModeChange?.('create');
      }
    } catch {
      setErrorMessage('Failed to parse job text');
    } finally {
      setIsParsing(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      updateField('tags', [...formData.tags, tag]);
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags.filter((t) => t !== tag));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!isOpen) return null;

  const isEditable = mode === 'create' || mode === 'edit';
  const isView = mode === 'view';

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment key="job-details-sidebar">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-[9998]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
            onClick={handleClose}
          />

          {/* Sidebar */}
          <motion.div
            key="sidebar"
            ref={sidebarRef}
            initial={{ x: 'calc(100% + 12px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 12px)' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 left-0 md:left-auto md:top-3 md:right-3 md:bottom-3 w-full md:w-[calc(70vw-24px)] md:max-w-[70vw] bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col rounded-none md:rounded-2xl overflow-hidden"
            style={{ width: width || undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  {mode !== 'view' && (mode === 'edit') && (
                    <button
                      onClick={() => {
                        setMode('view');
                        onModeChange?.('view');
                        if (originalData) setFormData(JSON.parse(JSON.stringify(originalData)));
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {mode === 'create' && 'Add Job'}
                    {mode === 'edit' && 'Edit Job'}
                    {mode === 'view' && 'Job Details'}
                    {mode === 'parse' && 'Paste Job Description'}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  {isView && formData._id && (
                    <>
                      <button
                        onClick={() => {
                          setMode('edit');
                          onModeChange?.('edit');
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Unsaved changes warning */}
              {showUnsavedWarning && (
                <div className="px-4 pb-3 border-t border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">Unsaved changes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowUnsavedWarning(false)}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"
                      >
                        Keep Editing
                      </button>
                      <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMessage && (
                <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-700 dark:text-red-400 flex-1">{errorMessage}</p>
                  <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {/* PARSE MODE */}
              {mode === 'parse' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Paste the job description below
                    </label>
                    <textarea
                      value={parseText}
                      onChange={(e) => setParseText(e.target.value)}
                      placeholder="Paste job title, description, requirements, or the full posting..."
                      className="w-full h-48 px-3 py-2.5 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleParse}
                    disabled={isParsing || !parseText.trim()}
                    className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Parse & Fill Form
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                    Extracts title, company, location, salary, skills & more — no AI needed
                  </p>
                </div>
              )}

              {/* CREATE / EDIT / VIEW MODE */}
              {(isEditable || isView) && (
                <div className="space-y-5">
                  {/* Title + Company */}
                  <Section title="Basic Info">
                    <Field label="Job Title" required error={!formData.jobTitle.trim() && isEditable ? 'Required' : undefined}>
                      {isEditable ? (
                        <input
                          type="text"
                          value={formData.jobTitle}
                          onChange={(e) => updateField('jobTitle', e.target.value)}
                          className={inputClass(!formData.jobTitle.trim())}
                          placeholder="e.g. Senior Frontend Engineer"
                        />
                      ) : (
                        <ViewField
                          value={formData.jobTitle}
                          onCopy={() => copyToClipboard(formData.jobTitle, 'title')}
                          copied={copiedField === 'title'}
                        />
                      )}
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Company">
                        {isEditable ? (
                          <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => updateField('company', e.target.value)}
                            className={inputClass()}
                            placeholder="e.g. Google"
                          />
                        ) : (
                          <ViewField
                            value={formData.company}
                            icon={<Building2 className="w-3.5 h-3.5" />}
                            onCopy={() => copyToClipboard(formData.company, 'company')}
                            copied={copiedField === 'company'}
                          />
                        )}
                      </Field>
                      <Field label="Location">
                        {isEditable ? (
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => updateField('location', e.target.value)}
                            className={inputClass()}
                            placeholder="e.g. Bangalore, India"
                          />
                        ) : (
                          <ViewField
                            value={formData.location}
                            icon={<MapPin className="w-3.5 h-3.5" />}
                            onCopy={() => copyToClipboard(formData.location, 'location')}
                            copied={copiedField === 'location'}
                          />
                        )}
                      </Field>
                    </div>

                    <Field label="Job URL">
                      {isEditable ? (
                        <input
                          type="url"
                          value={formData.jobUrl}
                          onChange={(e) => updateField('jobUrl', e.target.value)}
                          className={inputClass()}
                          placeholder="https://..."
                        />
                      ) : formData.jobUrl ? (
                        <a
                          href={formData.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-lime-600 dark:text-lime-400 hover:underline flex items-center gap-1 truncate"
                        >
                          <LinkIcon className="w-3 h-3 shrink-0" />
                          {formData.jobUrl}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Field>
                  </Section>

                  {/* Compensation + Type */}
                  <Section title="Compensation & Type">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Salary Min">
                        {isEditable ? (
                          <input
                            type="number"
                            value={formData.salary.min || ''}
                            onChange={(e) => updateField('salary.min', e.target.value ? Number(e.target.value) : undefined)}
                            className={inputClass()}
                            placeholder="e.g. 80000"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formData.salary.min ? `${formData.salary.currency || '$'}${formData.salary.min.toLocaleString()}` : '—'}
                          </span>
                        )}
                      </Field>
                      <Field label="Salary Max">
                        {isEditable ? (
                          <input
                            type="number"
                            value={formData.salary.max || ''}
                            onChange={(e) => updateField('salary.max', e.target.value ? Number(e.target.value) : undefined)}
                            className={inputClass()}
                            placeholder="e.g. 120000"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formData.salary.max ? `${formData.salary.currency || '$'}${formData.salary.max.toLocaleString()}` : '—'}
                          </span>
                        )}
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Experience">
                        {isEditable ? (
                          <input
                            type="text"
                            value={formData.experience}
                            onChange={(e) => updateField('experience', e.target.value)}
                            className={inputClass()}
                            placeholder="e.g. 3-5 years"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">{formData.experience || '—'}</span>
                        )}
                      </Field>
                      <Field label="Job Type">
                        {isEditable ? (
                          <select
                            value={formData.jobType}
                            onChange={(e) => updateField('jobType', e.target.value)}
                            className={inputClass()}
                          >
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white capitalize">{formData.jobType || '—'}</span>
                        )}
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Remote">
                        {isEditable ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.remote}
                              onChange={(e) => updateField('remote', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-lime-500 focus:ring-lime-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Remote friendly</span>
                          </label>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formData.remote ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>
                            {formData.remote ? 'Remote' : 'Onsite'}
                          </span>
                        )}
                      </Field>
                      <Field label="Sponsorship">
                        {isEditable ? (
                          <select
                            value={formData.sponsorship}
                            onChange={(e) => updateField('sponsorship', e.target.value)}
                            className={inputClass()}
                          >
                            <option value="unknown">Unknown</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white capitalize">{formData.sponsorship}</span>
                        )}
                      </Field>
                    </div>
                  </Section>

                  {/* Description */}
                  <Section title="Description">
                    {isEditable ? (
                      <textarea
                        value={formData.jobDescription}
                        onChange={(e) => updateField('jobDescription', e.target.value)}
                        className={`${inputClass()} min-h-[120px] resize-y`}
                        placeholder="Job description, requirements, responsibilities..."
                      />
                    ) : (
                      <div className="text-sm text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto pr-1">
                        <FormattedJobDescription content={formData.jobDescription} fallback="No description" />
                      </div>
                    )}
                  </Section>

                  {/* Tags */}
                  <Section title="Tags & Skills">
                    {isEditable ? (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {formData.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 rounded-full text-[11px] font-medium"
                            >
                              {tag}
                              <button onClick={() => removeTag(tag)} className="hover:text-lime-900 dark:hover:text-lime-200">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag(newTag.trim());
                              }
                            }}
                            className={`${inputClass()} flex-1`}
                            placeholder="Add tag..."
                          />
                          <button
                            onClick={() => addTag(newTag.trim())}
                            disabled={!newTag.trim()}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {TAG_SUGGESTIONS.filter((s) => !formData.tags.includes(s)).slice(0, 8).map((s) => (
                            <button
                              key={s}
                              onClick={() => addTag(s)}
                              className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-full hover:border-lime-500 hover:text-lime-600 transition-colors"
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.tags.length > 0 ? formData.tags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full text-[11px] font-medium">
                            {tag}
                          </span>
                        )) : <span className="text-xs text-gray-400">No tags</span>}
                      </div>
                    )}
                  </Section>

                  {/* Notes */}
                  <Section title="Notes">
                    {isEditable ? (
                      <textarea
                        value={formData.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        className={`${inputClass()} min-h-[80px] resize-y`}
                        placeholder="Personal notes about this application..."
                      />
                    ) : (
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {formData.notes || <span className="text-gray-400">No notes</span>}
                      </div>
                    )}
                  </Section>

                  {/* Contact */}
                  <Section title="Contact Person">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name">
                        {isEditable ? (
                          <input
                            type="text"
                            value={formData.contactDetails.name}
                            onChange={(e) => updateField('contactDetails.name', e.target.value)}
                            className={inputClass()}
                            placeholder="Recruiter name"
                          />
                        ) : (
                          <ViewField value={formData.contactDetails.name} icon={<User className="w-3.5 h-3.5" />} />
                        )}
                      </Field>
                      <Field label="Role">
                        {isEditable ? (
                          <input
                            type="text"
                            value={formData.contactDetails.role}
                            onChange={(e) => updateField('contactDetails.role', e.target.value)}
                            className={inputClass()}
                            placeholder="e.g. Hiring Manager"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">{formData.contactDetails.role || '—'}</span>
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Email">
                        {isEditable ? (
                          <input
                            type="email"
                            value={formData.contactDetails.email}
                            onChange={(e) => updateField('contactDetails.email', e.target.value)}
                            className={inputClass()}
                            placeholder="recruiter@company.com"
                          />
                        ) : (
                          <ViewField
                            value={formData.contactDetails.email}
                            icon={<Mail className="w-3.5 h-3.5" />}
                            onCopy={formData.contactDetails.email ? () => copyToClipboard(formData.contactDetails.email, 'email') : undefined}
                            copied={copiedField === 'email'}
                          />
                        )}
                      </Field>
                      <Field label="Phone">
                        {isEditable ? (
                          <input
                            type="tel"
                            value={formData.contactDetails.phone}
                            onChange={(e) => updateField('contactDetails.phone', e.target.value)}
                            className={inputClass()}
                            placeholder="+1 234 567 890"
                          />
                        ) : (
                          <ViewField
                            value={formData.contactDetails.phone}
                            icon={<Phone className="w-3.5 h-3.5" />}
                            onCopy={formData.contactDetails.phone ? () => copyToClipboard(formData.contactDetails.phone, 'phone') : undefined}
                            copied={copiedField === 'phone'}
                          />
                        )}
                      </Field>
                    </div>
                  </Section>

                  {/* Priority */}
                  {isEditable && (
                    <Section title="Priority">
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => updateField('priority', p)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                              formData.priority === p
                                ? p === 'high'
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400'
                                  : p === 'medium'
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
                                  : 'bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                : 'bg-white dark:bg-[#1a230f] border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                            }`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {(isEditable || mode === 'parse') && (
              <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-4">
                <div className="flex items-center gap-3">
                  {mode !== 'parse' && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !formData.jobTitle.trim()}
                      className="flex-1 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {mode === 'create' ? 'Add Job' : 'Save Changes'}
                        </>
                      )}
                    </button>
                  )}
                  {mode === 'parse' && (
                    <button
                      onClick={() => {
                        setMode('create');
                        onModeChange?.('create');
                      }}
                      disabled={!parsedResult}
                      className="flex-1 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold rounded-xl transition-colors"
                    >
                      Continue to Form
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

// --- Helper Components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function ViewField({
  value,
  icon,
  onCopy,
  copied,
}: {
  value: string;
  icon?: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  if (!value) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1.5 group">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-900 dark:text-white truncate">{value}</span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-lime-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
      )}
    </div>
  );
}

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border ${
    hasError ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
  } rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 transition-colors`;
}
