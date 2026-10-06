'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { FixAnnotation } from './fix-annotation';

interface InlineSuggestionProps {
  fix: FixAnnotation;
  onApply: (fix: FixAnnotation) => void;
  onDismiss: (fixId: string) => void;
}

// Helper function to preserve HTML formatting while rendering
function renderFormattedText(text: string) {
  if (!text) return null;
  
  // Check if text contains HTML
  const hasHTML = /<[^>]+>/.test(text);
  
  if (hasHTML) {
    // Render HTML with preserved formatting and white text
    const styledHTML = text
      .replace(/<p[^>]*>/gi, `<p style="margin: 0 0 4px 0; color: white;">`)
      .replace(/<ul[^>]*>/gi, `<ul style="margin: 4px 0; padding-left: 20px; color: white;">`)
      .replace(/<ol[^>]*>/gi, `<ol style="margin: 4px 0; padding-left: 20px; color: white;">`)
      .replace(/<li[^>]*>/gi, `<li style="margin: 2px 0; color: white;">`)
      .replace(/<br\s*\/?>/gi, '<br />')
      .replace(/<strong[^>]*>/gi, `<strong style="color: white; font-weight: 600;">`)
      .replace(/<em[^>]*>/gi, `<em style="color: white; font-style: italic;">`)
      .replace(/<b[^>]*>/gi, `<b style="color: white; font-weight: 600;">`)
      .replace(/<i[^>]*>/gi, `<i style="color: white; font-style: italic;">`);
    
    return (
      <div 
        className="text-sm leading-relaxed text-white"
        dangerouslySetInnerHTML={{ __html: styledHTML }}
      />
    );
  }
  
  // Plain text - preserve line breaks and bullet points
  const lines = text.split('\n');
  return (
    <div className="text-sm leading-relaxed text-white">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={idx} />;
        
        // Handle bullet points
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
          return (
            <div key={idx} className="ml-4 mb-1">
              {trimmed}
            </div>
          );
        }
        
        // Regular paragraph
        return (
          <div key={idx} className="mb-1">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function InlineSuggestion({ fix, onApply, onDismiss }: InlineSuggestionProps) {
  return (
    <div className="mt-2 bg-green-600/20 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold bg-green-600 text-white px-2 py-1 rounded mb-1.5 uppercase tracking-wide inline-block">
            Suggested: {fix.issue}
          </div>
          <div className="text-white font-medium">
            {renderFormattedText(fix.replacementText)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onApply(fix)}
            className="p-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105"
            title="Apply suggestion"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDismiss(fix.id)}
            className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all"
            title="Dismiss suggestion"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

