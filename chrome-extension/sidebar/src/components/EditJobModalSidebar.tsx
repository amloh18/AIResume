import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
// import { useExtensionAuth } from '../hooks/useExtensionAuth'; // Available if needed

interface EditJobModalSidebarProps {
  initialJobData?: any;
  onClose?: () => void;
  isNewJob?: boolean;
}

const EditJobModalSidebar: React.FC<EditJobModalSidebarProps> = ({
  initialJobData,
  onClose,
  isNewJob = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { token } = useExtensionAuth(); // Token available if needed
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNewJob && !initialJobData);

  const [formData, setFormData] = useState({
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
    tags: [] as string[],
    salary: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
      currency: 'USD',
      period: 'yearly' as 'hourly' | 'monthly' | 'yearly',
    },
    contactDetails: {
      name: '',
      email: '',
      phone: '',
      role: '',
    },
  });

  useEffect(() => {
    if (isNewJob && initialJobData) {
      // Pre-fill with parsed data
      setFormData({
        jobTitle: initialJobData.title || initialJobData.jobTitle || '',
        company: initialJobData.company || '',
        location: initialJobData.location || '',
        jobUrl: initialJobData.url || initialJobData.jobUrl || '',
        jobDescription: initialJobData.description || initialJobData.jobDescription || '',
        notes: '',
        priority: 'medium',
        status: 'created',
        deadline: '',
        applicationDate: '',
        sponsorship: 'unknown',
        tags: [],
        salary: {
          min: initialJobData.salary?.min,
          max: initialJobData.salary?.max,
          currency: initialJobData.salary?.currency || 'USD',
          period: initialJobData.salary?.period || 'yearly',
        },
        contactDetails: {
          name: '',
          email: '',
          phone: '',
          role: '',
        },
      });
    } else if (id && !initialJobData) {
      // Load existing job
      loadJob();
    } else if (initialJobData) {
      // Use provided initial data
      setFormData({
        jobTitle: initialJobData.jobTitle || initialJobData.title || '',
        company: initialJobData.company || '',
        location: initialJobData.location || '',
        jobUrl: initialJobData.jobUrl || initialJobData.url || '',
        jobDescription: initialJobData.jobDescription || initialJobData.description || '',
        notes: initialJobData.notes || '',
        priority: initialJobData.priority || 'medium',
        status: initialJobData.status || 'created',
        deadline: initialJobData.deadline ? new Date(initialJobData.deadline).toISOString().split('T')[0] : '',
        applicationDate: initialJobData.applicationDate ? new Date(initialJobData.applicationDate).toISOString().split('T')[0] : '',
        sponsorship: initialJobData.sponsorship || 'unknown',
        tags: initialJobData.tags || [],
        salary: initialJobData.salary || {
          min: undefined,
          max: undefined,
          currency: 'USD',
          period: 'yearly',
        },
        contactDetails: initialJobData.contactDetails || {
          name: '',
          email: '',
          phone: '',
          role: '',
        },
      });
      setIsLoading(false);
    }
  }, [id, initialJobData, isNewJob]);

  const loadJob = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const result = await apiClient.getJob(id);
      if (result.success && result.data) {
        const job = result.data;
        setFormData({
          jobTitle: job.jobTitle || job.title || '',
          company: job.company || '',
          location: job.location || '',
          jobUrl: job.jobUrl || job.url || '',
          jobDescription: job.jobDescription || job.description || '',
          notes: job.notes || '',
          priority: job.priority || 'medium',
          status: job.status || 'created',
          deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
          applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '',
          sponsorship: job.sponsorship || 'unknown',
          tags: job.tags || [],
          salary: job.salary || {
            min: undefined,
            max: undefined,
            currency: 'USD',
            period: 'yearly',
          },
          contactDetails: job.contactDetails || {
            name: '',
            email: '',
            phone: '',
            role: '',
          },
        });
      } else if (result.error === 'AUTH_EXPIRED') {
        navigate('/extension/auth');
      }
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.jobTitle || !formData.company) {
      alert('Job title and company are required');
      return;
    }

    setIsSaving(true);
    try {
      const jobPayload = {
        ...formData,
        deadline: formData.deadline || undefined,
        applicationDate: formData.applicationDate || undefined,
      };

      let result;
      if (isNewJob || !id) {
        result = await apiClient.createJob(jobPayload);
      } else {
        result = await apiClient.updateJob(id, jobPayload);
      }

      if (result.success) {
        if (onClose) {
          onClose();
        } else {
          navigate('/extension/dashboard');
        }
      } else {
        if (result.error === 'AUTH_EXPIRED') {
          alert('Your session has expired. Please log in again.');
          navigate('/extension/auth');
        } else {
          alert(result.error || 'Failed to save job');
        }
      }
    } catch (error: any) {
      if (error.message === 'AUTH_EXPIRED') {
        alert('Your session has expired. Please log in again.');
        navigate('/extension/auth');
      } else {
        alert(error.message || 'An error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-lime-500" size={24} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isNewJob ? 'New Job' : 'Edit Job'}
        </h2>
        <button
          onClick={onClose || (() => navigate('/extension/dashboard'))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
        >
          <X size={20} className="text-gray-600 dark:text-white/60" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Job Title *
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            placeholder="Software Engineer"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Company *
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            placeholder="Company Name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            placeholder="San Francisco, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Job URL
          </label>
          <input
            type="url"
            value={formData.jobUrl}
            onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Job Description
          </label>
          <textarea
            value={formData.jobDescription}
            onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            placeholder="Job description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            >
              <option value="created">Created</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="accepted">Accepted</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.jobTitle || !formData.company}
            className="flex-1 py-2 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Job
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditJobModalSidebar;
