'use client';

import React from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import {
  ClassicHeader,
  ModernHeader,
  MinimalHeader,
  TypographicHeader,
  ColumnSplitHeader,
  AccentBannerHeader,
  CreativeEdgeHeader,
  ExecutiveSlateHeader,
} from '@/components/cover-letter-engine/snippets/headers/HeaderSnippets';
import type { CoverLetterTemplateType } from '@/components/resume-enhancer/components/CoverLetterCanvas';

interface CoverLetterHeaderStylesProps {
  templateType: CoverLetterTemplateType;
  onSelect: (type: CoverLetterTemplateType) => void;
  onClose: () => void;
  cvData: any;
  jobData: any;
}

const HEADER_STYLES: {
  id: CoverLetterTemplateType;
  name: string;
  desc: string;
  Component: React.ComponentType<any>;
}[] = [
  { id: 'modern', name: 'Modern', desc: 'Professional, lime accents', Component: ModernHeader },
  { id: 'classic', name: 'Classic', desc: 'Traditional serif style', Component: ClassicHeader },
  { id: 'minimal', name: 'Minimal', desc: 'Clean and simple', Component: MinimalHeader },
  { id: 'typographic', name: 'Typographic', desc: 'Bold display', Component: TypographicHeader },
  { id: 'column-split', name: 'Column Split', desc: 'Side-by-side header', Component: ColumnSplitHeader },
  { id: 'accent-banner', name: 'Accent Banner', desc: 'High-impact banner', Component: AccentBannerHeader },
  { id: 'creative-edge', name: 'Creative Edge', desc: 'Chic accent style', Component: CreativeEdgeHeader },
  { id: 'executive-slate', name: 'Executive Slate', desc: 'Sleek executive layout', Component: ExecutiveSlateHeader },
];

const stripHtml = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';

/**
 * Header-style picker for the cover letter, rendered into the Step-3 utility
 * column when the Template tile is open on the letter document.
 */
const CoverLetterHeaderStyles: React.FC<CoverLetterHeaderStylesProps> = ({
  templateType,
  onSelect,
  onClose,
  cvData,
  jobData,
}) => {
  const basics = cvData?.basics || {};
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const headerProps = {
    name: stripHtml(basics.name) || 'Your Name',
    email: stripHtml(basics.email) || 'email@example.com',
    phone: stripHtml(basics.phone),
    location: basics.location?.city
      ? `${basics.location.city}${basics.location.countryCode ? `, ${basics.location.countryCode}` : ''}`
      : '',
    date: today,
    recipientName: stripHtml(jobData?.contactPerson) || 'Hiring Manager',
    companyName: stripHtml(jobData?.company) || 'Company Name',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* No header area on desktop — the tab rail already labels this panel.
          The title and the rule drop away; close stays, right-aligned. */}
      <div className="px-4 py-3 md:px-3 md:py-1.5 md:border-0 border-b border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
        <div className="md:hidden flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <LayoutTemplate className="w-4 h-4 text-emerald-500" />
          <span>Header Styles</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 ml-auto rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close header styles"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-gray-50 dark:bg-[#0a0a0a]">
        {HEADER_STYLES.map(({ id, name, desc, Component }) => {
          const isSelected = templateType === id;
          return (
            <div
              key={id}
              onClick={() => onSelect(id)}
              className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:shadow-lg bg-white dark:bg-[#111] ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 dark:border-white/5 hover:border-gray-400'
              }`}
            >
              <div className="p-3 flex flex-col gap-1 z-10 border-b border-gray-100 dark:border-[#222]">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-tight">{name}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">{desc}</div>
                  </div>
                  {isSelected && (
                    <span className="bg-emerald-500/20 text-emerald-500 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* ⚠️ `zoom`, not `transform: scale()`.
                  The card used to force `aspect-[16/9]` on this box while the
                  header inside was shrunk with `transform: scale(0.4)`. A
                  transform does NOT affect layout, so the absolutely-positioned
                  content contributed no height: the box stayed 16:9 whatever the
                  header measured, and any header shorter than that ratio left a
                  band of empty `#f9f9f9` under it. `zoom` DOES participate in
                  layout, so the box now collapses to exactly the scaled height of
                  the header — the preview is the header and nothing else.
                  (`width: 250%` × `zoom: 0.4` still renders at 100%.) */}
              <div className="relative w-full overflow-hidden bg-[#f9f9f9]">
                <div
                  className="pointer-events-none p-4 opacity-95 group-hover:opacity-100 transition-opacity cv-document text-gray-900"
                  style={{ width: '250%', zoom: 0.4 }}
                >
                  <Component {...headerProps} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoverLetterHeaderStyles;
