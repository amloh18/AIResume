'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  useDroppable,
} from '@dnd-kit/core';
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
  BarChart3,
  Zap,
  Award,
  TrendingDown,
  Activity,
  Info,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  X,
  RefreshCw,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import JobParser from './JobParser';
import { useSession } from 'next-auth/react';
import { IJobApplication } from '@/models/JobApplication';

interface Job extends Omit<IJobApplication, '_id' | 'userId' | 'cvId'> {
  id: string;
  userId: string;
  cvId: string;
}

interface SortableJobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onView: (job: Job) => void;
  isCompact?: boolean;
}

// KPI Widget Component
const KPIWidget: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; change?: string }> = ({ 
  title, 
  value, 
  icon, 
  color, 
  change 
}) => (
  <motion.div
    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
    whileHover={{ y: -2, scale: 1.02 }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      {change && (
        <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/60 text-sm">{title}</div>
  </motion.div>
);

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
      case 'interview': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'offer': return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'rejected': return 'bg-red-500/20 border-red-500/30 text-red-400';
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
      case 'interview': return <ClockIcon size={isCompact ? 12 : 14} />;
      case 'offer': return <CheckCircleIcon size={isCompact ? 12 : 14} />;
      case 'rejected': return <XCircleIcon size={isCompact ? 12 : 14} />;
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
            <Info size={isCompact ? 12 : 14} />
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

// Droppable Zone Component
const DroppableZone: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[400px] overflow-y-auto p-2 space-y-2 transition-colors duration-200 ${
        isOver ? 'bg-white/5 border-2 border-dashed border-white/20 rounded-lg' : ''
      }`}
    >
      {children}
    </div>
  );
};

const Pipeline: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobParser, setShowJobParser] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userCVs, setUserCVs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // New state for updated features
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Updated stages according to specification
  const stages = [
    { id: 'created', title: 'Created', color: 'bg-purple-500/20 border-purple-500/30' },
    { id: 'applied', title: 'Applied', color: 'bg-blue-500/20 border-blue-500/30' },
    { id: 'interview', title: 'Interview', color: 'bg-orange-500/20 border-orange-500/30' },
    { id: 'offer', title: 'Offer', color: 'bg-green-500/20 border-green-500/30' },
    { id: 'rejected', title: 'Rejected', color: 'bg-red-500/20 border-red-500/30' }
  ];

  const { data: session, status } = useSession();

  // Load user and jobs on component mount
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      const userId = session.user.id;
      if (userId) {
        loadJobs(userId);
        loadUserCVs(userId);
      }
    }
  }, [session]);

  const loadJobs = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        // Transform the data to match the expected format
        const transformedJobs = result.data.map((job: any) => ({
          ...job,
          id: job.id || job._id, // Ensure id is always present
          applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString() : null,
          deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
          createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
          updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : null,
        }));
        setJobs(transformedJobs);
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
        setUserCVs(result.data.data || []);
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

    console.log('Drag end:', { active: active.id, over: over?.id });

    if (over && active.id !== over.id) {
      const activeJob = jobs.find(job => job.id === active.id);
      const newStatus = over.id as Job['status'];
      
      console.log('Updating job:', { jobId: activeJob?.id, newStatus });
      
      if (activeJob) {
        const updatedJob = {
          ...activeJob,
          status: newStatus,
          applicationDate: newStatus === 'applied' ? new Date().toISOString() : 
                         newStatus === 'created' ? null : activeJob.applicationDate,
        };

        try {
          const response = await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updatedJob,
              id: activeJob.id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log('Job updated successfully:', result.data);
              setJobs(jobs.map(job => 
                job.id === active.id ? { ...job, ...result.data, id: result.data.id || job.id } : job
              ));
            } else {
              console.error('Failed to update job:', result);
            }
          } else {
            console.error('HTTP error updating job:', response.status);
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
    if (!confirm('Are you sure you want to delete this job application?')) {
      return;
    }

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
        userId: session?.user?.id || user?.id,
        cvId: jobData.cvId || (userCVs[0]?.id),
        applicationDate: jobData.status === 'applied' ? new Date().toISOString() : 
                       jobData.status === 'created' ? null : editingJob.applicationDate,
        interviews: jobData.interviews || [],
        followUps: jobData.followUps || [],
        attachments: jobData.attachments || [],
        isArchived: jobData.isArchived || false,
      };

      const method = editingJob.id && jobs.some(job => job.id === editingJob.id) ? 'PUT' : 'POST';
      const url = method === 'PUT' ? '/api/jobs' : '/api/jobs';
      const body = method === 'PUT' ? { ...jobToSave, id: editingJob.id } : jobToSave;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const savedJob = { ...result.data, id: result.data.id || editingJob.id };
          
          if (method === 'PUT') {
            // Update existing job
            setJobs(jobs.map(job => job.id === editingJob.id ? savedJob : job));
          } else {
            // Add new job
            setJobs([...jobs, savedJob]);
          }
          
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
      interviews: [],
      followUps: [],
      attachments: [],
      isArchived: false,
      userId: session?.user?.id || user?.id,
      cvId: '' // Will be set when saving
    };
    setEditingJob(newJob as Job);
    setShowJobModal(true);
  };

  const handleJobParsed = (parsedJob: any) => {
    const newJob: Partial<Job> = {
      id: uuidv4(),
      jobTitle: parsedJob.title,
      company: parsedJob.company,
      location: parsedJob.location || '',
      salary: parsedJob.salary || { min: 0, max: 0, currency: 'USD', period: 'yearly' },
      status: 'created',
      priority: 'medium',
      jobDescription: parsedJob.description,
      jobUrl: parsedJob.sourceUrl,
      notes: `Parsed from job URL. Sponsorship: ${parsedJob.sponsorship ? 'Available' : 'Not available'}. ${parsedJob.requirements ? `Requirements: ${parsedJob.requirements.join(', ')}` : ''}`,
      tags: parsedJob.skills || [],
      contacts: [],
      interviews: [],
      followUps: [],
      attachments: [],
      isArchived: false,
      userId: session?.user?.id || user?.id,
      cvId: '' // Will be set when saving
    };
    setEditingJob(newJob as Job);
    setShowJobModal(true);
  };

  // Calculate KPI metrics for the new period-based system
  const calculateKPIs = () => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const getPeriodStart = () => {
      switch (selectedPeriod) {
        case 'day': return dayStart;
        case 'week': return weekStart;
        case 'month': return monthStart;
        default: return weekStart;
      }
    };

    const periodStart = getPeriodStart();
    const periodJobs = jobs.filter(job => new Date(job.createdAt) >= periodStart);

    return {
      totalJobs: jobs.length,
      created: periodJobs.filter(job => job.status === 'created').length,
      applied: periodJobs.filter(job => job.status === 'applied').length,
      interviews: periodJobs.filter(job => job.status === 'interview').length,
      offers: periodJobs.filter(job => job.status === 'offer').length
    };
  };

  const kpis = calculateKPIs();

  // Filter and sort jobs based on search and sort settings
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = jobs.filter(job => 
        job.company?.toLowerCase().includes(query) ||
        job.jobTitle?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        job.notes?.toLowerCase().includes(query) ||
        job.id?.toLowerCase().includes(query)
      );
    }

    // Sort by appropriate date field based on stage
    filtered.sort((a, b) => {
      const getDateA = () => {
        switch (a.status) {
          case 'created': return new Date(a.createdAt);
          case 'applied': return new Date(a.applicationDate || a.createdAt);
          case 'interview': return new Date(a.interviews?.[0]?.date || a.applicationDate || a.createdAt);
          default: return new Date(a.updatedAt || a.createdAt);
        }
      };
      
      const getDateB = () => {
        switch (b.status) {
          case 'created': return new Date(b.createdAt);
          case 'applied': return new Date(b.applicationDate || b.createdAt);
          case 'interview': return new Date(b.interviews?.[0]?.date || b.applicationDate || b.createdAt);
          default: return new Date(b.updatedAt || b.createdAt);
        }
      };

      const dateA = getDateA();
      const dateB = getDateB();
      
      if (sortDirection === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });

    return filtered;
  }, [jobs, searchQuery, sortDirection]);

  const getJobsByStatus = (status: Job['status']) => {
    return filteredAndSortedJobs.filter(job => job.status === status);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">
          {status === 'loading' ? 'Loading session...' : 'Loading jobs...'}
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Please log in to view your job tracker.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Tracker</h1>
          <p className="text-white/60">Track your job applications and manage your career progress</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            onClick={() => setShowJobParser(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link size={20} />
            Parse Job
          </motion.button>
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
      </div>

      {/* Controls Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
        {/* Search */}
        <div className="flex-1 w-full lg:max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search jobs by company, role, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-lime-400/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Sort and View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          {/* Sort by Date */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Sort by date:</span>
            <motion.button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {sortDirection === 'asc' ? (
                <ChevronUp size={16} className="text-white" />
              ) : (
                <ChevronDown size={16} className="text-white" />
              )}
            </motion.button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <motion.button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                viewMode === 'kanban'
                  ? 'bg-lime-400/20 text-lime-400'
                  : 'text-white/60 hover:text-white/80'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Grid3X3 size={14} />
              Kanban
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-lime-400/20 text-lime-400'
                  : 'text-white/60 hover:text-white/80'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <List size={14} />
              List
            </motion.button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white/60 text-sm">Period:</span>
          {['Day', 'Week', 'Month'].map((period) => (
            <motion.button
              key={period}
              onClick={() => setSelectedPeriod(period.toLowerCase() as 'day' | 'week' | 'month')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedPeriod === period.toLowerCase()
                  ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {period}
            </motion.button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPIWidget
            title="Total Jobs"
            value={kpis.totalJobs}
            icon={<Briefcase size={16} className="text-white" />}
            color="bg-blue-500/20"
            change="+12%"
          />
          <KPIWidget
            title="Created"
            value={kpis.created}
            icon={<Plus size={16} className="text-white" />}
            color="bg-purple-500/20"
            change="+5%"
          />
          <KPIWidget
            title="Applied"
            value={kpis.applied}
            icon={<CheckCircle size={16} className="text-white" />}
            color="bg-green-500/20"
            change="+8%"
          />
          <KPIWidget
            title="Interviews"
            value={kpis.interviews}
            icon={<Users size={16} className="text-white" />}
            color="bg-orange-500/20"
            change="+3%"
          />
          <KPIWidget
            title="Offers"
            value={kpis.offers}
            icon={<Award size={16} className="text-white" />}
            color="bg-green-500/20"
            change="+2%"
          />
        </div>
      </div>

      {/* Kanban Board or List View */}
      {viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full">
            {stages.map((stage) => (
              <div key={stage.id} className="flex flex-col">
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
                <DroppableZone id={stage.id}>
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
                </DroppableZone>
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
      ) : (
        /* List View */
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Company</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Role/Title</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Stage</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Location</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Source</th>
                  <th className="px-4 py-3 text-left text-white/80 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedJobs.map((job) => (
                  <motion.tr
                    key={job.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setJobDetails(job);
                      setShowJobDetails(true);
                    }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <td className="px-4 py-3 text-white font-medium">{job.company}</td>
                    <td className="px-4 py-3 text-white/80">{job.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'created' ? 'bg-purple-500/20 text-purple-400' :
                        job.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                        job.status === 'interview' ? 'bg-orange-500/20 text-orange-400' :
                        job.status === 'offer' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {job.status === 'created' ? new Date(job.createdAt).toLocaleDateString() :
                       job.status === 'applied' ? new Date(job.applicationDate || job.createdAt).toLocaleDateString() :
                       job.status === 'interview' ? new Date(job.interviews?.[0]?.date || job.applicationDate || job.createdAt).toLocaleDateString() :
                       new Date(job.updatedAt || job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">{job.location || '-'}</td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {job.jobUrl ? (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setJobDetails(job);
                            setShowJobDetails(true);
                          }}
                          className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Info size={14} />
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(job);
                          }}
                          className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      id="deadline"
                      defaultValue={editingJob?.deadline ? new Date(editingJob.deadline).toISOString().split('T')[0] : 
                                   selectedJob?.deadline ? new Date(selectedJob.deadline).toISOString().split('T')[0] : ''}
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
                        const deadlineValue = (document.getElementById('deadline') as HTMLInputElement)?.value;
                        const formData = {
                          jobTitle: (document.getElementById('jobTitle') as HTMLInputElement)?.value,
                          company: (document.getElementById('company') as HTMLInputElement)?.value,
                          location: (document.getElementById('location') as HTMLInputElement)?.value,
                          jobUrl: (document.getElementById('jobUrl') as HTMLInputElement)?.value,
                          cvId: (document.getElementById('cvId') as HTMLSelectElement)?.value,
                          priority: (document.getElementById('priority') as HTMLSelectElement)?.value as 'low' | 'medium' | 'high',
                          status: (document.getElementById('status') as HTMLSelectElement)?.value as Job['status'],
                          deadline: deadlineValue ? new Date(deadlineValue) : undefined,
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

      {/* Job Details Modal */}
      <AnimatePresence>
        {showJobDetails && jobDetails && (
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {jobDetails.company} – {jobDetails.jobTitle}
                  </h2>
                  <motion.button
                    onClick={() => setShowJobDetails(false)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Stage</label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        jobDetails.status === 'created' ? 'bg-purple-500/20 text-purple-400' :
                        jobDetails.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                        jobDetails.status === 'interview' ? 'bg-orange-500/20 text-orange-400' :
                        jobDetails.status === 'offer' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {jobDetails.status.charAt(0).toUpperCase() + jobDetails.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Location</label>
                      <p className="text-white">{jobDetails.location || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-white/60 text-sm mb-2">Important Dates</label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/60">Created:</span>
                        <span className="text-white">{new Date(jobDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      {jobDetails.applicationDate && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Applied:</span>
                          <span className="text-white">{new Date(jobDetails.applicationDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {jobDetails.deadline && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Deadline:</span>
                          <span className="text-white">{new Date(jobDetails.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job URL */}
                  {jobDetails.jobUrl && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2">Job URL</label>
                      <a
                        href={jobDetails.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 break-all"
                      >
                        {jobDetails.jobUrl}
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {jobDetails.notes && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2">Notes</label>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{jobDetails.notes}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {jobDetails.tags && jobDetails.tags.length > 0 && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {jobDetails.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t border-white/10">
                  {jobDetails.jobUrl && (
                    <motion.button
                      onClick={() => window.open(jobDetails.jobUrl, '_blank')}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ExternalLink size={16} />
                      Open Job Posting
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => {
                      setShowJobDetails(false);
                      handleEdit(jobDetails);
                    }}
                    className="px-4 py-2 bg-lime-400/20 text-lime-400 rounded-lg hover:bg-lime-400/30 transition-colors flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Edit size={16} />
                    Edit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Parser Modal */}
      <JobParser
        isOpen={showJobParser}
        onClose={() => setShowJobParser(false)}
        onJobParsed={handleJobParsed}
      />
    </div>
  );
};

export default Pipeline; 