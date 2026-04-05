'use client';

/**
 * Snippet Registry -- render variants for each CV section category.
 *
 * Each snippet is a pure function that receives SnippetRenderProps and
 * returns JSX representing that section on the CV document. The canvas
 * editor looks up snippets by id to render each zone slot.
 */

import React from 'react';
import type {
  SnippetData,
  SnippetCategoryId,
  DesignVars,
  SnippetVariant,
  CanvasTemplate,
  LayoutType,
} from './snippetTypes';
import { DEFAULT_DESIGN_VARS } from './snippetTypes';
import EditableField from './EditableField';

// ---------------------------------------------------------------------------
// Typography Constants
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  heading: 'font-bold tracking-tight',
  subheading: 'font-semibold text-sm',
  body: 'text-xs leading-relaxed',
  caption: 'text-[10px] text-gray-500',
  accent: 'text-[var(--cv-accent)]',
};

// ---------------------------------------------------------------------------
// Section Title Styles
// ---------------------------------------------------------------------------

export const TITLE_STYLES = {
  bordered: 'border-b-2 border-[var(--cv-accent)] pb-1 mb-3 font-bold uppercase tracking-wider text-sm',
  minimal: 'mb-2 font-semibold text-sm text-gray-700',
  accent: 'mb-3 font-bold text-sm text-[var(--cv-accent)] uppercase tracking-widest',
  spaced: 'mb-3 font-bold text-sm tracking-[0.2em] uppercase text-gray-600',
  underline: 'mb-3 font-bold text-sm border-b border-gray-300 pb-1',
} as const;

// ---------------------------------------------------------------------------
// Snippet Render Helpers
// ---------------------------------------------------------------------------

function SectionTitle({ title, style = 'bordered' }: { title: string; style?: keyof typeof TITLE_STYLES }) {
  return <h3 className={TITLE_STYLES[style]}>{title}</h3>;
}

// ---------------------------------------------------------------------------
// HEADER Snippets
// ---------------------------------------------------------------------------

const headerDefault: SnippetVariant = {
  id: 'header_default',
  category: 'header',
  name: 'Classic Header',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="text-center mb-4">
      <EditableField
        value={data.basics.name}
        onChange={(v) => onFieldChange('basics.name', v)}
        className="text-2xl font-bold"
        tag="h1"
        editable={isEditing}
      />
      <EditableField
        value={data.basics.title}
        onChange={(v) => onFieldChange('basics.title', v)}
        className="text-sm text-[var(--cv-accent)] mt-1"
        editable={isEditing}
      />
      <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] text-gray-500">
        {data.basics.email && <span>{data.basics.email}</span>}
        {data.basics.phone && <span>{data.basics.phone}</span>}
        {data.basics.location && <span>{data.basics.location}</span>}
        {data.basics.website && <span>{data.basics.website}</span>}
      </div>
    </div>
  ),
};

