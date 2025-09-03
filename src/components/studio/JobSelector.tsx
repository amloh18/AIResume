'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { 
  Briefcase, 
  Building, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Search,
  Loader2,
  X,
  Plus,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: string;
  applicationDate: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  jobDescription?: string;
  requirements?: string[];
  responsibilities?: string[];
}

interface JobSelectorProps {
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  userId: string;
}

const JobSelector: React.FC<JobSelectorProps> = ({
  selectedJobId,
  onJobSelection,
  userId
}) => {
  const { data: session } = useSession();
  console.log('🔍 JobSelector - Component rendered with userId:', userId);
  console.log('🔍 JobSelector - Session data:', session);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load jobs from database
  useEffect(() => {
    console.log('🔍 JobSelector - useEffect triggered with userId:', userId);
    console.log('🔍 JobSelector - Session user ID:', session?.user?.id);
    
    const effectiveUserId = userId || session?.user?.id;
    console.log('🔍 JobSelector - Effective user ID:', effectiveUserId);
    
    if (effectiveUserId) {
      loadJobs();
    } else {
      console.log('🔍 JobSelector - No userId provided, skipping job load');
    }
  }, [userId, session]);

  // Set selected job when selectedJobId changes
  useEffect(() => {
    if (selectedJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === selectedJobId);
      setSelectedJob(job || null);
    } else {
      setSelectedJob(null);
    }
  }, [selectedJobId, jobs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().toISOString();
      const effectiveUserId = userId || session?.user?.id;
      console.log(`🔍 JobSelector - [${timestamp}] Loading jobs for userId:`, effectiveUserId);
      
      const url = `/api/jobs?userId=${effectiveUserId}&limit=50`;
      console.log('🔍 JobSelector - Making request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      console.log('🔍 JobSelector - Response status:', response.status);
      console.log('🔍 JobSelector - Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('🔍 JobSelector - API request failed:', response.status, response.statusText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🔍 JobSelector - API response:', result);
      
      if (result.success && result.data?.jobs) {
        const formattedJobs = result.data.jobs.map((job: any) => ({
          id: job.id || job._id,
          jobTitle: job.jobTitle || 'Untitled Position',
          company: job.company || 'Unknown Company',
          location: job.location || 'Remote',
          status: job.status || 'created',
          applicationDate: job.applicationDate,
          salary: job.salary,
          jobDescription: job.jobDescription || '',
          requirements: job.jobDescription ? extractRequirements(job.jobDescription) : [],
          responsibilities: []
        }));
        
        console.log('🔍 JobSelector - Formatted jobs:', formattedJobs);
        console.log('🔍 JobSelector - Job counts by status:', result.data.counts);
        setJobs(formattedJobs);
      } else {
        console.log('🔍 JobSelector - No jobs found or API error. Response:', result);
        setJobs([]);
      }
    } catch (error) {
      console.error('❌ JobSelector - Error loading jobs:', error);
      
      // Fallback to mock data for testing
      console.log('🔍 JobSelector - Using fallback mock data');
      const mockJobs = [
        {
          id: 'mock-1',
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco',
          status: 'applied',
          applicationDate: new Date().toISOString(),
          salary: { min: 80000, max: 120000, currency: 'USD' },
          jobDescription: 'Full-stack development role',
          requirements: ['JavaScript', 'React', 'Node.js'],
          responsibilities: []
        },
        {
          id: 'mock-2',
          jobTitle: 'Product Manager',
          company: 'Startup Inc',
          location: 'Remote',
          status: 'interview',
          applicationDate: new Date().toISOString(),
          salary: { min: 90000, max: 130000, currency: 'USD' },
          jobDescription: 'Product management role',
          requirements: ['Product Strategy', 'Agile', 'User Research'],
          responsibilities: []
        }
      ];
      setJobs(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract requirements from job description
  const extractRequirements = (description: string): string[] => {
    const requirements: string[] = [];
    const lines = description.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.includes('requirement') || trimmed.includes('qualification') || trimmed.includes('skill')) {
        // Extract key terms from requirement lines
        const words = line.split(' ').filter(word => 
          word.length > 3 && /^[A-Za-z]+$/.test(word)
        );
        requirements.push(...words.slice(0, 5));
      }
    }
    
    return [...new Set(requirements)];
  };

  // Group jobs by status/stage
  const groupedJobs = jobs.reduce((acc, job) => {
    const status = job.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Define stage order and labels
  const stageOrder = ['created', 'applied', 'interview', 'offer', 'rejected'];
  const stageLabels = {
    created: 'Draft',
    applied: 'Applied',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected'
  };

  const filteredJobs = jobs.filter(job =>
    job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter grouped jobs by search term
  const filteredGroupedJobs = Object.keys(groupedJobs).reduce((acc, status) => {
    const filteredJobsInStage = groupedJobs[status].filter(job =>
      job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredJobsInStage.length > 0) {
      acc[status] = filteredJobsInStage;
    }
    return acc;
  }, {} as Record<string, Job[]>);

  console.log('🔍 JobSelector - Current jobs:', jobs);
  console.log('🔍 JobSelector - Grouped jobs:', groupedJobs);
  console.log('🔍 JobSelector - Filtered grouped jobs:', filteredGroupedJobs);

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    onJobSelection(job.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedJob(null);
    onJobSelection(null);
  };

  const formatSalary = (salary?: Job['salary']) => {
    if (!salary) return null;
    const { min, max, currency = 'USD', period = 'yearly' } = salary;
    if (min && max) {
      return `${currency} ${min}k - ${max}k/${period}`;
    } else if (min) {
      return `${currency} ${min}k/${period}`;
    } else if (max) {
      return `${currency} ${max}k/${period}`;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="relative min-w-[200px] max-w-[300px]" ref={dropdownRef}>
      {/* Selected Job Display */}
      {selectedJob ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <Briefcase className="h-3 w-3 text-lime-600" />
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{selectedJob.jobTitle}</span>
                <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  selectedJob.status === 'created' ? 'bg-gray-100 text-gray-600' :
                  selectedJob.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                  selectedJob.status === 'interview' ? 'bg-yellow-100 text-yellow-700' :
                  selectedJob.status === 'offer' ? 'bg-green-100 text-green-700' :
                  selectedJob.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {stageLabels[selectedJob.status as keyof typeof stageLabels]}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Building className="h-3 w-3" />
                <span className="truncate">{selectedJob.company}</span>
              </div>
            </div>
            <button
              onClick={handleClearSelection}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors ml-2"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm min-w-[200px]"
        >
          <span className="truncate">Select job...</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}

      {/* Job Selection Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-[999999] min-w-[280px]"
          >
            {/* Search Bar */}
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md pl-6 pr-2 py-1 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-lime-400 focus:bg-white dark:focus:bg-gray-600"
                  />
                </div>
                <button
                  onClick={loadJobs}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  title="Refresh jobs"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Jobs List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center">
                  <Loader2 className="h-3 w-3 animate-spin text-lime-600 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Loading jobs...</span>
                </div>
              ) : Object.keys(filteredGroupedJobs).length === 0 ? (
                <div className="p-3 text-center">
                  <span className="text-xs text-gray-500">
                    {searchTerm ? 'No jobs found' : 'No jobs available'}
                  </span>
                  {!searchTerm && (
                    <div className="mt-1">
                      <button
                        onClick={() => {
                          window.open('/dashboard?tab=pipeline', '_blank');
                        }}
                        className="text-xs text-lime-600 hover:text-lime-700 underline"
                      >
                        Add your first job
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {stageOrder.map((stage) => {
                    const jobsInStage = filteredGroupedJobs[stage];
                    if (!jobsInStage || jobsInStage.length === 0) return null;
                    
                    return (
                      <div key={stage} className="border-b border-gray-100 last:border-b-0">
                        {/* Stage Header */}
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">
                              {stageLabels[stage as keyof typeof stageLabels]}
                            </span>
                            <span className="text-xs text-gray-500">
                              {jobsInStage.length} job{jobsInStage.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {/* Jobs in this stage */}
                        <div className="divide-y divide-gray-50">
                          {jobsInStage.map((job) => (
                            <motion.button
                              key={job.id}
                              onClick={() => handleJobSelect(job)}
                              className="w-full p-2 text-left hover:bg-gray-50 transition-colors"
                              whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Briefcase className="h-3 w-3 text-lime-600" />
                                    <span className="text-xs font-medium text-gray-900 truncate">{job.jobTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Building className="h-3 w-3" />
                                    <span className="truncate">{job.company}</span>
                                    {job.location && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{job.location}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className={`px-1.5 py-0.5 rounded text-xs font-medium ml-2 ${
                                  job.status === 'created' ? 'bg-gray-100 text-gray-600' :
                                  job.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                                  job.status === 'interview' ? 'bg-yellow-100 text-yellow-700' :
                                  job.status === 'offer' ? 'bg-green-100 text-green-700' :
                                  job.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {stageLabels[job.status as keyof typeof stageLabels]}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Job Button */}
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  window.open('/dashboard?tab=pipeline', '_blank');
                }}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-lime-600 hover:bg-lime-700 text-white text-xs rounded-md transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add New Job
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSelector;
