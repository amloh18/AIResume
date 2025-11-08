import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvData, template, format, userId, cvId, jobId } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!cvData) {
      return NextResponse.json({ error: 'CV data is required' }, { status: 400 });
    }

    // Generate the export based on format
    let exportResult;
    
    switch (format) {
      case 'pdf':
        exportResult = await generatePDFExport(cvData, template);
        break;
      case 'docx':
        exportResult = await generateDOCXExport(cvData, template);
        break;
      case 'json':
        exportResult = await generateJSONExport(cvData, template);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    // Return the file as a blob with proper headers
    return new NextResponse(exportResult.buffer, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(exportResult.filename)}"`,
        'Content-Length': exportResult.buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('CV export error:', error);
    return NextResponse.json(
      { error: 'Failed to export CV' },
      { status: 500 }
    );
  }
}

async function generatePDFExport(cvData: any, template: any) {
  // For now, we'll generate a simple HTML-based PDF
  // In production, you'd use a library like Puppeteer or jsPDF
  
  const htmlContent = generateHTMLContent(cvData, template);
  
  // Mock PDF generation - in production, use proper PDF library
  const pdfBuffer = Buffer.from(htmlContent, 'utf-8');
  
  return {
    buffer: pdfBuffer,
    mimeType: 'application/pdf',
    filename: `${cvData.basics?.name || 'CV'}.pdf`
  };
}

