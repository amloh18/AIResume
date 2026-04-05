/**
 * Bidirectional data adapter between UnifiedCVDataStructure (app-wide) and
 * SnippetData (internal canvas editor model).
 *
 * The canvas editor uses a flat, simpler data shape optimised for inline
 * contentEditable editing. This module converts back and forth so the rest
 * of the app never sees the snippet model.
 */

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { ITemplate } from '@/types/template';
import type {
  SnippetData,
  SnippetBasics,
  SnippetExperienceEntry,
  SnippetEducationEntry,
  SnippetProjectEntry,
  SnippetCertificationEntry,
  SnippetSkills,
  SnippetSectionTitles,
  Zone,
  ZoneSnippet,
  CanvasTemplate,
  LayoutType,
  SnippetCategoryId,
} from './snippetTypes';
import { DEFAULT_SECTION_TITLES } from './snippetTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _uid = 0;
function uid(): string {
  return `snp_${Date.now()}_${++_uid}`;
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  const start = startDate || '';
  const end = endDate || 'Present';
  return `${start} - ${end}`;
}

function splitDateRange(dateRange: string): { startDate: string; endDate: string } {
  if (!dateRange) return { startDate: '', endDate: '' };
  const parts = dateRange.split(/\s*[-–]\s*/);
  const startDate = (parts[0] || '').trim();
  let endDate = (parts[1] || '').trim();
  if (endDate.toLowerCase() === 'present') endDate = '';
  return { startDate, endDate };
}

function highlightsToHtml(highlights: string[]): string {
  if (!highlights || highlights.length === 0) return '';
  return '<ul>' + highlights.map((h) => `<li>${h}</li>`).join('') + '</ul>';
}

function htmlToHighlights(html: string): string[] {
  if (!html) return [];
  // Extract list items from HTML
  const items: string[] = [];
  const regex = /<li>(.*?)<\/li>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) items.push(text);
  }
  // If no list items found, treat as plain text paragraphs
  if (items.length === 0) {
    const plain = html.replace(/<[^>]*>/g, '\n').trim();
    return plain.split('\n').filter((l) => l.trim());
  }
  return items;
}

// ---------------------------------------------------------------------------
// UnifiedCVDataStructure -> SnippetData
// ---------------------------------------------------------------------------

export function unifiedToSnippetData(cvData: UnifiedCVDataStructure): SnippetData {
  const basics: SnippetBasics = {
    name: cvData.basics?.name || '',
    title: cvData.basics?.label || '',
    email: cvData.basics?.email || '',
    phone: cvData.basics?.phone || '',
    location: cvData.basics?.location?.city || cvData.basics?.location?.address || '',
    website: cvData.basics?.url || '',
    summary: cvData.basics?.summary || '',
    avatar: cvData.basics?.image || '',
    showAvatar: Boolean(cvData.basics?.image),
  };

  const experience: SnippetExperienceEntry[] = (cvData.work || []).map((w, i) => ({
    id: uid(),
    company: w.name || '',
    role: w.position || '',
    date: formatDateRange(w.startDate, w.endDate),
    description: w.summary
      ? w.summary + (w.highlights?.length ? '\n' + highlightsToHtml(w.highlights) : '')
      : highlightsToHtml(w.highlights || []),
  }));

  const education: SnippetEducationEntry[] = (cvData.education || []).map((e) => ({
    id: uid(),
    institution: e.institution || '',
    degree: [e.studyType, e.area].filter(Boolean).join(' in ') || '',
    date: formatDateRange(e.startDate, e.endDate),
    description: e.description || (e.score ? `GPA: ${e.score}` : ''),
  }));

  const projects: SnippetProjectEntry[] = (cvData.projects || []).map((p) => ({
    id: uid(),
    name: p.name || '',
    role: p.keywords?.join(', ') || '',
    date: formatDateRange(p.startDate, p.endDate),
    description: p.description || highlightsToHtml(p.highlights || []),
  }));

  const certifications: SnippetCertificationEntry[] = (cvData.certificates || []).map((c) => ({
    id: uid(),
    name: c.name || '',
    issuer: c.issuer || '',
    date: c.date || '',
  }));

  // Flatten skill categories into comma-separated strings grouped by rough type
  const skillCategories = cvData.skills || [];
  const allSkills = skillCategories.flatMap((cat) => cat.skills || []);
  const skills: SnippetSkills = {
    languages: skillCategories
      .filter((c) => /language|programming/i.test(c.category))
      .flatMap((c) => c.skills)
      .join(', ') || allSkills.slice(0, Math.ceil(allSkills.length / 3)).join(', '),
    frameworks: skillCategories
      .filter((c) => /framework|library|front|back/i.test(c.category))
      .flatMap((c) => c.skills)
      .join(', ') || allSkills.slice(Math.ceil(allSkills.length / 3), Math.ceil((2 * allSkills.length) / 3)).join(', '),
    tools: skillCategories
      .filter((c) => /tool|platform|devops|database|cloud/i.test(c.category))
      .flatMap((c) => c.skills)
      .join(', ') || allSkills.slice(Math.ceil((2 * allSkills.length) / 3)).join(', '),
  };

  const sectionTitles: SnippetSectionTitles = { ...DEFAULT_SECTION_TITLES };

  return { basics, experience, education, projects, certifications, skills, sectionTitles };
}

