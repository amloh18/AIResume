import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import UtilityPanelRail from './UtilityPanelRail';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UtilityPanelRail', () => {
  it('renders four preview tiles in a tablist', () => {
    render(<UtilityPanelRail activePanel={null} />);

    const tablist = screen.getByRole('tablist', { name: 'Editor panels' });
    const tabs = screen.getAllByRole('tab');
    expect(tablist).toBeTruthy();
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Analysis',
      'Design',
      'Template',
      'JSON',
    ]);

    // Every tile carries a mini preview of the panel it opens.
    tabs.forEach((tab) => {
      expect(tab.querySelector('.up-pv')).toBeTruthy();
      expect(tab.querySelector('.up-label')).toBeTruthy();
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });
  });

  it('keeps the rail chrome-less and the tiles theme-aware', () => {
    // The rail container has no surface of its own — the tiles float on the
    // editor background. Regression guard: `dark:bg-[var(--bg-secondary)]/85`
    // compiles to nothing in Tailwind v3 (an opacity modifier cannot be applied
    // to an arbitrary `var()` colour), so the light `bg-white/85` fallback used
    // to leak into dark mode.
    const { container } = render(<UtilityPanelRail activePanel={null} />);
    const rail = container.querySelector('[role="tablist"]') as HTMLElement;
    const tiles = rail.querySelectorAll('[role="tab"]');

    expect(rail.className).not.toMatch(/\bbg-/);
    tiles.forEach((tile) => {
      expect(tile.className).toContain('bg-[#f3f2ee]');
      expect(tile.className).toContain('dark:bg-[#1a1a1a]');
    });
    // No `dark:bg-[var(--…)]/<opacity>` anywhere — that variant never emits CSS.
    expect(container.innerHTML).not.toMatch(/dark:bg-\[var\(--[^\]]+\)\]\//);
  });

  it('renders bigger square (1:1) tiles', () => {
    const { container } = render(<UtilityPanelRail activePanel={null} />);
    const tile = container.querySelector('[role="tab"]') as HTMLElement;
    expect(tile.className).toContain('w-[4.5rem]');
    expect(tile.className).toContain('h-[4.5rem]');
  });

  it('injects the scoped animation styles', () => {
    const { container } = render(<UtilityPanelRail activePanel={null} />);
    const css = container.querySelector('style')?.textContent || '';
    expect(css).toContain('.up-tile');
    expect(css).toContain('@keyframes up-in');
    expect(css).toContain('@keyframes up-gauge');
    expect(css).toContain('prefers-reduced-motion');
  });

  it('dispatches the existing panel-open events', () => {
    const analysis = vi.fn();
    const templates = vi.fn();
    const sidebar = vi.fn();
    window.addEventListener('open-analysis-panel', analysis);
    window.addEventListener('open-templates', templates);
    window.addEventListener('set-builder-sidebar', sidebar);

    render(<UtilityPanelRail activePanel={null} />);

    fireEvent.click(screen.getByRole('tab', { name: /analysis/i }));
    fireEvent.click(screen.getByRole('tab', { name: /template/i }));
    fireEvent.click(screen.getByRole('tab', { name: /^json/i }));
    fireEvent.click(screen.getByRole('tab', { name: /design/i }));

    expect(analysis).toHaveBeenCalledTimes(1);
    expect(templates).toHaveBeenCalledTimes(1);
    // JSON opens the data sidebar, Design opens the design sidebar.
    expect(sidebar).toHaveBeenCalledTimes(2);
    expect((sidebar as any).mock.calls.map(([e]: [CustomEvent]) => e.detail)).toEqual([
      'data',
      'design',
    ]);

    window.removeEventListener('open-analysis-panel', analysis);
    window.removeEventListener('open-templates', templates);
    window.removeEventListener('set-builder-sidebar', sidebar);
  });

  it('carries the mobile-only step tiles and dispatches the step events', () => {
    // These replaced a separate floating pill that overlapped this rail on
    // small screens, so they must live in the rail and stay mobile-only.
    const back = vi.fn();
    const next = vi.fn();
    window.addEventListener('editor-back-step', back);
    window.addEventListener('editor-next-step', next);

    render(<UtilityPanelRail activePanel={null} />);

    const prevTile = screen.getByRole('button', { name: 'Previous step' });
    const nextTile = screen.getByRole('button', { name: 'Next step' });
    expect(prevTile.className).toContain('md:hidden');
    expect(nextTile.className).toContain('md:hidden');
    expect(prevTile.className).toContain('w-[4.5rem]');

    fireEvent.click(prevTile);
    fireEvent.click(nextTile);
    expect(back).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);

    window.removeEventListener('editor-back-step', back);
    window.removeEventListener('editor-next-step', next);
  });

  it('closes when the active tile is clicked again', () => {
    const close = vi.fn();
    window.addEventListener('close-utility-panel', close);

    render(<UtilityPanelRail activePanel="design" />);
    const designTab = screen.getByRole('tab', { name: /design/i });
    expect(designTab.getAttribute('aria-selected')).toBe('true');
    // Active tile shows its close affordance.
    expect(designTab.querySelector('.up-close')).toBeTruthy();

    fireEvent.click(designTab);
    expect(close).toHaveBeenCalledTimes(1);

    window.removeEventListener('close-utility-panel', close);
  });
});
