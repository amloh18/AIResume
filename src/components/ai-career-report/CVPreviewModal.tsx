'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Calendar, MapPin, Phone, Mail, Globe, Linkedin, Github } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface CVPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: UnifiedCVDataStructure;
}

export default function CVPreviewModal({ isOpen, onClose, cvData }: CVPreviewModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  const formatDateRange = (startDate: string, endDate: string, isCurrent: boolean) => {
    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : formatDate(endDate);
    return `${start} - ${end}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">CV Preview</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* CV Content */}
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {cvData.basics.name || 'Your Name'}
                </h1>
                <p className="text-xl text-gray-600 mb-4">
                  {cvData.basics.label || 'Professional Title'}
                </p>
                
                {/* Contact Info */}
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  {cvData.basics.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{cvData.basics.email}</span>
                    </div>
                  )}
                  {cvData.basics.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{cvData.basics.phone}</span>
                    </div>
                  )}
                  {cvData.basics.location?.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{cvData.basics.location.city}</span>
                    </div>
                  )}
                  {cvData.basics.url && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>{cvData.basics.url}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {cvData.basics.summary && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
                    Professional Summary
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {cvData.basics.summary}
                  </p>
                </div>
              )}

              {/* Work Experience */}
              {cvData.work && cvData.work.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Work Experience
                  </h2>
                  <div className="space-y-6">
                    {cvData.work.map((work, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {work.position || 'Position'}
                            </h3>
                            <p className="text-gray-600 font-medium">
                              {work.name || 'Company'}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateRange(work.startDate, work.endDate, !work.endDate)}
                          </div>
                        </div>
                        {work.summary && (
                          <p className="text-gray-700 mb-2">{work.summary}</p>
                        )}
                        {work.highlights && work.highlights.length > 0 && (
                          <ul className="list-disc list-inside space-y-1">
                            {work.highlights.map((highlight, i) => (
                              <li key={i} className="text-gray-700 text-sm">
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {cvData.education && cvData.education.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Education
                  </h2>
                  <div className="space-y-4">
                    {cvData.education.map((edu, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {edu.studyType} {edu.area}
                            </h3>
                            <p className="text-gray-600 font-medium">
                              {edu.institution || 'Institution'}
                            </p>
                            {edu.score && (
                              <p className="text-sm text-gray-500">GPA: {edu.score}</p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateRange(edu.startDate, edu.endDate, !edu.endDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {cvData.skills && cvData.skills.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Skills
                  </h2>
                  <div className="space-y-4">
                    {cvData.skills.map((skill, index) => (
                      <div key={index}>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {skill.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {skill.keywords?.map((keyword, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {cvData.projects && cvData.projects.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Projects
                  </h2>
                  <div className="space-y-4">
                    {cvData.projects.map((project, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {project.name}
                            </h3>
                            {project.url && (
                              <a
                                href={project.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {project.url}
                              </a>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateRange(project.startDate, project.endDate, !project.endDate)}
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-gray-700">{project.description}</p>
                        )}
                        {project.highlights && project.highlights.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {project.highlights.map((highlight, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
                                >
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {cvData.certificates && cvData.certificates.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-1">
                    Certifications
                  </h2>
                  <div className="space-y-3">
                    {cvData.certificates.map((cert, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {cert.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {cert.issuer}
                          </p>
                        </div>
                        {cert.date && (
                          <div className="text-sm text-gray-500">
                            {formatDate(cert.date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
