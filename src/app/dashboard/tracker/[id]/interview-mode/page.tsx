'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileText, Sparkles, X } from 'lucide-react';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import InterviewCoach from '@/components/dashboard/jobs/ai/InterviewCoach';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  status: string;
}

interface CVJourney {
  id: string;
  cvId?: string;
  coverLetterId?: string;
}

const InterviewModePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useUnifiedAuth();
  const userId = getUserIdForAPI(user);
  const jobId = params.id as string;

  const [job, setJob] = useState<JobApplication | null>(null);
  const [journey, setJourney] = useState<CVJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(60);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!userId || !jobId) return;

    const loadData = async () => {
      try {
        // Load job
        const jobResponse = await authenticatedFetchWithUserId(
          `/api/jobs/${jobId}`,
          userId
        );
        const jobData = await jobResponse.json();

        if (!jobData.success || !jobData.data) {
          toast.error('Job not found');
          router.push('/dashboard/tracker');
          return;
        }

        const jobInfo = jobData.data;
        setJob(jobInfo);

        // Check if journey exists
        const journeyResponse = await authenticatedFetchWithUserId(
          `/api/application-journey?jobId=${jobId}`,
          userId
        );
        const journeyData = await journeyResponse.json();

        if (!journeyData.success || !journeyData.data?.journeys || journeyData.data.journeys.length === 0) {
          toast.error('CV journey not found. Create a CV journey first.');
          router.push(`/dashboard/tracker`);
          return;
        }

        setJourney(journeyData.data.journeys[0]);
      } catch (error) {
        console.error('Error loading interview mode data:', error);
        toast.error('Failed to load interview data');
        router.push('/dashboard/tracker');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, jobId, router]);

  // Timer logic
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === 0) {
          if (timerMinutes === 0) {
            setIsTimerRunning(false);
            toast.success('Interview time is up!');
            return 0;
          }
          setTimerMinutes((prev) => prev - 1);
          return 59;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timerMinutes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
      </div>
    );
  }

  if (!job || !journey) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/tracker')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-h2 font-bold text-gray-900 dark:text-white">
                Interview Mode
              </h1>
              <p className="text-small text-gray-600 dark:text-gray-400">
                {job.jobTitle} at {job.company}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/tracker')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 desktop:grid-cols-2 gap-6 p-6">
        {/* Left Panel: Job Description & CV Preview */}
        <div className="space-y-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-h3 font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Job Description
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-small text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {job.jobDescription || 'No job description available'}
              </p>
            </div>
          </div>

          {journey.cvId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-h3 font-semibold mb-4">CV Preview</h2>
              <a
                href={`/studio?journeyId=${journey.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-small"
              >
                View CV in Studio →
              </a>
            </div>
          )}
        </div>

        {/* Right Panel: Interview Prep */}
        <div className="space-y-4 overflow-y-auto">
          {/* Timer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-h3 font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Interview Timer
            </h2>
            <div className="text-center">
              <div className="text-display font-bold text-gray-900 dark:text-white mb-4">
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black rounded-lg font-medium"
                >
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={() => {
                    setTimerMinutes(60);
                    setTimerSeconds(0);
                    setIsTimerRunning(false);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Interview Coach */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <InterviewCoach
              jobId={jobId}
              jobTitle={job.jobTitle}
              company={job.company}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewModePage;

