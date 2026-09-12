import React, { useMemo, useCallback, forwardRef } from 'react';
import CVCanvasEngine, { CVCanvasBuilderRef } from './CVCanvasEngine';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { normalizeCvDataForCanvas, normalizeSkillsText } from '@/lib/utils/cv-canvas-normalizer';
import { clampLevel, fluencyToLevel, levelToFluency, serializeLanguagesForStorage } from '@/lib/utils/cv-snippet-data';

interface CVBuilderProAdapterProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate | null;
  onDataChange?: (updatedData: UnifiedCVDataStructure) => void;
  onTemplateChange?: (newTemplate: ITemplate) => void;
  theme?: 'dark' | 'light';
  readOnly?: boolean;
  cvId?: string | null;
  jobId?: string | null;
  role?: string | null;
  moriChatMode?: boolean;
  isGuestMode?: boolean;
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').trim();

/**
 * Extract highlights (bullet points) from HTML description.
 * Preserves inline formatting (<strong>, <em>, <a>, <u>) within each highlight.
 */
const extractHighlightsFromHtml = (html: string): string[] => {
  const liMatches = html.match(/<li[^>]*>[\s\S]*?<\/li>/g);
  if (!liMatches) return [];
  return liMatches.map((li: string) =>
    li.replace(/<li[^>]*>/, '').replace(/<\/li>/, '').trim()
  ).filter(Boolean);
};

/**
 * Extract summary (paragraph text) from HTML description.
 * Supports multiple <p> blocks (joined with double newlines).
 * Preserves inline formatting (<strong>, <em>, <a>, <u>) within paragraphs.
 * Falls back to stripping all tags if no <p> found.
 */
const extractSummaryFromHtml = (html: string): string => {
  // Extract all <p>...</p> blocks (global match)
  const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/g);
  if (pMatches && pMatches.length > 0) {
    const paragraphs = pMatches
      .map((p: string) => p.replace(/<p[^>]*>/, '').replace(/<\/p>/, '').trim())
      .filter(Boolean);
    return paragraphs.join('\n\n');
  }
  // Fallback: strip <ul>/<li> blocks and structural tags, preserve inline formatting
  return html
    .replace(/<ul>[\s\S]*?<\/ul>/g, '')
    .replace(/<\/?(?:span|div|font|label|section|article|header|footer|nav|main|aside)[^>]*>/gi, '')
    .trim();
};

