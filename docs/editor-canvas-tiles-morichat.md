# Editor shell: canvas, tile rail, side panels & Mori dock

Status: implemented in `refactor/simple` · Scope: Step 3 (CV builder) layout only.

## Why

The editor used a fixed 60/40 split where the Analysis rail was permanently open and
Mori/Design/Template/JSON swapped into a second rail through a shared portal target.
That made the canvas permanently narrow, hid the "wide document" view entirely, and
left Mori hidden behind a tab. The redesign makes the canvas the default surface and
demotes every utility to a tile on the side plus an always-visible Mori bar.

## Layout

```
┌───────────────────────────────────────────── row (canvas + panel + rail) ──┐
│  canvas column (rounded-2xl)                │  utility panel │ tile rail   │
│  · 1 page  → centered                       │  (60:40 when   │ Analysis    │
│  · 2+ pages → 2-up spread (wide state)      │   a tile is    │ Design      │
│  · zoom controls bottom-right of the canvas │   active)      │ Template    │
└─────────────────────────────────────────────┘                └─ JSON ─────┘
   rail = floating cluster (h-fit / self-start), right of the canvas card
   Mori dock — fixed-height bar; expands upward into an overlay (z above canvas)
```

* **No tile active (wide state)** — canvas takes the full content width. A document
  with 2+ pages renders two pages per row; a single-page document is centered.
  Auto-fit stays "fit by height" and now measures the two-page width so the spread
  always fits (see `CVCanvasEngine.isSpread` / `documentFitWidthPx`).
* The rail is a **floating cluster**: `md:h-fit md:self-start` keeps it hugging its
  four tiles instead of stretching the full row height, so it reads as a detached
  bar in the editor's padding area (same idea as the Mori dock below the canvas)
  rather than a sidebar merged into the canvas frame.
* The rail container is **chrome-less** — no surface, border, backdrop-blur or
  shadow — so the tiles float directly on the editor background. Only the tiles
  carry a surface (`bg-white dark:bg-white/[0.04]`, or emerald when open).
* Tiles are **square (1:1)**: 4.5rem x 4.5rem = 67.5px at this app's 15px root
  font. `RAIL_PX = 80` in `Step3CV` (67.5px tile + 1.5 padding x2) mirrors the
  rail's real width for the 60:40 split — update it if the tile size changes.
* Each tile still shows **all four** of its neighbours when one is open; the rail
  does not collapse or reorder. Closing is the cross badge on the open tile itself.
* **Tile active** — the panel column animates open to ~40% of the usable row width,
  leaving the canvas ~60%. The canvas re-fits continuously during the animation.
  Desktop animates `width` only — the always-`0%` `x` transform in the desktop
  `animate` target was dropped (it changed nothing visually, and an earlier harness
  suggested mixing it with `width` left the column at 0px). The mobile drawer still
  animates `width` + `x`. Note: this could not be re-verified in the browser — the
  preview renderer was suspended for the whole session (rAF never fired, so
  framer-motion could not apply any style at all).
* The active tile shows an **X badge** (springing in at the tile corner) plus an
  emerald ring and a slow sheen; clicking it closes the panel and returns the canvas
  to the wide state.

## Tile design: animated preview tiles

Each rail tile is a mini, live preview of the panel it opens (not just an icon):

| Tile | Preview inside the tile |
| --- | --- |
| Analysis | score donut whose stroke sweeps + three issue bars pulsing in sequence |
| Design | miniature document whose accent block cycles hue, with text lines and colour chips |
| Template | two mini page layouts cross-fading (two-column ↔ single-column) |
| JSON | code lines that type themselves in/out + a blinking caret |

* The preview block is **vertically centred** in the square tile (`.up-pv` is
  absolutely positioned at 50%/50% with `translate(-50%,-50%)` and equal top/bottom
  gaps of 14px at the default size) rather than pinned to the top with a label band
  under it. The caption sits in that bottom band; hover expands from the centred
  transform (`translate(-50%,-50%) scale(1.07)` — keep the translate in any hover
  rule, or the preview jumps to the corner).
* The **cross badge (`.up-close`)** lives on the open tile itself, top-right inside
  the tile at 18px.
* All preview animation is **pure CSS** (scoped keyframes injected by the component,
  `up-` prefix) — no rAF/JS timers, so the previews never re-render the editor and
  honour `prefers-reduced-motion`.
* Tiles stagger in on mount, lift on hover (preview zooms), and are keyboard/AT
  friendly (`role="tablist"` / `role="tab"` / `aria-selected`, plus `title` tooltips).
