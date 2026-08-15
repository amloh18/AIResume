import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { generateLinkedInPost, createLinkedInUGCPayload, validateLinkedInPost } from '@/lib/services/linkedin-post-mapper';
import { decryptToken } from '@/lib/auth/token-encryption';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * POST /api/linkedin/post
 * Post content to LinkedIn profile
 * Requires valid session with LinkedIn access token
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);

  // Validate session
  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Not authenticated' 
    }, { status: 401 });
  }

  // Check for LinkedIn token in session
  const encryptedToken = (session.user as any).linkedInAccessToken;
  const linkedInId = (session.user as any).linkedInId;
  
  if (!encryptedToken || !linkedInId) {
    return NextResponse.json({ 
      success: false, 
      error: 'LinkedIn account not connected' 
    }, { status: 400 });
  }

  try {
    // Decrypt the LinkedIn access token
    const linkedInAccessToken = decryptToken(encryptedToken);

    // Parse request body
    const body = await request.json();
    const { content, cvData, enhancedSections, options } = body;

    let postContent: any;

    // Generate post content if not provided
    if (content) {
      postContent = { text: content };
    } else if (cvData) {
      // Generate from CV data
      postContent = generateLinkedInPost(cvData, enhancedSections, options);
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Either content or cvData must be provided' 
      }, { status: 400 });
    }

    // Validate post content
    const validation = validateLinkedInPost(postContent);
    if (!validation.valid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid post content',
        details: validation.errors 
      }, { status: 400 });
    }

    // Create UGC post payload
    const ugcPayload = createLinkedInUGCPayload(linkedInId, postContent, 'PUBLIC');

    // Post to LinkedIn
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedInAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    });

    if (!postRes.ok) {
      const errorData = await postRes.json().catch(() => ({}));
      
      // Handle specific LinkedIn API errors
      if (postRes.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'LinkedIn token expired. Please reconnect your LinkedIn account.' 
        }, { status: 401 });
      }

      if (postRes.status === 403) {
        return NextResponse.json({ 
          success: false, 
          error: 'Insufficient permissions to post to LinkedIn. Please check your LinkedIn app permissions.' 
        }, { status: 403 });
      }

      throw new Error(errorData.message || `Failed to post to LinkedIn: ${postRes.status} ${postRes.statusText}`);
    }

    const postData = await postRes.json();
    
    // Extract post ID and generate LinkedIn URL
    const postId = postData.id;
    const postUrl = `https://www.linkedin.com/feed/update/${postId.split(':').pop()}/`;

    return NextResponse.json({ 
      success: true, 
      postUrl,
      postId,
      message: 'Successfully posted to LinkedIn'
    });
  } catch (error: any) {
    console.error('LinkedIn post error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to post to LinkedIn' 
    }, { status: 500 });
  }
}

/**
 * GET /api/linkedin/post/validate
 * Validate post content without actually posting
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const content = searchParams.get('content');

  if (!content) {
    return NextResponse.json({ 
      success: false, 
      error: 'Content parameter is required' 
    }, { status: 400 });
  }

  const post = { text: content };
  const validation = validateLinkedInPost(post);

  return NextResponse.json({ 
    success: true, 
    valid: validation.valid, 
    errors: validation.errors,
    characterCount: content.length,
    remainingCharacters: 3000 - content.length
  });
}
