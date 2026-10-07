// Regression guards for the merged section rail and the section frame.
//
// The rail is ONE bar that floats above the section being edited and carries both
// that section's actions and the focused field's formatting. Two things here are
// easy to break and painful to notice:
//
//  1. The section's controls must render INTO the rail (portal), not beside the
//     section — there is one place to look for them, and it travels with the
//     section the user is working on.
//  2. The selected section's frame must sit OUTSIDE the section's own box, so its
//     2px border cannot land on the text. It stays absolutely positioned, so the
//     extra room it needs costs the document nothing (no reflow).
import { describe, it, expect, beforeAll } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  CanvasSnippet,
  CanvasToolRail,
  CanvasContext,
  SnippetContext,
  EditableField,
  TOOLRAIL_FORMAT_SLOT,
  TOOLRAIL_SECTION_SLOT,
  TOOLRAIL_BTN,
  TOOLRAIL_GAP_PX,
  TOOLRAIL_EDGE_X_PX,
  TOOLRAIL_EDGE_Y_PX,
  TOOLRAIL_SURFACE,
  SECTION_FRAME_INSET_X,
  SECTION_FRAME_INSET_Y,
  ENTRY_RAIL_GAP_PX,
  ENTRY_RAIL_EDGE_X_PX,
  computeToolRailPosition,
  computeEntryRailPosition,
} from './CoreUI';
import ListEntry from './ListEntry';

const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly />;

const snippetProps = () => ({
  instance: { id: 'block-1', type: 'summary-clean' },
  index: 0,
  zoneId: 'main_page_0',
  cvData: { summary: 'Hello', sectionTitles: { summary: 'Summary' } },
  EditableWrapper: ReadOnlyWrapper,
  activeTemplate: { type: '1-col' },
  layoutZones: {},
  moveSnippet: () => {},
  removeSnippet: () => {},
  onReplace: () => {},
  onAddListEntry: () => {},
  onTogglePhoto: () => {},
  onOpenSkillsSuggestions: () => {},
  onMoveToZone: () => {},
  moveEntry: () => {},
  deleteEntry: () => {},
});

/** The selection context a clicked section runs under. */
const selectedContext = {
  selectedBlockId: 'block-1',
  setSelectedBlockId: () => {},
  design: {},
  pageAssignments: {},
};

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
  it('is an overlay that reserves no layout height, and keeps its portal slots mounted while hidden', () => {
    const { container } = render(<CanvasToolRail selectedBlockId={null} />);
    const rail = container.querySelector('[data-canvas-toolrail]') as HTMLElement;

    expect(rail).not.toBeNull();
    // Absolutely positioned inside the canvas workspace -> it floats above the
    // section instead of taking a row of its own (which lightened the auto-fit
    // budget), and never becomes a detached `fixed` strip.
    expect(rail.className).toContain('absolute');
    expect(rail.className).not.toContain('fixed');

    // Nothing selected / nothing focused -> hidden. It stays MOUNTED, because
    // the focused field's formatting group and the section's controls portal into
    // these two slots; unmounting them would strand those portals.
    expect(rail.className).toContain('invisible');
    expect(document.getElementById(TOOLRAIL_FORMAT_SLOT)).not.toBeNull();
    expect(document.getElementById(TOOLRAIL_SECTION_SLOT)).not.toBeNull();
  });

  it('ports the selected section\'s controls into the rail, not beside the section', async () => {
    const { container } = render(
      <CanvasContext.Provider value={selectedContext}>
        {/* Mirrors the editor shell: the rail lives inside the canvas workspace,
            which is the scroll container the sections are anchored in. */}
        <div data-cv-workspace>
          <CanvasToolRail selectedBlockId="block-1" />
          <CanvasSnippet {...snippetProps()} />
        </div>
      </CanvasContext.Provider>
    );

    await waitFor(() => {
      expect(
        document.getElementById(TOOLRAIL_SECTION_SLOT)?.querySelector('[data-section-rail]')
      ).not.toBeNull();
    });

    // The controls are in the rail and nowhere inside the section itself.
    expect(container.querySelector('[data-block-id] [data-section-rail]')).toBeNull();
  });
});

/* ── The placement maths of the floating rail ──────────────────────────────
 * Deterministic rects, no browser: the canvas workspace starts at y=100 and is
 * 600 tall, the bar is 40 high and 200 wide, and the section is 400 wide. */
const HOST = { top: 100, bottom: 700, left: 100, width: 800, clientWidth: 800, scrollTop: 0, scrollLeft: 0 };
const BAR = { barWidth: 200, barHeight: 40 };
const anchorYielding = (top: number, left = 300, width = 400) => ({
  anchor: { top, bottom: top + 200, left, width },
  host: { ...HOST },
  ...BAR,
});

