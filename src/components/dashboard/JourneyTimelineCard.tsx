'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Trash2, 
  Play,
  Calendar,
  Building
} from 'lucide-react';

interface Journey {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  cvId?: string;
  coverLetterId?: string;
  _debug?: {
    linkedCVId?: string;
    linkedCVMetadata?: any;
    linkedCoverLetterId?: string;
    jobStatus?: string;
  };
}

interface JourneyTimelineCardProps {
  journey: Journey;
  onResume: (journey: Journey) => void;
  onDownload: (journey: Journey) => void;
  onDelete: (journeyId: string) => void;
  onShowDeleteConfirm: (journeyId: string) => void;
}

const JourneyTimelineCard: React.FC<JourneyTimelineCardProps> = ({
  journey,
  onResume,
  onDownload,
  onDelete,
  onShowDeleteConfirm
}) => {
  const steps = [
    { id: 1, label: 'Add Job', icon: Briefcase },
    { id: 2, label: 'Create CV', icon: FileText },
    { id: 3, label: 'ATS Score', icon: CheckCircle },
    { id: 4, label: 'Cover Letter', icon: FileText },
    { id: 5, label: 'Download', icon: Download }
  ];

  // Enhanced step status calculation using same logic as modal
  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: // Job Added
        return journey.jobTitle && journey.company ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        return journey.cvId ? 'completed' : 
               (journey.currentStep >= 2 ? 'active' : 'pending');
      
      case 3: // ATS Score Checked
        // Only completed if we have an ATS score AND CV is linked
        return (journey.atsScore !== undefined && journey.cvId) ? 'completed' :
               (journey.currentStep >= 3 && journey.cvId ? 'active' : 'pending');
      
      case 4: // Cover Letter Created
        // Only completed if cover letter is explicitly linked to this journey
        return (journey.coverLetterId && journey.coverLetterId.trim() !== '') ? 'completed' :
               (journey.currentStep >= 4 && journey.atsScore !== undefined ? 'active' : 'pending');
      
      case 5: // Download/Apply
        // Only completed if journey status is explicitly 'completed'
        return journey.status === 'completed' ? 'completed' :
               (journey.currentStep >= 5 && journey.coverLetterId ? 'active' : 'pending');
      
      default:
        return 'pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
      whileHover={{ y: -2, scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
              <Building className="h-4 w-4 text-lime-400" />
              <h3 className="text-base font-semibold text-white">{journey.jobTitle}</h3>
          </div>
          <p className="text-white/60 text-sm">{journey.company}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            journey.status === 'completed' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {journey.status === 'completed' ? 'Complete' : 'In Progress'}
          </div>
          
          {/* Action Button */}
          {journey.status === 'completed' ? (
            <motion.button
              onClick={() => onDownload(journey)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-colors text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Download Files"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Download</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => onResume(journey)}
              className="flex items-center gap-1 px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Resume Journey"
            >
              <Play className="h-3 w-3" />
              <span className="hidden sm:inline">Resume</span>
            </motion.button>
          )}
          
          <motion.button
            onClick={() => onShowDeleteConfirm(journey.id)}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete Journey"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mb-4">
        {/* Timeline Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step.id);
            const isCompleted = stepStatus === 'completed';
            const isCurrent = stepStatus === 'active';
            const Icon = step.icon;
            
            // Debug logging for first step to see what's happening
            if (step.id === 1) {
              console.log(`🔍 JourneyCard ${journey.id} - Step status calculation:`, {
                stepId: step.id,
                stepStatus,
                currentStep: journey.currentStep,
                status: journey.status,
                cvId: journey.cvId,
                atsScore: journey.atsScore,
                coverLetterId: journey.coverLetterId
              });
            }
            
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                {/* Step Circle */}
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-lime-500 border-lime-500 text-black'
                      : isCurrent
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                      : 'bg-white/5 border-white/20 text-white/40'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                
                {/* Step Label */}
                <div className="mt-1 text-center">
                  <p className={`text-xs font-medium ${
                    isCompleted ? 'text-lime-400' : isCurrent ? 'text-blue-400' : 'text-white/40'
                  }`}>
                    {step.label}
                  </p>
                  
                  {/* ATS Score for step 3 */}
                  {step.id === 3 && journey.atsScore !== undefined && (
                    <p className="text-xs text-lime-400">
                      {journey.atsScore}%
                    </p>
                  )}
                  
                  {/* Status indicator for debugging */}
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-white/30">
                      {stepStatus}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Info */}
      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Created {formatDate(journey.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Step {journey.currentStep} of {journey.totalSteps}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default JourneyTimelineCard;
