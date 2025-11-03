'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  X, 
  FileText, 
  Mail, 
  Briefcase, 
  Calendar, 
  Target,
  CheckCircle2,
  Circle,
  Play,
  Edit
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import toast from 'react-hot-toast';
import { useStudioNavigation } from '@/lib/studio-navigation';

interface ApplicationJourneyModalProps {
  journey: {
    id: string;
    journeyId: string;
    status: string;
    currentStep: number;
    jobId?: string;
    job: {
      id?: string;
      jobTitle: string;
      company: string;
      deadline?: Date;
    };
    cv?: {
      id: string;
      title: string;
      lastModified: Date;
    };
    coverLetter?: {
      id: string;
      title: string;
      lastModified: Date;
    };
  };
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Application Journey Modal
 * 
 * This modal demonstrates the integration with Studio using your proposed workflow:
 * 1. Shows journey timeline with CV/Cover Letter steps
 * 2. "CV Tailoring" button navigates to Studio with journeyId + documentType: 'cv'
 * 3. "Cover Letter" button navigates to Studio with journeyId + documentType: 'cover-letter'
 * 4. Studio automatically loads job context for ATS analysis
 */
export default function ApplicationJourneyModal({
  journey,
  userId,
  isOpen,
  onClose
}: ApplicationJourneyModalProps) {
  const router = useRouter();
  const { journeyActions } = useStudioNavigation(router, userId);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: 'Job Analysis',
      description: 'Review job requirements and company research',
      status: 'completed',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 2,
      title: 'CV Tailoring',
      description: 'Customize your CV for this specific role',
      status: journey.cv ? 'completed' : 'current',
      icon: <FileText className="w-4 h-4" />,
      document: journey.cv,
      action: 'cv'
    },
    {
      id: 3,
      title: 'Cover Letter',
      description: 'Write a compelling cover letter',
      status: journey.coverLetter ? 'completed' : journey.cv ? 'current' : 'pending',
      icon: <Mail className="w-4 h-4" />,
      document: journey.coverLetter,
      action: 'cover-letter'
    },
    {
      id: 4,
      title: 'Application Review',
      description: 'Final review and submission',
      status: (journey.cv && journey.coverLetter) ? 'current' : 'pending',
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    {
      id: 5,
      title: 'Move to Applied',
      description: 'Move this job to the applied stage',
      status: 'pending',
      icon: <Calendar className="w-4 h-4" />,
      action: 'move-to-applied'
    }
  ];

  const progress = (journey.currentStep / steps.length) * 100;

  // Get the navigation functions for this journey
  const studioActions = journeyActions(journey.id);

  // Handle moving job to applied status
  const handleMoveToApplied = async () => {
    try {
      const jobId = journey.job.id || journey.jobId;
      if (!jobId) {
        toast.error('Job ID not found');
        return;
      }
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'applied' }),
      });

      if (response.ok) {
        toast.success('Job moved to Applied stage!');
        onClose();
      } else {
        toast.error('Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Error updating job status');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Briefcase className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Application Journey
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {journey.job.jobTitle} at {journey.job.company}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="secondary">
                Journey {journey.journeyId.slice(-6)}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {journey.currentStep} of {steps.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {steps.map((step, index) => (
            <JourneyStep
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              onStudioNavigate={(action) => {
                if (action === 'cv') {
                  studioActions.navigateToCVTailoring();
                } else if (action === 'cover-letter') {
                  studioActions.navigateToCoverLetter();
                } else if (action === 'move-to-applied') {
                  handleMoveToApplied();
                }
              }}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {journey.job.deadline && (
                <span>Deadline: {new Date(journey.job.deadline).toLocaleDateString()}</span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              
              {/* Quick Action Buttons */}
              {!journey.cv && (
                <Button onClick={studioActions.navigateToCVTailoring}>
                  <FileText className="w-4 h-4 mr-2" />
                  Start CV Tailoring
                </Button>
              )}
              
              {journey.cv && !journey.coverLetter && (
                <Button onClick={studioActions.navigateToCoverLetter}>
                  <Mail className="w-4 h-4 mr-2" />
                  Write Cover Letter
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Individual Journey Step Component
 */
function JourneyStep({
  step,
  isLast,
  onStudioNavigate
}: {
  step: any;
  isLast: boolean;
  onStudioNavigate: (action: string) => void;
}) {
  const getStepIcon = () => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'current') {
      return <Circle className="w-5 h-5 text-blue-500 fill-current" />;
    } else {
      return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStepColor = () => {
    if (step.status === 'completed') return 'text-green-600 dark:text-green-400';
    if (step.status === 'current') return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-400 dark:text-gray-500';
  };

  return (
    <div className="flex items-start space-x-4">
      {/* Step Icon and Connector */}
      <div className="flex flex-col items-center">
        {getStepIcon()}
        {!isLast && (
          <div className={`w-px h-12 mt-2 ${
            step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-600'
          }`} />
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-[48px]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-medium ${getStepColor()}`}>
              {step.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step.description}
            </p>
            
            {/* Document Status */}
            {step.document && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700 dark:text-green-300">
                    {step.document.title} • Last modified {new Date(step.document.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {step.action && (
            <div className="flex space-x-2">
              {step.action === 'move-to-applied' ? (
                <Button
                  size="sm"
                  onClick={() => onStudioNavigate(step.action)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Move to Applied
                </Button>
              ) : step.document ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStudioNavigate(step.action)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              ) : step.status === 'current' ? (
                <Button
                  size="sm"
                  onClick={() => onStudioNavigate(step.action)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
