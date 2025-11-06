'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Briefcase, 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  Star,
  Clock,
  CheckCircle,
  Loader2,
  Sparkles,
  Link,
  Check,
  Save,
  ExternalLink,
  Plus,
  Zap,
  Info,
  User,
  Copy,
  AlertCircle
} from 'lucide-react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';

interface Job {
  id?: string;
  userId?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  jobUrl?: string;
  jobDescription?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  deadline?: string;
  applicationDate?: string;
  sponsorship?: 'yes' | 'no' | 'unknown';
  tags?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  contactDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  interviews?: Array<{
    type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
    date: Date;
    duration?: number;
    interviewer?: string;
    notes?: string;
    outcome?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
    feedback?: string;
  }>;
  followUps?: Array<{
    date: Date;
    type: 'email' | 'phone' | 'linkedin' | 'other';
    description: string;
    outcome?: string;
  }>;
  attachments?: Array<{
    name: string;
    type: 'cv' | 'cover-letter' | 'certificate' | 'portfolio' | 'other';
    url: string;
    size: number;
    uploadedAt: Date;
  }>;
  source?: 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other';
  sourceUrl?: string;
  atsScore?: number;
  atsAnalysis?: {
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
    analyzedAt: Date;
  };
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    previousStatus?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (job: Job) => void;
  editingJob?: Job | null;
  userId?: string;
}

