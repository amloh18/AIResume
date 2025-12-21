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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${atsFontFamily}, sans-serif;
      font-size: ${template?.globalStyles?.fontSize || '11pt'};
      line-height: ${template?.globalStyles?.lineHeight || '1.2'};
      background-color: ${template?.globalStyles?.backgroundColor || '#ffffff'};
      color: ${template?.globalStyles?.primaryColor || '#000000'};
      padding: 20px;
      /* Ensure text is selectable for ATS parsing */
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    .cv-container {
      width: 100%;
      max-width: ${options.paperSize === 'Letter' ? '8.5in' : '210mm'};
      margin: 0 auto;
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
    /* Page break prevention - prevent text splitting (Edge Case #29) */
    p, li, div {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* Ensure minimum font size for ATS compatibility (Edge Case #41) */
    body, p, li, span {
      font-size: ${Math.max(10, parseInt(template?.globalStyles?.fontSize || '11pt'))}pt;
    }
    @media print {
      body {
        padding: 0;
      }
      .cv-container {
        max-width: 100%;
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
  </style>
</head>
<body>
  <div class="cv-container">
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