const headerSidebar: SnippetVariant = {
  id: 'header_sidebar',
  category: 'header',
  name: 'Sidebar Header',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      {data.basics.showAvatar && data.basics.avatar && (
        <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3 overflow-hidden">
          <img src={data.basics.avatar} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <EditableField
        value={data.basics.name}
        onChange={(v) => onFieldChange('basics.name', v)}
        className="text-lg font-bold"
        tag="h1"
        editable={isEditing}
      />
      <EditableField
        value={data.basics.title}
        onChange={(v) => onFieldChange('basics.title', v)}
        className="text-xs text-[var(--cv-accent)] mt-1"
        editable={isEditing}
      />
    </div>
  ),
};

const headerModern: SnippetVariant = {
  id: 'header_modern',
  category: 'header',
  name: 'Modern Header',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="flex items-center gap-4 mb-4 pb-3 border-b-2 border-[var(--cv-accent)]">
      {data.basics.showAvatar && data.basics.avatar && (
        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          <img src={data.basics.avatar} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1">
        <EditableField
          value={data.basics.name}
          onChange={(v) => onFieldChange('basics.name', v)}
          className="text-2xl font-bold"
          tag="h1"
          editable={isEditing}
        />
        <EditableField
          value={data.basics.title}
          onChange={(v) => onFieldChange('basics.title', v)}
          className="text-sm text-[var(--cv-accent)]"
          editable={isEditing}
        />
        <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-gray-500">
          {data.basics.email && <span>{data.basics.email}</span>}
          {data.basics.phone && <span>{data.basics.phone}</span>}
          {data.basics.location && <span>{data.basics.location}</span>}
        </div>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// SUMMARY Snippets
// ---------------------------------------------------------------------------

const summaryDefault: SnippetVariant = {
  id: 'summary_default',
  category: 'summary',
  name: 'Standard Summary',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.summary} />
      <EditableField
        value={data.basics.summary}
        onChange={(v) => onFieldChange('basics.summary', v)}
        className="text-xs leading-relaxed text-gray-700"
        editable={isEditing}
      />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// EXPERIENCE Snippets
// ---------------------------------------------------------------------------

const experienceDefault: SnippetVariant = {
  id: 'experience_default',
  category: 'experience',
  name: 'Classic Experience',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.experience} />
      <div className="space-y-3">
        {data.experience.map((exp, i) => (
          <div key={exp.id} className="group">
            <div className="flex justify-between items-start">
              <div>
                <EditableField
                  value={exp.role}
                  onChange={(v) => onFieldChange(`experience.${i}.role`, v)}
                  className="font-semibold text-sm"
                  editable={isEditing}
                />
                <EditableField
                  value={exp.company}
                  onChange={(v) => onFieldChange(`experience.${i}.company`, v)}
                  className="text-xs text-[var(--cv-accent)]"
                  editable={isEditing}
                />
              </div>
              <EditableField
                value={exp.date}
                onChange={(v) => onFieldChange(`experience.${i}.date`, v)}
                className="text-[10px] text-gray-500 whitespace-nowrap"
                editable={isEditing}
              />
            </div>
            <EditableField
              value={exp.description}
              onChange={(v) => onFieldChange(`experience.${i}.description`, v)}
              className="text-xs text-gray-600 mt-1"
              editable={isEditing}
              multiline
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

const experienceTimeline: SnippetVariant = {
  id: 'experience_timeline',
  category: 'experience',
  name: 'Timeline Experience',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.experience} style="accent" />
      <div className="space-y-3 border-l-2 border-[var(--cv-accent)] pl-4">
        {data.experience.map((exp, i) => (
          <div key={exp.id} className="relative">
            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--cv-accent)]" />
            <EditableField
              value={exp.date}
              onChange={(v) => onFieldChange(`experience.${i}.date`, v)}
              className="text-[10px] text-gray-500"
              editable={isEditing}
            />
            <EditableField
              value={exp.role}
              onChange={(v) => onFieldChange(`experience.${i}.role`, v)}
              className="font-semibold text-sm"
              editable={isEditing}
            />
            <EditableField
              value={exp.company}
              onChange={(v) => onFieldChange(`experience.${i}.company`, v)}
              className="text-xs text-[var(--cv-accent)]"
              editable={isEditing}
            />
            <EditableField
              value={exp.description}
              onChange={(v) => onFieldChange(`experience.${i}.description`, v)}
              className="text-xs text-gray-600 mt-1"
              editable={isEditing}
              multiline
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// EDUCATION Snippets
// ---------------------------------------------------------------------------

const educationDefault: SnippetVariant = {
  id: 'education_default',
  category: 'education',
  name: 'Classic Education',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.education} />
      <div className="space-y-2">
        {data.education.map((edu, i) => (
          <div key={edu.id}>
            <div className="flex justify-between items-start">
              <div>
                <EditableField
                  value={edu.degree}
                  onChange={(v) => onFieldChange(`education.${i}.degree`, v)}
                  className="font-semibold text-sm"
                  editable={isEditing}
                />
                <EditableField
                  value={edu.institution}
                  onChange={(v) => onFieldChange(`education.${i}.institution`, v)}
                  className="text-xs text-[var(--cv-accent)]"
                  editable={isEditing}
                />
              </div>
              <EditableField
                value={edu.date}
                onChange={(v) => onFieldChange(`education.${i}.date`, v)}
                className="text-[10px] text-gray-500 whitespace-nowrap"
                editable={isEditing}
              />
            </div>
            {edu.description && (
              <EditableField
                value={edu.description}
                onChange={(v) => onFieldChange(`education.${i}.description`, v)}
                className="text-xs text-gray-600 mt-1"
                editable={isEditing}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// SKILLS Snippets
// ---------------------------------------------------------------------------

const skillsDefault: SnippetVariant = {
  id: 'skills_default',
  category: 'skills',
  name: 'Grouped Skills',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.skills} />
      <div className="space-y-1.5">
        {data.skills.languages && (
          <div className="flex gap-1">
            <span className="font-semibold text-xs min-w-[80px]">Languages:</span>
            <EditableField
              value={data.skills.languages}
              onChange={(v) => onFieldChange('skills.languages', v)}
              className="text-xs text-gray-600"
              editable={isEditing}
            />
          </div>
        )}
        {data.skills.frameworks && (
          <div className="flex gap-1">
            <span className="font-semibold text-xs min-w-[80px]">Frameworks:</span>
            <EditableField
              value={data.skills.frameworks}
              onChange={(v) => onFieldChange('skills.frameworks', v)}
              className="text-xs text-gray-600"
              editable={isEditing}
            />
          </div>
        )}
        {data.skills.tools && (
          <div className="flex gap-1">
            <span className="font-semibold text-xs min-w-[80px]">Tools:</span>
            <EditableField
              value={data.skills.tools}
              onChange={(v) => onFieldChange('skills.tools', v)}
              className="text-xs text-gray-600"
              editable={isEditing}
            />
          </div>
        )}
      </div>
    </div>
  ),
};

const skillsChips: SnippetVariant = {
  id: 'skills_chips',
  category: 'skills',
  name: 'Chip Skills',
  render: ({ data }) => {
    const allSkills = [data.skills.languages, data.skills.frameworks, data.skills.tools]
      .filter(Boolean)
      .join(', ')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return (
      <div className="mb-4">
        <SectionTitle title={data.sectionTitles.skills} />
        <div className="flex flex-wrap gap-1.5">
          {allSkills.map((skill, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-[var(--cv-accent)]/10 text-[var(--cv-accent)] rounded text-[10px] font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// PROJECTS Snippets
// ---------------------------------------------------------------------------

const projectsDefault: SnippetVariant = {
  id: 'projects_default',
  category: 'projects',
  name: 'Classic Projects',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.projects} />
      <div className="space-y-2">
        {data.projects.map((proj, i) => (
          <div key={proj.id}>
            <div className="flex justify-between items-start">
              <EditableField
                value={proj.name}
                onChange={(v) => onFieldChange(`projects.${i}.name`, v)}
                className="font-semibold text-sm"
                editable={isEditing}
              />
              <EditableField
                value={proj.date}
                onChange={(v) => onFieldChange(`projects.${i}.date`, v)}
                className="text-[10px] text-gray-500 whitespace-nowrap"
                editable={isEditing}
              />
            </div>
            {proj.role && (
              <EditableField
                value={proj.role}
                onChange={(v) => onFieldChange(`projects.${i}.role`, v)}
                className="text-[10px] text-[var(--cv-accent)]"
                editable={isEditing}
              />
            )}
            <EditableField
              value={proj.description}
              onChange={(v) => onFieldChange(`projects.${i}.description`, v)}
              className="text-xs text-gray-600 mt-1"
              editable={isEditing}
              multiline
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// CERTIFICATIONS Snippets
// ---------------------------------------------------------------------------

const certificationsDefault: SnippetVariant = {
  id: 'certifications_default',
  category: 'certifications',
  name: 'Classic Certifications',
  render: ({ data, isEditing, onFieldChange }) => (
    <div className="mb-4">
      <SectionTitle title={data.sectionTitles.certifications} />
      <div className="space-y-1.5">
        {data.certifications.map((cert, i) => (
          <div key={cert.id} className="flex justify-between">
            <div>
              <EditableField
                value={cert.name}
                onChange={(v) => onFieldChange(`certifications.${i}.name`, v)}
                className="text-sm font-medium"
                editable={isEditing}
              />
              <EditableField
                value={cert.issuer}
                onChange={(v) => onFieldChange(`certifications.${i}.issuer`, v)}
                className="text-[10px] text-gray-500"
                editable={isEditing}
              />
            </div>
            <EditableField
              value={cert.date}
              onChange={(v) => onFieldChange(`certifications.${i}.date`, v)}
              className="text-[10px] text-gray-500 whitespace-nowrap"
              editable={isEditing}
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// CONTACT Snippet (for sidebar layouts)
// ---------------------------------------------------------------------------

const contactDefault: SnippetVariant = {
  id: 'contact_default',
  category: 'contact',
  name: 'Contact Info',
  render: ({ data }) => (
    <div className="mb-4">
      <SectionTitle title="Contact" style="minimal" />
      <div className="space-y-1 text-xs text-gray-600">
        {data.basics.email && <div>{data.basics.email}</div>}
        {data.basics.phone && <div>{data.basics.phone}</div>}
        {data.basics.location && <div>{data.basics.location}</div>}
        {data.basics.website && <div>{data.basics.website}</div>}
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Snippet Registry
// ---------------------------------------------------------------------------

export const SNIPPETS: Record<string, SnippetVariant> = {
  // Header
  header_default: headerDefault,
  header_sidebar: headerSidebar,
  header_modern: headerModern,

  // Summary
  summary_default: summaryDefault,

  // Experience
  experience_default: experienceDefault,
  experience_timeline: experienceTimeline,

  // Education
  education_default: educationDefault,

  // Skills
  skills_default: skillsDefault,
  skills_chips: skillsChips,

  // Projects
  projects_default: projectsDefault,

  // Certifications
  certifications_default: certificationsDefault,

  // Contact
  contact_default: contactDefault,
};

/** Get all snippets for a given category */
export function getSnippetsForCategory(category: SnippetCategoryId): SnippetVariant[] {
  return Object.values(SNIPPETS).filter((s) => s.category === category);
}

// ---------------------------------------------------------------------------
// Canvas Templates (layout presets)
// ---------------------------------------------------------------------------

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'classic-1col',
    name: 'Classic',
    category: 'professional',
    layout: '1-col',
    zones: [
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't1_1', snippetId: 'header_default', category: 'header' },
          { instanceId: 't1_2', snippetId: 'summary_default', category: 'summary' },
          { instanceId: 't1_3', snippetId: 'experience_default', category: 'experience' },
          { instanceId: 't1_4', snippetId: 'education_default', category: 'education' },
          { instanceId: 't1_5', snippetId: 'skills_default', category: 'skills' },
          { instanceId: 't1_6', snippetId: 'projects_default', category: 'projects' },
          { instanceId: 't1_7', snippetId: 'certifications_default', category: 'certifications' },
        ],
      },
    ],
    accentColor: '#2563eb',
  },
  {
    id: 'modern-2col',
    name: 'Modern Two-Column',
    category: 'modern',
    layout: 'sidebar-left',
    zones: [
      {
        id: 'sidebar',
        label: 'Sidebar',
        snippets: [
          { instanceId: 't2_1', snippetId: 'header_sidebar', category: 'header' },
          { instanceId: 't2_2', snippetId: 'contact_default', category: 'contact' },
          { instanceId: 't2_3', snippetId: 'skills_chips', category: 'skills' },
          { instanceId: 't2_4', snippetId: 'certifications_default', category: 'certifications' },
        ],
      },
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't2_5', snippetId: 'summary_default', category: 'summary' },
          { instanceId: 't2_6', snippetId: 'experience_default', category: 'experience' },
          { instanceId: 't2_7', snippetId: 'education_default', category: 'education' },
          { instanceId: 't2_8', snippetId: 'projects_default', category: 'projects' },
        ],
      },
    ],
    accentColor: '#0d9488',
  },
  {
    id: 'sidebar-right',
    name: 'Sidebar Right',
    category: 'professional',
    layout: 'sidebar-right',
    zones: [
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't3_1', snippetId: 'header_modern', category: 'header' },
          { instanceId: 't3_2', snippetId: 'summary_default', category: 'summary' },
          { instanceId: 't3_3', snippetId: 'experience_default', category: 'experience' },
          { instanceId: 't3_4', snippetId: 'education_default', category: 'education' },
        ],
      },
      {
        id: 'sidebar',
        label: 'Sidebar',
        snippets: [
          { instanceId: 't3_5', snippetId: 'contact_default', category: 'contact' },
          { instanceId: 't3_6', snippetId: 'skills_default', category: 'skills' },
          { instanceId: 't3_7', snippetId: 'projects_default', category: 'projects' },
          { instanceId: 't3_8', snippetId: 'certifications_default', category: 'certifications' },
        ],
      },
    ],
    accentColor: '#7c3aed',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    category: 'creative',
    layout: '1-col',
    zones: [
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't4_1', snippetId: 'header_modern', category: 'header' },
          { instanceId: 't4_2', snippetId: 'summary_default', category: 'summary' },
          { instanceId: 't4_3', snippetId: 'experience_timeline', category: 'experience' },
          { instanceId: 't4_4', snippetId: 'education_default', category: 'education' },
          { instanceId: 't4_5', snippetId: 'skills_chips', category: 'skills' },
          { instanceId: 't4_6', snippetId: 'projects_default', category: 'projects' },
        ],
      },
    ],
    accentColor: '#dc2626',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'minimal',
    layout: '1-col',
    zones: [
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't5_1', snippetId: 'header_default', category: 'header' },
          { instanceId: 't5_2', snippetId: 'experience_default', category: 'experience' },
          { instanceId: 't5_3', snippetId: 'education_default', category: 'education' },
          { instanceId: 't5_4', snippetId: 'skills_default', category: 'skills' },
        ],
      },
    ],
    accentColor: '#374151',
  },
  {
    id: 'dark-sidebar',
    name: 'Dark Sidebar',
    category: 'creative',
    layout: 'dark-sidebar-left',
    zones: [
      {
        id: 'sidebar',
        label: 'Sidebar',
        snippets: [
          { instanceId: 't6_1', snippetId: 'header_sidebar', category: 'header' },
          { instanceId: 't6_2', snippetId: 'contact_default', category: 'contact' },
          { instanceId: 't6_3', snippetId: 'skills_chips', category: 'skills' },
        ],
      },
      {
        id: 'main',
        label: 'Main',
        snippets: [
          { instanceId: 't6_4', snippetId: 'summary_default', category: 'summary' },
          { instanceId: 't6_5', snippetId: 'experience_timeline', category: 'experience' },
          { instanceId: 't6_6', snippetId: 'education_default', category: 'education' },
          { instanceId: 't6_7', snippetId: 'projects_default', category: 'projects' },
        ],
      },
    ],
    accentColor: '#f59e0b',
  },
];
