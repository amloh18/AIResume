import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
// import { useExtensionAuth } from '../hooks/useExtensionAuth'; // Available if needed

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  status: string;
  priority: string;
  createdAt: string;
}

const JobDashboardSidebar: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  // const { user } = useExtensionAuth(); // User available if needed

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.getJobs();
      if (result.success && result.data) {
        setJobs(result.data.slice(0, 10)); // Show recent 10 jobs
      } else if (result.error === 'AUTH_EXPIRED') {
        // Redirect to auth if token expired
        navigate('/extension/auth');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Saved Jobs
        </h2>
        <button
          onClick={() => navigate('/extension/job/new')}
          className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          + New Job
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search jobs..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-lime-500" size={24} />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No jobs found' : 'No saved jobs yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/extension/job/${job.id}`)}
              className="p-4 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {job.jobTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {job.company} {job.location && `• ${job.location}`}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${
                  job.status === 'applied' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  job.status === 'interview' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                  job.status === 'offer' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                }`}>
                  {job.status}
                </span>
                <span className={`px-2 py-1 rounded ${
                  job.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                  job.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                }`}>
                  {job.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobDashboardSidebar;

