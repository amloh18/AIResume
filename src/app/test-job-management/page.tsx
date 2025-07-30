'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  priority: string;
  applicationDate?: string;
  notes?: string;
}

const TestJobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const userId = '6889b151d17daa1eaee91a5c'; // Test user ID

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setJobs(result.data);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          status: newStatus,
          applicationDate: newStatus === 'applied' ? new Date().toISOString() : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setJobs(jobs.map(job => 
            job.id === jobId ? { ...job, ...result.data } : job
          ));
        }
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setJobs(jobs.filter(job => job.id !== jobId));
        }
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleCreateJob = async (formData: any) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cvId: '6889b309d17daa1eaee91a70', // Use existing CV
          ...formData,
          applicationDate: formData.status === 'applied' ? new Date().toISOString() : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setJobs([...jobs, result.data]);
          setShowCreateForm(false);
        }
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const filteredJobs = selectedStatus === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === selectedStatus);

  const statusOptions = [
    'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Job Management Test</h1>
          <p className="text-white/60">Test live job operations with database integration</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <span className="text-white/60">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <motion.button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Add Job
          </motion.button>
        </div>

        {/* Jobs List */}
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">{job.jobTitle}</h3>
                  <p className="text-white/60">{job.company}</p>
                  {job.notes && <p className="text-white/40 text-sm mt-1">{job.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {/* Status Selector */}
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>

                  {/* Priority Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    job.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    job.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {job.priority}
                  </span>

                  {/* Delete Button */}
                  <motion.button
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    🗑️
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Create Job Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h2 className="text-white text-xl font-bold mb-4">Create New Job</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateJob({
                  jobTitle: formData.get('jobTitle') as string,
                  company: formData.get('company') as string,
                  status: formData.get('status') as string,
                  priority: formData.get('priority') as string,
                  notes: formData.get('notes') as string,
                });
              }}>
                <div className="space-y-4">
                  <input
                    name="jobTitle"
                    placeholder="Job Title"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                  <input
                    name="company"
                    placeholder="Company"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                  <select
                    name="status"
                    defaultValue="created"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <textarea
                    name="notes"
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white h-20"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Create
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* API Endpoints Info */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-white font-semibold mb-2">API Endpoints Used:</h3>
          <div className="space-y-1 text-sm text-white/60">
            <div>GET /api/jobs?userId={userId} - Load jobs</div>
            <div>POST /api/jobs - Create job</div>
            <div>PUT /api/jobs - Update job status</div>
            <div>DELETE /api/jobs?id={'{jobId}'} - Delete job</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestJobManagement; 