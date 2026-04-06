'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SNIPPETS, TITLE_STYLES, CANVAS_TEMPLATES, TEMPLATE_CATEGORIES } from '@/components/cv-builder-pro/registry';
import { EditableField, StaticLayoutRenderer } from '@/components/cv-builder-pro/components/CoreUI';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { Sparkles, Blocks, LayoutTemplate } from 'lucide-react';

const FLOAT_POSITIONS = [
  { x: -500, y: -250, rotation: -6, delay: 0.1, z: 10 },
  { x: 500, y: -200, rotation: 5, delay: 0.15, z: 10 },
  { x: -550, y: 50, rotation: -3, delay: 0.2, z: 20 },
  { x: 550, y: 100, rotation: 4, delay: 0.25, z: 20 },
  { x: -400, y: 350, rotation: -5, delay: 0.3, z: 30 },
  { x: 400, y: 400, rotation: 6, delay: 0.35, z: 30 },
  { x: -450, y: -100, rotation: 2, delay: 0.4, z: 15 },
  { x: 450, y: 250, rotation: -4, delay: 0.45, z: 25 },
  { x: -250, y: -350, rotation: -2, delay: 0.5, z: 5 },
  { x: 250, y: 450, rotation: 3, delay: 0.55, z: 35 }
];

const TARGET_TEMPLATES = [
  'tpl-1', 'tpl-6', 'tpl-7', 'tpl-8', 'tpl-14', 
  'tpl-2', 'tpl-5', 
  'tpl-10', 'tpl-11', 'tpl-12',
  'tpl-3', 'tpl-4', 'tpl-9', 'tpl-15',
  'tpl-13'
];

