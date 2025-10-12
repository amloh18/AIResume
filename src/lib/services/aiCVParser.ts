import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { adaptParsedCVToUnified, validateCVData } from '@/lib/data-adapters/cv-data-adapter';

export interface ParsedCVData {
  success: boolean;
  data?: UnifiedCVDataStructure;
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
      const parsedData: UnifiedCVDataStructure = aiResponse.data;

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

  private static validateAndCleanData(data: any): UnifiedCVDataStructure {
    // Use the data adapter to convert parsed data to unified structure
    const adaptedData = adaptParsedCVToUnified(data);
    
    // Validate the adapted data
    const validation = validateCVData(adaptedData);
    if (!validation.isValid) {
      console.warn('CV data validation warnings:', validation.errors);
    }
    
    return adaptedData;
  }
}
