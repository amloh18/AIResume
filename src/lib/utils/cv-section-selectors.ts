/**
 * CV Section Selectors
 * 
 * Centralized selector functions for determining which CV sections are visible.
 * This is the SINGLE SOURCE OF TRUTH for section visibility logic across the entire application.
 * 
 * All components should use these selectors instead of implementing their own visibility logic.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe,
  Heart,
  Star,
  BookOpen,
  Users,
  FileText
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * All possible CV section types
 */
export const ALL_CV_SECTIONS = [
  'personal_header',
  'work_experience',
  'education',
  'skills',
  'projects',
  'certificates',
  'languages',
  'volunteer',
  'awards',
  'publications',
  'interests',
  'references'
] as const;

export type CVSectionType = typeof ALL_CV_SECTIONS[number];

/**
 * Section metadata structure
 */
export interface VisibleCVSection {
  id: string;           // Section ID (structure.id or section type)
  type: string;          // Section type (e.g., 'work_experience')
  title: string;         // Display title
  icon: LucideIcon;      // Icon component
  hasData: boolean;      // Whether section contains actual data
}

/**
 * Section title mapping
 */
const SECTION_TITLES: Record<string, string> = {
  personal_header: 'Personal Information',
  work_experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certificates: 'Certificates',
  languages: 'Languages',
  volunteer: 'Volunteer Experience',
  awards: 'Awards & Recognition',
  publications: 'Publications',
  interests: 'Interests',
  references: 'References'
};

/**
 * Section icon mapping
 */
const SECTION_ICONS: Record<string, LucideIcon> = {
  personal_header: User,
  work_experience: Briefcase,
  education: GraduationCap,
  skills: Code,
  projects: FolderOpen,
  certificates: Award,
  languages: Globe,
  volunteer: Heart,
  awards: Star,
  publications: BookOpen,
  interests: Users,
  references: Users
};

/**
 * Get section title
 */
export function getSectionTitle(sectionId: string): string {
  return SECTION_TITLES[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/_/g, ' ');
}

/**
 * Get section icon
 */
export function getSectionIcon(sectionId: string): LucideIcon {
  return SECTION_ICONS[sectionId] || FileText;
}

/**
 * Check if a section has been initialized (array exists, even if empty)
 * Used to detect sections that were just added via "Add New Section" button
 */
