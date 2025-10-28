'use client';

import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';

interface CVPreviewThumbnailProps {
  cvData: any;
  template?: {
    _id: string;
    name: string;
    globalStyles: any;
    availableSections: any[];
  };
  className?: string;
}

const CVPreviewThumbnail: React.FC<CVPreviewThumbnailProps> = ({
  cvData,
  template,
  className = ''
}) => {
  const previewContent = useMemo(() => {
    if (!cvData || !template) {
      return null;
    }

    const templateStyles = template.globalStyles || {};
    const primaryColor = templateStyles.primaryColor || '#333';
    const backgroundColor = templateStyles.backgroundColor || '#fff';
    const accentColor = templateStyles.accentColor || primaryColor;
    const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';

    // A4 dimensions in pixels (210mm x 297mm at 96 DPI)
    const a4Width = 794; // 210mm * 96/25.4
    const a4Height = 1123; // 297mm * 96/25.4
    const scale = 0.15; // Scale down to fit in card
    const scaledWidth = a4Width * scale;
    const scaledHeight = a4Height * scale;

    // Get CV data
    const name = cvData.basics?.name || 'Your Name';
    const title = cvData.basics?.label || 'Professional Title';
    const email = cvData.basics?.email || 'email@example.com';
    const phone = cvData.basics?.phone || 'Phone';
    
    // Get work experience (first 2 items)
    const workItems = cvData.work?.slice(0, 2) || [];
    
    // Get education (first 2 items)
    const educationItems = cvData.education?.slice(0, 2) || [];
    
    // Get skills (first 6 items)
    const skills = cvData.skills?.slice(0, 6).map((skill: any) => skill.name || skill) || [];

    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ 
          fontFamily,
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* A4 Document Preview */}
        <div 
          className="shadow-lg border border-gray-300"
          style={{ 
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor,
            color: primaryColor,
            fontSize: `${8 * scale}px`, // Scale font size proportionally
            lineHeight: '1.2',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div 
            className="p-2 border-b"
            style={{ 
              backgroundColor: accentColor,
              color: '#fff',
              fontSize: `${10 * scale}px`
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{name}</div>
            <div style={{ opacity: 0.9, fontSize: `${8 * scale}px` }}>{title}</div>
          </div>

          {/* Contact Info */}
          <div className="p-2" style={{ fontSize: `${7 * scale}px` }}>
            <div style={{ marginBottom: '1px' }}>{email}</div>
            <div>{phone}</div>
          </div>

          {/* Work Experience */}
          {workItems.length > 0 && (
            <div className="p-2 border-t">
              <div 
                className="font-semibold mb-1"
                style={{ 
                  color: accentColor,
                  fontSize: `${8 * scale}px`,
                  fontWeight: 'bold'
                }}
              >
                Experience
              </div>
              {workItems.map((work: any, index: number) => (
                <div key={index} style={{ marginBottom: '3px', fontSize: `${7 * scale}px` }}>
                  <div style={{ fontWeight: 'bold' }}>{work.position || work.title}</div>
                  <div style={{ opacity: 0.8 }}>{work.company}</div>
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {educationItems.length > 0 && (
            <div className="p-2 border-t">
              <div 
                className="font-semibold mb-1"
                style={{ 
                  color: accentColor,
                  fontSize: `${8 * scale}px`,
                  fontWeight: 'bold'
                }}
              >
                Education
              </div>
              {educationItems.map((edu: any, index: number) => (
                <div key={index} style={{ marginBottom: '3px', fontSize: `${7 * scale}px` }}>
                  <div style={{ fontWeight: 'bold' }}>{edu.institution}</div>
                  <div style={{ opacity: 0.8 }}>{edu.area}</div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="p-2 border-t">
              <div 
                className="font-semibold mb-1"
                style={{ 
                  color: accentColor,
                  fontSize: `${8 * scale}px`,
                  fontWeight: 'bold'
                }}
              >
                Skills
              </div>
              <div style={{ fontSize: `${7 * scale}px`, opacity: 0.8 }}>
                {skills.join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [cvData, template]);

  if (!previewContent) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      {previewContent}
    </div>
  );
};

export default CVPreviewThumbnail;
