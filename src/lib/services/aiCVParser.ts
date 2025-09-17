import { CVDataStructure } from '@/types/cv';

export interface ParsedCVData {
  success: boolean;
  data?: CVDataStructure;
  error?: string;
}

export class AICVParser {
  private static async callServerParser(payload: any): Promise<any> {
    const response = await fetch('/api/ai/parse-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to parse CV with AI');
    }
    return json;
  }

  private static async readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  public static async parseCV(file: File): Promise<ParsedCVData> {
    try {
      // Validate file type
      const allowedTypes = [
        'text/plain', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
        'text/rtf'
      ];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Unsupported file type. Please upload a PDF, DOC, DOCX, RTF, or TXT file.'
        };
      }

      // Prepare payload for server parsing
      let payload: any = {};
      if (file.type === 'text/plain') {
        const text = await file.text();
        payload = { plainText: text };
      } else {
        const fileBase64 = await this.readAsBase64(file);
        payload = { fileBase64, fileType: file.type };
      }

      // Call server to parse and AI-structure
      const aiResponse = await this.callServerParser(payload);
      
      if (!aiResponse.success || !aiResponse.data) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to parse CV with AI'
        };
      }

      // Parse the AI response and validate the structure
      const parsedData: CVDataStructure = aiResponse.data;

      // Validate and clean the parsed data
      const cleanedData = this.validateAndCleanData(parsedData);

      return {
        success: true,
        data: cleanedData
      };

    } catch (error) {
      console.error('CV parsing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static validateAndCleanData(data: any): CVDataStructure {
    // Ensure all required fields exist with proper defaults
    const cleaned: CVDataStructure = {
      basics: {
        name: data.basics?.name || '',
        label: data.basics?.label || '',
        image: data.basics?.image || '',
        email: data.basics?.email || '',
        phone: data.basics?.phone || '',
        url: data.basics?.url || '',
        summary: data.basics?.summary || '',
        location: {
          address: data.basics?.location?.address || '',
          postalCode: data.basics?.location?.postalCode || '',
          city: data.basics?.location?.city || '',
          countryCode: data.basics?.location?.countryCode || '',
          region: data.basics?.location?.region || ''
        },
        profiles: Array.isArray(data.basics?.profiles) ? data.basics.profiles : []
      },
      work: Array.isArray(data.work) ? data.work : [],
      volunteer: Array.isArray(data.volunteer) ? data.volunteer : [],
      education: Array.isArray(data.education) ? data.education : [],
      awards: Array.isArray(data.awards) ? data.awards : [],
      certificates: Array.isArray(data.certificates) ? data.certificates : [],
      publications: Array.isArray(data.publications) ? data.publications : [],
      skills: Array.isArray(data.skills) ? data.skills : [],
      languages: Array.isArray(data.languages) ? data.languages : [],
      interests: Array.isArray(data.interests) ? data.interests : [],
      references: Array.isArray(data.references) ? data.references : [],
      projects: Array.isArray(data.projects) ? data.projects : []
    };

    return cleaned;
  }
}
