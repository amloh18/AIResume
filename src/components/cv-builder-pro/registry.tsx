
import React from 'react';
import { Quote, AlignJustify, Columns, LayoutTemplate, Sidebar, User, Briefcase, GraduationCap, FolderOpen, Award, Trophy, Code2, Globe, Heart, BookOpen, Users, MapPin, Phone, Mail, Linkedin, Link as LinkIcon } from 'lucide-react';
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
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-item-avoid ${isDark ? 'text-white border-slate-700' : 'cv-accent-border text-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'minimal': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 cv-item-avoid ${isDark ? 'text-white' : 'cv-accent-text'} flex items-center gap-2`}>{Icon && <Icon size={16} />}{children}</h3>;
  },
  'accent': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-item-avoid ${isDark ? 'text-white border-slate-700' : 'text-gray-900 border-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'boxed': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <div className={`inline-flex items-center gap-2 border px-2 py-1 mb-3 ${TYPOGRAPHY.date} cv-item-avoid ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-800 text-gray-800'}`}>{Icon && <Icon size={14} />}{children}</div>;
  },
  'sidebar-default': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-2 border-b pb-1 cv-item-avoid ${isDark ? 'text-slate-300 border-slate-600' : 'text-gray-800 border-gray-300'} flex items-center gap-2`}>{Icon && <Icon size={14} />}{children}</h3>;
  },
  'designer': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <h3 className={`${TYPOGRAPHY.sectionTitle} mb-4 cv-item-avoid ${isDark ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3>;
  },
  'lines': ({ children, isDark, showIcons, titleKey }) => {
    const Icon = showIcons && titleKey && SECTION_ICONS[titleKey] ? SECTION_ICONS[titleKey] : null;
    return <div className="flex items-center gap-4 mb-4 cv-item-avoid"><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div><h3 className={`${TYPOGRAPHY.sectionTitle} mb-0 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>{Icon && <Icon size={16} className="cv-accent-text" />}{children}</h3><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div></div>;
  },
};

