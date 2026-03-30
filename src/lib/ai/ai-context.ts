import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export type SectionType = 
  | 'basics'
  | 'work'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certificates'
  | 'languages'
  | 'volunteer'
  | 'awards'
  | 'publications';

export type FieldType = 
  | 'summary'
  | 'headline'
  | 'bullet'
  | 'skill'
  | 'date'
  | 'title'
  | 'company'
  | 'description'
  | 'degree'
  | 'institution';

export interface AIContextInput {
  resumeData: UnifiedCVDataStructure;
  section?: SectionType;
  itemId?: string;
  fieldType?: FieldType;
  targetRole?: string;
  targetCompany?: string;
  targetIndustry?: string;
  jobDescription?: string;
}

export interface AIContext {
  role: string;
  company: string;
  industry: string;
  section: SectionType;
  itemId?: string;
  fieldType?: FieldType;
  fullResume: UnifiedCVDataStructure;
  sectionData?: any;
  relatedSections?: Record<string, any>;
  targetRole?: string;
  targetCompany?: string;
  targetIndustry?: string;
  jobDescription?: string;
}

export const buildAIContext = (input: AIContextInput): AIContext => {
  const { resumeData, section, itemId, fieldType, targetRole, targetCompany, targetIndustry, jobDescription } = input;

  const role = targetRole || resumeData.basics?.label || '';
  const company = targetCompany || '';
  const industry = targetIndustry || '';

  let sectionData: any = undefined;
  let relatedSections: Record<string, any> = {};

  switch (section) {
    case 'basics':
      sectionData = resumeData.basics;
      relatedSections = {
        summary: resumeData.basics?.summary,
        profiles: resumeData.basics?.profiles,
      };
      break;
    case 'work':
      const workItem = resumeData.work?.find((w: any) => w.id === itemId);
      sectionData = workItem;
      relatedSections = {
        skills: resumeData.skills,
        projects: resumeData.projects,
      };
      break;
    case 'education':
      const eduItem = resumeData.education?.find((e: any) => e.id === itemId);
      sectionData = eduItem;
      relatedSections = {
        skills: resumeData.skills,
      };
      break;
    case 'skills':
      sectionData = resumeData.skills;
      relatedSections = {
        work: resumeData.work,
        projects: resumeData.projects,
      };
      break;
    case 'projects':
      const projectItem = resumeData.projects?.find((p: any) => p.id === itemId);
      sectionData = projectItem;
      relatedSections = {
        skills: resumeData.skills,
        work: resumeData.work,
      };
      break;
    case 'certificates':
      sectionData = resumeData.certificates;
      relatedSections = {
        skills: resumeData.skills,
        education: resumeData.education,
      };
      break;
    case 'languages':
      sectionData = resumeData.languages;
      break;
    case 'volunteer':
      sectionData = resumeData.volunteer;
      relatedSections = {
        work: resumeData.work,
      };
      break;
    case 'awards':
      sectionData = resumeData.awards;
      relatedSections = {
        work: resumeData.work,
        education: resumeData.education,
      };
      break;
    case 'publications':
      sectionData = resumeData.publications;
      relatedSections = {
        education: resumeData.education,
      };
      break;
    default:
      sectionData = resumeData.basics;
  }

  return {
    role,
    company,
    industry,
    section: section || 'basics',
    itemId,
    fieldType,
    fullResume: resumeData,
    sectionData,
    relatedSections,
    targetRole,
    targetCompany,
    targetIndustry,
    jobDescription,
  };
};

export const getSectionLabel = (section: SectionType): string => {
  const labels: Record<SectionType, string> = {
    basics: 'Personal Info',
    work: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    languages: 'Languages',
    volunteer: 'Volunteer',
    awards: 'Awards',
    publications: 'Publications',
  };
  return labels[section];
};

export const getFieldLabel = (field: FieldType): string => {
  const labels: Record<FieldType, string> = {
    summary: 'Summary',
    headline: 'Headline',
    bullet: 'Bullet Point',
    skill: 'Skill',
    date: 'Date',
    title: 'Title',
    company: 'Company',
    description: 'Description',
    degree: 'Degree',
    institution: 'Institution',
  };
  return labels[field];
};

export const formatContextForPrompt = (context: AIContext): string => {
  const parts: string[] = [];

  if (context.role) {
    parts.push(`Target Role: ${context.role}`);
  }
  if (context.company) {
    parts.push(`Company: ${context.company}`);
  }
  if (context.industry) {
    parts.push(`Industry: ${context.industry}`);
  }

  parts.push(`Section: ${getSectionLabel(context.section)}`);

  if (context.fieldType) {
    parts.push(`Field: ${getFieldLabel(context.fieldType)}`);
  }

  return parts.join(' | ');
};

export const extractContextFromEditor = (
  editorState: any,
  cursorPosition: number
): Partial<AIContext> => {
  if (!editorState) return {};

  const { state } = editorState;
  const { selection } = state;
  const { $from } = selection;

  let section: SectionType = 'basics';
  let itemId: string | undefined;
  let fieldType: FieldType | undefined;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    const nodeType = node.type.name;

    if (nodeType.includes('experience') || nodeType.includes('work')) {
      section = 'work';
      itemId = node.attrs.id;
      fieldType = 'description';
    } else if (nodeType.includes('education')) {
      section = 'education';
      itemId = node.attrs.id;
      fieldType = 'description';
    } else if (nodeType.includes('skill')) {
      section = 'skills';
      itemId = node.attrs.id;
      fieldType = 'skill';
    } else if (nodeType.includes('project')) {
      section = 'projects';
      itemId = node.attrs.id;
      fieldType = 'description';
    } else if (nodeType === 'bulletNode') {
      fieldType = 'bullet';
    }
  }

  return { section, itemId, fieldType };
};