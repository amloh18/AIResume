import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { PDFService, PDFGenerationOptions } from '@/lib/services/pdfService';
import { DOCXService, DOCXGenerationOptions } from '@/lib/services/docxService';
import { TemplateDefinition } from '@/lib/templates/template-definition';

export type ExportFormat = 'pdf' | 'docx' | 'doc';
export type PaperSize = 'A4' | 'Letter' | 'Legal';
export type Orientation = 'portrait' | 'landscape';

export interface ExportOptions {
  format?: ExportFormat;
  paperSize?: PaperSize;
  orientation?: Orientation;
  password?: string;
  includeMetadata?: boolean;
  optimizeForATS?: boolean;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
  pageSettings?: {
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    headerText?: string;
    footerText?: string;
  };
  templateDefinition?: TemplateDefinition;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  error?: string;
  metadata?: {
    generatedAt: string;
    format: ExportFormat;
    paperSize: PaperSize;
    orientation: Orientation;
    pageCount?: number;
  };
}

export class ExportService {
  private static defaultOptions: ExportOptions = {
    format: 'pdf',
    paperSize: 'A4',
    orientation: 'portrait',
    includeMetadata: true,
    optimizeForATS: false,
    pageSettings: {
      marginTop: '20mm',
      marginBottom: '20mm',
      marginLeft: '15mm',
      marginRight: '15mm',
    },
  };

  static async export(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const { format } = mergedOptions;

    try {
      if (format === 'pdf') {
        return await this.exportPDF(cvData, template, mergedOptions);
      } else if (format === 'docx' || format === 'doc') {
        return await this.exportDOCX(cvData, template, mergedOptions);
      } else {
        return {
          success: false,
          error: `Unsupported format: ${format}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  private static async exportPDF(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const pdfOptions: PDFGenerationOptions = {
      paperSize: options.paperSize as 'A4' | 'Letter' | undefined,
      orientation: options.orientation as 'portrait' | 'landscape' | undefined,
      format: options.format as 'pdf' | 'docx' | 'doc' | undefined,
      password: options.password,
    };

    const blob = await PDFService.generatePDF(cvData, template, pdfOptions);

    const filename = this.generateFilename(cvData, 'pdf');

    return {
      success: true,
      blob,
      filename,
      mimeType: 'application/pdf',
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'pdf',
        paperSize: options.paperSize || 'A4',
        orientation: options.orientation || 'portrait',
      },
    };
  }

  private static async exportDOCX(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const docxOptions: DOCXGenerationOptions = {
      paperSize: options.paperSize as 'A4' | 'Letter' | undefined,
      orientation: options.orientation as 'portrait' | 'landscape' | undefined,
      format: options.format as 'docx' | 'doc' | undefined,
    };

    const blob = await DOCXService.generateDOCX(cvData, template, docxOptions);

    const filename = this.generateFilename(cvData, options.format === 'doc' ? 'doc' : 'docx');

    return {
      success: true,
      blob,
      filename,
      mimeType: options.format === 'doc' 
        ? 'application/msword' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      metadata: {
        generatedAt: new Date().toISOString(),
        format: options.format === 'doc' ? 'doc' : 'docx',
        paperSize: options.paperSize || 'A4',
        orientation: options.orientation || 'portrait',
      },
    };
  }

  private static generateFilename(cvData: UnifiedCVDataStructure, extension: string): string {
    const name = cvData?.basics?.name || 'resume';
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName || 'resume'}_${timestamp}.${extension}`;
  }

  static async exportWithPageBreaks(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const mergedOptions: ExportOptions = {
      ...options,
      pageSettings: {
        ...this.defaultOptions.pageSettings,
        ...options.pageSettings,
      },
    };

    return this.export(cvData, template, mergedOptions);
  }

  static getPageBreakCSS(paperSize: PaperSize = 'A4'): string {
    const dimensions = this.getPaperDimensions(paperSize);
    
    return `
      @page {
        size: ${dimensions.width}mm ${dimensions.height}mm;
        margin: 0;
      }
      
      .cv-page {
        width: ${dimensions.width}mm;
        height: ${dimensions.height}mm;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
      }
      
      .cv-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      
      .cv-section, .cv-section-item, .cv-entry-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .cv-section-header, .section-header {
        page-break-after: avoid;
        break-after: avoid;
        orphans: 3;
        widows: 3;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .no-print {
          display: none !important;
        }
      }
    `.trim();
  }

  static getFontEmbeddingConfig(): Record<string, string> {
    return {
      primary: 'Inter, system-ui, sans-serif',
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      fallback: 'Arial, Helvetica, sans-serif',
      cjk: 'Noto Sans CJK SC, Microsoft YaHei, sans-serif',
    };
  }

  static generateExportCSS(options: ExportOptions): string {
    const { paperSize = 'A4', pageSettings = {} } = options;
    const dimensions = this.getPaperDimensions(paperSize);
    
    const margins = {
      top: pageSettings.marginTop || '20mm',
      bottom: pageSettings.marginBottom || '20mm',
      left: pageSettings.marginLeft || '15mm',
      right: pageSettings.marginRight || '15mm',
    };

    const fonts = this.getFontEmbeddingConfig();

    return `
      /* Export Styles */
      :root {
        --export-width: ${dimensions.width}mm;
        --export-height: ${dimensions.height}mm;
        --export-margin-top: ${margins.top};
        --export-margin-bottom: ${margins.bottom};
        --export-margin-left: ${margins.left};
        --export-margin-right: ${margins.right};
        --export-font-primary: ${fonts.primary};
        --export-font-body: ${fonts.body};
      }
      
      .export-container {
        width: var(--export-width);
        height: var(--export-height);
        padding: var(--export-margin-top) var(--export-margin-right) var(--export-margin-bottom) var(--export-margin-left);
        box-sizing: border-box;
        font-family: var(--export-font-body);
      }
      
      /* Page Break Styles */
      ${this.getPageBreakCSS(paperSize)}
      
      /* Font Embedding */
      @font-face {
        font-family: 'Inter';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `.trim();
  }

  private static getPaperDimensions(paperSize: PaperSize): { width: number; height: number } {
    const dimensions: Record<PaperSize, { width: number; height: number }> = {
      A4: { width: 210, height: 297 },
      Letter: { width: 215.9, height: 279.4 },
      Legal: { width: 215.9, height: 355.6 },
    };
    return dimensions[paperSize];
  }

  static validateExportOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.paperSize) {
      errors.push('Paper size is required');
    } else if (!['A4', 'Letter', 'Legal'].includes(options.paperSize)) {
      errors.push('Invalid paper size. Must be A4, Letter, or Legal');
    }

    if (!options.orientation) {
      errors.push('Orientation is required');
    } else if (!['portrait', 'landscape'].includes(options.orientation)) {
      errors.push('Invalid orientation. Must be portrait or landscape');
    }

    if (!options.format) {
      errors.push('Format is required');
    } else if (!['pdf', 'docx', 'doc'].includes(options.format)) {
      errors.push('Invalid format. Must be pdf, docx, or doc');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ExportService;