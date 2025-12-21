'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useCreditExhaustionHandler } from '@/hooks/useCreditExhaustionHandler';
import { getCountryFlag } from '@/lib/config/adminConstants';
import { LocationService } from '@/lib/payment/locationService';
import { DuplicateJobService, DuplicateCheckResult } from '@/lib/services/duplicateJobService';
import DuplicateJobWarningModal from './DuplicateJobWarningModal';
import { useUpgradePopupTrigger } from '@/lib/hooks/useUpgradePopupTrigger';
import UpgradeCard from '@/components/dashboard/UpgradeCard';

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
  status?: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
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

interface EditJobSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (job: Job) => void;
  editingJob?: Job | null;
  userId?: string;
  existingJobs?: any[]; // For duplicate detection
}

const EditJobSidebar: React.FC<EditJobSidebarProps> = ({
  isOpen,
  onClose,
  onJobSaved,
  editingJob,
  userId,
  existingJobs = []
}) => {
  const { user } = useUnifiedAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Duplicate detection state
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [proceedDespiteDuplicate, setProceedDespiteDuplicate] = useState(false);

  // Global credit exhaustion handler
  const { checkUsageAndHandleExhaustion, showExhaustionModal } = useCreditExhaustionHandler();
  const { shouldShow: shouldShowUpgradePopup, show: showUpgradePopup, dismiss: dismissUpgradePopup } = useUpgradePopupTrigger();
  const [showUpgradeCard, setShowUpgradeCard] = useState(false);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<any>(null);
  const isSavingRef = useRef<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const [locationFlag, setLocationFlag] = useState<string>('');
  const [userCurrency, setUserCurrency] = useState<string>('USD');

  // Helper function to get date string in YYYY-MM-DD format
  const getDateString = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const currencySymbols: Record<string, string> = {
      'USD': '$', 'CAD': '$', 'AUD': '$', 'NZD': '$', 'SGD': '$', 'MXN': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'CNY': '¥',
      'CHF': 'CHF',
      'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
      'BRL': 'R$',
      'AED': 'AED',
      'SAR': 'SAR',
      'ILS': '₪',
      'TRY': '₺',
      'RUB': '₽',
      'THB': '฿',
      'IDR': 'Rp',
      'PHP': '₱',
      'VND': '₫',
      'MYR': 'RM',
      'HKD': 'HK$',
      'TWD': 'NT$',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'RON': 'lei',
      'BGN': 'лв',
      'HRK': 'kn',
      'ISK': 'kr'
    };
    return currencySymbols[currency] || currency;
  };

  // Helper function to extract country code from location string
  const extractCountryFromLocation = (location: string): string | null => {
    if (!location) return null;

    // Common country name to code mapping
    const countryMap: Record<string, string> = {
      'united states': 'US', 'usa': 'US', 'america': 'US',
      'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB',
      'canada': 'CA',
      'australia': 'AU',
      'germany': 'DE', 'deutschland': 'DE',
      'france': 'FR',
      'italy': 'IT',
      'spain': 'ES',
      'netherlands': 'NL', 'holland': 'NL',
      'belgium': 'BE',
      'switzerland': 'CH',
      'sweden': 'SE',
      'norway': 'NO',
      'denmark': 'DK',
      'finland': 'FI',
      'poland': 'PL',
      'india': 'IN',
      'japan': 'JP',
      'china': 'CN',
      'south korea': 'KR', 'korea': 'KR',
      'singapore': 'SG',
      'new zealand': 'NZ',
      'ireland': 'IE',
      'portugal': 'PT',
      'greece': 'GR',
      'austria': 'AT',
      'brazil': 'BR',
      'mexico': 'MX',
      'argentina': 'AR',
      'south africa': 'ZA',
      'uae': 'AE', 'united arab emirates': 'AE',
      'saudi arabia': 'SA',
      'israel': 'IL',
      'turkey': 'TR',
      'russia': 'RU',
      'thailand': 'TH',
      'indonesia': 'ID',
      'philippines': 'PH',
      'vietnam': 'VN',
      'malaysia': 'MY',
      'hong kong': 'HK',
      'taiwan': 'TW'
    };

    const locationLower = location.toLowerCase().trim();

    // Check for exact country name matches
    for (const [countryName, code] of Object.entries(countryMap)) {
      if (locationLower.includes(countryName)) {
        return code;
      }
    }

    // Check for country code pattern (2-3 letter codes)
    const codeMatch = location.match(/\b([A-Z]{2,3})\b/i);
    if (codeMatch) {
      const code = codeMatch[1].toUpperCase();
      if (code.length === 2) {
        return code;
      }
    }

    return null;
  };

  // Get user's currency from geolocation on mount
  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const locationData = await LocationService.getLocationData();
        if (locationData?.currency) {
          setUserCurrency(locationData.currency);
        }
      } catch (error) {
        console.warn('Failed to get user currency from geolocation:', error);
      }
    };

    if (typeof window !== 'undefined') {
      fetchUserCurrency();
    }
  }, []); // Only run once on mount

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
    deadline: getDateString(15), // Default to 15 days from now
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

  // Set currency from geolocation when userCurrency is available and no location/currency set
  useEffect(() => {
    if (userCurrency) {
      setFormData(prev => {
        // Only update if no location and no currency is set
        if (!prev.location && !prev.salary?.currency) {
          return {
            ...prev,
            salary: {
              ...prev.salary,
              currency: userCurrency,
              period: prev.salary?.period || 'yearly'
            }
          };
        }
        return prev;
      });
    }
  }, [userCurrency]);

  // Update location flag when location changes
  useEffect(() => {
    const location = formData?.location;
    if (location) {
      const countryCode = extractCountryFromLocation(location);
      if (countryCode) {
        setLocationFlag(getCountryFlag(countryCode));

        // Update currency based on location
        const countryCurrencies: Record<string, string> = {
          'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD',
          'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
          'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'GR': 'EUR', 'IE': 'EUR',
          'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
          'IN': 'INR', 'JP': 'JPY', 'CN': 'CNY', 'KR': 'KRW',
          'SG': 'SGD', 'NZ': 'NZD', 'BR': 'BRL', 'MX': 'MXN',
          'AE': 'AED', 'SA': 'SAR', 'IL': 'ILS', 'TR': 'TRY',
          'RU': 'RUB', 'TH': 'THB', 'ID': 'IDR', 'PH': 'PHP',
          'VN': 'VND', 'MY': 'MYR', 'HK': 'HKD', 'TW': 'TWD'
        };

        const currency = countryCurrencies[countryCode];
        if (currency) {
          setFormData(prev => ({
            ...prev,
            salary: { ...prev.salary, currency, period: prev.salary?.period || 'yearly' }
          }));
        }
      } else {
        setLocationFlag('');
      }
    } else {
      setLocationFlag('');
    }
  }, [formData?.location]);

  // Character counters
  const [jobTitleCount, setJobTitleCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [jobDescriptionCount, setJobDescriptionCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);

  // Track window width for responsive sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate sidebar width
  const sidebarWidth = useMemo(() => {
    return windowWidth >= 768 ? '50vw' : '100%';
  }, [windowWidth]);

  // Swipe gesture handling for mobile
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only handle horizontal swipes (swipe left to close)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
        handleClose();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const sidebar = sidebarRef.current;
    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initialize form data when editingJob changes or modal opens
  useEffect(() => {
    if (editingJob) {
      // Editing existing job - populate with job data (exclude applicationDate)
      const { applicationDate, ...jobDataWithoutAppDate } = editingJob;
      const data = {
        ...jobDataWithoutAppDate,
        tags: editingJob.tags || [],
        salary: editingJob.salary || { min: undefined, max: undefined, currency: userCurrency || 'USD', period: 'yearly' as 'hourly' | 'monthly' | 'yearly' },
        contactDetails: editingJob.contactDetails || { name: '', email: '', phone: '', role: '' },
        interviews: editingJob.interviews || [],
        followUps: editingJob.followUps || [],
        attachments: editingJob.attachments || [],
        source: editingJob.source || 'other',
        sourceUrl: editingJob.sourceUrl || '',
        atsScore: editingJob.atsScore || undefined,
        atsAnalysis: editingJob.atsAnalysis || undefined,
        statusHistory: editingJob.statusHistory || [],
        // Set default deadline if not present
        deadline: editingJob.deadline || getDateString(15)
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
        status: 'created' as 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
        deadline: getDateString(15), // Default to 15 days from now
        sponsorship: 'unknown' as 'yes' | 'no' | 'unknown',
        tags: [],
        salary: {
          min: undefined,
          max: undefined,
          currency: userCurrency || 'USD',
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
    setErrorMessage('');
    setFieldErrors({});
  }, [editingJob, isOpen]);

  // Update character counters
  useEffect(() => {
    setJobTitleCount(formData.jobTitle?.length || 0);
    setCompanyCount(formData.company?.length || 0);
    setJobDescriptionCount(formData.jobDescription?.length || 0);
    setNotesCount(formData.notes?.length || 0);
  }, [formData.jobTitle, formData.company, formData.jobDescription, formData.notes]);

  // Auto-save functionality
  useEffect(() => {
    if (!isOpen || !editingJob?.id) return; // Only auto-save for existing jobs

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if data has changed
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(lastSavedDataRef.current);

    if (hasChanges) {
      setHasUnsavedChanges(true);

      // Set new timeout for auto-save (only if not already saving manually)
      if (!isSavingRef.current) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          // Double-check we're not saving manually before auto-saving
          if (!isSavingRef.current) {
            handleSaveJob(true); // Auto-save
          }
        }, 2000);
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isOpen, editingJob]);

  const getFormData = () => {
    const data: any = {
      ...formData,
      userId: userId || user?.id,
      updatedAt: new Date().toISOString()
    };

    // Remove id, _id, createdAt for new jobs (let server generate them)
    const isNewJob = !editingJob?.id && !editingJob?._id;
    if (isNewJob) {
      delete data.id;
      delete data._id;
      delete data.createdAt;
      // Keep updatedAt as it's set above
    }

    // Remove applicationDate as it's no longer used in the form
    delete data.applicationDate;

    return data;
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveJob = async (isAutoSave = false) => {
    // Prevent concurrent saves
    if (isSavingRef.current && !isAutoSave) {
      console.log('⚠️ EditJobSidebar - Save already in progress, ignoring duplicate call');
      return;
    }

    try {
      if (!isAutoSave) {
        isSavingRef.current = true;
        setIsSaving(true);
      }

      // Determine if this is a new job - check both id and _id fields
      const isNewJob = !editingJob?.id && !editingJob?._id;
      const jobData = getFormData();

      // Ensure we're using the correct ID for updates
      const jobId = editingJob?.id || editingJob?._id;
      const url = jobId ? `/api/jobs/${jobId}` : '/api/jobs';
      const method = jobId ? 'PUT' : 'POST';

      console.log('🔍 EditJobSidebar - Saving job:', {
        method,
        url,
        isNewJob,
        hasEditingJob: !!editingJob,
        editingJobId: editingJob?.id || editingJob?._id,
        jobId,
        jobDataKeys: Object.keys(jobData)
      });

      // Clear previous errors
      setErrorMessage('');
      setFieldErrors({});

      // Validate required fields for new jobs
      if (isNewJob && (!jobData.jobTitle || !jobData.company)) {
        console.error('❌ Missing required fields:', { jobTitle: jobData.jobTitle, company: jobData.company });
        const errors: Record<string, string> = {};
        if (!jobData.jobTitle) errors.jobTitle = 'Job title is required';
        if (!jobData.company) errors.company = 'Company name is required';
        setFieldErrors(errors);
        setErrorMessage('Please fill in all required fields');
        if (!isAutoSave) setIsSaving(false);
        return;
      }

      // Validate jobUrl - must be valid URL or empty
      if (jobData.jobUrl && jobData.jobUrl.trim()) {
        try {
          new URL(jobData.jobUrl);
        } catch {
          setFieldErrors({ jobUrl: 'Please enter a valid URL (e.g., https://example.com/job) or leave it empty' });
          setErrorMessage('Please fix the errors below');
          if (!isAutoSave) setIsSaving(false);
          return;
        }
      }

      // Validate source is a valid enum value
      const validSources = ['extension', 'manual', 'import', 'linkedin', 'indeed', 'company-website', 'referral', 'other'];
      if (jobData.source && !validSources.includes(jobData.source)) {
        // Auto-fix: map invalid sources to valid ones
        if (jobData.source === 'web') {
          jobData.source = 'manual';
        } else {
          jobData.source = 'other';
        }
      }

      // Clean jobUrl - set to undefined if empty string
      if (jobData.jobUrl === '' || !jobData.jobUrl?.trim()) {
        jobData.jobUrl = undefined;
      } else {
        jobData.jobUrl = jobData.jobUrl.trim();
      }

      // Check for duplicate jobs (only for new jobs, not auto-saves)
      if (isNewJob && !isAutoSave && !proceedDespiteDuplicate && jobData.jobTitle && jobData.company) {
        try {
          const duplicateResult = await DuplicateJobService.checkDuplicate(
            {
              jobTitle: jobData.jobTitle,
              company: jobData.company,
              location: jobData.location,
              jobUrl: jobData.jobUrl
            },
            existingJobs,
            {
              checkLocation: false, // Don't require location match
              daysThreshold: 30,
              similarityThreshold: 0.7
            }
          );

          if (duplicateResult.isDuplicate && (duplicateResult.confidence === 'high' || duplicateResult.confidence === 'medium')) {
            // Show duplicate warning modal
            setDuplicateCheck(duplicateResult);
            setShowDuplicateWarning(true);
            if (!isAutoSave) setIsSaving(false);
            isSavingRef.current = false;
            return;
          }
        } catch (duplicateError) {
          console.warn('Duplicate check failed, proceeding anyway:', duplicateError);
          // Don't block save if duplicate check fails
        }
      }

      // Reset duplicate flag after check
      if (proceedDespiteDuplicate) {
        setProceedDespiteDuplicate(false);
      }

      // Check credits only if creating/updating job with status 'created' (not 'draft')
      // Draft jobs can be saved unlimited without credit check
      const jobStatus = jobData.status || 'created';
      const previousStatus = editingJob?.status;
      const isMovingToCreated = previousStatus === 'draft' && jobStatus === 'created';
      const isCreatingAsCreated = isNewJob && jobStatus === 'created';

      if ((isCreatingAsCreated || isMovingToCreated) && !isAutoSave && user?.id) {
        try {
          const creditCheckResponse = await authenticatedFetchWithUserId('/api/user/usage/check', user.id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'job_create' })
          });

          if (creditCheckResponse.ok) {
            const creditCheck = await creditCheckResponse.json();
            // Use global credit exhaustion handler - it will show modal if credits exhausted
            if (checkUsageAndHandleExhaustion(creditCheck, 'pro_monthly')) {
              // Credits exhausted, modal is shown by handler
              if (!isAutoSave) setIsSaving(false);
              return;
            }
          }
        } catch (creditError) {
          console.error('Error checking credits:', creditError);
          // Continue with job creation if credit check fails (don't block user)
        }
      }

      // Step 1: Save the job
      const response = await authenticatedFetchWithUserId(url, user?.id, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      console.log('🔍 EditJobSidebar - Response status:', response.status);

      // Handle insufficient credits error (403 or 500 with credit error)
      if (!response.ok) {
        let errorResult: any = {};
        try {
          const text = await response.text();
          errorResult = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }

        console.log('🔍 EditJobSidebar - Error response:', errorResult);

        // Check if this is a credit-related error
        const isCreditError =
          (response.status === 403 && (errorResult.requiresUpgrade || errorResult.error?.includes('limit exceeded') || errorResult.error?.includes('insufficient credits'))) ||
          (response.status === 500 && (errorResult.error?.includes('limit exceeded') || errorResult.error?.includes('insufficient credits') || errorResult.error?.includes('Plan limit exceeded'))) ||
          ((isCreatingAsCreated || isMovingToCreated) && (errorResult.requiresUpgrade || errorResult.error?.includes('limit') || errorResult.error?.includes('credit')));

        if (isCreditError) {
          // Show credit exhaustion modal with custom message
          const customMessage = errorResult.message || errorResult.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs';
          const limit = errorResult.limit || 1;
          const currentUsage = errorResult.currentUsage || limit;
          const creditsRemaining = Math.max(0, limit - currentUsage);

          showExhaustionModal(
            {
              creditsRemaining,
              limit,
              reason: customMessage
            },
            'pro_monthly'
          );
          
          // Also trigger UpgradeCard
          if (userId) {
            setShowUpgradeCard(true);
          }
          
          if (!isAutoSave) setIsSaving(false);
          return;
        }
      }

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 EditJobSidebar - Save response:', result);

        // Check if the API returned a job object directly (for updates) or success/data structure (for creates)
        if (result.job || result.success !== false || result.data) {
          const savedJob = result.job || result.data || {
            ...jobData,
            id: result.data?.id || result.data?._id || result.id || result._id || editingJob?.id || editingJob?._id
          };

          lastSavedDataRef.current = savedJob;
          setHasUnsavedChanges(false);
          setShowUnsavedWarning(false);
          setErrorMessage('');
          setFieldErrors({});

          // Dispatch credit update event if job was created with 'created' status or moved from draft to created
          if ((isCreatingAsCreated || isMovingToCreated) && !isAutoSave) {
            window.dispatchEvent(new CustomEvent('creditsUpdated'));
          }

          // Dispatch job updated event for ALL saves (including draft and auto-saves) to refresh tracker
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { job: savedJob, isAutoSave } }));

          // Step 2: If this is a new job, implement the "Job First" workflow
          // Create an Application Package automatically
          if (isNewJob && !isAutoSave && user?.id) {
            try {
              console.log('🎯 EditJobSidebar - Creating Application Package for new job:', savedJob.id || savedJob._id);

              // Use the job ID from savedJob (could be id or _id)
              const jobId = savedJob.id || savedJob._id;

              if (!jobId) {
                console.warn('⚠️ EditJobSidebar - No job ID available, skipping package creation');
              } else {
                const packageResult = await ApplicationPackageService.createNewPackage({
                  userId: user.id,
                  jobId: jobId,
                  journeyName: `Application for ${savedJob.jobTitle || savedJob.title} at ${savedJob.company}`,
                  // Pass the job data we already have to avoid refetching
                  jobData: {
                    jobTitle: savedJob.jobTitle || savedJob.title,
                    title: savedJob.jobTitle || savedJob.title,
                    company: savedJob.company,
                    ...savedJob
                  }
                });

                if (packageResult.success) {
                  console.log('✅ EditJobSidebar - Application Package created:', packageResult.data?.journeyId);
                } else {
                  console.warn('⚠️ EditJobSidebar - Failed to create Application Package:', packageResult.message);
                  // Don't fail the job creation if package creation fails
                }
              }
            } catch (packageError) {
              console.error('❌ EditJobSidebar - Error creating Application Package:', packageError);
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
              deadline: getDateString(15), // Default to 15 days from now
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
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ EditJobSidebar - Save failed with status:', response.status, 'Error:', errorText);

        // Handle 404 error - job not found (might be trying to update a non-existent job)
        if (response.status === 404 && method === 'PUT') {
          console.log('⚠️ EditJobSidebar - Job not found on PUT, retrying as new job creation (POST)');
          // Remove any ID fields and retry as POST
          const newJobData = { ...jobData };
          delete newJobData.id;
          delete newJobData._id;

          try {
            const retryResponse = await authenticatedFetchWithUserId('/api/jobs', user?.id, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newJobData),
            });

            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              const savedJob = retryResult.job || retryResult.data || {
                ...newJobData,
                id: retryResult.data?.id || retryResult.data?._id || retryResult.id || retryResult._id
              };
              lastSavedDataRef.current = savedJob;
              setHasUnsavedChanges(false);
              setShowUnsavedWarning(false);
              setErrorMessage('');
              setFieldErrors({});
              onJobSaved(savedJob);
              if (!isAutoSave) {
                setIsSaving(false);
                toast.success('Job saved successfully!');
              }
              return;
            } else {
              const retryErrorText = await retryResponse.text();
              console.error('❌ EditJobSidebar - Retry POST also failed:', retryErrorText);
            }
          } catch (retryError) {
            console.error('❌ EditJobSidebar - Error during retry POST:', retryError);
          }
        }

        if (!isAutoSave) {
          try {
            const errorJson = JSON.parse(errorText);
            // Try to parse field-specific errors from validation
            if (errorJson.errors) {
              const errors: Record<string, string> = {};
              Object.keys(errorJson.errors).forEach(field => {
                errors[field] = errorJson.errors[field].message || errorJson.errors[field];
              });
              setFieldErrors(errors);
            }
            setErrorMessage(errorJson.message || errorJson.error || `Server error (${response.status})`);
          } catch {
            setErrorMessage(`Failed to save job. Server returned status: ${response.status}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ EditJobSidebar - Error saving job:', error);
      if (!isAutoSave) {
        // Provide more specific error messages based on the error type
        let errorMsg = 'Error saving job. Please try again.';

        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (error instanceof Error) {
          errorMsg = `Error: ${error.message}`;
        }

        setErrorMessage(errorMsg);
      }
    } finally {
      if (!isAutoSave) {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges && editingJob?.id) {
      // Show non-intrusive warning banner instead of modal
      setShowUnsavedWarning(true);
    } else {
      handleConfirmClose();
    }
  };

  const handleConfirmClose = () => {
    // Clear auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Reset form state
    setFormData({
      jobTitle: '',
      company: '',
      location: '',
      jobUrl: '',
      jobDescription: '',
      notes: '',
      priority: 'medium',
      status: 'created',
      deadline: getDateString(15), // Default to 15 days from now
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
    setShowUnsavedWarning(false);
    setErrorMessage('');
    setFieldErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment key="edit-job-sidebar">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-40"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={handleClose}
          />

          {/* Sidebar */}
          <motion.div
            key="sidebar"
            ref={sidebarRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
            style={{ width: sidebarWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingJob ? 'Edit Job Application' : 'Add New Job Application'}
                </h2>
                <motion.button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              {/* Non-intrusive Unsaved Changes Banner */}
              {showUnsavedWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-3 border-t border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20"
                >
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2 flex-1">
                      <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        You have unsaved changes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => setShowUnsavedWarning(false)}
                        className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={handleConfirmClose}
                        className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white rounded-lg transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Close Anyway
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3"
              >
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">Error Saving Job</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                </div>
                <button
                  onClick={() => {
                    setErrorMessage('');
                    setFieldErrors({});
                  }}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Job Title</label>
                      <input
                        type="text"
                        value={formData.jobTitle || ''}
                        onChange={(e) => {
                          handleFormChange('jobTitle', e.target.value);
                          if (fieldErrors.jobTitle) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next.jobTitle;
                              return next;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 bg-white dark:bg-[#232f1c] border ${fieldErrors.jobTitle
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-white/20'
                          } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md`}
                        placeholder="Enter job title"
                        maxLength={100}
                      />
                      {fieldErrors.jobTitle && (
                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">{fieldErrors.jobTitle}</p>
                      )}
                      <div className="text-gray-500 dark:text-white/50 text-xs mt-1">{jobTitleCount}/100</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Company</label>
                        <input
                          type="text"
                          value={formData.company || ''}
                          onChange={(e) => {
                            handleFormChange('company', e.target.value);
                            if (fieldErrors.company) {
                              setFieldErrors(prev => {
                                const next = { ...prev };
                                delete next.company;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 bg-white dark:bg-[#232f1c] border ${fieldErrors.company
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-300 dark:border-white/20'
                            } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md`}
                          placeholder="Enter company name"
                          maxLength={100}
                        />
                        {fieldErrors.company && (
                          <p className="text-red-600 dark:text-red-400 text-xs mt-1">{fieldErrors.company}</p>
                        )}
                        <div className="text-gray-500 dark:text-white/50 text-xs mt-1">{companyCount}/100</div>
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Location</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.location || ''}
                            onChange={(e) => handleFormChange('location', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
                            placeholder="Enter location"
                          />
                          {locationFlag && (
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-lg pointer-events-none">
                              {locationFlag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Job URL</label>
                      <input
                        type="url"
                        value={formData.jobUrl || ''}
                        onChange={(e) => {
                          handleFormChange('jobUrl', e.target.value);
                          if (fieldErrors.jobUrl) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next.jobUrl;
                              return next;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 bg-white dark:bg-[#232f1c] border ${fieldErrors.jobUrl
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-white/20'
                          } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md`}
                        placeholder="https://company.com/job-posting"
                      />
                      {fieldErrors.jobUrl && (
                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">{fieldErrors.jobUrl}</p>
                      )}
                    </div>

                    {/* Deadline and Priority */}
                    <div>
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-2">Deadline</label>

                      {/* Quick Options */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[5, 10, 15, 30].map((days) => {
                          const dateStr = getDateString(days);
                          const isSelected = formData.deadline === dateStr;
                          return (
                            <motion.button
                              key={days}
                              type="button"
                              onClick={() => handleFormChange('deadline', dateStr)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isSelected
                                ? 'bg-lime-500 dark:bg-[#80FF00] text-white dark:text-black'
                                : 'bg-gray-100 dark:bg-[#232f1c] text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/20'
                                }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {days} days
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Date Input and Priority - Inline */}
                      <div className="flex gap-3 items-end">
                        <div className="relative flex-1">
                          <input
                            type="date"
                            value={formData.deadline || ''}
                            onChange={(e) => handleFormChange('deadline', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded-md text-gray-900 dark:text-white text-sm focus:border-lime-500 dark:focus:border-lime-400/50 focus:outline-none"
                            placeholder="Select date"
                          />
                          <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50 pointer-events-none" />
                        </div>

                        <div className="flex-shrink-0">
                          <label className="block text-gray-700 dark:text-white/80 text-xs font-medium mb-1">Priority</label>
                          <div className="flex bg-gray-100 dark:bg-[#232f1c] rounded-xl p-1 border border-gray-300 dark:border-white/20">
                            {['low', 'medium', 'high'].map((priority) => (
                              <button
                                key={priority}
                                onClick={() => handleFormChange('priority', priority)}
                                className={`px-3 py-2 text-xs font-medium transition-all ${formData.priority === priority
                                  ? 'bg-lime-500 dark:bg-[#80FF00] text-white dark:text-black rounded-lg'
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
                  </div>
                </div>

                {/* Salary Information */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salary Information</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Period:</span>
                      <select
                        value={formData.salary?.period || 'yearly'}
                        onChange={(e) => handleFormChange('salary', { ...formData.salary, period: e.target.value as 'yearly' | 'monthly' | 'hourly' })}
                        className="px-2 py-1 text-xs bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded text-gray-700 dark:text-white focus:border-lime-500 dark:focus:border-lime-400/50 focus:outline-none"
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Min Salary</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                            {getCurrencySymbol(formData.salary?.currency || userCurrency || 'USD')}
                          </span>
                          <input
                            type="number"
                            value={formData.salary?.min || ''}
                            onChange={(e) => handleFormChange('salary', { ...formData.salary, min: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
                            placeholder="e.g. 80000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Max Salary</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                            {getCurrencySymbol(formData.salary?.currency || userCurrency || 'USD')}
                          </span>
                          <input
                            type="number"
                            value={formData.salary?.max || ''}
                            onChange={(e) => handleFormChange('salary', { ...formData.salary, max: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
                            placeholder="e.g. 120000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Description</h3>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium">Job Description</label>
                      <div className="text-gray-500 dark:text-white/50 text-xs">{jobDescriptionCount}/5000</div>
                    </div>
                    <textarea
                      rows={10}
                      value={formData.jobDescription || ''}
                      onChange={(e) => handleFormChange('jobDescription', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md resize-none"
                      placeholder="Paste the job description here..."
                      maxLength={5000}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Information</h3>

                  <div className="space-y-4">
                    {/* Sponsorship and Tags - Inline */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-white/80 text-sm font-medium mb-1">Sponsorship</label>
                        <div className="flex bg-gray-100 dark:bg-[#232f1c] rounded-xl p-1 border border-gray-300 dark:border-white/20">
                          {['unknown', 'yes', 'no'].map((sponsorship) => (
                            <button
                              key={sponsorship}
                              onClick={() => handleFormChange('sponsorship', sponsorship)}
                              className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${formData.sponsorship === sponsorship
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
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
                              placeholder="HR Manager"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Role</label>
                            <input
                              type="text"
                              value={formData.contactDetails?.role || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, role: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
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
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
                              placeholder="hr@company.com"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 dark:text-white/60 text-xs mb-1">Phone</label>
                            <input
                              type="tel"
                              value={formData.contactDetails?.phone || ''}
                              onChange={(e) => handleFormChange('contactDetails', { ...formData.contactDetails, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md"
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 dark:text-white/80 text-sm font-medium">Notes</label>
                      <div className="text-gray-500 dark:text-white/50 text-xs">{notesCount}/500</div>
                    </div>
                    <textarea
                      rows={6}
                      value={formData.notes || ''}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:border-lime-500 dark:focus:border-[#80FF00]/50 focus:outline-none rounded-md resize-none"
                      placeholder="Add any personal notes here..."
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-white/20 flex-shrink-0">
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
          </motion.div>

        </React.Fragment>
      )}

      {/* Duplicate Job Warning Modal */}
      {showDuplicateWarning && (
        <DuplicateJobWarningModal
          key="duplicate-warning-modal"
          isOpen={showDuplicateWarning}
        duplicateCheck={duplicateCheck}
        newJobData={{
          jobTitle: formData.jobTitle || '',
          company: formData.company || '',
          location: formData.location
        }}
        onProceed={() => {
          setShowDuplicateWarning(false);
          setProceedDespiteDuplicate(true);
          // Re-trigger save after user confirms
          setTimeout(() => handleSaveJob(false), 100);
        }}
        onCancel={() => {
          setShowDuplicateWarning(false);
          setDuplicateCheck(null);
          isSavingRef.current = false;
        }}
        onViewExisting={(jobId) => {
          // Close this sidebar and trigger viewing the existing job
          setShowDuplicateWarning(false);
          setDuplicateCheck(null);
          onClose();
          // TODO: Implement viewing existing job in JobSidebar
          // This would require passing a callback from JobsTracker
          console.log('View existing job:', jobId);
        }}
        />
      )}

      {/* Upgrade Card */}
      {showUpgradeCard && userId && (
        <UpgradeCard
          userId={userId}
          onClose={() => setShowUpgradeCard(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default EditJobSidebar;

