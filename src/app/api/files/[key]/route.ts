import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * GET /api/files/[key]
 * Generate a presigned URL to fetch/read a file from S3
 * This ensures secure access to files even if the bucket is private
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { key } = await params;
    
    // Decode the key (it might be URL encoded)
    let decodedKey = decodeURIComponent(key);
    
    // If the key is a full S3 URL, extract just the key part
    if (decodedKey.includes('.amazonaws.com/')) {
      try {
        const url = new URL(decodedKey);
        decodedKey = url.pathname.substring(1); // Remove leading slash
      } catch {
        // If URL parsing fails, try manual extraction
        const match = decodedKey.match(/\.amazonaws\.com\/(.+)$/);
        if (match) {
          decodedKey = match[1];
        }
      }
    }
    
    // Verify the user has access to this file
    // Files are organized by userId, so check if the key contains the userId
    const userId = session.user.id;
    
    // Security check: ensure the file belongs to the user
    // Files are stored as: {type}/{userId}/{filename} or {type}/templates/{filename}
    const keyParts = decodedKey.split('/');
    if (keyParts.length >= 2) {
      // Template thumbnails are public (stored in thumbnails/templates/)
      if (keyParts[0] === 'thumbnails' && keyParts[1] === 'templates') {
        // Template thumbnails are public, allow access
      } else {
        // For user-specific files, check userId matches
        const expectedUserId = keyParts[1];
        if (expectedUserId !== userId) {
          // For thumbnails, the structure is thumbnails/{userId}/{cvId}-{timestamp}.svg
          // So we need to check userId matches
          if (keyParts[0] === 'thumbnails' && keyParts[1] !== userId) {
            return NextResponse.json(
              { error: 'Forbidden: You do not have access to this file' },
              { status: 403 }
            );
          }
          // For other types, check userId
          if (!['profile-pictures', 'documents', 'files'].includes(keyParts[0]) || keyParts[1] !== userId) {
            return NextResponse.json(
              { error: 'Forbidden: You do not have access to this file' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Create command to get the object
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: decodedKey,
    });

    // Generate presigned URL (expires in 1 hour)
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating file access URL:', error);
    
    // If file doesn't exist, return 404
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error generating file access URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

