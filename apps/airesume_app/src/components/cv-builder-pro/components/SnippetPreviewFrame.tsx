'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

export const SnippetPreviewFrame = ({
  children,
  scale = 0.44,
  design,
}: {
  children: React.ReactNode;
  scale?: number;
  design?: {
    font?: string;
    fontSize?: number;
    spacing?: number;
    accentColor?: string;
    sectionGap?: number;
    itemGap?: number;
  };
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(140);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;

    const update = () => {
      const contentHeight = Math.max(el.scrollHeight, el.offsetHeight);
      const next = Math.ceil(contentHeight * scale + 16);
      setHeight(Math.min(640, Math.max(110, next)));
    };

    update();
    const frame = window.requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scale, children, design]);

  return (
    <div className="relative w-full overflow-hidden bg-[#f8fafc]" style={{ height }}>
      <div
        ref={innerRef}
        className="absolute top-0 left-0 origin-top-left pointer-events-none text-gray-900 p-3 cv-document"
        style={{
          width: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: `${design?.font || 'Inter'}, sans-serif`,
          fontSize: `${design?.fontSize || 12}px`,
          ['--cv-font']: design?.font || 'Inter',
          ['--cv-base-size']: `${design?.fontSize || 12}px`,
          ['--cv-spacing']: String(design?.spacing ?? 1),
          ['--cv-accent']: design?.accentColor || '#22c55e',
          // `??`, not `||`: 0 is a legal gap (the Design panel's sliders go down
          // to 0) and `||` would replace it with the fallback — the preview would
          // then disagree with the canvas about a document that has no gaps.
          ['--cv-section-gap']: `${design?.sectionGap ?? 16}px`,
          ['--cv-item-gap']: `${design?.itemGap ?? 12}px`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
};
