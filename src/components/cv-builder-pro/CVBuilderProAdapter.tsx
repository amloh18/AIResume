import React, { useMemo, useCallback, forwardRef } from 'react';
import CVCanvasEngine, { CVCanvasBuilderRef } from './CVCanvasEngine';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { normalizeCvDataForCanvas, normalizeSkillsText } from '@/lib/utils/cv-canvas-normalizer';

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

function safeString(value: any, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeArray(value: any, fallback: any[] = []): any[] {
  return Array.isArray(value) ? value : fallback;
}

const CVBuilderProAdapter = forwardRef<CVCanvasBuilderRef, CVBuilderProAdapterProps>(({ cvData, template, onDataChange, onTemplateChange, theme, readOnly = false, cvId, jobId, role, moriChatMode = false, isGuestMode = false }: CVBuilderProAdapterProps, ref) => {
  const canvasData = useMemo(() => normalizeCvDataForCanvas(cvData), [cvData]);

  const handleDataChange = useCallback((updatedCanvasData: any) => {
    if (!updatedCanvasData || !onDataChange) return;

    const clone = (source: any) => {
      if (typeof structuredClone === 'function') {
        try {
          return structuredClone(source);
        } catch {
          return JSON.parse(JSON.stringify(source));
        }
      }
      return JSON.parse(JSON.stringify(source));
    };

    const newCvData = clone(cvData);

    if (updatedCanvasData.basics) {
      const updatedBasics = updatedCanvasData.basics;
      const profileEntries = safeArray(updatedBasics.profiles);
      const nonLinkedInProfiles = profileEntries.filter((p: any) => p?.network?.toLowerCase() !== 'linkedin');

      Object.keys(updatedBasics).forEach((key) => {
        if (key === 'location') {
          if (!newCvData.basics.location) newCvData.basics.location = {};
          if (typeof updatedBasics.location === 'string') {
            const parts = updatedBasics.location.split(',').map((p: string) => p.trim()).filter(Boolean);
            newCvData.basics.location = {
              city: parts[0] || '',
              region: parts[1] || '',
              countryCode: parts[2] || '',
              address: '',
              postalCode: ''
            };
          } else if (typeof updatedBasics.location === 'object' && updatedBasics.location !== null) {
            newCvData.basics.location = {
              city: safeString(updatedBasics.location.city),
              region: safeString(updatedBasics.location.region),
              countryCode: safeString(updatedBasics.location.countryCode),
              address: safeString(updatedBasics.location.address),
              postalCode: safeString(updatedBasics.location.postalCode)
            };
          }
          return;
        }

        if (key === 'title') {
          newCvData.basics.label = safeString(updatedBasics.title);
          (newCvData.basics as any).title = updatedBasics.title;
          return;
        }

        if (key === 'website') {
          newCvData.basics.url = safeString(updatedBasics.website);
          (newCvData.basics as any).website = updatedBasics.website;
          return;
        }

        if (key === 'linkedin' || key === 'profiles') {
          return;
        }

        if (key === 'image') {
          newCvData.basics.image = safeString(updatedBasics.image);
          return;
        }

        if (key === 'email') {
          newCvData.basics.email = safeString(updatedBasics.email);
          return;
        }

        if (key === 'phone') {
          newCvData.basics.phone = safeString(updatedBasics.phone);
          return;
        }

        if (key === 'summary') {
          newCvData.basics.summary = safeString(updatedBasics.summary);
          return;
        }

        if (key === 'profiles') {
          return;
        }

        (newCvData.basics as any)[key] = updatedBasics[key];
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

    if (updatedCanvasData.sectionTitles) {
      newCvData.sectionTitles = updatedCanvasData.sectionTitles;
    }
    if (updatedCanvasData.metadata) {
      newCvData.metadata = {
        ...(newCvData.metadata || {}),
        ...updatedCanvasData.metadata
      };
    }

    const copyDirectly = ['certifications', 'awards', 'publications', 'references'];
    copyDirectly.forEach((key) => {
      if (updatedCanvasData[key]) {
        newCvData[key] = updatedCanvasData[key];
      }
    });

    if (Array.isArray(updatedCanvasData?.projects)) {
      newCvData.projects = updatedCanvasData.projects.map((proj: any) => {
        let description = '';
        let highlights: string[] = [];

        if (proj.description) {
          const liMatches = proj.description.match(/<li[^>]*>(.*?)<\/li>/g);
          if (liMatches) {
            highlights = liMatches.map((li: string) => li.replace(/<li[^>]*>/, '').replace(/<\/li>/, '').trim());
          }
          const pMatch = proj.description.match(/<p>(.*?)<\/p>/);
          if (pMatch) {
            description = pMatch[1].replace(/<[^>]+>/g, '').trim();
          } else {
            description = proj.description.replace(/<ul>[\s\S]*?<\/ul>/, '').replace(/<[^>]+>/g, '').trim();
          }
        }

        return {
          ...proj,
          description,
          highlights
        };
      });
    }

    if (Array.isArray(updatedCanvasData?.experience)) {
      newCvData.work = updatedCanvasData.experience.map((exp: any) => {
        let summary = '';
        let highlights: string[] = [];

        if (exp.description) {
          const liMatches = exp.description.match(/<li[^>]*>(.*?)<\/li>/g);
          if (liMatches) {
            highlights = liMatches.map((li: string) => li.replace(/<li[^>]*>/, '').replace(/<\/li>/, '').trim());
          }
          const pMatch = exp.description.match(/<p>(.*?)<\/p>/);
          if (pMatch) {
            summary = pMatch[1].replace(/<[^>]+>/g, '').trim();
          } else {
            summary = exp.description.replace(/<ul>[\s\S]*?<\/ul>/, '').replace(/<[^>]+>/g, '').trim();
          }
        }

        return {
          id: exp.id,
          position: safeString(exp.role),
          name: safeString(exp.company),
          url: safeString(exp.url),
          startDate: safeString(exp.startDate),
          endDate: safeString(exp.endDate),
          summary,
          highlights
        };
      });
      delete newCvData.experience;
    }

    if (Array.isArray(updatedCanvasData?.volunteer)) {
      newCvData.volunteer = updatedCanvasData.volunteer.map((vol: any) => {
        let summary = '';
        let highlights: string[] = [];

        if (vol.description) {
          const liMatches = vol.description.match(/<li[^>]*>(.*?)<\/li>/g);
          if (liMatches) {
            highlights = liMatches.map((li: string) => li.replace(/<li[^>]*>/, '').replace(/<\/li>/, '').trim());
          }
          const pMatch = vol.description.match(/<p>(.*?)<\/p>/);
          if (pMatch) {
            summary = pMatch[1].replace(/<[^>]+>/g, '').trim();
          } else {
            summary = vol.description.replace(/<ul>[\s\S]*?<\/ul>/, '').replace(/<[^>]+>/g, '').trim();
          }
        }

        return {
          id: vol.id,
          position: safeString(vol.role),
          organization: safeString(vol.organization),
          url: safeString(vol.url),
          startDate: safeString(vol.startDate),
          endDate: safeString(vol.endDate),
          summary,
          highlights
        };
      });
    }

    if (Array.isArray(updatedCanvasData?.education)) {
      newCvData.education = updatedCanvasData.education.map((edu: any) => {
        const rawDegree = safeString(edu.degree);
        let studyType = rawDegree;
        let area = '';

        if (rawDegree.includes(' in ')) {
          [studyType, area] = rawDegree.split(' in ');
        } else if (rawDegree.includes(',')) {
          const commaParts = rawDegree.split(',').map((p: string) => p.trim()).filter(Boolean);
          studyType = commaParts[0] || rawDegree;
          area = commaParts.slice(1).join(', ');
        }

        const descriptionLines = stripHtml(safeString(edu.description))
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        const scoreLine = descriptionLines.find((line: string) => /^score:/i.test(line));
        const remainingDescription = descriptionLines
          .filter((line: string) => line !== scoreLine)
          .join('\n');

        return {
          id: edu.id,
          studyType: studyType.trim(),
          area: area.trim(),
          institution: safeString(edu.institution),
          url: safeString(edu.url),
          startDate: safeString(edu.startDate),
          endDate: safeString(edu.endDate),
          score: scoreLine ? scoreLine.replace(/^score:\s*/i, '').trim() : '',
          description: remainingDescription
        };
      });
      delete newCvData.education_temp;
    }

    if (updatedCanvasData?.skills) {
      if (Array.isArray(updatedCanvasData.skills)) {
        newCvData.skills = updatedCanvasData.skills
          .map((group: any) => {
            const skillsText = typeof group.skillsText === 'string'
              ? group.skillsText
              : normalizeSkillsText(group.skills || group.keywords || []);

            const skills = safeString(skillsText)
              .split(/[,\n]/)
              .map((item: string) => item.trim())
              .filter(Boolean);

            return {
              category: safeString(group.category || group.name || ''),
              skills
            };
          })
          .filter((group: any) => group.category || group.skills.length > 0);
      } else if (typeof updatedCanvasData.skills === 'object') {
        const newSkills: any[] = [];
        const legacyLanguages = safeString((updatedCanvasData.skills as any).languages);
        const legacyFrameworks = safeString((updatedCanvasData.skills as any).frameworks);
        const legacyTools = safeString((updatedCanvasData.skills as any).tools);

        if (legacyLanguages) {
          newSkills.push({ category: 'Core Languages', skills: legacyLanguages.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        if (legacyFrameworks) {
          newSkills.push({ category: 'Frameworks', skills: legacyFrameworks.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        if (legacyTools) {
          newSkills.push({ category: 'Tools & Tech', skills: legacyTools.split(',').map((s: string) => s.trim()).filter(Boolean) });
        }
        newCvData.skills = newSkills;
      }
    }

    if (updatedCanvasData?.languages) {
      if (Array.isArray(updatedCanvasData.languages)) {
        newCvData.languages = updatedCanvasData.languages.map((l: any) => {
          if (typeof l === 'string') {
            return { language: l.trim(), fluency: '' };
          }
          return {
            language: safeString(l.language),
            fluency: safeString(l.fluency)
          };
        });
      } else if (typeof updatedCanvasData.languages === 'string') {
        newCvData.languages = updatedCanvasData.languages.split(',').map((l: string) => ({ language: l.trim(), fluency: '' })).filter((l: any) => l.language);
      }
    }

    if (updatedCanvasData?.interests) {
      if (Array.isArray(updatedCanvasData.interests)) {
        newCvData.interests = updatedCanvasData.interests.map((i: any) => {
          if (typeof i === 'string') {
            return { name: i.trim(), keywords: [] };
          }
          return {
            name: safeString(i.name),
            keywords: safeArray(i.keywords)
          };
        });
      } else if (typeof updatedCanvasData.interests === 'string') {
        newCvData.interests = updatedCanvasData.interests.split(',').map((i: string) => ({ name: i.trim(), keywords: [] })).filter((i: any) => i.name);
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
