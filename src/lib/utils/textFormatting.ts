/**
 * Text formatting utilities for CV content
 */

/**
 * Date format style options for CV templates
 */
export type DateFormatStyle = 'MMM_YYYY' | 'MM_YYYY' | 'DD_MM_YYYY' | 'MM_DD_YYYY';

/**
 * Date format display labels for UI
 */
export const DATE_FORMAT_OPTIONS: { value: DateFormatStyle; label: string; example: string }[] = [
  { value: 'MMM_YYYY', label: 'Month Year', example: 'Dec 2025 - Jan 2026' },
  { value: 'MM_YYYY', label: 'MM/YYYY', example: '12/2025 - 01/2026' },
  { value: 'DD_MM_YYYY', label: 'DD/MM/YYYY', example: '01/12/2025 - 01/01/2026' },
  { value: 'MM_DD_YYYY', label: 'MM/DD/YYYY (US)', example: '12/01/2025 - 01/01/2026' },
];

/**
 * Normalize bullet point characters to standard dot (•)
 * Converts hyphens and asterisks at line start to bullet dots
 */
export const normalizeBulletPoints = (text: string): string => {
  if (!text) return '';
  // Replace markdown-style hyphens and asterisks at line start with •
  // Matches: "- text", "* text", "  - text", etc.
  return text.replace(/^(\s*)[-*]\s+/gm, '$1• ');
};

/**
 * Strip leading bullet characters from text
 * Used when template CSS already adds bullets via ::before pseudo-element
 */
export const stripLeadingBullets = (text: string): string => {
  if (!text) return '';
  // Remove leading bullet characters (•, -, *, ◦, ▪) from each line
  return text.replace(/^(\s*)[•\-*◦▪]\s*/gm, '$1');
};

/**
 * Render HTML content safely, preserving formatting from WYSIWYG editor
 * This function handles both HTML (from WYSIWYG) and markdown-style text
 * 
 * Bullet handling:
 * - For HTML with <li> tags: strips bullet chars inside <li> since browser adds disc bullets
 * - For plain text: preserves bullet chars since they're the only bullet indicator
 */
export const renderFormattedText = (text: string, options?: { stripBullets?: boolean }): string => {
  if (!text) return '';

  // Normalize bullet characters first (convert - and * to •)
  let normalizedText = normalizeBulletPoints(text);

  // Check if text contains HTML tags (from WYSIWYG editor)
  const hasHTML = /<[^>]+>/g.test(normalizedText);

  if (hasHTML) {
    // Text already contains HTML from WYSIWYG editor
    // Always strip bullet chars inside <li> tags since HTML lists render their own bullets
    normalizedText = normalizedText.replace(/(<li[^>]*>)\s*[•\-*◦▪]\s*/gi, '$1');
    return normalizedText;
  }

  // For plain text WITHOUT HTML, keep the bullets as-is
  // They are the intended formatting from the editor or AI
  // Only strip if explicitly requested via options
  if (options?.stripBullets === true) {
    normalizedText = stripLeadingBullets(normalizedText);
  }

  // Fallback to markdown parsing for backward compatibility
  return parseFormattedText(normalizedText);
};



/**
 * Parse formatted text and return HTML string with proper styling
 * (Legacy function for markdown-style text)
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
 * Parse a date string and extract year, month, day
 * Handles various formats: YYYY-MM-DD, YYYY-MM, YYYY, MM/YYYY, etc.
 */
const parseDateParts = (dateString: string): { year: number; month: number; day: number } | null => {
  if (!dateString) return null;

  const cleaned = dateString.trim();

  // Handle "Present" or empty
  if (!cleaned || cleaned.toLowerCase() === 'present') {
    return null;
  }

  // Try ISO format: YYYY-MM-DD or YYYY-MM
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: isoMatch[3] ? parseInt(isoMatch[3], 10) : 1
    };
  }

  // Try MM/YYYY format
  const mmYearMatch = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYearMatch) {
    return {
      year: parseInt(mmYearMatch[2], 10),
      month: parseInt(mmYearMatch[1], 10),
      day: 1
    };
  }

  // Try MM/DD/YYYY or DD/MM/YYYY format (ambiguous, assume MM/DD/YYYY for US)
  const fullDateMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullDateMatch) {
    return {
      year: parseInt(fullDateMatch[3], 10),
      month: parseInt(fullDateMatch[1], 10),
      day: parseInt(fullDateMatch[2], 10)
    };
  }

  // Try just year YYYY
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    return {
      year: parseInt(yearMatch[1], 10),
      month: 1,
      day: 1
    };
  }

  // Try Date parsing as fallback
  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      };
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a single date with the specified style
 */
export const formatDateWithStyle = (dateString: string, style: DateFormatStyle = 'MMM_YYYY'): string => {
  if (!dateString || dateString.toLowerCase() === 'present') {
    return 'Present';
  }

  const parts = parseDateParts(dateString);
  if (!parts) return dateString; // Return original if parsing fails

  const { year, month, day } = parts;
  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');

  switch (style) {
    case 'MMM_YYYY':
      return `${MONTH_NAMES[month - 1]} ${year}`;
    case 'MM_YYYY':
      return `${paddedMonth}/${year}`;
    case 'DD_MM_YYYY':
      return `${paddedDay}/${paddedMonth}/${year}`;
    case 'MM_DD_YYYY':
      return `${paddedMonth}/${paddedDay}/${year}`;
    default:
      return `${MONTH_NAMES[month - 1]} ${year}`;
  }
};

/**
 * Format date range with specified style and proper handling of "Present"
 */
export const formatDateRangeWithStyle = (
  startDate: string,
  endDate: string,
  style: DateFormatStyle = 'MMM_YYYY'
): string => {
  const start = formatDateWithStyle(startDate, style);
  const isPresent = !endDate || endDate.toLowerCase() === 'present';
  const end = isPresent ? 'Present' : formatDateWithStyle(endDate, style);

  // Handle edge case where start is empty
  if (!start || start === 'Present') {
    return end;
  }

  return `${start} - ${end}`;
};

/**
 * Format date with proper handling of "Present" (legacy, uses MMM YYYY format)
 */
export const formatDate = (dateString: string): string => {
  return formatDateWithStyle(dateString, 'MMM_YYYY');
};

/**
 * Format date range with proper handling of "Present" (legacy, uses MMM YYYY format)
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  return formatDateRangeWithStyle(startDate, endDate, 'MMM_YYYY');
};
