'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES } from '@/components/cv-builder-pro/registry';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { initialData } from '@/lib/templates/canvas-initial-data';

interface TemplateSelectorProps {
    selectedTemplate: any;
    onTemplateSelect: (template: any) => void;
    cvData?: any;
}

// ATS scoring based on layout type
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

const getTemplateATSScoreCap = (template: any): number => {
    return TEMPLATE_ATS_SCORES[template.type] || 80;
};

const getATSFriendliness = (scoreCap: number): { label: string; color: string; bgColor: string } => {
    if (scoreCap >= 95) return { label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-500/20' };
    if (scoreCap >= 85) return { label: 'Good', color: 'text-lime-500', bgColor: 'bg-lime-500/20' };
    if (scoreCap >= 75) return { label: 'Fair', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    return { label: 'Low', color: 'text-red-500', bgColor: 'bg-red-500/20' };
};

export default function TemplateSelector({
    selectedTemplate,
    onTemplateSelect,
    cvData
}: TemplateSelectorProps) {
    const isDarkUI = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const ReadOnlyWrapper = useMemo(() => function Editable(props: any) {
        return <EditableField {...props} data={cvData || initialData} readOnly={true} />;
    }, [cvData]);

    return (
        <div className="space-y-8 bg-[#141414] p-4 rounded-xl relative">
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
                .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
                .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
                .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
                .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
              `}} />

            {TEMPLATE_CATEGORIES.map(cat => {
                const catTemplates = CANVAS_TEMPLATES.filter(tpl => cat.types.includes(tpl.type));
                if (catTemplates.length === 0) return null;

                return (
                    <div key={cat.id} className="relative">
                        <div className={`py-3 mb-4 flex items-center gap-2 border-b border-[#333] text-white`}>
                            <span className="text-[#1b814a] w-5 h-5">{cat.icon}</span>
                            <h3 className="font-bold text-sm tracking-wide">{cat.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {catTemplates.map((template) => {
                                const isSelected = selectedTemplate?.id === template.id;
                                const atsScore = getTemplateATSScoreCap(template);
                                const atsFriendliness = getATSFriendliness(atsScore);

                                return (
                                    <motion.button
                                        key={template.id}
                                        onClick={() => onTemplateSelect(template)}
                                        className={`relative rounded-xl border cursor-pointer transition-all text-left overflow-hidden flex flex-col bg-[#111] ${isSelected
                                            ? 'border-[#1b814a] shadow-[0_0_0_2px_rgba(27,129,74,0.5)] ring-1 ring-[#1b814a]'
                                            : 'border-[#333] hover:border-gray-500'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* Template Info */}
                                        <div className={`p-3 bg-[#111] border-b z-10 shrink-0 ${isSelected ? 'border-[#1b814a]' : 'border-[#333]'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-bold text-sm text-gray-100 truncate">
                                                    {template.name}
                                                </h3>
                                                {isSelected && <span className="bg-[#1b814a]/30 text-[#1b814a] text-[10px] px-2 py-0.5 rounded font-bold tracking-wide uppercase ml-2">ACTIVE</span>}
                                            </div>

                                            {/* ATS Score */}
                                            <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${atsFriendliness.bgColor} ${atsFriendliness.color}`}>
                                                <Shield className="w-2.5 h-2.5" />
                                                ATS: {atsFriendliness.label}
                                            </div>
                                        </div>

                                        {/* Template Canvas Preview */}
                                        <div className="relative w-full aspect-[1/1.414] bg-[#141414] overflow-hidden flex flex-1 items-center justify-center pointer-events-none py-8 px-4 text-gray-900">
                                            <div className="relative w-full max-w-[215px] aspect-[1/1.414] bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden rounded-md ring-1 ring-white/10 mx-auto flex justify-center items-start" style={{ containerType: 'inline-size' }}>
                                                <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left" style={{ transform: 'scale(calc(100cqi / 794))' }}>
                                                    <StaticLayoutRenderer template={template} cvData={cvData || initialData} ReadOnlyWrapper={ReadOnlyWrapper} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
