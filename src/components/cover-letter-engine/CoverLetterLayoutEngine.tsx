import React, { useMemo } from 'react';
import { 
  ClassicHeader, 
  ModernHeader, 
  MinimalHeader, 
  HeaderSnippetProps 
} from './snippets/headers/HeaderSnippets';
import WYSIWYGEditor from '@/components/ui/WYSIWYGEditor';

interface CoverLetterLayoutEngineProps {
  headerProps: HeaderSnippetProps;
  bodyContent: string;
  footerContent?: string;
  templateType?: 'classic' | 'modern' | 'minimal';
  isEditing?: boolean;
  onBodyChange?: (content: string) => void;
  pageFormat?: 'a4' | 'letter';
}

export default function CoverLetterLayoutEngine({
  headerProps,
  bodyContent,
  footerContent,
  templateType = 'modern',
  isEditing = false,
  onBodyChange,
  pageFormat = 'a4'
}: CoverLetterLayoutEngineProps) {

  const HeaderComponent = useMemo(() => {
    switch (templateType) {
      case 'classic':
        return ClassicHeader;
      case 'minimal':
        return MinimalHeader;
      case 'modern':
      default:
        return ModernHeader;
    }
  }, [templateType]);

  const fontClass = templateType === 'classic' ? 'font-serif' : 'font-sans';
  const leadingClass = templateType === 'classic' ? 'leading-relaxed' : 'leading-loose';

  const isHtml = /<[a-z][\s\S]*>/i.test(bodyContent);

  // Splitting body content into paragraphs if it's plain text
  const paragraphs = !isHtml ? bodyContent.split('\n\n').filter(p => p.trim() !== '') : [];

  const maxWidthClass = pageFormat === 'letter' ? 'max-w-[816px]' : 'max-w-[794px]';
  const pageRatio = pageFormat === 'letter' ? '129.41cqw' : '141.43cqw';

  return (
    <div 
      className={`w-full ${maxWidthClass} mx-auto bg-white dark:bg-white shadow-2xl flex flex-col text-gray-800 transition-all duration-500 ease-in-out relative cover-letter-document`}
      style={{ 
        // Set container type for children to use cqw for precise A4/Letter page breaks
        containerType: 'inline-size',
      }}
    >
      {/* 
        We use a wrapper to ensure the minimum height matches exactly one page.
      */}
      <div 
        className="flex-1 flex flex-col relative w-full"
        style={{ minHeight: pageRatio }}
      >
        {/* Page break indicators (visual only for multiple pages) */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-100" 
             style={{ 
               backgroundSize: `100% ${pageRatio}`, 
               backgroundImage: `linear-gradient(to bottom, transparent calc(${pageRatio} - 12px), #f8fafc calc(${pageRatio} - 12px), #e2e8f0 calc(${pageRatio} - 2px), #94a3b8 ${pageRatio})` 
             }} 
        />

        <div className="flex-1 flex flex-col relative z-10 py-[8cqw] px-[10cqw] sm:px-[12cqw] min-h-full">
          {/* Render Selected Header Snippet */}
          <div className={`${isEditing ? 'border-dashed border-2 border-emerald-500/50 hover:bg-emerald-50/10 rounded-lg transition-colors p-2 -mx-2 -mt-2 cursor-pointer' : ''}`}>
            <HeaderComponent {...headerProps} />
          </div>

          {/* Body Layout - Single Column Responsive */}
          {isEditing ? (
            <div className={`flex-1 mt-8 mb-12`} style={{ minHeight: '40cqw' }}>
               <WYSIWYGEditor
                 value={bodyContent}
                 onChange={onBodyChange || (() => {})}
                 className={`bg-transparent border-dashed border-2 border-emerald-500/50 hover:bg-emerald-50/10 rounded-lg p-2 ${fontClass} ${leadingClass} transition-colors h-full`}
                 showToolbar={true}
                 reviewMode={true}
                 grammarLocale="us"
               />
            </div>
          ) : (
          <div className={`flex-1 flex flex-col space-y-6 ${fontClass} ${leadingClass} text-[15px] text-gray-800 tracking-wide mt-8 mb-12`}>
            {isHtml ? (
              <div 
                className="prose prose-sm max-w-none text-gray-800 prose-p:leading-relaxed prose-p:mb-6"
                dangerouslySetInnerHTML={{ __html: bodyContent }} 
              />
            ) : (
              paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-justify mb-6">
                  {paragraph.trim()}
                </p>
              ))
            )}
          </div>
        )}

        {/* Footer Snippet / Layout */}
        <div className={`mt-auto pt-10 border-t border-gray-100 ${fontClass} text-gray-800`}>
          <p className="mb-10">{footerContent || 'Sincerely,'}</p>
          <p className="font-bold text-lg tracking-tight">{headerProps.name}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
