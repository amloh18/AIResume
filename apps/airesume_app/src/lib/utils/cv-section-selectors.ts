/**
 * @deprecated This file is deprecated. Use the new Harmony Architecture instead.
 * 
 * Migration Guide:
 * 
 * OLD:
 * import { getVisibleCVSections, hasSectionData } from '@/lib/utils/cv-section-selectors';
 * 
 * NEW:
 * import { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
 * import { hasSectionData } from '@/lib/utils/cv-data-validation';
 * 
 * See HARMONY_ARCHITECTURE.md for complete documentation.
 */

// Re-export from new locations for backward compatibility
export { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
export { hasSectionData, isSectionInitialized } from '@/lib/utils/cv-data-validation';

// Legacy functions kept for transition period
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
 * @deprecated Use SECTION_REGISTRY from '@/lib/constants/cv-sections' instead
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

/**
 * @deprecated Use getSectionRegistryEntry() from '@/lib/constants/cv-sections' instead
 */
export function getSectionTitle(sectionId: string): string {
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
  return SECTION_TITLES[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/_/g, ' ');
}

/**
 * @deprecated Use getSectionRegistryEntry() from '@/lib/constants/cv-sections' instead
 */
export function getSectionIcon(sectionId: string): LucideIcon {
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
  return SECTION_ICONS[sectionId] || FileText;
}
