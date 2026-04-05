'use client';

import React from 'react';
import type { ReconciliationResult } from '@/types/binding';

interface TemplateSwitchDialogProps {
  newTemplateName: string;
  reconciliation: ReconciliationResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TemplateSwitchDialog({
  newTemplateName,
  reconciliation,
  onConfirm,
  onCancel,
}: TemplateSwitchDialogProps) {
  const { orphaned, empty, warnings } = reconciliation;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '500px',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Switch to "{newTemplateName}"?
          </h3>
        </div>

        <div style={{ padding: '20px 24px', maxHeight: '400px', overflow: 'auto' }}>
          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#d97706' }}>
                Changes
              </h4>
              {warnings.map((w, i) => (
                <div key={i} style={{
                  padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '6px', marginBottom: '4px', fontSize: '13px', color: '#92400e',
                }}>
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Orphaned */}
          {orphaned.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                Orphaned ({orphaned.length})
              </h4>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280' }}>
                These snippets have no compatible slot in the new template.
              </p>
              {orphaned.map((o) => (
                <div key={o.snippetId} style={{
                  padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '6px', marginBottom: '4px', fontSize: '13px',
                }}>
                  {o.snippetType}: {o.reason}
                </div>
              ))}
            </div>
          )}

          {/* Empty Required Slots */}
          {empty.filter((e) => e.slotDefinition.required).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#d97706' }}>
                Required Slots Empty
              </h4>
              {empty.filter((e) => e.slotDefinition.required).map((e) => (
                <div key={e.slotId} style={{
                  padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '6px', marginBottom: '4px', fontSize: '13px',
                }}>
                  {e.slotDefinition.label} — needs content
                </div>
              ))}
            </div>
          )}

          {/* All good */}
          {warnings.length === 0 && orphaned.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#059669' }}>
              All content will transfer smoothly.
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          padding: '16px 24px', borderTop: '1px solid #e5e7eb',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
              background: '#fff', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: '6px',
              background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Switch Template
          </button>
        </div>
      </div>
    </div>
  );
}