const EditJobModal: React.FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  onJobSaved,
  editingJob,
  userId
}) => {
  const { user } = useUnifiedAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<any>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Job>>({
    jobTitle: '',
    company: '',
    location: '',
    jobUrl: '',
    jobDescription: '',
    notes: '',
    priority: 'medium',
    status: 'created',
    deadline: '',
    applicationDate: '',
    sponsorship: 'unknown',
    tags: [],
    salary: {
      min: undefined,
      max: undefined,
      currency: 'USD',
      period: 'yearly' as 'hourly' | 'monthly' | 'yearly'
    },
    contactDetails: {
      name: '',
      email: '',
      phone: '',
      role: ''
    },
    interviews: [],
    followUps: [],
    attachments: [],
    source: 'other',
    sourceUrl: '',
    atsScore: undefined,
    atsAnalysis: undefined,
    statusHistory: [],
    createdAt: undefined,
    updatedAt: undefined
  });

  // Character counters
  const [jobTitleCount, setJobTitleCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [jobDescriptionCount, setJobDescriptionCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);

  // Initialize form data when editingJob changes or modal opens
  useEffect(() => {
    if (editingJob) {
      // Editing existing job - populate with job data
      const data = {
        ...editingJob,
        tags: editingJob.tags || [],
        salary: editingJob.salary || { min: undefined, max: undefined, currency: 'USD', period: 'yearly' as 'hourly' | 'monthly' | 'yearly' },
        contactDetails: editingJob.contactDetails || { name: '', email: '', phone: '', role: '' },
        interviews: editingJob.interviews || [],
        followUps: editingJob.followUps || [],
        attachments: editingJob.attachments || [],
        source: editingJob.source || 'other',
        sourceUrl: editingJob.sourceUrl || '',
        atsScore: editingJob.atsScore || undefined,
        atsAnalysis: editingJob.atsAnalysis || undefined,
        statusHistory: editingJob.statusHistory || []
      };
      setFormData(data);
      lastSavedDataRef.current = data;
    } else {
      // Creating new job - reset to clean defaults
      const newJobData = {
        id: uuidv4(),
        jobTitle: '',
        company: '',
        location: '',
        jobUrl: '',
        jobDescription: '',
        notes: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        status: 'created' as 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
        deadline: '',
        applicationDate: '',
        sponsorship: 'unknown' as 'yes' | 'no' | 'unknown',
        tags: [],
        salary: {
          min: undefined,
          max: undefined,
          currency: 'USD',
          period: 'yearly' as 'hourly' | 'monthly' | 'yearly'
        },
        contactDetails: { name: '', email: '', phone: '', role: '' },
        interviews: [],
        followUps: [],
        attachments: [],
        source: 'other' as 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other',
        sourceUrl: '',
        atsScore: undefined,
        atsAnalysis: undefined,
        statusHistory: []
      };
      setFormData(newJobData);
      lastSavedDataRef.current = newJobData;
    }
    setHasUnsavedChanges(false);
  }, [editingJob, isOpen]); // Added isOpen dependency to reset when modal opens

  // Update character counters
  useEffect(() => {
    setJobTitleCount(formData.jobTitle?.length || 0);
    setCompanyCount(formData.company?.length || 0);
    setJobDescriptionCount(formData.jobDescription?.length || 0);
    setNotesCount(formData.notes?.length || 0);
  }, [formData.jobTitle, formData.company, formData.jobDescription, formData.notes]);

  // Auto-save functionality
  useEffect(() => {
    if (!isOpen || !editingJob) return;

    const currentData = getFormData();
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

    if (hasChanges) {
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveJob(true); // Auto-save
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isOpen, editingJob]);

  const getFormData = () => {
    return {
      ...formData,
      userId: userId || user?.id,
      updatedAt: new Date().toISOString()
    };
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveJob = async (isAutoSave = false) => {
    try {
      if (!isAutoSave) {
        setIsSaving(true);
      }

      const jobData = getFormData();
      const isNewJob = !editingJob?.id;
      const url = editingJob?.id ? `/api/jobs/${editingJob.id}` : '/api/jobs';
      const method = editingJob?.id ? 'PUT' : 'POST';

      console.log('🔍 EditJobModal - Saving job:', { method, url, jobData, isNewJob });

      // Validate required fields for new jobs
      if (isNewJob && (!jobData.jobTitle || !jobData.company)) {
        console.error('❌ Missing required fields:', { jobTitle: jobData.jobTitle, company: jobData.company });
        setErrorMessage('Job title and company are required');
        setShowErrorDialog(true);
        return;
      }

      // Step 1: Save the job
      const response = await authenticatedFetchWithUserId(url, user?.id, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      console.log('🔍 EditJobModal - Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 EditJobModal - Save response:', result);

        // Check if the API returned a job object directly (for updates) or success/data structure (for creates)
        if (result.job || result.success !== false) {
          const savedJob = result.job || {
            ...jobData,
            id: result.data?.id || result.data?._id || editingJob?.id
          };

          lastSavedDataRef.current = savedJob;
          setHasUnsavedChanges(false);

          // Step 2: If this is a new job, implement the "Job First" workflow
          // Create an Application Package automatically
          if (isNewJob && !isAutoSave && user?.id) {
            try {
              console.log('🎯 EditJobModal - Creating Application Package for new job:', savedJob.id);
              
              const packageResult = await ApplicationPackageService.createNewPackage({
                userId: user.id,
                jobId: savedJob.id,
                journeyName: `Application for ${savedJob.jobTitle} at ${savedJob.company}`
              });

              if (packageResult.success) {
                console.log('✅ EditJobModal - Application Package created:', packageResult.data?.journeyId);
              } else {
                console.warn('⚠️ EditJobModal - Failed to create Application Package:', packageResult.message);
                // Don't fail the job creation if package creation fails
              }
            } catch (packageError) {
              console.error('❌ EditJobModal - Error creating Application Package:', packageError);
              // Don't fail the job creation if package creation fails
            }
          }

          if (!isAutoSave) {
            onJobSaved(savedJob);
            // Reset form state after successful save
            setFormData({
              jobTitle: '',
              company: '',
              location: '',
              jobUrl: '',
              jobDescription: '',
              notes: '',
              priority: 'medium',
              status: 'created',
              deadline: '',
              applicationDate: '',
              sponsorship: 'unknown',
              tags: [],
              salary: {
                min: undefined,
                max: undefined,
                currency: 'USD',
                period: 'yearly' as 'hourly' | 'monthly' | 'yearly'
              },
              contactDetails: { name: '', email: '', phone: '', role: '' },
              interviews: [],
              followUps: [],
              attachments: [],
              source: 'other' as 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other',
              sourceUrl: '',
              atsScore: undefined,
              atsAnalysis: undefined,
              statusHistory: []
            });
            setHasUnsavedChanges(false);
            onClose();
          } else {
            console.log('✅ Auto-save completed successfully');
          }
        } else {
          console.error('❌ API returned success: false:', result);
          if (!isAutoSave) {
            setErrorMessage(result.message || result.error || 'Unknown error');
            setShowErrorDialog(true);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ EditJobModal - Save failed with status:', response.status, 'Error:', errorText);
        if (!isAutoSave) {
          try {
            const errorJson = JSON.parse(errorText);
            setErrorMessage(errorJson.message || errorJson.error || `Server error (${response.status})`);
            setShowErrorDialog(true);
          } catch {
            setErrorMessage(`Failed to save job. Server returned status: ${response.status}`);
            setShowErrorDialog(true);
          }
        }
      }
    } catch (error) {
      console.error('❌ EditJobModal - Error saving job:', error);
      if (!isAutoSave) {
        // Provide more specific error messages based on the error type
        let errorMsg = 'Error saving job. Please try again.';
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (error instanceof Error) {
          errorMsg = `Error: ${error.message}`;
        }
        
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      // Reset form state when closing
      setFormData({
        jobTitle: '',
        company: '',
        location: '',
        jobUrl: '',
        jobDescription: '',
        notes: '',
        priority: 'medium',
        status: 'created',
        deadline: '',
        applicationDate: '',
        sponsorship: 'unknown',
        tags: [],
        salary: {
          min: undefined,
          max: undefined,
          currency: 'USD',
          period: 'yearly' as 'hourly' | 'monthly' | 'yearly'
        },
        contactDetails: { name: '', email: '', phone: '', role: '' }
      });
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    // Reset form state when confirming close
    setFormData({
      jobTitle: '',
      company: '',
      location: '',
      jobUrl: '',
      jobDescription: '',
      notes: '',
      priority: 'medium',
      status: 'created',
      deadline: '',
      applicationDate: '',
      sponsorship: 'unknown',
      tags: [],
      salary: {
        min: undefined,
        max: undefined,
        currency: 'USD',
        period: 'yearly'
      },
      contactDetails: { name: '', email: '', phone: '', role: '' }
    });
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleParseJobUrl = async () => {
    const urlInput = document.getElementById('jobUrlParser') as HTMLInputElement;
    const url = urlInput?.value?.trim();
    
    if (!url) {
      alert('Please enter a job URL to parse');
      return;
    }

    try {
      console.log('🔍 AddEditJobModal - Parsing job URL:', url);
      
      const response = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const parsedData = result.data;
          
          // Update form fields with parsed data
          setFormData(prev => ({
            ...prev,
            jobTitle: parsedData.title || prev.jobTitle,
            company: parsedData.company || prev.company,
            location: parsedData.location || prev.location,
            jobUrl: parsedData.sourceUrl || prev.jobUrl,
            jobDescription: parsedData.description || prev.jobDescription,
            sponsorship: parsedData.sponsorship !== undefined ? (parsedData.sponsorship ? 'yes' : 'no') : prev.sponsorship
          }));
          
          alert('Job details parsed successfully!');
        } else {
          alert(`Failed to parse job: ${result.message}`);
        }
      } else {
        alert('Failed to parse job URL. Please try again.');
      }
    } catch (error) {
      console.error('Error parsing job URL:', error);
      alert('Error parsing job URL. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-[#1A201A] border border-gray-200 dark:border-white/10 rounded-2xl p-6 pb-0 w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="text-gray-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingJob ? 'Edit Job Application' : 'Add New Job Application'}
              </h2>
              
              <motion.button
                onClick={handleClose}
                className="p-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Job Title</label>
                      <input
                        type="text"
                        value={formData.jobTitle || ''}
                        onChange={(e) => handleFormChange('jobTitle', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                        placeholder="Enter job title"
                        maxLength={100}
                      />
                      <div className="text-gray-500 dark:text-white/50 text-xs mt-1">{jobTitleCount}/100</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Company</label>
                        <input
                          type="text"
                          value={formData.company || ''}
                          onChange={(e) => handleFormChange('company', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                          placeholder="Enter company name"
                          maxLength={100}
                        />
                        <div className="text-gray-500 dark:text-white/50 text-xs mt-1">{companyCount}/100</div>
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Location</label>
                        <input
                          type="text"
                          value={formData.location || ''}
                          onChange={(e) => handleFormChange('location', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                          placeholder="Enter location"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Job URL</label>
                      <input
                        type="url"
                        value={formData.jobUrl || ''}
                        onChange={(e) => handleFormChange('jobUrl', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                        placeholder="https://company.com/job-posting"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">App Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.applicationDate || ''}
                            onChange={(e) => handleFormChange('applicationDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-sm focus:border-lime-500 dark:focus:border-lime-400/50 focus:outline-none"
                            placeholder="mm/dd/yyyy"
                          />
                          <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Deadline</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.deadline || ''}
                            onChange={(e) => handleFormChange('deadline', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-sm focus:border-lime-500 dark:focus:border-lime-400/50 focus:outline-none"
                            placeholder="mm/dd/yyyy"
                          />
                          <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Priority</label>
                      <div className="flex bg-gray-100 dark:bg-[#232f1c] rounded-xl p-1 border border-gray-300 dark:border-white/20">
                        {['low', 'medium', 'high'].map((priority) => (
                          <button
                            key={priority}
                            onClick={() => handleFormChange('priority', priority)}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                              formData.priority === priority
                                ? 'bg-lime-500 dark:bg-[#80FF00] text-white dark:text-black rounded-xl'
                                : 'text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white rounded-lg'
                            }`}
                          >
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Salary Information</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Min Salary</label>
                      <input
                        type="number"
                        value={formData.salary?.min || ''}
                        onChange={(e) => handleFormChange('salary', { ...formData.salary, min: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                        placeholder="e.g. 80000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Max Salary</label>
                      <input
                        type="number"
                        value={formData.salary?.max || ''}
                        onChange={(e) => handleFormChange('salary', { ...formData.salary, max: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                        placeholder="e.g. 120000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Currency</label>
                      <select
                        value={formData.salary?.currency || 'USD'}
                        onChange={(e) => handleFormChange('salary', { ...formData.salary, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-sm focus:border-lime-500 dark:focus:border-lime-400/50 focus:outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Period</label>
                      <div className="flex bg-gray-100 dark:bg-[#232f1c] rounded-xl p-1 border border-gray-300 dark:border-white/20">
                        {['yearly', 'monthly', 'hourly'].map((period) => (
                          <button
                            key={period}
                            onClick={() => handleFormChange('salary', { ...formData.salary, period })}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                              formData.salary?.period === period
                                ? 'bg-lime-500 dark:bg-[#80FF00] text-white dark:text-black rounded-xl'
                                : 'text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Tags</label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => handleFormChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                    placeholder="Remote, Full-time, FinTech"
                  />
                  <div className="text-gray-500 dark:text-white/50 text-xs mt-1">Separate tags with commas</div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Job Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Job Description</h3>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium">Job Description</label>
                      <div className="text-gray-500 dark:text-white/50 text-xs">{jobDescriptionCount}/2000</div>
                    </div>
                    <textarea
                      rows={10}
                      value={formData.jobDescription || ''}
                      onChange={(e) => handleFormChange('jobDescription', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg resize-none"
                      placeholder="Paste the job description here..."
                      maxLength={2000}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Additional Information</h3>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Sponsorship</label>
                      <div className="flex bg-gray-100 dark:bg-[#232f1c] rounded-xl p-1 border border-gray-300 dark:border-white/20">
                        {['unknown', 'yes', 'no'].map((sponsorship) => (
                          <button
                            key={sponsorship}
                            onClick={() => handleFormChange('sponsorship', sponsorship)}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                              formData.sponsorship === sponsorship
                                ? 'bg-lime-500 dark:bg-[#80FF00] text-white dark:text-black rounded-xl'
                                : 'text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white rounded-lg'
                            }`}
                          >
                            {sponsorship.charAt(0).toUpperCase() + sponsorship.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Contact Details</label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Name</label>
                            <input
                              type="text"
                              value={formData.contactDetails?.name || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, name: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                              placeholder="HR Manager"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Role</label>
                            <input
                              type="text"
                              value={formData.contactDetails?.role || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, role: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                              placeholder="HR Manager"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Email</label>
                            <input
                              type="email"
                              value={formData.contactDetails?.email || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, email: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                              placeholder="hr@company.com"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Phone</label>
                            <input
                              type="tel"
                              value={formData.contactDetails?.phone || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg"
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium">Notes</label>
                      <div className="text-gray-500 dark:text-white/50 text-xs">{notesCount}/500</div>
                    </div>
                    <textarea
                      rows={6}
                      value={formData.notes || ''}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-lg resize-none"
                      placeholder="Add any personal notes here..."
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end mt-2 pt-2 pb-2 border-t border-gray-200 dark:border-white/20">
              <motion.button
                onClick={() => handleSaveJob(false)}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Job'}
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Unsaved Changes Warning */}
      <AnimatePresence>
        {showUnsavedWarning && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-gray-900 dark:text-white text-center">
                <h3 className="text-lg font-semibold mb-1">Unsaved Changes</h3>
                <p className="text-gray-600 dark:text-white/70 text-sm mb-2">
                  You have unsaved changes. Are you sure you want to close without saving?
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    onClick={() => setShowUnsavedWarning(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-xl text-sm font-medium transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleConfirmClose}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close Anyway
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Dialog */}
      <AnimatePresence>
        {showErrorDialog && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-gray-900 dark:text-white text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full">
                    <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Error Saving Job</h3>
                <p className="text-gray-600 dark:text-white/70 text-sm mb-6">
                  {errorMessage}
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    onClick={() => setShowErrorDialog(false)}
                    className="px-6 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold rounded-lg transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Try Again
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default EditJobModal;
