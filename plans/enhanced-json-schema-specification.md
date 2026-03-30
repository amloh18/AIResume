# Enhanced JSON Schema Specification

## Overview

This document defines the enhanced JSON schema for CV Circle 2.0, which serves as the single source of truth for all resume data. The schema introduces unique IDs on every node, enabling drag-and-drop, inline editing, AI targeting, and template mapping.

---

## Design Principles

1. **Every node has a unique ID** - Enables precise targeting for edits, AI, and drag-drop
2. **Nested structure with parent-child refs** - Maintains relationships
3. **Version tracking** - Supports conflict resolution and undo/redo
4. **Backward compatibility** - Works with existing `UnifiedCVDataStructure`
5. **Extensibility** - Easy to add new section types

---

## Core Schema

```typescript
/**
 * Enhanced Resume JSON - Single Source of Truth
 * 
 * This is the canonical data structure for all resume data.
 * All layers (forms, editor, preview, AI) read from and write to this structure.
 */
export interface EnhancedResumeJSON {
  // Metadata
  meta: ResumeMeta;
  
  // Personal information
  basics: ResumeBasics;
  
  // Sections (ordered array)
  sections: ResumeSection[];
}

/**
 * Resume metadata
 */
export interface ResumeMeta {
  id: string; // UUID v4
  templateId: string;
  theme: ResumeTheme;
  version: number;
  lastModified: string; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Theme configuration
 */
export interface ResumeTheme {
  font: string;
  spacing: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontSize: string;
  lineHeight: string;
}

/**
 * Personal information (basics)
 */
export interface ResumeBasics {
  id: string; // UUID v4
  name: string;
  label: string; // Professional title
  image: string; // URL to profile image
  email: string;
  phone: string;
  url: string; // Personal website
  summary: string;
  location: ResumeLocation;
  profiles: ResumeProfile[];
}

/**
 * Location information
 */
export interface ResumeLocation {
  id: string; // UUID v4
  address: string;
  postalCode: string;
  city: string;
  countryCode: string;
  region: string;
}

/**
 * Social profile
 */
export interface ResumeProfile {
  id: string; // UUID v4
  network: string; // e.g., "linkedin", "github"
  username: string;
  url: string;
}

/**
 * Resume section (generic)
 */
export interface ResumeSection {
  id: string; // UUID v4
  type: SectionType;
  visible: boolean;
  column?: 'sidebar' | 'main';
  order: number;
  items: ResumeItem[];
}

/**
 * Section types
 */
export type SectionType = 
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certificates'
  | 'languages'
  | 'volunteer'
  | 'awards'
  | 'publications'
  | 'interests'
  | 'references';

/**
 * Resume item (generic)
 */
export interface ResumeItem {
  id: string; // UUID v4
  [key: string]: any; // Section-specific fields
}

/**
 * Experience item
 */
export interface ExperienceItem extends ResumeItem {
  company: string;
  position: string;
  url: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
  highlights: BulletPoint[];
}

/**
 * Education item
 */
export interface EducationItem extends ResumeItem {
  institution: string;
  url: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score: string;
  courses: string[];
}

/**
 * Skills item
 */
export interface SkillsItem extends ResumeItem {
  category: string;
  skills: Skill[];
}

/**
 * Individual skill
 */
export interface Skill {
  id: string; // UUID v4
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  keywords: string[];
}

/**
 * Project item
 */
export interface ProjectItem extends ResumeItem {
  name: string;
  description: string;
  highlights: BulletPoint[];
  keywords: string[];
  startDate: string;
  endDate: string;
  url: string;
}

/**
 * Certificate item
 */
export interface CertificateItem extends ResumeItem {
  name: string;
  date: string;
  issuer: string;
  url: string;
  description: string;
}

/**
 * Language item
 */
export interface LanguageItem extends ResumeItem {
  language: string;
  fluency: 'native' | 'fluent' | 'intermediate' | 'basic';
}

/**
 * Volunteer item
 */
export interface VolunteerItem extends ResumeItem {
  organization: string;
  position: string;
  url: string;
  startDate: string;
  endDate: string;
  summary: string;
  highlights: BulletPoint[];
}

/**
 * Award item
 */
export interface AwardItem extends ResumeItem {
  title: string;
  date: string;
  awarder: string;
  summary: string;
}

/**
 * Publication item
 */
export interface PublicationItem extends ResumeItem {
  name: string;
  publisher: string;
  releaseDate: string;
  url: string;
  summary: string;
}

/**
 * Interest item
 */
export interface InterestItem extends ResumeItem {
  name: string;
  keywords: string[];
}

/**
 * Reference item
 */
export interface ReferenceItem extends ResumeItem {
  name: string;
  reference: string;
}

/**
 * Bullet point (for highlights)
 */
export interface BulletPoint {
  id: string; // UUID v4
  text: string;
  metrics?: {
    value: number;
    unit: string;
    context: string;
  };
}
```

