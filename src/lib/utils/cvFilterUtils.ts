/**
 * Utility functions for filtering and processing CV data
 */

export interface CVWithMasterFlag {
  isMaster?: boolean;
  metadata?: {
    isMaster?: boolean | string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Determines if a CV is a master CV by checking both old and new format flags
 * Master CV criteria: isMaster: true OR createdVia: 'ai-career-report'
 * @param cv - CV object to check
 * @returns true if the CV is a master CV
 */
export function isMasterCV(cv: CVWithMasterFlag): boolean {
  const isMasterAtRoot = cv.isMaster === true;
  const metadataIsMaster = cv.metadata?.isMaster;
  const isMasterInMetadata = 
    metadataIsMaster === true || 
    (typeof metadataIsMaster === 'string' && metadataIsMaster === 'true');
  
  // Check createdVia for ai-career-report CVs (Master CV indicator)
  const createdVia = cv.metadata?.createdVia;
  const isCreatedViaAICareerReport = createdVia === 'ai-career-report';
  
  // Master CV: isMaster: true OR createdVia: 'ai-career-report'
  return isMasterAtRoot || isMasterInMetadata || isCreatedViaAICareerReport;
}

/**
 * Filters a list of CVs to return only master CVs
 * @param cvList - Array of CV objects
 * @returns Array of master CVs
 */
export function filterMasterCVs<T extends CVWithMasterFlag>(cvList: T[]): T[] {
  return cvList.filter(cv => isMasterCV(cv));
}

/**
 * Filters a list of CVs to return only regular (non-master) CVs
 * Regular CV criteria: isMaster: false AND NOT createdVia: 'ai-career-report'
 * CVs with createdVia: 'journey' are regular CVs
 * @param cvList - Array of CV objects
 * @returns Array of regular CVs
 */
export function filterRegularCVs<T extends CVWithMasterFlag>(cvList: T[]): T[] {
  return cvList.filter(cv => {
    // Regular CV: NOT a master CV
    // This includes CVs with isMaster: false and createdVia: 'journey'
    return !isMasterCV(cv);
  });
}

