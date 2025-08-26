import { CVDataStructure } from '@/types/cv';

/**
 * Generates an automatic CV name based on professional title and summary
 * @param cvData - The CV data structure
 * @returns A formatted CV name
 */
export const generateCVName = (cvData: CVDataStructure): string => {
  const { basics } = cvData;
  
  // If we have a professional title, use it as the base
  if (basics?.label && basics.label.trim()) {
    const title = basics.label.trim();
    
    // If we have a name, combine them: "John Doe - Software Engineer"
    if (basics?.name && basics.name.trim()) {
      return `${basics.name.trim()} - ${title}`;
    }
    
    // Otherwise just use the title: "Software Engineer"
    return title;
  }
  
  // If no title but we have a name, use the name
  if (basics?.name && basics.name.trim()) {
    return `${basics.name.trim()} - CV`;
  }
  
  // Fallback to a generic name
  return 'Untitled CV';
};

/**
 * Generates a description based on the professional summary
 * @param cvData - The CV data structure
 * @returns A brief description
 */
export const generateCVDescription = (cvData: CVDataStructure): string => {
  const { basics } = cvData;
  
  if (basics?.summary && basics.summary.trim()) {
    const summary = basics.summary.trim();
    
    // Take the first sentence or first 100 characters
    const firstSentence = summary.split(/[.!?]/)[0];
    const truncated = firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence;
    
    return truncated;
  }
  
  // Fallback descriptions based on available data
  if (basics?.label && basics.label.trim()) {
    return `${basics.label.trim()} with professional experience`;
  }
  
  if (basics?.name && basics.name.trim()) {
    return `Professional CV for ${basics.name.trim()}`;
  }
  
  return 'Professional CV';
};

/**
 * Updates CV title and description automatically when CV data changes
 * @param cvData - The CV data structure
 * @returns Object with title and description
 */
export const getCVMetadata = (cvData: CVDataStructure) => {
  return {
    title: generateCVName(cvData),
    description: generateCVDescription(cvData)
  };
};
