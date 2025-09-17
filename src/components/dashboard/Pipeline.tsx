'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  User,
  FileText,
  Info,
  Shield,
  Zap,
  Save,
  Check,
  Users,
  TrendingUp,
  Target,
  GripVertical,
  Phone,
  Mail,
  Globe,
  Briefcase as BriefcaseIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  CalendarDays,
  BarChart3,
  Award,
  TrendingDown,
  Activity,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Copy,
  AlertTriangle,
  Download,
  Link,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useSession } from 'next-auth/react';
import { IJobApplication } from '@/models/JobApplication';
import PageHeader from './PageHeader';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useJourneyLinking } from '@/lib/services/journeyLinkingService';

interface Job extends Omit<IJobApplication, '_id' | 'userId'> {
  id: string;
  userId: string;
  // cvId removed - relationships now managed through CVJourney
  stageDates?: {
    created?: Date;
    applied?: Date;
    interview?: Date;
    offer?: Date;
    rejected?: Date;
  };
}

interface SortableJobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onView: (job: Job) => void;
  onDuplicate: (job: Job) => void;
  onStageChange: (jobId: string, newStage: string) => void;
  isCompact?: boolean;
}

// Stage progression helper
const getNextStage = (currentStage: string): string | null => {
  const stageOrder = ['created', 'applied', 'interview', 'offer', 'rejected'];
  const currentIndex = stageOrder.indexOf(currentStage);
  return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : null;
};

const getStageDate = (job: Job, stage: string): Date | null => {
  if (!job.stageDates) return null;
  return job.stageDates[stage as keyof typeof job.stageDates] || null;
};

