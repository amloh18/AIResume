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
    <div className="w-full bg-white dark:bg-white shadow-xl rounded-xl overflow-hidden flex justify-center py-10 px-8 sm:px-12 md:px-16 text-gray-800 transition-all duration-500 ease-in-out">
      <div className="w-full max-w-3xl min-h-[600px] flex flex-col">
        {/* Render Selected Header Snippet */}
        <HeaderComponent {...headerProps} />

        {/* Body Layout - Single Column Responsive */}
        {isEditing ? (
          <div className={`flex-1 mt-6 mb-12`}>
            <RichTextEditor 
              content={bodyContent} 
              onChange={onBodyChange || (() => {})} 
              className={`bg-transparent border-0 ring-1 ring-lime-500/50 rounded-lg p-2 ${fontClass} ${leadingClass}`}
            />
          </div>
        ) : (
          <div className={`flex-1 flex flex-col space-y-6 ${fontClass} ${leadingClass} text-base text-gray-800 tracking-wide mt-6 mb-12`}>
            {isHtml ? (
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: bodyContent }} 
              />
            ) : (
              paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-justify">
                  {paragraph.trim()}
                </p>
              ))
            )}
          </div>
        )}

        {/* Footer Snippet / Layout */}
        <div className={`mt-auto pt-8 border-t border-gray-100 ${fontClass} text-gray-700`}>
          <p className="mb-8">{footerContent || 'Sincerely,'}</p>
          <p className="font-bold text-lg tracking-tight">{headerProps.name}</p>
        </div>
      </div>
    </div>
  );
}