// ---------------------------------------------------------------------------
// SnippetData -> UnifiedCVDataStructure  (merge into existing)
// ---------------------------------------------------------------------------

export function snippetDataToUnified(
  snippetData: SnippetData,
  existingCvData: UnifiedCVDataStructure,
): UnifiedCVDataStructure {
  const updated: UnifiedCVDataStructure = { ...existingCvData };

  // basics
  updated.basics = {
    ...existingCvData.basics,
    name: snippetData.basics.name,
    label: snippetData.basics.title,
    email: snippetData.basics.email,
    phone: snippetData.basics.phone,
    url: snippetData.basics.website,
    summary: snippetData.basics.summary,
    image: snippetData.basics.avatar,
    location: {
      ...existingCvData.basics?.location,
      city: snippetData.basics.location,
    },
  };

  // work
  updated.work = snippetData.experience.map((exp) => {
    const { startDate, endDate } = splitDateRange(exp.date);
    const highlights = htmlToHighlights(exp.description);
    const plainSummary = exp.description.replace(/<ul>[\s\S]*?<\/ul>/g, '').replace(/<[^>]*>/g, '').trim();
    return {
      name: exp.company,
      position: exp.role,
      url: '',
      startDate,
      endDate,
      summary: plainSummary,
      highlights,
    };
  });

  // education
  updated.education = snippetData.education.map((edu) => {
    const { startDate, endDate } = splitDateRange(edu.date);
    const degreeParts = edu.degree.split(/\s+in\s+/i);
    return {
      institution: edu.institution,
      url: '',
      area: degreeParts[1] || '',
      studyType: degreeParts[0] || edu.degree,
      startDate,
      endDate,
      score: '',
      description: edu.description,
    };
  });

  // projects
  updated.projects = snippetData.projects.map((proj) => {
    const { startDate, endDate } = splitDateRange(proj.date);
    return {
      name: proj.name,
      startDate,
      endDate,
      description: proj.description.replace(/<[^>]*>/g, ''),
      highlights: htmlToHighlights(proj.description),
      keywords: proj.role ? proj.role.split(',').map((k) => k.trim()) : [],
      url: '',
    };
  });

  // certificates
  updated.certificates = snippetData.certifications.map((cert) => ({
    name: cert.name,
    date: cert.date,
    issuer: cert.issuer,
    url: '',
    description: '',
  }));

  // skills -- reconstruct categorized skills from flat strings
  const skillEntries: { category: string; skills: string[] }[] = [];
  if (snippetData.skills.languages) {
    skillEntries.push({
      category: 'Languages',
      skills: snippetData.skills.languages.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  if (snippetData.skills.frameworks) {
    skillEntries.push({
      category: 'Frameworks',
      skills: snippetData.skills.frameworks.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  if (snippetData.skills.tools) {
    skillEntries.push({
      category: 'Tools',
      skills: snippetData.skills.tools.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  updated.skills = skillEntries.length > 0 ? skillEntries : existingCvData.skills;

  return updated;
}

// ---------------------------------------------------------------------------
// ITemplate -> Zone Configuration
// ---------------------------------------------------------------------------

const SECTION_TO_CATEGORY: Record<string, SnippetCategoryId> = {
  personal_header: 'header',
  personal: 'header',
  basics: 'header',
  summary: 'summary',
  professional_summary: 'summary',
  work_experience: 'experience',
  work: 'experience',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certificates: 'certifications',
  certifications: 'certifications',
  languages: 'languages',
  volunteer: 'volunteer',
  awards: 'awards',
  publications: 'publications',
  interests: 'interests',
  references: 'references',
  contact: 'contact',
};

function layoutTypeFromTemplate(template: ITemplate): LayoutType {
  switch (template.layoutType) {
    case 'two-column':
      return '2-col';
    case 'three-column':
      return 'sidebar-left';
    default:
      return '1-col';
  }
}

export function templateToZones(template: ITemplate): { layout: LayoutType; zones: Zone[] } {
  const layout = layoutTypeFromTemplate(template);

  const mainSections: ZoneSnippet[] = [];
  const sidebarSections: ZoneSnippet[] = [];

  // Map available sections from template to zone snippets
  const sections = template.availableSections || [];
  for (const section of sections) {
    const category = SECTION_TO_CATEGORY[section.key] || SECTION_TO_CATEGORY[section.componentName] || 'experience';
    const snippet: ZoneSnippet = {
      instanceId: uid(),
      snippetId: `${category}_default`,
      category,
    };

    // For two-column layouts, distribute sections
    if (layout === '2-col' || layout === 'sidebar-left' || layout === 'sidebar-right') {
      if (['skills', 'languages', 'certifications', 'contact', 'interests'].includes(category)) {
        sidebarSections.push(snippet);
      } else {
        mainSections.push(snippet);
      }
    } else {
      mainSections.push(snippet);
    }
  }

  // If no sections from template, use defaults
  if (mainSections.length === 0 && sidebarSections.length === 0) {
    const defaultOrder: SnippetCategoryId[] = [
      'header', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications',
    ];
    for (const cat of defaultOrder) {
      mainSections.push({ instanceId: uid(), snippetId: `${cat}_default`, category: cat });
    }
  }

  const zones: Zone[] = [
    { id: 'main', label: 'Main', snippets: mainSections },
  ];

  if (sidebarSections.length > 0) {
    zones.push({ id: 'sidebar', label: 'Sidebar', snippets: sidebarSections });
  }

  return { layout, zones };
}

// ---------------------------------------------------------------------------
// Zone State -> structure.sections (for saving)
// ---------------------------------------------------------------------------

export function zonesToStructure(zones: Zone[]): { sections: Array<{ id: string; type: string; visible: boolean; column?: 'sidebar' | 'main' }> } {
  const sections: Array<{ id: string; type: string; visible: boolean; column?: 'sidebar' | 'main' }> = [];

  for (const zone of zones) {
    for (const snippet of zone.snippets) {
      sections.push({
        id: snippet.instanceId,
        type: snippet.category,
        visible: true,
        column: zone.id === 'sidebar' ? 'sidebar' : 'main',
      });
    }
  }

  return { sections };
}

// ---------------------------------------------------------------------------
// Default canvas template for when no template is selected
// ---------------------------------------------------------------------------

export function getDefaultCanvasTemplate(): CanvasTemplate {
  const defaultOrder: SnippetCategoryId[] = [
    'header', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications',
  ];

  return {
    id: 'default-1col',
    name: 'Classic Single Column',
    category: 'professional',
    layout: '1-col',
    zones: [
      {
        id: 'main',
        label: 'Main',
        snippets: defaultOrder.map((cat) => ({
          instanceId: uid(),
          snippetId: `${cat}_default`,
          category: cat,
        })),
      },
    ],
    accentColor: '#2563eb',
  };
}