const PremiumTemplates = () => {
  const router = useRouter();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const [templateIndex, setTemplateIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTemplateIndex((prev) => (prev + 1) % TARGET_TEMPLATES.length);
    }, 5000); // Give enough time for reading and animations
    return () => clearInterval(interval);
  }, []);

  const activeTemplate = CANVAS_TEMPLATES.find(t => t.id === TARGET_TEMPLATES[templateIndex]) || CANVAS_TEMPLATES[0];

  // Extract unique snippet IDs from the active template's zones
  const activeSnippets = useMemo(() => {
    const ids = Object.values(activeTemplate.zones).flat();
    return Array.from(new Set(ids)).slice(0, 10); // max 10 to fit positions
  }, [activeTemplate]);

  // Memoize the editable field so it behaves as readOnly inside the showcase
  const ReadOnlyWrapper = useMemo(() => function Editable(props: any) { 
    return <EditableField {...props} data={initialData} readOnly={true} />; 
  }, []);

  return (
    <section id="premium-templates" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#141810] py-32" ref={ref}>
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#603a86]/20 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-40 text-center mb-16 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 mb-6">
          <Blocks className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide uppercase">Template Library</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
          Select a foundation layout. <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">All snippets can be fully customized inside.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-400 text-lg max-w-2xl mx-auto">
          From traditional top-to-bottom flow to modern sidebar aesthetics. We have everything tailored for ATS compatibility and human readability.
        </motion.p>
      </div>

      {/* Showcase Canvas Container */}
      <div className="relative w-full max-w-6xl mx-auto h-[800px] flex items-center justify-center pointer-events-none mt-10">
        
        {/* Floating Snippets (Blast Effect) */}
        {activeSnippets.map((snippetId, i) => {
          const SnippetComponent = SNIPPETS[snippetId as string];
          if (!SnippetComponent) return null;

          const pos = FLOAT_POSITIONS[i % FLOAT_POSITIONS.length];
          const isSidebar = activeTemplate.zones?.sidebar?.includes(snippetId as string) || 
                            activeTemplate.zones?.left?.includes(snippetId as string) || 
                            activeTemplate.zones?.right?.includes(snippetId as string);
          
          const styleKey = isSidebar && activeTemplate.sidebarTitleStyle 
            ? activeTemplate.sidebarTitleStyle 
            : activeTemplate.titleStyle;

          const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
          const isDarkTarget = activeTemplate.type.includes('dark') && isSidebar;

          const Title = ({ titleKey }: any) => (
            <TitleRenderer isDark={isDarkTarget}>
              <ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap />
            </TitleRenderer>
          );

          return (
            <AnimatePresence key={`${activeTemplate.id}-${snippetId}`} mode="wait">
              <motion.div
                initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 0, rotate: 0 }}
                animate={isInView ? { 
                  x: `calc(-50% + ${pos.x}px)`, 
                  y: `calc(-50% + ${pos.y}px)`, 
                  scale: 0.65, 
                  opacity: 0.9, 
                  rotate: pos.rotation 
                } : {}}
                exit={{ x: '-50%', y: '-50%', scale: 0, opacity: 0, rotate: 0 }}
                transition={{ 
                  delay: pos.delay, 
                  type: 'spring', 
                  stiffness: 60, 
                  damping: 12,
                  mass: 1 
                }}
                style={{ zIndex: pos.z, '--cv-font': 'Inter', '--cv-base-size': '12px', '--cv-spacing': 1.0, '--cv-accent': '#22c55e' } as React.CSSProperties}
                className={`absolute top-1/2 left-1/2 w-[400px] ${isDarkTarget ? 'bg-[#1a1a1a] border-slate-700' : 'bg-white border-white/20'} rounded-xl shadow-2xl overflow-hidden cv-document text-gray-900 border-4 ring-1 ring-black/5`}
              >
                {/* Highlight overlay for snippets to emphasize modularity */}
                <div className={`absolute inset-0 ${isDarkTarget ? 'bg-emerald-500/5' : 'bg-lime-400/5'} z-0`} />
                <div className={`absolute left-2 top-2 z-10 ${isDarkTarget ? 'text-emerald-400 bg-[#222] border-slate-600' : 'text-lime-500 bg-lime-50 border-lime-100'} rounded p-1.5 shadow-sm border flex items-center gap-1.5`}>
                  <LayoutTemplate className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{SnippetComponent.name}</span>
                </div>
                <div className="p-6 pt-12 relative z-10 pointer-events-none">
                  <SnippetComponent.render 
                    data={initialData} 
                    Editable={ReadOnlyWrapper} 
                    zoneId={isSidebar ? 'sidebar' : 'main'} 
                    isDark={isDarkTarget} 
                    Title={Title} 
                    moveEntry={() => {}} 
                    deleteEntry={() => {}} 
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}

        {/* Center Main Resume Canvas */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={isInView ? { scale: 1, opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-50 w-[550px] h-[777px] bg-white rounded-xl shadow-[0_0_80px_rgba(129,255,0,0.15)] overflow-hidden border border-white/20 ring-1 ring-black/50"
        >
          {/* Top Navbar Simulation */}
          <div className="absolute top-0 inset-x-0 h-10 bg-gray-100 border-b flex items-center px-4 gap-2 z-50">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-500" /> Live Preview
            </div>
          </div>

          <div className="absolute inset-0 pt-10 overflow-hidden bg-gray-50 flex justify-center items-start pointer-events-none">
            {/* The Actual Rendered CV */}
            <div className="relative w-[794px] h-[1123px] origin-top-left shadow-sm bg-white" style={{ transform: 'scale(0.65)', marginTop: '20px', marginLeft: '16px' }}>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTemplate.id}
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 w-full h-full cv-document text-gray-900 bg-white"
                >
                  <StaticLayoutRenderer 
                    template={activeTemplate} 
                    cvData={initialData} 
                    ReadOnlyWrapper={ReadOnlyWrapper} 
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.8 }} className="relative z-50 mt-16 text-center">
        <button onClick={() => router.push('/sign-up')} className="bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-bold text-xl px-12 py-5 rounded-full transition-all shadow-[0_0_40px_rgba(129,255,0,0.3)] hover:shadow-[0_0_60px_rgba(129,255,0,0.5)] hover:-translate-y-1 inline-flex items-center gap-3">
          Start Building Free <Sparkles className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Global CSS required to render snippets properly in landing page */}
      <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
          
          :root {
            --cv-font: 'Inter';
            --cv-base-size: 12px;
            --cv-spacing: 1.0;
            --cv-accent: #22c55e;
          }

          .cv-document { font-family: var(--cv-font), sans-serif; color: #111827; font-size: var(--cv-base-size); }
          .cv-document .text-gray-900 { color: #111827 !important; }
          .cv-document .text-gray-800 { color: #1f2937 !important; }
          .cv-document .text-gray-700 { color: #374151 !important; }
          .cv-document .text-gray-600 { color: #4b5563 !important; }
          .cv-document .text-gray-500 { color: #6b7280 !important; }
          .cv-document .text-gray-400 { color: #9ca3af !important; }
          .cv-document .text-gray-300 { color: #d1d5db !important; }
          .cv-document .text-gray-200 { color: #e5e7eb !important; }
          .cv-document .text-gray-100 { color: #f3f4f6 !important; }
          .cv-document .text-white { color: #ffffff !important; }
          .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
        .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
        .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
        .cv-prose li { margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }
        .cv-item-avoid { page-break-inside: avoid; break-inside: avoid; }
        .cv-accent-text { color: var(--cv-accent) !important; }
        .cv-accent-bg { background-color: var(--cv-accent) !important; }
        .cv-accent-border { border-color: var(--cv-accent) !important; }
      `}} />
    </section>
  );
};

export default PremiumTemplates;