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
  Copy
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { useNotifications } from '@/contexts/NotificationContext';

interface Job {
  id?: string;
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
    period?: string;
  };
  contacts?: Array<{
    name: string;
    role: string;
    email: string;
  }>;
}

interface AddEditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (job: Job) => void;
  editingJob?: Job | null;
  userId?: string;
}

const AddEditJobModal: React.FC<AddEditJobModalProps> = ({
  isOpen,
  onClose,
  onJobSaved,
  editingJob,
  userId
}) => {
  const { data: session } = useSession();
  const { addNotification } = useNotifications();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  
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
      period: 'yearly'
    },
    contacts: []
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
        salary: editingJob.salary || { min: undefined, max: undefined, currency: 'USD', period: 'yearly' },
        contacts: editingJob.contacts || []
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
          period: 'yearly'
        },
        contacts: []
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
      userId: userId || session?.user?.id,
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

      console.log('🔍 AddEditJobModal - Saving job:', { method, url, jobData, isNewJob });

      // Step 1: Save the job
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 AddEditJobModal - Save response:', result);

        if (result.success) {
          const savedJob = {
            ...jobData,
            id: result.data.id || result.data._id || editingJob?.id
          };

          lastSavedDataRef.current = savedJob;
          setHasUnsavedChanges(false);

          // Step 2: If this is a new job, implement the "Job First" workflow
          // Create an Application Package automatically
          if (isNewJob && !isAutoSave && session?.user?.id) {
            try {
              console.log('🎯 AddEditJobModal - Creating Application Package for new job:', savedJob.id);
              
              const packageResult = await ApplicationPackageService.createNewPackage({
                userId: session.user.id,
                jobId: savedJob.id,
                journeyName: `Application for ${savedJob.jobTitle} at ${savedJob.company}`
              });

              if (packageResult.success) {
                console.log('✅ AddEditJobModal - Application Package created:', packageResult.data?.journeyId);
                
                // Show interactive toast notification instead of browser confirm
                addNotification({
                  type: 'success',
                  title: 'Job Saved Successfully!',
                  message: `Job "${savedJob.jobTitle}" has been saved successfully! Would you like to start creating your application package (CV + Cover Letter) for this job now?`,
                  actionRequired: true,
                  actionLabel: 'Start Application',
                  onAction: () => {
                    // Navigate to the Studio in CV onboarding mode for this job
                    window.location.href = `/studio?journeyId=${packageResult.data?.journeyId}&mode=cv-onboarding`;
                  }
                });
              } else {
                console.warn('⚠️ AddEditJobModal - Failed to create Application Package:', packageResult.message);
                // Don't fail the job creation if package creation fails
              }
            } catch (packageError) {
              console.error('❌ AddEditJobModal - Error creating Application Package:', packageError);
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
                period: 'yearly'
              },
              contacts: []
            });
            setHasUnsavedChanges(false);
            onClose();
          } else {
            console.log('✅ Auto-save completed successfully');
          }
        } else {
          console.error('API returned success: false:', result);
          if (!isAutoSave) {
            alert(`Failed to save job: ${result.message || 'Unknown error'}`);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ AddEditJobModal - Save failed with status:', response.status);
        if (!isAutoSave) {
          try {
            const errorJson = JSON.parse(errorText);
            alert(`Failed to save job: ${errorJson.message || 'Unknown error'}`);
          } catch {
            alert(`Failed to save job. Status: ${response.status}`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      if (!isAutoSave) {
        alert('Error saving job. Please try again.');
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
          period: 'yearly'
        },
        contacts: []
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
      contacts: []
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#141810] border border-white/10 rounded-2xl p-4 w-full max-w-[1000px] max-h-[70vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="text-white">
            {/* Glassmorphism Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-lime-500/20 backdrop-blur-sm rounded-lg border border-lime-500/30">
                  <Briefcase size={16} className="text-lime-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Add/Edit Job Application
                  </h2>
                  <p className="text-white/70 text-xs">
                    Create or update your job application details
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <div className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-lg border border-orange-500/30">
                    Unsaved changes
                  </div>
                )}
                
                <motion.button
                  onClick={handleClose}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-blue-500/20 rounded-lg">
                    <Info size={14} className="text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle || ''}
                      onChange={(e) => handleFormChange('jobTitle', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="e.g. Senior Software Engineer"
                    />
                    <div className="text-lime-300 text-xs mt-1">{jobTitleCount}/100</div>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Company</label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => handleFormChange('company', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="e.g. Google"
                    />
                    <div className="text-lime-300 text-xs mt-1">{companyCount}/100</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Location</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="e.g. San Francisco, CA"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Job URL</label>
                    <input
                      type="url"
                      value={formData.jobUrl || ''}
                      onChange={(e) => handleFormChange('jobUrl', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="https://company.com/job-posting"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Priority</label>
                    <select
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">App Date</label>
                    <input
                      type="date"
                      value={formData.applicationDate || ''}
                      onChange={(e) => handleFormChange('applicationDate', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline || ''}
                      onChange={(e) => handleFormChange('deadline', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Salary Information */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-green-500/20 rounded-lg">
                    <DollarSign size={14} className="text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Salary Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Min Salary</label>
                    <input
                      type="number"
                      value={formData.salary?.min || ''}
                      onChange={(e) => handleFormChange('salary', { ...formData.salary, min: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="80"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Max Salary</label>
                    <input
                      type="number"
                      value={formData.salary?.max || ''}
                      onChange={(e) => handleFormChange('salary', { ...formData.salary, max: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Currency</label>
                    <select
                      value={formData.salary?.currency || 'USD'}
                      onChange={(e) => handleFormChange('salary', { ...formData.salary, currency: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Period</label>
                    <select
                      value={formData.salary?.period || 'yearly'}
                      onChange={(e) => handleFormChange('salary', { ...formData.salary, period: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    >
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-purple-500/20 rounded-lg">
                    <FileText size={14} className="text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Job Description</h3>
                </div>
                
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    value={formData.jobDescription || ''}
                    onChange={(e) => handleFormChange('jobDescription', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none resize-none"
                    placeholder="Paste the job description here..."
                  />
                  <div className="text-lime-300 text-xs mt-1">{jobDescriptionCount}/2000</div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-orange-500/20 rounded-lg">
                    <Star size={14} className="text-orange-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Additional Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Sponsorship</label>
                    <select
                      value={formData.sponsorship || 'unknown'}
                      onChange={(e) => handleFormChange('sponsorship', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-1.5">Tags</label>
                    <input
                      type="text"
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleFormChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none"
                      placeholder="remote, senior, javascript"
                    />
                    <div className="text-lime-300 text-xs mt-1">Separate tags with commas</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-1.5">Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-lime-400/50 focus:outline-none resize-none"
                    placeholder="Add any additional notes..."
                  />
                  <div className="text-lime-300 text-xs mt-1">{notesCount}/500</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/20">
              <motion.button
                onClick={handleClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              
              <motion.button
                onClick={() => handleSaveJob(false)}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-black font-semibold rounded-lg text-sm hover:from-lime-400 hover:to-lime-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-1.5">
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
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
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
                <p className="text-white/70 text-sm mb-4">
                  You have unsaved changes. Are you sure you want to close without saving?
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    onClick={() => setShowUnsavedWarning(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleConfirmClose}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
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
    </AnimatePresence>
  );
};

export default AddEditJobModal;
