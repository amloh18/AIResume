'use client';

/**
 * InteractiveTemplateShowcase -- landing page section that shows live
 * snippet-based CV previews with interactive template switching.
 * Gives users a taste of how the WYSIWYG template system works in CVCircle.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Palette, Layout, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CANVAS_TEMPLATES } from '@/components/resume-enhancer/canvas/snippets';
import { DEFAULT_DESIGN_VARS, INITIAL_DRAG_STATE } from '@/components/resume-enhancer/canvas/snippetTypes';
import type { SnippetData, CanvasTemplate, DesignVars, LayoutType, Zone } from '@/components/resume-enhancer/canvas/snippetTypes';
import CanvasLayout from '@/components/resume-enhancer/canvas/CanvasLayout';
import '@/styles/cv-canvas-editor.css';

// Sample CV data for the showcase
const SAMPLE_DATA: SnippetData = {
  basics: {
    name: 'Sarah Chen',
    title: 'Senior Product Designer',
    email: 'sarah@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    website: 'sarahchen.design',
    summary: 'Creative product designer with 8+ years of experience crafting user-centered digital experiences. Led design systems at two unicorn startups, improving user engagement by 40%.',
    avatar: '',
    showAvatar: false,
  },
  experience: [
    {
      id: 'exp1',
      company: 'TechFlow Inc.',
      role: 'Senior Product Designer',
      date: '2021 - Present',
      description: '<ul><li>Led redesign of core product, increasing user retention by 35%</li><li>Built and maintained design system used across 12 product teams</li><li>Mentored 4 junior designers through structured growth program</li></ul>',
    },
    {
      id: 'exp2',
      company: 'StartupXYZ',
      role: 'Product Designer',
      date: '2018 - 2021',
      description: '<ul><li>Designed end-to-end user flows for mobile app with 2M+ users</li><li>Conducted 50+ user interviews to inform product decisions</li></ul>',
    },
  ],
  education: [
    {
      id: 'edu1',
      institution: 'Stanford University',
      degree: 'M.S. in Human-Computer Interaction',
      date: '2016 - 2018',
      description: '',
    },
  ],
  projects: [
    {
      id: 'proj1',
      name: 'DesignKit Open Source',
      role: 'React, TypeScript, Figma API',
      date: '2023',
      description: 'Open-source design token management tool with 2.5k GitHub stars',
    },
  ],
  certifications: [
    { id: 'cert1', name: 'Google UX Design Certificate', issuer: 'Google', date: '2023' },
  ],
  skills: {
    languages: 'Figma, Sketch, Adobe XD, Framer',
    frameworks: 'React, TypeScript, Tailwind CSS',
    tools: 'Jira, Notion, Miro, UserTesting',
  },
  sectionTitles: {
    summary: 'About Me',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certifications: 'Certifications',
    languages: 'Languages',
    volunteer: 'Volunteer',
    awards: 'Awards',
    publications: 'Publications',
    interests: 'Interests',
    references: 'References',
  },
};

const ACCENT_COLORS = [
  { color: '#2563eb', label: 'Blue' },
  { color: '#0d9488', label: 'Teal' },
  { color: '#7c3aed', label: 'Purple' },
  { color: '#dc2626', label: 'Red' },
  { color: '#16a34a', label: 'Green' },
  { color: '#ea580c', label: 'Orange' },
];

export default function InteractiveTemplateShowcase() {
  const router = useRouter();
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const [accentColor, setAccentColor] = useState(CANVAS_TEMPLATES[0].accentColor);

  const activeTemplate = CANVAS_TEMPLATES[activeTemplateIndex];

  const designVars = useMemo<DesignVars>(
    () => ({
      ...DEFAULT_DESIGN_VARS,
      accentColor,
    }),
    [accentColor],
  );

  const cssVars = useMemo(
    () =>
      ({
        '--cv-font': designVars.fontFamily,
        '--cv-font-size': `${designVars.fontSize}pt`,
        '--cv-line-height': `${designVars.lineSpacing}`,
        '--cv-margin': `${designVars.pageMargin}mm`,
        '--cv-accent': designVars.accentColor,
        '--cv-header-size': `${designVars.headerFontSize}pt`,
        '--cv-section-size': `${designVars.sectionFontSize}pt`,
      }) as React.CSSProperties,
    [designVars],
  );

  const zones = useMemo<Zone[]>(
    () =>
      activeTemplate.zones.map((z) => ({
        ...z,
        snippets: z.snippets.map((s) => ({ ...s })),
      })),
    [activeTemplate],
  );

  // No-op handlers for read-only display
  const noop = () => {};
  const noopField = (_p: string, _v: string) => {};
  const noopDrag = (_e: React.DragEvent, _z: string, _i: number) => {};

  const handlePrev = useCallback(() => {
    setActiveTemplateIndex((i) => (i === 0 ? CANVAS_TEMPLATES.length - 1 : i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveTemplateIndex((i) => (i + 1) % CANVAS_TEMPLATES.length);
  }, []);

  return (
    <section
      id="premium-templates"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#141810]"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] transition-colors duration-700"
          style={{ backgroundColor: `${accentColor}20` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 tablet:px-6 desktop:px-8 py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="text-lime-400 uppercase tracking-wider text-xs font-semibold mb-4">
            FLEXIBLE TEMPLATE SYSTEM
          </div>
          <h2 className="text-3xl tablet:text-4xl desktop:text-5xl font-bold text-white mb-4">
            One CV, Endless Layouts
          </h2>
          <p className="text-white/60 text-base tablet:text-lg max-w-2xl mx-auto">
            Switch between layouts instantly. Every section is a snippet you can rearrange, restyle, or replace -- your content stays intact.
          </p>
        </motion.div>

        <div className="flex flex-col desktop:flex-row gap-8 items-start">
          {/* Controls Panel */}
          <motion.div
            className="w-full desktop:w-80 flex-shrink-0 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Template Selector */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={16} className="text-lime-400" />
                <h3 className="text-sm font-semibold text-white">Layout</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CANVAS_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      setActiveTemplateIndex(i);
                      setAccentColor(tmpl.accentColor);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      i === activeTemplateIndex
                        ? 'border-lime-400 bg-lime-400/10 text-white'
                        : 'border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-tight block">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={16} className="text-lime-400" />
                <h3 className="text-sm font-semibold text-white">Accent Color</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setAccentColor(c.color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      accentColor === c.color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Feature badges */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-lime-400" />
                <h3 className="text-sm font-semibold text-white">Snippet Features</h3>
              </div>
              <div className="space-y-2 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  Drag-and-drop section reordering
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  Inline WYSIWYG text editing
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  Multiple snippet variants per section
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  AI-powered content suggestions
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  Real-time ATS score feedback
                </div>
              </div>
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => router.push('/sign-up')}
              className="w-full bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold px-6 py-3.5 rounded-full transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Try It Free
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>

          {/* Live Preview */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              {/* Navigation arrows */}
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm border border-white/10 text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm border border-white/10 text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>

              {/* Template name badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTemplate.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-center mb-4"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium">
                    <Layout size={14} />
                    {activeTemplate.name}
                    <span className="text-white/40 text-xs capitalize">-- {activeTemplate.category}</span>
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* CV Preview */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTemplate.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gray-900/50 rounded-2xl border border-white/10 p-6 overflow-hidden"
                >
                  <div
                    className="mx-auto snippet-canvas-root"
                    style={{
                      width: 794,
                      transform: 'scale(0.55)',
                      transformOrigin: 'top center',
                      height: 620,
                      ...cssVars,
                    }}
                  >
                    <div
                      className="cv-document bg-white rounded-sm shadow-xl"
                      style={{
                        fontFamily: 'var(--cv-font)',
                        fontSize: 'var(--cv-font-size)',
                        lineHeight: 'var(--cv-line-height)',
                        padding: 'var(--cv-margin)',
                        minHeight: 1122,
                      }}
                    >
                      <CanvasLayout
                        layout={activeTemplate.layout}
                        zones={zones}
                        data={SAMPLE_DATA}
                        designVars={designVars}
                        isEditing={false}
                        dragState={INITIAL_DRAG_STATE}
                        onFieldChange={noopField}
                        onSnippetMoveUp={noop as any}
                        onSnippetMoveDown={noop as any}
                        onSnippetDelete={noop as any}
                        onSnippetReplace={noop as any}
                        onSnippetAddBelow={noop as any}
                        onAddSection={noop as any}
                        onDragStart={noopDrag}
                        onDragEnd={noop}
                        onDragOver={noopDrag}
                        onDrop={noopDrag}
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
