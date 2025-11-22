/**
 * Client-side utility for uploading files to S3 using presigned URLs
 */

'use client';

import { useState } from 'react';

export interface UploadOptions {
  file: File;
  uploadType?: 'profile-picture' | 'thumbnail' | 'cv-thumbnail' | 'cover-letter-thumbnail' | 'template-thumbnail' | 'document' | 'file';
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  key?: string;
  filename?: string;
  error?: string;
}

/**
 * Upload a file to S3 using presigned URL
 * @param options - Upload options including file and upload type
 * @returns Promise with upload result
 */
export async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
  const { file, uploadType = 'file', onProgress } = options;

  try {
    // Step 1: Get presigned URL from our API
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        uploadType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get upload URL' }));
      throw new Error(errorData.error || 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl, key, filename } = await response.json();

    // Validate uploadUrl before attempting upload
    if (!uploadUrl || typeof uploadUrl !== 'string') {
      throw new Error('Invalid upload URL received from server');
    }

    // Step 2: Upload file directly to S3 using presigned URL
    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    } catch (fetchError) {
      // Handle network errors specifically
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to upload server. Please check your internet connection.');
      }
      throw fetchError;
    }

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => uploadResponse.statusText);
      throw new Error(`File upload to S3 failed: ${uploadResponse.status} ${errorText}`);
    }

    // Report progress
    if (onProgress) {
      onProgress(100);
    }

    return {
      success: true,
      publicUrl,
      key,
      filename,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * React hook for file uploads with progress tracking
 * NOTE: This hook uses useState, so it must only be used in client components
 * The file already has 'use client' directive at the top
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (options: Omit<UploadOptions, 'onProgress'>) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadToS3({
        ...options,
        onProgress: (progressValue) => {
          setProgress(progressValue);
        },
      });

      if (!result.success) {
        setError(result.error || 'Upload failed');
        return result;
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      } as UploadResult;
    } finally {
      setUploading(false);
    }
  };

  return {
    upload,
    uploading,
    progress,
    error,
  };
}