---

## ID Generation Strategy

### UUID v4 Format
```typescript
import { v4 as uuidv4 } from 'uuid';

// Generate a new UUID
const generateId = (): string => uuidv4();

// Example IDs
// "550e8400-e29b-41d4-a716-446655440000"
// "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

### ID Hierarchy
```
meta.id
├── basics.id
│   ├── basics.location.id
│   └── basics.profiles[].id
└── sections[].id
    └── sections[].items[].id
        └── sections[].items[].highlights[].id
```

---

## Path Notation

### JSON Path Examples
```typescript
// Update company name in first experience item
"path": "sections[0].items[0].company"

// Update bullet text in second highlight
"path": "sections[0].items[0].highlights[1].text"

// Add new skill to skills section
"path": "sections[2].items[0].skills"

// Reorder sections
"path": "sections"
```

---

## Change Tracking

### Change Payload
```typescript
export interface ChangePayload {
  type: 'update' | 'add' | 'remove' | 'reorder';
  path: string;
  value?: any;
  previousValue?: any;
  metadata: {
    nodeId: string;
    sectionId: string;
    itemId?: string;
    bulletId?: string;
  };
  timestamp: string; // ISO 8601
  source: 'form' | 'editor' | 'ai' | 'sync';
}
```

### Change Examples
```typescript
// Update company name
{
  type: 'update',
  path: 'sections[0].items[0].company',
  value: 'New Company Name',
  previousValue: 'Old Company Name',
  metadata: {
    nodeId: 'exp-1',
    sectionId: 'section-exp',
    itemId: 'exp-item-1'
  },
  timestamp: '2026-03-27T10:30:00Z',
  source: 'editor'
}

// Add new bullet
{
  type: 'add',
  path: 'sections[0].items[0].highlights',
  value: {
    id: 'bullet-new',
    text: 'New achievement'
  },
  metadata: {
    nodeId: 'bullet-new',
    sectionId: 'section-exp',
    itemId: 'exp-item-1'
  },
  timestamp: '2026-03-27T10:31:00Z',
  source: 'ai'
}

