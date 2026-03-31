/**
 * Template Renderer Service
 * 
 * Provides abstraction layer for template rendering with dependency injection support.
 * Supports multiple rendering engines and makes it easy to swap rendering implementations.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import React from 'react';
// Use dynamic import for react-dom/server to avoid Next.js App Router issues
// import { renderToString } from 'react-dom/server';
import { TemplateRenderer } from '@/lib/templates/template-renderer';
import { cacheManager } from '@/lib/cache/cache-manager';
import { configService } from './configService';
import { PerformanceMonitor } from '@/lib/monitoring';
import { logger } from '@/lib/structured-logger';
import { generatePageBreakCSS } from '@/lib/utils/pageBreakHelper';
import crypto from 'crypto';

// Ensure React is available in global scope for SSR
if (typeof window === 'undefined') {
  // @ts-ignore - Global React for SSR
  global.React = React;
}

export interface RenderOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  customStyles?: React.CSSProperties;
}

export interface IRenderer {
  renderToHTML(cvData: UnifiedCVDataStructure, template: ITemplate, options?: RenderOptions): Promise<string>;
}

/**
 * Default React-based renderer using TemplateRenderer component
 */
export class ReactTemplateRenderer implements IRenderer {
  async renderToHTML(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: RenderOptions = {}
  ): Promise<string> {
    return PerformanceMonitor.timeOperation('templateRenderer.renderToHTML', async () => {
      const config = configService.getTemplateConfig();

      // Generate cache key
      const cacheKey = this.generateCacheKey(cvData, template, options);

      // Check cache first
      const cached = await cacheManager.get<string>(cacheKey);
      if (cached) {
        logger.performance('templateRenderer.renderToHTML', 0, {
          cached: true,
          templateId: template?.id || template?._id
        });
        return cached;
      }

      try {
        // Validate inputs
        if (!template) {
          throw new Error('Template is required but was not provided');
        }
        if (!cvData) {
          throw new Error('CV data is required but was not provided');
        }

        // Ensure React is available - use the already imported React
        // Verify React is not null
        if (!React || typeof React.createElement !== 'function') {
          throw new Error('React is not properly initialized in server context');
        }

        // Dynamically import renderToString to avoid Next.js App Router build issues
        const { renderToString } = await import('react-dom/server');

        // Verify renderToString is available
        if (!renderToString || typeof renderToString !== 'function') {
          throw new Error('renderToString is not available from react-dom/server');
        }

        // Render the component to HTML string using server-safe wrapper
        // This ensures React is properly initialized before hooks are called
        const htmlString = renderToString(
          React.createElement(TemplateRenderer, {
            cvData,
            template,
            sectionOrder: options.sectionOrder,
            sectionVisibility: options.sectionVisibility,
            customStyles: options.customStyles,
            className: 'cv-download-render'
          })
        );

        // ATS-friendly font validation - ensure standard fonts (Arial, Calibri, Helvetica, Roboto)
        const templateFont = template?.globalStyles?.fontFamily || 'Calibri, Arial, Helvetica, Roboto, sans-serif';

        // Validate font is ATS-friendly (standard fonts only)
        const standardFonts = ['Arial', 'Calibri', 'Helvetica', 'Roboto', 'Times New Roman', 'Georgia'];
        const hasStandardFont = standardFonts.some(font =>
          templateFont.toLowerCase().includes(font.toLowerCase())
        );

        if (!hasStandardFont) {
          logger.warn('Template uses non-standard font, falling back to Arial for ATS compatibility');
        }

        // Use standard font with fallbacks for ATS compatibility
        const atsFontFamily = hasStandardFont
          ? templateFont
          : `Arial, Calibri, Helvetica, Roboto, ${templateFont}`;

        // Wrap in full HTML document with ATS-friendly styles and metadata
        // Determine page dimensions based on paper size
        const pageWidth = options.paperSize === 'Letter' ? '8.5in' : '210mm';
        const pageHeight = options.paperSize === 'Letter' ? '11in' : '297mm';

        // Set consistent margins for all templates to avoid double padding
        // Custom renderers will have their padding REMOVED in print mode
        const pageMarginTop = '12mm';
        const pageMarginRight = '15mm';
        const pageMarginBottom = '12mm';
        const pageMarginLeft = '15mm';

        const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Professional CV/Resume">
  <!-- ATS-friendly metadata -->
  <meta name="format-detection" content="telephone=yes">
  <style>
    /* Critical: Define page size for PDF generation with proper print margins */
    @page {
      size: ${pageWidth} ${pageHeight};
      margin: ${pageMarginTop} ${pageMarginRight} ${pageMarginBottom} ${pageMarginLeft};
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: ${pageWidth};
      min-height: ${pageHeight};
      height: auto;
      overflow: visible;
    }
    
    body {
      font-family: ${atsFontFamily}, sans-serif;
      font-size: ${template?.globalStyles?.fontSize || '11pt'};
      line-height: ${template?.globalStyles?.lineHeight || '1.2'};
      background-color: ${template?.globalStyles?.backgroundColor || '#ffffff'};
      color: ${template?.globalStyles?.primaryColor || '#000000'};
      /* Ensure text is selectable for ATS parsing */
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      /* Remove body padding for print - margins handled by @page */
      padding: 0;
      margin: 0;
    }
    
    .cv-container {
      width: 100%;
      min-height: ${pageHeight};
      height: auto;
      overflow: visible;
      padding: 0;
      margin: 0;
      background: white;
      /* Single-column layout for ATS compatibility */
      display: block;
    }
    
    /* Ensure standard section headers are identifiable */
    h1, h2, h3, h4, h5, h6 {
      font-family: ${atsFontFamily}, sans-serif;
      font-weight: bold;
    }
    
    /* Prevent text in images (ATS can't read image text) */
    img {
      alt: attr(alt);
    }
    
    /* Page break control for multi-page CVs */
    .section-content {
      page-break-inside: auto;
      break-inside: auto;
    }
    
    /* Ensure minimum font size for ATS compatibility (Edge Case #41) */
    body, p, li, span {
      font-size: ${Math.max(10, parseInt(template?.globalStyles?.fontSize || '11pt'))}pt;
    }
    
    @media print {
      html, body {
        width: ${pageWidth};
        height: auto !important;
        overflow: visible !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      
      .cv-container {
        width: 100%;
        max-width: ${pageWidth};
        padding: 0 !important;
        margin: 0 !important;
        height: auto !important;
        overflow: visible !important;
        display: block !important;
      }
      
      /* Ensure text remains selectable in print */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      /* Prevent orphans and widows */
      p, li {
        orphans: 3;
        widows: 3;
      }
    }
    
    /* ========================================
     * EDITOR UI HIDING - PDF/DOCX EXPORT
     * Hide all editor controls for clean export
     * ======================================== */
    .pdf-export .cv-drag-handle,
    .pdf-export .cv-drag-overlay,
    .pdf-export .inline-add-section-button,
    .pdf-export .section-hover-controls,
    .pdf-export .cv-editor-only,
    .pdf-export .cv-section-drag-overlay,
    .pdf-export .cv-drop-zone-indicator,
    .docx-export .cv-drag-handle,
    .docx-export .cv-drag-overlay,
    .docx-export .inline-add-section-button,
    .docx-export .section-hover-controls,
    .docx-export .cv-editor-only,
    .docx-export .cv-section-drag-overlay,
    .docx-export .cv-drop-zone-indicator {
      display: none !important;
      visibility: hidden !important;
    }
    
    .pdf-export [data-draggable-section],
    .docx-export [data-draggable-section] {
      cursor: default !important;
    }
    
    .pdf-export [data-draggable-section]:hover,
    .docx-export [data-draggable-section]:hover {
      outline: none !important;
      box-shadow: none !important;
    }
    
    /* ========================================
     * TEMPLATE-SPECIFIC PADDING REMOVAL
     * Remove internal padding from templates to avoid double padding with @page margins
     * The @page rule provides 12mm/15mm margins, so templates should have 0 internal padding
     * ======================================== */
    .pdf-export .template-wrapper,
    .pdf-export .cv-page-wrapper,
    .pdf-export .cv-content-wrapper,
    .docx-export .template-wrapper,
    .docx-export .cv-page-wrapper,
    .docx-export .cv-content-wrapper {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    /* Specific template padding removal */
    .pdf-export .data-driven-pro-template,
    .pdf-export .designer-modern-template,
    .pdf-export .elegant-timeline-template,
    .pdf-export .executive-minimal-template,
    .pdf-export .executive-professional-layout-template,
    .pdf-export .executive-standard-template,
    .pdf-export .header-professional-template,
    .pdf-export .minimal-professional-template,
    .pdf-export .one-pager-professional-template,
    .pdf-export .professional-extended-template,
    .pdf-export .professional-minimal-template,
    .pdf-export .the-modern-cv-template,
    .docx-export .data-driven-pro-template,
    .docx-export .designer-modern-template,
    .docx-export .elegant-timeline-template,
    .docx-export .executive-minimal-template,
    .docx-export .executive-professional-layout-template,
    .docx-export .executive-standard-template,
    .docx-export .header-professional-template,
    .docx-export .minimal-professional-template,
    .docx-export .one-pager-professional-template,
    .docx-export .professional-extended-template,
    .docx-export .professional-minimal-template,
    .docx-export .the-modern-cv-template {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    /* For templates with nested padding (like TheModernCVTemplate) */
    .pdf-export .the-modern-cv-template .left-column,
    .pdf-export .the-modern-cv-template .right-column,
    .docx-export .the-modern-cv-template .left-column,
    .docx-export .the-modern-cv-template .right-column {
      padding-left: 1rem !important;
      padding-right: 0 !important;
    }
    
    /* For templates with sidebar padding */
    .pdf-export .tech-pro-blue-template .sidebar,
    .pdf-export .tech-pro-blue-template .main-content,
    .docx-export .tech-pro-blue-template .sidebar,
    .docx-export .tech-pro-blue-template .main-content {
      padding: 1rem !important;
    }
    
    /* Header Professional Template adjustments */
    .pdf-export .hp-header,
    .pdf-export .hp-section-header,
    .docx-export .hp-header,
    .docx-export .hp-section-header {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
    /* Data Driven Pro Template - remove internal padding */
    .pdf-export .data-driven-pro-template,
    .docx-export .data-driven-pro-template {
      padding: 0 !important;
    }
    
    /* Professional Extended Template - two-column layout adjustments */
    .pdf-export .professional-extended-template,
    .docx-export .professional-extended-template {
      padding: 0 !important;
    }
    .pdf-export .professional-extended-template .left-column,
    .pdf-export .professional-extended-template .right-column,
    .docx-export .professional-extended-template .left-column,
    .docx-export .professional-extended-template .right-column {
      padding: 1rem !important;
    }
    
    /* Inject smart page break CSS */
    ${generatePageBreakCSS()}
  </style>
</head>
<body>
  <div class="cv-container pdf-export">
    ${htmlString}
  </div>
</body>
</html>`;

        // Cache the rendered HTML
        await cacheManager.set(cacheKey, fullHTML, config.cache.ttl);

        return fullHTML;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error rendering template to HTML', error instanceof Error ? error : new Error(String(error)), {
          templateId: template?.id || template?._id,
          hasTemplate: !!template,
          hasCvData: !!cvData,
          errorMessage
        });
        throw new Error(`Failed to render template to HTML: ${errorMessage}`);
      }
    });
  }

  /**
   * Generate cache key for rendered HTML
   */
  private generateCacheKey(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: RenderOptions
  ): string {
    const dataToHash = JSON.stringify({
      cvData: cvData,
      templateId: template?.id || template?._id,
      templateVersion: template?.version || 1,
      paperSize: options.paperSize,
      orientation: options.orientation,
      sectionOrder: options.sectionOrder
    });

    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    return `template:html:${hash}`;
  }
}

/**
 * Template Renderer Service
 * Uses dependency injection pattern for renderer
 */
export class TemplateRendererService {
  private renderer: IRenderer;

  constructor(renderer?: IRenderer) {
    this.renderer = renderer || new ReactTemplateRenderer();
  }

  /**
   * Set custom renderer
   */
  setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Render CV data with template to HTML
   */
  async renderToHTML(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: RenderOptions = {}
  ): Promise<string> {
    return this.renderer.renderToHTML(cvData, template, options);
  }
}

// Default singleton instance
export const templateRendererService = new TemplateRendererService();

