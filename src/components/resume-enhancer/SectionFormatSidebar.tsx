'use client';

import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  AlignLeft, AlignCenter, AlignRight,
  Space, ChevronDown, ChevronUp, EyeOff,
  RotateCcw, Bold, Italic
} from 'lucide-react';

interface SectionFormatSidebarProps {
  sectionId: string;
  sectionTitle: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSectionStyleChange?: (style: SectionStyle) => void;
  currentStyle?: SectionStyle;
}

export interface SectionStyle {
  titleAlignment: 'left' | 'center' | 'right';
  titleCase: 'normal' | 'uppercase' | 'capitalize';
  titleBold: boolean;
  titleItalic: boolean;
  spacing: 'compact' | 'normal' | 'relaxed';
  bulletStyle: 'disc' | 'circle' | 'square' | 'none';
  showDividers: boolean;
}

const DEFAULT_STYLE: SectionStyle = {
  titleAlignment: 'left',
  titleCase: 'normal',
  titleBold: true,
  titleItalic: false,
  spacing: 'normal',
  bulletStyle: 'disc',
  showDividers: true,
};

const SPACING_OPTIONS = [
  { value: 'compact' as const, label: 'Compact', description: 'Tight spacing' },
  { value: 'normal' as const, label: 'Normal', description: 'Standard spacing' },
  { value: 'relaxed' as const, label: 'Relaxed', description: 'Extra spacing' },
];

const BULLET_OPTIONS = [
  { value: 'disc' as const, label: 'Disc', icon: '●' },
  { value: 'circle' as const, label: 'Circle', icon: '○' },
  { value: 'square' as const, label: 'Square', icon: '■' },
  { value: 'none' as const, label: 'None', icon: '—' },
];

const TITLE_CASE_OPTIONS = [
  { value: 'normal' as const, label: 'Normal' },
  { value: 'uppercase' as const, label: 'UPPERCASE' },
  { value: 'capitalize' as const, label: 'Capitalize' },
];

export default function SectionFormatSidebar({
  sectionId,
  sectionTitle,
  isVisible,
  onToggleVisibility,
  onSectionStyleChange,
  currentStyle = DEFAULT_STYLE,
}: SectionFormatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (isVisible) {
      gsap.fromTo(sidebarRef.current,
        { width: 0, opacity: 0 },
        { width: 240, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isVisible]);

  const updateStyle = (updates: Partial<SectionStyle>) => {
    const newStyle = { ...currentStyle, ...updates };
    onSectionStyleChange?.(newStyle);
  };

  if (!isVisible) return null;

  return (
    <div ref={sidebarRef} className="flex-shrink-0 h-full overflow-hidden border-l border-white/10 bg-[#141414]">
      <div className="h-full overflow-y-auto overscroll-contain w-[240px]">
        <div className="sticky top-0 bg-[#141414] border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-white truncate">Format: {sectionTitle}</h3>
          <button onClick={onToggleVisibility} className="p-1 rounded hover:bg-white/10 transition-colors" title="Close">
            <EyeOff size={14} className="text-white/60" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Section Title */}
          <Panel title="Section Title" isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
            <Row label="Alignment">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button key={align} onClick={() => updateStyle({ titleAlignment: align })}
                    className={`p-1.5 rounded transition-colors ${currentStyle.titleAlignment === align ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-white/50 hover:text-white/80'}`}>
                    {align === 'left' && <AlignLeft size={14} />}
                    {align === 'center' && <AlignCenter size={14} />}
                    {align === 'right' && <AlignRight size={14} />}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Case">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {TITLE_CASE_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => updateStyle({ titleCase: value })}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${currentStyle.titleCase === value ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-white/50 hover:text-white/80'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Style">
              <div className="flex items-center gap-1">
                <button onClick={() => updateStyle({ titleBold: !currentStyle.titleBold })}
                  className={`p-1.5 rounded transition-colors ${currentStyle.titleBold ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-white/50 hover:text-white/80'}`} title="Bold">
                  <Bold size={14} />
                </button>
                <button onClick={() => updateStyle({ titleItalic: !currentStyle.titleItalic })}
                  className={`p-1.5 rounded transition-colors ${currentStyle.titleItalic ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-white/50 hover:text-white/80'}`} title="Italic">
                  <Italic size={14} />
                </button>
              </div>
            </Row>
          </Panel>

          {/* Spacing */}
          <Panel title="Spacing">
            <div className="space-y-1">
              {SPACING_OPTIONS.map(({ value, label, description }) => (
                <button key={value} onClick={() => updateStyle({ spacing: value })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${currentStyle.spacing === value ? 'bg-[#80FF00]/10 border border-[#80FF00]/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}>
                  <div>
                    <div className={`text-xs font-medium ${currentStyle.spacing === value ? 'text-[#80FF00]' : 'text-white/80'}`}>{label}</div>
                    <div className="text-[10px] text-white/40">{description}</div>
                  </div>
                  <Space size={14} className={currentStyle.spacing === value ? 'text-[#80FF00]' : 'text-white/30'} />
                </button>
              ))}
            </div>
          </Panel>

          {/* Bullet Style */}
          <Panel title="Bullet Style">
            <div className="grid grid-cols-4 gap-1">
              {BULLET_OPTIONS.map(({ value, label, icon }) => (
                <button key={value} onClick={() => updateStyle({ bulletStyle: value })}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${currentStyle.bulletStyle === value ? 'bg-[#80FF00]/10 border border-[#80FF00]/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}>
                  <span className={`text-lg ${currentStyle.bulletStyle === value ? 'text-[#80FF00]' : 'text-white/50'}`}>{icon}</span>
                  <span className={`text-[9px] ${currentStyle.bulletStyle === value ? 'text-[#80FF00]' : 'text-white/40'}`}>{label}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* Appearance */}
          <Panel title="Appearance">
            <Row label="Section Dividers">
              <button onClick={() => updateStyle({ showDividers: !currentStyle.showDividers })}
                className={`relative w-10 h-5 rounded-full transition-colors ${currentStyle.showDividers ? 'bg-[#80FF00]' : 'bg-white/20'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${currentStyle.showDividers ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </Row>
          </Panel>

          <button onClick={() => onSectionStyleChange?.(DEFAULT_STYLE)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors text-xs">
            <RotateCcw size={12} />
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, isExpanded: controlled, onToggle }: {
  title: string; children: React.ReactNode; isExpanded?: boolean; onToggle?: () => void;
}) {
  const [internal, setInternal] = useState(true);
  const expanded = controlled !== undefined ? controlled : internal;
  const toggle = onToggle || (() => setInternal(!internal));

  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/5 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-white/70 hover:text-white/90 transition-colors">
        {title}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">{children}</div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/40">{label}</span>
      {children}
    </div>
  );
}
