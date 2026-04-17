import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getS3Client } from "@/lib/s3-client";

/**
 * Generate a presigned URL for uploading files to S3
 * Supports different upload types: profile-pictures, thumbnails, documents, files
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication for security
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filename, contentType, uploadType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Strict content type validation to prevent malicious uploads
    const allowedContentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'text/plain'
    ];

    if (!allowedContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, Word documents, and images are allowed." },
        { status: 400 }
      );
    }

    // Validate upload type and set appropriate S3 key prefix
    const userId = session.user.id;
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    let s3Key: string;
    const uploadTypeLower = (uploadType || 'files').toLowerCase();

    switch (uploadTypeLower) {
      case 'profile-picture':
      case 'profile':
      case 'avatar':
        s3Key = `profile-pictures/${userId}/${timestamp}-${sanitizedFilename}`;
        break;
      case 'thumbnail':
      case 'cv-thumbnail':
        s3Key = `thumbnails/${userId}/cv-${timestamp}-${sanitizedFilename}`;
        break;
      case 'cover-letter-thumbnail':
      case 'cover-letter':
        s3Key = `thumbnails/${userId}/cover-letter-${timestamp}-${sanitizedFilename}`;
        break;
      case 'template-thumbnail':
      case 'template':
        s3Key = `thumbnails/templates/${timestamp}-${sanitizedFilename}`;
        break;
      case 'document':
      case 'cv-document':
      case 'cv-file':
        s3Key = `documents/${userId}/${timestamp}-${sanitizedFilename}`;
        break;
      case 'file':
      case 'files':
      default:
        s3Key = `files/${userId}/${timestamp}-${sanitizedFilename}`;
        break;
    }

    // Get S3 client
    const s3Client = getS3Client();
    
    // Create a command for the S3 client
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: contentType,
      // Add metadata
      Metadata: {
        userId: userId,
        uploadType: uploadTypeLower,
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate the presigned URL (expires in 10 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600, // 10 minutes
    });

    // Return the upload URL and the S3 key (which can be used to construct the public URL)
    const { getS3PublicUrl } = await import('@/lib/s3-client');
    const publicUrl = getS3PublicUrl(s3Key);

    return NextResponse.json({
      uploadUrl,
      filename: s3Key,
      publicUrl,
      key: s3Key,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Error generating presigned URL", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

