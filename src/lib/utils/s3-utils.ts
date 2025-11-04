/**
 * Utility functions for working with S3 files
 * These are server-safe and can be used in both client and server components
 */

/**
 * Check if a URL is an S3 URL
 */
export function isS3Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('s3.amazonaws.com') || url.includes('s3.') || url.startsWith('https://') && url.includes('.amazonaws.com/');
}

/**
 * Extract S3 key from S3 URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    // Handle different S3 URL formats:
    // 1. https://bucket.s3.region.amazonaws.com/key
    // 2. https://bucket.s3.amazonaws.com/key
    // 3. s3://bucket/key
    
    if (url.startsWith('s3://')) {
      const parts = url.replace('s3://', '').split('/');
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
      return null;
    }
    
    if (url.includes('.amazonaws.com/')) {
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}

/**
 * Get a presigned URL for accessing an S3 file
 * This is useful when the bucket is private or you need secure access
 * Client-side only function
 */
export async function getS3FileUrl(s3Key: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/files/${encodeURIComponent(s3Key)}`);
    if (!response.ok) {
      console.error('Failed to get presigned URL:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Error getting S3 file URL:', error);
    return null;
  }
}

/**
 * Get a presigned URL from an S3 URL
 * If the URL is already an S3 URL, extract the key and get a presigned URL
 * Otherwise, return the original URL
 * Client-side only function
 */
export async function getSecureFileUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  
  // If it's not an S3 URL, return as-is (might be base64, external URL, etc.)
  if (!isS3Url(url)) {
    return url;
  }
  
  // Extract S3 key and get presigned URL
  const s3Key = extractS3KeyFromUrl(url);
  if (!s3Key) {
    // If we can't extract the key, return the original URL
    return url;
  }
  
  // Get presigned URL for secure access
  try {
    const presignedUrl = await getS3FileUrl(s3Key);
    return presignedUrl || url; // Fallback to original URL if presigned URL fails
  } catch (error) {
    console.error('Error getting secure file URL:', error);
    return url; // Fallback to original URL on error
  }
}

