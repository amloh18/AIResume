/**
 * DOCX Service
 * 
 * Provides high-fidelity DOCX/DOC conversion from CV data
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { templateRendererService } from './templateRendererService';
import { stripHtmlTags } from '@/lib/utils/textFormatting';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType, Table, TableRow, TableCell } from 'docx';
import { BaseService } from './baseService';
import { configService } from './configService';

export interface DOCXGenerationOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  format?: 'docx' | 'doc';
}

export class DOCXService extends BaseService {
  private static instance: DOCXService;

  private constructor() {
    super('DOCXService');
  }

  static getInstance(): DOCXService {
    if (!DOCXService.instance) {
      DOCXService.instance = new DOCXService();
    }
    return DOCXService.instance;
  }

  /**
   * Generate DOCX from CV data and template
   */
  static async generateDOCX(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: DOCXGenerationOptions = {}
  ): Promise<Blob> {
    const instance = DOCXService.getInstance();
    return instance.generateDOCXInternal(cvData, template, options);
  }

  private async generateDOCXInternal(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: DOCXGenerationOptions = {}
  ): Promise<Blob> {
    return this.timeOperation('generateDOCX', async () => {
      return this.withRetry(
        async () => {
          try {
            // For high-fidelity conversion, we'll use structured docx generation
            // This preserves formatting better than HTML conversion
            // ATS-friendly: Use standard fonts and proper document structure
            const doc = new Document({
              creator: 'CVCircle',
              title: 'CV/Resume',
              description: 'Professional CV/Resume',
              // Use standard fonts for ATS compatibility
              styles: {
                default: {
                  document: {
                    run: {
                      font: 'Calibri', // Standard ATS-friendly font
                      size: 22 // 11pt
                    },
                    paragraph: {
                      spacing: {
                        line: 276, // 1.15 line spacing
                        lineRule: 'auto'
                      }
                    }
                  }
                }
              },
              sections: [{
                properties: {
                  page: {
                    size: {
                      width: options.paperSize === 'Letter' ? 12240 : 11906, // in twips (1/20th of a point)
                      height: options.paperSize === 'Letter' ? 15840 : 16838
                    },
                    margin: {
                      top: 1440, // 1 inch
                      right: 1440,
                      bottom: 1440,
                      left: 1440
                    }
                  }
                },
                children: this.buildDocumentContent(cvData, template)
              }]
            });

            const buffer = await Packer.toBuffer(doc);
            return new Blob([buffer], {
              type: options.format === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
          } catch (error) {
            throw this.handleError(error, {
              templateId: template?.id || template?._id
            });
          }
        },
        configService.getRetryConfig(),
        { templateId: template?.id || template?._id }
      );
    });
  }

  /**
   * Build document content from CV data
   */
  private buildDocumentContent(
    cvData: UnifiedCVDataStructure,
    template: ITemplate
  ): (Paragraph | Table)[] {
    const content: (Paragraph | Table)[] = [];

    // Header - Name
    if (cvData.basics?.name) {
      content.push(
        new Paragraph({
          text: cvData.basics.name,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Contact Information
    const contactInfo: string[] = [];
    if (cvData.basics?.email) contactInfo.push(cvData.basics.email);
    if (cvData.basics?.phone) contactInfo.push(cvData.basics.phone);
    if (cvData.basics?.location?.city) {
      const locationParts = [
        cvData.basics.location.city,
        cvData.basics.location.region,
        cvData.basics.location.countryCode
      ].filter(Boolean);
      contactInfo.push(locationParts.join(', '));
    }

    if (contactInfo.length > 0) {
      content.push(
        new Paragraph({
          children: contactInfo.map((info, index) =>
            new TextRun({
              text: info + (index < contactInfo.length - 1 ? ' | ' : ''),
              size: 22, // 11pt
              font: 'Calibri' // Standard ATS-friendly font
            })
          ),
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
    }

    // Summary
    if (cvData.basics?.summary) {
      content.push(
        new Paragraph({
          text: 'Professional Summary',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        new Paragraph({
          text: stripHtmlTags(cvData.basics.summary),
          spacing: { after: 400 }
        })
      );
    }

    // Work Experience
    if (cvData.work && cvData.work.length > 0) {
      content.push(
        new Paragraph({
          text: 'Work Experience',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      cvData.work.forEach((work) => {
        content.push(
          new Paragraph({
            text: work.position || '',
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${work.name || ''} | `,
                bold: true,
                font: 'Calibri' // Standard ATS-friendly font
              }),
              new TextRun({
                text: `${work.startDate || ''} - ${work.endDate || 'Present'}`,
                font: 'Calibri' // Standard ATS-friendly font
              })
            ],
            spacing: { after: 100 }
          })
        );

        if (work.summary) {
          content.push(
            new Paragraph({
              text: stripHtmlTags(work.summary),
              spacing: { after: 200 }
            })
          );
        }

        if (work.highlights && work.highlights.length > 0) {
          work.highlights.forEach((highlight) => {
            content.push(
              new Paragraph({
                text: `• ${highlight}`,
                indent: { left: 720 }, // 0.5 inch
                spacing: { after: 100 }
              })
            );
          });
        }

        content.push(new Paragraph({ text: '' })); // Spacing
      });
    }

    // Education
    if (cvData.education && cvData.education.length > 0) {
      content.push(
        new Paragraph({
          text: 'Education',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      cvData.education.forEach((edu) => {
        content.push(
          new Paragraph({
            text: `${edu.studyType || ''}${edu.area ? ` in ${edu.area}` : ''}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${edu.institution || ''} | `,
                bold: true,
                font: 'Calibri' // Standard ATS-friendly font
              }),
              new TextRun({
                text: `${edu.startDate || ''} - ${edu.endDate || 'Present'}`,
                font: 'Calibri' // Standard ATS-friendly font
              })
            ],
            spacing: { after: 200 }
          })
        );

        if (edu.score) {
          content.push(
            new Paragraph({
              text: `GPA: ${edu.score}`,
              spacing: { after: 200 }
            })
          );
        }
      });
    }

    // Skills
    if (cvData.skills && cvData.skills.length > 0) {
      content.push(
        new Paragraph({
          text: 'Skills',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      // Group skills by category
      const skillsByCategory = cvData.skills.reduce((acc, skill) => {
        const category = skill.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(...(skill.skills || []));
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                bold: true,
                font: 'Calibri' // Standard ATS-friendly font
              }),
              new TextRun({
                text: skills.join(', '),
                font: 'Calibri' // Standard ATS-friendly font
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }

    // Projects
    if (cvData.projects && cvData.projects.length > 0) {
      content.push(
        new Paragraph({
          text: 'Projects',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      cvData.projects.forEach((project) => {
        content.push(
          new Paragraph({
            text: project.name || '',
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 100 }
          })
        );

        if (project.description) {
          content.push(
            new Paragraph({
              text: stripHtmlTags(project.description),
              spacing: { after: 200 }
            })
          );
        }

        if (project.highlights && project.highlights.length > 0) {
          project.highlights.forEach((highlight) => {
            content.push(
              new Paragraph({
                text: `• ${highlight}`,
                indent: { left: 720 },
                spacing: { after: 100 }
              })
            );
          });
        }
      });
    }

    // Certificates
    if (cvData.certificates && cvData.certificates.length > 0) {
      content.push(
        new Paragraph({
          text: 'Certificates',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      cvData.certificates.forEach((cert) => {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${cert.name || ''} | `,
                bold: true,
                font: 'Calibri' // Standard ATS-friendly font
              }),
              new TextRun({
                text: cert.issuer || '',
                font: 'Calibri' // Standard ATS-friendly font
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }

    return content;
  }
}

export const docxService = DOCXService;

