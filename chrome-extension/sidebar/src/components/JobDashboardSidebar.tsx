import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Loader2, ExternalLink, Building2, BookmarkPlus, DollarSign, Settings, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { ParsedJobData } from '../lib/jobParser';
import Footer from './Footer';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  status: string;
  priority: string;
  createdAt: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  employmentType?: string;
}

const JobDashboardSidebar: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJob, setCurrentJob] = useState<ParsedJobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtractingJob, setIsExtractingJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
    extractCurrentJob();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.getJobs();
      if (result.success && result.data) {
        setJobs(result.data.slice(0, 10)); // Show recent 10 jobs
      } else if (result.error === 'AUTH_EXPIRED') {
        navigate('/extension/auth');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractCurrentJob = (forceRefresh = false) => {
    if (forceRefresh) {
      // Clear current job data when forcing refresh
      setCurrentJob(null);
    }
    
    setIsExtractingJob(true);
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Listen for job data from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'JOB_DATA_EXTRACTED') {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (event.data.jobData) {
          console.log('✅ Received job data:', event.data.jobData);
          const jobData = event.data.jobData;
          
          // Only set if we have meaningful data
          if (jobData.title || jobData.jobTitle || jobData.company) {
            setCurrentJob(jobData);
          }
        } else if (event.data.error) {
          console.error('❌ Error extracting job:', event.data.error);
        }
        
        setIsExtractingJob(false);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request job data from parent (content script)
    setTimeout(() => {
      if (window.parent !== window) {
        // Send a refresh request to force re-extraction
        window.parent.postMessage({ 
          type: 'REQUEST_JOB_DATA',
          forceRefresh: forceRefresh 
        }, '*');
      }
      
      // Timeout after 5 seconds for refresh
      timeoutId = setTimeout(() => {
        setIsExtractingJob(false);
        window.removeEventListener('message', handleMessage);
        timeoutId = null;
      }, forceRefresh ? 5000 : 3000);
    }, 100);
  };

  const handleSaveCurrentJob = () => {
    if (!currentJob || !currentJob.title || !currentJob.company) {
      alert('Job data is incomplete. Please try again or add manually.');
      return;
    }

    // Navigate to the new job form with pre-filled data
    navigate('/extension/job/new', {
      state: {
        initialJobData: {
          title: currentJob.title,
          company: currentJob.company,
          location: currentJob.location,
          jobUrl: currentJob.jobUrl || window.location.href,
          description: currentJob.description || currentJob.jobDescription,
        }
      }
    });
  };

  const filteredJobs = jobs.filter(job =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return 'text-lime-500';
      case 'interviewing':
      case 'interview':
        return 'text-lime-500';
      case 'offer':
        return 'text-lime-500';
      default:
        return 'text-lime-500';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigate('/extension/settings')}
            className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
          >
            <Settings size={20} className="text-lime-500" />
          </button>
        </div>

        {/* Fetch Card - Current Job */}
        {currentJob && (currentJob.title || currentJob.jobTitle || currentJob.company) && (
          <div className="bg-dark-card rounded-lg p-4 space-y-3 border border-white/5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white mb-2">
                  {currentJob.title || currentJob.jobTitle || 'Job Title'}
                </h3>
                {currentJob.company && (
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <Building2 size={16} />
                    <span className="font-medium">{currentJob.company}</span>
                    {currentJob.location && (
                      <>
                        <span className="text-white/30">•</span>
                        <span>{currentJob.location}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    extractCurrentJob(true); // Force refresh
                  }}
                  disabled={isExtractingJob}
                  className="p-1.5 hover:bg-dark-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh job data"
                >
                  <RefreshCw 
                    size={16} 
                    className={`text-lime-500 ${isExtractingJob ? 'animate-spin' : ''}`} 
                  />
                </button>
                {currentJob.jobUrl && (
                  <a
                    href={currentJob.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lime-500 hover:text-lime-400"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveCurrentJob}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors"
            >
              <BookmarkPlus size={18} />
              Save This Job
            </button>
          </div>
        )}

        {isExtractingJob && !currentJob && (
          <div className="bg-dark-card rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm">Extracting job details from page...</span>
            </div>
          </div>
        )}

        {/* Clear Separation */}
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Saved Jobs</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg bg-dark-card text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-lime-500" size={24} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto text-white/30 mb-4" size={48} />
              <p className="text-white/70">
                {searchQuery ? 'No jobs found' : 'No saved jobs yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/extension/job/${job.id}`)}
                  className="bg-dark-card rounded-lg p-4 border border-white/5 hover:border-lime-500/50 cursor-pointer transition-all"
                >
                  <div className={`text-sm font-semibold mb-2 ${getStatusColor(job.status)}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">
                    {job.jobTitle}
                  </h3>
                  <p className="text-sm text-white/70 mb-3">
                    {job.company} {job.location && `• ${job.location}`}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    {job.salary && job.salary.min && job.salary.max && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} />
                        <span>
                          {job.salary.currency === 'USD' ? '$' : job.salary.currency === 'GBP' ? '£' : ''}
                          {job.salary.min / 1000}k - {job.salary.currency === 'USD' ? '$' : job.salary.currency === 'GBP' ? '£' : ''}
                          {job.salary.max / 1000}k
                        </span>
                      </div>
                    )}
                    {job.employmentType && (
                      <div className="flex items-center gap-1">
                        <Briefcase size={16} />
                        <span>{job.employmentType}</span>
                      </div>
                    )}
                  </div>
                  <button className="w-full mt-4 py-2 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobDashboardSidebar;

