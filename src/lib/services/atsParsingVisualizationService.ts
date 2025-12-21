import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ParserType } from '@/contexts/ATSDeepDiveContext';

export interface ReadingNode {
  x: number;
  y: number;
  order: number;
  text: string;
  element: 'header' | 'section' | 'text' | 'table' | 'textbox';
}

export interface DeadZone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'header' | 'footer' | 'graphics' | 'textbox';
  reason: string;
}

export interface ParsingIssue {
  type: 'dead-zone' | 'invisible-element' | 'hidden-text' | 'unusual-section' | 'protected-pdf' | 'image-pdf';
  message: string;
  location?: { x: number; y: number; width: number; height: number };
}

export class ATSParsingVisualizationService {
  /**
   * Calculate reading path for CV (Case #14, #38)
   * Shows how the parser reads the document
   */
  static calculateReadingPath(cvData: UnifiedCVDataStructure, parserType: ParserType): ReadingNode[] {
    const nodes: ReadingNode[] = [];
    let order = 1;

    // Parser-specific reading order
    if (parserType === 'taleo') {
      // Taleo: Ignores headers/footers, reads top to bottom
      return this.calculateTaleoReadingPath(cvData, order);
    } else if (parserType === 'greenhouse') {
      // Greenhouse: Reads headers, flexible order
      return this.calculateGreenhouseReadingPath(cvData, order);
    } else if (parserType === 'lever') {
      // Lever: Modern parser, handles tables well
      return this.calculateLeverReadingPath(cvData, order);
    } else {
      // Generic: Standard top-to-bottom
      return this.calculateGenericReadingPath(cvData, order);
    }
  }

  /**
   * Generic reading path (top to bottom)
   */
  private static calculateGenericReadingPath(cvData: UnifiedCVDataStructure, startOrder: number): ReadingNode[] {
    const nodes: ReadingNode[] = [];
    let order = startOrder;
    let y = 50;

    // Header
    if (cvData.basics?.name) {
      nodes.push({
        x: 100,
        y,
        order: order++,
        text: cvData.basics.name,
        element: 'header',
      });
      y += 30;
    }

    // Summary
    if (cvData.basics?.summary) {
      nodes.push({
        x: 100,
        y,
        order: order++,
        text: cvData.basics.summary.substring(0, 50),
        element: 'text',
      });
      y += 60;
    }

    // Work Experience
    if (cvData.work) {
      cvData.work.forEach((work) => {
        nodes.push({
          x: 100,
          y,
          order: order++,
          text: work.position || work.title || '',
          element: 'section',
        });
        y += 40;
      });
    }

    // Education
    if (cvData.education) {
      cvData.education.forEach((edu) => {
        nodes.push({
          x: 100,
          y,
          order: order++,
          text: edu.studyType || edu.degree || '',
          element: 'section',
        });
        y += 40;
      });
    }

    // Skills
    if (cvData.skills) {
      nodes.push({
        x: 100,
        y,
        order: order++,
        text: 'Skills',
        element: 'section',
      });
    }

    return nodes;
  }

  /**
   * Taleo reading path (ignores footers)
   */
  private static calculateTaleoReadingPath(cvData: UnifiedCVDataStructure, startOrder: number): ReadingNode[] {
    const nodes = this.calculateGenericReadingPath(cvData, startOrder);
    // Taleo-specific: Remove footer elements
    return nodes.filter((node) => node.element !== 'footer');
  }

  /**
   * Greenhouse reading path (reads headers)
   */
  private static calculateGreenhouseReadingPath(cvData: UnifiedCVDataStructure, startOrder: number): ReadingNode[] {
    // Greenhouse reads headers first, then content
    const nodes: ReadingNode[] = [];
    let order = startOrder;
    let y = 50;

    // Header first
    if (cvData.basics?.name) {
      nodes.push({
        x: 100,
        y,
        order: order++,
        text: cvData.basics.name,
        element: 'header',
      });
      y += 30;
    }

    // Then sections
    const genericNodes = this.calculateGenericReadingPath(cvData, order);
    nodes.push(...genericNodes.slice(1)); // Skip first node (already added)

    return nodes;
  }

  /**
   * Lever reading path (handles tables well)
   */
  private static calculateLeverReadingPath(cvData: UnifiedCVDataStructure, startOrder: number): ReadingNode[] {
    // Lever handles tables and multi-column layouts better
    const nodes = this.calculateGenericReadingPath(cvData, startOrder);
    // Lever-specific: Better table detection
    return nodes;
  }

  /**
   * Detect dead zones (Case #13, #21)
   * Areas that parsers cannot read (headers, footers, graphics)
   */
  static detectDeadZones(cvData: UnifiedCVDataStructure, parserType: ParserType): DeadZone[] {
    const deadZones: DeadZone[] = [];

    // Header dead zone (Case #13)
    // Most parsers can read headers, but some graphics-based headers are not readable
    deadZones.push({
      x: 0,
      y: 0,
      width: 800,
      height: 100,
      type: 'header',
      reason: 'Graphics-based header may not be scanned',
    });

    // Footer dead zone (Case #21)
    // Taleo specifically ignores footers
    if (parserType === 'taleo') {
      deadZones.push({
        x: 0,
        y: 1000, // Approximate footer position
        width: 800,
        height: 100,
        type: 'footer',
        reason: 'Taleo ignores footer content',
      });
    }

    return deadZones;
  }

  /**
   * Detect parsing issues (Cases 13-26)
   */
  static detectParsingIssues(cvData: UnifiedCVDataStructure, parserType: ParserType): ParsingIssue[] {
    const issues: ParsingIssue[] = [];

    // Check for unusual section titles (Case #20)
    const standardSections = ['work', 'experience', 'education', 'skills', 'projects'];
    // This would need actual section detection from CV structure

    // Check for invisible elements (Case #15)
    // Icons, symbols that ATS cannot read
    if (cvData.skills) {
      cvData.skills.forEach((skill) => {
        const skillText = JSON.stringify(skill);
        if (skillText.includes('⭐') || skillText.includes('★') || skillText.includes('•')) {
          issues.push({
            type: 'invisible-element',
            message: 'Icons/symbols detected - ATS cannot read these',
            location: { x: 0, y: 0, width: 100, height: 20 },
          });
        }
      });
    }

    // Check for hidden text (Case #17)
    // White font hacks, etc. - would need DOM inspection

    // Check for image-based PDF (Case #18)
    // Would need file format detection

    // Check for protected PDF (Case #26)
    // Would need file format detection

    return issues;
  }

  /**
   * Detect table structure (Case #16)
   */
  static detectTableStructure(cvData: UnifiedCVDataStructure): boolean {
    // Check if CV uses table layout
    // This would need template/CSS analysis
    return false;
  }

  /**
   * Detect text box containers (Case #22)
   */
  static detectTextBoxContainers(cvData: UnifiedCVDataStructure): boolean {
    // Check if CV uses text boxes
    // This would need template/CSS analysis
    return false;
  }
}

