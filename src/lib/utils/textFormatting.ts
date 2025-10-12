/**
 * Text formatting utilities for CV content
 */

/**
 * Parse formatted text and return HTML string with proper styling
 */
export const parseFormattedText = (text: string): string => {
  if (!text) return '';

  // Split by line breaks first
  const lines = text.split('\n');
  const result: string[] = [];

  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      result.push('<br />');
      return;
    }

    // Parse alignment tags
    let processedLine = line;
    let alignment: 'left' | 'center' | 'right' | undefined;

    // Check for alignment tags
    if (line.includes('[LEFT]') && line.includes('[/LEFT]')) {
      alignment = 'left';
      processedLine = line.replace(/\[LEFT\]/g, '').replace(/\[\/LEFT\]/g, '');
    } else if (line.includes('[CENTER]') && line.includes('[/CENTER]')) {
      alignment = 'center';
      processedLine = line.replace(/\[CENTER\]/g, '').replace(/\[\/CENTER\]/g, '');
    } else if (line.includes('[RIGHT]') && line.includes('[/RIGHT]')) {
      alignment = 'right';
      processedLine = line.replace(/\[RIGHT\]/g, '').replace(/\[\/RIGHT\]/g, '');
    }

    // Parse markdown-style formatting
    let formattedContent = processedLine;
    
    // Handle bold text
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle bullet points
    if (processedLine.startsWith('• ')) {
      formattedContent = formattedContent.replace(/^• /, '');
      const style = `text-align: ${alignment || 'justify'}; margin-left: 20px; position: relative;`;
      result.push(
        `<div style="${style}">
          <span style="position: absolute; left: -15px;">•</span>
          <span>${formattedContent}</span>
        </div>`
      );
    } else if (processedLine.match(/^\d+\. /)) {
      // Handle numbered lists
      const match = processedLine.match(/^(\d+)\. (.*)/);
      if (match) {
        const [, number, content] = match;
        const style = `text-align: ${alignment || 'justify'}; margin-left: 20px; position: relative;`;
        result.push(
          `<div style="${style}">
            <span style="position: absolute; left: -15px;">${number}.</span>
            <span>${content}</span>
          </div>`
        );
      }
    } else {
      // Regular paragraph - use justify alignment for better text distribution
      const style = `text-align: ${alignment || 'justify'}; margin: 0 0 4px 0;`;
      result.push(`<p style="${style}">${formattedContent}</p>`);
    }
  });

  return result.join('');
};

/**
 * Simple function to convert line breaks to paragraphs
 */
export const convertLineBreaksToParagraphs = (text: string): string => {
  if (!text) return '';
  
  return text.split('\n')
    .map(line => `<p style="margin: 0 0 4px 0;">${line}</p>`)
    .join('');
};

/**
 * Strip HTML tags from text
 */
export const stripHtmlTags = (text: string): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
};

/**
 * Format date with proper handling of "Present"
 */
export const formatDate = (dateString: string): string => {
  if (!dateString || dateString.toLowerCase() === 'present') return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  } catch {
    return dateString;
  }
};

/**
 * Format date range with proper handling of "Present"
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = formatDate(startDate);
  const end = endDate && endDate.toLowerCase() !== 'present' ? formatDate(endDate) : 'Present';
  return `${start} - ${end}`;
};
