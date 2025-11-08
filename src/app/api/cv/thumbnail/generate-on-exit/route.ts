import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { CVThumbnailService } from '@/lib/services/cvThumbnailService';

/**
 * API endpoint to generate thumbnail when studio is exited
 * This is called via sendBeacon or fetch with keepalive for reliability
 */
export async function POST(request: NextRequest) {
  try {
    // Get authentication
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    
    // Parse request body (handle both JSON and Blob from sendBeacon)
    let body: any;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      } else {
        // Handle Blob from sendBeacon
        const text = await request.text();
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('❌ Thumbnail Exit API - Error parsing request:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { cvId, forceRegenerate = true } = body;

    if (!cvId) {
      return NextResponse.json(
        { success: false, error: 'CV ID is required' },
        { status: 400 }
      );
    }

    console.log('🖼️ Thumbnail Exit API - Generating thumbnail for CV:', { cvId, userId });

    // Generate thumbnail (non-blocking, runs in background)
    // Use setImmediate for Node.js or setTimeout for browser environments
    const scheduleThumbnailGeneration = () => {
      if (typeof setImmediate !== 'undefined') {
        setImmediate(async () => {
          await generateThumbnail();
        });
      } else {
        setTimeout(async () => {
          await generateThumbnail();
        }, 0);
      }
    };

    const generateThumbnail = async () => {
      try {
        await getConnection();
        const thumbnailUrl = await CVThumbnailService.generateAndSaveThumbnail(
          cvId,
          userId,
          forceRegenerate
        );
        
        if (thumbnailUrl) {
          console.log('✅ Thumbnail Exit API - Thumbnail generated successfully:', thumbnailUrl);
        } else {
          console.warn('⚠️ Thumbnail Exit API - Thumbnail generation returned null');
        }
      } catch (error) {
        console.error('❌ Thumbnail Exit API - Error generating thumbnail:', error);
        // Retry once after a delay with exponential backoff
        setTimeout(async () => {
          try {
            await getConnection();
            const thumbnailUrl = await CVThumbnailService.generateAndSaveThumbnail(
              cvId,
              userId,
              forceRegenerate
            );
            if (thumbnailUrl) {
              console.log('✅ Thumbnail Exit API - Retry successful');
            } else {
              console.warn('⚠️ Thumbnail Exit API - Retry returned null');
            }
          } catch (retryError) {
            console.error('❌ Thumbnail Exit API - Retry failed:', retryError);
            // Final retry after longer delay
            setTimeout(async () => {
              try {
                await getConnection();
                await CVThumbnailService.generateAndSaveThumbnail(
                  cvId,
                  userId,
                  forceRegenerate
                );
                console.log('✅ Thumbnail Exit API - Final retry completed');
              } catch (finalError) {
                console.error('❌ Thumbnail Exit API - Final retry failed:', finalError);
              }
            }, 5000);
          }
        }, 2000);
      }
    };

    scheduleThumbnailGeneration();

    // Return immediately (don't wait for thumbnail generation)
    return NextResponse.json({
      success: true,
      message: 'Thumbnail generation queued'
    });

  } catch (error: any) {
    console.error('❌ Thumbnail Exit API - Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to queue thumbnail generation' },
      { status: 500 }
    );
  }
}

