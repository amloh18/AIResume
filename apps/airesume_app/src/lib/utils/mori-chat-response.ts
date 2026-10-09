import { coerceInterestsForEdit, coerceLanguagesForEdit, coerceSkillsForEdit } from '@/lib/utils/cv-snippet-data';
import {
  type CVEditOperation,
  applyEditOperations,
  diffCVData,
} from '@/types/cv-edit-ops';
import { normalizeCvData } from '@/types/cv-normalizer';
import { materializeCvDescriptionViews } from '@/lib/utils/cv-description-blocks';

export function cleanAndParseJSON(content: string): any {
  let cleaned = (content || '').trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error('No JSON object found in response');
  }

  let jsonString = cleaned.substring(jsonStart, jsonEnd + 1);
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(jsonString);
}

function extractQuotedMessage(raw: string): string {
  const match = raw.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!match) return '';
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
}

function looksLikeCvJsonDump(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes('{')) return false;
  return (
    trimmed.includes('"updatedCV"') ||
    trimmed.includes('"canvasZones"') ||
    (/"message"\s*:\s*"/.test(trimmed) && (trimmed.includes('"basics"') || trimmed.includes('"work"') || trimmed.includes('"languages"'))) ||
    (trimmed.startsWith('{') && trimmed.includes('"basics"') && trimmed.includes('"skills"'))
  );
}

const CV_SECTION_RULES: Array<{ path: string; label: string; tests: RegExp[] }> = [
  { path: 'languages', label: 'Languages', tests: [/\blanguages?\b/, /\bfluency\b/, /\bfluent proficiency\b/, /\bnative speaker\b/, /\bbilingual\b/] },
  { path: 'skills', label: 'Skills', tests: [/\bskills?\b/, /\bcompetenc(?:e|y|ies)\b/, /\btech stack\b/] },
  { path: 'interests', label: 'Interests', tests: [/\binterests?\b/, /\bhobbies\b/, /\bhobby\b/] },
  { path: 'experience', label: 'Experience', tests: [/\bexperience\b/, /\bwork history\b/, /\bemployment\b/, /\bjob title\b/, /\bbullet points?\b/] },
  { path: 'education', label: 'Education', tests: [/\beducation\b/, /\bdegree\b/, /\buniversity\b/, /\bschool\b/] },
  { path: 'projects', label: 'Projects', tests: [/\bprojects?\b/] },
  { path: 'certifications', label: 'Certifications', tests: [/\bcertifications?\b/, /\bcertificates?\b/] },
  { path: 'awards', label: 'Awards', tests: [/\bawards?\b/] },
  { path: 'publications', label: 'Publications', tests: [/\bpublications?\b/, /\bpapers?\b/] },
  { path: 'volunteer', label: 'Volunteer', tests: [/\bvolunteer\b/] },
  { path: 'references', label: 'References', tests: [/\breferences?\b/] },
  { path: 'basics.summary', label: 'Summary', tests: [/\bsummary\b/, /\bprofile\b/, /\bobjective\b/, /\babout me\b/] },
  { path: 'basics', label: 'Header / Contact', tests: [/\bcontact\b/, /\bheader\b/, /\bphone number\b/, /\bemail\b/, /\blinkedin\b/] },
];

const LANGUAGE_NAME_RE = /\b(german|spanish|french|hindi|english|punjabi|mandarin|chinese|arabic|portuguese|italian|japanese|korean|russian|dutch|turkish|urdu|bengali|tamil|telugu|gujarati|marathi|polish|swedish|norwegian|danish|finnish|greek|hebrew|thai|vietnamese|indonesian|malay|ukrainian|romanian|czech|hungarian|slovak|croatian|serbian|catalan|swahili)\b/;

function sectionLabel(path: string) {
  return CV_SECTION_RULES.find((rule) => rule.path === path)?.label || path;
}

function taggedSectionPath(text: string): string | null {
  const sectionTag = text.match(/\(section:\s*([^)]+)\)/i);
  if (sectionTag) {
    const label = sectionTag[1].trim().toLowerCase();
    const match = CV_SECTION_RULES.find((rule) => rule.label.toLowerCase() === label || rule.path === label);
    return match?.path || null;
  }
  const itemTag = text.match(/\(update ([.\w]+) item:/i);
  return itemTag ? itemTag[1] : null;
}

