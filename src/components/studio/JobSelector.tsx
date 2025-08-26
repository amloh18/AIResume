'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ExternalLink
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load jobs from database
  useEffect(() => {
    loadJobs();
  }, [userId]);

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
      console.log('🔍 JobSelector - Loading jobs for userId:', userId);
      
      const response = await fetch(`/api/jobs?userId=${userId}&limit=50`);
      const result = await response.json();
      
      console.log('🔍 JobSelector - API response:', result);
      
      if (result.success && result.data?.jobs) {
        const formattedJobs = result.data.jobs.map((job: any) => ({
          id: job.id || job._id,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location || 'Remote',
          status: job.status,
          applicationDate: job.applicationDate,
          salary: job.salary,
          jobDescription: job.jobDescription,
          requirements: job.jobDescription ? extractRequirements(job.jobDescription) : [],
          responsibilities: []
        }));
        
        console.log('🔍 JobSelector - Formatted jobs:', formattedJobs);
        setJobs(formattedJobs);
      } else {
        console.log('🔍 JobSelector - No jobs found or API error');
        setJobs([]);
      }
    } catch (error) {
      console.error('❌ JobSelector - Error loading jobs:', error);
      setJobs([]);
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

  const filteredJobs = jobs.filter(job =>
    job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-3" ref={dropdownRef}>
      {/* Selected Job Display */}
      {selectedJob ? (
        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-3 w-3 text-lime-400" />
                <span className="text-xs font-medium text-white">{selectedJob.jobTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Building className="h-3 w-3" />
                <span>{selectedJob.company}</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span>{selectedJob.location}</span>
              </div>
              {selectedJob.salary && (
                <div className="text-xs text-gray-400 mt-1">
                  {formatSalary(selectedJob.salary)}
                </div>
              )}
            </div>
            <button
              onClick={handleClearSelection}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-300">Job Reference</label>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-gray-300 text-xs flex items-center justify-between hover:bg-gray-500 transition-colors"
          >
            <span>Select a job posting...</span>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <p className="text-xs text-gray-400">Select a job to enable AI optimizations</p>
        </div>
      )}

      {/* Job Selection Dropdown - Expands in place */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-gray-700 border border-gray-600 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* Jobs List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin text-lime-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-400">Loading jobs...</span>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-4 text-center">
                  <span className="text-xs text-gray-400">
                    {searchTerm ? 'No jobs found' : 'No jobs available'}
                  </span>
                  {!searchTerm && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          window.open('/dashboard?tab=pipeline', '_blank');
                        }}
                        className="text-xs text-lime-400 hover:text-lime-300 underline"
                      >
                        Add your first job
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-600">
                  {filteredJobs.map((job) => (
                    <motion.button
                      key={job.id}
                      onClick={() => handleJobSelect(job)}
                      className="w-full p-3 text-left hover:bg-gray-600 transition-colors"
                      whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="h-3 w-3 text-lime-400" />
                            <span className="text-xs font-medium text-white">{job.jobTitle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <Building className="h-3 w-3" />
                            <span>{job.company}</span>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>Applied {formatDate(job.applicationDate)}</span>
                            {job.salary && (
                              <>
                                <span>•</span>
                                <span>{formatSalary(job.salary)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          job.status === 'applied' ? 'bg-blue-900/20 text-blue-400' :
                          job.status === 'interview' ? 'bg-yellow-900/20 text-yellow-400' :
                          job.status === 'offer' ? 'bg-green-900/20 text-green-400' :
                          'bg-gray-900/20 text-gray-400'
                        }`}>
                          {job.status}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Job Button */}
            <div className="p-3 border-t border-gray-600">
              <button
                onClick={() => {
                  // Open job creation modal or navigate to job creation
                  window.open('/dashboard?tab=pipeline', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs rounded-lg transition-colors"
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