describe('floating rail placement', () => {
  it('hangs above the section, clear of its frame, centred on it', () => {
    const pos = computeToolRailPosition(anchorYielding(400))!;
    // Section top (400) - host top (100) = 300 in content space; the bar's bottom
    // then sits GAP_PX above the section instead of on its border.
    expect(pos.top).toBe(300 - TOOLRAIL_GAP_PX - BAR.barHeight);
    expect(pos.top + BAR.barHeight + TOOLRAIL_GAP_PX).toBe(300);
    // Centred on the section: its centre in content space (anchor left 300 - host
    // left 100 + half of 400) minus half the bar.
    const sectionCentre = 300 - HOST.left + 400 / 2;
    expect(pos.left).toBe(sectionCentre - BAR.barWidth / 2);
  });

  it('accounts for how far the canvas is scrolled', () => {
    const scrolled = { ...anchorYielding(400), host: { ...HOST, scrollTop: 250 } };
    const pos = computeToolRailPosition(scrolled)!;
    // Same screen position -> same content position once the scroll is added back.
    expect(pos.top).toBe(300 - TOOLRAIL_GAP_PX - BAR.barHeight + 250);
  });

  it('pins to the canvas top — still clear of the section — when there is no room above', () => {
    // The section top sits 50px below the visible top and the bar needs 14 + 40
    // px above it, so there is nowhere to hang it. It pins to the edge instead,
    // with its bottom still above the section's text.
    const sectionTop = 50;
    const pos = computeToolRailPosition(anchorYielding(HOST.top + sectionTop))!;
    expect(pos.top).toBe(TOOLRAIL_EDGE_Y_PX);
    expect(pos.top + BAR.barHeight).toBeLessThanOrEqual(sectionTop);
  });

  it('pins to the visible top edge once the section has scrolled past it', () => {
    // Section top above the visible band, its bottom still on screen. Only pinning
    // is possible here — the bar covers the section's first line, which is
    // unavoidable: the section is closer to the edge than the bar is tall.
    const pos = computeToolRailPosition(anchorYielding(HOST.top - 20))!;
    expect(pos.top).toBe(TOOLRAIL_EDGE_Y_PX);
  });

  it('hides instead of parking at the edge when the section is scrolled out of view', () => {
    expect(computeToolRailPosition(anchorYielding(-260))).toBeNull();              // above the canvas
    expect(computeToolRailPosition(anchorYielding(760))).toBeNull();               // below the canvas
    expect(computeToolRailPosition(anchorYielding(HOST.top - 20))).not.toBeNull(); // partly visible
  });

  it('stays inside the visible band when the bar is wider than the room available', () => {
    const wide = { ...anchorYielding(400, 100, 400), barWidth: 900 };
    const pos = computeToolRailPosition(wide)!;
    expect(pos.left).toBe(TOOLRAIL_EDGE_X_PX);

    const narrow = { ...anchorYielding(400, 700, 180), barWidth: 120 };
    const pos2 = computeToolRailPosition(narrow)!;
    expect(pos2.left + narrow.barWidth).toBeLessThanOrEqual(HOST.clientWidth - TOOLRAIL_EDGE_X_PX);
  });
});

