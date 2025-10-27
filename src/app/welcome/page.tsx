'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowRight, 
  FileText, 
  Briefcase, 
  Target, 
  TrendingUp, 
  Sparkles,
  CheckCircle,
  Copy,
  BarChart3,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const WelcomePage: React.FC = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const features = [
    {
      id: 1,
      icon: FileText,
      title: 'Master CV - Your Foundation',
      description: 'Create a comprehensive Master CV once. This becomes your single source of truth for all your job applications.',
      imagePath: '/images/Create JOB step 1.png',
      highlights: [
        'Create your Master CV with all your experience, skills, and achievements',
        'Store all your professional information in one place',
        'Use it as a template for all future job applications',
        'Update once, use everywhere'
      ],
      color: 'lime'
    },
    {
      id: 2,
      icon: Briefcase,
      title: 'Add Jobs & Create Tailored CVs',
      description: 'For every job you apply to, create a duplicate of your Master CV. Tailor it specifically to match the job requirements.',
      imagePath: '/images/CV Creation step 2.png',
      highlights: [
        'Add job postings you want to apply for',
        'Duplicate your Master CV for each job',
        'Customize CV content to match job requirements',
        'Emphasize relevant skills and experience'
      ],
      color: 'blue'
    },
    {
      id: 3,
      icon: Target,
      title: 'ATS Score & Optimization',
      description: 'Get real-time ATS (Applicant Tracking System) scores to ensure your CV passes automated screening systems.',
      imagePath: '/images/ATS scoring step 3.png',
      highlights: [
        'Check how well your CV matches the job description',
        'Get actionable suggestions to improve your score',
        'Identify missing keywords and skills',
        'Optimize for both ATS and human reviewers'
      ],
      color: 'purple'
    },
    {
      id: 4,
      icon: Sparkles,
      title: 'AI-Powered Cover Letters',
      description: 'Generate professional, tailored cover letters for each job application using AI.',
      imagePath: '/images/Cover Letter step 4.png',
      highlights: [
        'Create personalized cover letters instantly',
        'Match tone and style to company culture',
        'Highlight your most relevant qualifications',
        'Edit and refine with AI assistance'
      ],
      color: 'emerald'
    },
    {
      id: 5,
      icon: TrendingUp,
      title: 'Application Journey Tracking',
      description: 'Track your entire application journey from creation to offer. Visualize your progress and manage multiple applications.',
      imagePath: '/images/Apply step5.png',
      highlights: [
        'Visual representation of each application stage',
        'Track CV and cover letter versions for each job',
        'Monitor application status (applied, screening, interview, offer)',
        'Never lose track of where you are in the process'
      ],
      color: 'orange'
    },
    {
      id: 6,
      icon: BarChart3,
      title: 'CV Studio - All Your Documents',
      description: 'Access and manage all your CVs, cover letters, and job applications in one centralized studio.',
      imagePath: '/images/dashboard-preview.png',
      highlights: [
        'View all your documents in one place',
        'Quick access to any CV or cover letter',
        'Download, edit, or duplicate documents',
        'Organize by job, date, or status'
      ],
      color: 'indigo'
    }
  ];

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentFeature = features[currentStep];

  const colorMap: Record<string, { bg: string; text: string; icon: string; button: string }> = {
    lime: {
      bg: 'bg-lime-50 dark:bg-lime-900/10',
      text: 'text-lime-600 dark:text-lime-400',
      icon: 'bg-lime-100 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400',
      button: 'bg-lime-500 hover:bg-lime-600'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      button: 'bg-purple-500 hover:bg-purple-600'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      button: 'bg-emerald-500 hover:bg-emerald-600'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      text: 'text-orange-600 dark:text-orange-400',
      icon: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      text: 'text-indigo-600 dark:text-indigo-400',
      icon: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      button: 'bg-indigo-500 hover:bg-indigo-600'
    }
  };

  const colors = colorMap[currentFeature.color];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Zap className="h-8 w-8 text-lime-500" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Welcome to <span className="text-lime-500">CVCircle</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
          >
            Your all-in-one platform for creating tailored CVs, tracking applications, and landing your dream job
          </motion.p>
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? `w-12 ${colors.button}`
                  : index < currentStep
                  ? 'w-2 bg-gray-400 dark:bg-gray-600'
                  : 'w-2 bg-gray-300 dark:bg-gray-700'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Main Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Content */}
            <div className="space-y-6">
              {/* Icon & Title */}
              <div>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${colors.icon} mb-4`}>
                  <currentFeature.icon className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentFeature.title}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {currentFeature.description}
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-3">
                {currentFeature.highlights.map((highlight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className={`h-5 w-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                    <p className="text-gray-700 dark:text-gray-300">{highlight}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Side - Screenshot */}
            <div className={`rounded-2xl ${colors.bg} p-6 border-2 ${colors.text.replace('text-', 'border-')}`}>
              <div className="relative aspect-video bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl">
                <Image
                  src={currentFeature.imagePath}
                  alt={currentFeature.title}
                  fill
                  className="object-contain"
                  priority={currentStep === 0}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center max-w-6xl mx-auto mt-12">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-6 py-3 text-gray-600 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {features.length}
            </p>
          </div>

          <button
            onClick={handleNext}
            className={`px-6 py-3 ${colors.button} text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg`}
          >
            {currentStep === features.length - 1 ? (
              <>
                Get Started
                <Zap className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip Button */}
        <div className="text-center mt-8">
          <button
            onClick={handleGetStarted}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;


