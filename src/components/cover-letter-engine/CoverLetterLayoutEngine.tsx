import React, { useMemo } from 'react';
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

export interface CoverLetterDesignProps {
  fontSize: number;
  lineHeight: number;
  pageMargin: number;
  accentColor: string;
  fontFamily: 'font-sans' | 'font-serif' | 'font-mono';
}

interface CoverLetterLayoutEngineProps {
  headerProps: HeaderSnippetProps;
  bodyContent: string;
  footerContent?: string;
  templateType?: 'classic' | 'modern' | 'minimal' | 'typographic' | 'column-split' | 'accent-banner';
  isEditing?: boolean;
  onBodyChange?: (content: string) => void;
  pageFormat?: 'a4' | 'letter';
  design?: Partial<CoverLetterDesignProps>;
}

export default function CoverLetterLayoutEngine({
  headerProps,
  bodyContent,
  footerContent,
  templateType = 'modern',
  isEditing = false,
  onBodyChange,
  pageFormat = 'a4',
  design = {}
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
      className={`mx-auto bg-white dark:bg-white shadow-2xl flex flex-col text-gray-800 transition-all duration-500 ease-in-out relative cover-letter-document cv-document ${fontClass}`}
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
        className="flex-1 flex flex-col relative w-full"
        style={{ minHeight }}
      >
        {/* Page break indicators (visual only for multiple pages) */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-100" 
             style={{ 
               backgroundSize: `100% ${minHeight}`, 
               backgroundImage: `linear-gradient(to bottom, transparent calc(${minHeight} - 40px), #f8fafc calc(${minHeight} - 40px), transparent calc(${minHeight} - 40px), transparent ${minHeight})` 
             }} 
        />

        <div 
          className="flex-1 flex flex-col relative z-10 min-h-full"
          style={{ 
            padding: `${activeDesign.pageMargin}cqw ${activeDesign.pageMargin * 1.5}cqw`
          }}
        >
          {/* Render Selected Header Snippet */}
          <div className={`${isEditing ? 'border-dashed border-2 border-emerald-500/50 hover:bg-emerald-50/10 rounded-lg transition-colors p-2 -mx-2 -mt-2 cursor-pointer' : ''}`}>
            <HeaderComponent {...headerProps} />
          </div>

          {/* Body Layout - Single Column Responsive */}
          {isEditing ? (
            <div className={`flex-1 mt-4 mb-6`} style={{ minHeight: '40cqw' }}>
               <WYSIWYGEditor
                 value={bodyContent}
                 onChange={onBodyChange || (() => {})}
                 className={`bg-transparent border-dashed border-2 border-emerald-500/50 hover:bg-emerald-50/10 rounded-lg p-2 ${fontClass} transition-colors h-full`}
                 showToolbar={true}
                 reviewMode={true}
                 grammarLocale="us"
               />
            </div>
          ) : (
          <div className={`flex-1 flex flex-col space-y-3 ${fontClass} text-gray-800 tracking-wide mt-4 mb-6`}>
            {isHtml ? (
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
                dangerouslySetInnerHTML={{ __html: bodyContent }} 
              />
            ) : (
              paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-justify mb-3">
                  {paragraph.trim()}
                </p>
              ))
            )}
          </div>
        )}

        {/* Footer Snippet / Layout */}
        <div className={`mt-auto pt-4 border-t border-gray-100 ${fontClass} text-gray-800`}>
          <p className="mb-2">{footerContent || 'Sincerely,'}</p>
          <p className="font-bold text-lg tracking-tight">{headerProps.name}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
