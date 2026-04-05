/**
 * CV Data Migrator
 *
 * Transforms UnifiedCVDataStructure → CVInstance + SnippetV2[]
 * Generates UUIDs for all snippets, sets lineage.isGlobal: false (originals).
 */

import { v4 as uuidv4 } from 'uuid';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { CVInstance, SlotBinding } from '@/types/binding';
import type {
  SnippetV2,
  SnippetType,
  HeaderContent,
  SummaryContent,
  ExperienceContent,
  EducationContent,
  SkillsContent,
  ProjectContent,
  CertificationContent,
  PublicationContent,
  LanguageContent,
  AwardContent,
  VolunteerContent,
  InterestContent,
  ReferenceContent,
} from '@/types/snippet-v2';
import { CONTENT_KEY_TO_SNIPPET_TYPE } from '@/types/snippet-v2';

export interface MigrationResult {
  instance: CVInstance;
  snippets: SnippetV2[];
  warnings: string[];
}

export function migrateToV2(
  cvData: UnifiedCVDataStructure,
  userId: string,
  title: string,
  templateId: string,
  cvType: 'master' | 'journey' | 'standalone' = 'standalone',
  legacyCvId?: string
): MigrationResult {
  const snippets: SnippetV2[] = [];
  const bindings: SlotBinding[] = [];
  const warnings: string[] = [];
  const now = new Date();

  function createSnippet(
    type: SnippetType,
    content: any,
    order: number,
    slotId: string
  ): void {
    const id = uuidv4();
    snippets.push({
      id,
      userId,
      type,
      content,
      metadata: { source: 'user' },
      formatHints: {},
      lineage: { editHistory: [], isGlobal: false },
      createdAt: now,
      updatedAt: now,
    });
    bindings.push({ slotId, snippetId: id, order, visible: true });
  }

  // Header (basics)
  if (cvData.basics) {
    const headerContent: HeaderContent = {
      name: cvData.basics.name || '',
      label: cvData.basics.label || '',
      email: cvData.basics.email || '',
      phone: cvData.basics.phone || '',
      url: cvData.basics.url || '',
      location: {
        city: cvData.basics.location?.city || '',
        region: cvData.basics.location?.region || '',
        countryCode: cvData.basics.location?.countryCode || '',
        address: cvData.basics.location?.address,
        postalCode: cvData.basics.location?.postalCode,
      },
      profiles: (cvData.basics.profiles || []).map((p) => ({
        network: p.network || '',
        username: p.username || '',
        url: p.url || '',
      })),
      image: cvData.basics.image || undefined,
    };
    createSnippet('header', headerContent, 0, 'header');
  }

  // Summary
  if (cvData.basics?.summary) {
    const summaryContent: SummaryContent = { text: cvData.basics.summary };
    createSnippet('summary', summaryContent, 0, 'summary');
  }

  // Work Experience
  if (cvData.work?.length) {
    cvData.work.forEach((w, i) => {
      const expContent: ExperienceContent = {
        company: w.name || '',
        position: w.position || '',
        url: w.url || undefined,
        startDate: w.startDate || '',
        endDate: w.endDate || '',
        current: !w.endDate,
        summary: w.summary || undefined,
        highlights: w.highlights || [],
      };
      createSnippet('experience', expContent, i, 'experience');
    });
  }

  // Education
  if (cvData.education?.length) {
    cvData.education.forEach((e, i) => {
      const eduContent: EducationContent = {
        institution: e.institution || '',
        area: e.area || '',
        studyType: e.studyType || '',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        score: e.score || undefined,
        url: e.url || undefined,
        courses: e.courses,
        description: e.description,
      };
      createSnippet('education', eduContent, i, 'education');
    });
  }

  // Skills
  if (cvData.skills?.length) {
    cvData.skills.forEach((s, i) => {
      const skillsContent: SkillsContent = {
        category: s.category || 'General',
        skills: s.skills || [],
      };
      createSnippet('skills', skillsContent, i, 'skills');
    });
  }

  // Projects
  if (cvData.projects?.length) {
    cvData.projects.forEach((p, i) => {
      const projContent: ProjectContent = {
        name: p.name || '',
        description: p.description || undefined,
        highlights: p.highlights || [],
        keywords: p.keywords || [],
        startDate: p.startDate || undefined,
        endDate: p.endDate || undefined,
        url: p.url || undefined,
        current: !p.endDate,
      };
      createSnippet('project', projContent, i, 'projects');
    });
  }

  // Certificates
  if (cvData.certificates?.length) {
    cvData.certificates.forEach((c, i) => {
      const certContent: CertificationContent = {
        name: c.name || '',
        date: c.date || '',
        issuer: c.issuer || '',
        url: c.url || undefined,
        description: c.description || undefined,
      };
      createSnippet('certification', certContent, i, 'certifications');
    });
  }

  // Publications
  if (cvData.publications?.length) {
    cvData.publications.forEach((p, i) => {
      const pubContent: PublicationContent = {
        name: p.name || '',
        publisher: p.publisher || '',
        releaseDate: p.releaseDate || '',
        url: p.url || undefined,
        summary: p.summary || undefined,
      };
      createSnippet('publication', pubContent, i, 'publications');
    });
  }

  // Languages
  if (cvData.languages?.length) {
    cvData.languages.forEach((l, i) => {
      const langContent: LanguageContent = {
        language: l.language || '',
        fluency: l.fluency || '',
      };
      createSnippet('language', langContent, i, 'languages');
    });
  }

  // Awards
  if (cvData.awards?.length) {
    cvData.awards.forEach((a, i) => {
      const awardContent: AwardContent = {
        title: a.title || '',
        date: a.date || '',
        awarder: a.awarder || '',
        summary: a.summary || undefined,
      };
      createSnippet('award', awardContent, i, 'awards');
    });
  }

  // Volunteer
  if (cvData.volunteer?.length) {
    cvData.volunteer.forEach((v, i) => {
      const volContent: VolunteerContent = {
        organization: v.organization || '',
        position: v.position || '',
        url: v.url || undefined,
        startDate: v.startDate || '',
        endDate: v.endDate || '',
        current: !v.endDate,
        summary: v.summary || undefined,
        highlights: v.highlights || [],
      };
      createSnippet('volunteer', volContent, i, 'volunteer');
    });
  }

  // Interests
  if (cvData.interests?.length) {
    cvData.interests.forEach((interest, i) => {
      const intContent: InterestContent = {
        name: interest.name || '',
        keywords: interest.keywords || [],
      };
      createSnippet('interest', intContent, i, 'interests');
    });
  }

  // References
  if (cvData.references?.length) {
    cvData.references.forEach((r, i) => {
      const refContent: ReferenceContent = {
        name: r.name || '',
        reference: r.reference || '',
      };
      createSnippet('reference', refContent, i, 'references');
    });
  }

  const instance: CVInstance = {
    id: legacyCvId || uuidv4(),
    userId,
    title,
    templateId,
    slotBindings: bindings,
    status: 'draft',
    version: 1,
    schemaVersion: 2,
    cvType,
    metadata: {
      isMaster: cvType === 'master',
      lastModified: now,
      tags: [],
      isPublic: false,
      viewCount: 0,
      downloadCount: 0,
      starred: false,
      cvType,
    },
    createdAt: now,
    updatedAt: now,
  };

  return { instance, snippets, warnings };
}

