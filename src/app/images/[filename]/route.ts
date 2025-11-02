import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Map of missing files to their fallback files
const fallbackMap: Record<string, string> = {
  'favicon-16x16.png': 'favicon.png',
  'icon-144x144.png': 'favicon.png',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // First, try to serve the requested file
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
    
    // If file doesn't exist, check if we have a fallback
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
    
    // Return 404 if file not found and no fallback
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error(`Error serving image ${(await params).filename}:`, error);
    return new NextResponse(null, { status: 404 });
  }
}

