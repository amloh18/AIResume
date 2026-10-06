// Regression guard for the "rail vanishes as you reach for it" bug.
//
// The section rail is revealed by hovering the section (`group-hover/inner`).
// It used to be `position: fixed` and parked *outside* the page, which put a
// dead strip (page margin + gap) between the section and the rail: crossing it
// ended the hover, hid the rail, and `pointer-events: none` made it impossible
// to reach. The fix only holds if the rail stays (a) a DOM descendant of its own
// section, so hover propagates onto the buttons, and (b) in-page/absolute
// rather than a detached fixed overlay.
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { CanvasSnippet, EditableField } from './CoreUI';

const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly />;

beforeAll(() => {
  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('section rail placement', () => {
  it('renders inside its own section (so hover cannot be lost reaching it)', () => {
    const { container } = render(
      <CanvasSnippet
        instance={{ id: 'block-1', type: 'summary-clean' }}
        index={0}
        zoneId="main_page_0"
        cvData={{ summary: 'Hello', sectionTitles: { summary: 'Summary' } }}
        EditableWrapper={ReadOnlyWrapper}
        activeTemplate={{ type: '1-col' }}
        layoutZones={{}}
        moveSnippet={() => {}}
        removeSnippet={() => {}}
        onReplace={() => {}}
        onAddListEntry={() => {}}
        onTogglePhoto={() => {}}
        onOpenSkillsSuggestions={() => {}}
        onMoveToZone={() => {}}
        moveEntry={() => {}}
        deleteEntry={() => {}}
      />
    );

    const rail = container.querySelector('[data-section-rail]');
    expect(rail).not.toBeNull();

    // Same section element -> the hover group that reveals the rail also
    // contains the rail, so moving onto the buttons keeps it open.
    const section = rail!.closest('[data-block-id]');
    expect(section).not.toBeNull();
    expect(section).toBe(container.querySelector('[data-block-id]'));

    // In-page placement, not a detached overlay.
    expect(rail!.className).not.toContain('fixed');
    expect(rail!.className).toContain('absolute');
  });
});
