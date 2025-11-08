import { getS3Client, getS3PublicUrl } from '@/lib/s3-client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Service to save CV data with template to S3
 */
export class CVS3Service {
  /**
   * Save CV data and template to S3
   * @param cvId - CV ID
   * @param userId - User ID
   * @param cvData - CV data structure
   * @param template - Template data
   * @returns S3 URL of the saved CV
   */
  static async saveCVToS3(
    cvId: string,
    userId: string,
    cvData: any,
    template?: any
  ): Promise<string | null> {
    try {
      const s3Client = getS3Client();
      
      // Prepare CV document with template
      const cvDocument = {
        cvId,
        userId,
        cvData,
        template: template || null,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      // Convert to JSON
      const jsonContent = JSON.stringify(cvDocument, null, 2);
      const buffer = Buffer.from(jsonContent, 'utf-8');
      
      // Create S3 key
      const timestamp = Date.now();
      const s3Key = `cvs/${userId}/${cvId}-${timestamp}.json`;
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        ContentType: 'application/json',
        Body: buffer,
        Metadata: {
          cvId: cvId,
          userId: userId,
          savedAt: new Date().toISOString(),
          purpose: 'cv-backup'
        },
      });
      
      await s3Client.send(command);
      
      // Get public URL
      const publicUrl = getS3PublicUrl(s3Key);
      
      console.log('✅ CVS3Service - CV saved to S3:', publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error('❌ CVS3Service - Error saving CV to S3:', error);
      // Don't throw - S3 backup is non-critical
      return null;
    }
  }
  
  /**
   * Get CV from S3 (if available)
   * @param s3Url - S3 URL of the CV
   * @returns CV document or null
   */
  static async getCVFromS3(s3Url: string): Promise<any | null> {
    try {
      // Extract S3 key from URL
      // URL format: https://bucket.s3.region.amazonaws.com/key
      const urlObj = new URL(s3Url);
      const keyPart = urlObj.pathname.substring(1); // Remove leading slash
      
      if (!keyPart) return null;
      
      // Fetch from S3
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = getS3Client();
      
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: keyPart
      });
      
      const response = await s3Client.send(command);
      
      if (!response.Body) return null;
      
      // Read the body - handle both stream and buffer formats
      let buffer: Buffer;
      if (response.Body instanceof Buffer) {
        buffer = response.Body;
      } else if (response.Body instanceof ReadableStream) {
        const chunks: Uint8Array[] = [];
        const reader = response.Body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        buffer = Buffer.concat(chunks);
      } else {
        // For Node.js streams
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as any) {
          chunks.push(Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }
      
      const jsonContent = buffer.toString('utf-8');
      const cvDocument = JSON.parse(jsonContent);
      
      return cvDocument;
    } catch (error) {
      console.error('❌ CVS3Service - Error fetching CV from S3:', error);
      return null;
    }
  }
}

