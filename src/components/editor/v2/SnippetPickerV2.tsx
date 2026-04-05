'use client';

import React, { useState, useMemo } from 'react';
import type { SlotDefinition } from '@/types/template-v2';
import type { SnippetV2, SnippetType } from '@/types/snippet-v2';
import { SnippetService } from '@/lib/services/snippet-service';
import { isSnippetCompatibleWithSlot } from '@/lib/templates/v2/slot-compatibility';

interface SnippetPickerV2Props {
  slot: SlotDefinition;
  userId: string;
  onSelect: (snippet: SnippetV2) => void;
  onClose: () => void;
  librarySnippets?: SnippetV2[];
  aiSuggestions?: SnippetV2[];
}

export function SnippetPickerV2({
  slot,
  userId,
  onSelect,
  onClose,
  librarySnippets = [],
  aiSuggestions = [],
}: SnippetPickerV2Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'mine' | 'library' | 'ai'>('mine');

  const userSnippets = useMemo(() => {
    const all = SnippetService.getUserSnippets(userId);
    return all.filter((s) => isSnippetCompatibleWithSlot(s.type, slot));
  }, [userId, slot]);

  const filteredLibrary = useMemo(() => {
    return librarySnippets.filter((s) =>
      isSnippetCompatibleWithSlot(s.type, slot) &&
      (!search || JSON.stringify(s.content).toLowerCase().includes(search.toLowerCase()))
    );
  }, [librarySnippets, slot, search]);

  const tabSnippets = activeTab === 'mine' ? userSnippets
    : activeTab === 'library' ? filteredLibrary
    : aiSuggestions;

  function getSnippetPreview(snippet: SnippetV2): string {
    const c = snippet.content as any;
    switch (snippet.type) {
      case 'header': return c.name || 'Untitled';
      case 'summary': return (c.text || '').slice(0, 80);
      case 'experience': return `${c.position} at ${c.company}`;
      case 'education': return `${c.studyType} in ${c.area} — ${c.institution}`;
      case 'skills': return `${c.category}: ${(c.skills || []).slice(0, 3).join(', ')}`;
      case 'project': return c.name;
      case 'certification': return `${c.name} — ${c.issuer}`;
      case 'language': return `${c.language} (${c.fluency})`;
      default: return snippet.type;
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '600px', maxHeight: '80vh',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Add to {slot.label}
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
              ×
            </button>
          </div>
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', marginTop: '12px',
              border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px',
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['mine', 'library', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px', border: 'none', background: activeTab === tab ? '#f9fafb' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400, fontSize: '13px',
              }}
            >
              {tab === 'mine' ? 'My Snippets' : tab === 'library' ? 'Library' : 'AI Suggestions'}
              <span style={{ marginLeft: '4px', color: '#9ca3af', fontSize: '12px' }}>
                ({tab === 'mine' ? userSnippets.length : tab === 'library' ? filteredLibrary.length : aiSuggestions.length})
              </span>
            </button>
          ))}
        </div>

        {/* Snippet List */}
        <div style={{ maxHeight: '400px', overflow: 'auto', padding: '8px' }}>
          {tabSnippets.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
              {activeTab === 'mine' ? 'No snippets yet. Create one by editing content.' :
               activeTab === 'library' ? 'No matching library snippets.' :
               'No AI suggestions available.'}
            </div>
          ) : (
            tabSnippets.map((snippet) => (
              <button
                key={snippet.id}
                onClick={() => onSelect(snippet)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 16px', border: '1px solid #e5e7eb',
                  borderRadius: '8px', marginBottom: '6px', cursor: 'pointer',
                  background: '#fff', transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#f0f9ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
              >
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{getSnippetPreview(snippet)}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {snippet.type} · {snippet.metadata.source || 'user'}
                  {snippet.lineage.parentSnippetId && ' · derived'}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
