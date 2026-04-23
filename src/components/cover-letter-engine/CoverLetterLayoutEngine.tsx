import React, { useMemo } from 'react';
import { 
  ClassicHeader, 
  ModernHeader, 
  MinimalHeader, 
  HeaderSnippetProps 
} from './snippets/headers/HeaderSnippets';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface CoverLetterLayoutEngineProps {
  headerProps: HeaderSnippetProps;
  bodyContent: string;
  footerContent?: string;
  templateType?: 'classic' | 'modern' | 'minimal';
  isEditing?: boolean;
  onBodyChange?: (content: string) => void;
}

export default function CoverLetterLayoutEngine({
  headerProps,
  bodyContent,
  footerContent,
  templateType = 'modern',
  isEditing = false,
  onBodyChange
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

  return (
    <div 
      className="w-full max-w-[794px] mx-auto bg-white dark:bg-white shadow-2xl flex flex-col text-gray-800 transition-all duration-500 ease-in-out relative cover-letter-document" 
      style={{ 
        // Set container type for children to use cqw for precise A4 page breaks
        containerType: 'inline-size',
      }}
    >
      {/* 
        We use a wrapper to ensure the minimum height matches exactly one A4 page.
        141.43cqw is the exact proportional height of A4 (297/210 = 1.41428) based on the container width.
      */}
      <div 
        className="flex-1 flex flex-col relative w-full"
        style={{ minHeight: '141.43cqw' }}
      >
        {/* Page break indicators (visual only for multiple pages) */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-100" 
             style={{ 
               backgroundSize: '100% 141.43cqw', 
               backgroundImage: 'linear-gradient(to bottom, transparent calc(141.43cqw - 12px), #f8fafc calc(141.43cqw - 12px), #e2e8f0 calc(141.43cqw - 2px), #94a3b8 141.43cqw)' 
             }} 
        />

        <div className="flex-1 flex flex-col relative z-10 py-[8cqw] px-[10cqw] sm:px-[12cqw] min-h-full">
          {/* Render Selected Header Snippet */}
          <HeaderComponent {...headerProps} />

          {/* Body Layout - Single Column Responsive */}
          {isEditing ? (
            <div className={`flex-1 mt-8 mb-12`}>
              <RichTextEditor 
                content={bodyContent} 
                onChange={onBodyChange || (() => {})} 
                className={`bg-transparent border-0 ring-1 ring-lime-500/50 rounded-lg p-4 ${fontClass} ${leadingClass}`}
                style={{ minHeight: '40cqw' }}
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
