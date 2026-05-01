
import React from 'react';
import { Quote, AlignJustify, Columns, LayoutTemplate, Sidebar, User, Briefcase, GraduationCap, FolderOpen, Award, Trophy, Code2, Globe, Heart, BookOpen, Users, MapPin, Phone, Mail, Linkedin, Link as LinkIcon, Github, Twitter, Facebook, Instagram, Youtube, Dribbble, Twitch, Figma, Gitlab } from 'lucide-react';
import ListEntry from './components/ListEntry';

// UNIFIED TYPOGRAPHY SYSTEM
// ==========================================
const TYPOGRAPHY = {
  name: "cv-name font-bold leading-tight tracking-tight text-gray-900",
  nameNarrow: "cv-name-narrow font-bold leading-tight tracking-tight text-gray-900",
  role: "cv-role font-semibold tracking-widest uppercase cv-accent-text",
  contact: "cv-contact font-medium tracking-wide text-gray-600",
  sectionTitle: "cv-heading font-extrabold uppercase tracking-[0.15em] text-gray-900",
  itemTitle: "cv-title font-bold text-gray-900",
  itemSubtitle: "cv-subtitle font-semibold italic text-gray-600",
  date: "cv-date font-bold tracking-widest uppercase cv-accent-text",
  body: "cv-body cv-prose text-gray-700",
};

// ==========================================
// TITLE STYLES REGISTRY
// ==========================================
export const getNetworkIcon = (network: string) => {
  const n = (network || '').toLowerCase();
  if (n.includes('linkedin')) return Linkedin;
  if (n.includes('github')) return Github;
  if (n.includes('twitter')) return Twitter;
  if (n.includes('facebook')) return Facebook;
  if (n.includes('instagram')) return Instagram;
  if (n.includes('youtube')) return Youtube;
  if (n.includes('dribbble')) return Dribbble;
  if (n.includes('twitch')) return Twitch;
  if (n.includes('figma')) return Figma;
  if (n.includes('gitlab')) return Gitlab;
  return LinkIcon;
};

export const ContactLinks = ({ data, Editable, isNarrow, showIcons, design, align = 'justify-center' }: any) => {
  const links: React.ReactNode[] = [];
  const headerLinks = design?.headerLinks || {};
  const isVisible = (key: string) => headerLinks[key] !== false;
  
  const seenValues = new Set<string>();

  const addLink = (key: string, value: string | undefined, node: React.ReactNode) => {
    if (!isVisible(key)) return;
    if (value && typeof value === 'string') {
      const normalized = value.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').trim();
      if (seenValues.has(normalized)) return;
      seenValues.add(normalized);
    }
    links.push(node);
  };
  
  addLink('location', data?.basics?.location, <span className={`flex items-center gap-1.5 ${align}`} key="loc">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span>);
  addLink('phone', data?.basics?.phone, <span className={`flex items-center gap-1.5 ${align}`} key="phone">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span>);
  addLink('email', data?.basics?.email, <span className={`flex items-center gap-1.5 ${align}`} key="email">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span>);
  
  // Legacy root fields
  if (data?.basics?.linkedin) {
    addLink('linkedin', data.basics.linkedin, <span className={`flex items-center gap-1.5 ${align}`} key="li">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span>);
  }
  if (data?.basics?.website) {
    addLink('website', data.basics.website, <span className={`flex items-center gap-1.5 ${align}`} key="web">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>);
  }
  
  // Profiles array
  if (data?.basics?.profiles && Array.isArray(data.basics.profiles)) {
    data.basics.profiles.forEach((profile: any, index: number) => {
      const net = profile.network?.toLowerCase() || `link-${index}`;
      const Icon = getNetworkIcon(net);
      addLink(net, profile.url, <span className={`flex items-center gap-1.5 ${align}`} key={`prof-${index}`}>{showIcons && <Icon size={13} /> }<Editable path={`basics.profiles.${index}.url`} breakAll /></span>);
    });
  }

  return (
    <>
      {links.map((link, i) => (
        <React.Fragment key={i}>
          {link}
          {!isNarrow && i < links.length - 1 && <span>&bull;</span>}
        </React.Fragment>
      ))}
    </>
  );
};

const LEGACY_SKILL_GROUP_LABELS: Record<string, string> = {
  languages: 'Core Languages',
  frameworks: 'Frameworks',
  tools: 'Tools & Tech',
  databases: 'Databases',
  soft: 'Soft Skills',
};

const splitSkillsText = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return (item.name || item.skill || item.label || '').trim();
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const clampSkillRating = (value: any, fallback = 4) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

const normalizeSkillGroups = (rawSkills: any) => {
  if (Array.isArray(rawSkills)) {
    return rawSkills
      .map((group: any, index: number) => {
        if (typeof group === 'string') {
          const skills = splitSkillsText(group);
          return {
            category: 'Skills',
            skillsText: group,
            skills,
            rating: undefined,
            pathCategory: `skills.${index}.category`,
            pathSkills: `skills.${index}.skillsText`,
          };
        }

        const skillsText = typeof group?.skillsText === 'string'
          ? group.skillsText
          : splitSkillsText(group?.skills || group?.keywords || []).join(', ');

        const skills = splitSkillsText(skillsText);
        return {
          category: group?.category || group?.name || `Skills ${index + 1}`,
          skillsText,
          skills,
          rating: typeof group?.rating === 'number' ? group.rating : undefined,
          pathCategory: `skills.${index}.category`,
          pathSkills: `skills.${index}.skillsText`,
        };
      })
      .filter((group) => group.category || group.skills.length > 0 || group.skillsText);
  }

  if (rawSkills && typeof rawSkills === 'object') {
    return Object.entries(rawSkills)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => ({
        category: LEGACY_SKILL_GROUP_LABELS[key] || key,
        skillsText: value as string,
        skills: splitSkillsText(value),
        rating: undefined,
        pathCategory: null,
        pathSkills: `skills.${key}`,
      }));
  }

  if (typeof rawSkills === 'string' && rawSkills.trim()) {
    return [{
      category: 'Skills',
      skillsText: rawSkills,
      skills: splitSkillsText(rawSkills),
      rating: undefined,
      pathCategory: null,
      pathSkills: 'skills',
    }];
  }

  return [];
};

const flattenSkillItems = (rawSkills: any) => (
  normalizeSkillGroups(rawSkills).flatMap((group) =>
    group.skills.map((label, index) => ({
      label,
      category: group.category,
      rating: clampSkillRating(group.rating, 5 - (index % 3)),
    }))
  )
);

const SECTION_ICONS: any = {
  summary: User,
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderOpen,
  certifications: Award,
  awards: Trophy,
  skills: Code2,
  languages: Globe,
  interests: Heart,
  publications: BookOpen,
  volunteer: Users,
  references: Users,
  contact: Phone,
};

