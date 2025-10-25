/**
 * Date Normalization Utility
 * 
 * Converts various date formats to YYYY-MM format for month input fields
 */

/**
 * Normalizes a date string to YYYY-MM format
 * Handles: YYYY, YYYY-MM, YYYY-MM-DD, timestamps, etc.
 * 
 * @param value - The date value to normalize
 * @returns Normalized date in YYYY-MM format, or empty string if invalid
 */
export function normalizeToMonthFormat(value: any): string {
  // Handle empty or invalid input
  if (!value) return '';
  
  // Convert to string if needed
  const dateStr = String(value).trim();
  if (!dateStr) return '';
  
  // Already in YYYY-MM format
  const yyyyMmMatch = dateStr.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (yyyyMmMatch) {
    return yyyyMmMatch[0];
  }
  
  // YYYY-MM-DD format -> extract YYYY-MM
  const yyyyMmDdMatch = dateStr.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  if (yyyyMmDdMatch) {
    return `${yyyyMmDdMatch[1]}-${yyyyMmDdMatch[2]}`;
  }
  
  // Just YYYY format -> default to January
  const yyyyMatch = dateStr.match(/^(\d{4})$/);
  if (yyyyMatch) {
    return `${yyyyMatch[1]}-01`;
  }
  
  // MM/YYYY or MM-YYYY format
  const mmYyyyMatch = dateStr.match(/^(0[1-9]|1[0-2])[\/\-](\d{4})$/);
  if (mmYyyyMatch) {
    return `${mmYyyyMatch[2]}-${mmYyyyMatch[1]}`;
  }
  
  // YYYY/MM or YYYY-MM with wrong separator
  const yyyyMmSlashMatch = dateStr.match(/^(\d{4})[\/]+(0[1-9]|1[0-2])$/);
  if (yyyyMmSlashMatch) {
    return `${yyyyMmSlashMatch[1]}-${yyyyMmSlashMatch[2]}`;
  }
  
  // Try to parse as a date object
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Sanity check: year should be reasonable (1900-2100)
      if (year >= 1900 && year <= 2100) {
        return `${year}-${month}`;
      }
    }
  } catch (error) {
    // Failed to parse as date
  }
  
  // If all else fails, return empty string
  console.warn(`Unable to normalize date: "${dateStr}"`);
  return '';
}

/**
 * Normalizes dates in work experience entries
 */
export function normalizeWorkDates(work: any[]): any[] {
  if (!Array.isArray(work)) return [];
  
  return work.map(entry => ({
    ...entry,
    startDate: normalizeToMonthFormat(entry.startDate),
    endDate: normalizeToMonthFormat(entry.endDate)
  }));
}

/**
 * Normalizes dates in education entries
 */
export function normalizeEducationDates(education: any[]): any[] {
  if (!Array.isArray(education)) return [];
  
  return education.map(entry => ({
    ...entry,
    startDate: normalizeToMonthFormat(entry.startDate),
    endDate: normalizeToMonthFormat(entry.endDate)
  }));
}

/**
 * Normalizes dates in project entries
 */
export function normalizeProjectDates(projects: any[]): any[] {
  if (!Array.isArray(projects)) return [];
  
  return projects.map(entry => ({
    ...entry,
    startDate: normalizeToMonthFormat(entry.startDate),
    endDate: normalizeToMonthFormat(entry.endDate)
  }));
}

