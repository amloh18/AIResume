/* eslint-disable react/no-unescaped-entities */
'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { FixAnnotation } from './fix-annotation';
import { getFieldPathLabel } from '@/lib/utils/fieldPathLabels';

interface FieldFixOverlayProps {
  fix: FixAnnotation;
  onApply: (fix: FixAnnotation) => void;
  onDismiss: (fixId: string) => void;
  onSuppress?: (fix: FixAnnotation) => void;
}

// Helper function to preserve HTML formatting while rendering
function renderFormattedText(text: string, isReplacement: boolean = false) {
  if (!text) return null;
  
  // Check if text contains HTML
  const hasHTML = /<[^>]+>/.test(text);
  
  if (hasHTML) {
    // Render HTML with preserved formatting and proper styling
    const textColor = isReplacement ? '#39FF14' : '#fca5a5';
    const styledHTML = text
      .replace(/<p[^>]*>/gi, `<p style="margin: 0 0 8px 0; color: ${textColor};">`)
      .replace(/<ul[^>]*>/gi, `<ul style="margin: 8px 0; padding-left: 20px; color: ${textColor};">`)
      .replace(/<ol[^>]*>/gi, `<ol style="margin: 8px 0; padding-left: 20px; color: ${textColor};">`)
      .replace(/<li[^>]*>/gi, `<li style="margin: 4px 0; color: ${textColor};">`)
      .replace(/<br\s*\/?>/gi, '<br />')
      .replace(/<strong[^>]*>/gi, `<strong style="color: ${textColor}; font-weight: 600;">`)
      .replace(/<em[^>]*>/gi, `<em style="color: ${textColor}; font-style: italic;">`)
      .replace(/<b[^>]*>/gi, `<b style="color: ${textColor}; font-weight: 600;">`)
      .replace(/<i[^>]*>/gi, `<i style="color: ${textColor}; font-style: italic;">`);
    
    const sanitizedHTML = DOMPurify.sanitize(styledHTML, {
      ALLOWED_TAGS: ['p', 'ul', 'ol', 'li', 'br', 'strong', 'em', 'b', 'i'],
      ALLOWED_ATTR: ['style']
    });
    
    return (
      <div 
        className={`text-sm leading-relaxed break-words overflow-wrap-anywhere ${isReplacement ? '' : 'line-through'}`}
        style={{ color: isReplacement ? '#39FF14' : '#fca5a5' }}
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    );
  }
  
  // Plain text - preserve line breaks and bullet points
  const lines = text.split('\n');
  return (
    <div className={`text-sm leading-relaxed break-words overflow-wrap-anywhere ${isReplacement ? 'text-[#39FF14]' : 'text-red-300/80 line-through'}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={idx} />;
        
        // Handle bullet points
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
          return (
            <div key={idx} className="ml-4 mb-1.5">
              {trimmed}
            </div>
          );
        }
        
        // Regular paragraph
        return (
          <div key={idx} className="mb-1.5">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function FieldFixOverlay({ fix, onApply, onDismiss, onSuppress }: FieldFixOverlayProps) {
  const fieldLabel = getFieldPathLabel(fix.fieldPath);
  
  return (
    <div className="w-full mb-3 bg-gradient-to-br from-[#1a230f] via-[#0f1410] to-[#1a230f] rounded-lg p-3 shadow-lg shadow-[#39FF14]/10 box-border">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <AlertCircle className="w-3.5 h-3.5 text-[#39FF14] flex-shrink-0" />
        <div className="text-xs font-bold text-[#39FF14] uppercase tracking-wide">
          Suggestion • <span className="text-white font-semibold">{fieldLabel}</span>
        </div>
      </div>
      
      {/* Issue Description */}
      <div className="text-xs text-white font-semibold mb-2.5 leading-snug break-words">
        {fix.issue}
      </div>

      {/* Text Comparison */}
      <div className="space-y-2 w-full">
        {/* Original Text */}
        {fix.originalText && (
          <div className="bg-red-500/10 rounded-md p-2 w-full">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                Current
              </div>
            </div>
            <div className="text-xs text-red-300/90 line-through decoration-red-400/60 break-words overflow-wrap-anywhere w-full">
              {renderFormattedText(fix.originalText, false)}
            </div>
          </div>
        )}
        
        {/* Arrow */}
        <div className="flex items-center justify-center py-0.5">
          <div className="text-[#39FF14] text-sm font-bold">↓</div>
        </div>
        
        {/* Replacement Text */}
        {fix.replacementText && (
          <div className="bg-[#39FF14]/20 rounded-md p-2 shadow-md shadow-[#39FF14]/10 w-full">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1 h-1 bg-[#39FF14] rounded-full"></div>
              <div className="text-[10px] font-bold bg-[#39FF14] text-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                Suggested
              </div>
            </div>
            <div className="text-xs text-[#39FF14] font-semibold leading-relaxed break-words overflow-wrap-anywhere w-full">
              {renderFormattedText(fix.replacementText, true)}
            </div>
          </div>
        )}
      </div>

      {/* Semantic Match Info */}
      {fix.status === 'semantic_match' && fix.semanticMatch && (
        <div className="mt-2 mb-2 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/30">
          <div className="text-[10px] text-yellow-300 font-semibold uppercase tracking-wide mb-1">
            Semantic Match Detected
          </div>
          <div className="text-xs text-yellow-200">
            Matches <span className="font-semibold">'{fix.semanticMatch.requiredTerm}'</span> via{' '}
            <span className="font-semibold">'{fix.semanticMatch.foundTerm}'</span>
            {fix.semanticMatch.confidenceScore < 1.0 && (
              <span className="ml-1 text-yellow-300/70">
                ({Math.round(fix.semanticMatch.confidenceScore * 100)}% confidence)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - Full width below content */}
      <div className="flex items-center gap-2 mt-3 w-full">
        <button
          type="button"
          onClick={() => onApply(fix)}
          className="flex-1 px-3 py-1.5 rounded-md bg-[#39FF14] hover:bg-[#39FF14]/90 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#39FF14]/30 transition-all hover:scale-105 active:scale-95"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Apply
        </button>
        {onSuppress && fix.status === 'open' && (
          <button
            type="button"
            onClick={() => onSuppress(fix)}
            className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            title="I fixed this in a way the AI missed"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Force Resolve
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(fix.id)}
          className="flex-1 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/90 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}


