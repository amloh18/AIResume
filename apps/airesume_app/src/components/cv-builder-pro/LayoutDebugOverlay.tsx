'use client';

import React from 'react';

export interface DebugBlock {
  id: string;
  page: number;
  height: number;
  reason: string;
  zoneId?: string;
}

export interface LayoutDebugInfo {
  pageHeight: number;
  pageMargin: number;
  usableHeight: number;
  sectionGap: number;
  totalPages: number;
  blocks: DebugBlock[];
}

interface LayoutDebugOverlayProps {
  debugInfo: LayoutDebugInfo;
  pageWidth: number;
  pageHeight: number;
}

const REASON_COLORS: Record<string, string> = {
  BLOCK_FIT: 'rgba(34, 197, 94, 0.3)',
  BLOCK_TOO_TALL: 'rgba(239, 68, 68, 0.3)',
  KEEP_TOGETHER: 'rgba(251, 191, 36, 0.3)',
  MANUAL_PAGE_BREAK: 'rgba(168, 85, 247, 0.3)',
  COLUMN_FULL: 'rgba(59, 130, 246, 0.3)',
  SECTION_SPAN_ALL: 'rgba(236, 72, 153, 0.3)',
  DEFAULT: 'rgba(107, 114, 128, 0.2)',
};

export const LayoutDebugOverlay: React.FC<LayoutDebugOverlayProps> = ({
  debugInfo,
  pageWidth,
  pageHeight,
}) => {
  const { pageMargin, usableHeight, totalPages, blocks } = debugInfo;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from({ length: totalPages }, (_, pageIdx) => (
        <div
          key={pageIdx}
          className="absolute"
          style={{
            top: pageIdx * (pageHeight + 40),
            left: 0,
            width: pageWidth,
            height: pageHeight,
          }}
        >
          {/* Page boundary */}
          <div className="absolute inset-0 border-2 border-blue-500/50" />

          {/* Margin boundaries */}
          <div
            className="absolute border border-dashed border-green-500/40"
            style={{
              top: pageMargin,
              left: pageMargin,
              right: pageMargin,
              bottom: pageMargin,
            }}
          />

          {/* Usable area */}
          <div
            className="absolute bg-green-500/5"
            style={{
              top: pageMargin,
              left: pageMargin,
              right: pageMargin,
              height: usableHeight,
            }}
          />

          {/* Blocks on this page */}
          {blocks
            .filter((b) => b.page === pageIdx)
            .map((block) => (
              <div
                key={block.id}
                className="absolute left-2 right-2 text-[8px] font-mono px-1 py-0.5 rounded"
                style={{
                  top: pageMargin,
                  height: Math.min(block.height, usableHeight),
                  backgroundColor: REASON_COLORS[block.reason] || REASON_COLORS.DEFAULT,
                  borderLeft: `3px solid ${block.reason === 'BLOCK_FIT' ? '#22c55e' : block.reason === 'BLOCK_TOO_TALL' ? '#ef4444' : '#6b7280'}`,
                }}
              >
                <span className="font-bold">{block.id.slice(0, 12)}</span>
                <span className="ml-1 text-gray-500">{Math.round(block.height)}px</span>
                <span className="ml-1 text-gray-400">{block.reason}</span>
              </div>
            ))}

          {/* Page label */}
          <div className="absolute top-1 right-1 text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
            Page {pageIdx + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LayoutDebugOverlay;
