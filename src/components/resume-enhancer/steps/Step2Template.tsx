'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES } from '@/components/cv-builder-pro/registry';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { initialData } from '@/lib/templates/canvas-initial-data';

interface Step2TemplateProps {
  onComplete: () => void;
}

// Template ATS scoring based on layout type
const TEMPLATE_ATS_SCORES: Record<string, number> = {
  '1-col': 100,
  '2-col': 85,
  'sidebar-left': 75,
  'sidebar-right': 75,
  'sidebar-left-dark': 70,
  'sidebar-right-dark': 70,
  'top-sidebar-left': 75,
  'top-sidebar-right': 75,
  'hybrid-split': 80
};

function getTemplateATSScoreCap(template: any): number {
  return TEMPLATE_ATS_SCORES[template.type] ?? 80;
}

function getATSFriendliness(scoreCap: number): { label: string; color: string; bgColor: string } {
  if (scoreCap >= 95) return { label: 'ATS Excellent', color: 'text-green-500', bgColor: 'bg-green-500/10' };
  if (scoreCap >= 80) return { label: 'ATS Good', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  if (scoreCap >= 70) return { label: 'ATS Limited', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
  return { label: 'ATS Poor', color: 'text-red-500', bgColor: 'bg-red-500/10' };
}

export default function Step2Template({ onComplete }: Step2TemplateProps) {
  const { state, setTemplate, setAtsScoreCap, dispatch } = useResumeEnhancer();
  const [showATSWarning, setShowATSWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);

  const isJourneyCV = state.cvType === 'journey';
  const isDarkUI = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const ReadOnlyWrapper = useMemo(() => function Editable(props: any) {
    return <EditableField {...props} data={initialData} readOnly={true} />;
  }, []);

  const handleTemplateSelect = (template: any) => {
    const scoreCap = getTemplateATSScoreCap(template);
    
    if (isJourneyCV && scoreCap < 80) {
      setPendingTemplate(template);
      setShowATSWarning(true);
      return;
    }
    
    setTemplate(template);
    setAtsScoreCap(scoreCap);
    dispatch({ type: 'SET_ATS_SCORE_CAP', payload: scoreCap });
    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: template });
    
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const confirmLowATSTemplate = () => {
    if (pendingTemplate) {
      const scoreCap = getTemplateATSScoreCap(pendingTemplate);
      setTemplate(pendingTemplate);
      setAtsScoreCap(scoreCap);
      dispatch({ type: 'SET_ATS_SCORE_CAP', payload: scoreCap });
      dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: pendingTemplate });
      setShowATSWarning(false);
      setPendingTemplate(null);
      
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  const cancelLowATSTemplate = () => {
    setShowATSWarning(false);
    setPendingTemplate(null);
  };

  return (
    <div className="w-full h-[calc(100vh-48px)] min-h-0 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[color:var(--text-primary)] mb-4">Choose Your Layout</h2>
          <p className="text-lg text-[color:var(--text-secondary)]">Select a foundation layout. All snippets can be fully customized inside.</p>
          
          {isJourneyCV && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">For job applications, choose templates marked "ATS Excellent" for best results</span>
            </motion.div>
          )}
        </motion.div>

        <div className="space-y-12">
          {TEMPLATE_CATEGORIES.map(cat => {
            const catTemplates = CANVAS_TEMPLATES.filter(tpl => cat.types.includes(tpl.type));
            if (catTemplates.length === 0) return null;

            return (
              <div key={cat.id} className="relative">
                <div className={`sticky top-0 z-10 backdrop-blur-md py-4 mb-6 flex items-center gap-3 border-b ${isDarkUI ? 'border-[#222] bg-[#1a230f]/80 text-white' : 'border-gray-200 bg-gray-50/80 text-gray-900'}`}>
                  <span className="text-emerald-500">{cat.icon}</span>
                  <h2 className="text-xl font-bold tracking-tight">{cat.name}</h2>
                  <span className={`text-sm font-medium ${isDarkUI ? 'text-gray-400' : 'text-gray-500'}`}>— {cat.desc}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {catTemplates.map(tpl => {
                    const isSelected = state.selectedTemplate?.id === tpl.id;
                    const atsScore = getTemplateATSScoreCap(tpl);
                    const atsInfo = getATSFriendliness(atsScore);

                    return (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleTemplateSelect(tpl)}
                        className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl ${isDarkUI ? 'bg-[#141414]' : 'bg-white'} ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/20' : (isDarkUI ? 'border-[#333] hover:border-emerald-500/50' : 'border-gray-200 hover:border-emerald-500/50')}`}
                      >
                        <div className={`p-3 border-b flex flex-col gap-2 z-10 shrink-0 ${isDarkUI ? 'bg-[#111] border-[#2a2a2a]' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between items-center">
                            <div className={`font-bold text-sm tracking-wide ${isDarkUI ? 'text-gray-100' : 'text-gray-900'}`}>{tpl.name}</div>
                            {isSelected && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded font-bold tracking-wide uppercase">Active</span>}
                          </div>
                          
                          {isJourneyCV && (
                            <div className={`inline-flex items-center gap-1 w-fit text-xs px-2 py-0.5 rounded-full ${atsInfo.bgColor} ${atsInfo.color}`}>
                              <Shield className="w-3 h-3" />
                              {atsInfo.label}
                            </div>
                          )}
                        </div>
                        
                        <div className={`relative w-full flex justify-center items-center p-6 flex-1 overflow-hidden pointer-events-none ${isDarkUI ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                          <div className="relative w-[200px] h-[283px] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300">
                            <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left" style={{ transform: 'scale(0.2518)' }}>
                              <StaticLayoutRenderer template={tpl} cvData={initialData} ReadOnlyWrapper={ReadOnlyWrapper} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {showATSWarning && pendingTemplate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={cancelLowATSTemplate}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/10 rounded-lg"><AlertTriangle className="w-6 h-6 text-yellow-500" /></div>
                  <h3 className="text-xl font-semibold text-[color:var(--text-primary)]">Limited ATS Compatibility</h3>
                </div>
                <p className="text-[color:var(--text-secondary)] mb-4"><strong>{pendingTemplate.name}</strong> is a creative template with limited ATS parsing support.</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[color:var(--text-secondary)]">Maximum ATS Score:</span>
                    <span className="text-lg font-bold text-yellow-500">{getTemplateATSScoreCap(pendingTemplate)}%</span>
                  </div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Your CV's ATS optimization score will be capped at this level regardless of content quality.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={cancelLowATSTemplate} className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-xl font-medium transition-colors">Choose Another</button>
                  <button onClick={confirmLowATSTemplate} className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-medium transition-colors">Use Anyway</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {state.selectedTemplate && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-12 mb-8">
            <button onClick={onComplete} className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3">
              Continue with {state.selectedTemplate.name} <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </div>
      
      {/* Required CSS for CV Preview */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        :root {
          --cv-font: 'Inter';
          --cv-base-size: 12px;
          --cv-spacing: 1.0;
          --cv-accent: #22c55e;
        }
        .cv-document { font-family: var(--cv-font), sans-serif; color: #1f2937; font-size: var(--cv-base-size); }
        .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
        .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
        .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
        .cv-document .cv-body, .cv-document .cv-prose p { text-align: justify; }
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
      `}} />
    </div>
  );
}
