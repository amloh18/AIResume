'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import AnnouncementBanner from '@/components/landing/AnnouncementBanner';
import { heroTopPaddingClass } from '@/components/landing/announcementBannerConfig';
import { navLinks } from '@/data/navigation';
import CVBuilderProAdapter from '@/components/cv-builder-pro/CVBuilderProAdapter';
import { TemplateLibraryGrid } from '@/components/cv-builder-pro/components/TemplateLibraryGrid';
import { EditableField, CanvasContext } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES, SNIPPETS, TEMPLATE_CATEGORIES, TITLE_STYLES } from '@/components/cv-builder-pro/registry';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import {
  Sparkles,
  LayoutTemplate,
  Shuffle,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Code2,
  FileText,
  ShieldCheck,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  MousePointerClick,
  Palette,
  Check
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* ReadOnlyWrapper for Step 3 TemplateLibraryGrid thumbnails                  */
/* -------------------------------------------------------------------------- */
const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly={true} />;

/* -------------------------------------------------------------------------- */
/* Mock Persona Profiles for Sandbox                                          */
/* -------------------------------------------------------------------------- */
const MOCK_PERSONAS: Record<string, { label: string; role: string; icon: string; data: any }> = {
  tech: {
    label: 'Software & AI Architect',
    role: 'Alex Morgan — Senior Full Stack & AI Architect',
    icon: '⚡',
    data: {
      ...initialData,
      basics: {
        ...initialData.basics,
        name: 'Alex Morgan',
        title: 'Senior Full Stack & AI Architect',
        summary: 'Forward-thinking Software Architect with 7+ years designing high-throughput distributed microservices, LLM application pipelines, and real-time data platforms in TypeScript, Go, and Python. Reduced latency by 45% for 10M+ daily active users.',
      },
      skills: [
        {
          id: 'sk-t1',
          category: 'Languages & Core',
          skillsText: 'TypeScript, JavaScript, Python, Go, Rust, SQL, GraphQL',
          skills: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'SQL', 'GraphQL'],
          levels: [5, 5, 5, 4, 4, 5, 4]
        },
        {
          id: 'sk-t2',
          category: 'Frameworks & Systems',
          skillsText: 'React, Next.js, Node.js, Express, FastAPI, PyTorch, LangChain',
          skills: ['React', 'Next.js', 'Node.js', 'Express', 'FastAPI', 'PyTorch', 'LangChain'],
          levels: [5, 5, 5, 4, 4, 4, 4]
        },
        {
          id: 'sk-t3',
          category: 'Cloud, Data & DevOps',
          skillsText: 'AWS, Kubernetes, Docker, PostgreSQL, Redis, Kafka, CI/CD',
          skills: ['AWS', 'Kubernetes', 'Docker', 'PostgreSQL', 'Redis', 'Kafka', 'CI/CD'],
          levels: [4, 4, 5, 5, 4, 4, 4]
        }
      ]
    }
  },
  design: {
    label: 'Product Designer (UX/UI)',
    role: 'Elena Rostova — Lead Product & UX Designer',
    icon: '🎨',
    data: {
      ...initialData,
      basics: {
        ...initialData.basics,
        name: 'Elena Rostova',
        title: 'Lead Product & UX Designer',
        email: 'elena.design@example.com',
        location: 'London, UK / Remote',
        summary: 'Award-winning Product Designer with 6+ years driving product discovery, design systems, and mobile/web UX across fintech and SaaS platforms. Increased user activation by 38% through iterative user testing and zero-friction interaction architecture.',
      },
      experience: [
        {
          id: 'exp-d1',
          company: 'FinFlow Global',
          role: 'Lead UX Designer',
          date: '2022 - Present',
          description: '<ul><li>Spearheaded redesign of cross-border payments flow resulting in $14M ARR pipeline increase.</li><li>Created unified design system across iOS, Android, and Web reducing sprint design cycles by 35%.</li><li>Conducted 100+ usability tests and synthesized behavioural telemetry with product management.</li></ul>'
        },
        {
          id: 'exp-d2',
          company: 'Aura Studio',
          role: 'Senior UI/UX Specialist',
          date: '2019 - 2022',
          description: '<ul><li>Built end-to-end user onboarding journeys for high-growth e-commerce and creator platforms.</li><li>Authored accessibility (a11y) standards achieving WCAG 2.1 AAA compliance company-wide.</li></ul>'
        }
      ],
      skills: [
        {
          id: 'sk-d1',
          category: 'Design & Prototyping',
          skillsText: 'Figma, Design Systems, Wireframing, User Flow, Motion Design, Prototyping',
          skills: ['Figma', 'Design Systems', 'Wireframing', 'User Flow', 'Motion Design', 'Prototyping'],
          levels: [5, 5, 5, 5, 4, 5]
        },
        {
          id: 'sk-d2',
          category: 'User Research & Testing',
          skillsText: 'UX Research, Usability Testing, A/B Testing, Persona Mapping, Telemetry',
          skills: ['UX Research', 'Usability Testing', 'A/B Testing', 'Persona Mapping', 'Telemetry'],
          levels: [5, 5, 4, 5, 4]
        },
        {
          id: 'sk-d3',
          category: 'Frontend & Collaboration',
          skillsText: 'Design Tokens, HTML/CSS, Tailwind CSS, Accessibility (WCAG), Agile/Scrum',
          skills: ['Design Tokens', 'HTML/CSS', 'Tailwind CSS', 'Accessibility (WCAG)', 'Agile/Scrum'],
          levels: [4, 4, 4, 5, 5]
        }
      ]
    }
  },
  exec: {
    label: 'VP / Executive Leader',
    role: 'Marcus Vance — VP of Engineering & Operations',
    icon: '👔',
    data: {
      ...initialData,
      basics: {
        ...initialData.basics,
        name: 'Marcus Vance',
        title: 'VP of Engineering & Technology Strategy',
        email: 'm.vance@example.com',
        location: 'New York, NY',
        summary: 'Transformational Engineering Executive with 12+ years building and leading global engineering teams of 80+ engineers across 4 continents. Scaled enterprise B2B SaaS from Series A ($4M ARR) to Series D ($65M ARR) while improving system uptime to 99.99%.',
      },
      experience: [
        {
          id: 'exp-e1',
          company: 'Nexus Cloud Enterprise',
          role: 'VP of Engineering',
          date: '2021 - Present',
          description: '<ul><li>Manage $18M engineering budget, headcount planning, and multi-region infrastructure strategy.</li><li>Decreased team attrition to <4% while expanding engineering org by 140% across Americas and EMEA.</li><li>Led enterprise SOC2 Type II, ISO27001, and HIPAA compliance governance.</li></ul>'
        },
        {
          id: 'exp-e2',
          company: 'Apex Core Networks',
          role: 'Director of Software Engineering',
          date: '2017 - 2021',
          description: '<ul><li>Managed 5 core engineering tribes building real-time cloud data fabric products.</li><li>Delivered $22M enterprise renewal contract through reliable microservice platform stabilization.</li></ul>'
        }
      ],
      skills: [
        {
          id: 'sk-e1',
          category: 'Executive Leadership',
          skillsText: 'Strategic Planning, Engineering Org Design, Global Team Leadership, Headcount Planning',
          skills: ['Strategic Planning', 'Engineering Org Design', 'Global Team Leadership', 'Headcount Planning'],
          levels: [5, 5, 5, 5]
        },
        {
          id: 'sk-e2',
          category: 'Business & Operations',
          skillsText: 'P&L Management, Budgeting ($18M+), Vendor Negotiation, M&A Due Diligence',
          skills: ['P&L Management', 'Budgeting ($18M+)', 'Vendor Negotiation', 'M&A Due Diligence'],
          levels: [5, 5, 4, 4]
        },
        {
          id: 'sk-e3',
          category: 'Governance & Tech Strategy',
          skillsText: 'Enterprise Security, SOC2 / ISO27001, Cloud Architecture, DevOps & SRE Strategy',
          skills: ['Enterprise Security', 'SOC2 / ISO27001', 'Cloud Architecture', 'DevOps & SRE Strategy'],
          levels: [5, 5, 4, 4]
        }
      ]
    }
  }
};

