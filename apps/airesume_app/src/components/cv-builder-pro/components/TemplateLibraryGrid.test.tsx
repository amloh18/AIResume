// Regression test for the blank-CV thumbnail bug: a CV with no content used to
// render a grid of blank white template thumbnails, making the picker useless.
// With `useSampleData`, empty sections fall back to realistic sample content.
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TemplateLibraryGrid } from './TemplateLibraryGrid';
import { EditableField } from './CoreUI';

const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly />;

/** A brand-new CV: keys exist so the merge can detect the emptiness. */
const EMPTY_CV = {
  basics: { name: '', title: '', email: '', summary: '' },
  sectionTitles: {},
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  skills: [],
  languages: [],
  interests: [],
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

describe('TemplateLibraryGrid thumbnail preview data', () => {
  it('renders populated sample content for an empty CV when useSampleData is on', () => {
    render(
      <TemplateLibraryGrid
        cvData={EMPTY_CV}
        useSampleData
        ReadOnlyWrapper={ReadOnlyWrapper}
        onSelect={() => {}}
      />
    );

    // Sample basics name must reach the thumbnails (header snippets read the
    // CanvasContext, so this also covers the provider wiring).
    expect(screen.getAllByText('Alex Morgan').length).toBeGreaterThan(0);
  });

  it('leaves thumbnails untouched by default (Step 2 passes its own data)', () => {
    render(
      <TemplateLibraryGrid
        cvData={EMPTY_CV}
        ReadOnlyWrapper={ReadOnlyWrapper}
        onSelect={() => {}}
      />
    );

    expect(screen.queryByText('Alex Morgan')).toBeNull();
  });
});
