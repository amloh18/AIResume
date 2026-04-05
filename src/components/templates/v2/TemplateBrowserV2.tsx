'use client';

import React, { useState } from 'react';
import type { TemplateV2 } from '@/types/template-v2';
import type { CVInstance } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import { getAllTemplatesV2, getTemplatesByCategory } from '@/lib/templates/v2/template-registry';
import { CompositionEngine } from '@/lib/rendering/composition-engine';

interface TemplateBrowserV2Props {
  currentInstance: CVInstance;
  snippets: Map<string, SnippetV2>;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export function TemplateBrowserV2({
  currentInstance,
  snippets,
  onSelect,
  onClose,
}: TemplateBrowserV2Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const categories = ['all', 'professional', 'creative', 'minimal', 'academic'];
  const templates = selectedCategory === 'all'
    ? getAllTemplatesV2()
    : getTemplatesByCategory(selectedCategory as any);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '90vw', maxWidth: '1200px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Left: Template List */}
        <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Templates</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px', borderRadius: '16px', border: '1px solid #d1d5db',
                    background: selectedCategory === cat ? '#1a1a1a' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#374151',
                    cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '8px' }}>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template.id)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px', border: hoveredTemplate === template.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                  background: hoveredTemplate === template.id ? '#f0f9ff' : '#fff',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{template.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {template.description}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                    background: template.tier === 'premium' ? '#fef3c7' : '#d1fae5',
                    color: template.tier === 'premium' ? '#92400e' : '#065f46',
                  }}>
                    {template.tier}
                  </span>
                  <span style={{
                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                    background: '#f3f4f6', color: '#4b5563',
                  }}>
                    {template.layout.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto', background: '#f9fafb' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
            Preview with your content
          </h4>
          {hoveredTemplate ? (
            (() => {
              const previewTemplate = templates.find((t) => t.id === hoveredTemplate);
              if (!previewTemplate) return null;
              return (
                <div style={{
                  background: '#fff', borderRadius: '8px', padding: '32px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '700px',
                }}>
                  <CompositionEngine
                    instance={currentInstance}
                    snippets={snippets}
                    template={previewTemplate}
                  />
                </div>
              );
            })()
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '60px 0' }}>
              Hover a template to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