export const TITLE_STYLES: Record<string, React.FC<{ children: React.ReactNode; isDark: boolean; showIcons?: boolean; titleKey?: string }>> = {
  'standard': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-keep-with-next ${isDark ? 'text-white border-slate-700' : 'cv-accent-border text-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'minimal': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 cv-keep-with-next ${isDark ? 'text-white' : 'cv-accent-text'} flex items-center gap-2`}>{Icon && <Icon size={16} />}{children}</h3>;
  },
  'accent': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-keep-with-next ${isDark ? 'text-white border-slate-700' : 'text-gray-900 border-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'boxed': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <div className={`inline-flex items-center gap-2 border px-2 py-1 mb-3 ${TYPOGRAPHY.date} cv-keep-with-next ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-800 text-gray-800'}`}>{Icon && <Icon size={14} />}{children}</div>;
  },
  'sidebar-default': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-2 border-b pb-1 cv-keep-with-next ${isDark ? 'text-slate-300 border-slate-600' : 'text-gray-800 border-gray-300'} flex items-center gap-2`}>{Icon && <Icon size={14} />}{children}</h3>;
  },
  'designer': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-4 cv-keep-with-next ${isDark ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'lines': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <div className="flex items-center gap-4 mb-4 cv-keep-with-next"><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div><h3 className={`${TYPOGRAPHY.sectionTitle} mb-0 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div></div>;
  },
};

// ==========================================
// 70+ PREMIUM SNIPPET REGISTRY
// ==========================================
export const SNIPPETS: Record<string, { id: string; name: string; category: string; render: (props: any) => React.ReactNode }> = {
  // === HEADERS (7) ===
  'header-minimal': { id: 'header-minimal', name: 'Minimal Center', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b ${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shadow-md shrink-0 ${isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-20'} ${isDark ? 'border-2 border-slate-700' : ''}`} />}
        <div className={`min-w-0 w-full ${isNarrow ? '' : 'flex flex-col items-center'}`}>
          <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest ${!isNarrow && 'text-center'}`}><Editable path="basics.name" nowrap /></h1>
          <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-gray-400' : ''} mb-3 ${!isNarrow && 'text-center'}`}><Editable path="basics.title" nowrap /></h2>
          {!hasSidebarContact && (
            <div className={`flex flex-wrap justify-center ${isNarrow ? 'flex-col gap-1.5 items-center' : 'gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact}`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
    );
  }},
  'header-split': { id: 'header-split', name: 'Split Modern', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col gap-4 text-center items-center' : 'justify-between items-end'} pb-4 border-b-[1.5px] ${isDark ? 'border-slate-600' : 'border-slate-800'} snippet-anim w-full cv-keep-with-next`}>
        <Title titleKey="header" overrideClass="hidden" />
        <div className={`flex ${isNarrow ? 'flex-col text-center items-center' : 'items-center text-left'} gap-4 min-w-0`}>
          {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-md ${isNarrow ? 'w-24 h-24' : 'w-16 h-16'}`} />}
          <div className="min-w-0">
            <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-slate-800'} mb-1.5`}><Editable path="basics.name" nowrap /></h1>
            <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}><Editable path="basics.title" nowrap /></h2>
          </div>
        </div>
        {!hasSidebarContact && (
          <div className={`${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact} flex ${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%]`}>
            <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : ''} />
          </div>
        )}
      </div>
    );
  }},
  'header-avatar': { id: 'header-avatar', name: 'Avatar Left Bold', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full shadow-lg object-cover shrink-0 ${isNarrow ? 'w-28 h-28' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-4 border-white'}`} />}
        <div className="min-w-0 w-full">
          <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1.5`}><Editable path="basics.name" nowrap /></h1>
          <h2 className={`${TYPOGRAPHY.role} mb-3`}><Editable path="basics.title" nowrap /></h2>
          {!hasSidebarContact && (
            <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : 'gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
    );
  }},
  'header-boxed': { id: 'header-boxed', name: 'Elegant Box', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shadow-xl shrink-0 ${isNarrow ? 'w-28 h-28 mb-4' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'}`} />}
        <div className="min-w-0 w-full flex flex-col items-center text-center">
          <div className={`inline-block border-[2px] px-8 py-3 mb-4 tracking-[0.25em] uppercase ${isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900'}`}>
            <h1 className={`${isNarrow ? 'text-xl' : 'text-2xl'} font-bold`}><Editable path="basics.name" nowrap /></h1>
          </div>
          <h2 className={`${TYPOGRAPHY.role} mb-5 ${isDark ? 'text-gray-400' : ''}`}><Editable path="basics.title" nowrap /></h2>
          {!hasSidebarContact && (
            <div className={`flex flex-wrap justify-center ${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} ${TYPOGRAPHY.contact}`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
    );
  }},
  'header-executive': { id: 'header-executive', name: 'Executive Stacked', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b-[1.5px] ${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded object-cover shadow-md shrink-0 ${isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-24'} ${isDark ? 'border border-slate-600' : ''}`} />}
        <div className={`min-w-0 w-full flex flex-col ${isNarrow ? 'items-center text-center' : 'items-start'}`}>
          <h1 className={`${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Editable path="basics.name" nowrap /></h1>
          {!hasSidebarContact && (
            <div className={`flex flex-wrap ${isNarrow ? 'flex-col text-center gap-1.5' : 'gap-x-4 gap-y-1.5'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : ''} />
            </div>
          )}
        </div>
      </div>
    );
  }},
  'header-accent': { id: 'header-accent', name: 'Accent Side Bar', category: 'Header', render: ({ data, Editable, zoneId, isDark, Title, showIcons, design, layoutZones }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className="snippet-anim w-full cv-keep-with-next">
        <Title titleKey="header" overrideClass="hidden" />
        <div className={`flex ${isNarrow ? 'flex-col gap-6' : 'justify-between items-center'}`}>
          <div className={`min-w-0 ${isNarrow ? 'w-full text-center' : 'w-2/3'}`}>
            <h1 className={`${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}><Editable path="basics.name" nowrap /></h1>
            <h2 className={`${TYPOGRAPHY.role} tracking-[0.25em]`}><Editable path="basics.title" nowrap /></h2>
          </div>
          {!hasSidebarContact && (
            <div className={`flex items-stretch gap-4 ${isNarrow ? 'w-full justify-center text-center' : 'text-right'}`}>
              {!isNarrow && <div className="flex flex-col justify-center"><Title titleKey="contact" overrideClass={`${TYPOGRAPHY.contact} tracking-widest uppercase mb-0 ${isDark ? 'text-gray-400' : 'text-gray-800'}`} /></div>}
              <div className="w-1.5 cv-accent-bg shrink-0 rounded-full"></div>
              <div className={`${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <ContactLinks data={data} Editable={Editable} isNarrow={true} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : 'justify-end'} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }},
  'header-creative': { id: 'header-creative', name: 'Creative Block', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-6 p-6 rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-2xl border-4 border-white/20 ${isNarrow ? 'w-24 h-24 mb-4' : 'w-24 h-24'}`} />}
        <div className="min-w-0 w-full flex flex-col">
          <h1 className={`${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1`}><Editable path="basics.name" nowrap /></h1>
          <h2 className={`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4`}><Editable path="basics.title" nowrap /></h2>
          {!hasSidebarContact && (
            <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} text-xs font-medium opacity-90`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
    );
  }},

  // === SUMMARIES (6) ===
  'summary-clean': { id: 'summary-clean', name: 'Clean Paragraph', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-highlight': { id: 'summary-highlight', name: 'Left Accent Highlight', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section"><Title titleKey="summary" /><div className={`p-4 border-l-[4px] rounded-r-lg cv-accent-border cv-keep-with-next shadow-sm ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}><div className={`${TYPOGRAPHY.body} italic ${isDark ? 'text-slate-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div></div></div>
  )},
  'summary-quote': { id: 'summary-quote', name: 'Quotation Mark', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim flex gap-4 items-start cv-section"><div className={`shrink-0 pt-1 cv-accent-text opacity-50`}><Quote size={28} fill="currentColor"/></div><div className="flex-1"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div></div>
  )},
  'summary-centered': { id: 'summary-centered', name: 'Centered Block', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim text-center cv-section"><Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} text-center mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'} mx-auto`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-boxed': { id: 'summary-boxed', name: 'Border Box', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className={`snippet-anim border p-5 rounded-xl shadow-sm cv-section cv-keep-with-next ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-white'}`}><Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-bold': { id: 'summary-bold', name: 'Bold Intro', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} font-medium text-[1.1em] leading-[1.8] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div></div>
  )},

  // === EXPERIENCE (6) ===
  'experience-standard': { id: 'experience-standard', name: 'Standard Flow', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = Array.isArray(data?.experience) ? data.experience : [];
    if (expData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'experience-split': { id: 'experience-split', name: 'Split Columns', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-5 cv-gap-lg">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.company`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.role`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }},
  'experience-harvard': { id: 'experience-harvard', name: 'Harvard Dense', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.company`} nowrap />, <span className="font-semibold italic"><Editable path={`experience.${idx}.role`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'experience-timeline': { id: 'experience-timeline', name: 'Vertical Timeline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="snippet-anim cv-section"><Title titleKey="experience" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-900' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>
  )}},
  'experience-compact': { id: 'experience-compact', name: 'Compact Inline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`experience.${idx}.role`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>at</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`experience.${idx}.company`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>
  )}},
  'experience-accent': { id: 'experience-accent', name: 'Accent Ribbon', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-5 cv-gap-lg">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`pl-4 border-l-[3px] cv-accent-border`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`flex flex-wrap gap-x-3 mb-2 mt-0.5`}><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></span><span className={`${TYPOGRAPHY.date} opacity-80`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>
  )}},

  // === EDUCATION (6) ===
  'education-standard': { id: 'education-standard', name: 'Standard Flow', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const eduData = Array.isArray(data?.education) ? data.education : [];
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-split': { id: 'education-split', name: 'Split Columns', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const eduData = data?.education || [];
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-lg">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.degree`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></div></ListEntry>))}</div></div>);
  }},
  'education-harvard': { id: 'education-harvard', name: 'Harvard Dense', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{data.education.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap />, <span className="font-semibold italic"><Editable path={`education.${idx}.degree`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-800'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-timeline': { id: 'education-timeline', name: 'Vertical Timeline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }},
  'education-compact': { id: 'education-compact', name: 'Compact Inline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`education.${idx}.degree`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`education.${idx}.institution`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-blocks': { id: 'education-blocks', name: 'Shaded Blocks', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} border ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}><div className="cv-keep-with-next"><div className={`flex justify-between items-baseline flex-wrap gap-x-3 mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }},

  // === PROJECTS (6) ===
  'projects-standard': { id: 'projects-standard', name: 'Standard Flow', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = Array.isArray(data?.projects) ? data.projects : [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-split': { id: 'projects-split', name: 'Split Columns', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-5 cv-gap-lg">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }},
  'projects-harvard': { id: 'projects-harvard', name: 'Harvard Dense', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap />, <span className="font-semibold italic"><Editable path={`projects.${idx}.role`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-timeline': { id: 'projects-timeline', name: 'Vertical Timeline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.role`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }},
  'projects-compact': { id: 'projects-compact', name: 'Compact Inline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`projects.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>|</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`projects.${idx}.role`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-grid': { id: 'projects-grid', name: '2-Column Grid', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-4 cv-gap-md`}>{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`h-full p-4 rounded-xl border transition-colors hover:border-emerald-500/30 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><div className={`flex justify-between items-baseline mb-2`}><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span><span className={`${TYPOGRAPHY.date} text-[10px]`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }},

  // === CERTIFICATIONS (5) ===
  'certifications-standard': { id: 'certifications-standard', name: 'Standard List', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const certData = Array.isArray(data?.certifications) ? data.certifications : [];
    if (certData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-4 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`certifications.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></div></ListEntry>))}</div></div>);
  }},
  'certifications-harvard': { id: 'certifications-harvard', name: 'Harvard Dense', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const certData = data?.certifications || [];
    if (certData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-3 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col' : 'justify-between items-baseline'} w-full cv-keep-with-next`}><div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap />, <span className="font-normal italic"><Editable path={`certifications.${idx}.issuer`} nowrap /></span></div><span className={`${TYPOGRAPHY.date}`}><Editable path={`certifications.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`certifications.${idx}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div></div>);
  }},
  'certifications-compact': { id: 'certifications-compact', name: 'Compact Inline', category: 'Certifications', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certData = data?.certifications || [];
    if (certData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-3 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`certifications.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>by</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`certifications.${idx}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div></div>);
  }},

  // === AWARDS (3) ===
  'awards-standard': { id: 'awards-standard', name: 'Standard List', category: 'Awards', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const awdData = Array.isArray(data?.awards) ? data.awards : [];
    if (awdData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-4 cv-gap-sm">{awdData.map((awd: any, idx: number) => (<ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`awards.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`awards.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`awards.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`awards.${idx}.issuer`} nowrap /></div></ListEntry>))}</div></div>);
  }},
  'awards-compact': { id: 'awards-compact', name: 'Compact Inline', category: 'Awards', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awdData = data?.awards || [];
    if (awdData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-3 cv-gap-sm">{awdData.map((awd: any, idx: number) => (<ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`awards.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`awards.${idx}.issuer`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`awards.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`awards.${idx}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div></div>);
  }},

  // === PUBLICATIONS ===
  'publications-standard': { id: 'publications-standard', name: 'Standard Flow', category: 'Publications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const pubData = Array.isArray(data?.publications) ? data.publications : [];
    if (pubData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="publications" /><div className="flex flex-col gap-4 cv-gap-md">{pubData.map((pub: any, idx: number) => (<ListEntry key={pub.id} collection="publications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`publications.${idx}.title`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`publications.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`publications.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`publications.${idx}.publisher`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`publications.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},

  // === VOLUNTEER ===
  'volunteer-standard': { id: 'volunteer-standard', name: 'Standard Flow', category: 'Volunteer', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const volData = Array.isArray(data?.volunteer) ? data.volunteer : [];
    if (volData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="volunteer" /><div className="flex flex-col gap-4 cv-gap-md">{volData.map((vol: any, idx: number) => (<ListEntry key={vol.id} collection="volunteer" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`volunteer.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`volunteer.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`volunteer.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`volunteer.${idx}.organization`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`volunteer.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},

  // === REFERENCES ===
  'references-standard': { id: 'references-standard', name: 'Standard Block', category: 'References', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const refData = Array.isArray(data?.references) ? data.references : [];
    if (refData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="references" /><div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-6 cv-gap-lg`}>{refData.map((ref_item: any, idx: number) => (<ListEntry key={ref_item.id} collection="references" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`references.${idx}.name`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`references.${idx}.role`} nowrap /></div><div className={`${TYPOGRAPHY.body} font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><Editable path={`references.${idx}.contact`} nowrap /></div></div></ListEntry>))}</div></div>);
  }},

  // === SKILLS (6) ===
  'skills-tags': { id: 'skills-tags', name: 'Text Blocks', category: 'Skills', render: ({ data, Editable, isDark, Title }: any) => {
    const groups = normalizeSkillGroups(data?.skills);
    if (groups.length === 0) return null;
    return (
      <div className="snippet-anim cv-section cv-item-avoid">
        <Title titleKey="skills" />
        <div className="flex flex-col gap-3 cv-gap-sm">
          {groups.map((group, index) => (
            <div key={`${group.category}-${index}`} className="cv-keep-with-next">
              <div className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {group.pathCategory ? <Editable path={group.pathCategory} nowrap /> : group.category}
              </div>
              <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {group.pathSkills ? <Editable path={group.pathSkills} /> : group.skillsText}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }},
  'skills-pills': { id: 'skills-pills', name: 'Solid Pills', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const allSkills = flattenSkillItems(data?.skills);
    return (<div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="skills" /><div className="flex flex-wrap gap-2 cv-gap-sm">{allSkills.map((skill: any, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{skill.label}</span>))}</div></div>);
  }},
  'skills-round-pills': { id: 'skills-round-pills', name: 'Round Pills', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const allSkills = flattenSkillItems(data?.skills);
    return (<div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="skills" /><div className="flex flex-wrap gap-2 cv-gap-sm">{allSkills.map((skill: any, i: number) => (<span key={i} className={`px-4 py-1.5 text-xs font-semibold rounded-full border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{skill.label}</span>))}</div></div>);
  }},
  'skills-dots': { id: 'skills-dots', name: 'Dot Rating', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const allSkills = flattenSkillItems(data?.skills).slice(0, 6);
    return (<div className="snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="skills" /><div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">{allSkills.map((skill: any, i: number) => (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{skill.label}</span><div className="flex gap-1.5">{[...Array(5)].map((_, dotIdx) => (<div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < skill.rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>))}</div></div>))}</div></div>);
  }},
  'skills-category-inline': { id: 'skills-category-inline', name: 'Category Inline', category: 'Skills', render: ({ data, Editable, isDark, Title }: any) => {
    const groups = normalizeSkillGroups(data?.skills);
    if (groups.length === 0) return null;
    return (
      <div className="snippet-anim cv-section cv-item-avoid">
        <Title titleKey="skills" />
        <div className="flex flex-col gap-2 cv-gap-sm">
          {groups.map((group, index) => (
            <div key={`${group.category}-${index}`} className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>
                {group.pathCategory ? <Editable path={group.pathCategory} nowrap /> : group.category}
              </span>
              {group.pathSkills ? <Editable path={group.pathSkills} /> : group.skillsText}
            </div>
          ))}
        </div>
      </div>
    );
  }},

  // === LANGUAGES ===
  'languages-comma': { id: 'languages-comma', name: 'Comma Separated', category: 'Languages', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="languages" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="languages" /></div></div>
  )},
  'languages-dots': { id: 'languages-dots', name: 'Dot Rating', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="languages" /><div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">{items.map((item: string, i: number) => { const rating = i % 2 === 0 ? 5 : 4; return (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.split('(')[0]}</span><div className="flex gap-1.5">{[...Array(5)].map((_, dotIdx) => (<div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>))}</div></div>); })}</div></div>);
  }},
  'languages-bars': { id: 'languages-bars', name: 'Progress Bars', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="languages" /><div className="flex flex-col gap-3 cv-gap-sm">{items.map((item: string, i: number) => { const widths = ['w-[95%]', 'w-[85%]', 'w-[65%]', 'w-[50%]']; return (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`w-1/2 truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{item.split('(')[0]}</span><div className={`w-1/2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}><div className={`h-full cv-accent-bg ${widths[i] || 'w-[70%]'}`}></div></div></div>); })}</div></div>);
  }},
  'languages-pills': { id: 'languages-pills', name: 'Solid Pills', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="languages" /><div className="flex flex-wrap gap-2 cv-gap-sm">{items.map((item: string, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{item.split('(')[0]}</span>))}</div></div>);
  }},
  'languages-round-pills': { id: 'languages-round-pills', name: 'Round Pills', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="languages" /><div className="flex flex-wrap gap-2 cv-gap-sm">{items.map((item: string, i: number) => (<span key={i} className={`px-4 py-1.5 text-xs font-semibold rounded-full border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{item.split('(')[0]}</span>))}</div></div>);
  }},

  // === INTERESTS ===
  'interests-comma': { id: 'interests-comma', name: 'Comma Separated', category: 'Interests', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="interests" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="interests" /></div></div>
  )},
  'interests-pills': { id: 'interests-pills', name: 'Outline Pills', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = (data.interests || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="snippet-anim cv-section cv-item-avoid"><Title titleKey="interests" /><div className="flex flex-wrap gap-2 cv-gap-sm">{items.map((item: string, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-medium border rounded-full ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-400 text-gray-800'}`}>{item}</span>))}</div></div>);
  }},

  // === SIDEBAR SPECIFIC ===
  'sidebar-contact': { id: 'sidebar-contact', name: 'Contact List', category: 'Sidebar', render: ({ data, Editable, isDark, Title, showIcons, design }: any) => {
    const headerLinks = design?.headerLinks || {};
    const isVisible = (key: string) => headerLinks[key] !== false;
    return (
      <div className={`snippet-anim cv-section ${isDark ? 'text-white' : 'text-gray-900'} w-full min-w-0 cv-item-avoid`}><Title titleKey="contact" /><div className={`flex flex-col gap-2.5 cv-gap-sm ${TYPOGRAPHY.body} ${isDark ? 'text-slate-300' : 'text-gray-700'} break-all`}>
        {isVisible('location') && <div className="flex items-center gap-2">{showIcons && <MapPin size={14} />}<Editable path="basics.location" nowrap /></div>}
        {isVisible('phone') && <div className="flex items-center gap-2">{showIcons && <Phone size={14} />}<Editable path="basics.phone" nowrap /></div>}
        {isVisible('email') && <div className="flex items-center gap-2">{showIcons && <Mail size={14} />}<Editable path="basics.email" breakAll /></div>}
        {isVisible('linkedin') && (data?.basics?.linkedin || true) && <div className="flex items-center gap-2">{showIcons && <Linkedin size={14} />}<Editable path="basics.linkedin" breakAll /></div>}
        {isVisible('website') && (data?.basics?.website || true) && <div className="flex items-center gap-2">{showIcons && <LinkIcon size={14} />}<Editable path="basics.website" breakAll /></div>}
        {data?.basics?.profiles && Array.isArray(data.basics.profiles) && data.basics.profiles.map((profile: any, index: number) => {
          const net = profile.network?.toLowerCase() || `link-${index}`;
          if (!isVisible(net)) return null;
          const Icon = getNetworkIcon(net);
          return <div key={`prof-${index}`} className="flex items-center gap-2">{showIcons && <Icon size={14} />}<Editable path={`basics.profiles.${index}.url`} breakAll /></div>;
        })}
      </div></div>
    );
  }}

  // =======================================================
  // NEW SNIPPETS — HEADER (3 new)
  // =======================================================
  ,'header-typographic': { id: 'header-typographic', name: 'Typographic Display', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    return (
      <div className="snippet-anim w-full cv-keep-with-next">
        <Title titleKey="header" overrideClass="hidden" />
        <div className={isNarrow ? 'text-center' : ''}>
          <h1 className={`font-black leading-none tracking-tighter mb-2 ${isNarrow ? 'text-3xl' : 'text-5xl'} ${isDark ? 'text-white' : 'text-gray-900'}`}><Editable path="basics.name" nowrap /></h1>
          <div className={`flex items-center gap-3 mb-3 ${isNarrow ? 'justify-center' : ''}`}>
            <div className="h-[2px] w-10 cv-accent-bg shrink-0" />
            <h2 className={`${TYPOGRAPHY.role} text-[0.85em] shrink-0`}><Editable path="basics.title" nowrap /></h2>
            <div className="h-[2px] flex-1 cv-accent-bg" />
          </div>
          {!hasSidebarContact && <div className={`flex flex-wrap gap-x-5 gap-y-1 ${isNarrow ? 'justify-center' : ''} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}
        </div>
      </div>
    );
  }}
  ,'header-column-left': { id: 'header-column-left', name: 'Column Split', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    return (
      <div className={`snippet-anim w-full cv-keep-with-next flex ${isNarrow ? 'flex-col gap-3 items-center text-center' : 'gap-8 items-end'} pb-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <Title titleKey="header" overrideClass="hidden" />
        <div className={`${isNarrow ? '' : 'flex-1'} min-w-0`}>
          <h1 className={`font-bold leading-tight ${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'}`}><Editable path="basics.name" nowrap /></h1>
          <h2 className={`${TYPOGRAPHY.role} mt-1`}><Editable path="basics.title" nowrap /></h2>
        </div>
        {!hasSidebarContact && <div className={`flex flex-col gap-1 shrink-0 ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isNarrow ? 'items-center' : 'text-right max-w-[45%]'}`}><ContactLinks data={data} Editable={Editable} isNarrow={true} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : 'justify-end'} /></div>}
      </div>
    );
  }}
  ,'header-banner': { id: 'header-banner', name: 'Accent Banner', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    return (
      <div className="snippet-anim w-full cv-keep-with-next">
        <Title titleKey="header" overrideClass="hidden" />
        <div className="cv-accent-bg rounded-lg px-5 py-4 mb-3">
          <h1 className={`font-extrabold tracking-tight text-white leading-tight ${isNarrow ? 'text-2xl' : 'text-3xl'}`}><Editable path="basics.name" nowrap /></h1>
          <h2 className="text-[0.82em] font-semibold tracking-widest uppercase text-white/80 mt-0.5"><Editable path="basics.title" nowrap /></h2>
        </div>
        {!hasSidebarContact && <div className={`flex flex-wrap gap-x-4 gap-y-1 ${isNarrow ? 'flex-col items-start gap-1.5' : ''} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}
      </div>
    );
  }}

  // =======================================================
  // NEW SNIPPETS — SUMMARY (5 new)
  // =======================================================
  ,'summary-two-col': { id: 'summary-two-col', name: 'Paragraph + Strengths', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" />
      <div className="flex gap-6 items-start">
        <div className={`flex-1 min-w-0 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div>
        <div className={`shrink-0 w-[36%] flex flex-col gap-2 border-l pl-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          {[0,1,2].map(i => (
            <div key={i} className={`flex items-start gap-2 ${TYPOGRAPHY.body}`}>
              <span className="cv-accent-text font-black mt-0.5 shrink-0 text-[14px]">▸</span>
              <Editable path={`basics.strength${i+1}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )}
  ,'summary-large-opener': { id: 'summary-large-opener', name: 'Large Opening Line', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => {
    const summary = (data?.basics?.summary || '').trim();
    const dotIdx = summary.search(/[.!?]/);
    const opener = dotIdx > 0 ? summary.slice(0, dotIdx + 1) : summary;
    const rest = dotIdx > 0 ? summary.slice(dotIdx + 1).trim() : '';
    return (
      <div className="snippet-anim cv-section">
        <Title titleKey="summary" />
        <p className={`text-[1.12em] font-semibold leading-snug mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{opener || <Editable path="basics.summary" />}</p>
        {rest && <p className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{rest}</p>}
      </div>
    );
  }}
  ,'summary-stats': { id: 'summary-stats', name: 'Stats + Paragraph', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" />
      <div className={`flex gap-4 mb-4 py-3 border-y ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        {[{val:'5+',lbl:'Years Exp.'},{val:'20+',lbl:'Projects'},{val:'3',lbl:'Industries'}].map((item,i) => (
          <div key={i} className="flex flex-col items-center flex-1 text-center">
            <span className="text-[1.6em] font-black cv-accent-text leading-none">{item.val}</span>
            <span className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.lbl}</span>
          </div>
        ))}
      </div>
      <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div>
    </div>
  )}
  ,'summary-card-dark': { id: 'summary-card-dark', name: 'Statement Card', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" />
      <div className="rounded-xl p-5 cv-accent-bg">
        <div className="text-[0.82em] font-medium leading-relaxed text-white/90"><Editable path="basics.summary" multiline /></div>
      </div>
    </div>
  )}
  ,'summary-minimal-line': { id: 'summary-minimal-line', name: 'Minimal With Rule', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" />
      <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}><Editable path="basics.summary" multiline /></div>
    </div>
  )}

  // =======================================================
  // NEW SNIPPETS — EXPERIENCE (5 new)
  // =======================================================
  ,'experience-card': { id: 'experience-card', name: 'Card Per Role', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = Array.isArray(data?.experience) ? data.experience : []; if (expData.length === 0) return null;
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-3">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white shadow-sm'}`}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-start'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} cv-accent-text`}><Editable path={`experience.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }}
  ,'experience-pill-date': { id: 'experience-pill-date', name: 'Pill Date Badge', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = Array.isArray(data?.experience) ? data.experience : []; if (expData.length === 0) return null;
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-start'} mb-2 cv-keep-with-next`}><div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full cv-accent-bg text-white tracking-wider whitespace-nowrap"><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }}
  ,'experience-two-row': { id: 'experience-two-row', name: 'Two Row Dense', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = Array.isArray(data?.experience) ? data.experience : []; if (expData.length === 0) return null;
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div><div className="cv-keep-with-next mb-1"><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`flex ${isNarrow ? 'flex-col' : 'items-center gap-2'} mt-0.5`}><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></span>{!isNarrow && <span className={`text-gray-300 text-[10px]`}>·</span>}<span className={`${TYPOGRAPHY.date} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }}
  ,'experience-minimal-list': { id: 'experience-minimal-list', name: 'Minimal Single Line', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = Array.isArray(data?.experience) ? data.experience : []; if (expData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-1.5">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 py-1.5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></span><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.company`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div></div>);
  }}
  ,'experience-numbered': { id: 'experience-numbered', name: 'Editorial Numbered', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = Array.isArray(data?.experience) ? data.experience : []; if (expData.length === 0) return null;
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-5">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex gap-4`}><div className={`shrink-0 font-black text-[2em] leading-none cv-accent-text opacity-30 w-8 text-right`}>{String(idx+1).padStart(2,'0')}</div><div className="flex-1 min-w-0"><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-baseline'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`experience.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — EDUCATION (5 new)
  // =======================================================
  ,'education-card': { id: 'education-card', name: 'Card Per Degree', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = Array.isArray(data?.education) ? data.education : [];
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-3">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-start'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date} shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }}
  ,'education-pill-year': { id: 'education-pill-year', name: 'Year Pill Focus', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = Array.isArray(data?.education) ? data.education : [];
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-2' : 'gap-4 items-start'} cv-keep-with-next`}><div className="shrink-0"><span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg cv-accent-bg text-white tracking-wider whitespace-nowrap"><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className="flex-1 min-w-0"><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} italic mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.degree`} nowrap /></div><div className={`${TYPOGRAPHY.body} mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></div></ListEntry>))}</div></div>);
  }}
  ,'education-institution-first': { id: 'education-institution-first', name: 'Institution Hero', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = Array.isArray(data?.education) ? data.education : [];
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-baseline'} mb-0.5`}><h4 className={`${TYPOGRAPHY.itemTitle} text-[1.05em] font-extrabold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? 'text-gray-500' : 'text-gray-400'} shrink-0`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} italic mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.degree`} nowrap /></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }}
  ,'education-minimal': { id: 'education-minimal', name: 'Minimal One Line', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = Array.isArray(data?.education) ? data.education : [];
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-1.5">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 py-1.5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></span><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.institution`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div></div>);
  }}
  ,'education-bordered': { id: 'education-bordered', name: 'Left Border Rule', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = Array.isArray(data?.education) ? data.education : [];
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="pl-4 border-l-[3px] cv-accent-border"><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-baseline'} mb-0.5`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date} shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`education.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} italic mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — PROJECTS (5 new)
  // =======================================================
  ,'projects-card-tags': { id: 'projects-card-tags', name: 'Card with Tech Tags', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const projData = Array.isArray(data?.projects) ? data.projects : []; if (projData.length === 0) return null;
    const isNarrow = ['sidebar','left','right'].includes(zoneId);
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-3">{projData.map((proj: any, idx: number) => (<ListEntry key={proj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl border p-4 flex flex-col gap-2 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white shadow-sm'}`}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-0.5' : 'justify-between items-start'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} cv-accent-text`}><Editable path={`projects.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div><div className="flex flex-wrap gap-1.5 pt-1"><div className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cv-accent-bg/20 cv-accent-text`}><Editable path={`projects.${idx}.tech`} nowrap /></div></div></div></ListEntry>))}</div></div>);
  }}
  ,'projects-featured': { id: 'projects-featured', name: 'Featured + List', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const projData = Array.isArray(data?.projects) ? data.projects : []; if (projData.length === 0) return null;
    const featured = projData[0]; const rest = projData.slice(1);
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><ListEntry collection="projects" index={0} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl p-5 mb-3 cv-accent-bg/10 border cv-accent-border`}><h4 className={`${TYPOGRAPHY.itemTitle} cv-accent-text text-[1.1em] mb-1`}><Editable path="projects.0.name" nowrap /></h4><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}><Editable path="projects.0.description" multiline html /></div><div className={`${TYPOGRAPHY.date}`}><Editable path="projects.0.startDate" nowrap isDate={true} /> - <Editable path="projects.0.endDate" nowrap isDate={true} /></div></div></ListEntry>{rest.map((proj: any, idx: number) => (<ListEntry key={proj.id} collection="projects" index={idx+1} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex justify-between items-baseline py-1.5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-200' : 'text-gray-800'}`}><Editable path={`projects.${idx+1}.name`} nowrap /></span><span className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx+1}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx+1}.endDate`} nowrap isDate={true} /></span></div></ListEntry>))}</div>);
  }}
  ,'projects-numbered': { id: 'projects-numbered', name: 'Editorial Numbered', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const projData = Array.isArray(data?.projects) ? data.projects : []; if (projData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4">{projData.map((proj: any, idx: number) => (<ListEntry key={proj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="flex gap-4"><div className="shrink-0 font-black text-[2em] leading-none cv-accent-text opacity-25 w-8 text-right">{String(idx+1).padStart(2,'0')}</div><div className="flex-1 min-w-0 cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}><Editable path={`projects.${idx}.name`} nowrap /></h4><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }}
  ,'projects-minimal-list': { id: 'projects-minimal-list', name: 'Minimal Compact', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const projData = Array.isArray(data?.projects) ? data.projects : []; if (projData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-2">{projData.map((proj: any, idx: number) => (<ListEntry key={proj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><div className="flex justify-between items-baseline gap-2 mb-0.5"><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></span><span className={`${TYPOGRAPHY.date} shrink-0`}><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`${TYPOGRAPHY.body} italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }}
  ,'projects-card-accent': { id: 'projects-card-accent', name: 'Accent Header Card', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const projData = Array.isArray(data?.projects) ? data.projects : []; if (projData.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-3">{projData.map((proj: any, idx: number) => (<ListEntry key={proj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'} shadow-sm`}><div className="cv-accent-bg px-4 py-2 flex justify-between items-center"><span className="text-white font-bold text-[0.85em]"><Editable path={`projects.${idx}.name`} nowrap /></span><span className="text-white/70 text-[0.75em]"><Editable path={`projects.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`projects.${idx}.endDate`} nowrap isDate={true} /></span></div><div className={`p-4 ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — SKILLS (5 new)
  // =======================================================
  ,'skills-grouped-sections': { id: 'skills-grouped-sections', name: 'Grouped by Category', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const groups = normalizeSkillGroups(data?.skills);
    if (groups.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="flex flex-col gap-3">{groups.map((group, index) => (<div key={`${group.category}-${index}`}><div className={`text-[9px] uppercase tracking-widest font-bold mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{group.category}</div><div className="flex flex-wrap gap-1.5">{group.skills.map((skill: string, i: number) => (<span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{skill}</span>))}</div></div>))}</div></div>);
  }}
  ,'skills-star-rating': { id: 'skills-star-rating', name: 'Star Rating', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const items = flattenSkillItems(data?.skills).slice(0, 8);
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="flex flex-col gap-2">{items.map((skill: any, i: number) => (<div key={i} className="flex justify-between items-center"><span className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{skill.label}</span><div className="flex gap-0.5">{[1,2,3,4,5].map(s => (<span key={s} className={`text-[13px] ${s <= skill.rating ? 'cv-accent-text' : (isDark ? 'text-slate-700' : 'text-gray-200')}`}>★</span>))}</div></div>))}</div></div>);
  }}
  ,'skills-two-col-list': { id: 'skills-two-col-list', name: 'Two Column List', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const items = flattenSkillItems(data?.skills);
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="grid grid-cols-2 gap-x-4 gap-y-1">{items.map((skill: any, i: number) => (<div key={i} className={`flex items-center gap-1.5 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="cv-accent-text text-[10px] shrink-0">●</span>{skill.label}</div>))}</div></div>);
  }}
  ,'skills-accent-badges': { id: 'skills-accent-badges', name: 'Accent Solid Badges', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const items = flattenSkillItems(data?.skills);
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="flex flex-wrap gap-1.5">{items.map((skill: any, i: number) => (<span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-md cv-accent-bg text-white tracking-wide">{skill.label}</span>))}</div></div>);
  }}
  ,'skills-compact-inline': { id: 'skills-compact-inline', name: 'Compact Inline All', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const all = flattenSkillItems(data?.skills);
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><p className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>{all.map((skill: any, i: number) => <span key={i}>{skill.label}{i < all.length-1 && <span className={`mx-1.5 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>}</span>)}</p></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — CERTIFICATIONS (5 new)
  // =======================================================
  ,'certifications-timeline': { id: 'certifications-timeline', name: 'Timeline Dots', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certs = Array.isArray(data?.certifications) ? data.certifications : []; if (certs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className={`border-l-2 ml-2 flex flex-col gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{certs.map((c: any, i: number) => (<ListEntry key={c.id} collection="certifications" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-5"><div className={`absolute w-2.5 h-2.5 rounded-full -left-[22px] top-1 cv-accent-bg`} /><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.name || c.title}</div><div className={`${TYPOGRAPHY.date} mt-0.5`}>{c.issuer} {c.date && `· ${c.date}`}</div></div></div></ListEntry>))}</div></div>);
  }}
  ,'certifications-badge': { id: 'certifications-badge', name: 'Badge Pills', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certs = Array.isArray(data?.certifications) ? data.certifications : []; if (certs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-wrap gap-2">{certs.map((c: any, i: number) => (<ListEntry key={c.id} collection="certifications" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${isDark ? 'border-slate-600 bg-slate-800 text-gray-200' : 'border-gray-200 bg-white text-gray-700 shadow-sm'}`}><div className="font-bold cv-accent-text">{c.name || c.title}</div><div className={`text-[9px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.issuer}</div></div></ListEntry>))}</div></div>);
  }}
  ,'certifications-grid': { id: 'certifications-grid', name: '2-Col Card Grid', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certs = Array.isArray(data?.certifications) ? data.certifications : []; if (certs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="grid grid-cols-2 gap-2">{certs.map((c: any, i: number) => (<ListEntry key={c.id} collection="certifications" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}><div className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-0.5`}>{c.name || c.title}</div><div className={`text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.issuer} {c.date && `· ${c.date}`}</div></div></ListEntry>))}</div></div>);
  }}
  ,'certifications-minimal': { id: 'certifications-minimal', name: 'Minimal Single Line', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certs = Array.isArray(data?.certifications) ? data.certifications : []; if (certs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-1">{certs.map((c: any, i: number) => (<ListEntry key={c.id} collection="certifications" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 py-1 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.name || c.title}</span><span className={`${TYPOGRAPHY.date}`}>{c.issuer}</span><span className={`${TYPOGRAPHY.date} ml-auto`}>{c.date}</span></div></ListEntry>))}</div></div>);
  }}
  ,'certifications-bordered': { id: 'certifications-bordered', name: 'Left Border Row', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certs = Array.isArray(data?.certifications) ? data.certifications : []; if (certs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-3">{certs.map((c: any, i: number) => (<ListEntry key={c.id} collection="certifications" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="pl-4 border-l-[3px] cv-accent-border cv-keep-with-next"><div className={`${TYPOGRAPHY.itemTitle} text-[0.9em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.name || c.title}</div><div className={`${TYPOGRAPHY.date} mt-0.5`}>{c.issuer} {c.date && `· ${c.date}`}</div></div></ListEntry>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — AWARDS (5 new)
  // =======================================================
  ,'awards-timeline': { id: 'awards-timeline', name: 'Timeline Flow', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awards = Array.isArray(data?.awards) ? data.awards : []; if (awards.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className={`border-l-2 ml-2 flex flex-col gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{awards.map((a: any, i: number) => (<ListEntry key={a.id} collection="awards" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-5"><div className="absolute w-2.5 h-2.5 rounded-full -left-[22px] top-1 cv-accent-bg" /><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{a.title}</div><div className={`${TYPOGRAPHY.date} mt-0.5`}>{a.issuer} {a.date && `· ${a.date}`}</div></div></div></ListEntry>))}</div></div>);
  }}
  ,'awards-featured': { id: 'awards-featured', name: 'Featured First', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awards = Array.isArray(data?.awards) ? data.awards : []; if (awards.length === 0) return null;
    const [first, ...rest] = awards;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><ListEntry collection="awards" index={0} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`rounded-xl p-4 mb-3 cv-accent-bg/10 border cv-accent-border flex gap-3 items-start`}><span className="text-[1.5em]">🏆</span><div><div className={`${TYPOGRAPHY.itemTitle} cv-accent-text`}>{first?.title}</div><div className={`${TYPOGRAPHY.date} mt-0.5`}>{first?.issuer} {first?.date && `· ${first.date}`}</div></div></div></ListEntry>{rest.map((a: any, i: number) => (<ListEntry key={a.id} collection="awards" index={i+1} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex items-baseline gap-2 py-1 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{a.title}</span><span className={`${TYPOGRAPHY.date} ml-auto`}>{a.date}</span></div></ListEntry>))}</div>);
  }}
  ,'awards-badge': { id: 'awards-badge', name: 'Trophy Badges', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awards = Array.isArray(data?.awards) ? data.awards : []; if (awards.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-2">{awards.map((a: any, i: number) => (<ListEntry key={a.id} collection="awards" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}><span className="text-[1.2em] shrink-0">🏆</span><div><div className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{a.title}</div><div className={`${TYPOGRAPHY.date}`}>{a.issuer} {a.date && `· ${a.date}`}</div></div></div></ListEntry>))}</div></div>);
  }}
  ,'awards-minimal-list': { id: 'awards-minimal-list', name: 'Minimal Compact', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awards = Array.isArray(data?.awards) ? data.awards : []; if (awards.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-1">{awards.map((a: any, i: number) => (<ListEntry key={a.id} collection="awards" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 py-1 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{a.title}</span><span className={`${TYPOGRAPHY.date}`}>{a.issuer}</span><span className={`${TYPOGRAPHY.date} ml-auto`}>{a.date}</span></div></ListEntry>))}</div></div>);
  }}
  ,'awards-card': { id: 'awards-card', name: 'Card Grid', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awards = Array.isArray(data?.awards) ? data.awards : []; if (awards.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="awards" /><div className="grid grid-cols-2 gap-2">{awards.map((a: any, i: number) => (<ListEntry key={a.id} collection="awards" index={i} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white shadow-sm'}`}><div className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-0.5`}>{a.title}</div><div className={`text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{a.issuer} {a.date && `· ${a.date}`}</div></div></ListEntry>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — LANGUAGES (5 new)
  // =======================================================
  ,'languages-grid-cards': { id: 'languages-grid-cards', name: 'Grid Cards', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const langs = Array.isArray(data?.languages) ? data.languages : []; if (langs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="languages" /><div className="grid grid-cols-2 gap-2">{langs.map((l: any, i: number) => (<div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}><span className={`${TYPOGRAPHY.itemTitle} text-[0.85em] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{l.name}</span><span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{l.level}</span></div>))}</div></div>);
  }}
  ,'languages-accent-pills': { id: 'languages-accent-pills', name: 'Accent Pills', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const langs = Array.isArray(data?.languages) ? data.languages : []; if (langs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="languages" /><div className="flex flex-wrap gap-2">{langs.map((l: any, i: number) => (<div key={i} className={`px-3 py-1.5 rounded-full text-[11px] font-bold cv-accent-bg text-white flex items-center gap-2`}><span>{l.name}</span><span className="w-1 h-1 rounded-full bg-white/40" /><span className="opacity-80 font-semibold">{l.level}</span></div>))}</div></div>);
  }}
  ,'languages-two-col': { id: 'languages-two-col', name: 'Two Column', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const langs = Array.isArray(data?.languages) ? data.languages : []; if (langs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="languages" /><div className="grid grid-cols-2 gap-x-4 gap-y-1">{langs.map((l: any, i: number) => (<div key={i} className={`flex justify-between items-center py-1 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><span className={`${TYPOGRAPHY.body} font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{l.name}</span><span className={`${TYPOGRAPHY.body} text-[0.9em] italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{l.level}</span></div>))}</div></div>);
  }}
  ,'languages-minimal-list': { id: 'languages-minimal-list', name: 'Minimal Inline', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const langs = Array.isArray(data?.languages) ? data.languages : []; if (langs.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="languages" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{langs.map((l: any, i: number) => (<span key={i}>{l.name} <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>({l.level})</span>{i < langs.length - 1 && ', '}</span>))}</div></div>);
  }}
  ,'languages-circle-dots': { id: 'languages-circle-dots', name: 'Circle Level Dots', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const langs = Array.isArray(data?.languages) ? data.languages : []; if (langs.length === 0) return null;
    const getLvl = (l: string) => { const str = (l||'').toLowerCase(); return str.includes('native')||str.includes('bilingual')?5:str.includes('fluent')||str.includes('proficient')||str.includes('advanced')?4:str.includes('intermediate')?3:str.includes('basic')?2:1; };
    return (<div className="snippet-anim cv-section"><Title titleKey="languages" /><div className="flex flex-col gap-2">{langs.map((l: any, i: number) => { const lvl = getLvl(l.level); return (<div key={i} className="flex justify-between items-center"><span className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{l.name}</span><div className="flex gap-1">{[1,2,3,4,5].map(s => (<span key={s} className={`w-2.5 h-2.5 rounded-full ${s <= lvl ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`} />))}</div></div>)})}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — INTERESTS (5 new)
  // =======================================================
  ,'interests-accent-pills': { id: 'interests-accent-pills', name: 'Accent Pills', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = typeof data?.interests === 'string' ? data.interests.split(',').filter(Boolean) : []; if (items.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="interests" /><div className="flex flex-wrap gap-2">{items.map((item: string, i: number) => (<span key={i} className={`px-3 py-1 rounded-full text-[11px] font-medium border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'} cv-accent-text-hover`}>{item.trim()}</span>))}</div></div>);
  }}
  ,'interests-icon-grid': { id: 'interests-icon-grid', name: 'Icon Grid', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = typeof data?.interests === 'string' ? data.interests.split(',').filter(Boolean) : []; if (items.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="interests" /><div className="grid grid-cols-2 gap-2">{items.map((item: string, i: number) => (<div key={i} className={`flex items-center gap-2 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="text-[1.2em] opacity-80">✦</span>{item.trim()}</div>))}</div></div>);
  }}
  ,'interests-minimal-bold': { id: 'interests-minimal-bold', name: 'Minimal Bold List', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = typeof data?.interests === 'string' ? data.interests.split(',').filter(Boolean) : []; if (items.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="interests" /><p className={`${TYPOGRAPHY.body} font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{items.map((item: string, i: number) => <span key={i}>{item.trim()}{i < items.length - 1 && <span className={`mx-1.5 font-normal ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>}</span>)}</p></div>);
  }}
  ,'interests-card': { id: 'interests-card', name: 'Card Layout', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = typeof data?.interests === 'string' ? data.interests.split(',').filter(Boolean) : []; if (items.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="interests" /><div className="flex flex-wrap gap-2">{items.map((item: string, i: number) => (<div key={i} className={`px-3 py-1.5 rounded-lg border ${TYPOGRAPHY.body} ${isDark ? 'border-slate-700 bg-slate-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>{item.trim()}</div>))}</div></div>);
  }}
  ,'interests-two-col': { id: 'interests-two-col', name: 'Two Column', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = typeof data?.interests === 'string' ? data.interests.split(',').filter(Boolean) : []; if (items.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="interests" /><div className="grid grid-cols-2 gap-x-4 gap-y-1">{items.map((item: string, i: number) => (<div key={i} className={`flex items-center gap-1.5 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="cv-accent-text text-[10px] shrink-0">▸</span>{item.trim()}</div>))}</div></div>);
  }}

  // =======================================================
  // NEW SNIPPETS — SIDEBAR (5 new)
  // =======================================================
  ,'sidebar-skills-grouped': { id: 'sidebar-skills-grouped', name: 'Skills by Group', category: 'Sidebar', render: ({ data, isDark, Title }: any) => {
    const groups = normalizeSkillGroups(data?.skills);
    if (groups.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="flex flex-col gap-4">{groups.map((group, index) => (<div key={`${group.category}-${index}`}><div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'} border-b pb-1 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{group.category}</div><div className="flex flex-wrap gap-1.5">{group.skills.map((skill: string, i: number) => (<span key={i} className={`text-[11px] px-2 py-1 rounded font-medium ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{skill}</span>))}</div></div>))}</div></div>);
  }}
  ,'sidebar-bio': { id: 'sidebar-bio', name: 'Mini Bio', category: 'Sidebar', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" overrideClass="hidden" />
      <div className="pl-3 border-l-2 cv-accent-border">
        <div className={`text-[0.9em] italic leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><Editable path="basics.summary" multiline /></div>
      </div>
    </div>
  )}
  ,'sidebar-key-stats': { id: 'sidebar-key-stats', name: 'Career Stats', category: 'Sidebar', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="summary" overrideClass="hidden" />
      <div className="flex flex-col gap-3">
        {[{val:'5+',lbl:'Years Exp.'},{val:'20+',lbl:'Projects'},{val:'3',lbl:'Industries'}].map((item,i) => (
          <div key={i} className={`flex items-center gap-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            <span className="text-[1.6em] font-black cv-accent-text leading-none w-12 text-right">{item.val}</span>
            <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )}
  ,'sidebar-tech-list': { id: 'sidebar-tech-list', name: 'Tech Stack List', category: 'Sidebar', render: ({ data, isDark, Title }: any) => {
    const all = flattenSkillItems(data?.skills);
    if (all.length === 0) return null;
    return (<div className="snippet-anim cv-section"><Title titleKey="skills" /><div className="flex flex-col gap-1.5">{all.map((skill: any, i: number) => (<div key={i} className={`flex items-center gap-2 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="cv-accent-text text-[12px]">✓</span>{skill.label}</div>))}</div></div>);
  }}
  ,'sidebar-social-links': { id: 'sidebar-social-links', name: 'Social Links', category: 'Sidebar', render: ({ data, Editable, isDark, Title, showIcons, design }: any) => (
    <div className="snippet-anim cv-section">
      <Title titleKey="header" overrideClass="hidden" />
      <div className="flex flex-col gap-2">
        <ContactLinks data={data} Editable={Editable} isNarrow={true} showIcons={showIcons} design={design} align="justify-start" layout="col" />
      </div>
    </div>
  )}
};

export const SNIPPET_FAMILIES: Record<string, string[]> = {
  'standard': ['-standard'],
  'split': ['-split', '-columns', '-two-col'],
  'timeline': ['-timeline'],
  'compact': ['-compact', '-harvard', '-dense', 'minimal-list'],
  'accent': ['-accent', '-creative', '-ribbon', 'banner', 'pill', 'badges'],
  'card': ['-card', '-blocks', '-boxed', '-grid-cards'],
  'minimal': ['-minimal', '-clean']
};

export const ATS_SNIPPETS: string[] = [
  'header-minimal', 'header-executive',
  'summary-clean', 'summary-minimal-line',
  'experience-standard', 'experience-minimal-list', 'experience-harvard',
  'education-standard', 'education-minimal', 'education-harvard',
  'projects-standard', 'projects-minimal-list', 'projects-harvard',
  'skills-category-inline', 'skills-grouped', 'skills-compact-inline',
  'languages-minimal-list', 'languages-two-col',
  'interests-minimal-bold', 'interests-two-col',
  'certifications-minimal', 'certifications-harvard',
  'awards-minimal-list', 'awards-harvard'
];

// ==========================================
// 15+ PRO TEMPLATES REGISTRY
// ==========================================
export const CANVAS_TEMPLATES = [
  { id: 'tpl-1', name: 'Minimalist Single', type: '1-col', titleStyle: 'minimal', zones: { main: ['header-minimal', 'summary-clean', 'experience-standard', 'education-standard', 'projects-standard', 'skills-category-inline'] } },
  { id: 'tpl-2', name: 'Modern Split', type: '2-col', titleStyle: 'standard', zones: { header: ['header-minimal'], left: ['experience-standard', 'projects-standard', 'education-standard'], right: ['summary-highlight', 'skills-pills', 'languages-comma'] } },
  { id: 'tpl-3', name: 'Professional Sidebar Left', type: 'sidebar-left', titleStyle: 'standard', sidebarTitleStyle: 'sidebar-default', zones: { sidebar: ['header-avatar', 'sidebar-contact', 'skills-pills', 'languages-dots'], main: ['summary-clean', 'experience-standard', 'projects-compact', 'education-standard'] } },
  { id: 'tpl-4', name: 'Executive Sidebar Right', type: 'sidebar-right', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { main: ['header-split', 'summary-clean', 'experience-timeline', 'education-standard'], sidebar: ['sidebar-contact', 'skills-category-inline', 'interests-pills'] } },
  { id: 'tpl-5', name: 'Two Column 50/50', type: '2-col', titleStyle: 'accent', zones: { header: ['header-boxed'], left: ['experience-split'], right: ['education-split', 'projects-split', 'skills-tags'] } },
  { id: 'tpl-6', name: 'Harvard Executive', type: '1-col', titleStyle: 'standard', zones: { main: ['header-executive', 'experience-harvard', 'projects-harvard', 'education-harvard', 'certifications-harvard'] } },
  { id: 'tpl-7', name: 'Designer Portfolio', type: '1-col', titleStyle: 'designer', zones: { main: ['header-accent', 'summary-clean', 'experience-timeline', 'projects-timeline', 'skills-pills'] } },
  { id: 'tpl-8', name: 'Split Professional', type: '1-col', titleStyle: 'accent', zones: { main: ['header-split', 'summary-clean', 'experience-split', 'projects-split', 'education-split', 'skills-dots'] } },
  { id: 'tpl-9', name: 'Creative Sidebar Left', type: 'sidebar-left-dark', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { sidebar: ['header-creative', 'sidebar-contact', 'skills-pills'], main: ['summary-highlight', 'experience-timeline', 'projects-compact', 'education-standard'] } },
  { id: 'tpl-10', name: 'Header & Right Sidebar', type: 'top-sidebar-right', titleStyle: 'standard', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-split'], main: ['summary-clean', 'experience-standard', 'education-standard'], sidebar: ['sidebar-contact', 'skills-pills', 'languages-comma'] } },
  { id: 'tpl-11', name: 'Header & Left Sidebar', type: 'top-sidebar-left', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-minimal'], sidebar: ['sidebar-contact', 'skills-pills'], main: ['summary-clean', 'experience-standard', 'education-standard'] } },
  { id: 'tpl-12', name: 'Modern Header Sidebar', type: 'top-sidebar-right', titleStyle: 'accent', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-accent'], main: ['summary-highlight', 'experience-split', 'education-split'], sidebar: ['sidebar-contact', 'skills-pills'] } },
  { id: 'tpl-13', name: 'Dense One-Pager', type: 'hybrid-split', titleStyle: 'standard', zones: { header: ['header-minimal'], main: ['summary-clean', 'experience-compact'], left: ['projects-compact', 'education-compact'], right: ['skills-category-inline', 'certifications-standard', 'awards-standard'] } },
  { id: 'tpl-14', name: 'Academic CV', type: '1-col', titleStyle: 'lines', zones: { main: ['header-boxed', 'summary-clean', 'education-standard', 'experience-harvard', 'publications-standard', 'references-standard'] } },
  { id: 'tpl-15', name: 'Tech Lead Left Sidebar', type: 'sidebar-left-dark', titleStyle: 'standard', sidebarTitleStyle: 'designer', zones: { sidebar: ['header-avatar', 'sidebar-contact', 'skills-tags', 'languages-bars'], main: ['summary-quote', 'experience-split', 'projects-split', 'education-compact'] } }
];

export const TEMPLATE_CATEGORIES = [
  { id: 'single', name: 'Single Column', desc: 'Traditional top-to-bottom flow. Ideal for ATS compatibility.', types: ['1-col'], icon: <AlignJustify size={24}/> },
  { id: 'split', name: 'Split / Two Column', desc: 'Modern layouts separating your experience from secondary details.', types: ['2-col'], icon: <Columns size={24}/> },
  { id: 'header-sidebar', name: 'Header & Sidebar', desc: 'Full-width header combined with a compact side column.', types: ['top-sidebar-left', 'top-sidebar-right'], icon: <LayoutTemplate size={24}/> },
  { id: 'full-sidebar', name: 'Full Sidebar', desc: 'Continuous side panel that runs from top to bottom.', types: ['sidebar-left', 'sidebar-right', 'sidebar-left-dark', 'sidebar-right-dark'], icon: <Sidebar size={24}/> },
  { id: 'hybrid', name: 'Hybrid One-Pager', desc: 'Combines 1-column core sections with a 2-column bottom grid for density.', types: ['hybrid-split'], icon: <LayoutTemplate size={24}/> }
];

// --- HELPER FUNCTIONS ---
const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc: any, part: string) => acc && acc[part], obj);
const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const deepClone = JSON.parse(JSON.stringify(obj));
  const target = keys.reduce((acc: any, key: string) => acc[key], deepClone);
  target[lastKey] = value;
  return deepClone;
};
const generateId = () => Math.random().toString(36).substr(2, 9);
const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==========================================
