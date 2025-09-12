'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CheckCircle, 
  Star,
  Loader2,
  Download,
  Eye
} from 'lucide-react';

interface PreviewLaunchStepProps {
  cvData: any;
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function PreviewLaunchStep({ cvData, onComplete, onBack, isLoading }: PreviewLaunchStepProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const renderPreview = () => (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {cvData.basics?.name || 'Your Name'}
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          {cvData.basics?.label || 'Professional Title'}
        </p>
        <div className="flex justify-center space-x-4 text-sm text-gray-500">
          {cvData.basics?.email && <span>{cvData.basics.email}</span>}
          {cvData.basics?.phone && <span>{cvData.basics.phone}</span>}
          {cvData.basics?.location?.city && <span>{cvData.basics.location.city}</span>}
        </div>
      </div>

      {/* Professional Summary */}
      {cvData.basics?.summary && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h2>
          <p className="text-gray-700 text-sm leading-relaxed">{cvData.basics.summary}</p>
        </div>
      )}

      {/* Work Experience */}
      {cvData.work && cvData.work.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Work Experience</h2>
          <div className="space-y-4">
            {cvData.work.map((work: any, index: number) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{work.position}</h3>
                  <span className="text-sm text-gray-500">
                    {formatDate(work.startDate)} - {work.endDate ? formatDate(work.endDate) : 'Present'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{work.name}</p>
                {work.summary && (
                  <p className="text-gray-700 text-sm">{work.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {cvData.education && cvData.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Education</h2>
          <div className="space-y-3">
            {cvData.education.map((edu: any, index: number) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{edu.studyType} in {edu.area}</h3>
                  <span className="text-sm text-gray-500">
                    {formatDate(edu.startDate)} - {edu.endDate ? formatDate(edu.endDate) : 'Present'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{edu.institution}</p>
                {edu.score && (
                  <p className="text-gray-500 text-xs">GPA: {edu.score}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {cvData.skills && cvData.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {cvData.skills.map((skill: any, index: number) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {cvData.projects && cvData.projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Projects</h2>
          <div className="space-y-3">
            {cvData.projects.map((project: any, index: number) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="text-gray-700 text-sm mt-1">{project.description}</p>
                )}
                {project.url && (
                  <a href={project.url} className="text-blue-600 text-sm hover:underline">
                    View Project
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {cvData.languages && cvData.languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
          <div className="space-y-1">
            {cvData.languages.map((lang: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-700">{lang.language}</span>
                <span className="text-gray-500 text-sm">{lang.fluency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {cvData.certificates && cvData.certificates.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Certificates</h2>
          <div className="space-y-2">
            {cvData.certificates.map((cert: any, index: number) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                <p className="text-gray-600 text-sm">{cert.issuer}</p>
                {cert.date && (
                  <p className="text-gray-500 text-xs">{formatDate(cert.date)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Your Master CV is ready!
          </h2>
          <p className="text-xl text-white/60">
            This is your comprehensive CV that you can duplicate and customize for any job
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Congratulations */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-lime-400" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Congratulations! 🎉
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  You've successfully created your Master CV. This comprehensive profile will serve as your foundation for all future job applications.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <Star size={20} className="text-lime-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Duplicate & Customize</h4>
                    <p className="text-white/60 text-sm">Create job-specific versions tailored to each application</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Star size={20} className="text-lime-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">ATS Optimization</h4>
                    <p className="text-white/60 text-sm">Ensure your CV passes through Applicant Tracking Systems</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Star size={20} className="text-lime-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Professional Templates</h4>
                    <p className="text-white/60 text-sm">Choose from multiple design templates to match your style</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-sm">
                  Ready to start your job search journey? Let's go to your dashboard!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - CV Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">CV Preview</h3>
              <button
                onClick={() => setShowFullPreview(!showFullPreview)}
                className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
              >
                <Eye size={16} />
                {showFullPreview ? 'Collapse' : 'Expand'}
              </button>
            </div>

            <div className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
              showFullPreview ? 'max-h-none' : 'max-h-96 overflow-y-auto'
            }`}>
              {renderPreview()}
            </div>

            {!showFullPreview && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="text-lime-400 hover:text-lime-300 text-sm font-medium"
                >
                  View Full Preview
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <button
            onClick={onComplete}
            disabled={isLoading}
            className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-12 py-4 rounded-xl font-semibold text-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Creating Master CV...
              </>
            ) : (
              <>
                <CheckCircle size={24} />
                Finish & Go to Dashboard
              </>
            )}
          </button>
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="text-center">
            <div className="text-sm text-white/60">
              Step 5 of 5 - Preview & Launch
            </div>
            <div className="text-xs text-white/40 mt-1">
              Almost there! 🚀
            </div>
          </div>

          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </div>
    </div>
  );
}
