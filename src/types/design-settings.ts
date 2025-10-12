/**
 * Design Settings and Configuration Types
 * Extracted from preview-engine for use across components
 */

// Design settings interface for user controls
export interface DesignSettings {
  // Typography
  fontFamily: string;
  headerSize: number;
  bodySize: number;
  sectionSize: number;
  lineSpacing: number;
  
  // Layout
  textAlignment: 'left' | 'center' | 'right';
  layoutType: 'single-column' | 'two-column';
  
  // Color themes
  colorTheme: 'BlackBlack' | 'Charcoal Black' | 'GrayBlack' | 'Blue Black' | 'custom';
  primaryColor?: string;
  secondaryColor?: string;
  
  // Page settings
  pageSize: 'A4' | 'Letter';
  pagePadding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Section visibility and ordering
export interface SectionConfig {
  order: string[];
  visibility: Record<string, boolean>;
  skillsRenderingStyle: 'chip' | 'inline' | 'bulleted';
}

// Rendered section with calculated height
export interface RenderedSection {
  key: string;
  content: string; // HTML content
  estimatedHeight: number; // in mm
  data: any; // Original data
  styles: any; // Applied styles
  isVisible: boolean;
  column?: 'left' | 'right' | 'main';
}

// Page container with sections
export interface RenderedPage {
  pageNumber: number;
  sections: RenderedSection[];
  totalHeight: number;
  overflow: boolean;
}

// Complete preview result
export interface PreviewResult {
  pages: RenderedPage[];
  totalPages: number;
  totalHeight: number;
  template: any; // ITemplate
  metadata: {
    renderTime: number;
    sectionCount: number;
    itemCount: number;
  };
}

