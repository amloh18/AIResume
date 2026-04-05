'use client';

import React from 'react';
import type { SnippetV2 } from '@/types/snippet-v2';

interface SnippetAwarenessUIProps {
  snippet: SnippetV2;
  usageCount?: number;
  onEditInstance?: () => void;
  onEditAll?: () => void;
}

export function SnippetAwarenessUI({
  snippet,
  usageCount = 1,
  onEditInstance,
  onEditAll,
}: SnippetAwarenessUIProps) {
  const isDerived = !!snippet.lineage.parentSnippetId;
  const isFromLibrary = snippet.lineage.isGlobal || snippet.metadata.source === 'library';
  const editCount = snippet.lineage.editHistory.length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', background: '#f9fafb', borderRadius: '6px',
      fontSize: '12px', color: '#6b7280',
    }}>
      {isFromLibrary && (
        <span style={{
          background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px',
          borderRadius: '4px', fontSize: '11px',
        }}>
          Library
        </span>
      )}

      {isDerived && (
        <span style={{
          background: '#fef3c7', color: '#92400e', padding: '2px 6px',
          borderRadius: '4px', fontSize: '11px',
        }}>
          Derived
        </span>
      )}

      {usageCount > 1 && (
        <span>Used in {usageCount} places</span>
      )}

      {editCount > 0 && (
        <span>{editCount} edit{editCount > 1 ? 's' : ''}</span>
      )}

      {snippet.metadata.source === 'ai-generated' && (
        <span style={{
          background: '#f3e8ff', color: '#7c3aed', padding: '2px 6px',
          borderRadius: '4px', fontSize: '11px',
        }}>
          AI Generated
        </span>
      )}

      {isFromLibrary && usageCount > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            onClick={onEditInstance}
            style={{
              padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
              background: '#fff', cursor: 'pointer', fontSize: '11px',
            }}
          >
            Edit this only
          </button>
          <button
            onClick={onEditAll}
            style={{
              padding: '2px 8px', border: '1px solid #2563eb', borderRadius: '4px',
              background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: '11px',
            }}
          >
            Edit all instances
          </button>
        </div>
      )}
    </div>
  );
}
