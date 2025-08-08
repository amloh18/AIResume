'use client';

import React from 'react';
import { Project } from '@/lib/stores/cvStore';

interface ProjectsSectionProps {
  data: Project[];
  template: any;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Projects
      </h2>
      
      <div className="space-y-4">
        {data.map((project) => (
          <div key={project.id} className="border-l-4 pl-4" style={{ borderColor: template.globalStyles.primaryColor }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{project.title}</h3>
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-blue-600 hover:underline">
                    View Project
                  </a>
                )}
                {project.github && (
                  <a href={project.github} target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-gray-600 hover:underline ml-2">
                    GitHub
                  </a>
                )}
              </div>
              <div className="text-right text-sm text-gray-600">
                {project.startDate && (
                  <span>
                    {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
                {project.startDate && project.endDate && !project.current && (
                  <span> - {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
                {project.current && <span> - Ongoing</span>}
              </div>
            </div>
            
            {project.description && (
              <p className="text-gray-700 mb-2">{project.description}</p>
            )}
            
            {project.technologies && project.technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {project.technologies.map((tech, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsSection; 