describe('section frame padding', () => {
  it('keeps the selected frame clear of the text without reflowing the section', () => {
    const { container } = render(
      <CanvasContext.Provider value={selectedContext}>
        <CanvasSnippet {...snippetProps()} />
      </CanvasContext.Provider>
    );

    const frame = container.querySelector('[data-section-frame]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.dataset.sectionFrame).toBe('selected');

    // Outward on both axes — that is the "padding" between the border and the
    // text. It is absolutely positioned, so the section box never changes size
    // and no line of the CV moves.
    expect(frame.className).toContain('absolute');
    expect(frame.style.top).toBe(`-${SECTION_FRAME_INSET_Y}px`);
    expect(frame.style.bottom).toBe(`-${SECTION_FRAME_INSET_Y}px`);
    expect(frame.style.left).toBe(`-${SECTION_FRAME_INSET_X}px`);
    expect(frame.style.right).toBe(`-${SECTION_FRAME_INSET_X}px`);
    expect(SECTION_FRAME_INSET_X).toBeGreaterThan(0);
    expect(SECTION_FRAME_INSET_Y).toBeGreaterThan(0);

    // The section itself carries no padding of its own; all of the room comes
    // from the frame growing outward.
    const section = container.querySelector('[data-block-id]') as HTMLElement;
    expect(section.style.padding).toBe('');
    expect(section.style.paddingTop).toBe('');
  });

  it('is not width-clamped by the CV stylesheet, which would drop the right inset', () => {
    // `#cv-document-root.cv-document * { max-width: 100% }` caps an element at
    // its containing block. On a frame that stretches between left AND right
    // insets that clamp removes the trailing inset, so the left/top/bottom sides
    // kept their padding and the right border landed on the text. The inline
    // `max-width` is what outranks it.
    const { container } = render(
      <CanvasContext.Provider value={selectedContext}>
        <CanvasSnippet {...snippetProps()} />
      </CanvasContext.Provider>
    );
    const frame = container.querySelector('[data-section-frame]') as HTMLElement;
    expect(frame.style.maxWidth).toBe('none');
  });
});

describe('entry rail', () => {
  // Mirrors the editor shell: the entry sits on the sheet, and the rail portals
  // OUT of it into the canvas workspace around it.
  //
  // The entry must be inside a SnippetContext whose `blockId` matches the
  // context's `selectedBlockId` — that pair is what says "this entry's section
  // is the focused object", and the rail is a focus-mode control. Hover alone
  // no longer opens it (see the last test in this block).
  const renderEntry = (selectedBlockId: string | null = 'block-1') =>
    render(
      <CanvasContext.Provider value={{ ...selectedContext, selectedBlockId }}>
        <SnippetContext.Provider value={{ blockId: 'block-1', pageIdx: 0, pageAssignments: {} }}>
          <div data-cv-workspace>
            <ListEntry collection="experience" index={0} moveEntry={() => {}} deleteEntry={() => {}}>
              <span>An entry</span>
            </ListEntry>
          </div>
        </SnippetContext.Provider>
      </CanvasContext.Provider>
    );

  const railOf = async (container: HTMLElement) => {
    const rail = await waitFor(() => {
      const el = container.querySelector('[data-entry-rail]') as HTMLElement;
      expect(el).not.toBeNull();
      return el;
    });
    return rail;
  };

  it('uses the same pill surface and button chrome as the top rail', async () => {
    const { container } = renderEntry();
    const rail = await railOf(container);

    // Same surface string as the merged top rail -> the two cannot drift apart.
    expect(rail.className).toContain(TOOLRAIL_SURFACE);
    expect(rail.className).toContain('absolute');
    const buttons = [...rail.querySelectorAll('button')];
    expect(buttons).toHaveLength(3);
    buttons.forEach((btn) => expect(btn.className).toContain(TOOLRAIL_BTN));
  });

  it('renders into the canvas workspace instead of inside the sheet', async () => {
    const { container } = renderEntry();
    const workspace = container.querySelector('[data-cv-workspace]') as HTMLElement;
    const rail = await railOf(container);

    // THE fix. As a child of the entry the rail was a descendant of `.cv-page`
    // (`overflow: hidden`) and of the `scale(zoom)` canvas content, so the sheet
    // sliced it, the zoom multiplied it, and at high zoom it landed in the
    // workspace's unreachable left overhang — there was no scroll position that
    // revealed it. A portal to the workspace puts it in the same coordinate space
    // the merged top rail already uses.
    expect(rail.parentElement).toBe(workspace);
    // `data-collection` rather than `data-entry-id`: the id comes from cvData,
    // which this fixture does not carry, and React drops an undefined attribute.
    expect((container.querySelector('[data-collection]') as HTMLElement).contains(rail)).toBe(false);
  });

  it('is armed by focus mode, and only then by hover', async () => {
    const { container } = renderEntry();
    const entry = container.querySelector('[data-collection]') as HTMLElement;
    const rail = await railOf(container);

    expect(rail.className).toContain('opacity-0');
    expect(rail.className).toContain('pointer-events-none');

    // Visibility is React state, not CSS `group-hover`: the rail is no longer in
    // the entry's subtree, so a descendant selector could never reach it.
    fireEvent.mouseEnter(entry);
    await waitFor(() => {
      expect((container.querySelector('[data-entry-rail]') as HTMLElement).className).toContain('opacity-100');
    });
  });

  it('does NOT open on hover while the entry\'s section is not the focused object', async () => {
    // The behaviour that changed: hover is a passive preview (the section outline
    // plus a border on the entry under the pointer). A floating control cluster
    // for whatever the pointer crossed was the "scattered overlay" complaint, so
    // the rail is gated on `selectedBlockId` matching the entry's own block — and
    // while it is not, the portal is not rendered at all.
    const { container } = renderEntry('some-other-block');
    const entry = container.querySelector('[data-collection]') as HTMLElement;

    fireEvent.mouseEnter(entry);
    await new Promise((r) => setTimeout(r, 60));
    expect(container.querySelector('[data-entry-rail]')).toBeNull();

    // …and it is armed the moment the section takes the focus, without the
    // pointer having to move.
    expect(entry.className).toContain('hover:border-emerald-300/80');
  });

  it('shows a hover border, and keeps the 1px it needs reserved', async () => {
    // The other half of "hover just shows the section around it and the hover
    // entries border": a 2%-opacity wash was invisible on paper, so hovering an
    // entry gave no answer to "which entry am I on?". The base class reserves the
    // 1px with `border-transparent`, so the hover colour cannot reflow the CV.
    const { container } = renderEntry();
    const entry = container.querySelector('[data-collection]') as HTMLElement;

    expect(entry.className).toContain('border-transparent');
    expect(entry.className).toContain('hover:border-emerald-300/80');
  });
});

describe('computeEntryRailPosition', () => {
  const host = {
    top: 0, bottom: 800, left: 0, width: 1000,
    clientWidth: 1000, clientHeight: 800, scrollTop: 0, scrollLeft: 0,
  };
  const anchor = { top: 300, bottom: 400, left: 200, width: 600 };

  it('hangs off the entry\'s left edge when there is room', () => {
    const pos = computeEntryRailPosition({ anchor, host, railWidth: 36, railHeight: 96 })!;
    expect(pos.left).toBe(200 - ENTRY_RAIL_GAP_PX - 36);
    // Vertically centred on the entry.
    expect(pos.top).toBe(300 + 50 - 48);
    // The invariant that keeps it clear of the focus frame rather than landing on
    // the very frame that is meant to be the focus indicator.
    expect(ENTRY_RAIL_GAP_PX).toBeGreaterThan(SECTION_FRAME_INSET_X);
  });

  it('clamps into the visible band rather than running off the left edge', () => {
    // An entry pushed past the canvas' left edge — high zoom, page wider than the
    // workspace. Unclamped this is a negative left, and because the workspace
    // centres an overflowing flex item, `scrollLeft` can never go below 0: no
    // scroll position reveals it. Clamping is what makes the rail an overlay.
    const pos = computeEntryRailPosition({
      anchor: { ...anchor, left: -120 }, host, railWidth: 36, railHeight: 96,
    })!;
    expect(pos.left).toBe(ENTRY_RAIL_EDGE_X_PX);
    expect(pos.left).toBeGreaterThanOrEqual(0);
  });

  it('clamps the right edge too', () => {
    const pos = computeEntryRailPosition({
      anchor: { ...anchor, left: 2000 }, host, railWidth: 36, railHeight: 96,
    })!;
    expect(pos.left).toBe(1000 - 36 - ENTRY_RAIL_EDGE_X_PX);
  });

  it('returns a value in the container\'s own space, not screen space', () => {
    // The trap this pins: an absolutely positioned child's `left` is measured
    // from its containing block's PADDING box, so the value assigned paints at
    // `host.left + left - host.scrollLeft` on screen. A non-zero `host.left` is
    // what makes the difference visible — with `host.left: 0` the two spaces
    // coincide and a regression here is invisible to every other test.
    const offsetHost = { ...host, left: 11, scrollLeft: 7 };
    const pos = computeEntryRailPosition({
      anchor: { ...anchor, left: 82 }, host: offsetHost, railWidth: 36, railHeight: 96,
    })!;
    expect(pos.left).toBe(82 - 11 + 7 - ENTRY_RAIL_GAP_PX - 36);
    // …which is what makes the rail paint 10px clear of the entry's left edge.
    const paintedScreenX = offsetHost.left + pos.left - offsetHost.scrollLeft;
    expect(paintedScreenX).toBe(82 - ENTRY_RAIL_GAP_PX - 36);
    expect(paintedScreenX + 36).toBe(82 - ENTRY_RAIL_GAP_PX);
  });

  it('travels with the scroll offset', () => {
    const pos = computeEntryRailPosition({
      anchor, host: { ...host, scrollTop: 200, scrollLeft: 300 }, railWidth: 36, railHeight: 96,
    })!;
    expect(pos.left).toBe(200 - ENTRY_RAIL_GAP_PX - 36 + 300);
    expect(pos.top).toBe(300 + 50 - 48 + 200);
  });

  it('reports nothing when the entry is scrolled out of view', () => {
    const pos = computeEntryRailPosition({
      anchor: { ...anchor, top: 900, bottom: 1000 }, host, railWidth: 36, railHeight: 96,
    });
    expect(pos).toBeNull();
  });

  it('clamps vertically for an entry taller than the canvas', () => {
    // A long job with many bullets: its centre is below the fold even though most
    // of it is visible, so an unclamped rail would sit off-screen.
    const pos = computeEntryRailPosition({
      anchor: { top: 700, bottom: 1600, left: 200, width: 600 }, host, railWidth: 36, railHeight: 96,
    })!;
    expect(pos.top).toBe(800 - 96 - TOOLRAIL_EDGE_Y_PX);
  });
});

