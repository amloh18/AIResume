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
 * @param cv - CV object to check
 * @returns true if the CV is a master CV
 */
export function isMasterCV(cv: CVWithMasterFlag): boolean {
  const isMasterAtRoot = cv.isMaster === true;
  const metadataIsMaster = cv.metadata?.isMaster;
  const isMasterInMetadata = 
    metadataIsMaster === true || 
    (typeof metadataIsMaster === 'string' && metadataIsMaster === 'true');
  
  return isMasterAtRoot || isMasterInMetadata;
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
 * @param cvList - Array of CV objects
 * @returns Array of regular CVs
 */
export function filterRegularCVs<T extends CVWithMasterFlag>(cvList: T[]): T[] {
  return cvList.filter(cv => !isMasterCV(cv));
}

