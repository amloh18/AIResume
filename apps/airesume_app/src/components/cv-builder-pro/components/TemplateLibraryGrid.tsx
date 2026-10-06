'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES } from '../registry';
import { StaticLayoutRenderer, CanvasContext } from './CoreUI';
import { getCanvasSnippetPreviewData } from '@/lib/templates/canvas-initial-data';

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

function TemplateThumbnail({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.14);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;

    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / PAGE_WIDTH);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`relative w-full overflow-hidden bg-white ${
        isActive ? 'ring-2 ring-emerald-500' : 'ring-1 ring-black/10 group-hover:ring-emerald-400/70'
      }`}
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none text-gray-900"
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

type TemplateLibraryGridProps = {
  activeTemplateId?: string;
  onSelect: (template: any) => void;
  cvData: any;
  ReadOnlyWrapper: React.ComponentType<any>;
  design?: any;
  compact?: boolean;
  renderMeta?: (template: any, isActive: boolean) => React.ReactNode;
  /**
   * When true, thumbnails are rendered from `getCanvasSnippetPreviewData(cvData)`:
   * the user's real content where it exists, realistic sample content wherever it is
   * empty. Prevents a blank CV from producing a grid of blank white thumbnails.
   * Off by default so callers that already pass populated data (e.g. Step 2 with
   * `initialData`) render byte-for-byte as before.
   */
  useSampleData?: boolean;
};

export function TemplateLibraryGrid({
  activeTemplateId,
  onSelect,
  cvData,
  ReadOnlyWrapper,
  design,
  compact = false,
  renderMeta,
  useSampleData = false,
}: TemplateLibraryGridProps) {
  const gridClass = compact
    ? 'grid grid-cols-3 gap-x-2.5 gap-y-4'
    : 'grid grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5';

  const outerContext = React.useContext(CanvasContext);
  const previewData = useMemo(
    () => (useSampleData ? getCanvasSnippetPreviewData(cvData) : cvData),
    [cvData, useSampleData]
  );

  // The ReadOnlyWrapper (EditableField) resolves fields from props *or* the
  // CanvasContext, so the context must carry the same preview data as the
  // renderer below — otherwise header/section titles would still read the live CV.
  const contextValue = useMemo(
    () => ({ ...(outerContext || {}), cvData: previewData }),
    [outerContext, previewData]
  );

  const grid = (
    <div className={compact ? 'space-y-6' : 'space-y-10'}>
      {TEMPLATE_CATEGORIES.map((cat) => {
        const catTemplates = CANVAS_TEMPLATES.filter((tpl) => cat.types.includes(tpl.type));
        if (catTemplates.length === 0) return null;

        return (
          <div key={cat.id} className={compact ? 'space-y-2.5' : 'space-y-3'}>
            <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-1.5 border-b border-black/5 dark:border-white/10'}`}>
              <span className={`text-emerald-500 ${compact ? '[&_svg]:w-3.5 [&_svg]:h-3.5' : '[&_svg]:w-5 [&_svg]:h-5'}`}>{cat.icon}</span>
              <div className="min-w-0">
                <h2 className={`font-bold uppercase tracking-wider ${compact ? (cat.id === 'hybrid' ? 'text-[9px]' : 'text-[10px]') : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  {cat.name}
                </h2>
                {!compact && cat.desc && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-normal normal-case tracking-normal mt-0.5">{cat.desc}</p>
                )}
              </div>
            </div>
            <div className={gridClass}>
              {catTemplates.map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={tpl.id}
                    onClick={() => onSelect(tpl)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tpl); } }}
                    className="group relative flex flex-col gap-1.5 text-left bg-transparent p-0 border-0 cursor-pointer"
                  >
                    <TemplateThumbnail isActive={isActive}>
                      <StaticLayoutRenderer
                        template={tpl}
                        cvData={previewData}
                        ReadOnlyWrapper={ReadOnlyWrapper}
                        design={design}
                      />
                    </TemplateThumbnail>
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className={`font-medium leading-tight truncate ${compact ? 'text-[10px]' : 'text-[11px]'} text-gray-800 dark:text-gray-100`}>
                        {tpl.name}
                      </span>
                      {isActive && (
                        <span className="bg-emerald-500 text-white text-[6px] px-1 py-px rounded font-bold shrink-0">
                          ON
                        </span>
                      )}
                    </div>
                    {renderMeta?.(tpl, isActive)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return <CanvasContext.Provider value={contextValue}>{grid}</CanvasContext.Provider>;
}
