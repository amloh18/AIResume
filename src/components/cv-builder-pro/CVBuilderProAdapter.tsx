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
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').trim();

const CVBuilderProAdapter = forwardRef<CVCanvasBuilderRef, CVBuilderProAdapterProps>(({ cvData, template, onDataChange, onTemplateChange, theme, readOnly = false, cvId, jobId, role, moriChatMode = false }: CVBuilderProAdapterProps, ref) => {
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

    const copyDirectly = ['projects', 'certifications', 'awards', 'publications', 'volunteer', 'references'];
    copyDirectly.forEach(key => {
      if (updatedCanvasData[key]) {
        newCvData[key] = updatedCanvasData[key];
      }
    });

    if (Array.isArray(updatedCanvasData?.experience)) {
      newCvData.work = updatedCanvasData.experience.map((exp: any) => {
        let summary = '';
        let highlights: string[] = [];
        
        if (exp.description) {
          const liMatches = exp.description.match(/<li>(.*?)<\/li>/g);
          if (liMatches) {
            highlights = liMatches.map((li: string) => li.replace(/<\/?li>/g, '').trim());
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
          position: exp.role,
          name: exp.company,
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          summary,
          highlights
        };
      });
      delete newCvData.experience;
    }
    
    if (Array.isArray(updatedCanvasData?.education)) {
      newCvData.education = updatedCanvasData.education.map((edu: any) => {
        let studyType = edu.degree;
        let area = '';
        if (edu.degree && edu.degree.includes(' in ')) {
          [studyType, area] = edu.degree.split(' in ');
        }

        const descriptionLines = stripHtml(edu.description || '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        const scoreLine = descriptionLines.find((line) => /^score:/i.test(line));
        const remainingDescription = descriptionLines
          .filter((line) => line !== scoreLine)
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

            return {
              category: (group.category || '').trim(),
              skills,
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
      if (typeof updatedCanvasData.languages === 'string') {
        newCvData.languages = updatedCanvasData.languages.split(',').map((l: string) => ({ language: l.trim(), fluency: '' })).filter((l: any) => l.language);
      } else if (Array.isArray(updatedCanvasData.languages)) {
        newCvData.languages = updatedCanvasData.languages.map((l: any) => typeof l === 'string' ? { language: l.trim(), fluency: '' } : l);
      }
    }

    if (updatedCanvasData?.interests) {
      if (typeof updatedCanvasData.interests === 'string') {
        newCvData.interests = updatedCanvasData.interests.split(',').map((i: string) => ({ name: i.trim(), keywords: [] })).filter((i: any) => i.name);
      } else if (Array.isArray(updatedCanvasData.interests)) {
        newCvData.interests = updatedCanvasData.interests.map((i: any) => typeof i === 'string' ? { name: i.trim(), keywords: [] } : i);
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
    />
  );
});

CVBuilderProAdapter.displayName = 'CVBuilderProAdapter';
export default CVBuilderProAdapter;