/* -------------------------------------------------------------------------- */
/* Color Accent Presets                                                       */
/* -------------------------------------------------------------------------- */
const ACCENT_COLORS = [
  { id: 'lime', name: 'Forest Lime', color: '#81ff00', bg: 'bg-[#81ff00]' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', bg: 'bg-[#10b981]' },
  { id: 'sapphire', name: 'Sapphire Blue', color: '#2563eb', bg: 'bg-[#2563eb]' },
  { id: 'violet', name: 'Royal Violet', color: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
  { id: 'rose', name: 'Rose Crimson', color: '#f43f5e', bg: 'bg-[#f43f5e]' },
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b', bg: 'bg-[#f59e0b]' },
  { id: 'dark', name: 'Obsidian Black', color: '#18181b', bg: 'bg-[#18181b]' },
];

/* -------------------------------------------------------------------------- */
/* Snippet Categories                                                         */
/* -------------------------------------------------------------------------- */
const SNIPPET_GROUPS = [
  { id: 'Header', label: 'Headers', icon: User },
  { id: 'Summary', label: 'Summaries', icon: FileText },
  { id: 'Experience', label: 'Experience', icon: Briefcase },
  { id: 'Skills', label: 'Skills', icon: Code2 },
  { id: 'Education', label: 'Education', icon: GraduationCap },
  { id: 'Projects', label: 'Projects', icon: Layers },
  { id: 'Certifications', label: 'Certs', icon: Award },
  { id: 'Languages', label: 'Languages', icon: Globe },
];

/* -------------------------------------------------------------------------- */
/* Auto-Demo Tour Sequence Steps                                              */
/* -------------------------------------------------------------------------- */
const AUTO_TOUR_STEPS = [
  { tplIndex: 0, personaKey: 'tech', color: '#81ff00', desc: 'Minimalist Single Column (ATS Optimized)' },
  { tplIndex: 1, personaKey: 'tech', color: '#81ff00', desc: 'Modern Split 2-Column Layout' },
  { tplIndex: 2, personaKey: 'design', color: '#10b981', desc: 'Professional Sidebar Left Panel' },
  { tplIndex: 4, personaKey: 'tech', color: '#2563eb', desc: 'Two Column 50/50 Architecture' },
  { tplIndex: 5, personaKey: 'exec', color: '#81ff00', desc: 'Harvard Executive Academic Format' },
  { tplIndex: 6, personaKey: 'design', color: '#8b5cf6', desc: 'Designer Portfolio Timeline Style' },
  { tplIndex: 9, personaKey: 'exec', color: '#10b981', desc: 'Header & Right Sidebar Hybrid' },
  { tplIndex: 12, personaKey: 'tech', color: '#81ff00', desc: 'Dense One-Pager Hybrid Layout' },
];

export default function ExploreStudioClient() {
  const router = useRouter();
  const [bannerActive, setBannerActive] = useState(false);

  // Studio Active States
  const [activeSidebarTab, setActiveSidebarTab] = useState<'templates' | 'snippets' | 'styles' | 'personas'>('templates');
  const [activePersonaKey, setActivePersonaKey] = useState<string>('tech');
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>('Header');
  const [accentColor, setAccentColor] = useState<string>('#81ff00');
  const [zoomLevel, setZoomLevel] = useState<number>(0.92);
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>('light');

  // Auto / Manual Demo State
  const [isAutoDemo, setIsAutoDemo] = useState<boolean>(true);
  const [tourIndex, setTourIndex] = useState<number>(0);
  const [userIntervened, setUserIntervened] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active CV Data & Template
  const [cvData, setCvData] = useState<UnifiedCVDataStructure>(MOCK_PERSONAS.tech.data);
  const [activeTemplate, setActiveTemplate] = useState<any>(() => {
    const raw = CANVAS_TEMPLATES[0];
    return {
      id: raw.id,
      _id: raw.id,
      name: raw.name,
      type: raw.type,
      zones: JSON.parse(JSON.stringify(raw.zones)),
      titleStyle: raw.titleStyle,
      sidebarTitleStyle: (raw as any).sidebarTitleStyle || 'sidebar-default',
      globalStyles: {
        primaryColor: '#81ff00',
        fontFamily: 'Inter',
      }
    };
  });

  // Canvas-normalized data for CanvasContext (used by EditableField in thumbnails).
  // MOCK_PERSONAS data is already in canvas format (has .experience[], .basics.title, etc.)
  // so we use it directly — calling normalizeCvDataForCanvas would corrupt canvas-format fields.
  const canvasData = useMemo(() => cvData as any, [cvData]);

  // Handle User Manual Intervention (Pauses auto demo)
  const handleUserIntervention = useCallback(() => {
    setUserIntervened(true);
    setIsAutoDemo(false);

    // Clear any existing idle timeout
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Auto-resume after 7 seconds of inactivity
    idleTimerRef.current = setTimeout(() => {
      setUserIntervened(false);
      setIsAutoDemo(true);
    }, 7000);
  }, []);

  // When mouse leaves the studio container -> resume auto demo faster (3s)
  const handleMouseLeaveStudio = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setUserIntervened(false);
      setIsAutoDemo(true);
    }, 3000);
  }, []);

  // Auto-Tour Cycling Effect
  useEffect(() => {
    if (!isAutoDemo) return;

    const interval = setInterval(() => {
      setTourIndex((prev) => {
        const next = (prev + 1) % AUTO_TOUR_STEPS.length;
        const step = AUTO_TOUR_STEPS[next];
        const tplDef = CANVAS_TEMPLATES[step.tplIndex] || CANVAS_TEMPLATES[0];

        // Apply tour state
        setActivePersonaKey(step.personaKey);
        setCvData(MOCK_PERSONAS[step.personaKey].data);
        setAccentColor(step.color);
        setActiveTemplate({
          id: tplDef.id,
          _id: tplDef.id,
          name: tplDef.name,
          type: tplDef.type,
          zones: JSON.parse(JSON.stringify(tplDef.zones)),
          titleStyle: tplDef.titleStyle,
          sidebarTitleStyle: (tplDef as any).sidebarTitleStyle || 'sidebar-default',
          globalStyles: {
            primaryColor: step.color,
            fontFamily: 'Inter',
          }
        });

        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutoDemo]);

  // Handle Template Select (Manual)
  const handleSelectTemplate = (templateDef: any) => {
    handleUserIntervention();
    setActiveTemplate({
      id: templateDef.id,
      _id: templateDef.id,
      name: templateDef.name,
      type: templateDef.type,
      zones: JSON.parse(JSON.stringify(templateDef.zones)),
      titleStyle: templateDef.titleStyle,
      sidebarTitleStyle: templateDef.sidebarTitleStyle || 'sidebar-default',
      globalStyles: {
        primaryColor: accentColor,
        fontFamily: 'Inter',
      }
    });
  };

  // Handle Snippet Swap (Manual)
  const handleSwapSnippet = (snippetId: string, category: string) => {
    handleUserIntervention();
    if (!activeTemplate || !activeTemplate.zones) return;

    const newZones = JSON.parse(JSON.stringify(activeTemplate.zones));
    let swapped = false;

    Object.keys(newZones).forEach((zoneId) => {
      const list = newZones[zoneId] || [];
      for (let i = 0; i < list.length; i++) {
        const existingId = list[i];
        const existingDef = SNIPPETS[existingId];
        if (existingDef && existingDef.category === category) {
          list[i] = snippetId;
          swapped = true;
          break;
        }
      }
    });

    if (!swapped) {
      const targetZone = newZones.main ? 'main' : Object.keys(newZones)[0];
      if (targetZone) {
        newZones[targetZone] = newZones[targetZone] || [];
        newZones[targetZone].push(snippetId);
      }
    }

    setActiveTemplate({
      ...activeTemplate,
      zones: newZones
    });
  };

  // Snippets in currently selected category
  const snippetsInCategory = useMemo(() => {
    return Object.values(SNIPPETS).filter((s) => s.category === selectedSnippetCategory);
  }, [selectedSnippetCategory]);

  return (
    <div className="min-h-screen bg-[#0f140c] text-white selection:bg-[#81ff00] selection:text-black">
      {/* Announcement Banner */}
      <AnnouncementBanner onDismiss={() => setBannerActive(false)} />

      {/* Main Landing Navbar */}
      <CardNav
        logo="AI Resume"
        links={navLinks}
        withBanner={bannerActive}
        onCtaClick={() => router.push('/sign-in')}
      />

      {/* Hero Header */}
      <section className={`${heroTopPaddingClass(bannerActive)} pb-6 px-4 sm:px-6 max-w-7xl mx-auto text-center transition-[padding] duration-300`}>
        {/* Auto / Manual Status Indicator Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#81ff00]/10 border border-[#81ff00]/30 text-xs font-bold uppercase tracking-wider mb-3">
          {isAutoDemo ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#81ff00] animate-ping" />
              <span className="text-[#81ff00] flex items-center gap-1.5">
                <Play className="w-3 h-3 fill-current" />
                Auto-Demo Tour Playing · Hover or click to interact
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-400 flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" />
                Manual Interactive Mode · Auto-resumes when idle
              </span>
            </>
          )}

          <button
            onClick={() => {
              if (isAutoDemo) {
                setIsAutoDemo(false);
                setUserIntervened(true);
              } else {
                setIsAutoDemo(true);
                setUserIntervened(false);
              }
            }}
            className="ml-2 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-extrabold transition-colors cursor-pointer"
          >
            {isAutoDemo ? 'Pause Tour' : 'Resume Tour'}
          </button>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Step 3 Visual Editor Studio & Templates
        </h1>

        <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
          Explore our live canvas architecture with real section toolbars, hover handles, modular snippet gravity, and live layout thumbnails.
        </p>
      </section>

      {/* Main Studio Container with Step 3 Editor Layout */}
      <section
        onMouseEnter={handleUserIntervention}
        onMouseMove={handleUserIntervention}
        onMouseLeave={handleMouseLeaveStudio}
        className="px-3 sm:px-6 pb-20 max-w-[1700px] mx-auto"
      >
        <div className="bg-[#12180e] border border-white/15 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 h-[820px]">
          
          {/* LEFT SIDEBAR: Step 3 Template Thumbnails & Snippet Switcher (4.5 Cols) */}
          <div className="lg:col-span-5 xl:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-[#10150d] overflow-hidden">
            
            {/* Sidebar Tab Header */}
            <div className="p-2 border-b border-white/10 bg-black/30 flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {[
                { id: 'templates', label: '1. Templates', icon: LayoutTemplate },
                { id: 'snippets', label: '2. Snippets', icon: Layers },
                { id: 'styles', label: '3. Colors & Styles', icon: Palette },
                { id: 'personas', label: '4. Personas', icon: User },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeSidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      handleUserIntervention();
                      setActiveSidebarTab(tab.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#81ff00] text-black shadow-sm font-extrabold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sidebar Scrollable Body */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[780px] custom-scrollbar space-y-4">
              
              {/* TAB 1: LIVE TEMPLATE LIBRARY THUMBNAILS (Using Step 3 TemplateLibraryGrid) */}
              {activeSidebarTab === 'templates' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <LayoutTemplate className="w-3.5 h-3.5 text-[#81ff00]" />
                      Live Template Thumbnails
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {CANVAS_TEMPLATES.length} Pro Layouts
                    </span>
                  </div>

                  {/* Render the exact Step 3 TemplateLibraryGrid wrapped in CanvasContext
                      so EditableField (ReadOnlyWrapper) can read field values via ctx.cvData */}
                  <CanvasContext.Provider value={{ cvData: canvasData }}>
                    <TemplateLibraryGrid
                      compact
                      activeTemplateId={activeTemplate.id || activeTemplate._id}
                      onSelect={handleSelectTemplate}
                      cvData={canvasData}
                      ReadOnlyWrapper={ReadOnlyWrapper}
                      design={{ accentColor, fontFamily: 'Inter' }}
                    />
                  </CanvasContext.Provider>
                </div>
              )}

              {/* TAB 2: MODULAR SNIPPET SWITCHER */}
              {activeSidebarTab === 'snippets' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-[#81ff00]" />
                      <span>Modular Section Snippets</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Click any snippet to instantly swap that block style into the live resume.
                    </p>
                  </div>

                  {/* Category Grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {SNIPPET_GROUPS.map((grp) => {
                      const Icon = grp.icon;
                      const active = selectedSnippetCategory === grp.id;
                      return (
                        <button
                          key={grp.id}
                          onClick={() => {
                            handleUserIntervention();
                            setSelectedSnippetCategory(grp.id);
                          }}
                          className={`p-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            active
                              ? 'bg-[#81ff00] text-black font-extrabold shadow-sm'
                              : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="truncate">{grp.id}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Snippet Variations */}
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                      <span>{selectedSnippetCategory} Variations:</span>
                      <span className="text-[10px] text-[#81ff00] font-bold">{snippetsInCategory.length} styles</span>
                    </div>

                    <div className="space-y-2">
                      {snippetsInCategory.map((snip) => (
                        <div
                          key={snip.id}
                          className="p-3 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-[#81ff00] transition-colors">
                              {snip.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              ID: {snip.id}
                            </div>
                          </div>

                          <button
                            onClick={() => handleSwapSnippet(snip.id, snip.category)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#81ff00] text-white hover:text-black text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Swap</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STYLES & COLOR PALETTES */}
              {activeSidebarTab === 'styles' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 block">
                      Accent Color Theme:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {ACCENT_COLORS.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            handleUserIntervention();
                            setAccentColor(col.color);
                            setActiveTemplate({
                              ...activeTemplate,
                              globalStyles: {
                                ...activeTemplate.globalStyles,
                                primaryColor: col.color,
                              }
                            });
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            accentColor === col.color
                              ? 'border-[#81ff00] bg-white/10 shadow-sm'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full ${col.bg} border border-white/20`} />
                          <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center">
                            {col.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-bold text-gray-300 block">
                      Section Heading Typography:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'minimal', label: 'Minimalist Clean' },
                        { id: 'standard', label: 'Standard Line' },
                        { id: 'accent', label: 'Accent Border' },
                        { id: 'lines', label: 'Double Lines' },
                        { id: 'designer', label: 'Designer Modern' },
                        { id: 'harvard', label: 'Harvard Academic' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            handleUserIntervention();
                            setActiveTemplate({
                              ...activeTemplate,
                              titleStyle: st.id,
                            });
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                            activeTemplate.titleStyle === st.id
                              ? 'border-[#81ff00] bg-[#81ff00]/10 text-[#81ff00]'
                              : 'border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PERSONAS & ATS VERIFICATION */}
              {activeSidebarTab === 'personas' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 block">
                      Choose Persona Profile:
                    </label>
                    <div className="space-y-2">
                      {Object.entries(MOCK_PERSONAS).map(([key, p]) => (
                        <button
                          key={key}
                          onClick={() => {
                            handleUserIntervention();
                            setActivePersonaKey(key);
                            setCvData(p.data);
                          }}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            activePersonaKey === key
                              ? 'border-[#81ff00] bg-[#81ff00]/10 text-white'
                              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{p.icon}</span>
                            <div>
                              <div className="text-xs font-bold">{p.label}</div>
                              <div className="text-[10px] text-gray-400">{p.role}</div>
                            </div>
                          </div>
                          {activePersonaKey === key && (
                            <Check className="w-4 h-4 text-[#81ff00]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#81ff00]/10 border border-[#81ff00]/30 text-center space-y-2 mt-4">
                    <div className="w-10 h-10 rounded-full bg-[#81ff00]/20 text-[#81ff00] font-black text-sm flex items-center justify-center mx-auto">
                      96%
                    </div>
                    <div className="text-xs font-bold text-white">ATS Compatibility Verified</div>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      Greenhouse, Workday & Lever validated semantic tokens.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA in Sidebar */}
            <div className="p-3 border-t border-white/10 bg-black/40">
              <button
                onClick={() => router.push(`/welcome?template=${activeTemplate.id || activeTemplate._id}`)}
                className="w-full py-3 rounded-2xl bg-[#81ff00] hover:bg-[#6ed600] text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,255,0,0.25)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Build Resume With This Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT VIEWPORT: Live Step 3 CV Canvas Engine with Section Toolbars (7.5 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-[#0b0e09] relative overflow-hidden">
            
            {/* Canvas Engine Toolbar */}
            <div className="h-14 border-b border-white/10 bg-[#10150d] px-4 flex items-center justify-between gap-3 shrink-0">
              {/* Template Name Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white">
                  {activeTemplate.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#81ff00]/15 text-[#81ff00] border border-[#81ff00]/30">
                  {activeTemplate.type}
                </span>
                {isAutoDemo && (
                  <span className="text-[11px] text-gray-400 ml-2 hidden sm:inline-block">
                    Showing: <strong className="text-white">{AUTO_TOUR_STEPS[tourIndex]?.desc}</strong>
                  </span>
                )}
              </div>

              {/* Viewport Zoom & Theme Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCanvasTheme(t => t === 'light' ? 'dark' : 'light')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold mr-2 transition-colors cursor-pointer"
                >
                  {canvasTheme === 'light' ? '☀️ Paper' : '🌙 Dark'}
                </button>

                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-gray-400 min-w-[38px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.3, Number((z + 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(0.92)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors ml-0.5 cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real Step 3 Canvas Viewport */}
            <div className="flex-1 overflow-auto bg-[#0b0e09]">
              <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
                {/*
                  Layout trick: transform: scale() doesn't change layout space.
                  So we give the OUTER div explicit scaled dimensions (794 * zoom, 1123 * zoom),
                  then position the INNER full-size canvas absolutely within it.
                  This way the flex container measures the correct scaled footprint.
                */}
                <div
                  style={{
                    width: `${Math.round(794 * zoomLevel)}px`,
                    height: `${Math.round(1123 * zoomLevel)}px`,
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'width 0.15s ease-out, height 0.15s ease-out',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '794px',
                      transformOrigin: 'top left',
                      transform: `scale(${zoomLevel})`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="shadow-2xl rounded-lg overflow-hidden border border-white/15 bg-white"
                  >
                    <CVBuilderProAdapter
                      cvData={cvData}
                      template={activeTemplate}
                      theme={canvasTheme}
                      readOnly={false}
                      onDataChange={(updated) => {
                        handleUserIntervention();
                        setCvData(updated);
                      }}
                      onTemplateChange={(updatedTpl) => {
                        handleUserIntervention();
                        setActiveTemplate(updatedTpl);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom floating hint */}
            <div className="p-3 border-t border-white/10 bg-[#10150d]/95 backdrop-blur-md flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#81ff00] animate-pulse" />
                <span>Hover any block on canvas to see section toolbars, drag handles & inline edit mode.</span>
              </div>
              <button
                onClick={() => router.push('/welcome')}
                className="text-[#81ff00] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Launch Full App</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer from Landing Page */}
      <Footer />
    </div>
  );
}