export function isSectionInitialized(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean {
  if (!cvData) return false;

  switch (sectionType) {
    case 'personal_header':
      return true; // Always initialized
    case 'work_experience':
      return Array.isArray(cvData.work);
    case 'education':
      return Array.isArray(cvData.education);
    case 'skills':
      return Array.isArray(cvData.skills);
    case 'projects':
      return Array.isArray(cvData.projects);
    case 'certificates':
      return Array.isArray(cvData.certificates);
    case 'languages':
      return Array.isArray(cvData.languages);
    case 'volunteer':
      return Array.isArray(cvData.volunteer);
    case 'awards':
      return Array.isArray(cvData.awards);
    case 'publications':
      return Array.isArray(cvData.publications);
    case 'interests':
      return Array.isArray(cvData.interests);
    case 'references':
      return Array.isArray(cvData.references);
    default:
      return false;
  }
}

/**
 * Check if a section has actual data (not just empty arrays or default items)
 * Validates that items have at least one non-empty field
 */
export function hasSectionData(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean {
  if (!cvData) return false;

  switch (sectionType) {
    case 'personal_header':
      // Check if personal info has at least name, email, or phone
      return !!(cvData.basics?.name?.trim() || 
                cvData.basics?.email?.trim() || 
                cvData.basics?.phone?.trim());
    
    case 'work_experience':
      if (!Array.isArray(cvData.work) || cvData.work.length === 0) return false;
      // Check if at least one work entry has actual data
      return cvData.work.some(item => 
        item.name?.trim() || 
        item.position?.trim() || 
        item.summary?.trim() ||
        (item.highlights && item.highlights.length > 0)
      );
    
    case 'education':
      if (!Array.isArray(cvData.education) || cvData.education.length === 0) return false;
      return cvData.education.some(item => 
        item.institution?.trim() || 
        item.area?.trim() || 
        item.studyType?.trim()
      );
    
    case 'skills':
      if (!Array.isArray(cvData.skills) || cvData.skills.length === 0) return false;
      return cvData.skills.some(item => 
        item.category?.trim() || 
        (item.skills && Array.isArray(item.skills) && item.skills.length > 0)
      );
    
    case 'projects':
      if (!Array.isArray(cvData.projects) || cvData.projects.length === 0) return false;
      return cvData.projects.some(item => 
        item.name?.trim() || 
        item.description?.trim() ||
        (item.highlights && item.highlights.length > 0)
      );
    
    case 'certificates':
      if (!Array.isArray(cvData.certificates) || cvData.certificates.length === 0) return false;
      return cvData.certificates.some(item => 
        item.name?.trim() || 
        item.issuer?.trim()
      );
    
    case 'languages':
      if (!Array.isArray(cvData.languages) || cvData.languages.length === 0) return false;
      return cvData.languages.some(item => item.language?.trim());
    
    case 'volunteer':
      if (!Array.isArray(cvData.volunteer) || cvData.volunteer.length === 0) return false;
      return cvData.volunteer.some(item => 
        item.organization?.trim() || 
        item.position?.trim() ||
        item.summary?.trim()
      );
    
    case 'awards':
      if (!Array.isArray(cvData.awards) || cvData.awards.length === 0) return false;
      return cvData.awards.some(item => 
        item.title?.trim() || 
        item.awarder?.trim()
      );
    
    case 'publications':
      if (!Array.isArray(cvData.publications) || cvData.publications.length === 0) return false;
      return cvData.publications.some(item => 
        item.name?.trim() || 
        item.publisher?.trim()
      );
    
    case 'interests':
      if (!Array.isArray(cvData.interests) || cvData.interests.length === 0) return false;
      return cvData.interests.some(item => 
        item.name?.trim() || 
        (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0)
      );
    
    case 'references':
      if (!Array.isArray(cvData.references) || cvData.references.length === 0) return false;
      return cvData.references.some(item => 
        item.name?.trim() || 
        item.reference?.trim()
      );
    
    default:
      return false;
  }
}

/**
 * Get visible CV sections - SINGLE SOURCE OF TRUTH for section visibility
 * 
 * This function determines which sections should be visible based on:
 * 1. CV structure (for modern CVs) - sections with visible: true
 * 2. Legacy data (for backward compatibility) - sections with data or initialized arrays
 * 3. Cover letter mode - returns empty array
 * 
 * IMPORTANT: This also includes sections that exist in legacy arrays but are missing
 * from structure (newly added sections that haven't been synced to structure yet).
 * This ensures sections added via "Add New Section" button appear immediately.
 */
export function getVisibleCVSections(
  cvData: UnifiedCVDataStructure | null,
  documentType: 'cv' | 'cover-letter' = 'cv'
): VisibleCVSection[] {
  // Return empty array for cover letters
  if (documentType === 'cover-letter' || !cvData) {
    return [];
  }

  const structure = cvData.structure?.sections;
  const visibleSections: VisibleCVSection[] = [];

  // Case 1: Modern CV with structure defined
  if (structure && Array.isArray(structure) && structure.length > 0) {
    // Get sections from structure that are visible
    const structureSections = structure
      .filter(section => section.visible !== false)
      .map(section => ({
        id: section.id,
        type: section.type,
        title: getSectionTitle(section.type),
        icon: getSectionIcon(section.type),
        hasData: hasSectionData(cvData, section.type)
      }));

    visibleSections.push(...structureSections);

    // IMPORTANT: Also include sections that exist in legacy arrays but are missing from structure
    // This handles newly added sections that haven't been synced to structure yet
    const structureTypes = new Set(structure.map(s => s.type));
    
    for (const sectionType of ALL_CV_SECTIONS) {
      // Skip personal_header if it's not in structure (it's always visible anyway)
      if (sectionType === 'personal_header' && !structureTypes.has(sectionType)) {
        // Add personal_header if it's initialized (always true) but not in structure
        visibleSections.push({
          id: sectionType,
          type: sectionType,
          title: getSectionTitle(sectionType),
          icon: getSectionIcon(sectionType),
          hasData: hasSectionData(cvData, sectionType)
        });
        continue;
      }

      // For other sections, check if they're initialized but not in structure
      if (!structureTypes.has(sectionType) && isSectionInitialized(cvData, sectionType)) {
        visibleSections.push({
          id: sectionType,
          type: sectionType,
          title: getSectionTitle(sectionType),
          icon: getSectionIcon(sectionType),
          hasData: hasSectionData(cvData, sectionType)
        });
      }
    }

    // Ensure personal_header is always first
    const personalHeaderIndex = visibleSections.findIndex(s => s.type === 'personal_header');
    if (personalHeaderIndex > 0) {
      const personalHeader = visibleSections.splice(personalHeaderIndex, 1)[0];
      visibleSections.unshift(personalHeader);
    }

    return visibleSections;
  }

  // Case 2: Legacy CV (no structure) - show sections that have data OR have been initialized
  // Personal header is always shown
  const legacySections: VisibleCVSection[] = [];

  // Always include personal_header
  legacySections.push({
    id: 'personal_header',
    type: 'personal_header',
    title: getSectionTitle('personal_header'),
    icon: getSectionIcon('personal_header'),
    hasData: hasSectionData(cvData, 'personal_header')
  });

  // Add other sections that have data or are initialized
  for (const sectionType of ALL_CV_SECTIONS) {
    if (sectionType === 'personal_header') continue; // Already added

    if (hasSectionData(cvData, sectionType) || isSectionInitialized(cvData, sectionType)) {
      legacySections.push({
        id: sectionType,
        type: sectionType,
        title: getSectionTitle(sectionType),
        icon: getSectionIcon(sectionType),
        hasData: hasSectionData(cvData, sectionType)
      });
    }
  }

  return legacySections;
}

