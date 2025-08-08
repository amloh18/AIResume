import { CVData } from '@/lib/stores/cvStore';
import { Template } from '@/lib/stores/templateStore';

export class PDFService {
  static async generatePDF(cvData: CVData, template: Template): Promise<Blob> {
    // For now, we'll create a simple PDF using jsPDF
    // In a real implementation, you would use @react-pdf/renderer
    
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text(`${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`, 20, 30);
    
    // Contact info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    let yPos = 40;
    if (cvData.personalInfo.email) {
      doc.text(cvData.personalInfo.email, 20, yPos);
      yPos += 7;
    }
    if (cvData.personalInfo.phone) {
      doc.text(cvData.personalInfo.phone, 20, yPos);
      yPos += 7;
    }
    if (cvData.personalInfo.location) {
      doc.text(cvData.personalInfo.location, 20, yPos);
      yPos += 7;
    }
    
    // Summary
    if (cvData.personalInfo.summary) {
      yPos += 10;
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Professional Summary', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(cvData.personalInfo.summary, 170);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 7 + 10;
    }
    
    // Experience
    if (cvData.experience.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Work Experience', 20, yPos);
      yPos += 10;
      
      cvData.experience.forEach((exp, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(exp.jobTitle, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${exp.company} | ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`, 20, yPos);
        yPos += 7;
        
        if (exp.description) {
          const descLines = doc.splitTextToSize(exp.description, 170);
          doc.text(descLines, 20, yPos);
          yPos += descLines.length * 7;
        }
        
        yPos += 5;
      });
    }
    
    // Education
    if (cvData.education.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Education', 20, yPos);
      yPos += 10;
      
      cvData.education.forEach((edu) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(edu.degree, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${edu.institution} | ${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}`, 20, yPos);
        yPos += 10;
      });
    }
    
    // Skills
    if (cvData.skills.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Skills', 20, yPos);
      yPos += 10;
      
      cvData.skills.forEach((skill) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text(`${skill.category}: ${skill.skills.join(', ')}`, 20, yPos);
        yPos += 7;
      });
    }
    
    return doc.output('blob');
  }
  
  static downloadPDF(blob: Blob, filename: string = 'cv.pdf') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
} 