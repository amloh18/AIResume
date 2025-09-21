/**
 * Preview Engine with Advanced Layout and Pagination
 * 
 * This engine renders CV data with template styling and handles:
 * 1. Content & Styling Fusion
 * 2. Dynamic Layout (single/multi-column)
 * 3. Pagination & Overflow Management
 * 4. Section Placement Control
 */

import { ITemplate, IColumnLayout, ISectionStyling } from '@/models/Template';
import { CVDataStructure } from '@/types/cv';

// Page configuration for different formats
const PAGE_FORMATS = {
  A4: { width: 210, height: 297, unit: 'mm' },
  Letter: { width: 216, height: 279, unit: 'mm' },
  Legal: { width: 216, height: 356, unit: 'mm' }
};

// Rendered section with calculated height
export interface RenderedSection {
  key: string;
  content: string; // HTML content
  estimatedHeight: number; // in mm
  data: any; // Original data
  styles: any; // Applied styles
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
  template: ITemplate;
  metadata: {
    renderTime: number;
    sectionCount: number;
    itemCount: number;
  };
}

/**
 * Core Preview Engine Class
 */
export class PreviewEngine {
  private template: ITemplate;
  private cvData: CVDataStructure;
  private maxPageHeight: number;
  
  constructor(template: ITemplate, cvData: CVDataStructure) {
    this.template = template;
    this.cvData = cvData;
    
    // Calculate max page height based on format and margins
    const format = PAGE_FORMATS[template.pageSettings?.format || 'A4'];
    const margins = template.pageSettings?.margins || { top: '20mm', bottom: '20mm' };
    
    this.maxPageHeight = format.height - 
      this.parseSize(margins.top) - 
      this.parseSize(margins.bottom);
  }
  
  /**
   * Main render function - produces complete preview with pagination
   */
  public async render(): Promise<PreviewResult> {
    const startTime = Date.now();
    console.log('🎨 Starting preview render...');
    
    try {
      // Step 1: Prepare sections based on layout
      const sectionsToRender = this.prepareSectionsFromLayout();
      
      // Step 2: Render each section with styling
      const renderedSections = await this.renderSections(sectionsToRender);
      
      // Step 3: Paginate sections based on height calculations
      const pages = this.paginateSections(renderedSections);
      
      // Step 4: Generate final result
      const result: PreviewResult = {
        pages,
        totalPages: pages.length,
        totalHeight: pages.reduce((sum, page) => sum + page.totalHeight, 0),
        template: this.template,
        metadata: {
          renderTime: Date.now() - startTime,
          sectionCount: renderedSections.length,
          itemCount: this.countTotalItems(sectionsToRender)
        }
      };
      
      console.log(`✅ Preview rendered: ${result.totalPages} pages, ${result.metadata.sectionCount} sections`);
      return result;
      
    } catch (error) {
      console.error('❌ Preview render failed:', error);
      throw error;
    }
  }
  
  /**
   * Step 1: Prepare sections based on template layout
   */
  private prepareSectionsFromLayout(): Array<{ key: string; data: any }> {
    const { columnLayout, layoutType } = this.template;
    const sections: Array<{ key: string; data: any }> = [];
    
    console.log(`📋 Preparing sections for ${layoutType} layout...`);
    
    if (layoutType === 'one-column' && columnLayout.main) {
      // Single column layout
      columnLayout.main.sections.forEach(sectionKey => {
        const data = this.getSectionData(sectionKey);
        if (data) {
          sections.push({ key: sectionKey, data });
        }
      });
    } else if (layoutType === 'two-column') {
      // Two column layout - interleave sections for proper pagination
      const leftSections = columnLayout.leftColumn?.sections || [];
      const rightSections = columnLayout.rightColumn?.sections || [];
      
      // Process left column sections first, then right column
      leftSections.forEach(sectionKey => {
        const data = this.getSectionData(sectionKey);
        if (data) {
          sections.push({ key: sectionKey, data, column: 'left' });
        }
      });
      
      rightSections.forEach(sectionKey => {
        const data = this.getSectionData(sectionKey);
        if (data) {
          sections.push({ key: sectionKey, data, column: 'right' });
        }
      });
    }
    
    console.log(`📊 Prepared ${sections.length} sections for rendering`);
    return sections;
  }
  
  /**
   * Step 2: Render each section with template styling
   */
  private async renderSections(sectionsToRender: Array<{ key: string; data: any }>): Promise<RenderedSection[]> {
    const rendered: RenderedSection[] = [];
    
    console.log('🎨 Rendering sections with styling...');
    
    for (const section of sectionsToRender) {
      try {
        const renderedSection = await this.renderSection(section.key, section.data);
        rendered.push(renderedSection);
      } catch (error) {
        console.error(`❌ Failed to render section ${section.key}:`, error);
        // Continue with other sections
      }
    }
    
    return rendered;
  }
  
