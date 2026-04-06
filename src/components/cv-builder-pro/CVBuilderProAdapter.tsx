import React, { useMemo, useCallback, forwardRef } from 'react';
import CVCanvasEngine from './CVCanvasEngine';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';

interface CVBuilderProAdapterProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate | null;
  onDataChange: (updatedData: UnifiedCVDataStructure) => void;
  onTemplateChange?: (newTemplate: ITemplate) => void;
  theme?: 'dark' | 'light';
}

const CVBuilderProAdapter = forwardRef(({ cvData, template, onDataChange, onTemplateChange, theme }: CVBuilderProAdapterProps, ref) => {
  // Bridge the data format if needed. Currently, UnifiedCVDataStructure might have .work instead of .experience.
  const canvasData = useMemo(() => {
    if (!cvData) return null;
    const translated = JSON.parse(JSON.stringify(cvData));
    
    // Map basics
    if (translated.basics) {
      if (typeof translated.basics.location === 'object' && translated.basics.location !== null) {
        const loc = translated.basics.location;
        translated.basics.location = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
      }
      if (!translated.basics.title && translated.basics.label) {
        translated.basics.title = translated.basics.label;
      }
    }

    // Map work -> experience
    if (cvData.work) {
      translated.experience = cvData.work.map((w: any) => ({
        id: w.id || `exp-${Date.now()}-${Math.random()}`,
        role: w.position,
        company: w.name,
        date: w.startDate && w.endDate ? `${w.startDate} - ${w.endDate}` : w.startDate || w.endDate || '',
        description: w.summary ? `<p>${w.summary}</p>` + (w.highlights?.length ? `<ul>${w.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>` : '') : '',
      }));
    }
    
    // Map education
    if (cvData.education) {
      translated.education = cvData.education.map((e: any) => ({
        id: e.id || `edu-${Date.now()}-${Math.random()}`,
        degree: e.studyType ? `${e.studyType} in ${e.area}` : e.area,
        institution: e.institution,
        date: e.startDate && e.endDate ? `${e.startDate} - ${e.endDate}` : e.startDate || e.endDate || '',
        description: e.score ? `<p>Score: ${e.score}</p>` : '',
      }));
    }

    // Map skills from Array to Object
    if (Array.isArray(cvData.skills)) {
      const skillsObj: any = { languages: '', frameworks: '', tools: '' };
      cvData.skills.forEach((skillGrp: any) => {
        const name = (skillGrp.name || '').toLowerCase();
        const keywordsStr = Array.isArray(skillGrp.keywords) ? skillGrp.keywords.join(', ') : '';
        if (name.includes('language') || name.includes('core')) {
          skillsObj.languages = skillsObj.languages ? skillsObj.languages + ', ' + keywordsStr : keywordsStr;
        } else if (name.includes('framework') || name.includes('library')) {
          skillsObj.frameworks = skillsObj.frameworks ? skillsObj.frameworks + ', ' + keywordsStr : keywordsStr;
        } else {
          skillsObj.tools = skillsObj.tools ? skillsObj.tools + ', ' + keywordsStr : keywordsStr;
        }
      });
      // Fallback if no specific categories were found but skills exist
      if (!skillsObj.languages && !skillsObj.frameworks && !skillsObj.tools && cvData.skills.length > 0) {
        skillsObj.languages = cvData.skills.map((s: any) => Array.isArray(s.keywords) ? s.keywords.join(', ') : s.name).filter(Boolean).join(', ');
      }
      translated.skills = skillsObj;
    }

    if (Array.isArray(cvData.languages)) {
      translated.languages = cvData.languages.map((l: any) => l.language || l).join(', ');
    }

    if (Array.isArray(cvData.interests)) {
      translated.interests = cvData.interests.map((i: any) => i.name || i).join(', ');
    }

    // Default Section Titles
    translated.sectionTitles = translated.sectionTitles || {
      summary: 'Professional Summary',
      experience: 'Professional Experience',
      education: 'Education',
      projects: 'Projects',
      certifications: 'Certifications',
      awards: 'Awards',
      publications: 'Publications',
      volunteer: 'Volunteer Experience',
      references: 'References',
      skills: 'Skills',
      languages: 'Languages',
      interests: 'Interests',
      contact: 'Contact'
    };

    return translated;
  }, [cvData]);

  const handleDataChange = useCallback((updatedCanvasData: any) => {
    // Reverse map the changes back to UnifiedCVDataStructure
    const newCvData = { ...updatedCanvasData };
    
    if (updatedCanvasData?.experience) {
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
          startDate: exp.date ? exp.date.split(' - ')[0].trim() : '',
          endDate: exp.date && exp.date.includes(' - ') ? exp.date.split(' - ')[1].trim() : '',
          summary,
          highlights
        };
      });
      delete newCvData.experience;
    }
    
    if (updatedCanvasData?.education) {
      newCvData.education = updatedCanvasData.education.map((edu: any) => {
        let studyType = edu.degree;
        let area = '';
        if (edu.degree && edu.degree.includes(' in ')) {
          [studyType, area] = edu.degree.split(' in ');
        }
        return {
          id: edu.id,
          studyType: studyType?.trim() || '',
          area: area?.trim() || '',
          institution: edu.institution,
          startDate: edu.date ? edu.date.split(' - ')[0]?.trim() : '',
          endDate: edu.date && edu.date.includes(' - ') ? edu.date.split(' - ')[1]?.trim() : '',
          score: edu.description ? edu.description.replace(/<[^>]+>/g, '').replace('Score: ', '').trim() : ''
        };
      });
      delete newCvData.education_temp; // Clean up temp key if used
    }

    if (updatedCanvasData?.skills && typeof updatedCanvasData.skills === 'object' && !Array.isArray(updatedCanvasData.skills)) {
      const newSkills: any[] = [];
      if (updatedCanvasData.skills.languages) {
        newSkills.push({ name: 'Core Languages', keywords: updatedCanvasData.skills.languages.split(',').map((s: string) => s.trim()).filter(Boolean) });
      }
      if (updatedCanvasData.skills.frameworks) {
        newSkills.push({ name: 'Frameworks', keywords: updatedCanvasData.skills.frameworks.split(',').map((s: string) => s.trim()).filter(Boolean) });
      }
      if (updatedCanvasData.skills.tools) {
        newSkills.push({ name: 'Tools & Tech', keywords: updatedCanvasData.skills.tools.split(',').map((s: string) => s.trim()).filter(Boolean) });
      }
      newCvData.skills = newSkills;
    }

    if (updatedCanvasData?.languages && typeof updatedCanvasData.languages === 'string') {
      newCvData.languages = updatedCanvasData.languages.split(',').map((l: string) => ({ language: l.trim(), fluency: '' })).filter((l: any) => l.language);
    }

    if (updatedCanvasData?.interests && typeof updatedCanvasData.interests === 'string') {
      newCvData.interests = updatedCanvasData.interests.split(',').map((i: string) => ({ name: i.trim(), keywords: [] })).filter((i: any) => i.name);
    }

    onDataChange(newCvData);
  }, [onDataChange]);

  if (!canvasData) return null;

  return (
    <CVCanvasEngine
      ref={ref as any}
      cvData={canvasData}
      template={template}
      onDataChange={handleDataChange}
      onTemplateChange={onTemplateChange}
      theme={theme}
    />
  );
});

CVBuilderProAdapter.displayName = 'CVBuilderProAdapter';
export default CVBuilderProAdapter;
