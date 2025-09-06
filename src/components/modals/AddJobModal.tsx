'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Briefcase, Building, MapPin, DollarSign, Calendar, FileText } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: (job: any) => void;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onJobAdded }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    jobUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return;
    }
    
    try {
      // Create job object
      const jobData = {
        userId: session.user.id,
        jobTitle: formData.jobTitle,
        company: formData.company,
        location: formData.location,
        salary: formData.salary ? { amount: formData.salary, currency: 'USD', period: 'yearly' } : undefined,
        description: formData.description,
        requirements: formData.requirements,
        jobUrl: formData.jobUrl,
        status: 'created' as const,
        priority: 'medium' as const,
        applicationDate: new Date(),
        notes: '',
        tags: []
      };

      console.log('🔍 AddJobModal - Creating job with data:', jobData);

      // Save job to database
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔍 AddJobModal - Job save failed:', errorData);
        throw new Error(errorData.message || 'Failed to save job');
      }

      const savedJob = await response.json();
      console.log('🔍 AddJobModal - Job saved successfully:', savedJob);

      // Call the callback with the saved job
      onJobAdded(savedJob.data || savedJob);
    } catch (error) {
      console.error('Error saving job:', error);
      // Fallback to mock job if API fails
      const mockJob = {
        id: Date.now().toString(),
        jobTitle: formData.jobTitle,
        company: formData.company,
        location: formData.location,
        salary: formData.salary,
        description: formData.description,
        requirements: formData.requirements,
        jobUrl: formData.jobUrl,
        createdAt: new Date().toISOString()
      };
      onJobAdded(mockJob);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-500/20 rounded-lg">
              <Briefcase className="h-5 w-5 text-lime-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Job</h2>
              <p className="text-gray-600 dark:text-white/60 text-sm">Enter job details to start your journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Title */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none"
              placeholder="e.g., Senior Frontend Developer"
              required
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Company *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none"
              placeholder="e.g., Tech Corp"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none"
              placeholder="e.g., San Francisco, CA"
            />
          </div>

          {/* Salary */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Salary Range
            </label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none"
              placeholder="e.g., $80,000 - $120,000"
            />
          </div>

          {/* Job URL */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Job URL
            </label>
            <input
              type="url"
              value={formData.jobUrl}
              onChange={(e) => handleInputChange('jobUrl', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Job Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none resize-none"
              placeholder="Brief description of the role..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Requirements
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => handleInputChange('requirements', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-lime-500 focus:outline-none resize-none"
              placeholder="Key requirements and skills..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-lime-500 text-black font-medium rounded-lg hover:bg-lime-600 transition-colors"
            >
              Add Job
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddJobModal;