// KPI Widget Component
const KPIWidget: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; change?: string }> = ({ 
  title, 
  value, 
  icon, 
  color, 
  change 
}) => (
  <motion.div 
    className={`frosted-glass-card p-4 rounded-xl ${color}`}
    whileHover={{ y: -2, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 dark:text-white/60 text-xs font-medium">{title}</p>
        <p className="text-gray-900 dark:text-white text-2xl font-bold">{value}</p>
        {change && (
          <p className="text-gray-600 dark:text-white/60 text-xs mt-1">{change}</p>
        )}
      </div>
      <div className="text-gray-500 dark:text-white/40">
        {icon}
      </div>
    </div>
  </motion.div>
);

// Enhanced SortableJobCard with stage progression
const SortableJobCard: React.FC<SortableJobCardProps> = ({ 
  job, 
  onEdit, 
  onDelete, 
  onView, 
  onDuplicate,
  onStageChange,
  isCompact = false 
}) => {
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

  const nextStage = getNextStage(job.status || 'created');
  const stageDate = getStageDate(job, job.status || 'created');

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`relative frosted-glass-card rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-200 flex flex-col ${
        isDragging ? 'opacity-80 rotate-1 scale-110 shadow-2xl' : ''
      } ${
        isCompact 
          ? 'p-3 mb-3 h-48' 
          : 'p-4 mb-4 h-64'
      }`}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Only trigger view if not clicking on action buttons
        if (!(e.target as HTMLElement).closest('button')) {
          console.log('🔍 Pipeline - Navigating to journey page instead of modal');
          // Navigate directly to CV journey page instead of opening modal
          window.location.href = `/dashboard/cv-journey?jobId=${job.id}`;
        }
      }}
    >
      {/* Drag Handle */}
      <div 
        className={`absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors cursor-move ${isCompact ? 'top-1 right-1' : ''}`}
      >
        <GripVertical size={isCompact ? 14 : 16} />
      </div>

      {/* Priority and Status Badges - Side by side */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
          <div className="w-2 h-2 rounded-full bg-current"></div>
          {job.priority || 'medium'}
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
          {getStatusIcon(job.status)}
          {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Unknown'}
        </div>
      </div>

      {/* Job Title */}
      <h3 className={`text-white font-semibold line-clamp-2 mb-2 break-words ${isCompact ? 'text-sm' : 'text-base'}`}>{job.jobTitle || 'Untitled Job'}</h3>

      {/* Company */}
      <div className="flex items-center gap-2 mb-1">
        <Building size={isCompact ? 12 : 14} className="text-white/60" />
        <span className={`text-white/80 ${isCompact ? 'text-xs' : 'text-sm'} truncate`}>{job.company || 'Unknown Company'}</span>
      </div>

      {/* Location - Only show in compact mode if it's short */}
      {job.location && (!isCompact || job.location.length < 20) && (
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={isCompact ? 12 : 14} className="text-white/60" />
          <span className={`text-white/60 ${isCompact ? 'text-xs' : 'text-sm'} truncate`}>{job.location}</span>
        </div>
      )}

      {/* Salary - Only show in normal mode */}
      {!isCompact && formatSalary(job.salary) && (
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={14} className="text-white/60" />
          <span className="text-white/60 text-xs truncate">{formatSalary(job.salary)}</span>
        </div>
      )}

      {/* Stage Date and Deadline - Combined to save space */}
      <div className="space-y-1 mb-2">
        {stageDate && (
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-white/60" />
            <span className="text-white/60 text-xs">
              {job.status?.charAt(0).toUpperCase() + job.status?.slice(1)}: {stageDate.toLocaleDateString()}
            </span>
          </div>
        )}
        {job.deadline && (
          <div className="flex items-center gap-2">
            <CalendarDays size={12} className="text-white/60" />
            <span className="text-white/60 text-xs">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
          </div>
        )}
        {/* Show deadline for created stage jobs even if no stage date */}
        {job.status === 'created' && job.deadline && !stageDate && (
          <div className="flex items-center gap-2">
            <CalendarDays size={12} className="text-white/60" />
            <span className="text-white/60 text-xs">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Tags - Only show in normal mode, limited to 2 */}
      {!isCompact && job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {job.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full truncate max-w-20"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 2 && (
            <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full">
              +{job.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={`flex items-center justify-between pt-2 border-t border-white/10 mt-auto ${isCompact ? 'pt-1' : 'pt-2'}`}>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={(e) => {
              console.log('🔍 Pipeline - View button clicked for job:', job.id);
              e.stopPropagation();
              onView(job);
            }}
            className={`text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors ${isCompact ? 'p-2' : 'p-2'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Info size={isCompact ? 14 : 16} />
          </motion.button>
          <motion.button
            onClick={(e) => {
              console.log('🔍 Pipeline - Edit button clicked for job:', job.id);
              e.stopPropagation();
              onEdit(job);
            }}
            className={`text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors ${isCompact ? 'p-2' : 'p-2'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Edit size={isCompact ? 14 : 16} />
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(job);
            }}
            className={`text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors ${isCompact ? 'p-2' : 'p-2'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Copy size={isCompact ? 14 : 16} />
          </motion.button>
        </div>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(job.id);
          }}
          className={`text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors ${isCompact ? 'p-2' : 'p-2'}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 size={isCompact ? 14 : 16} />
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
        isOver ? 'frosted-glass-widget border-2 border-dashed border-gray-200 dark:border-white/20 rounded-lg' : ''
      }`}
    >
      {children}
    </div>
  );
};

// Job Details Modal Component
const JobDetailsModal: React.FC<{
  job: Job | null;
  userCVs: any[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onDuplicate: (job: Job) => void;
  onCVUpdate: (jobId: string, cvId: string) => void; // Will be updated to use journey
}> = ({ job, userCVs, isOpen, onClose, onEdit, onDelete, onDuplicate, onCVUpdate }) => {
  console.log('🔍 JobDetailsModal - Rendering with:', { job: job?.id, isOpen, userCVs: userCVs?.length });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!job) return null;

  // linkedCV removed - relationships now managed through CVJourney
  const stageDate = getStageDate(job, job.status || 'created');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-[1500px] max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="text-white">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{job.jobTitle || 'Untitled Job'}</h2>
                  <p className="text-white/60 text-lg">{job.company || 'Unknown Company'}</p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Job Details */}
                                  <div className="xl:col-span-2 space-y-6">
                  {/* Status and Progress - Horizontal Timeline */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Application Progress</h3>
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10"></div>
                      
                      <div className="flex justify-between items-center relative">
                        {['created', 'applied', 'interview', 'offer', 'rejected'].map((stage, index) => {
                          const isActive = job.status === stage;
                          const isCompleted = ['created', 'applied', 'interview', 'offer'].indexOf(job.status || 'created') >= index;
                          const stageDate = getStageDate(job, stage);
                          
                          return (
                            <div key={stage} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10 ${
                                isActive ? 'bg-lime-500 text-black' :
                                isCompleted ? 'bg-green-500 text-white' :
                                'bg-white/10 text-white/40'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="text-center mt-2">
                                <div className={`text-xs font-medium ${isActive ? 'text-lime-400' : 'text-white/60'}`}>
                                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                                </div>
                                {stageDate && (
                                  <div className="text-xs text-white/40 mt-1">
                                    {stageDate.toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white/60 text-sm">Location</label>
                        <p className="text-white">{job.location || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-white/60 text-sm">Priority</label>
                        <p className="text-white capitalize">{job.priority || 'medium'}</p>
                      </div>
                      <div>
                        <label className="text-white/60 text-sm">Application Date</label>
                        <p className="text-white">
                          {job.applicationDate ? new Date(job.applicationDate).toLocaleDateString() : 'Not applied yet'}
                        </p>
                      </div>
                      <div>
                        <label className="text-white/60 text-sm">Deadline</label>
                        <p className="text-white">
                          {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'No deadline'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Job Description</h3>
                    {job.jobDescription ? (
                      <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {job.jobDescription}
                      </div>
                    ) : (
                      <p className="text-white/60 text-sm italic">No job description available</p>
                    )}
                  </div>

                  {/* Notes */}
                  {job.notes && (
                    <div className="frosted-glass-widget rounded-xl p-4">
                      <h3 className="text-lg font-semibold mb-4">Notes</h3>
                      <p className="text-white/80 text-sm leading-relaxed">{job.notes}</p>
                    </div>
                  )}
                </div>

                {/* Sidebar - CV and Cover Letter */}
                <div className="space-y-6">
                  {/* Linked CV */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Linked CV</h3>
                    <div className="space-y-3">
                      {/* CV Selection removed - relationships now managed through CVJourney */}

                      {/* Current CV Display removed - relationships now managed through CVJourney */}
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Cover Letter</h3>
                    <div className="text-center py-8">
                      <MessageSquare size={48} className="text-white/20 mx-auto mb-3" />
                      <p className="text-white/60 text-sm mb-3">No cover letter created yet</p>
                      <motion.button
                        className="px-4 py-2 bg-lime-500 text-black text-sm font-medium rounded-lg hover:bg-lime-400 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create Cover Letter
                      </motion.button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="frosted-glass-widget rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <motion.button
                        onClick={() => {
                          console.log('🔍 Pipeline - Edit job clicked for:', job.id);
                          onClose();
                          onEdit(job);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit size={20} className="mb-1" />
                        <span className="text-xs">Edit</span>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          console.log('🔍 Pipeline - Duplicate job clicked for:', job.id);
                          onDuplicate(job);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Copy size={20} className="mb-1" />
                        <span className="text-xs">Duplicate</span>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          console.log('🔍 Pipeline - Delete job clicked for:', job.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Trash2 size={20} className="mb-1" />
                        <span className="text-xs">Delete</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-[1500px]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-white text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Delete Job</h3>
                <p className="text-white/60 mb-6">
                  Are you sure you want to delete "{job?.jobTitle}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      console.log('🔍 Pipeline - Confirmed deletion for job:', job?.id);
                      onDelete(job?.id || '');
                      setShowDeleteConfirm(false);
                      onClose();
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

const Pipeline: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userCVs, setUserCVs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // New state for updated features
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Auto-save and form state management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<any>(null);

  // Job Journey removed - navigate directly to journey page

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 200, // Add delay to distinguish between click and drag
      },
    }),
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

  // Character counter functionality for enhanced modal
  useEffect(() => {
    const updateCharacterCounts = () => {
      const jobTitleInput = document.getElementById('jobTitle') as HTMLInputElement;
      const companyInput = document.getElementById('company') as HTMLInputElement;
      const jobDescriptionInput = document.getElementById('jobDescription') as HTMLTextAreaElement;
      const notesInput = document.getElementById('notes') as HTMLTextAreaElement;

      if (jobTitleInput) {
        const count = jobTitleInput.value.length;
        const countElement = document.getElementById('jobTitleCount');
        if (countElement) countElement.textContent = count.toString();
      }

      if (companyInput) {
        const count = companyInput.value.length;
        const countElement = document.getElementById('companyCount');
        if (countElement) countElement.textContent = count.toString();
      }

      if (jobDescriptionInput) {
        const count = jobDescriptionInput.value.length;
        const countElement = document.getElementById('jobDescriptionCount');
        if (countElement) countElement.textContent = count.toString();
      }

      if (notesInput) {
        const count = notesInput.value.length;
        const countElement = document.getElementById('notesCount');
        if (countElement) countElement.textContent = count.toString();
      }
    };

    // Add event listeners when modal is open
    if (showJobModal) {
      const inputs = ['jobTitle', 'company', 'jobDescription', 'notes'];
      inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', updateCharacterCounts);
        }
      });

      // Initial count update
      updateCharacterCounts();

      // Cleanup function
      return () => {
        inputs.forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.removeEventListener('input', updateCharacterCounts);
          }
        });
      };
    }
  }, [showJobModal]);

  // Auto-save functionality
  useEffect(() => {
    const setupAutoSave = () => {
      if (!showJobModal || !editingJob) return;

      const formInputs = [
        'jobTitle', 'company', 'location', 'jobUrl', 'jobDescription',
        'priority', 'status', 'deadline', 'applicationDate', 'sponsorship',
        'salaryMin', 'salaryMax', 'salaryCurrency', 'salaryPeriod', 'tags', 'notes'
      ];

      const handleFormChange = () => {
        setHasUnsavedChanges(true);
        
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save (5 seconds after last change)
        autoSaveTimeoutRef.current = setTimeout(() => {
          const formData = getFormData();
          if (formData && JSON.stringify(formData) !== JSON.stringify(lastSavedDataRef.current)) {
            console.log('🔄 Auto-saving job data...');
            handleSaveJob(formData, true); // true indicates auto-save
          }
        }, 5000);
      };

      // Add event listeners to all form inputs
      formInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', handleFormChange);
          input.addEventListener('change', handleFormChange);
        }
      });

      // Cleanup function
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        formInputs.forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.removeEventListener('input', handleFormChange);
            input.removeEventListener('change', handleFormChange);
          }
        });
      };
    };

    setupAutoSave();
  }, [showJobModal, editingJob]);

  // Helper function to get form data
  const getFormData = () => {
    const deadlineValue = (document.getElementById('deadline') as HTMLInputElement)?.value;
    const applicationDateValue = (document.getElementById('applicationDate') as HTMLInputElement)?.value;
    const jobTitle = (document.getElementById('jobTitle') as HTMLInputElement)?.value?.trim();
    const company = (document.getElementById('company') as HTMLInputElement)?.value?.trim();
    const tagsValue = (document.getElementById('tags') as HTMLInputElement)?.value?.trim();

    return {
      jobTitle,
      company,
      location: (document.getElementById('location') as HTMLInputElement)?.value?.trim(),
      jobUrl: (document.getElementById('jobUrl') as HTMLInputElement)?.value?.trim(),
      jobDescription: (document.getElementById('jobDescription') as HTMLTextAreaElement)?.value?.trim(),
      sponsorship: (document.getElementById('sponsorship') as HTMLSelectElement)?.value as 'yes' | 'no' | 'unknown',
      priority: (document.getElementById('priority') as HTMLSelectElement)?.value as 'low' | 'medium' | 'high',
      status: (document.getElementById('status') as HTMLSelectElement)?.value as Job['status'],
      deadline: deadlineValue ? new Date(deadlineValue) : undefined,
      applicationDate: applicationDateValue ? new Date(applicationDateValue) : undefined,
      notes: (document.getElementById('notes') as HTMLTextAreaElement)?.value?.trim(),
      tags: tagsValue ? tagsValue.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      salary: {
        min: (document.getElementById('salaryMin') as HTMLInputElement)?.value ? parseInt((document.getElementById('salaryMin') as HTMLInputElement).value) : undefined,
        max: (document.getElementById('salaryMax') as HTMLInputElement)?.value ? parseInt((document.getElementById('salaryMax') as HTMLInputElement).value) : undefined,
        currency: (document.getElementById('salaryCurrency') as HTMLSelectElement)?.value || 'USD',
        period: (document.getElementById('salaryPeriod') as HTMLSelectElement)?.value as 'hourly' | 'monthly' | 'yearly' || 'yearly'
      }
    };
  };

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
      console.log('🔍 Pipeline - Loading jobs for user:', userId);
      const response = await authenticatedFetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      console.log('🔍 Pipeline - Jobs API response:', result);
      
      if (result.success) {
        // The API returns data.jobs, not just data
        const jobsData = Array.isArray(result.data?.jobs) ? result.data.jobs : [];
        console.log('🔍 Pipeline - Jobs data received:', jobsData);
        
        // Transform the data to match the expected format
        const transformedJobs = jobsData.map((job: any) => {
          // Ensure status is a valid enum value
          let validStatus = job.status || 'created';
          if (typeof validStatus === 'string' && !['created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'].includes(validStatus)) {
            validStatus = 'created';
          }
          
          // Ensure applicationDate is set for non-created statuses
          let applicationDate = job.applicationDate ? new Date(job.applicationDate) : null;
          if (validStatus !== 'created' && !applicationDate) {
            applicationDate = new Date(); // Set current date for non-created statuses
          }
          
          return {
            ...job,
            id: job.id || job._id, // Ensure id is always present
            status: validStatus, // Ensure status is a valid string
            tags: job.tags || [], // Ensure tags is always an array
            stageDates: job.stageDates || {}, // Initialize stage dates
            applicationDate: applicationDate,
            deadline: job.deadline ? new Date(job.deadline) : null,
            createdAt: job.createdAt ? new Date(job.createdAt) : null,
            updatedAt: job.updatedAt ? new Date(job.updatedAt) : null,
          };
        });
        
        console.log('🔍 Pipeline - Transformed jobs:', transformedJobs);
        setJobs(transformedJobs);
      } else {
        console.error('🔍 Pipeline - Jobs API returned success: false');
        setJobs([]);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCVs = async (userId: string) => {
    try {
      console.log('🔍 Pipeline - Loading CVs for user:', userId);
      const response = await fetch(`/api/cvs?userId=${userId}`);
      const result = await response.json();
      console.log('🔍 Pipeline - CV API response:', result);
      
      if (result.success) {
        const cvData = result.data.cvs || result.data.data || [];
        console.log('🔍 Pipeline - CV data received:', cvData);
        
        // Calculate completion percentage for each CV
        const enrichedCVs = cvData.map((cv: any) => {
          const completionPercentage = calculateCVCompletionPercentage(cv);
          return {
            ...cv,
            completionPercentage
          };
        });
        
        console.log('🔍 Pipeline - Enriched CVs with completion:', enrichedCVs);
        setUserCVs(enrichedCVs);
      } else {
        console.error('🔍 Pipeline - CV API returned success: false');
        setUserCVs([]);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      setUserCVs([]);
    }
  };

  const calculateCVCompletionPercentage = (cv: any): number => {
    // If CV is published, it's considered complete
    if (cv.status === 'published') return 100;
    
    // If CV is archived, return 0
    if (cv.status === 'archived') return 0;
    
    // Calculate completion based on CV sections
    let totalScore = 0;
    let maxScore = 0;
    
    // Section weights (total = 100)
    const sectionWeights = {
      personalInfo: 25,    // Name, email, phone, location, summary
      experience: 30,      // Work experience entries
      education: 20,       // Education entries
      skills: 15,          // Skills and competencies
      projects: 10         // Projects and achievements
    };
    
    // Check personal info section
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;
    
    // Check experience section
    if (cv.cvData?.work) {
      const experienceScore = calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;
    
    // Check education section
    if (cv.cvData?.education) {
      const educationScore = calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;
    
    // Check skills section
    if (cv.cvData?.skills) {
      const skillsScore = calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;
    
    // Check projects section
    if (cv.cvData?.projects) {
      const projectsScore = calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;
    
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  };

  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    if (basics.name?.trim()) score += 20;
    if (basics.email?.trim()) score += 20;
    if (basics.phone?.trim()) score += 20;
    if (basics.summary?.trim()) score += 20;
    if (basics.location?.city?.trim()) score += 20;
    return score;
  };

  const calculateExperienceScore = (work: any[]): number => {
    if (!work || work.length === 0) return 0;
    let score = 0;
    work.forEach((job, index) => {
      if (job.position?.trim()) score += 30;
      if (job.name?.trim()) score += 30;
      if (job.summary?.trim()) score += 40;
    });
    return Math.min(score, 100);
  };

  const calculateEducationScore = (education: any[]): number => {
    if (!education || education.length === 0) return 0;
    let score = 0;
    education.forEach((edu, index) => {
      if (edu.institution?.trim()) score += 50;
      if (edu.area?.trim()) score += 50;
    });
    return Math.min(score, 100);
  };

  const calculateSkillsScore = (skills: any[]): number => {
    if (!skills || skills.length === 0) return 0;
    return Math.min(skills.length * 20, 100);
  };

  const calculateProjectsScore = (projects: any[]): number => {
    if (!projects || projects.length === 0) return 0;
    let score = 0;
    projects.forEach((project, index) => {
      if (project.name?.trim()) score += 50;
      if (project.description?.trim()) score += 50;
    });
    return Math.min(score, 100);
  };

  // Enhanced drag and drop with haptic feedback
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🔍 Pipeline - Drag start:', event.active.id);
    setActiveId(event.active.id as string);
    
    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
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
        // Optimistically update the UI first for smooth animation
        const currentDate = new Date();
        const updatedStageDates = {
          ...activeJob.stageDates,
          [newStatus]: currentDate
        };

        const updatedJob: Job = {
          ...activeJob,
          status: newStatus,
          stageDates: updatedStageDates,
          applicationDate: newStatus === 'applied' ? currentDate : 
                         newStatus === 'created' ? new Date() : activeJob.applicationDate,
        };

        // Update UI immediately for smooth transition
        setJobs(prevJobs => prevJobs.map(job => 
          job.id === active.id ? updatedJob : job
        ));

        try {
          console.log('🔍 Pipeline - Updating job via drag-and-drop:', {
            jobId: activeJob.id,
            newStatus,
            updatedJob
          });

          const response = await authenticatedFetch('/api/jobs', {
            method: 'PUT',
            body: JSON.stringify({
              ...updatedJob,
              id: activeJob.id
            })
          });

          console.log('🔍 Pipeline - Update response status:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('🔍 Pipeline - Update response:', result);
            
            if (result.success) {
              console.log('✅ Pipeline - Job updated successfully:', result.data);
              
              // Haptic feedback for successful update
              if (navigator.vibrate) {
                navigator.vibrate([50, 50, 50]);
              }
              
              // Update with server response data
              setJobs(prevJobs => prevJobs.map(job => 
                job.id === active.id ? { ...job, ...result.data, id: result.data.id || job.id } : job
              ));
            } else {
              console.error('❌ Pipeline - Failed to update job:', result);
              // Revert optimistic update on failure
              setJobs(prevJobs => prevJobs.map(job => 
                job.id === active.id ? activeJob : job
              ));
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Pipeline - HTTP error updating job:', response.status);
            console.error('❌ Pipeline - Error response:', errorText);
            
            // Revert optimistic update on failure
            setJobs(prevJobs => prevJobs.map(job => 
              job.id === active.id ? activeJob : job
            ));
            
            try {
              const errorJson = JSON.parse(errorText);
              console.error('❌ Pipeline - Error details:', errorJson);
            } catch {
              console.error('❌ Pipeline - Non-JSON error response');
            }
          }
        } catch (error) {
          console.error('❌ Pipeline - Error updating job status:', error);
          // Revert optimistic update on error
          setJobs(prevJobs => prevJobs.map(job => 
            job.id === active.id ? activeJob : job
          ));
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
      const response = await authenticatedFetch(`/api/jobs?id=${jobId}`, {
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
    console.log('🔍 Pipeline - handleView called with job:', job);
    console.log('🔍 Pipeline - Setting selectedJob and showJobDetails to true');
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const handleDuplicate = (job: Job) => {
    const duplicateWarning = confirm(
      'Are you sure you want to duplicate this job? This will create a copy with the same details but you can modify it separately.'
    );
    
    if (duplicateWarning) {
      const duplicatedJob: Job = {
        ...job,
        id: uuidv4(),
        status: 'created' as const,
        stageDates: {
          created: new Date()
        },
        applicationDate: new Date(), // Set to current date for created status
        createdAt: new Date(),
        updatedAt: new Date(),
        jobTitle: `${job.jobTitle} (Copy)`,
      };
      
      setEditingJob(duplicatedJob);
      setShowJobModal(true);
    }
  };

  const handleCVUpdate = async (jobId: string, cvId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      // Use centralized journey linking service
      const { linkJobToCV } = useJourneyLinking();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('❌ Pipeline - No user ID available');
        return;
      }

      const result = await linkJobToCV({
        jobId,
        cvId,
        userId,
        journeyName: `Application for ${job.jobTitle} at ${job.company}`
      });

      if (result.success) {
        console.log('✅ Pipeline - Job linked to CV via journey system:', result);
        // Note: cvId removed from Job interface - relationships now managed through CVJourney
        // Update selectedJob if it's the one being modified
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob({ ...selectedJob });
        }
      } else {
        console.error('❌ Pipeline - Failed to link job to CV:', result.message);
        alert(`Failed to link CV to job: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Pipeline - Error linking job to CV:', error);
      alert('Failed to link CV to job. Please try again.');
    }
  };

  const handleStageChange = async (jobId: string, newStage: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Ensure newStage is a valid enum value
    const validStages = ['created', 'applied', 'interview', 'offer', 'rejected'];
    if (!validStages.includes(newStage)) {
      console.error('Invalid stage:', newStage);
      return;
    }

    const currentDate = new Date();
    const updatedStageDates = {
      ...job.stageDates,
      [newStage]: currentDate
    };

    const updatedJob = {
      ...job,
      status: newStage as Job['status'],
      stageDates: updatedStageDates,
      applicationDate: newStage === 'applied' ? currentDate : job.applicationDate,
    };

    try {
      const response = await authenticatedFetch('/api/jobs', {
        method: 'PUT',
        body: JSON.stringify({
          ...updatedJob,
          id: jobId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setJobs(jobs.map(j => j.id === jobId ? { ...j, ...result.data } : j));
        }
      }
    } catch (error) {
      console.error('Error updating job stage:', error);
    }
  };

  const handleSaveJob = async (jobData: Partial<Job>, isAutoSave: boolean = false) => {
    if (!editingJob) return;
    
    if (!isAutoSave) {
      setIsSaving(true);
    }
    
    try {
      // Get user ID from session
      const userId = session?.user?.id || user?.id;
      if (!userId) {
        console.error('No user ID available for job save');
        alert('Authentication error. Please log in again.');
        return;
      }

      const jobToSave = {
        ...editingJob,
        ...jobData,
        userId,
        // cvId removed - relationships now managed through CVJourney
        applicationDate: jobData.status === 'applied' ? new Date() : 
                       jobData.status === 'created' ? undefined : editingJob.applicationDate,
        interviews: jobData.interviews || [],
        followUps: jobData.followUps || [],
        attachments: jobData.attachments || [],
        isArchived: jobData.isArchived || false,
        // Ensure status is a valid enum value
        status: (jobData.status && ['created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'].includes(jobData.status)) ? jobData.status : 'created',
      };

      const method = editingJob.id && jobs.some(job => job.id === editingJob.id) ? 'PUT' : 'POST';
      const url = method === 'PUT' ? `/api/jobs` : '/api/jobs';
      const body = method === 'PUT' ? { ...jobToSave, id: editingJob.id } : jobToSave;

      console.log('🔍 Pipeline - Saving job:', { method, url, body });
      console.log('🔍 Pipeline - Job data being sent:', JSON.stringify(body, null, 2));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('🔍 Pipeline - Save response status:', response.status);
      console.log('🔍 Pipeline - Save response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Pipeline - Save response success:', result);
        
        if (result.success) {
          const savedJob = { ...result.data, id: result.data.id || result.data._id || editingJob.id };
          
          if (method === 'PUT') {
            // Update existing job
            setJobs(jobs.map(job => job.id === editingJob.id ? savedJob : job));
          } else {
            // Add new job
            setJobs([...jobs, savedJob]);
          }
          
          // Update auto-save state
          lastSavedDataRef.current = jobData;
          setHasUnsavedChanges(false);
          
          if (!isAutoSave) {
            // Close modal and reset state only for manual saves
            setShowJobModal(false);
            setEditingJob(null);
            
            // Show success message
            alert('Job saved successfully!');
          } else {
            console.log('✅ Auto-save completed successfully');
          }
        } else {
          console.error('API returned success: false:', result);
          alert(`Failed to save job: ${result.message || 'Unknown error'}`);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Pipeline - Save failed with status:', response.status);
        console.error('❌ Pipeline - Error response text:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Pipeline - Error response JSON:', errorJson);
          alert(`Failed to save job: ${errorJson.message || 'Unknown error'}`);
        } catch {
          alert(`Failed to save job. Status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job. Please try again.');
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
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
      // cvId removed - relationships now managed through CVJourney
    };
    setEditingJob(newJob as Job);
    setShowJobModal(true);
  };

  const handleParseJobUrl = async () => {
    const urlInput = document.getElementById('jobUrlParser') as HTMLInputElement;
    const url = urlInput?.value?.trim();
    
    if (!url) {
      alert('Please enter a job URL to parse');
      return;
    }

    try {
      console.log('🔍 Pipeline - Parsing job URL:', url);
      
      const response = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const parsedData = result.data;
          
          // Update form fields with parsed data
          const jobTitleInput = document.getElementById('jobTitle') as HTMLInputElement;
          const companyInput = document.getElementById('company') as HTMLInputElement;
          const locationInput = document.getElementById('location') as HTMLInputElement;
          const jobUrlInput = document.getElementById('jobUrl') as HTMLInputElement;
          const jobDescriptionInput = document.getElementById('jobDescription') as HTMLTextAreaElement;
          const sponsorshipSelect = document.getElementById('sponsorship') as HTMLSelectElement;
          
          if (jobTitleInput && parsedData.title) jobTitleInput.value = parsedData.title;
          if (companyInput && parsedData.company) companyInput.value = parsedData.company;
          if (locationInput && parsedData.location) locationInput.value = parsedData.location;
          if (jobUrlInput && parsedData.sourceUrl) jobUrlInput.value = parsedData.sourceUrl;
          if (jobDescriptionInput && parsedData.description) jobDescriptionInput.value = parsedData.description;
          if (sponsorshipSelect && parsedData.sponsorship !== undefined) {
            sponsorshipSelect.value = parsedData.sponsorship ? 'yes' : 'no';
          }
          
          // Clear the parser input
          if (urlInput) urlInput.value = '';
          
          alert('Job details parsed successfully! Please review and save.');
        } else {
          alert(`Failed to parse job: ${result.message}`);
        }
      } else {
        alert('Failed to parse job URL. Please try again or enter details manually.');
      }
    } catch (error) {
      console.error('Error parsing job URL:', error);
      alert('Error parsing job URL. Please enter details manually.');
    }
  };



  // Calculate KPI metrics for the new period-based system
  const calculateKPIs = () => {
    // Filter jobs by priority if not "all"
    const priorityJobs = selectedPriority === 'all' 
      ? jobs 
      : jobs.filter(job => job.priority === selectedPriority);

    return {
      totalJobs: priorityJobs.length,
      created: priorityJobs.filter(job => job.status === 'created').length,
      applied: priorityJobs.filter(job => job.status === 'applied').length,
      interviews: priorityJobs.filter(job => job.status === 'interview').length,
      offers: priorityJobs.filter(job => job.status === 'offer').length
    };
  };

  const kpis = calculateKPIs();

  // Filter and sort jobs based on search, priority, and sort settings
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;
    
    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(job => job.priority === selectedPriority);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.company?.toLowerCase().includes(query) ||
        job.jobTitle?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        (job.tags && job.tags.some(tag => tag.toLowerCase().includes(query))) ||
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
  }, [jobs, searchQuery, sortDirection, selectedPriority]);

  const getJobsByStatus = (status: Job['status']) => {
    return filteredAndSortedJobs.filter(job => job.status === status);
  };

  if (status === 'loading' || isLoading) {
      return (
    <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-48 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
            <div className="h-4 w-96 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <div className="h-10 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="p-4 frosted-glass-widget rounded-xl">
          <div className="h-10 w-full bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Kanban Board Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, stageIndex) => (
            <div key={stageIndex} className="flex flex-col">
              {/* Stage Header Skeleton */}
              <div className="frosted-glass-widget rounded-xl p-4 mb-4">
                <div className="h-6 w-24 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
              </div>
              
              {/* Job Cards Skeleton */}
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="frosted-glass-card rounded-xl p-4 h-48">
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                      <div className="h-3 w-1/2 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                      <div className="h-3 w-2/3 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Job Tracker"
        description="Track applications and manage career progress"
        user={{
          name: session?.user?.name || 'User',
          email: session?.user?.email || 'user@example.com'
        }}
        showSettings={true}
      />

      {/* Controls Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 frosted-glass-widget rounded-xl">
        {/* Search and Period */}
        <div className="flex-1 w-full space-y-3">
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
          
          {/* Priority Filter - Moved into search container */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Priority:</span>
            {[
              { key: 'all', label: 'All', color: 'bg-gray-400/20 text-gray-400 border-gray-400/30' },
              { key: 'high', label: 'High', color: 'bg-red-400/20 text-red-400 border-red-400/30' },
              { key: 'medium', label: 'Medium', color: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' },
              { key: 'low', label: 'Low', color: 'bg-green-400/20 text-green-400 border-green-400/30' }
            ].map((priority) => (
              <motion.button
                key={priority.key}
                onClick={() => {
                  console.log('🔍 Pipeline - Priority filter clicked:', priority.key);
                  setSelectedPriority(priority.key as 'all' | 'high' | 'medium' | 'low');
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 border ${
                  selectedPriority === priority.key
                    ? priority.color
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {priority.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Add Job, Sort and View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          {/* Add Job Button */}
          <motion.button
            onClick={handleAddJob}
            className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-medium rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            Add Job
          </motion.button>

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

      {/* Kanban Board or List View */}
      {viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                    <AnimatePresence mode="wait">
                      {getJobsByStatus(stage.id as Job['status']).map((job) => {
                        const jobsInStage = getJobsByStatus(stage.id as Job['status']);
                        const isCompact = jobsInStage.length > 4;
                        
                        return (
                          <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ 
                              duration: 0.3,
                              ease: "easeInOut"
                            }}
                            layout
                          >
                            <SortableJobCard
                              job={job}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onView={handleView}
                              onDuplicate={handleDuplicate}
                              onStageChange={handleStageChange}
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

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <motion.div 
                className="shadow-2xl backdrop-blur-sm"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SortableJobCard
                  job={jobs.find(job => job.id === activeId)!}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onView={() => {}}
                  onDuplicate={() => {}}
                  onStageChange={() => {}}
                  isCompact={false}
                />
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <div className="frosted-glass-widget rounded-xl overflow-hidden">
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
                    className="border-b border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobDetails(true);
                    }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <td className="px-4 py-3 text-white font-medium">{job.company || 'Unknown Company'}</td>
                    <td className="px-4 py-3 text-white/80">{job.jobTitle || 'Untitled Job'}</td>
                    <td className="px-4 py-3">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStage = getNextStage(job.status || 'created');
                          if (nextStage) {
                            handleStageChange(job.id, nextStage);
                          }
                        }}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:scale-105 transition-all ${
                          job.status === 'created' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' :
                          job.status === 'applied' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' :
                          job.status === 'interview' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' :
                          job.status === 'offer' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' :
                          'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                        disabled={!getNextStage(job.status || 'created')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Unknown'}
                        {getNextStage(job.status || 'created') && (
                          <ArrowRight size={10} className="ml-1" />
                        )}
                      </motion.button>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {job.status === 'created' ? (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-') :
                       job.status === 'applied' ? (job.applicationDate || job.createdAt ? new Date(job.applicationDate || job.createdAt).toLocaleDateString() : '-') :
                       job.status === 'interview' ? (job.interviews?.[0]?.date || job.applicationDate || job.createdAt ? new Date(job.interviews?.[0]?.date || job.applicationDate || job.createdAt).toLocaleDateString() : '-') :
                       (job.updatedAt || job.createdAt ? new Date(job.updatedAt || job.createdAt).toLocaleDateString() : '-')}
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
                            setSelectedJob(job);
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

      {/* Enhanced Job Modal */}
      <AnimatePresence>
        {showJobModal && (selectedJob || editingJob) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 w-full max-w-[1000px] max-h-[85vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-white">
                {/* Glassmorphism Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-lime-500/20 backdrop-blur-sm rounded-lg border border-lime-500/30">
                      <Briefcase size={16} className="text-lime-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingJob ? 'Add/Edit Job Application' : 'Job Details'}
                      </h2>
                      <p className="text-white/70 text-xs">
                        {editingJob ? 'Create or update your job application details' : 'View job application information'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Unsaved Changes Warning */}
                    {hasUnsavedChanges && editingJob && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-lg"
                      >
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                        <span className="text-orange-300 text-xs font-medium">Unsaved</span>
                      </motion.div>
                    )}
                    
                    {/* Auto-save indicator */}
                    {editingJob && (
                      <div className="flex items-center gap-1 text-white/50 text-xs">
                        <Shield size={10} />
                        <span>Auto-save</span>
                      </div>
                    )}
                    
                    <motion.button
                      onClick={() => {
                        if (hasUnsavedChanges && editingJob) {
                          const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
                          if (!confirmClose) return;
                        }
                        setShowJobModal(false);
                        setHasUnsavedChanges(false);
                        setEditingJob(null);
                      }}
                      className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>
                
                {/* Quick Job Import Section */}
                {editingJob && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 backdrop-blur-sm border border-lime-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink size={14} className="text-lime-400" />
                      <span className="text-lime-400 font-medium text-sm">Quick Job Import</span>
                      <div className="ml-auto px-1.5 py-0.5 bg-lime-500/20 backdrop-blur-sm rounded-full border border-lime-500/30">
                        <span className="text-lime-300 text-xs font-medium">AI</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        id="jobUrlParser"
                        placeholder="Paste job posting URL (LinkedIn, Indeed, Glassdoor, etc.)"
                        className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50"
                      />
                    <motion.button
                      onClick={handleParseJobUrl}
                      className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-black font-medium rounded-lg text-sm hover:from-lime-400 hover:to-lime-500 transition-all shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-1">
                        <Zap size={12} />
                        Parse
                      </div>
                    </motion.button>
                    </div>
                    <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                      <Shield size={10} />
                      Supports LinkedIn, Indeed, Glassdoor with AI parsing
                    </p>
                  </div>
                )}

                {/* Glassmorphism Form Layout */}
                <div className="space-y-4">
                  {/* Basic Information Section */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-1.5 mb-3">
                      <User size={14} className="text-lime-400" />
                      <h3 className="text-base font-semibold text-white">Basic Information</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium flex items-center gap-1">
                            Job Title <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="jobTitle"
                            defaultValue={editingJob?.jobTitle || selectedJob?.jobTitle}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50"
                            placeholder="e.g., Senior Frontend Developer"
                            maxLength={100}
                          />
                          <div className="text-xs text-lime-300 mt-1">
                            <span id="jobTitleCount">0</span>/100 characters
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium flex items-center gap-1">
                            Company <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="company"
                            defaultValue={editingJob?.company || selectedJob?.company}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50"
                            placeholder="e.g., TechCorp Inc."
                            maxLength={100}
                          />
                          <div className="text-xs text-lime-300 mt-1">
                            <span id="companyCount">0</span>/100 characters
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Location</label>
                          <input
                            type="text"
                            id="location"
                            defaultValue={editingJob?.location || selectedJob?.location}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50"
                            placeholder="e.g., San Francisco, CA (Remote/Hybrid)"
                            maxLength={100}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Job URL</label>
                          <input
                            type="url"
                            id="jobUrl"
                            defaultValue={editingJob?.jobUrl || selectedJob?.jobUrl}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50"
                            placeholder="https://company.com/careers/job"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Priority Level</label>
                          <select
                            id="priority"
                            defaultValue={editingJob?.priority || selectedJob?.priority || 'medium'}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                          >
                            <option value="low" className="bg-gray-800">🟢 Low</option>
                            <option value="medium" className="bg-gray-800">🟡 Medium</option>
                            <option value="high" className="bg-gray-800">🔴 High</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Status</label>
                          <select
                            id="status"
                            defaultValue={editingJob?.status || selectedJob?.status || 'created'}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                          >
                            <option value="created" className="bg-gray-800">📝 Created</option>
                            <option value="applied" className="bg-gray-800">📤 Applied</option>
                            <option value="screening" className="bg-gray-800">🔍 Screening</option>
                            <option value="interview" className="bg-gray-800">💼 Interview</option>
                            <option value="offer" className="bg-gray-800">🎉 Offer</option>
                            <option value="rejected" className="bg-gray-800">❌ Rejected</option>
                            <option value="accepted" className="bg-gray-800">✅ Accepted</option>
                            <option value="withdrawn" className="bg-gray-800">↩️ Withdrawn</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Application Date</label>
                          <input
                            type="date"
                            id="applicationDate"
                            defaultValue={editingJob?.applicationDate ? new Date(editingJob.applicationDate).toISOString().split('T')[0] : 
                                         selectedJob?.applicationDate ? new Date(selectedJob.applicationDate).toISOString().split('T')[0] : ''}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-xs mb-1.5 font-medium">Deadline</label>
                          <input
                            type="date"
                            id="deadline"
                            defaultValue={editingJob?.deadline ? new Date(editingJob.deadline).toISOString().split('T')[0] : 
                                         selectedJob?.deadline ? new Date(selectedJob.deadline).toISOString().split('T')[0] : ''}
                            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Salary Information Section */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-1.5 mb-3">
                      <DollarSign size={14} className="text-lime-400" />
                      <h3 className="text-base font-semibold text-white">Salary Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Min Salary</label>
                        <input
                          type="number"
                          id="salaryMin"
                          defaultValue={editingJob?.salary?.min || selectedJob?.salary?.min}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors placeholder-white/50"
                          placeholder="80000"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Max Salary</label>
                        <input
                          type="number"
                          id="salaryMax"
                          defaultValue={editingJob?.salary?.max || selectedJob?.salary?.max}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors placeholder-white/50"
                          placeholder="120000"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Currency</label>
                        <select
                          id="salaryCurrency"
                          defaultValue={editingJob?.salary?.currency || selectedJob?.salary?.currency || 'USD'}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                        >
                          <option value="USD" className="bg-gray-800">🇺🇸 USD</option>
                          <option value="EUR" className="bg-gray-800">🇪🇺 EUR</option>
                          <option value="GBP" className="bg-gray-800">🇬🇧 GBP</option>
                          <option value="CAD" className="bg-gray-800">🇨🇦 CAD</option>
                          <option value="AUD" className="bg-gray-800">🇦🇺 AUD</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Period</label>
                        <select
                          id="salaryPeriod"
                          defaultValue={editingJob?.salary?.period || selectedJob?.salary?.period || 'yearly'}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                        >
                          <option value="hourly" className="bg-gray-800">Per Hour</option>
                          <option value="monthly" className="bg-gray-800">Per Month</option>
                          <option value="yearly" className="bg-gray-800">Per Year</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Job Description Section */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-1.5 mb-3">
                      <FileText size={14} className="text-lime-400" />
                      <h3 className="text-base font-semibold text-white">Job Description</h3>
                    </div>
                    
                    <div>
                      <textarea
                        id="jobDescription"
                        defaultValue={editingJob?.jobDescription || selectedJob?.jobDescription}
                        className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50 resize-none"
                        placeholder="Paste or enter the job description here..."
                        rows={4}
                        maxLength={5000}
                      />
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-xs text-lime-300">
                          <span id="jobDescriptionCount">0</span>/5000 characters
                        </div>
                        <div className="text-xs text-white/50">
                          Rich text supported
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Info size={14} className="text-lime-400" />
                      <h3 className="text-base font-semibold text-white">Additional Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Visa Sponsorship</label>
                        <select
                          id="sponsorship"
                          defaultValue={editingJob?.sponsorship || selectedJob?.sponsorship || 'unknown'}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                        >
                          <option value="unknown" className="bg-gray-800">❓ Unknown</option>
                          <option value="yes" className="bg-gray-800">✅ Yes</option>
                          <option value="no" className="bg-gray-800">❌ No</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-xs mb-1.5 font-medium">Tags</label>
                        <input
                          type="text"
                          id="tags"
                          defaultValue={editingJob?.tags?.join(', ') || selectedJob?.tags?.join(', ')}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-white/40 focus:outline-none transition-colors placeholder-white/50"
                          placeholder="remote, startup, fintech"
                        />
                        <div className="text-xs text-lime-300 mt-1">
                          Comma separated tags
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-white/80 text-xs mb-1.5 font-medium">Notes</label>
                      <textarea
                        id="notes"
                        defaultValue={editingJob?.notes || selectedJob?.notes}
                        className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors placeholder-white/50 resize-none"
                        placeholder="Add any additional notes about this job application..."
                        rows={2}
                        maxLength={2000}
                      />
                      <div className="text-xs text-lime-300 mt-1">
                        <span id="notesCount">0</span>/2000 characters
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glassmorphism Action Buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs">
                    <Shield size={12} />
                    <span>Secure & encrypted</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => setShowJobModal(false)}
                      className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    
                    {editingJob && (
                      <motion.button
                        onClick={() => {
                          const formData = getFormData();
                          
                          // Enhanced validation
                          if (!formData.jobTitle) {
                            alert('Job Title is required');
                            return;
                          }
                          if (!formData.company) {
                            alert('Company is required');
                            return;
                          }
                          
                          console.log('🔍 Enhanced Job Form - Form data to save:', formData);
                          handleSaveJob(formData);
                        }}
                        disabled={isSaving}
                        className="px-6 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-black font-semibold rounded-lg disabled:opacity-50 text-sm hover:from-lime-400 hover:to-lime-500 transition-all shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-1.5">
                          {isSaving ? (
                            <>
                              <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Save Job
                            </>
                          )}
                        </div>
                      </motion.button>
                    )}
                    
                    {selectedJob && (
                      <motion.button
                        onClick={() => setShowJobModal(false)}
                        className="px-6 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-black font-semibold rounded-lg text-sm hover:from-lime-400 hover:to-lime-500 transition-all shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Check size={14} />
                          Close
                        </div>
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Details Modal */}
      <AnimatePresence>
        {showJobDetails && selectedJob && (
          <JobDetailsModal
            job={selectedJob}
            userCVs={userCVs}
            isOpen={showJobDetails}
            onClose={() => setShowJobDetails(false)}
            onEdit={(job) => {
              setEditingJob(job);
              setShowJobDetails(false);
              setShowJobModal(true);
            }}
            onDelete={(jobId) => {
              handleDelete(jobId);
            }}
            onDuplicate={(job) => {
              handleDuplicate(job);
            }}
            onCVUpdate={(jobId, cvId) => {
              handleCVUpdate(jobId, cvId);
            }}
          />
        )}
      </AnimatePresence>


    </div>
  );
};

export default Pipeline;
