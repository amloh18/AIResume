import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now

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

    // Return the file as a blob
    return new NextResponse(exportResult.buffer, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
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
  // For DOCX generation, you'd use a library like docx or officegen
  // This is a simplified implementation
  
  const docContent = generateDocContent(cvData, template);
  const docxBuffer = Buffer.from(docContent, 'utf-8');
  
  return {
    buffer: docxBuffer,
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

function generateDocContent(cvData: any, template: any): string {
  // Simplified DOCX content - in production, use proper DOCX library
  let content = `${cvData.basics?.name || 'Your Name'}\n`;
  content += `${cvData.basics?.label || 'Professional Title'}\n\n`;
  
  if (cvData.basics?.summary) {
    content += `PROFESSIONAL SUMMARY\n${cvData.basics.summary}\n\n`;
  }
  
  if (cvData.work && cvData.work.length > 0) {
    content += `WORK EXPERIENCE\n`;
    cvData.work.forEach((work: any) => {
      content += `${work.position || 'Position'} at ${work.name || 'Company'}\n`;
      content += `${work.startDate || ''} - ${work.endDate || 'Present'}\n`;
      if (work.summary) content += `${work.summary}\n`;
      content += `\n`;
    });
  }
  
  return content;
}