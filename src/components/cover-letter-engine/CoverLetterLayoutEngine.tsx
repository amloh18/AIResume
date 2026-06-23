import React, { useMemo, useState } from 'react';
import { 
  ClassicHeader, 
  ModernHeader, 
  MinimalHeader,
  TypographicHeader,
  ColumnSplitHeader,
  AccentBannerHeader,
  HeaderSnippetProps 
} from './snippets/headers/HeaderSnippets';
import WYSIWYGEditor from '@/components/ui/WYSIWYGEditor';
import { Sparkles, Type, Layout, Baseline, MoveHorizontal, LayoutTemplate, X, ChevronDown, Check } from 'lucide-react';

const TEMPLATES = [
  { id: 'modern', name: 'Modern', icon: Sparkles, desc: 'Professional, lime accents' },
  { id: 'classic', name: 'Classic', icon: Type, desc: 'Traditional serif style' },
  { id: 'minimal', name: 'Minimal', icon: Layout, desc: 'Clean and simple' },
  { id: 'typographic', name: 'Typographic', icon: Baseline, desc: 'Bold display' },
  { id: 'column-split', name: 'Column Split', icon: MoveHorizontal, desc: 'Side-by-side header' },
  { id: 'accent-banner', name: 'Accent Banner', icon: LayoutTemplate, desc: 'High-impact banner' }
] as const;

export interface CoverLetterDesignProps {
  fontSize: number;
  lineHeight: number;
  pageMargin: number;
  accentColor: string;
  fontFamily: 'font-sans' | 'font-serif' | 'font-mono';
}