function listCvSectionItems(cvData: any, path: string): Array<{ label: string }> {
  if (!cvData) return [];
  if (path === 'experience' || path === 'work') {
    const rows = Array.isArray(cvData.experience) ? cvData.experience : Array.isArray(cvData.work) ? cvData.work : [];
    return rows.map((row: any) => ({
      label: [row.role || row.position, row.company || row.name].filter(Boolean).join(' at ') || 'Experience entry',
    }));
  }
  if (path === 'education') {
    return (cvData.education || []).map((row: any) => ({
      label: [row.degree || row.studyType, row.institution].filter(Boolean).join(' · ') || 'Education entry',
    }));
  }
  if (path === 'projects') {
    return (cvData.projects || []).map((row: any) => ({ label: row.name || 'Project' }));
  }
  if (path === 'languages') {
    return (Array.isArray(cvData.languages) ? cvData.languages : []).map((row: any) => ({
      label: typeof row === 'string' ? row : row.language || 'Language',
    }));
  }
  if (path === 'skills') {
    return (Array.isArray(cvData.skills) ? cvData.skills : []).map((row: any) => ({
      label: row.category || row.name || 'Skills group',
    }));
  }
  if (path === 'certifications') {
    return (cvData.certifications || cvData.certificates || []).map((row: any) => ({ label: row.name || 'Certification' }));
  }
  return [];
}

function mentionsSpecificItem(text: string, items: Array<{ label: string }>) {
  const lower = text.toLowerCase();
  return items.some((item) => {
    const label = item.label.toLowerCase();
    return label.length > 2 && (lower.includes(label) || label.split(/\s+/).filter((part) => part.length > 3).some((part) => lower.includes(part)));
  });
}

export function inferCvSectionFromPrompt(text: string): { path: string; text: string } | null {
  const raw = (text || '').trim();
  if (!raw) return null;
  const tagged = taggedSectionPath(raw);
  if (tagged) return { path: tagged, text: raw };

  const lower = raw.toLowerCase().replace(/\(apply to whole cv\)/gi, '').trim();
  const hits = CV_SECTION_RULES.filter((rule) => rule.tests.some((test) => test.test(lower)));
  if (hits.length === 1) return { path: hits[0].path, text: raw };
  if (LANGUAGE_NAME_RE.test(lower) && /\b(add|remove|update|change|fluent|native|basic|intermediate|proficien)\b/.test(lower)) {
    return { path: 'languages', text: raw };
  }
  return hits[0] ? { path: hits[0].path, text: raw } : null;
}

/**
 * Normalize AI-returned options into the canonical `{ label, prompt, description? }` shape.
 * The model may return options as strings, as objects with different keys
 * (e.g. `{ label, value }`), or as a mix — normalize defensively so the chat
 * UI always renders clickable cards with a valid prompt.
 */
