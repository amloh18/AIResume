'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Star,
  Filter,
  Search,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Target,
  GripVertical,
  Phone,
  Mail,
  Globe,
  User,
  Briefcase as BriefcaseIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Link,
  CalendarDays,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  status: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  applicationDate?: string | null;
  deadline?: string;
  jobDescription?: string;
  jobUrl?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  contacts: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }>;
  userId: string;
  cvId: string;
  createdAt: string;
  updatedAt: string;
}

interface SortableJobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onView: (job: Job) => void;
  isCompact?: boolean;
}

const SortableJobCard: React.FC<SortableJobCardProps> = ({ job, onEdit, onDelete, onView, isCompact = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'created': return 'bg-purple-500/20 border-purple-500/30 text-purple-400';
      case 'applied': return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
      case 'screening': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'interview': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'offer': return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'rejected': return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'accepted': return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'withdrawn': return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  const getPriorityColor = (priority: Job['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'created': return <Plus size={isCompact ? 12 : 14} />;
      case 'applied': return <BriefcaseIcon size={isCompact ? 12 : 14} />;
      case 'screening': return <ClockIcon size={isCompact ? 12 : 14} />;
      case 'interview': return <ClockIcon size={isCompact ? 12 : 14} />;
      case 'offer': return <CheckCircleIcon size={isCompact ? 12 : 14} />;
      case 'rejected': return <XCircleIcon size={isCompact ? 12 : 14} />;
      case 'accepted': return <CheckCircleIcon size={isCompact ? 12 : 14} />;
      case 'withdrawn': return <XCircleIcon size={isCompact ? 12 : 14} />;
      default: return <BriefcaseIcon size={isCompact ? 12 : 14} />;
    }
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white/5 border border-white/10 rounded-xl cursor-move hover:bg-white/10 transition-all duration-200 ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      } ${
        isCompact 
          ? 'p-3 mb-3' 
          : 'p-4 mb-4'
      }`}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className={`absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors ${isCompact ? 'top-1 right-1' : ''}`}>
        <GripVertical size={isCompact ? 14 : 16} />
      </div>

      {/* Priority Badge */}
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${getPriorityColor(job.priority)}`}>
        <div className="w-2 h-2 rounded-full bg-current"></div>
        {job.priority}
      </div>

      {/* Job Title */}
      <h3 className={`text-white font-semibold line-clamp-2 mb-2 ${isCompact ? 'text-sm' : 'text-lg'}`}>{job.jobTitle}</h3>

      {/* Company */}
      <div className="flex items-center gap-2 mb-2">
        <Building size={isCompact ? 12 : 14} className="text-white/60" />
        <span className={`text-white/80 ${isCompact ? 'text-xs' : 'text-sm'}`}>{job.company}</span>
      </div>

      {/* Location - Only show in compact mode if it's short */}
      {job.location && (!isCompact || job.location.length < 20) && (
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={isCompact ? 12 : 14} className="text-white/60" />
          <span className={`text-white/60 ${isCompact ? 'text-xs' : 'text-sm'}`}>{job.location}</span>
        </div>
      )}

      {/* Salary - Only show in normal mode */}
      {!isCompact && formatSalary(job.salary) && (
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} className="text-white/60" />
          <span className="text-white/60 text-sm">{formatSalary(job.salary)}</span>
        </div>
      )}

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${getStatusColor(job.status)}`}>
        {getStatusIcon(job.status)}
        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
      </div>

      {/* Applied Date - Only show in normal mode */}
      {!isCompact && job.applicationDate && job.status !== 'created' && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-white/60" />
          <span className="text-white/60 text-xs">Applied: {new Date(job.applicationDate).toLocaleDateString()}</span>
        </div>
      )}
      
      {/* Created Date - Only show for created status */}
      {!isCompact && job.status === 'created' && job.createdAt && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-white/60" />
          <span className="text-white/60 text-xs">Created: {new Date(job.createdAt).toLocaleDateString()}</span>
        </div>
      )}

      {/* Deadline - Only show in normal mode */}
      {!isCompact && job.deadline && (
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={14} className="text-white/60" />
          <span className="text-white/60 text-xs">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
        </div>
      )}

      {/* Tags - Only show in normal mode */}
      {!isCompact && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 3 && (
            <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full">
              +{job.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={`flex items-center justify-between pt-2 border-t border-white/10 ${isCompact ? 'pt-1' : 'pt-3'}`}>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => onView(job)}
            className={`text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${isCompact ? 'p-1' : 'p-1.5'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Eye size={isCompact ? 12 : 14} />
          </motion.button>
          <motion.button
            onClick={() => onEdit(job)}
            className={`text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${isCompact ? 'p-1' : 'p-1.5'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Edit size={isCompact ? 12 : 14} />
          </motion.button>
        </div>
        <motion.button
          onClick={() => onDelete(job.id)}
          className={`text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ${isCompact ? 'p-1' : 'p-1.5'}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 size={isCompact ? 12 : 14} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const Pipeline: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userCVs, setUserCVs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stages = [
    { id: 'created', title: 'Created', color: 'bg-purple-500/20 border-purple-500/30' },
    { id: 'applied', title: 'Applied', color: 'bg-blue-500/20 border-blue-500/30' },
    { id: 'screening', title: 'Screening', color: 'bg-yellow-500/20 border-yellow-500/30' },
    { id: 'interview', title: 'Interview', color: 'bg-orange-500/20 border-orange-500/30' },
    { id: 'offer', title: 'Offer', color: 'bg-green-500/20 border-green-500/30' },
    { id: 'rejected', title: 'Rejected', color: 'bg-red-500/20 border-red-500/30' },
    { id: 'accepted', title: 'Accepted', color: 'bg-green-500/20 border-green-500/30' },
    { id: 'withdrawn', title: 'Withdrawn', color: 'bg-gray-500/20 border-gray-500/30' }
  ];

  // Load user and jobs on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const userId = parsedUser.id || parsedUser._id;
      loadJobs(userId);
      loadUserCVs(userId);
    }
  }, []);

  const loadJobs = async (userId: string) => {
    try {
      const response = await fetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setJobs(result.data);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCVs = async (userId: string) => {
    try {
      const response = await fetch(`/api/cvs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setUserCVs(result.data);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeJob = jobs.find(job => job.id === active.id);
      const newStatus = over.id as Job['status'];
      
      if (activeJob) {
        const updatedJob = {
          ...activeJob,
          status: newStatus,
          applicationDate: newStatus === 'applied' ? new Date().toISOString() : 
                         newStatus === 'created' ? null : activeJob.applicationDate,
          createdAt: newStatus === 'created' ? new Date().toISOString() : activeJob.createdAt
        };

        try {
          const response = await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedJob)
          });

          if (response.ok) {
            setJobs(jobs.map(job => 
              job.id === active.id ? updatedJob : job
            ));
          }
        } catch (error) {
          console.error('Error updating job status:', error);
        }
      }
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setShowJobModal(true);
  };

  const handleDelete = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId));
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleView = (job: Job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const handleSaveJob = async (jobData: Partial<Job>) => {
    if (!editingJob) return;
    
    setIsSaving(true);
    try {
      const jobToSave = {
        ...editingJob,
        ...jobData,
        userId: user?.id || user?._id,
        cvId: jobData.cvId || (userCVs[0]?.id || userCVs[0]?._id), // Use first CV if none selected
        id: editingJob.id || uuidv4(), // Ensure id is always present
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobToSave)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Use backend id if present, else fallback to frontend id
          const savedJob = { ...result.data, id: result.data.id || jobToSave.id };
          setJobs([...jobs, savedJob]);
          setShowJobModal(false);
          setEditingJob(null);
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddJob = () => {
    const newJob: Partial<Job> = {
      id: uuidv4(),
      jobTitle: '',
      company: '',
      location: '',
      status: 'created',
      priority: 'medium',
      tags: [],
      contacts: [],
      userId: user?.id || user?._id,
      cvId: '' // Will be set when saving
    };
    setEditingJob(newJob as Job);
    setShowJobModal(true);
  };

  const getJobsByStatus = (status: Job['status']) => {
    return jobs.filter(job => job.status === status);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Tracker</h1>
          <p className="text-white/60">Track your job applications and manage your career progress</p>
        </div>
        <motion.button
          onClick={handleAddJob}
          className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={20} />
          Add Job
        </motion.button>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 lg:gap-6 h-full min-w-max">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col min-w-[300px] max-w-[350px]">
              {/* Stage Header */}
              <div className={`${stage.color} border rounded-xl p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">{stage.title}</h3>
                  <span className="bg-white/20 text-white text-sm px-2 py-1 rounded-full">
                    {getJobsByStatus(stage.id as Job['status']).length}
                  </span>
                </div>
              </div>

              {/* Job Cards */}
              <div className="flex-1 min-h-[400px] overflow-y-auto p-2 space-y-2">
                <SortableContext
                  items={getJobsByStatus(stage.id as Job['status']).map(job => job.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence>
                    {getJobsByStatus(stage.id as Job['status']).map((job) => {
                      const jobsInStage = getJobsByStatus(stage.id as Job['status']);
                      const isCompact = jobsInStage.length > 4;
                      
                      return (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SortableJobCard
                            job={job}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onView={handleView}
                            isCompact={isCompact}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </SortableContext>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 shadow-2xl">
              <div className="text-white font-semibold">
                {jobs.find(job => job.id === activeId)?.jobTitle}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Job Modal */}
      <AnimatePresence>
        {showJobModal && (selectedJob || editingJob) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-4">
                  {editingJob ? 'Edit Job' : 'Job Details'}
                </h2>
                
                {/* Link Parser (Coming Soon) */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Link size={16} className="text-blue-400" />
                    <span className="text-blue-400 font-medium">Link Parser (Coming Soon)</span>
                  </div>
                  <p className="text-blue-300 text-sm">
                    Paste a job posting URL to automatically extract job details
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Job Title *</label>
                    <input
                      type="text"
                      id="jobTitle"
                      defaultValue={editingJob?.jobTitle || selectedJob?.jobTitle}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g., Senior Frontend Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Company *</label>
                    <input
                      type="text"
                      id="company"
                      defaultValue={editingJob?.company || selectedJob?.company}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g., TechCorp Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Location</label>
                    <input
                      type="text"
                      id="location"
                      defaultValue={editingJob?.location || selectedJob?.location}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Job URL</label>
                    <input
                      type="url"
                      id="jobUrl"
                      defaultValue={editingJob?.jobUrl || selectedJob?.jobUrl}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="https://company.com/careers/job"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">CV to Use</label>
                    <select
                      id="cvId"
                      defaultValue={editingJob?.cvId || selectedJob?.cvId || (userCVs[0]?.id || userCVs[0]?._id)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      {userCVs.map((cv) => (
                        <option key={cv.id || cv._id} value={cv.id || cv._id}>
                          {cv.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Priority</label>
                    <select
                      id="priority"
                      defaultValue={editingJob?.priority || selectedJob?.priority || 'medium'}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Status</label>
                    <select
                      id="status"
                      defaultValue={editingJob?.status || selectedJob?.status || 'created'}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
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
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      id="deadline"
                      defaultValue={editingJob?.deadline || selectedJob?.deadline}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Notes</label>
                    <textarea
                      id="notes"
                      defaultValue={editingJob?.notes || selectedJob?.notes}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white h-20 resize-none"
                      placeholder="Add any notes about this job application..."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-4 mt-6">
                  <motion.button
                    onClick={() => setShowJobModal(false)}
                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  {editingJob && (
                    <motion.button
                      onClick={() => {
                        const formData = {
                          jobTitle: (document.getElementById('jobTitle') as HTMLInputElement)?.value,
                          company: (document.getElementById('company') as HTMLInputElement)?.value,
                          location: (document.getElementById('location') as HTMLInputElement)?.value,
                          jobUrl: (document.getElementById('jobUrl') as HTMLInputElement)?.value,
                          cvId: (document.getElementById('cvId') as HTMLSelectElement)?.value,
                          priority: (document.getElementById('priority') as HTMLSelectElement)?.value as 'low' | 'medium' | 'high',
                          status: (document.getElementById('status') as HTMLSelectElement)?.value as Job['status'],
                          deadline: (document.getElementById('deadline') as HTMLInputElement)?.value,
                          notes: (document.getElementById('notes') as HTMLTextAreaElement)?.value,
                        };
                        handleSaveJob(formData);
                      }}
                      disabled={isSaving}
                      className="px-6 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isSaving ? 'Saving...' : 'Save Job'}
                    </motion.button>
                  )}
                  {selectedJob && (
                    <motion.button
                      onClick={() => setShowJobModal(false)}
                      className="px-6 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Close
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Pipeline; 