interface CanvasSectionWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
  controls?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const CanvasSectionWrapper: React.FC<CanvasSectionWrapperProps> = ({
  children,
  isEditing,
  controls,
  className = '',
  onClick
}) => {
  if (!isEditing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`relative group/inner w-full transition-all duration-200 p-2 -mx-2 rounded-md hover:z-30 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Top right tight toolbar */}
      {controls && (
        <div className="absolute -top-3.5 right-0 opacity-0 group-hover/inner:opacity-100 focus-within:opacity-100 transition-all duration-200 flex items-center bg-white dark:bg-[#141810] border border-slate-200 dark:border-white/10 shadow-lg rounded-xl p-0.5 gap-0.5 z-[50] no-print font-sans select-none">
          {controls}
        </div>
      )}
      
      {/* Hover border and background layer */}
      <div className="absolute inset-0 bg-emerald-500/[0.03] opacity-0 group-hover/inner:opacity-100 pointer-events-none transition-all duration-200 z-0 border border-transparent group-hover/inner:border-emerald-400 group-hover/inner:border-dashed shadow-none rounded-md group-hover/inner:rounded-tr-none group-hover/inner:rounded-tl-none animate-fade-in-up"></div>
      
      <div className="relative z-10 pointer-events-auto w-full">
        {children}
      </div>
    </div>
  );
};

interface CoverLetterLayoutEngineProps {
  headerProps: HeaderSnippetProps;
  bodyContent: string;
  footerContent?: string;
  templateType?: 'classic' | 'modern' | 'minimal' | 'typographic' | 'column-split' | 'accent-banner';
  isEditing?: boolean;
  onBodyChange?: (content: string) => void;
  pageFormat?: 'a4' | 'letter';
  design?: Partial<CoverLetterDesignProps>;
  onTemplateTypeChange?: (type: 'classic' | 'modern' | 'minimal' | 'typographic' | 'column-split' | 'accent-banner') => void;
  showMoriChat?: boolean;
  onToggleMoriChat?: () => void;
  onChangeHeaderStyle?: () => void;
}

export default function CoverLetterLayoutEngine({
  headerProps,
  bodyContent,
  footerContent,
  templateType = 'modern',
  isEditing = false,
  onBodyChange,
  pageFormat = 'a4',
  design = {},
  onTemplateTypeChange,
  showMoriChat,
  onToggleMoriChat,
  onChangeHeaderStyle
}: CoverLetterLayoutEngineProps) {

  const HeaderComponent = useMemo(() => {
    switch (templateType) {
      case 'classic':
        return ClassicHeader;
      case 'minimal':
        return MinimalHeader;
      case 'typographic':
        return TypographicHeader;
      case 'column-split':
        return ColumnSplitHeader;
      case 'accent-banner':
        return AccentBannerHeader;
      case 'modern':
      default:
        return ModernHeader;
    }
  }, [templateType]);

  const defaultDesign: CoverLetterDesignProps = {
    fontSize: 15,
    lineHeight: 1.6,
    pageMargin: 6,
    accentColor: '#80FF00',
    fontFamily: templateType === 'classic' ? 'font-serif' : 'font-sans'
  };

  const activeDesign = { ...defaultDesign, ...design };
  
  const fontClass = activeDesign.fontFamily;

  const isHtml = /<[a-z][\s\S]*>/i.test(bodyContent);

  // Splitting body content into paragraphs if it's plain text
  const paragraphs = !isHtml ? bodyContent.split('\n\n').filter(p => p.trim() !== '') : [];

  const width = pageFormat === 'letter' ? '8.5in' : '210mm';
  const minHeight = pageFormat === 'letter' ? '11in' : '297mm';

  return (
    <div 
      className={`mx-auto bg-white dark:bg-white shadow-2xl flex flex-col text-black transition-all duration-500 ease-in-out relative cover-letter-document cv-document ${fontClass}`}
      style={{ 
        width,
        minHeight,
        containerType: 'inline-size',
        fontSize: `${activeDesign.fontSize}px`,
        lineHeight: activeDesign.lineHeight,
        '--cv-accent': activeDesign.accentColor
      } as React.CSSProperties}
    >
      {/* 
        We use a wrapper to ensure the minimum height matches exactly one page.
      */}
      <div 
        className="flex flex-col relative w-full"
        style={{ minHeight }}
      >
        {/* Page break indicators (visual only for multiple pages) */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-100" 
             style={{ 
                backgroundRepeat: 'repeat-y',
                backgroundSize: `100% ${minHeight}`, 
                backgroundImage: `linear-gradient(to bottom, transparent calc(${minHeight} - 40px), #f8fafc calc(${minHeight} - 40px), transparent calc(${minHeight} - 40px), transparent ${minHeight})` 
             }} 
        />

        <div 
          className="flex flex-col relative z-10"
          style={{ 
            padding: `${activeDesign.pageMargin}cqw ${activeDesign.pageMargin * 1.5}cqw`,
            minHeight
          }}
        >
          {/* Render Selected Header Snippet */}
          <CanvasSectionWrapper
            isEditing={isEditing}
            onClick={() => onChangeHeaderStyle && onChangeHeaderStyle()}
            controls={
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChangeHeaderStyle) onChangeHeaderStyle();
                }}
                className="flex items-center gap-1.5 h-7 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-105 active:scale-95 bg-transparent" 
                title="Change Header Style"
              >
                <LayoutTemplate size={12}/> 
                <span>Change</span>
              </button>
            }
          >
            <HeaderComponent {...headerProps} />
          </CanvasSectionWrapper>

          {/* Body Layout - Single Column Responsive */}
          <CanvasSectionWrapper
            isEditing={isEditing}
            controls={
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleMoriChat) onToggleMoriChat();
                }}
                className="flex items-center gap-1 h-7 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-105 active:scale-95 bg-transparent" 
                title="Ask Mori to improve"
              >
                <Sparkles size={12}/> 
                <span>Ask Mori</span>
              </button>
            }
          >
            {isEditing ? (
              <WYSIWYGEditor
                value={bodyContent}
                onChange={onBodyChange || (() => {})}
                className={`w-full ${fontClass} text-black bg-transparent mt-4 mb-6`}
                showToolbar={true}
                reviewMode={false}
                grammarLocale="us"
                textColor="black"
                autoExpand
              />
            ) : (
              <>
                {isHtml ? (
                  <div 
                    className="prose prose-sm max-w-none text-black mt-4 mb-6"
                    style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
                    dangerouslySetInnerHTML={{ __html: bodyContent }} 
                  />
                ) : (
                  paragraphs.map((paragraph, idx) => (
                    <p key={idx} className={`text-justify ${idx === 0 ? 'mt-4' : ''} ${idx === paragraphs.length - 1 ? 'mb-6' : 'mb-3'}`}>
                      {paragraph.trim()}
                    </p>
                  ))
                )}
              </>
            )}
          </CanvasSectionWrapper>

          {/* Footer Snippet / Layout */}
          <div className="pt-4 border-t border-gray-100 text-black">
            <p className="mb-2">{footerContent || 'Sincerely,'}</p>
            <p className="font-bold text-lg tracking-tight">{headerProps.name}</p>
          </div>
      </div>
      </div>
    </div>
  );
}
