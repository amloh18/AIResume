'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';

interface CVPreviewContentProps {
  cvData: CVDataStructure | null;
  theme?: 'light' | 'dark';
  showBadge?: boolean;
  sectionOrder?: string[];
}

const CVPreviewContent: React.FC<CVPreviewContentProps> = ({ 
  cvData, 
  theme = 'light', 
  showBadge = true,
  sectionOrder = ['basics', 'experience', 'education', 'skills', 'projects', 'certificates', 'languages']
}) => {
  const isDark = theme === 'dark';
  
  // If no CV data, show placeholder
  if (!cvData) {
    return (
      <div className="space-y-8 relative">
        {showBadge && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2`}>
              <Eye size={16} />
              <span className="text-sm font-medium">CV Preview • A4 Format</span>
            </div>
          </div>
        )}
        
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl mb-8`} style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="p-8">
            <div className="text-center py-20">
              <p className={`${isDark ? 'text-white/60' : 'text-gray-500'} text-lg`}>
                No CV data available
              </p>
              <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm mt-2`}>
                Start adding your information to see a preview
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Theme classes
  const themeClasses = {
    page: isDark 
      ? 'bg-white/5 border-white/10' 
      : 'bg-white border-gray-200',
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-white/80' : 'text-gray-700',
      muted: isDark ? 'text-white/60' : 'text-gray-600',
      accent: isDark ? 'text-lime-400' : 'text-blue-600'
    },
    border: isDark ? 'border-white/10' : 'border-gray-200',
    accent: isDark ? 'border-lime-400' : 'border-blue-600'
  };

  return (
    <div className="space-y-8 relative">
      {/* CV Preview Badge */}
      {showBadge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2`}>
            <Eye size={16} />
            <span className="text-sm font-medium">CV Preview • A4 Format</span>
          </div>
        </div>
      )}
      
      {/* Page 1 */}
      <div className={`${themeClasses.page} border rounded-xl shadow-2xl mb-8`} style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="p-8">
          {/* Header */}
          <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`}>
            <h4 className={`text-3xl font-bold ${themeClasses.text.primary} mb-2`}>
              {cvData.basics.name || 'Your Name'}
            </h4>
            <p className={`${themeClasses.text.accent} text-xl mb-3`}>
              {cvData.basics.label || 'Professional Title'}
            </p>
            <div className={`flex items-center justify-center gap-6 mt-3 ${themeClasses.text.muted} text-sm`}>
              {cvData.basics.email && (
                <span>{cvData.basics.email}</span>
              )}
              {cvData.basics.phone && (
                <span>{cvData.basics.phone}</span>
              )}
              {cvData.basics.location.city && (
                <span>{cvData.basics.location.city}</span>
              )}
            </div>
          </div>

          {/* Summary */}
          {cvData.basics.summary && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-3 border-b ${themeClasses.border} pb-1`}>
                Professional Summary
              </h5>
              <p className={`${themeClasses.text.secondary} text-base leading-relaxed`}>
                {cvData.basics.summary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {cvData.work.length > 0 && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                Work Experience
              </h5>
              <div className="space-y-4">
                {/* First 2 work experiences on page 1 */}
                {cvData.work.slice(0, 2).map((work, index) => (
                  <div key={index} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h6 className={`font-semibold ${themeClasses.text.primary} text-lg`}>
                          {work.position}
                        </h6>
                        <p className={`${themeClasses.text.accent} text-base`}>
                          {work.name}
                        </p>
                      </div>
                      <span className={`${themeClasses.text.muted} text-sm`}>
                        {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                      </span>
                    </div>
                    {work.summary && (
                      <div className={`${themeClasses.text.secondary} text-sm leading-relaxed`}>
                        {work.summary.split('\n').map((line, i) => (
                          <p key={i} className="mb-1">{line}</p>
                        ))}
                      </div>
                    )}
                    {work.highlights && work.highlights.length > 0 && (
                      <ul className={`${themeClasses.text.secondary} text-sm list-disc list-inside space-y-1 mt-2`}>
                        {work.highlights.map((highlight, i) => (
                          <li key={i}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education - only if work has 2 or fewer entries */}
          {cvData.work.length <= 2 && cvData.education.length > 0 && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                Education
              </h5>
              <div className="space-y-4">
                {cvData.education.map((education, index) => (
                  <div key={index} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h6 className={`font-semibold ${themeClasses.text.primary} text-lg`}>
                          {education.institution}
                        </h6>
                        <p className={`${themeClasses.text.accent} text-base`}>
                          {education.studyType} in {education.area}
                        </p>
                        {education.score && (
                          <p className={`${themeClasses.text.muted} text-sm`}>
                            Score: {education.score}
                          </p>
                        )}
                      </div>
                      <span className={`${themeClasses.text.muted} text-sm`}>
                        {education.startDate && education.endDate ? `${education.startDate} - ${education.endDate}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {cvData.skills.length > 0 && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                Skills
              </h5>
              <div className="flex flex-wrap gap-2">
                {cvData.skills.map((skill, index) => (
                  <div key={index} className={`${isDark ? 'bg-lime-400/20 text-lime-400' : 'bg-blue-100 text-blue-700'} px-3 py-2 rounded-full text-sm font-medium`}>
                    {skill.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {cvData.certificates && cvData.certificates.length > 0 && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                Certifications
              </h5>
              <div className="space-y-3">
                {cvData.certificates.map((certificate, index) => (
                  <div key={index} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h6 className={`font-semibold ${themeClasses.text.primary} text-base`}>
                          {certificate.name}
                        </h6>
                        <p className={`${themeClasses.text.accent} text-sm`}>
                          {certificate.issuer}
                        </p>
                      </div>
                      <span className={`${themeClasses.text.muted} text-sm`}>
                        {certificate.date}
                      </span>
                    </div>
                    {certificate.url && (
                      <p className={`${themeClasses.text.accent} text-xs mt-1`}>
                        <a href={certificate.url} target="_blank" rel="noopener noreferrer">
                          View Certificate
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {cvData.languages && cvData.languages.length > 0 && (
            <div className="mb-6">
              <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                Languages
              </h5>
              <div className="flex flex-wrap gap-3">
                {cvData.languages.map((language, index) => (
                  <div key={index} className={`${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'} px-3 py-2 rounded-lg text-sm`}>
                    <span className="font-medium">{language.language}</span>
                    <span className={`${themeClasses.text.muted} ml-2`}>
                      ({language.fluency})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page 2 - Additional content */}
      {(cvData.work.length > 2 || cvData.projects.length > 0) && (
        <div className={`${themeClasses.page} border rounded-xl shadow-2xl`} style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="p-8">
            {/* Continued Work Experience */}
            {cvData.work.length > 2 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                  Work Experience (Continued)
                </h5>
                <div className="space-y-4">
                  {cvData.work.slice(2).map((work, index) => (
                    <div key={index + 2} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h6 className={`font-semibold ${themeClasses.text.primary} text-lg`}>
                            {work.position}
                          </h6>
                          <p className={`${themeClasses.text.accent} text-base`}>
                            {work.name}
                          </p>
                        </div>
                        <span className={`${themeClasses.text.muted} text-sm`}>
                          {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                        </span>
                      </div>
                      {work.summary && (
                        <div className={`${themeClasses.text.secondary} text-sm leading-relaxed`}>
                          {work.summary.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      )}
                      {work.highlights && work.highlights.length > 0 && (
                        <ul className={`${themeClasses.text.secondary} text-sm list-disc list-inside space-y-1 mt-2`}>
                          {work.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education - if not shown on page 1 */}
            {cvData.work.length > 2 && cvData.education.length > 0 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                  Education
                </h5>
                <div className="space-y-4">
                  {cvData.education.map((education, index) => (
                    <div key={index} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className={`font-semibold ${themeClasses.text.primary} text-lg`}>
                            {education.institution}
                          </h6>
                          <p className={`${themeClasses.text.accent} text-base`}>
                            {education.studyType} in {education.area}
                          </p>
                          {education.score && (
                            <p className={`${themeClasses.text.muted} text-sm`}>
                              Score: {education.score}
                            </p>
                          )}
                        </div>
                        <span className={`${themeClasses.text.muted} text-sm`}>
                          {education.startDate && education.endDate ? `${education.startDate} - ${education.endDate}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills - if not shown on page 1 */}
            {cvData.work.length > 2 && cvData.skills.length > 0 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                  Skills
                </h5>
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.map((skill, index) => (
                    <div key={index} className={`${isDark ? 'bg-lime-400/20 text-lime-400' : 'bg-blue-100 text-blue-700'} px-3 py-2 rounded-full text-sm font-medium`}>
                      {skill.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {cvData.projects.length > 0 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold ${themeClasses.text.primary} mb-4 border-b ${themeClasses.border} pb-1`}>
                  Projects
                </h5>
                <div className="space-y-4">
                  {cvData.projects.map((project, index) => (
                    <div key={index} className={`border-l-4 ${themeClasses.accent} pl-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <h6 className={`font-semibold ${themeClasses.text.primary} text-lg`}>
                          {project.name}
                        </h6>
                        <span className={`${themeClasses.text.muted} text-sm`}>
                          {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                        </span>
                      </div>
                      {project.description && (
                        <div className={`${themeClasses.text.secondary} text-sm leading-relaxed`}>
                          {project.description.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      )}
                      {project.url && (
                        <p className={`${themeClasses.text.accent} text-sm mt-2`}>
                          <a href={project.url} target="_blank" rel="noopener noreferrer">
                            {project.url}
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVPreviewContent;