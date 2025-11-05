import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Loader2, CheckCircle2, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { apiClient } from '../lib/api';
import Footer from './Footer';
import { useExtensionAuth } from '../hooks/useExtensionAuth';

interface EditJobModalSidebarProps {
  initialJobData?: any;
  onClose?: () => void;
  isNewJob?: boolean;
}

const EditJobModalSidebar: React.FC<EditJobModalSidebarProps> = ({
  initialJobData: propInitialJobData,
  onClose,
  isNewJob = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useExtensionAuth();
  
  // Get initial job data from props or location state
  const initialJobData = propInitialJobData || (location.state as any)?.initialJobData || null;
  
  const [jobType, setJobType] = useState('Full-time');
  
  // const { token } = useExtensionAuth(); // Token available if needed
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNewJob && !initialJobData);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Calculate default deadline (30 days from now)
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    jobUrl: '',
    jobDescription: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'created' as 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
    deadline: getDefaultDeadline(),
    applicationDate: new Date().toISOString().split('T')[0],
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
    if (initialJobData) {
      // Pre-fill with parsed data
      setFormData({
        jobTitle: initialJobData.title || initialJobData.jobTitle || '',
        company: initialJobData.company || '',
        location: initialJobData.location || '',
        jobUrl: initialJobData.jobUrl || initialJobData.url || '',
        jobDescription: initialJobData.description || initialJobData.jobDescription || '',
        notes: '',
        priority: 'medium',
        status: 'created',
        deadline: initialJobData.deadline ? new Date(initialJobData.deadline).toISOString().split('T')[0] : getDefaultDeadline(),
        applicationDate: initialJobData.applicationDate ? new Date(initialJobData.applicationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
      setIsLoading(false);
    } else if (id) {
      // Load existing job
      loadJob();
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

  const handleDiscard = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/extension/dashboard');
    }
  };

  const handleSave = async () => {
    if (!formData.jobTitle || !formData.company) {
      setSaveError('Job title and company are required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const jobPayload = {
        ...formData,
        deadline: formData.deadline || undefined,
        applicationDate: formData.applicationDate || undefined,
      };

      let result;
      if (isNewJob || !id) {
        console.log('📤 Saving new job:', jobPayload);
        result = await apiClient.createJob(jobPayload);
      } else {
        console.log('📤 Updating job:', id, jobPayload);
        result = await apiClient.updateJob(id, jobPayload);
      }

      if (result.success) {
        console.log('✅ Job saved successfully:', result.data);
        setSaveSuccess(true);
        
        // Show success message briefly before closing
        setTimeout(() => {
          if (onClose) {
            onClose();
          } else {
            navigate('/extension/dashboard');
          }
        }, 1500);
      } else {
        console.error('❌ Failed to save job:', result.error);
        
        if (result.error === 'AUTH_EXPIRED') {
          setSaveError('Your session has expired. Please log in again.');
          setTimeout(() => {
            navigate('/extension/auth');
          }, 2000);
        } else {
          setSaveError(result.error || 'Failed to save job. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving job:', error);
      
      if (error.message === 'AUTH_EXPIRED') {
        setSaveError('Your session has expired. Please log in again.');
        setTimeout(() => {
          navigate('/extension/auth');
        }, 2000);
      } else {
        setSaveError(error.message || 'An unexpected error occurred. Please try again.');
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
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              logout();
              navigate('/extension/auth');
            }}
            className="flex items-center gap-2 text-lime-500 hover:text-lime-400 transition-colors"
          >
            <span>Logout</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="p-3 bg-lime-900/20 border border-lime-800 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={18} className="text-lime-400" />
            <p className="text-sm text-lime-200">
              Job saved successfully! Redirecting...
            </p>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{saveError}</p>
          </div>
        )}

        {/* Core Information Section */}
        <div className="bg-dark-card rounded-lg p-4 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">Core Information</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Job Title
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="Lead UX/UI Designer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="Innovate Solutions Ltd."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="London, UK (Remote)"
            />
          </div>
        </div>

        {/* Role Specifics Section */}
        <div className="bg-dark-card rounded-lg p-4 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">Role Specifics</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Job Type
            </label>
            <div className="relative">
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-white/10 rounded-lg bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 appearance-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Status/Stage
            </label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 pr-10 border border-white/10 rounded-lg bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 appearance-none"
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
              <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Salary Range (Optional)
            </label>
            <input
              type="text"
              value={formData.salary.min && formData.salary.max ? `$${formData.salary.min} - $${formData.salary.max}` : ''}
              onChange={(e) => {
                const value = e.target.value;
                const match = value.match(/\$?(\d+)\s*-\s*\$?(\d+)/);
                if (match) {
                  setFormData({
                    ...formData,
                    salary: {
                      ...formData.salary,
                      min: parseInt(match[1]),
                      max: parseInt(match[2]),
                    }
                  });
                } else {
                  setFormData({
                    ...formData,
                    salary: { ...formData.salary, min: undefined, max: undefined }
                  });
                }
              }}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="e.g., $120,000 - $150,000"
            />
          </div>
        </div>

        {/* Application Dates Section */}
        <div className="bg-dark-card rounded-lg p-4 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">Application Dates</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Created Date
            </label>
            <input
              type="date"
              value={formData.applicationDate}
              onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Deadline
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>
        </div>

        {/* Job Description Section */}
        <div className="bg-dark-card rounded-lg p-4 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">Job Description</h2>
          
          <div>
            <textarea
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-black/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500 resize-y"
              placeholder="Describe the role, responsibilities, and requirements..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleDiscard}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-dark-tertiary hover:bg-dark-tertiary/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || saveSuccess || !formData.jobTitle || !formData.company}
            className="flex-1 py-2.5 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={18} />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EditJobModalSidebar;
