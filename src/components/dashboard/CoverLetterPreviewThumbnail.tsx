'use client';

import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';

interface CoverLetterPreviewThumbnailProps {
  content: string;
  className?: string;
}

const CoverLetterPreviewThumbnail: React.FC<CoverLetterPreviewThumbnailProps> = ({
  content,
  className = ''
}) => {
  const previewContent = useMemo(() => {
    if (!content) {
      return null;
    }

    // A4 dimensions in pixels (210mm x 297mm at 96 DPI)
    const a4Width = 794; // 210mm * 96/25.4
    const a4Height = 1123; // 297mm * 96/25.4
    const scale = 0.15; // Scale down to fit in card
    const scaledWidth = a4Width * scale;
    const scaledHeight = a4Height * scale;

    // Extract key information from cover letter content
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    
    // Try to extract date, greeting, and first paragraph
    const dateMatch = content.match(/(\w+ \d{1,2}, \d{4})/);
    const greetingMatch = content.match(/(Dear \w+)/i);
    const firstParagraph = lines.find(line => 
      line.length > 50 && 
      !line.includes('Dear') && 
      !line.match(/\w+ \d{1,2}, \d{4}/) &&
      !line.includes('Sincerely')
    ) || '';

    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ 
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* A4 Document Preview */}
        <div 
          className="shadow-lg border border-gray-300"
          style={{ 
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: '#fff',
            fontSize: `${8 * scale}px`,
            lineHeight: '1.4',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div 
            className="p-2 border-b"
            style={{ 
              backgroundColor: '#8b5cf6',
              color: '#fff',
              fontSize: `${10 * scale}px`
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Cover Letter</div>
            <div style={{ opacity: 0.9, fontSize: `${8 * scale}px` }}>Professional Communication</div>
          </div>

          {/* Content Preview */}
          <div className="p-2" style={{ fontSize: `${7 * scale}px` }}>
            {/* Date */}
            {dateMatch && (
              <div style={{ marginBottom: '4px', color: '#666' }}>
                {dateMatch[1]}
              </div>
            )}

            {/* Greeting */}
            {greetingMatch && (
              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                {greetingMatch[1]},
              </div>
            )}

            {/* First paragraph preview */}
            {firstParagraph && (
              <div style={{ 
                color: '#333', 
                lineHeight: '1.3',
                marginBottom: '4px'
              }}>
                {firstParagraph.length > 80 
                  ? firstParagraph.substring(0, 80) + '...'
                  : firstParagraph
                }
              </div>
            )}

            {/* Additional content indicators */}
            <div style={{ 
              paddingTop: '4px', 
              borderTop: '1px solid #e5e7eb',
              marginTop: '4px'
            }}>
              <div style={{ color: '#666', fontSize: `${6 * scale}px` }}>
                {lines.length > 3 ? `${lines.length - 3} more paragraphs` : 'Complete letter'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [content]);

  if (!previewContent) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
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

export default CoverLetterPreviewThumbnail;
