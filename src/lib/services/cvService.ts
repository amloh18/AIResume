import { CVData } from '@/lib/stores/cvStore';

export class CVService {
  static async getCV(cvId: string): Promise<CVData> {
    const response = await fetch(`/api/cvs/${cvId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CV');
    }
    const data = await response.json();
    return data.cv;
  }

  static async createCV(cvData: CVData & { jobId?: string; templateId?: string }): Promise<any> {
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create CV');
    }
    
    return await response.json();
  }

  static async updateCV(cvId: string, cvData: CVData): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update CV');
    }
    
    return await response.json();
  }

  static async deleteCV(cvId: string): Promise<void> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete CV');
    }
  }

  static async getUserCVs(): Promise<any[]> {
    const response = await fetch('/api/cvs');
    if (!response.ok) {
      throw new Error('Failed to fetch user CVs');
    }
    const data = await response.json();
    return data.cvs;
  }

  static async generatePDF(cvData: CVData, template: any): Promise<Blob> {
    const response = await fetch('/api/cvs/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvData, template }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }
    
    return await response.blob();
  }
} 