'use client';

import React, { useMemo } from 'react';
import { decodeHtmlEntities, renderRichText } from '@/lib/utils/format-utils';

interface FormattedJobDescriptionProps {
  content?: string | null;
  fallback?: string;
  className?: string;
}

export function FormattedJobDescription({
  content,
  fallback = 'No job description provided.',
  className = '',
}: FormattedJobDescriptionProps) {
  const text = content || fallback;

  const { isHtml, safeHtml } = useMemo(() => {
    if (!text) return { isHtml: false, safeHtml: '' };
    const decoded = decodeHtmlEntities(text);
    const hasTags = /<[a-z][\s\S]*>/i.test(decoded);
    return {
      isHtml: hasTags,
      safeHtml: renderRichText(decoded),
    };
  }, [text]);

  if (!text) {
    return <span className="text-gray-400 dark:text-gray-500 italic">{fallback}</span>;
  }

  if (isHtml) {
    return (
      <div
        className={`job-description-content text-small leading-relaxed text-gray-700 dark:text-gray-300 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-gray-900 [&_h1]:dark:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-gray-900 [&_h2]:dark:text-white [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-gray-800 [&_h3]:dark:text-gray-200 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-gray-800 [&_h4]:dark:text-gray-200 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1 [&_li]:text-small [&_li]:text-gray-700 [&_li]:dark:text-gray-300 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_strong]:dark:text-white [&_b]:font-semibold [&_b]:text-gray-900 [&_b]:dark:text-white [&_a]:text-lime-600 [&_a]:dark:text-lime-400 [&_a]:underline [&_hr]:my-3 [&_hr]:border-gray-200 [&_hr]:dark:border-white/10 ${className}`}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return (
    <div className={`whitespace-pre-wrap text-small leading-relaxed text-gray-700 dark:text-gray-300 ${className}`}>
      {text}
    </div>
  );
}

export default FormattedJobDescription;
