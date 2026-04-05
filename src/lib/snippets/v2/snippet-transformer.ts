/**
 * Snippet Transformer — Bridges old UnifiedCVDataStructure ↔ new SnippetV2[]
 *
 * Used during migration period to keep both systems working.
 */

import { v4 as uuidv4 } from 'uuid';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { CVInstance, SlotBinding } from '@/types/binding';
import type { SnippetV2, SnippetType } from '@/types/snippet-v2';

/**
 * Convert a CVInstance + snippets map back to UnifiedCVDataStructure.
 * This allows legacy renderers to keep working during migration.
 */
export function snippetsToUnifiedCV(
  instance: CVInstance,
  snippets: Map<string, SnippetV2>
): UnifiedCVDataStructure {
  const result: UnifiedCVDataStructure = {
    basics: {
      name: '', label: '', image: '', email: '', phone: '', url: '', summary: '',
      location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
      profiles: [],
    },
    work: [], volunteer: [], education: [], awards: [],
    certificates: [], publications: [], skills: [], languages: [],
    interests: [], references: [], projects: [],
  };

  for (const binding of instance.slotBindings) {
    if (!binding.visible) continue;
    const snippet = snippets.get(binding.snippetId);
    if (!snippet) continue;

    switch (snippet.type) {
      case 'header': {
        const c = snippet.content as any;
        result.basics.name = c.name || '';
        result.basics.label = c.label || '';
        result.basics.email = c.email || '';
        result.basics.phone = c.phone || '';
        result.basics.url = c.url || '';
        result.basics.image = c.image || '';
        result.basics.location = {
          address: c.location?.address || '',
          postalCode: c.location?.postalCode || '',
          city: c.location?.city || '',
          countryCode: c.location?.countryCode || '',
          region: c.location?.region || '',
        };
        result.basics.profiles = c.profiles || [];
        break;
      }
      case 'summary': {
        result.basics.summary = (snippet.content as any).text || '';
        break;
      }
      case 'experience': {
        const c = snippet.content as any;
        result.work.push({
          name: c.company || '', position: c.position || '',
          url: c.url || '', startDate: c.startDate || '',
          endDate: c.endDate || '', summary: c.summary || '',
          highlights: c.highlights || [],
        });
        break;
      }
      case 'education': {
        const c = snippet.content as any;
        result.education.push({
          institution: c.institution || '', url: c.url || '',
          area: c.area || '', studyType: c.studyType || '',
          startDate: c.startDate || '', endDate: c.endDate || '',
          score: c.score || '', courses: c.courses, description: c.description,
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
          name: c.name || '', startDate: c.startDate || '',
          endDate: c.endDate || '', description: c.description || '',
          highlights: c.highlights || [], keywords: c.keywords || [],
          url: c.url || '',
        });
        break;
      }
      case 'certification': {
        const c = snippet.content as any;
        result.certificates.push({
          name: c.name || '', date: c.date || '',
          issuer: c.issuer || '', url: c.url || '',
          description: c.description || '',
        });
        break;
      }
      case 'publication': {
        const c = snippet.content as any;
        result.publications.push({
          name: c.name || '', publisher: c.publisher || '',
          releaseDate: c.releaseDate || '', url: c.url || '',
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
          title: c.title || '', date: c.date || '',
          awarder: c.awarder || '', summary: c.summary || '',
        });
        break;
      }
      case 'volunteer': {
        const c = snippet.content as any;
        result.volunteer.push({
          organization: c.organization || '', position: c.position || '',
          url: c.url || '', startDate: c.startDate || '',
          endDate: c.endDate || '', summary: c.summary || '',
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

/**
 * Get snippet IDs by type from bindings.
 */
export function getSnippetIdsByType(
  bindings: SlotBinding[],
  snippets: Map<string, SnippetV2>,
  type: SnippetType
): string[] {
  const ids: string[] = [];
  for (const binding of bindings) {
    const snippet = snippets.get(binding.snippetId);
    if (snippet?.type === type) {
      ids.push(binding.snippetId);
    }
  }
  return ids;
}