async function generateDOCXExport(cvData: any, template: any) {
  // Use docx library for proper DOCX generation with template styling
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType } = await import('docx');
  
  // Extract template styling
  const primaryColor = template?.globalStyles?.primaryColor || '#000000';
  const fontFamily = template?.globalStyles?.fontFamily || 'Calibri';
  const fontSize = template?.globalStyles?.fontSize || '11pt';
  const fontSizeNum = parseInt(fontSize) || 22; // Convert pt to half-points (11pt = 22 half-points)
  
  // Helper to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
  const primaryRgb = hexToRgb(primaryColor);
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240, // A4 width in twips (8.5in)
            height: 15840, // A4 height in twips (11in)
          },
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        // Header with template styling
        new Paragraph({
          children: [
            new TextRun({
              text: cvData.basics?.name || 'Your Name',
              bold: true,
              size: fontSizeNum * 1.5, // Larger for name
              color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
              font: fontFamily,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: cvData.basics?.label || 'Professional Title',
              size: fontSizeNum,
              color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
              font: fontFamily,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            ...(cvData.basics?.email ? [new TextRun({ text: cvData.basics.email, size: fontSizeNum - 2, font: fontFamily })] : []),
            ...(cvData.basics?.phone ? [new TextRun({ text: cvData.basics.phone, size: fontSizeNum - 2, font: fontFamily, break: 1 })] : []),
            ...(cvData.basics?.location?.city ? [new TextRun({ text: cvData.basics.location.city, size: fontSizeNum - 2, font: fontFamily, break: 1 })] : []),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Summary
        ...(cvData.basics?.summary ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'PROFESSIONAL SUMMARY',
                bold: true,
                size: fontSizeNum + 2,
                color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
                font: fontFamily,
                underline: {},
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: cvData.basics.summary,
                size: fontSizeNum,
                font: fontFamily,
              }),
            ],
            spacing: { after: 400 },
          }),
        ] : []),
        
        // Work Experience
        ...(cvData.work && cvData.work.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'WORK EXPERIENCE',
                bold: true,
                size: fontSizeNum + 2,
                color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
                font: fontFamily,
                underline: {},
              }),
            ],
            spacing: { after: 200 },
          }),
          ...cvData.work.flatMap((work: any) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: work.position || 'Position',
                  bold: true,
                  size: fontSizeNum,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${work.name || 'Company'} | ${work.startDate || ''} - ${work.endDate || 'Present'}`,
                  size: fontSizeNum - 2,
                  italics: true,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 100 },
            }),
            ...(work.summary ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: work.summary,
                    size: fontSizeNum,
                    font: fontFamily,
                  }),
                ],
                spacing: { after: 200 },
              }),
            ] : []),
          ]),
        ] : []),
        
        // Education
        ...(cvData.education && cvData.education.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'EDUCATION',
                bold: true,
                size: fontSizeNum + 2,
                color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
                font: fontFamily,
                underline: {},
              }),
            ],
            spacing: { after: 200 },
          }),
          ...cvData.education.flatMap((edu: any) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${edu.studyType || 'Degree'} in ${edu.area || 'Field'}`,
                  bold: true,
                  size: fontSizeNum,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${edu.institution || 'Institution'} | ${edu.startDate || ''} - ${edu.endDate || ''}`,
                  size: fontSizeNum - 2,
                  italics: true,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 200 },
            }),
          ]),
        ] : []),
        
        // Skills
        ...(cvData.skills && cvData.skills.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'SKILLS',
                bold: true,
                size: fontSizeNum + 2,
                color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
                font: fontFamily,
                underline: {},
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: cvData.skills.map((skill: any) => 
                  typeof skill === 'string' ? skill : 
                  (skill.category ? `${skill.category}: ${Array.isArray(skill.skills) ? skill.skills.join(', ') : skill.skills}` : skill.name || skill)
                ).join(' • '),
                size: fontSizeNum,
                font: fontFamily,
              }),
            ],
            spacing: { after: 400 },
          }),
        ] : []),
        
        // Projects
        ...(cvData.projects && cvData.projects.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'PROJECTS',
                bold: true,
                size: fontSizeNum + 2,
                color: primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor,
                font: fontFamily,
                underline: {},
              }),
            ],
            spacing: { after: 200 },
          }),
          ...cvData.projects.flatMap((project: any) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: project.name || 'Project',
                  bold: true,
                  size: fontSizeNum,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 100 },
            }),
            ...(project.description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: project.description,
                    size: fontSizeNum,
                    font: fontFamily,
                  }),
                ],
                spacing: { after: 200 },
              }),
            ] : []),
          ]),
        ] : []),
      ],
    }],
  });
  
  const buffer = await Packer.toBuffer(doc);
  
  return {
    buffer: buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: `${cvData.basics?.name || 'CV'}.docx`
  };
}

async function generateJSONExport(cvData: any, template: any) {
  const jsonContent = JSON.stringify({
    cvData,
    template,
    exportDate: new Date().toISOString(),
    version: '1.0'
  }, null, 2);
  
  const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
  
  return {
    buffer: jsonBuffer,
    mimeType: 'application/json',
    filename: `${cvData.basics?.name || 'CV'}.json`
  };
}

function generateHTMLContent(cvData: any, template: any): string {
  const primaryColor = template?.globalStyles?.primaryColor || '#059669';
  const fontFamily = template?.globalStyles?.fontFamily || 'Arial, sans-serif';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${cvData.basics?.name || 'CV'}</title>
      <style>
        body {
          font-family: ${fontFamily};
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .name {
          font-size: 2.5em;
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 10px;
        }
        .title {
          font-size: 1.2em;
          color: #666;
          margin-bottom: 15px;
        }
        .contact {
          font-size: 0.9em;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 1.3em;
          font-weight: bold;
          color: ${primaryColor};
          border-bottom: 1px solid ${primaryColor};
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .work-item, .education-item, .project-item {
          margin-bottom: 20px;
        }
        .item-title {
          font-weight: bold;
          font-size: 1.1em;
        }
        .item-subtitle {
          color: #666;
          font-style: italic;
        }
        .item-date {
          color: #888;
          font-size: 0.9em;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .skill {
          background: ${primaryColor}20;
          color: ${primaryColor};
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${cvData.basics?.name || 'Your Name'}</div>
        <div class="title">${cvData.basics?.label || 'Professional Title'}</div>
        <div class="contact">
          ${cvData.basics?.email || ''} | ${cvData.basics?.phone || ''} | ${cvData.basics?.location?.city || ''}
        </div>
      </div>

      ${cvData.basics?.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <p>${cvData.basics.summary}</p>
        </div>
      ` : ''}

      ${cvData.work && cvData.work.length > 0 ? `
        <div class="section">
          <div class="section-title">Work Experience</div>
          ${cvData.work.map((work: any) => `
            <div class="work-item">
              <div class="item-title">${work.position || 'Position'}</div>
              <div class="item-subtitle">${work.name || 'Company'}</div>
              <div class="item-date">${work.startDate || ''} - ${work.endDate || 'Present'}</div>
              ${work.summary ? `<p>${work.summary}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${cvData.education && cvData.education.length > 0 ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${cvData.education.map((edu: any) => `
            <div class="education-item">
              <div class="item-title">${edu.studyType || 'Degree'} in ${edu.area || 'Field'}</div>
              <div class="item-subtitle">${edu.institution || 'Institution'}</div>
              <div class="item-date">${edu.startDate || ''} - ${edu.endDate || ''}</div>
              ${edu.description ? `<p>${edu.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${cvData.skills && cvData.skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills">
            ${cvData.skills.map((skill: any) => `
              <span class="skill">${skill.name || skill}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${cvData.projects && cvData.projects.length > 0 ? `
        <div class="section">
          <div class="section-title">Projects</div>
          ${cvData.projects.map((project: any) => `
            <div class="project-item">
              <div class="item-title">${project.name || 'Project'}</div>
              ${project.url ? `<div class="item-subtitle">${project.url}</div>` : ''}
              ${project.description ? `<p>${project.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${cvData.certificates && cvData.certificates.length > 0 ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${cvData.certificates.map((cert: any) => `
            <div class="work-item">
              <div class="item-title">${cert.name || 'Certificate'}</div>
              <div class="item-subtitle">${cert.issuer || 'Issuer'}</div>
              <div class="item-date">${cert.date || ''}</div>
              ${cert.description ? `<p>${cert.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </body>
    </html>
  `;
}
