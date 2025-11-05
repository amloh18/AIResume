/**
 * Centralized S3 Client Configuration
 * 
 * This module provides a single, consistent S3 client instance for the entire application.
 * All S3 operations should use this client to ensure consistent configuration and error handling.
 */

import { S3Client } from '@aws-sdk/client-s3';

/**
 * Validate S3 environment variables are set
 */
function validateS3Config(): void {
  const requiredVars = [
    'AWS_S3_REGION',
    'AWS_S3_BUCKET_NAME',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required S3 environment variables: ${missing.join(', ')}\n` +
      'Please set these in your .env.local file. See env.example for details.'
    );
  }
}

/**
 * Get S3 bucket name from environment
 */
export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET_NAME is not set');
  }
  return bucket;
}

/**
 * Get S3 region from environment
 */
export function getS3Region(): string {
  const region = process.env.AWS_S3_REGION;
  if (!region) {
    throw new Error('AWS_S3_REGION is not set');
  }
  return region;
}

/**
 * Generate public URL for an S3 object
 */
export function getS3PublicUrl(key: string): string {
  const bucket = getS3BucketName();
  const region = getS3Region();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Centralized S3 client instance
 * 
 * This client is configured once and reused across all API routes.
 * It validates environment variables on first access.
 */
let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  // Validate configuration on first access
  if (!s3ClientInstance) {
    validateS3Config();
    
    s3ClientInstance = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  
  return s3ClientInstance;
}

/**
 * Reset S3 client (useful for testing)
 */
export function resetS3Client(): void {
  s3ClientInstance = null;
}

