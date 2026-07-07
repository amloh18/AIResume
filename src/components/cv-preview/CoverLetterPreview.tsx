'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Building, Calendar } from 'lucide-react';
import { CoverLetterTemplate, getCVTemplateStyleForCoverLetter } from '@/lib/templates/cover-letter-templates';

function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SanitizedHTML: React.FC<{ html: string; style?: React.CSSProperties; className?: string }> = ({ html, style, className }) => {
  const sanitized = sanitizeHtml(html);
  return <span style={style} className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

interface CoverLetterPreviewProps {
  content: string;
  cvData: any;
  jobData: any;
  selectedCVData: any;
  template?: CoverLetterTemplate | null;
  header?: string;
  body?: string;
  footer?: string;
  pageSize?: 'A4' | 'Letter';
}

const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  content,
  cvData,
  jobData,
  selectedCVData,
  template,
  header,
  body,
  footer,
  pageSize = 'A4'
}) => {
  // Page dimensions in pixels (at 96 DPI)
  // A4: 210mm x 297mm -> 794px x 1123px
  // Letter: 8.5in x 11in -> 816px x 1056px
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;
  const LETTER_WIDTH = 816;
  const LETTER_HEIGHT = 1056;

  const width = pageSize === 'A4' ? A4_WIDTH : LETTER_WIDTH;
  const height = pageSize === 'A4' ? A4_HEIGHT : LETTER_HEIGHT;

  // Get CV template styling for this cover letter template
  const cvTemplateStyle = template?.id ? getCVTemplateStyleForCoverLetter(template.id) : null;

  // Get template settings or use defaults, with CV template styling applied
  const layout = template?.layout || {
    headerAlignment: 'left' as const,
    datePosition: 'right' as const,
    spacing: {
      paragraphSpacing: '16px',
      lineHeight: '1.6',
      margins: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px',
      },
    },
    typography: {
      fontFamily: cvTemplateStyle?.fontFamily || 'Times New Roman, serif',
      headerFontSize: '16px',
      bodyFontSize: '12px',
      dateFormat: 'MM/DD/YYYY',
    },
    styling: {
      headerStyle: 'minimal' as const,
      useAccentColor: false,
      primaryColor: cvTemplateStyle?.primaryColor || '#000000',
      secondaryColor: cvTemplateStyle?.secondaryColor || '#333333',
    },
  };

  // Override with CV template styling if available
  if (cvTemplateStyle) {
    layout.typography.fontFamily = cvTemplateStyle.fontFamily;
    layout.styling.primaryColor = cvTemplateStyle.primaryColor;
    layout.styling.secondaryColor = cvTemplateStyle.secondaryColor;
    layout.spacing.lineHeight = cvTemplateStyle.lineHeight;
  }

  // Convert margin strings to numbers (remove 'px' if present)
  const margins = {
    top: parseInt(layout.spacing.margins.top) || 40,
    bottom: parseInt(layout.spacing.margins.bottom) || 40,
    left: parseInt(layout.spacing.margins.left) || 40,
    right: parseInt(layout.spacing.margins.right) || 40,
  };

  const paragraphSpacing = parseInt(layout.spacing.paragraphSpacing) || 16;
  const lineHeight = parseFloat(layout.spacing.lineHeight) || 1.6;
  const formatDate = () => {
    const today = new Date();
    // Always use MM/DD/YYYY format for cover letter header
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Parse content to extract body (removing greetings and closings)
  const parseContent = (text: string) => {
    if (!text) return { body: '', closing: '' };

    let body = text;
    let closing = `Thank you for considering my application.\n\nSincerely,\n${cvData?.basics?.name || 'Your Name'}`;

    // STEP 1: Remove any header information that might have slipped through
    // Remove name lines (case insensitive)
    if (cvData?.basics?.name) {
      const nameUpper = cvData.basics.name.toUpperCase();
      const nameTitle = cvData.basics.name;
      body = body.replace(new RegExp(`^${nameUpper}\\s*\\n`, 'mi'), '');
      body = body.replace(new RegExp(`^${nameTitle}\\s*\\n`, 'mi'), '');
    }

    // Remove contact info lines with pipes
    body = body.replace(/^.*\|.*\|.*@.*\n/m, '');
    body = body.replace(/^\[object Object\].*\n/m, ''); // Remove [object Object] artifacts

    // Remove date lines
    body = body.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s*\n/mi, '');

    // Remove recipient info
    body = body.replace(/^(Hiring Manager|Recruitment Team|Human Resources)\s*\n/mi, '');
    body = body.replace(/^[A-Z][a-zA-Z\s&,]+(?:Inc|LLC|Ltd|Corp|Corporation|Company)\.?\s*\n/m, '');
    body = body.replace(/^[A-Z][a-z]+,\s*[A-Z]{2}\s*\n/m, ''); // City, State

    // STEP 2: Remove greeting if present
    body = body.replace(/^Dear\s+[^,\n]+,?\s*\n*/mi, '');

    // STEP 3: Extract closing if present
    const closingKeywords = ['Sincerely', 'Best regards', 'Thank you for considering'];
    for (const keyword of closingKeywords) {
      const closingIndex = body.lastIndexOf(keyword);
      if (closingIndex > -1) {
        closing = body.substring(closingIndex).trim();
        body = body.substring(0, closingIndex).trim();
        break;
      }
    }

    // STEP 4: Clean up any remaining header artifacts by scanning first few lines
    const lines = body.split('\n');
    let startIndex = 0;

    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        continue;
      }

      // Check if this line looks like actual content
      const isContent = /^I\s+/i.test(line) ||
        line.length > 50 ||
        line.startsWith('With') ||
        line.startsWith('As') ||
        line.startsWith('Having') ||
        line.startsWith('My') ||
        /^\w+\s+\w+.*[.!?]$/.test(line); // Has multiple words and ends with punctuation

      if (isContent) {
        startIndex = i;
        break;
      }
    }

    body = lines.slice(startIndex).join('\n').trim();

    return { body, closing };
  };

  const hasStructuredParts = header !== undefined || body !== undefined || footer !== undefined;
  const parsed = hasStructuredParts ? { body: '', closing: '' } : parseContent(content);

  const headerContent = header || '';
  const footerContent = footer || (hasStructuredParts ? '' : parsed.closing);
  const rawBodyContent = body || (hasStructuredParts ? '' : (parsed.body || content || ''));
  const bodyContent = rawBodyContent
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .filter((p, i, arr) => i === 0 || p !== arr[i - 1])
    .join('\n\n');

  // Parse header to extract components (new format: name, contact, date, recipient, company)
  const headerLines = headerContent.split('\n').filter(line => line.trim());
  const senderName = headerLines[0] || cvData?.basics?.name || 'Your Name';
  const senderInfo = headerLines[1] || ''; // phone, email, location
  const headerDate = headerLines[2] || formatDate();
  const recipientName = headerLines[3] || jobData?.contactPerson || jobData?.contactDetails?.name || 'Hiring Manager';
  const companyName = headerLines[4] || jobData?.company || 'Company Name';

  // Parse footer - new format: only "Sincerely," and name
  const footerLines = footerContent.split('\n').filter(line => line.trim());
  const sincerelyText = footerLines[0] || 'Sincerely,';
  const signatureName = footerLines[1] || cvData?.basics?.name || 'Your Name';

  // Get header style classes
  const getHeaderStyle = () => {
    const style = layout.styling.headerStyle;
    const color = layout.styling.useAccentColor ? layout.styling.primaryColor : layout.styling.primaryColor;

    switch (style) {
      case 'bold':
        return { fontWeight: 'bold', color };
      case 'underline':
        return { textDecoration: 'underline', color };
      case 'border':
        return {
          borderBottom: `2px solid ${color}`,
          paddingBottom: '8px',
          color
        };
      case 'minimal':
      default:
        return { color };
    }
  };

  // Calculate responsive width - maintain aspect ratio but fit container
  const aspectRatio = height / width;

  // Calculate scaling to fit container
  // We assume the parent container makes me 100% width, but I have a fixed pixel width (A4/Letter)
  // So we need to scale down if the parent is smaller than A4
  // For now, we'll use a simple CSS transform wrapper or let the parent handle it
  // But user specifically asked: "make the cover letter contianer zoom the paper preview to fit the width of contianer."

  // To do this simply, we can use CSS `zoom` or `transform: scale()`
  // But strictly, this component just renders the page. The parent typically handles the "viewport".
  // However, I can make this component responsive by default.

  // Updated rendering for class-based templates to use dynamic padding
  if (template?.className) {
    const contactItems = [];
    if (senderInfo) {
      contactItems.push(senderInfo);
    } else {
      if (cvData?.basics?.email) contactItems.push(cvData.basics.email);
      if (cvData?.basics?.phone) contactItems.push(cvData.basics.phone);
    }

    // Always add URL if available and not already in the list
    if (cvData?.basics?.url) {
      const currentString = contactItems.join(' | ');
      if (!currentString.includes(cvData.basics.url)) {
        contactItems.push(cvData.basics.url);
      }
    }

    const contactInfo = contactItems.filter(Boolean).join(' | ');

    // Get dynamic margins or default to 40px
    const paddingTop = layout.spacing?.margins?.top ? parseInt(layout.spacing.margins.top) : 40;
    const paddingBottom = layout.spacing?.margins?.bottom ? parseInt(layout.spacing.margins.bottom) : 40;
    const paddingLeft = layout.spacing?.margins?.left ? parseInt(layout.spacing.margins.left) : 40;
    const paddingRight = layout.spacing?.margins?.right ? parseInt(layout.spacing.margins.right) : 40;

    return (
      <div
        className="bg-white shadow-lg mx-auto origin-top"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          aspectRatio: `${width}/${height}`,
          transform: 'scale(1)', 
          boxSizing: 'border-box',
          overflow: 'hidden',
          backgroundColor: 'white',
          color: 'black'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .cl-container.${template.className} {
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            height: 100% !important;
            min-height: 100% !important;
          }
          .cl-container .cl-header,
          .cl-container .cl-body,
          .cl-container .cl-signoff,
          .cl-container .candidate-info,
          .cl-container .recipient-info {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        `}} />
        <div
          className={`cl-container ${template.className} text-black`}
          style={{
            height: '100%',
            paddingTop: `${paddingTop}px`,
            paddingBottom: `${paddingBottom}px`,
            paddingLeft: `${paddingLeft}px`,
            paddingRight: `${paddingRight}px`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <header className="cl-header" style={{ marginBottom: '20px' }}>
            <div className="candidate-info">
              <h1 className="candidate-name" style={{ color: 'black' }}>{senderName}</h1>
              <p className="candidate-contact">{contactInfo}</p>
            </div>

            <hr className="header-divider" style={{ margin: '15px 0' }} />

            <div className="recipient-info">
              <p className="to-label">To:</p>
              <p className="recipient-name">{recipientName}</p>
              <p className="company-name">{companyName}</p>
              <p className="company-location">{jobData?.location || ''}</p>
              <p className="cl-date">{headerDate}</p>
            </div>
          </header>

          <section className="cl-body" style={{ marginTop: '0px' }}>
            {/* Greeting removed as per request */}

            {bodyContent ? (
              bodyContent.split('\n\n').map((paragraph, index) => (
                <div key={index} className={`cl-module ${index === 0 ? 'introduction' : 'bridge'}`} style={{ marginBottom: '12px' }}>
                  {paragraph.trim().split('\n').map((line, lineIndex) => (
                    <span key={lineIndex} style={{ display: 'block' }}>{sanitizeHtml(line)}</span>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic', padding: '20px 0' }}>
                No body content found. Start writing...
              </div>
            )}

            <div className="cl-signoff" style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '20px' }}>{sanitizeHtml(sincerelyText)}</div>
              <div className="signature-name">{sanitizeHtml(signatureName)}</div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Legacy rendering fallback
  return (
    <div
      className="bg-white mx-auto shadow-lg"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        aspectRatio: `${width} / ${height}`,
        padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
        fontFamily: layout.typography.fontFamily,
        color: layout.styling.primaryColor,
        boxSizing: 'border-box',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header - Styled similar to CV template headers */}
      {headerContent && (
        <div style={{
          textAlign: layout.headerAlignment,
          marginBottom: '24px',
          fontFamily: layout.typography.fontFamily
        }}>
          {headerLines.map((line, index) => {
            if (index === 0) {
              // Name line - styled like CV header name
              return (
                <div key={index} style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: layout.styling.primaryColor,
                  marginBottom: '8px',
                  lineHeight: '1.2',
                  textTransform: 'none', // Keep original case
                  letterSpacing: '0.5px'
                }}>
                  {line}
                </div>
              );
            } else if (index === 1) {
              // Contact info line - styled like CV contact info
              return (
                <div key={index} style={{
                  fontSize: layout.typography.bodyFontSize,
                  color: layout.styling.secondaryColor,
                  marginBottom: '16px',
                  lineHeight: '1.4'
                }}>
                  {line}
                </div>
              );
            } else if (index === 2) {
              // Date line
              return (
                <div key={index} style={{
                  marginBottom: '24px',
                  textAlign: layout.datePosition,
                  fontSize: layout.typography.bodyFontSize,
                  color: layout.styling.secondaryColor,
                  lineHeight: '1.4'
                }}>
                  {line}
                </div>
              );
            } else if (index === 3) {
              // Hiring Manager line
              return (
                <div key={index} style={{
                  marginBottom: '4px',
                  textAlign: 'left',
                  fontSize: layout.typography.bodyFontSize,
                  color: layout.styling.primaryColor,
                  lineHeight: '1.4'
                }}>
                  {line}
                </div>
              );
            } else if (index === 4) {
              // Company Name line
              return (
                <div key={index} style={{
                  marginBottom: '24px',
                  textAlign: 'left',
                  fontSize: layout.typography.bodyFontSize,
                  color: layout.styling.primaryColor,
                  lineHeight: '1.4'
                }}>
                  {line}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Body Content - includes salutation as first line */}
      {bodyContent ? (
        <>
          {/* Body Content */}
          <div style={{
            marginBottom: '24px',
            fontSize: layout.typography.bodyFontSize,
            lineHeight: lineHeight,
            color: layout.styling.primaryColor,
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}>
            {bodyContent.trim() ? (
              bodyContent.split('\n\n').map((paragraph, index) => (
                <div key={index} style={{
                  marginBottom: `${paragraphSpacing}px`,
                  textAlign: 'left',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {paragraph.trim().split('\n').map((line, lineIndex) => {
                    // Handle formatting
                    let formattedLine = line;
                    const accentColor = layout.styling.useAccentColor ? layout.styling.primaryColor : layout.styling.primaryColor;

                    // Handle bold text **text**
                    formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${accentColor};">$1</strong>`);

                    // Handle italic text *text*
                    formattedLine = formattedLine.replace(/\*(.*?)\*/g, `<em style="color: ${layout.styling.primaryColor};">$1</em>`);

                    // Handle bullet points
                    if (line.trim().startsWith('•')) {
                      return (
                        <div key={lineIndex} style={{ marginLeft: '20px', marginBottom: '8px' }}>
                          <SanitizedHTML html={formattedLine} />
                        </div>
                      );
                    }

                    return (
                      <div key={lineIndex} style={{ marginBottom: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        <SanitizedHTML html={formattedLine} />
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                No body content found.
              </div>
            )}
          </div>

          {/* Footer - Only "Sincerely," and name */}
          {footerContent && footerContent.trim() && (
            <div style={{
              marginTop: '24px',
              textAlign: 'left',
              fontSize: layout.typography.bodyFontSize,
              color: layout.styling.primaryColor
            }}>
              <div style={{ marginBottom: '8px' }}>{sincerelyText}</div>
              <div>{signatureName}</div>
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