  /**
   * Render individual section with styling and height calculation
   */
  private async renderSection(sectionKey: string, data: any): Promise<RenderedSection> {
    const sectionBlueprint = this.template.availableSections.find(s => s.key === sectionKey);
    if (!sectionBlueprint) {
      throw new Error(`Section blueprint not found: ${sectionKey}`);
    }
    
    // Get section-specific styles
    const sectionStyles = this.template.sectionStyling[sectionKey] || {};
    const globalStyles = this.template.globalStyles;
    
    // Render content based on section type
    let content: string;
    let estimatedHeight: number;
    
    if (sectionBlueprint.isList && Array.isArray(data)) {
      // List-based section (work experience, education, etc.)
      content = this.renderListSection(sectionKey, data, sectionStyles, globalStyles);
      estimatedHeight = this.calculateListSectionHeight(data, sectionStyles);
    } else {
      // Single-item section (personal header, profile, etc.)
      content = this.renderSingleSection(sectionKey, data, sectionStyles, globalStyles);
      estimatedHeight = this.calculateSingleSectionHeight(data, sectionStyles);
    }
    
    return {
      key: sectionKey,
      content,
      estimatedHeight,
      data,
      styles: { ...globalStyles, ...sectionStyles }
    };
  }
  
  /**
   * Step 3: Paginate sections based on height calculations
   */
  private paginateSections(sections: RenderedSection[]): RenderedPage[] {
    const pages: RenderedPage[] = [];
    let currentPage: RenderedPage = {
      pageNumber: 1,
      sections: [],
      totalHeight: 0,
      overflow: false
    };
    
    console.log('📄 Starting pagination...');
    
    for (const section of sections) {
      // Check if adding this section would exceed page height
      const projectedHeight = currentPage.totalHeight + section.estimatedHeight;
      
      if (projectedHeight > this.maxPageHeight && currentPage.sections.length > 0) {
        // Page overflow - finalize current page and start new one
        console.log(`📄 Page ${currentPage.pageNumber} complete: ${currentPage.sections.length} sections, ${currentPage.totalHeight.toFixed(1)}mm`);
        
        pages.push(currentPage);
        
        currentPage = {
          pageNumber: pages.length + 1,
          sections: [section],
          totalHeight: section.estimatedHeight,
          overflow: false
        };
      } else {
        // Add section to current page
        currentPage.sections.push(section);
        currentPage.totalHeight = projectedHeight;
        
        // Check if we're approaching overflow
        if (projectedHeight > this.maxPageHeight * 0.9) {
          currentPage.overflow = true;
        }
      }
    }
    
    // Add the last page if it has content
    if (currentPage.sections.length > 0) {
      pages.push(currentPage);
      console.log(`📄 Final page ${currentPage.pageNumber}: ${currentPage.sections.length} sections, ${currentPage.totalHeight.toFixed(1)}mm`);
    }
    
    console.log(`✅ Pagination complete: ${pages.length} pages generated`);
    return pages;
  }
  
  /**
   * Render list-based section (work experience, education, etc.)
   */
  private renderListSection(sectionKey: string, items: any[], sectionStyles: any, globalStyles: any): string {
    const sectionTitle = this.getSectionTitle(sectionKey);
    
    let html = `<section class="section section-${sectionKey}">`;
    
    // Section header
    html += `<h2 class="section-header">${sectionTitle}</h2>`;
    
    // Render each item
    items.forEach(item => {
      html += this.renderListItem(sectionKey, item, sectionStyles);
    });
    
    html += '</section>';
    
    return html;
  }
  
  /**
   * Render single section (personal header, profile, etc.)
   */
  private renderSingleSection(sectionKey: string, data: any, sectionStyles: any, globalStyles: any): string {
    let html = `<section class="section section-${sectionKey}">`;
    
    switch (sectionKey) {
      case 'personal_header':
      case 'personal_info':
        html += this.renderPersonalInfo(data, sectionStyles);
        break;
      case 'profile':
        html += this.renderProfile(data, sectionStyles);
        break;
      case 'contact_info':
        html += this.renderContactInfo(data, sectionStyles);
        break;
      default:
        html += `<div class="section-content">${JSON.stringify(data)}</div>`;
    }
    
    html += '</section>';
    return html;
  }
  
  /**
   * Calculate estimated height for list sections
   */
  private calculateListSectionHeight(items: any[], sectionStyles: any): number {
    const headerHeight = 8; // mm - typical section header height
    const itemHeight = 15; // mm - typical item height
    const spacing = 3; // mm - spacing between items
    
    return headerHeight + (items.length * (itemHeight + spacing));
  }
  
  /**
   * Calculate estimated height for single sections
   */
  private calculateSingleSectionHeight(data: any, sectionStyles: any): number {
    // Estimate based on content length and styling
    const baseHeight = 10; // mm
    const contentLength = JSON.stringify(data).length;
    const additionalHeight = Math.min(contentLength / 50, 20); // Max 20mm additional
    
    return baseHeight + additionalHeight;
  }
  