/**
 * Reverse migration: CVInstance + SnippetV2[] → UnifiedCVDataStructure
 * Used as bridge during migration period.
 */
export function migrateToLegacy(
  instance: CVInstance,
  snippets: Map<string, SnippetV2>
): UnifiedCVDataStructure {
  const result: UnifiedCVDataStructure = {
    basics: {
      name: '', label: '', image: '', email: '', phone: '', url: '', summary: '',
      location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
      profiles: [],
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
  };

  for (const binding of instance.slotBindings) {
    if (!binding.visible) continue;
    const snippet = snippets.get(binding.snippetId);
    if (!snippet) continue;

    switch (snippet.type) {
      case 'header': {
        const c = snippet.content as any;
        result.basics = {
          name: c.name || '',
          label: c.label || '',
          image: c.image || '',
          email: c.email || '',
          phone: c.phone || '',
          url: c.url || '',
          summary: result.basics.summary,
          location: {
            address: c.location?.address || '',
            postalCode: c.location?.postalCode || '',
            city: c.location?.city || '',
            countryCode: c.location?.countryCode || '',
            region: c.location?.region || '',
          },
          profiles: c.profiles || [],
        };
        break;
      }
      case 'summary': {
        result.basics.summary = (snippet.content as any).text || '';
        break;
      }
      case 'experience': {
        const c = snippet.content as any;
        result.work.push({
          name: c.company || '',
          position: c.position || '',
          url: c.url || '',
          startDate: c.startDate || '',
          endDate: c.endDate || '',
          summary: c.summary || '',
          highlights: c.highlights || [],
        });
        break;
      }
      case 'education': {
        const c = snippet.content as any;
        result.education.push({
          institution: c.institution || '',
          url: c.url || '',
          area: c.area || '',
          studyType: c.studyType || '',
          startDate: c.startDate || '',
          endDate: c.endDate || '',
          score: c.score || '',
          courses: c.courses,
          description: c.description,
        });
        break;
      }
      case 'skills': {
        const c = snippet.content as any;
        result.skills.push({ category: c.category || '', skills: c.skills || [] });
        break;
      }
      case 'project': {
        const c = snippet.content as any;
        result.projects.push({
          name: c.name || '',
          startDate: c.startDate || '',
          endDate: c.endDate || '',
          description: c.description || '',
          highlights: c.highlights || [],
          keywords: c.keywords || [],
          url: c.url || '',
        });
        break;
      }
      case 'certification': {
        const c = snippet.content as any;
        result.certificates.push({
          name: c.name || '',
          date: c.date || '',
          issuer: c.issuer || '',
          url: c.url || '',
          description: c.description || '',
        });
        break;
      }
      case 'publication': {
        const c = snippet.content as any;
        result.publications.push({
          name: c.name || '',
          publisher: c.publisher || '',
          releaseDate: c.releaseDate || '',
          url: c.url || '',
          summary: c.summary || '',
        });
        break;
      }
      case 'language': {
        const c = snippet.content as any;
        result.languages.push({ language: c.language || '', fluency: c.fluency || '' });
        break;
      }
      case 'award': {
        const c = snippet.content as any;
        result.awards.push({
          title: c.title || '',
          date: c.date || '',
          awarder: c.awarder || '',
          summary: c.summary || '',
        });
        break;
      }
      case 'volunteer': {
        const c = snippet.content as any;
        result.volunteer.push({
          organization: c.organization || '',
          position: c.position || '',
          url: c.url || '',
          startDate: c.startDate || '',
          endDate: c.endDate || '',
          summary: c.summary || '',
          highlights: c.highlights || [],
        });
        break;
      }
      case 'interest': {
        const c = snippet.content as any;
        result.interests.push({ name: c.name || '', keywords: c.keywords || [] });
        break;
      }
      case 'reference': {
        const c = snippet.content as any;
        result.references.push({ name: c.name || '', reference: c.reference || '' });
        break;
      }
    }
  }

  return result;
}
