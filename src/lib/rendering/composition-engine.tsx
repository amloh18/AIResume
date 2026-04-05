/**
 * Composition Engine
 *
 * The main rendering pipeline that combines:
 * - CVInstance (bindings)
 * - SnippetV2[] (content)
 * - TemplateV2 (slot blueprint)
 * - StylePreset (design tokens)
 *
 * Into a rendered React component.
 */

import React from 'react';
import type { CVInstance, SlotBinding } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import type { TemplateV2, StylePreset } from '@/types/template-v2';
import { getSlotRenderer } from './slot-renderers';
import { generateCSSFromPreset } from './style-to-css';

interface CompositionEngineProps {
  instance: CVInstance;
  snippets: Map<string, SnippetV2>;
  template: TemplateV2;
  styleOverrides?: Partial<StylePreset>;
  className?: string;
}

export function CompositionEngine({
  instance,
  snippets,
  template,
  styleOverrides,
  className = '',
}: CompositionEngineProps) {
  // Merge style overrides with template preset
  const style: StylePreset = {
    ...template.stylePreset,
    ...styleOverrides,
    typography: { ...template.stylePreset.typography, ...(styleOverrides?.typography || {}) },
    spacing: { ...template.stylePreset.spacing, ...(styleOverrides?.spacing || {}) },
    colors: { ...template.stylePreset.colors, ...(styleOverrides?.colors || {}) },
    layout: { ...template.stylePreset.layout, ...(styleOverrides?.layout || {}) },
    bullets: { ...template.stylePreset.bullets, ...(styleOverrides?.bullets || {}) },
  };

  const css = generateCSSFromPreset(style);

  // Group bindings by slot and sort by order
  const bindingsBySlot = new Map<string, SlotBinding[]>();
  for (const binding of instance.slotBindings) {
    if (!binding.visible) continue;
    const existing = bindingsBySlot.get(binding.slotId) || [];
    existing.push(binding);
    existing.sort((a, b) => a.order - b.order);
    bindingsBySlot.set(binding.slotId, existing);
  }

  // Render slots grouped by column
  const { layout } = template;

  return (
    <div className={`cv-composition ${className}`} style={{ background: style.colors.background }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className="cv-layout"
        style={{
          display: layout.type === 'single-column' ? 'block' : 'flex',
          gap: layout.type !== 'single-column' ? '24px' : undefined,
        }}
      >
        {layout.columns.map((column) => (
          <div
            key={column.id}
            className={`cv-column cv-column-${column.id}`}
            style={{ width: column.width, flex: column.id === 'main' ? 1 : undefined }}
          >
            {column.slots.map((slotId) => {
              const slot = template.slots.find((s) => s.id === slotId);
              if (!slot) return null;

              const bindings = bindingsBySlot.get(slotId) || [];
              if (bindings.length === 0 && !slot.required) return null;

              return (
                <div key={slotId} className="cv-section" data-slot-id={slotId} data-slot-type={slot.type}>
                  {bindings.map((binding) => {
                    const snippet = snippets.get(binding.snippetId);
                    if (!snippet) return null;

                    const Renderer = getSlotRenderer(slot.type);
                    if (!Renderer) return <div key={binding.snippetId}>Unknown slot type: {slot.type}</div>;

                    return (
                      <Renderer
                        key={binding.snippetId}
                        snippet={snippet}
                        constraints={slot.constraints}
                        style={style}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