* Tests: `src/components/resume-enhancer/components/UtilityPanelRail.test.tsx`
  (shape, chrome-less rail, theme surfaces) and
  `src/components/resume-enhancer/panels/MoriChatInterface.test.tsx`
  (the collapsed dock's bring-up chevron).

## Theming

The Step 3 shell uses app tokens instead of hard-coded greys: the editor root is
`--bg-secondary`, the canvas frame `--bg-primary` + `--border-primary`, and the rail /
Mori dock draw on `--bg-secondary`, `--bg-primary` (Mori's input row) and
`--border-primary`, so light and dark match the rest of the dashboard.

### Tailwind v3 gotcha — never write `dark:bg-[var(--token)]/85`

This project is on **Tailwind v3.4**, where an opacity modifier on an arbitrary
`var()` colour emits **no CSS at all** (the `/` suffix can only be resolved for
literal colours; there is no `color-mix` output like v4). A class such as
`dark:bg-[var(--bg-secondary)]/85` therefore silently disappears, the light
`bg-white/85` fallback keeps winning, and the surface stays white in dark mode.
Both the Mori dock and the tile rail shipped with this bug.

Safe patterns for theme surfaces:

| Intent | Use |
| --- | --- |
| Opaque token surface | `dark:bg-[var(--bg-secondary)]` |
| Translucent glass | `bg-white/95 dark:bg-white/[0.04]` (literal `rgba`, or a flat `/NN` on a literal colour) |

`UtilityPanelRail.test.tsx` asserts the rail contains no
`dark:bg-[var(...)]/<opacity>` class so this cannot regress silently.

## Files

| File | Role |
| --- | --- |
| `src/components/resume-enhancer/components/UtilityPanelRail.tsx` | Tile rail (Analysis/Design/Template/JSON). Dispatches the existing window events (`open-analysis-panel`, `set-builder-sidebar`, `open-templates`, `close-utility-panel`). |
| `src/components/resume-enhancer/panels/MoriChatDock.tsx` | Always-visible Mori bar. Animates its height from a 48px bar to a ~50vh overlay (max 520px, down from ~62vh/640px) so the CV stays visible; the overlay is absolutely positioned so it never changes the editor layout. Single `MoriChatInterface` instance is shared by both states. |
| `src/components/resume-enhancer/panels/MoriChatInterface.tsx` | New optional `dock` prop (`{ collapsed, onRequestExpand, onRequestCollapse }`). Collapsed ⇒ renders only the input row; expanded ⇒ header + messages + input (unchanged). Typing or sending in the collapsed bar expands the dock, and the collapsed bar also carries a **chevron-up button** (“Bring up chat”) — without it the only way back into an ongoing conversation was to start typing. Guests get the sign-up bar instead (early return), so they see no chevron. |
| `src/components/resume-enhancer/steps/Step3CV.tsx` | Owns the layout: canvas column, animated panel column (`panelWidthPx` measured from the row), tile rail, Mori dock, mobile drawer + bottom pill. |
| `src/components/cv-builder-pro/CVCanvasEngine.tsx` | `spread` prop → 2-up grid, spread-aware fit width and wrapper width; removed the old in-panel `UtilityPanelPill` headers. |
| `src/components/cv-builder-pro/CVBuilderProAdapter.tsx` | Passes `spread` through. |
| `src/components/resume-enhancer/panels/ATSMeterPanel.tsx` | Removed its `UtilityPanelPill` (the rail replaces it). |
| `src/components/resume-enhancer/components/UtilityPanelPill.tsx` | Deleted. |

## Invariants to preserve

1. **The portal target must always be mounted.** `CVCanvasEngine` resolves
   `#builder-utility-panel-portal` during render, so Step3CV always renders the panel
   container — even when closed — and only animates its width. See
   `docs/plan_fix_side_panels.md` for the original bug this prevents.
2. **One panel element, two forms.** Desktop column and mobile drawer are the *same*
   element (animated `width`/`x`), so the target node keeps its identity when the
   layout crosses the `md` breakpoint.
3. **The Mori overlay never affects layout.** The bar reserves a fixed 48px row; the
   expanded chat is `absolute` + `z-[60]`, i.e. above the canvas.
4. **Open/close semantics.** The rail (and the mobile pill) decide open vs close:
   open events always *open* (`set-builder-sidebar` no longer toggles inside
   `CVCanvasEngine`), closing goes through `close-utility-panel`.

## Related change: dashboard "Needs Attention"

* `NeedsAttentionWidget` now uses the shared dashboard card chrome (`Panel`: 
  `bg-secondary` + `border-primary` + `rounded-xl` + header rule + `dashboard-panel-title`)
  instead of the amber gradient, and items sit on the neutral `--bg-tertiary` surface
  with the type colour kept in the icon.
* It renders directly **below `ProfileAnalyticsPanel`** in both the desktop right rail
  and the mobile reorder container (the full-width copy at the very bottom of the
  root view was removed).
* Tests: `src/components/dashboard/redesigned/NeedsAttentionWidget.test.tsx`.

## Follow-ups / not done

* The same `dark:bg-[var(...)]/<opacity>` pattern still exists in other components
  (e.g. `linkedin-enhancer/page.tsx`, `LinkedInHeroCard`, several `bg-[var(--bg-tertiary)]/N`
  surfaces). They are out of scope for this change but will render light in dark mode;
  worth a dedicated sweep.
* `renderCanvasLayout`'s admin-only `LayoutDebugOverlay` still stacks page markers
  vertically; it is inaccurate in spread mode.
* Spread mode is only used when no panel is open, and only for 2+ page documents.
* Guest-mode step routing is flaky: with `?step=3` / `restoreDraft=true` the container
  restores the step and then something resets `state.currentStep` to 1, so the URL
  sync strips `step`. Reproduced in guest mode only; worth a dedicated pass.
