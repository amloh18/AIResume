'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Search } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES } from '@/components/cv-builder-pro/registry';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { chipState } from '@/components/ui/chip-styles';

interface TemplateSelectorProps {
    selectedTemplate: any;
    onTemplateSelect: (template: any) => void;
    cvData?: any;
}

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

export default function TemplateSelector({
    selectedTemplate,
    onTemplateSelect,
    cvData
}: TemplateSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [hoveredTemplate, setHoveredTemplate] = useState<any | null>(null);

    const ReadOnlyWrapper = useMemo(() => function Editable(props: any) {
        return <EditableField {...props} data={cvData || initialData} readOnly={true} />;
    }, [cvData]);

    const categories = ['all', ...TEMPLATE_CATEGORIES.map(c => c.id)];
    
    const templates = selectedCategory === 'all' 
        ? CANVAS_TEMPLATES 
        : CANVAS_TEMPLATES.filter(tpl => {
            const cat = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
            return cat?.types.includes(tpl.type);
        });

    const displayTemplate = hoveredTemplate || selectedTemplate || CANVAS_TEMPLATES[0];

    return (
        <div className="flex h-full min-h-[600px] w-full bg-white dark:bg-[#141810]">
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

            {/* Left: Template List */}
            <div className="w-[320px] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-gray-50 dark:bg-[#1a1f14]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <div className="flex gap-2 flex-wrap">
                        {categories.map((cat) => {
                            const catObj = TEMPLATE_CATEGORIES.find(c => c.id === cat);
                            const label = cat === 'all' ? 'All Templates' : catObj?.name || cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    aria-pressed={selectedCategory === cat}
                                    className={`${chipState(selectedCategory === cat ? 'active' : 'idle', 'lg')} font-bold`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {templates.map((template) => {
                        const isSelected = selectedTemplate?.id === template.id;
                        const isHovered = hoveredTemplate?.id === template.id;
                        const atsScore = getTemplateATSScoreCap(template);
                        
                        return (
                            <button
                                key={template.id}
                                onClick={() => onTemplateSelect(template)}
                                onMouseEnter={() => setHoveredTemplate(template)}
                                onMouseLeave={() => setHoveredTemplate(null)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    isSelected 
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500' 
                                        : isHovered 
                                            ? 'border-purple-300 dark:border-purple-700 bg-white dark:bg-[#1a230f]' 
                                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141810]'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold text-sm ${isSelected ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                                        {template.name}
                                    </h4>
                                    {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                                        {template.type}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${atsScore >= 85 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                        <Shield className="w-2.5 h-2.5" /> ATS: {atsScore >= 85 ? 'High' : 'Medium'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: Preview Area */}
            <div className="flex-1 flex flex-col bg-[#f9fafb] dark:bg-[#0a0c08] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center p-8 overflow-auto custom-scrollbar">
                    <div className="relative w-full max-w-[600px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] mx-auto flex justify-center items-start" style={{ containerType: 'inline-size' }}>
                        <div className="relative w-full aspect-[1/1.414] overflow-hidden bg-white">
                            <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left" style={{ transform: 'scale(calc(100cqi / 794))' }}>
                                <StaticLayoutRenderer template={displayTemplate} cvData={cvData || initialData} ReadOnlyWrapper={ReadOnlyWrapper} />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Floating action overlay when hovered/selected */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-[#141810] px-6 py-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 flex items-center gap-4 z-10">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {displayTemplate.name}
                    </span>
                    <button 
                        onClick={() => onTemplateSelect(displayTemplate)}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                        Apply Template
                    </button>
                </div>
            </div>
        </div>
    );
}
