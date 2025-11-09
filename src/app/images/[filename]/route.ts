import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Map of missing files to their fallback files
const fallbackMap: Record<string, string> = {
  'favicon-16x16.png': 'logo.png',
  'icon-144x144.png': 'logo.png',
  'favicon.png': 'logo.png',
};

// S3 fallback URL base
const getS3FallbackUrl = (filename: string): string | null => {
  const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
  if (!s3BaseUrl) return null;
  return `${s3BaseUrl}/${encodeURIComponent(filename)}`;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // First, try to serve the requested file from local public/images
    const requestedPath = join(process.cwd(), 'public', 'images', filename);
    if (existsSync(requestedPath)) {
      const imageBuffer = await readFile(requestedPath);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    // If file doesn't exist, check if we have a local fallback
    const fallbackFile = fallbackMap[filename];
    if (fallbackFile) {
      const fallbackPath = join(process.cwd(), 'public', 'images', fallbackFile);
      if (existsSync(fallbackPath)) {
        const imageBuffer = await readFile(fallbackPath);
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }
    
    // Try S3 fallback if configured
    const s3Url = getS3FallbackUrl(filename);
    if (s3Url) {
      try {
        const s3Response = await fetch(s3Url);
        if (s3Response.ok) {
          const imageBuffer = await s3Response.arrayBuffer();
          return new NextResponse(imageBuffer, {
            headers: {
              'Content-Type': s3Response.headers.get('Content-Type') || 'image/png',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      } catch (s3Error) {
        console.warn(`S3 fallback failed for ${filename}:`, s3Error);
      }
    }
    
    // Try S3 fallback for the fallback file if original not found
    if (fallbackFile) {
      const s3FallbackUrl = getS3FallbackUrl(fallbackFile);
      if (s3FallbackUrl) {
        try {
          const s3Response = await fetch(s3FallbackUrl);
          if (s3Response.ok) {
            const imageBuffer = await s3Response.arrayBuffer();
            return new NextResponse(imageBuffer, {
              headers: {
                'Content-Type': s3Response.headers.get('Content-Type') || 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        } catch (s3Error) {
          console.warn(`S3 fallback failed for ${fallbackFile}:`, s3Error);
        }
      }
    }
    
    // Return 404 if file not found and no fallback
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error(`Error serving image ${(await params).filename}:`, error);
    return new NextResponse(null, { status: 404 });
  }
}

