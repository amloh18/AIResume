'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Building, Calendar } from 'lucide-react';

interface CoverLetterPreviewProps {
  content: string;
  cvData: any;
  jobData: any;
  selectedCVData: any;
}

const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  content,
  cvData,
  jobData,
  selectedCVData
}) => {
  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Parse content to extract body (removing greetings and closings)
  const parseContent = (text: string) => {
    if (!text) return { body: '', closing: '' };
    
    let body = text;
    let closing = `Thank you for considering my application.\n\nSincerely,\n${cvData?.basics?.name || 'Your Name'}`;
    
    // Remove greeting if present
    if (text.startsWith('Dear ')) {
      const greetingEnd = text.indexOf('\n');
      if (greetingEnd > -1) {
        body = text.substring(greetingEnd + 1).trim();
      }
    }
    
    // Extract closing if present
    const closingKeywords = ['Sincerely', 'Best regards', 'Thank you for considering'];
    for (const keyword of closingKeywords) {
      const closingIndex = body.lastIndexOf(keyword);
      if (closingIndex > -1) {
        closing = body.substring(closingIndex).trim();
        body = body.substring(0, closingIndex).trim();
        break;
      }
    }
    
    // If no closing found, use the full text as body
    if (body === text) {
      body = text;
    }
    
    return { body, closing };
  };

  const { body, closing } = parseContent(content);
  
  // Debug logging
  console.log('CoverLetterPreview Debug:', {
    content,
    body,
    closing,
    hasContent: !!content,
    contentLength: content?.length || 0
  });
  const senderName = cvData?.basics?.name?.toUpperCase() || 'YOUR NAME';
  
  // Handle location object properly
  let locationStr = 'Your Location';
  if (cvData?.basics?.location) {
    if (typeof cvData.basics.location === 'string') {
      locationStr = cvData.basics.location;
    } else if (typeof cvData.basics.location === 'object') {
      // Handle location object with city, state, country, etc.
      const parts = [];
      if (cvData.basics.location.city) parts.push(cvData.basics.location.city);
      if (cvData.basics.location.state) parts.push(cvData.basics.location.state);
      if (cvData.basics.location.country) parts.push(cvData.basics.location.country);
      locationStr = parts.join(', ') || 'Your Location';
    }
  }
  
  const phone = cvData?.basics?.phone || '555-555-5555';
  const email = cvData?.basics?.email || 'email@example.com';
  const senderInfo = `${locationStr} | ${phone} | ${email}`;
  
  const recipientName = jobData?.contactPerson || 'Hiring Manager';
  const companyName = jobData?.company || 'Company Name';
  const companyLocation = jobData?.location || 'Company Address';

  return (
    <div className="bg-white w-full" style={{ padding: '0.75in', minHeight: '11in', color: '#000000' }}>
        {/* Header - Sender Information */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '18pt', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#000000'
          }}>
            {senderName}
          </div>
          <div style={{ 
            fontSize: '10pt', 
            color: '#000000'
          }}>
            {senderInfo}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: '24px', textAlign: 'left', fontSize: '11pt', color: '#000000' }}>
          {formatDate()}
        </div>

        {/* Recipient Information */}
        <div style={{ marginBottom: '24px', textAlign: 'left', fontSize: '11pt', color: '#000000' }}>
          <div style={{ marginBottom: '4px', color: '#000000' }}>{recipientName}</div>
          <div style={{ marginBottom: '4px', color: '#000000' }}>{companyName}</div>
          <div style={{ color: '#000000' }}>{companyLocation}</div>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom: '16px', textAlign: 'left', fontSize: '11pt', color: '#000000' }}>
          Dear {recipientName === 'Hiring Manager' ? 'Hiring Manager' : recipientName.split(' ')[0]},
        </div>

        {/* Cover Letter Content */}
        {content && content.trim() ? (
          <>
            {/* Body Content */}
            <div style={{ marginBottom: '24px', fontSize: '11pt', lineHeight: '1.6', color: '#000000' }}>
              {body && body.trim() ? (
                body.split('\n\n').map((paragraph, index) => (
                  <div key={index} style={{ 
                    marginBottom: '16px',
                    textAlign: 'left',
                    color: '#000000'
                  }}>
                    {paragraph.trim().split('\n').map((line, lineIndex) => {
                      // Handle formatting
                      let formattedLine = line;
                      
                      // Handle bold text **text**
                      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #000000;">$1</strong>');
                      
                      // Handle italic text *text*
                      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em style="color: #000000;">$1</em>');
                      
                      // Handle bullet points
                      if (line.trim().startsWith('•')) {
                        return (
                          <div key={lineIndex} style={{ marginLeft: '20px', marginBottom: '8px', color: '#000000' }}>
                            <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
                          </div>
                        );
                      }
                      
                      return (
                        <div key={lineIndex} style={{ marginBottom: '4px', color: '#000000' }}>
                          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  No body content found. Content: "{content}"
                </div>
              )}
            </div>

            {/* Closing */}
            {closing && closing.trim() && (
              <div style={{ marginTop: '24px', textAlign: 'left', fontSize: '11pt', color: '#000000' }}>
                <div style={{ whiteSpace: 'pre-line', color: '#000000' }}>{closing}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Content Yet
            </h3>
            <p className="text-gray-600">
              Start writing your cover letter or use AI to generate one.
            </p>
          </div>
        )}
    </div>
  );
};

export default CoverLetterPreview;
