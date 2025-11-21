'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Check, 
  Download,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  Building,
  GraduationCap,
  FolderOpen,
  Award,
  Languages,
  Heart,
  Code,
  Calendar,
  Sparkles
} from 'lucide-react';

interface MasterCVData {
  // Personal Information
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website: string;
  linkedin: string;
  github: string;
  
  // Experience
  workExperience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    url: string;
    startDate: string;
    endDate: string;
  }>;
  
  // Skills & Achievements
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
  }>;
  achievements: string;
  interests: string[];
}

interface PreviewStepProps {
  data: MasterCVData;
  onComplete: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  onComplete,
  onPrevious,
  isLoading
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleComplete = async () => {
    await onComplete();
    setShowSuccess(true);
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your Master Profile is complete!
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Here is a preview of all the information you've provided. This data will be used to 
          generate beautiful, tailored CVs in just a few clicks.
        </p>
      </div>

      {/* CV Preview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
        {/* CV Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{data.fullName}</h1>
          <p className="text-xl opacity-90 mb-4">{data.professionalTitle}</p>
          
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{data.email}</span>
            </div>
            {data.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{data.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{data.location}</span>
            </div>
            {data.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="truncate">{data.website}</span>
              </div>
            )}
            {data.linkedin && (
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" />
                <span className="truncate">{data.linkedin}</span>
              </div>
            )}
            {data.github && (
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                <span className="truncate">{data.github}</span>
              </div>
            )}
          </div>
        </div>

        {/* CV Content */}
        <div className="p-8 space-y-8">
          {/* Summary */}
          {data.summary && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                Professional Summary
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {data.summary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {data.workExperience.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" />
                Work Experience
              </h2>
              <div className="space-y-4">
                {data.workExperience.map((work) => (
                  <div key={work.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {work.jobTitle}
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">
                          {work.company}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                        <div>{formatDateRange(work.startDate, work.endDate, work.isCurrent)}</div>
                        {work.location && <div>{work.location}</div>}
                      </div>
                    </div>
                    {work.description && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {work.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-green-500" />
                Education
              </h2>
              <div className="space-y-4">
                {data.education.map((edu) => (
                  <div key={edu.id} className="border-l-4 border-green-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {edu.degree}
                        </h3>
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          {edu.institution}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                        <div>{formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}</div>
                        {edu.location && <div>{edu.location}</div>}
                      </div>
                    </div>
                    {edu.description && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {data.projects.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-purple-500" />
                Projects
              </h2>
              <div className="space-y-4">
                {data.projects.map((project) => (
                  <div key={project.id} className="border-l-4 border-purple-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                        {project.url && (
                          <a 
                            href={project.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
                          >
                            View Project →
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                        {formatDateRange(project.startDate, project.endDate, false)}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2">
                      {project.description}
                    </p>
                    {project.technologies && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Technologies:</strong> {project.technologies}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Languages className="h-5 w-5 text-green-500" />
                Languages
              </h2>
              <div className="space-y-2">
                {data.languages.map((lang) => (
                  <div key={lang.id} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang.language}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {lang.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {data.achievements && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Achievements
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {data.achievements}
              </p>
            </div>
          )}

          {/* Interests */}
          {data.interests.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          onClick={onPrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </motion.button>
        
        <motion.button
          onClick={handleComplete}
          disabled={isLoading}
          className={`flex items-center gap-2 px-8 py-4 font-medium rounded-lg transition-all shadow-lg hover:shadow-xl ${
            isLoading || showSuccess
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
          }`}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Master CV...
            </>
          ) : showSuccess ? (
            <>
              <Check className="h-5 w-5" />
              Master CV Created!
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Save & Start My CV Journey
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PreviewStep;