export function normalizeMoriChatOptions(raw: any): Array<{ label: string; prompt: string; description?: string }> | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const seen = new Set<string>();
  const out: Array<{ label: string; prompt: string; description?: string }> = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const label = entry.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, prompt: label });
      continue;
    }
    if (entry && typeof entry === 'object') {
      const label = String(entry.label ?? entry.title ?? entry.text ?? entry.value ?? entry.prompt ?? '').trim();
      if (!label) continue;
      const prompt = String(entry.prompt ?? entry.value ?? entry.label ?? entry.text ?? entry.title ?? label).trim() || label;
      const description = typeof entry.description === 'string' ? entry.description.trim() : undefined;
      const key = `${label.toLowerCase()}::${prompt.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, prompt, description });
    }
  }
  return out.length > 0 ? out.slice(0, 8) : null;
}

export type MoriTargetResolution =
  | { status: 'resolved'; selection: { path: string; text: string } | null }
  | { status: 'ask'; message: string; options: Array<{ label: string; prompt: string; description?: string }> };

export function resolveMoriEditTarget(text: string, cvData: any): MoriTargetResolution {
  const raw = (text || '').trim();
  const tagged = taggedSectionPath(raw);
  if (tagged) return { status: 'resolved', selection: { path: tagged, text: raw } };

  const lower = raw.toLowerCase().replace(/\(apply to whole cv\)/gi, '').trim();
  const hits = CV_SECTION_RULES.filter((rule) => rule.tests.some((test) => test.test(lower)));

  if (hits.length > 1) {
    return {
      status: 'ask',
      message: 'That could apply to more than one CV section. Which should I update?',
      options: hits.map((hit) => ({
        label: hit.label,
        prompt: `${raw} (Section: ${hit.label})`,
      })),
    };
  }

  let path = hits[0]?.path || null;
  if (!path && LANGUAGE_NAME_RE.test(lower) && /\b(add|remove|update|change|fluent|native|basic|intermediate|proficien)\b/.test(lower)) {
    path = 'languages';
  }

  const isAdding = /\b(add|append|include|insert|new)\b/.test(lower);
  const isItemEdit = !isAdding && /\b(rewrite|improve|change|fix|update|edit|refine|replace)\b/.test(lower);
  if (path && isItemEdit) {
    const items = listCvSectionItems(cvData, path);
    if (items.length > 1 && !mentionsSpecificItem(raw, items)) {
      return {
        status: 'ask',
        message: `You have more than one ${sectionLabel(path)} entry. Which one should I update?`,
        options: items.slice(0, 6).map((item) => ({
          label: item.label,
          prompt: `${raw} (Update ${path} item: ${item.label})`,
        })),
      };
    }
  }

  return { status: 'resolved', selection: path ? { path, text: raw } : null };
}

export function recoverMoriChatResult(result: any, currentCv: any) {
  let message = result?.message;
  let operations = result?.operations || null;
  let patch = result?.patch || null;
  let updatedCV = result?.updatedCV || null;
  const options = normalizeMoriChatOptions(result?.options);

  if (typeof message === 'string' && looksLikeCvJsonDump(message)) {
    const parsed = parseMoriChatContent(message);
    message = parsed.message;
    operations = operations || parsed.operations;
    patch = patch || parsed.patch;
    updatedCV = updatedCV || parsed.updatedCV;
  } else if (message && typeof message === 'object') {
    const parsed = parseMoriChatContent(JSON.stringify(message));
    message = parsed.message;
    operations = operations || parsed.operations;
    patch = patch || parsed.patch;
    updatedCV = updatedCV || parsed.updatedCV;
  }

  const merged = mergeMoriCvIntoCanvas(currentCv, { operations, patch, updatedCV });
  return {
    message: sanitizeMoriChatMessage(message) || "I've processed your request.",
    options,
    updatedCV: merged,
    limitExhausted: result?.limitExhausted,
    chatId: result?.chatId,
    title: result?.title,
  };
}

export function sanitizeMoriChatMessage(raw: any): string {
  if (raw == null) return '';
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && typeof raw.message === 'string') {
      return sanitizeMoriChatMessage(raw.message);
    }
    return "I've updated your CV.";
  }

  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!looksLikeCvJsonDump(trimmed)) return trimmed;

  const extracted = extractQuotedMessage(trimmed);
  if (extracted && !looksLikeCvJsonDump(extracted)) return extracted;
  return "I've updated your CV.";
}

export function parseMoriChatContent(raw: string): {
  message: string;
  options: Array<{ label: string; prompt: string; description?: string }> | null;
  operations: CVEditOperation[] | null;
  patch: Record<string, any> | null;
  updatedCV: any | null;
} {
  let parsed: any = null;
  try {
    parsed = JSON.parse((raw || '').trim());
  } catch {
    try {
      parsed = cleanAndParseJSON(raw || '');
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // Parse structured edit operations (new system)
    let operations: CVEditOperation[] | null = null;
    if (Array.isArray(parsed.operations) && parsed.operations.length > 0) {
      operations = parsed.operations.filter((op: any) =>
        op && typeof op === 'object' && typeof op.operation === 'string'
      );
    }

    return {
      message: sanitizeMoriChatMessage(parsed.message) || "I've updated your CV.",
      options: normalizeMoriChatOptions(parsed.options),
      operations,
      patch: parsed.patch && typeof parsed.patch === 'object' && !Array.isArray(parsed.patch) ? parsed.patch : null,
      updatedCV: parsed.updatedCV && typeof parsed.updatedCV === 'object' ? parsed.updatedCV : null,
    };
  }

  return {
    message: sanitizeMoriChatMessage(raw) || "I've processed your request.",
    options: null,
    operations: null,
    patch: null,
    updatedCV: null,
  };
}

function mapWorkToExperience(work: any[]) {
  return work.map((item: any, index: number) => {
    if (item?.role || item?.company) return { id: item.id || `exp-${index}`, ...item };
    const summary = typeof item?.summary === 'string' ? item.summary : '';
    const highlights = Array.isArray(item?.highlights) ? item.highlights.filter((h: any) => typeof h === 'string') : [];
    const description = highlights.length
      ? `${summary ? `<p>${summary}</p>` : ''}<ul>${highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>`
      : summary;
    return {
      id: item?.id || `exp-${index}`,
      role: item?.position || item?.role || '',
      company: item?.name || item?.company || '',
      startDate: item?.startDate || '',
      endDate: item?.endDate || '',
      description,
    };
  });
}

function mergeBasics(current: any, incoming: any) {
  if (!incoming || typeof incoming !== 'object') return current;
  const next = { ...(current || {}), ...incoming };
  if (incoming.location && typeof incoming.location === 'object') {
    const loc = incoming.location;
    next.location = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
  }
  if (!next.title && next.label) next.title = next.label;
  if (!next.website && next.url) next.website = next.url;
  return next;
}

const SKIP_FROM_FULL_DUMP = new Set([
  'metadata',
  'sectionTitles',
  'canvasDesign',
  'canvasTemplate',
  'canvasZones',
  'canvasTemplatesZones',
  'canvasTemplatesDesign',
]);

function applySection(next: any, key: string, value: any, fromPatch: boolean) {
  if (value == null) return;
  if (!fromPatch && SKIP_FROM_FULL_DUMP.has(key)) return;
  const arrayKeys = new Set(['experience', 'work', 'education', 'projects', 'volunteer', 'awards', 'publications', 'references', 'skills', 'languages', 'interests', 'certifications', 'certificates']);
  if (arrayKeys.has(key) && !Array.isArray(value)) return;
  if (key === 'work') {
    next.experience = mapWorkToExperience(Array.isArray(value) ? value : []);
    return;
  }
  if (key === 'certificates') {
    next.certifications = value;
    return;
  }
  if (key === 'languages') {
    const current = coerceLanguagesForEdit(next.languages);
    const incoming = coerceLanguagesForEdit(value);
    if (incoming.length >= current.length) {
      next.languages = incoming;
      return;
    }
    const names = new Set(current.map((item) => item.language.toLowerCase()));
    incoming.forEach((item) => {
      if (item.language && !names.has(item.language.toLowerCase())) current.push(item);
    });
    next.languages = current;
    return;
  }
  if (key === 'interests') {
    next.interests = coerceInterestsForEdit(value);
    return;
  }
  if (key === 'skills') {
    next.skills = coerceSkillsForEdit(value);
    return;
  }
  if (key === 'basics') {
    next.basics = mergeBasics(next.basics, value);
    return;
  }
  if (key === 'experience' && Array.isArray(value)) {
    next.experience = value;
    return;
  }
  if (key.startsWith('_')) return;
  if (key === 'metadata') {
    next.metadata = { ...(next.metadata || {}), ...value };
    return;
  }
  next[key] = value;
}

export function mergeMoriCvIntoCanvas(
  currentCv: any,
  parsed: {
    operations?: CVEditOperation[] | null;
    patch?: Record<string, any> | null;
    updatedCV?: any | null;
  }
) {
  if (!currentCv || typeof currentCv !== 'object') return parsed.updatedCV || currentCv;

  // Normalize CV data to ensure stable IDs
  const cv = normalizeCvData(currentCv);

  // ── PATH A: Structured edit operations (new, deterministic system) ──
  if (Array.isArray(parsed.operations) && parsed.operations.length > 0) {
    const session = applyEditOperations(cv, parsed.operations);

    if (session.allSucceeded) {
      // Verify something actually changed
      const diffs = diffCVData(currentCv, session.cvData);
      if (diffs.length === 0) {
        // No actual changes — operations were valid but produced no diff
        console.warn('[mori-chat] Operations applied but no changes detected. Operations:', parsed.operations.map(op => `${op.operation}:${(op as any).sectionId}/${(op as any).recordId}`).join(', '));
        return null;
      }

      console.log(`[mori-chat] Applied ${session.results.length} operations, ${diffs.length} fields changed`);
      // The AI edits the ordered `descriptions` blocks; the canvas/ATS/exports
      // read the legacy `summary`/`highlights` view. `preferExisting: true`
      // because here the blocks are the newer, intentional edit.
      return materializeCvDescriptionViews(session.cvData, { preferExisting: true });
    } else {
      // Operations failed validation — fall through to legacy patch if available
      const failedOps = session.results.filter(r => !r.success);
      console.warn('[mori-chat] Operations failed:', failedOps.map(r => `${r.operation.operation}:${r.error}`).join('; '));
      if (!parsed.patch && !parsed.updatedCV) {
        console.warn('[mori-chat] No patch/updatedCV fallback — CV will NOT be updated');
        return null; // No fallback available
      }
      console.log('[mori-chat] Falling back to patch/updatedCV merge');
    }
  } else if (parsed.operations && parsed.operations.length === 0) {
    console.warn('[mori-chat] Operations array is empty — nothing to apply');
  }

  // ── PATH B: Legacy section-level patch (backward compatibility) ──
  const next = { ...cv };
  let changed = false;

  if (parsed.updatedCV && typeof parsed.updatedCV === 'object') {
    const incoming = parsed.updatedCV;
    const keys = Object.keys(incoming).filter((key) => !key.startsWith('_'));
    keys.forEach((key) => {
      applySection(next, key, incoming[key], false);
    });
    changed = true;
    console.log(`[mori-chat] Applied updatedCV with keys: ${keys.join(', ')}`);
  }

  if (parsed.patch && typeof parsed.patch === 'object') {
    const patchKeys = Object.keys(parsed.patch);
    Object.entries(parsed.patch).forEach(([key, value]) => {
      applySection(next, key, value, true);
    });
    changed = true;
    console.log(`[mori-chat] Applied patch with keys: ${patchKeys.join(', ')}`);
  }

  return changed ? materializeCvDescriptionViews(next, { preferExisting: true }) : null;
}