// ==========================================
// 70+ PREMIUM SNIPPET REGISTRY
// ==========================================
export const SNIPPETS: Record<string, { id: string; name: string; category: string; render: (props: any) => React.ReactNode }> = {
  // === HEADERS (7) ===
  'header-minimal': { id: 'header-minimal', name: 'Minimal Center', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className={`text-center pb-4 border-b ${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} mb-4 snippet-anim cv-keep-with-next`}>
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`mx-auto rounded-full object-cover shadow-md mb-3 ${isNarrow ? 'w-24 h-24' : 'w-20 h-20'} ${isDark ? 'border-2 border-slate-700' : ''}`} />}
        <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest`}><Editable path="basics.name" /></h1>
        <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-gray-400' : ''} mb-3`}><Editable path="basics.title" /></h2>
        <div className={`flex flex-wrap justify-center ${isNarrow ? 'flex-col gap-1.5 items-center' : 'gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact}`}>
          <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
        </div>
      </div>
    );
  }},
  'header-split': { id: 'header-split', name: 'Split Modern', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className={`flex ${isNarrow ? 'flex-col gap-4 text-center items-center' : 'justify-between items-end'} pb-4 border-b-[1.5px] ${isDark ? 'border-slate-600' : 'border-slate-800'} mb-4 snippet-anim w-full cv-keep-with-next`}>
        <div className={`flex ${isNarrow ? 'flex-col text-center items-center' : 'items-center text-left'} gap-4 min-w-0`}>
          {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-md ${isNarrow ? 'w-24 h-24' : 'w-16 h-16'}`} />}
          <div className="min-w-0">
            <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-slate-800'} mb-1.5`}><Editable path="basics.name" /></h1>
            <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}><Editable path="basics.title" /></h2>
          </div>
        </div>
        <div className={`${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact} flex ${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%]`}>
          <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span>
          <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span>
          <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span>
          <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span>
          <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
        </div>
      </div>
    );
  }},
  'header-avatar': { id: 'header-avatar', name: 'Avatar Left Bold', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-5 mb-5 snippet-anim w-full cv-keep-with-next`}>
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full shadow-lg object-cover shrink-0 ${isNarrow ? 'w-28 h-28' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-4 border-white'}`} />}
        <div className="min-w-0 w-full">
          <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1.5`}><Editable path="basics.name" /></h1>
          <h2 className={`${TYPOGRAPHY.role} mb-3`}><Editable path="basics.title" /></h2>
          <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : 'gap-x-4 gap-y-1.5 items-center'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
            <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
            <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
            <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
            <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
          </div>
        </div>
      </div>
    );
  }},
  'header-boxed': { id: 'header-boxed', name: 'Elegant Box', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className="text-center pb-5 mb-5 snippet-anim w-full flex flex-col items-center cv-keep-with-next">
        <div className={`inline-block border-[2px] px-8 py-3 mb-4 tracking-[0.25em] uppercase ${isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900'}`}>
          <h1 className={`${isNarrow ? 'text-xl' : 'text-2xl'} font-bold`}><Editable path="basics.name" nowrap /></h1>
        </div>
        <h2 className={`${TYPOGRAPHY.role} mb-5 ${isDark ? 'text-gray-400' : ''}`}><Editable path="basics.title" /></h2>
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`mx-auto rounded-full object-cover shadow-xl mb-4 ${isNarrow ? 'w-28 h-28' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'}`} />}
        <div className={`flex flex-wrap justify-center ${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} ${TYPOGRAPHY.contact}`}>
          <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span> {!isNarrow && <span>&bull;</span>} 
          <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
        </div>
      </div>
    );
  }},
  'header-executive': { id: 'header-executive', name: 'Executive Stacked', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className={`pb-4 mb-5 border-b-[1.5px] ${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next`}>
        <div className={`flex ${isNarrow ? 'flex-col gap-4' : 'justify-between items-start'} w-full`}>
          <div className="min-w-0 w-full">
            <h1 className={`${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Editable path="basics.name" /></h1>
            <div className={`flex flex-wrap ${isNarrow ? 'flex-col text-center gap-1.5' : 'gap-x-4 gap-y-1.5'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
              <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
            </div>
          </div>
          {data?.basics?.showAvatar && !isNarrow && <img src={data.basics.avatar} alt="Avatar" className={`rounded object-cover shadow-md shrink-0 w-20 h-24 ${isDark ? 'border border-slate-600' : ''}`} />}
        </div>
      </div>
    );
  }},
  'header-accent': { id: 'header-accent', name: 'Accent Side Bar', category: 'Header', render: ({ data, Editable, zoneId, isDark, Title, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className="snippet-anim w-full mb-8 cv-keep-with-next">
        <div className={`flex ${isNarrow ? 'flex-col gap-6' : 'justify-between items-center'}`}>
          <div className={`min-w-0 ${isNarrow ? 'w-full text-center' : 'w-2/3'}`}>
            <h1 className={`${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}><Editable path="basics.name" /></h1>
            <h2 className={`${TYPOGRAPHY.role} tracking-[0.25em]`}><Editable path="basics.title" /></h2>
          </div>
          <div className={`flex items-stretch gap-4 ${isNarrow ? 'w-full justify-center text-center' : 'text-right'}`}>
            {!isNarrow && <div className="flex flex-col justify-center"><Title titleKey="contact" overrideClass={`${TYPOGRAPHY.contact} tracking-widest uppercase mb-0 ${isDark ? 'text-gray-400' : 'text-gray-800'}`} /></div>}
            <div className="w-1.5 cv-accent-bg shrink-0 rounded-full"></div>
            <div className={`${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="flex items-center gap-1.5 justify-end">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span>
              <span className="flex items-center gap-1.5 justify-end">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span>
              <span className="flex items-center gap-1.5 justify-end">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span>
              <span className="flex items-center gap-1.5 justify-end">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span>
              <span className="flex items-center gap-1.5 justify-end">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
            </div>
          </div>
        </div>
      </div>
    );
  }},
  'header-creative': { id: 'header-creative', name: 'Creative Block', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (
      <div className={`p-6 rounded-xl mb-6 snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg`}>
        <div className={`flex ${isNarrow ? 'flex-col gap-4 text-center' : 'justify-between items-center'} w-full`}>
          <div className="min-w-0 w-full">
            <h1 className={`${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1`}><Editable path="basics.name" /></h1>
            <h2 className={`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4`}><Editable path="basics.title" /></h2>
            <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} text-xs font-medium opacity-90`}>
              <span className="flex items-center gap-1.5">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span> {!isNarrow && <span>&bull;</span>}
              <span className="flex items-center gap-1.5">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>
            </div>
          </div>
          {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-2xl border-4 border-white/20 ${isNarrow ? 'w-24 h-24 mx-auto mt-4' : 'w-24 h-24'}`} />}
        </div>
      </div>
    );
  }},

  // === SUMMARIES (6) ===
  'summary-clean': { id: 'summary-clean', name: 'Clean Paragraph', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-highlight': { id: 'summary-highlight', name: 'Left Accent Highlight', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="summary" /><div className={`p-4 border-l-[4px] rounded-r-lg cv-accent-border cv-keep-with-next shadow-sm ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}><div className={`${TYPOGRAPHY.body} italic ${isDark ? 'text-slate-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div></div></div>
  )},
  'summary-quote': { id: 'summary-quote', name: 'Quotation Mark', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim flex gap-4 items-start cv-section"><div className={`shrink-0 pt-1 cv-accent-text opacity-50`}><Quote size={28} fill="currentColor"/></div><div className="flex-1"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div></div>
  )},
  'summary-centered': { id: 'summary-centered', name: 'Centered Block', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim text-center cv-section"><Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} text-center mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'} mx-auto`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-boxed': { id: 'summary-boxed', name: 'Border Box', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className={`mb-6 snippet-anim border p-5 rounded-xl shadow-sm cv-section cv-keep-with-next ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-white'}`}><Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div></div>
  )},
  'summary-bold': { id: 'summary-bold', name: 'Bold Intro', category: 'Summary', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="summary" /><div className={`${TYPOGRAPHY.body} font-medium text-[1.1em] leading-[1.8] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div></div>
  )},

  // === EXPERIENCE (6) ===
  'experience-standard': { id: 'experience-standard', name: 'Standard Flow', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = Array.isArray(data?.experience) ? data.experience : [];
    if (expData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`experience.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'experience-split': { id: 'experience-split', name: 'Split Columns', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-5 cv-gap-lg">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.date`} nowrap /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.company`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.role`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }},
  'experience-harvard': { id: 'experience-harvard', name: 'Harvard Dense', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.company`} nowrap />, <span className="font-semibold italic"><Editable path={`experience.${idx}.role`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'experience-timeline': { id: 'experience-timeline', name: 'Vertical Timeline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-900' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`experience.${idx}.date`} nowrap /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.company`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>
  )}},
  'experience-compact': { id: 'experience-compact', name: 'Compact Inline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-4 cv-gap-md">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`experience.${idx}.role`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>at</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`experience.${idx}.company`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>
  )}},
  'experience-accent': { id: 'experience-accent', name: 'Accent Ribbon', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const expData = data?.experience || [];
    if (expData.length === 0) return null;
    return (
    <div className="mb-6 snippet-anim cv-section"><Title titleKey="experience" /><div className="flex flex-col gap-5 cv-gap-lg">{expData.map((exp: any, idx: number) => (<ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`pl-4 border-l-[3px] cv-accent-border`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4><div className={`flex flex-wrap gap-x-3 mb-2 mt-0.5`}><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></span><span className={`${TYPOGRAPHY.date} opacity-80`}><Editable path={`experience.${idx}.date`} nowrap /></span></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>
  )}},

  // === EDUCATION (6) ===
  'education-standard': { id: 'education-standard', name: 'Standard Flow', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const eduData = Array.isArray(data?.education) ? data.education : [];
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-split': { id: 'education-split', name: 'Split Columns', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const eduData = data?.education || [];
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-lg">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.degree`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></div></ListEntry>))}</div></div>);
  }},
  'education-harvard': { id: 'education-harvard', name: 'Harvard Dense', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{data.education.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap />, <span className="font-semibold italic"><Editable path={`education.${idx}.degree`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-800'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-timeline': { id: 'education-timeline', name: 'Vertical Timeline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`education.${idx}.date`} nowrap /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }},
  'education-compact': { id: 'education-compact', name: 'Compact Inline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`education.${idx}.degree`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`education.${idx}.institution`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></ListEntry>))}</div></div>);
  }},
  'education-blocks': { id: 'education-blocks', name: 'Shaded Blocks', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const eduData = data?.education || [];
    if (eduData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="education" /><div className="flex flex-col gap-4 cv-gap-md">{eduData.map((edu: any, idx: number) => (<ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} border ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}><div className="cv-keep-with-next"><div className={`flex justify-between items-baseline flex-wrap gap-x-3 mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div></div></ListEntry>))}</div></div>);
  }},

  // === PROJECTS (6) ===
  'projects-standard': { id: 'projects-standard', name: 'Standard Flow', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = Array.isArray(data?.projects) ? data.projects : [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`projects.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-split': { id: 'projects-split', name: 'Split Columns', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-5 cv-gap-lg">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}><div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}><div className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.date`} nowrap /></div></div><div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap />,</h4><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></div></ListEntry>))}</div></div>);
  }},
  'projects-harvard': { id: 'projects-harvard', name: 'Harvard Dense', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap />, <span className="font-semibold italic"><Editable path={`projects.${idx}.role`} nowrap /></span></h4><span className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-timeline': { id: 'projects-timeline', name: 'Vertical Timeline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="relative pl-6"><div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[25px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div><div className="cv-keep-with-next"><div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`projects.${idx}.date`} nowrap /></div><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.role`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }},
  'projects-compact': { id: 'projects-compact', name: 'Compact Inline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className="flex flex-col gap-4 cv-gap-md">{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`projects.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>|</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`projects.${idx}.role`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},
  'projects-grid': { id: 'projects-grid', name: '2-Column Grid', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const prjData = data?.projects || [];
    if (prjData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="projects" /><div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-4 cv-gap-md`}>{prjData.map((prj: any, idx: number) => (<ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`h-full p-4 rounded-xl border transition-colors hover:border-emerald-500/30 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4><div className={`flex justify-between items-baseline mb-2`}><span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span><span className={`${TYPOGRAPHY.date} text-[10px]`}><Editable path={`projects.${idx}.date`} nowrap /></span></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div></div></ListEntry>))}</div></div>);
  }},

  // === CERTIFICATIONS (5) ===
  'certifications-standard': { id: 'certifications-standard', name: 'Standard List', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const certData = Array.isArray(data?.certifications) ? data.certifications : [];
    if (certData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-4 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></div></ListEntry>))}</div></div>);
  }},
  'certifications-harvard': { id: 'certifications-harvard', name: 'Harvard Dense', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const certData = data?.certifications || [];
    if (certData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-3 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col' : 'justify-between items-baseline'} w-full cv-keep-with-next`}><div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap />, <span className="font-normal italic"><Editable path={`certifications.${idx}.issuer`} nowrap /></span></div><span className={`${TYPOGRAPHY.date}`}><Editable path={`certifications.${idx}.date`} nowrap /></span></div></ListEntry>))}</div></div>);
  }},
  'certifications-compact': { id: 'certifications-compact', name: 'Compact Inline', category: 'Certifications', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const certData = data?.certifications || [];
    if (certData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="certifications" /><div className="flex flex-col gap-3 cv-gap-sm">{certData.map((cert: any, idx: number) => (<ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`certifications.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>by</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.date`} nowrap /></span></div></ListEntry>))}</div></div>);
  }},

  // === AWARDS (3) ===
  'awards-standard': { id: 'awards-standard', name: 'Standard List', category: 'Awards', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const awdData = Array.isArray(data?.awards) ? data.awards : [];
    if (awdData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-4 cv-gap-sm">{awdData.map((awd: any, idx: number) => (<ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`awards.${idx}.name`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`awards.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`awards.${idx}.issuer`} nowrap /></div></ListEntry>))}</div></div>);
  }},
  'awards-compact': { id: 'awards-compact', name: 'Compact Inline', category: 'Awards', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }: any) => {
    const awdData = data?.awards || [];
    if (awdData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="awards" /><div className="flex flex-col gap-3 cv-gap-sm">{awdData.map((awd: any, idx: number) => (<ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}><span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`awards.${idx}.name`} nowrap /></span><span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span><span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`awards.${idx}.issuer`} nowrap /></span><span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`awards.${idx}.date`} nowrap /></span></div></ListEntry>))}</div></div>);
  }},

  // === PUBLICATIONS ===
  'publications-standard': { id: 'publications-standard', name: 'Standard Flow', category: 'Publications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const pubData = Array.isArray(data?.publications) ? data.publications : [];
    if (pubData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="publications" /><div className="flex flex-col gap-4 cv-gap-md">{pubData.map((pub: any, idx: number) => (<ListEntry key={pub.id} collection="publications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`publications.${idx}.title`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`publications.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`publications.${idx}.publisher`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`publications.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},

  // === VOLUNTEER ===
  'volunteer-standard': { id: 'volunteer-standard', name: 'Standard Flow', category: 'Volunteer', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const volData = Array.isArray(data?.volunteer) ? data.volunteer : [];
    if (volData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="volunteer" /><div className="flex flex-col gap-4 cv-gap-md">{volData.map((vol: any, idx: number) => (<ListEntry key={vol.id} collection="volunteer" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}><h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`volunteer.${idx}.role`} nowrap /></h4><span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`volunteer.${idx}.date`} nowrap /></span></div><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`volunteer.${idx}.organization`} nowrap /></div></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`volunteer.${idx}.description`} multiline html /></div></ListEntry>))}</div></div>);
  }},

  // === REFERENCES ===
  'references-standard': { id: 'references-standard', name: 'Standard Block', category: 'References', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const refData = Array.isArray(data?.references) ? data.references : [];
    if (refData.length === 0) return null;
    return (<div className="mb-6 snippet-anim cv-section"><Title titleKey="references" /><div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-6 cv-gap-lg`}>{refData.map((ref_item: any, idx: number) => (<ListEntry key={ref_item.id} collection="references" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}><div className="cv-keep-with-next"><h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`references.${idx}.name`} nowrap /></h4><div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`references.${idx}.role`} nowrap /></div><div className={`${TYPOGRAPHY.body} font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><Editable path={`references.${idx}.contact`} nowrap /></div></div></ListEntry>))}</div></div>);
  }},

  // === SKILLS (6) ===
  'skills-tags': { id: 'skills-tags', name: 'Text Blocks', category: 'Skills', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="skills" /><div className="mb-3 cv-mb-sm"><div className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Languages</div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path="skills.languages" /></div></div><div className="mb-3 cv-mb-sm"><div className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Frameworks</div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path="skills.frameworks" /></div></div></div>
  )},
  'skills-pills': { id: 'skills-pills', name: 'Solid Pills', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const allSkills = [...(data.skills?.languages || '').split(','), ...(data.skills?.frameworks || '').split(',')].map((s: string) => s.trim()).filter(Boolean);
    return (<div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="skills" /><div className="flex flex-wrap gap-2 cv-gap-sm">{allSkills.map((skill: string, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{skill}</span>))}</div></div>);
  }},
  'skills-dots': { id: 'skills-dots', name: 'Dot Rating', category: 'Skills', render: ({ data, isDark, Title }: any) => {
    const allSkills = [...(data.skills?.languages || '').split(',')].map((s: string) => s.trim()).filter(Boolean).slice(0, 6);
    return (<div className="mb-6 snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="skills" /><div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">{allSkills.map((skill: string, i: number) => { const rating = i % 2 === 0 ? 5 : 4; return (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{skill}</span><div className="flex gap-1.5">{[...Array(5)].map((_, dotIdx) => (<div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>))}</div></div>); })}</div></div>);
  }},
  'skills-category-inline': { id: 'skills-category-inline', name: 'Category Inline', category: 'Skills', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="skills" /><div className="flex flex-col gap-2 cv-gap-sm"><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Core Languages:</span><Editable path="skills.languages" /></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Frameworks:</span><Editable path="skills.frameworks" /></div><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Tools & Tech:</span><Editable path="skills.tools" /></div></div></div>
  )},

  // === LANGUAGES ===
  'languages-comma': { id: 'languages-comma', name: 'Comma Separated', category: 'Languages', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="languages" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="languages" /></div></div>
  )},
  'languages-dots': { id: 'languages-dots', name: 'Dot Rating', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="mb-6 snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="languages" /><div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">{items.map((item: string, i: number) => { const rating = i % 2 === 0 ? 5 : 4; return (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.split('(')[0]}</span><div className="flex gap-1.5">{[...Array(5)].map((_, dotIdx) => (<div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>))}</div></div>); })}</div></div>);
  }},
  'languages-bars': { id: 'languages-bars', name: 'Progress Bars', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="mb-6 snippet-anim w-full cv-section cv-item-avoid"><Title titleKey="languages" /><div className="flex flex-col gap-3 cv-gap-sm">{items.map((item: string, i: number) => { const widths = ['w-[95%]', 'w-[85%]', 'w-[65%]', 'w-[50%]']; return (<div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}><span className={`w-1/2 truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{item.split('(')[0]}</span><div className={`w-1/2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}><div className={`h-full cv-accent-bg ${widths[i] || 'w-[70%]'}`}></div></div></div>); })}</div></div>);
  }},
  'languages-pills': { id: 'languages-pills', name: 'Solid Pills', category: 'Languages', render: ({ data, isDark, Title }: any) => {
    const items = (data.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="languages" /><div className="flex flex-wrap gap-2 cv-gap-sm">{items.map((item: string, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{item.split('(')[0]}</span>))}</div></div>);
  }},

  // === INTERESTS ===
  'interests-comma': { id: 'interests-comma', name: 'Comma Separated', category: 'Interests', render: ({ data, Editable, isDark, Title }: any) => (
    <div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="interests" /><div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="interests" /></div></div>
  )},
  'interests-pills': { id: 'interests-pills', name: 'Outline Pills', category: 'Interests', render: ({ data, isDark, Title }: any) => {
    const items = (data.interests || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return (<div className="mb-6 snippet-anim cv-section cv-item-avoid"><Title titleKey="interests" /><div className="flex flex-wrap gap-2 cv-gap-sm">{items.map((item: string, i: number) => (<span key={i} className={`px-3 py-1.5 text-xs font-medium border rounded-full ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-400 text-gray-800'}`}>{item}</span>))}</div></div>);
  }},

  // === SIDEBAR SPECIFIC ===
  'sidebar-contact': { id: 'sidebar-contact', name: 'Contact List', category: 'Sidebar', render: ({ data, Editable, isDark, Title, showIcons }: any) => (
    <div className={`mb-6 snippet-anim cv-section ${isDark ? 'text-white' : 'text-gray-900'} w-full min-w-0 cv-item-avoid`}><Title titleKey="contact" /><div className={`flex flex-col gap-2.5 cv-gap-sm ${TYPOGRAPHY.body} ${isDark ? 'text-slate-300' : 'text-gray-700'} break-all`}><div className="flex items-center gap-2">{showIcons && <MapPin size={14} /> }<Editable path="basics.location" nowrap /></div><div className="flex items-center gap-2">{showIcons && <Phone size={14} /> }<Editable path="basics.phone" nowrap /></div><div className="flex items-center gap-2">{showIcons && <Mail size={14} /> }<Editable path="basics.email" breakAll /></div><div className="flex items-center gap-2">{showIcons && <Linkedin size={14} /> }<Editable path="basics.linkedin" breakAll /></div><div className="flex items-center gap-2">{showIcons && <LinkIcon size={14} /> }<Editable path="basics.website" breakAll /></div></div></div>
  )}
};

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
