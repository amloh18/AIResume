/**
 * Guard: no global CSS may give bare <nav> elements a z-index.
 *
 * Bug this prevents (hover card z-index regression): `globals.css` used to carry
 *
 *     nav { position: sticky !important; top: 0 !important; z-index: 1000 !important; ... }
 *
 * which forced EVERY <nav> to z-index 1000. The dashboard header — host of the
 * RecentAppliedJobsHeader hover card and the NotificationCenter popup — is only
 * `z-[60]`, so the JobsDashboard tab bar (a plain <nav>) painted OVER the hover
 * card: tab labels rendered on top of the tooltip (see OptimizedDashboardLayout
 * header vs. JobsDashboard tabs).
 *
 * The rule was removed rather than patched because nothing depended on it:
 * landing CardNav stacks through its own `.card-nav-container` (fixed/999999),
 * marketing navs declare their own `fixed z-50`, the blog TOC declares its own
 * `sticky top-24` (which the legacy rule was overriding), and the sidebar nav
 * never asked for sticky or z-index.
 *
 * Run: npx vitest run src/tests/regression/global-nav-stacking.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

/** Every *.css file under src/, recursive. */
function listCssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listCssFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

/**
 * Strips /* … *\/ comments so prose about `nav { z-index }` (including the
 * explanatory comment in globals.css) cannot match.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Matches a *bare element* `nav` rule — selector must start at a rule boundary
 * (`{ } ; ,` or start of file) so `.card-nav`, `header nav`, `#nav` … do not
 * count — and captures its (flat) body.
 */
const BARE_NAV_RULE = /(?:^|[{};,])\s*nav\s*\{([^{}]*)\}/gm;

function findBareNavZIndex(css: string): boolean {
  const flat = stripComments(css);
  BARE_NAV_RULE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BARE_NAV_RULE.exec(flat)) !== null) {
    if (/\bz-index\b/i.test(match[1])) return true;
  }
  return false;
}

describe('global nav stacking', () => {
  it('no stylesheet gives a bare <nav> rule a z-index', () => {
    const offenders = listCssFiles(path.join(ROOT, 'src'))
      .map((file) => ({ file: path.relative(ROOT, file), css: readFileSync(file, 'utf8') }))
      .filter(({ css }) => findBareNavZIndex(css))
      .map(({ file }) => file);

    expect(offenders, `bare nav rules with z-index found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('JobsDashboard tab bar relies on no z-index of its own', () => {
    const src = read('src/components/dashboard/JobsDashboard.tsx');
    const navLine = src.split('\n').find((line) => line.includes('<nav '));
    expect(navLine, 'JobsDashboard tab nav element not found').toBeTruthy();
    // The tab bar sits below the dashboard header (z-[60]); a z class here
    // would silently re-stack it above the header's hover card / bell popup.
    expect(navLine).not.toMatch(/\bz-\d|z-\[/);
  });

  it('the recent-applied hover card keeps its explicit z-index', () => {
    const src = read('src/components/layout/RecentAppliedJobsHeader.tsx');
    const tooltipLine = src.split('\n').find((line) => line.includes('top-full right-0'));
    expect(tooltipLine, 'hover card element not found').toBeTruthy();
    expect(tooltipLine).toMatch(/z-\[?\d/);
  });
});