  /**
   * Helper functions for rendering specific section types
   */
  private renderPersonalInfo(data: any, styles: any): string {
    return `
      <div class="personal-info">
        <h1 class="name" style="${this.styleToCSS(styles.name || {})}">${data.name || ''}</h1>
        <div class="label" style="${this.styleToCSS(styles.label || {})}">${data.label || ''}</div>
        <div class="contact-details">
          ${data.email ? `<span class="email">${data.email}</span>` : ''}
          ${data.phone ? `<span class="phone">${data.phone}</span>` : ''}
          ${data.location ? `<span class="location">${data.location}</span>` : ''}
        </div>
      </div>
    `;
  }
  
  private renderProfile(data: any, styles: any): string {
    return `
      <div class="profile" style="${this.styleToCSS(styles)}">
        <h2 class="section-header">Profile</h2>
        <p>${data.summary || ''}</p>
      </div>
    `;
  }
  
  private renderContactInfo(data: any, styles: any): string {
    return `
      <div class="contact-info">
        <h2 class="section-header">Contact</h2>
        ${data.email ? `<div class="contact-item">${data.email}</div>` : ''}
        ${data.phone ? `<div class="contact-item">${data.phone}</div>` : ''}
        ${data.location ? `<div class="contact-item">${data.location}</div>` : ''}
        ${data.website ? `<div class="contact-item">${data.website}</div>` : ''}
      </div>
    `;
  }
  
  private renderListItem(sectionKey: string, item: any, styles: any): string {
    switch (sectionKey) {
      case 'work_experience':
      case 'professional_experience':
        return this.renderWorkItem(item, styles);
      case 'education':
        return this.renderEducationItem(item, styles);
      case 'skills':
        return this.renderSkillItem(item, styles);
      default:
        return `<div class="list-item">${JSON.stringify(item)}</div>`;
    }
  }
  
  private renderWorkItem(item: any, styles: any): string {
    return `
      <div class="work-item">
        <div class="work-header">
          <span class="company" style="${this.styleToCSS(styles.name || {})}">${item.name || ''}</span>
          <span class="position" style="${this.styleToCSS(styles.position || {})}">${item.position || ''}</span>
          <span class="date" style="${this.styleToCSS(styles.date || {})}">${item.startDate} - ${item.endDate || 'Present'}</span>
        </div>
        ${item.summary ? `<div class="summary">${item.summary}</div>` : ''}
        ${item.highlights && item.highlights.length > 0 ? `
          <ul class="highlights" style="${this.styleToCSS(styles.highlights || {})}">
            ${item.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }
  
  private renderEducationItem(item: any, styles: any): string {
    return `
      <div class="education-item">
        <div class="institution" style="${this.styleToCSS(styles.institution || {})}">${item.institution || ''}</div>
        <div class="degree" style="${this.styleToCSS(styles.degree || {})}">${item.degree} in ${item.area || ''}</div>
        <div class="date" style="${this.styleToCSS(styles.date || {})}">${item.startDate} - ${item.endDate || 'Present'}</div>
        ${item.score ? `<div class="score">GPA: ${item.score}</div>` : ''}
      </div>
    `;
  }
  
  private renderSkillItem(item: any, styles: any): string {
    return `
      <div class="skill-item" style="${this.styleToCSS(styles.listItem || {})}">
        <span class="skill-name">${item.name || ''}</span>
        ${item.level ? `<span class="skill-level">${item.level}</span>` : ''}
      </div>
    `;
  }
  
  /**
   * Utility functions
   */
  private getSectionData(sectionKey: string): any {
    // Map section keys to CV data fields
    const sectionMap: Record<string, string> = {
      'personal_header': 'basics',
      'personal_info': 'basics',
      'contact_info': 'basics',
      'profile': 'basics',
      'work_experience': 'work',
      'professional_experience': 'work',
      'education': 'education',
      'skills': 'skills',
      'skills_and_qualifications': 'skills',
      'project_experience': 'projects',
      'tools': 'skills',
      'languages': 'languages',
      'awards': 'awards'
    };
    
    const dataField = sectionMap[sectionKey];
    return dataField ? this.cvData[dataField] : null;
  }
  
  private getSectionTitle(sectionKey: string): string {
    const section = this.template.availableSections.find(s => s.key === sectionKey);
    return section?.displayName || sectionKey.replace(/_/g, ' ').toUpperCase();
  }
  
  private styleToCSS(styleObj: any): string {
    return Object.entries(styleObj)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }
  
  private parseSize(size: string): number {
    // Parse sizes like "20mm", "1in", "24px" to mm
    const match = size.match(/^(\d+(?:\.\d+)?)(mm|cm|in|px|pt)$/);
    if (!match) return 20; // Default fallback
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'mm': return value;
      case 'cm': return value * 10;
      case 'in': return value * 25.4;
      case 'px': return value * 0.264583; // 96 DPI
      case 'pt': return value * 0.352778;
      default: return value;
    }
  }
  
  private countTotalItems(sections: Array<{ key: string; data: any }>): number {
    return sections.reduce((count, section) => {
      return count + (Array.isArray(section.data) ? section.data.length : 1);
    }, 0);
  }
}

/**
 * Convenience function to render a CV with a template
 */
export async function renderCVPreview(
  template: ITemplate, 
  cvData: CVDataStructure
): Promise<PreviewResult> {
  const engine = new PreviewEngine(template, cvData);
  return await engine.render();
}
