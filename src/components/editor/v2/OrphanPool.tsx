'use client';

import React from 'react';
import type { SnippetV2, SnippetType } from '@/types/snippet-v2';
import type { SlotDefinition } from '@/types/template-v2';
import { isSnippetCompatibleWithSlot } from '@/lib/templates/v2/slot-compatibility';

interface OrphanedSnippet {
  snippetId: string;
  snippetType: SnippetType;
  reason: string;
  snippet?: SnippetV2;
}

interface OrphanPoolProps {
  orphaned: OrphanedSnippet[];
  availableSlots: SlotDefinition[];
  onRebind: (snippetId: string, slotId: string) => void;
  onDiscard: (snippetId: string) => void;
}

export function OrphanPool({
  orphaned,
  availableSlots,
  onRebind,
  onDiscard,
}: OrphanPoolProps) {
  if (orphaned.length === 0) return null;

  function getCompatibleSlots(snippetType: SnippetType): SlotDefinition[] {
    return availableSlots.filter((s) => isSnippetCompatibleWithSlot(snippetType, s));
  }

  function getSnippetPreview(snippet?: SnippetV2): string {
    if (!snippet) return 'Unknown snippet';
    const c = snippet.content as any;
    switch (snippet.type) {
      case 'experience': return `${c.position} at ${c.company}`;
      case 'education': return c.institution;
      case 'skills': return c.category;
      case 'project': return c.name;
      default: return snippet.type;
    }
  }

  return (
    <div style={{
      padding: '12px', background: '#fffbeb', border: '1px solid #fde68a',
      borderRadius: '8px', marginBottom: '16px',
    }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
        Orphaned Snippets ({orphaned.length})
      </h4>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#a16207' }}>
        These snippets lost their slot during template switch. Re-bind or discard them.
      </p>
      {orphaned.map((item) => {
        const compatible = getCompatibleSlots(item.snippetType);
        return (
          <div key={item.snippetId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#fff', borderRadius: '6px',
            border: '1px solid #fde68a', marginBottom: '6px',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>
                {getSnippetPreview(item.snippet)}
              </div>
              <div style={{ fontSize: '11px', color: '#a16207', marginTop: '2px' }}>
                {item.reason}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {compatible.length > 0 ? (
                <select
                  onChange={(e) => e.target.value && onRebind(item.snippetId, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px' }}
                  defaultValue=""
                >
                  <option value="" disabled>Re-bind to...</option>
                  {compatible.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '12px', color: '#dc2626' }}>No compatible slots</span>
              )}
              <button
                onClick={() => onDiscard(item.snippetId)}
                style={{
                  padding: '4px 8px', border: '1px solid #dc2626', borderRadius: '4px',
                  background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '12px',
                }}
              >
                Discard
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