const CVBuilderProAdapter = forwardRef<CVCanvasBuilderRef, CVBuilderProAdapterProps>(({ cvData, template, onDataChange, onTemplateChange, theme, readOnly = false, cvId, jobId, role, moriChatMode = false, isGuestMode = false }: CVBuilderProAdapterProps, ref) => {
  const canvasData = useMemo(() => normalizeCvDataForCanvas(cvData), [cvData]);

  const handleDataChange = useCallback((updatedCanvasData: any) => {
    if (!updatedCanvasData || !onDataChange) return;

    // Reverse map the changes back to UnifiedCVDataStructure
    // We deep copy the original cvData to avoid destroying unmapped nested structures (like basics.location object)
    const newCvData = JSON.parse(JSON.stringify(cvData));
    
    // Copy simple scalar fields back from updatedCanvasData.basics to newCvData.basics
    if (updatedCanvasData.basics) {
      const updatedBasics = updatedCanvasData.basics;
      const profileEntries = Array.isArray(updatedBasics.profiles) ? updatedBasics.profiles : [];
      const nonLinkedInProfiles = profileEntries.filter((p: any) => p?.network?.toLowerCase() !== 'linkedin');

      Object.keys(updatedBasics).forEach(key => {
        if (key === 'location') {
          if (!newCvData.basics.location) newCvData.basics.location = {};
          if (typeof updatedBasics.location === 'string') {
            newCvData.basics.location = {
              city: updatedBasics.location,
              countryCode: '',
              region: ''
            };
          }
          return;
        }

        if (key === 'title') {
          newCvData.basics.label = updatedBasics.title;
          (newCvData.basics as any).title = updatedBasics.title;
          return;
        }

        if (key === 'website') {
          newCvData.basics.url = updatedBasics.website;
          (newCvData.basics as any).website = updatedBasics.website;
          return;
        }

        if (key === 'linkedin' || key === 'profiles') {
          return;
        }

        newCvData.basics[key] = updatedBasics[key];
      });

      if (updatedBasics.linkedin) {
        nonLinkedInProfiles.push({
          network: 'LinkedIn',
          username: '',
          url: updatedBasics.linkedin
        });
      }

      newCvData.basics.profiles = nonLinkedInProfiles;
      (newCvData.basics as any).linkedin = updatedBasics.linkedin || '';
    }

    // Copy sectionTitles and metadata
    if (updatedCanvasData.sectionTitles) {
      newCvData.sectionTitles = updatedCanvasData.sectionTitles;
    }
    if (updatedCanvasData.metadata) {
      newCvData.metadata = {
        ...newCvData.metadata,
        ...updatedCanvasData.metadata
      };
    }

    if (Array.isArray(updatedCanvasData?.certifications) || Array.isArray(updatedCanvasData?.certificates)) {
      const certs = updatedCanvasData.certifications || updatedCanvasData.certificates;
      newCvData.certificates = certs.map((cert: any) => ({
        ...cert,
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || cert.startDate || '',
        url: cert.url || '',
        description: cert.description || '',
      }));
    }

    if (Array.isArray(updatedCanvasData?.awards)) {
      newCvData.awards = updatedCanvasData.awards.map((award: any) => ({
        ...award,
        title: award.title || award.name || '',
        date: award.date || award.startDate || '',
        awarder: award.awarder || award.issuer || '',
        summary: award.summary || '',
      }));
    }

    if (Array.isArray(updatedCanvasData?.publications)) {
      newCvData.publications = updatedCanvasData.publications.map((pub: any) => ({
        ...pub,
        name: pub.name || pub.title || '',
        publisher: pub.publisher || '',
        releaseDate: pub.releaseDate || pub.startDate || '',
        url: pub.url || '',
        summary: pub.summary || pub.description || '',
      }));
    }

    if (Array.isArray(updatedCanvasData?.references)) {
      newCvData.references = updatedCanvasData.references.map((ref: any) => ({
        ...ref,
        name: ref.name || '',
        reference: ref.reference || ref.role || '',
      }));
    }

    if (updatedCanvasData?.stats) {
      newCvData.stats = updatedCanvasData.stats;
    }

    if (Array.isArray(updatedCanvasData?.projects)) {
      newCvData.projects = updatedCanvasData.projects.map((proj: any) => ({
        ...proj,
        description: extractSummaryFromHtml(proj.description || ''),
        highlights: extractHighlightsFromHtml(proj.description || ''),
      }));
    }

    if (Array.isArray(updatedCanvasData?.experience)) {
      newCvData.work = updatedCanvasData.experience.map((exp: any) => ({
        id: exp.id,
        position: exp.role,
        name: exp.company,
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        summary: extractSummaryFromHtml(exp.description || ''),
        highlights: extractHighlightsFromHtml(exp.description || ''),
      }));
      delete newCvData.experience;
    }

    if (Array.isArray(updatedCanvasData?.volunteer)) {
      newCvData.volunteer = updatedCanvasData.volunteer.map((vol: any) => ({
        id: vol.id,
        position: vol.role,
        organization: vol.organization,
        startDate: vol.startDate || '',
        endDate: vol.endDate || '',
        url: vol.url || '',
        summary: extractSummaryFromHtml(vol.description || ''),
        highlights: extractHighlightsFromHtml(vol.description || ''),
      }));
    }
    
    if (Array.isArray(updatedCanvasData?.education)) {
      newCvData.education = updatedCanvasData.education.map((edu: any) => {
        let studyType = edu.degree;
        let area = '';
        if (edu.degree && edu.degree.includes(' in ')) {
          [studyType, area] = edu.degree.split(' in ');
        }

        const descriptionText = extractSummaryFromHtml(edu.description || '');
        const descriptionLines = descriptionText
          .split(/\n+/)
          .map((line: string) => line.trim())
          .filter(Boolean);
        const scoreLine = descriptionLines.find((line: string) => /^score:/i.test(line));
        const remainingDescription = descriptionLines
          .filter((line: string) => line !== scoreLine)
          .join('\n');

        return {
          id: edu.id,
          studyType: studyType?.trim() || '',
          area: area?.trim() || '',
          institution: edu.institution,
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          score: scoreLine ? scoreLine.replace(/^score:\s*/i, '').trim() : '',
          description: remainingDescription
        };
      });
      delete newCvData.education_temp; // Clean up temp key if used
    }

    if (updatedCanvasData?.skills) {
      if (Array.isArray(updatedCanvasData.skills)) {
        newCvData.skills = updatedCanvasData.skills
          .map((group: any) => {
            const skillsText = typeof group.skillsText === 'string'
              ? group.skillsText
              : normalizeSkillsText(group.skills || group.keywords || []);

            const skills = skillsText
              .split(/[,\n]/)
              .map((item: string) => item.trim())
              .filter(Boolean);

            const levels = Array.isArray(group.levels)
              ? skills.map((_: string, skillIndex: number) => clampLevel(group.levels[skillIndex], group.rating || 3))
              : typeof group.rating === 'number'
                ? skills.map(() => clampLevel(group.rating))
                : undefined;

            return {
              category: (group.category || '').trim(),
              skills,
              ...(levels ? { levels } : {}),
              ...(typeof group.rating === 'number' ? { rating: group.rating } : {})
            };
          })
          .filter((group: any) => group.category || group.skills.length > 0);
      } else if (typeof updatedCanvasData.skills === 'object') {
        const newSkills: any[] = [];
        if (updatedCanvasData.skills.languages && typeof updatedCanvasData.skills.languages === 'string') {
          newSkills.push({ category: 'Core Languages', skills: updatedCanvasData.skills.languages.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        if (updatedCanvasData.skills.frameworks && typeof updatedCanvasData.skills.frameworks === 'string') {
          newSkills.push({ category: 'Frameworks', skills: updatedCanvasData.skills.frameworks.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        if (updatedCanvasData.skills.tools && typeof updatedCanvasData.skills.tools === 'string') {
          newSkills.push({ category: 'Tools & Tech', skills: updatedCanvasData.skills.tools.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        newCvData.skills = newSkills;
      }
    }

    if (updatedCanvasData?.languages) {
      newCvData.languages = serializeLanguagesForStorage(updatedCanvasData.languages).map((item) => ({
        language: item.language,
        fluency: item.fluency || levelToFluency(item.level),
        level: item.level || fluencyToLevel(item.fluency),
      }));
    }

    if (updatedCanvasData?.interests) {
      if (typeof updatedCanvasData.interests === 'string') {
        newCvData.interests = updatedCanvasData.interests.split(',').map((i: string) => ({ name: i.trim(), keywords: [] })).filter((i: any) => i.name);
      } else if (Array.isArray(updatedCanvasData.interests)) {
        newCvData.interests = updatedCanvasData.interests.map((i: any) => typeof i === 'string' ? { name: i.trim(), keywords: [] } : {
          name: i.name || '',
          keywords: Array.isArray(i.keywords) ? i.keywords : [],
        });
      }
    }

    onDataChange(newCvData);
  }, [cvData, onDataChange]);

  if (!canvasData) return null;

  return (
    <CVCanvasEngine
      ref={ref}
      cvData={canvasData}
      template={template}
      onDataChange={handleDataChange}
      onTemplateChange={onTemplateChange}
      theme={theme}
      readOnly={readOnly}
      cvId={cvId}
      jobId={jobId}
      role={role}
      moriChatMode={moriChatMode}
      isGuestMode={isGuestMode}
    />
  );
});

CVBuilderProAdapter.displayName = 'CVBuilderProAdapter';
export default CVBuilderProAdapter;