// Reorder sections
{
  type: 'reorder',
  path: 'sections',
  value: ['section-edu', 'section-exp', 'section-skills'],
  previousValue: ['section-exp', 'section-edu', 'section-skills'],
  metadata: {
    nodeId: 'root',
    sectionId: 'root'
  },
  timestamp: '2026-03-27T10:32:00Z',
  source: 'form'
}
```

---

## Migration from UnifiedCVDataStructure

### Migration Function
```typescript
function migrateToEnhancedSchema(
  legacyData: UnifiedCVDataStructure
): EnhancedResumeJSON {
  return {
    meta: {
      id: generateId(),
      templateId: 'default',
      theme: {
        font: 'Inter',
        spacing: 1.2,
        primaryColor: '#000000',
        secondaryColor: '#666666',
        backgroundColor: '#ffffff',
        fontSize: '11pt',
        lineHeight: '1.2'
      },
      version: 1,
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    basics: {
      id: generateId(),
      name: legacyData.basics.name,
      label: legacyData.basics.label,
      image: legacyData.basics.image,
      email: legacyData.basics.email,
      phone: legacyData.basics.phone,
      url: legacyData.basics.url,
      summary: legacyData.basics.summary,
      location: {
        id: generateId(),
        address: legacyData.basics.location.address,
        postalCode: legacyData.basics.location.postalCode,
        city: legacyData.basics.location.city,
        countryCode: legacyData.basics.location.countryCode,
        region: legacyData.basics.location.region
      },
      profiles: legacyData.basics.profiles.map(profile => ({
        id: generateId(),
        network: profile.network,
        username: profile.username,
        url: profile.url
      }))
    },
    sections: migrateSections(legacyData)
  };
}

function migrateSections(
  legacyData: UnifiedCVDataStructure
): ResumeSection[] {
  const sections: ResumeSection[] = [];
  
  // Work experience
  if (legacyData.work && legacyData.work.length > 0) {
    sections.push({
      id: generateId(),
      type: 'experience',
      visible: true,
      order: sections.length,
      items: legacyData.work.map(work => ({
        id: generateId(),
        company: work.name,
        position: work.position,
        url: work.url,
        startDate: work.startDate,
        endDate: work.endDate,
        current: !work.endDate,
        summary: work.summary,
        highlights: work.highlights.map(text => ({
          id: generateId(),
          text
        }))
      }))
    });
  }
  
  // Education
  if (legacyData.education && legacyData.education.length > 0) {
    sections.push({
      id: generateId(),
      type: 'education',
      visible: true,
      order: sections.length,
      items: legacyData.education.map(edu => ({
        id: generateId(),
        institution: edu.institution,
        url: edu.url,
        area: edu.area,
        studyType: edu.studyType,
        startDate: edu.startDate,
        endDate: edu.endDate,
        score: edu.score,
        courses: edu.courses || []
      }))
    });
  }
  
  // Skills
  if (legacyData.skills && legacyData.skills.length > 0) {
    sections.push({
      id: generateId(),
      type: 'skills',
      visible: true,
      order: sections.length,
      items: legacyData.skills.map(skill => ({
        id: generateId(),
        category: skill.category,
        skills: skill.skills.map(s => ({
          id: generateId(),
          name: s,
          keywords: []
        }))
      }))
    });
  }
  
  // Projects
  if (legacyData.projects && legacyData.projects.length > 0) {
    sections.push({
      id: generateId(),
      type: 'projects',
      visible: true,
      order: sections.length,
      items: legacyData.projects.map(proj => ({
        id: generateId(),
        name: proj.name,
        description: proj.description,
        highlights: (proj.highlights || []).map(text => ({
          id: generateId(),
          text
        })),
        keywords: proj.keywords,
        startDate: proj.startDate,
        endDate: proj.endDate,
        url: proj.url
      }))
    });
  }
  
  // Certificates
  if (legacyData.certificates && legacyData.certificates.length > 0) {
    sections.push({
      id: generateId(),
      type: 'certificates',
      visible: true,
      order: sections.length,
      items: legacyData.certificates.map(cert => ({
        id: generateId(),
        name: cert.name,
        date: cert.date,
        issuer: cert.issuer,
        url: cert.url,
        description: cert.description
      }))
    });
  }
  
  // Languages
  if (legacyData.languages && legacyData.languages.length > 0) {
    sections.push({
      id: generateId(),
      type: 'languages',
      visible: true,
      order: sections.length,
      items: legacyData.languages.map(lang => ({
        id: generateId(),
        language: lang.language,
        fluency: lang.fluency
      }))
    });
  }
  
  // Volunteer
  if (legacyData.volunteer && legacyData.volunteer.length > 0) {
    sections.push({
      id: generateId(),
      type: 'volunteer',
      visible: true,
      order: sections.length,
      items: legacyData.volunteer.map(vol => ({
        id: generateId(),
        organization: vol.organization,
        position: vol.position,
        url: vol.url,
        startDate: vol.startDate,
        endDate: vol.endDate,
        summary: vol.summary,
        highlights: vol.highlights.map(text => ({
          id: generateId(),
          text
        }))
      }))
    });
  }
  
  // Awards
  if (legacyData.awards && legacyData.awards.length > 0) {
    sections.push({
      id: generateId(),
      type: 'awards',
      visible: true,
      order: sections.length,
      items: legacyData.awards.map(award => ({
        id: generateId(),
        title: award.title,
        date: award.date,
        awarder: award.awarder,
        summary: award.summary
      }))
    });
  }
  
  // Publications
  if (legacyData.publications && legacyData.publications.length > 0) {
    sections.push({
      id: generateId(),
      type: 'publications',
      visible: true,
      order: sections.length,
      items: legacyData.publications.map(pub => ({
        id: generateId(),
        name: pub.name,
        publisher: pub.publisher,
        releaseDate: pub.releaseDate,
        url: pub.url,
        summary: pub.summary
      }))
    });
  }
  
  return sections;
}
```

---

## Validation Schema

### JSON Schema for Validation
```typescript
export const ENHANCED_RESUME_VALIDATION_SCHEMA = {
  type: 'object',
  required: ['meta', 'basics', 'sections'],
  properties: {
    meta: {
      type: 'object',
      required: ['id', 'templateId', 'theme', 'version', 'lastModified', 'createdAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        templateId: { type: 'string' },
        theme: {
          type: 'object',
          required: ['font', 'spacing', 'primaryColor', 'secondaryColor', 'backgroundColor', 'fontSize', 'lineHeight'],
          properties: {
            font: { type: 'string' },
            spacing: { type: 'number' },
            primaryColor: { type: 'string' },
            secondaryColor: { type: 'string' },
            backgroundColor: { type: 'string' },
            fontSize: { type: 'string' },
            lineHeight: { type: 'string' }
          }
        },
        version: { type: 'number' },
        lastModified: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    basics: {
      type: 'object',
      required: ['id', 'name', 'email'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1 },
        label: { type: 'string' },
        image: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        url: { type: 'string' },
        summary: { type: 'string' },
        location: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            address: { type: 'string' },
            postalCode: { type: 'string' },
            city: { type: 'string' },
            countryCode: { type: 'string' },
            region: { type: 'string' }
          }
        },
        profiles: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'network', 'username', 'url'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              network: { type: 'string' },
              username: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'visible', 'order', 'items'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { 
            type: 'string',
            enum: ['experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer', 'awards', 'publications', 'interests', 'references']
          },
          visible: { type: 'boolean' },
          column: { type: 'string', enum: ['sidebar', 'main'] },
          order: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      }
    }
  }
};
```

---

## Default Empty Structure

```typescript
export const DEFAULT_ENHANCED_RESUME: EnhancedResumeJSON = {
  meta: {
    id: generateId(),
    templateId: 'default',
    theme: {
      font: 'Inter',
      spacing: 1.2,
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '11pt',
      lineHeight: '1.2'
    },
    version: 1,
    lastModified: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  basics: {
    id: generateId(),
    name: '',
    label: '',
    image: '',
    email: '',
    phone: '',
    url: '',
    summary: '',
    location: {
      id: generateId(),
      address: '',
      postalCode: '',
      city: '',
      countryCode: '',
      region: ''
    },
    profiles: []
  },
  sections: []
};
```

---

## Usage Examples

### Reading Data
```typescript
// Get company name from first experience item
const companyName = resume.sections
  .find(s => s.type === 'experience')
  ?.items[0]
  ?.company;

// Get all skills
const allSkills = resume.sections
  .find(s => s.type === 'skills')
  ?.items.flatMap(item => item.skills);

// Get bullet points from first experience
const bullets = resume.sections
  .find(s => s.type === 'experience')
  ?.items[0]
  ?.highlights;
```

### Writing Data
```typescript
// Update company name
const updatedResume = {
  ...resume,
  sections: resume.sections.map(section => 
    section.id === sectionId
      ? {
          ...section,
          items: section.items.map(item =>
            item.id === itemId
              ? { ...item, company: 'New Company' }
              : item
          )
        }
      : section
  )
};

// Add new bullet point
const updatedResume = {
  ...resume,
  sections: resume.sections.map(section =>
    section.id === sectionId
      ? {
          ...section,
          items: section.items.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  highlights: [
                    ...item.highlights,
                    { id: generateId(), text: 'New achievement' }
                  ]
                }
              : item
          )
        }
      : section
  )
};

// Reorder sections
const updatedResume = {
  ...resume,
  sections: newOrder.map(sectionId =>
    resume.sections.find(s => s.id === sectionId)!
  )
};
```

---

## Benefits of Enhanced Schema

### 1. Precise Targeting
- AI can target specific bullets for improvement
- Drag-and-drop knows exactly what's being moved
- Inline editing can update specific nodes

### 2. Conflict Resolution
- Version tracking enables merge strategies
- Change history supports undo/redo
- Timestamp-based conflict detection

### 3. Template Mapping
- Templates can map to specific sections
- Section visibility is explicit
- Layout configuration is data-driven

### 4. Performance
- Selective updates (only changed nodes)
- Efficient diffing
- Optimistic updates with rollback

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-27  
**Author:** CV Circle Engineering Team
