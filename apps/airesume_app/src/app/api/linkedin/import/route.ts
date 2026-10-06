import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { mapLinkedInProfileToCV } from '@/lib/services/linkedin-mapper';
import { encryptToken, decryptToken } from '@/lib/auth/token-encryption';

/**
 * GET /api/linkedin/import
 * Import CV data from LinkedIn profile
 * Requires valid session with LinkedIn access token
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);

  // Validate session
  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Not authenticated' 
    }, { status: 401 });
  }

  // Check for LinkedIn token in session
  const linkedInAccessToken = (session.user as any).linkedInAccessToken;
  if (!linkedInAccessToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'LinkedIn account not connected' 
    }, { status: 400 });
  }

  try {
    // Fetch LinkedIn profile with detailed fields
    const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,summary,positions,skills,educations,languages,vanityName,locationName)', {
      headers: {
        'Authorization': `Bearer ${linkedInAccessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Cache-Control': 'no-cache',
      },
    });

    if (!profileRes.ok) {
      // If token is expired or invalid, return specific error
      if (profileRes.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'LinkedIn token expired. Please reconnect your LinkedIn account.' 
        }, { status: 401 });
      }
      throw new Error(`Failed to fetch LinkedIn profile: ${profileRes.status} ${profileRes.statusText}`);
    }

    const profile = await profileRes.json();

    // Fetch email address separately (required scope)
    let emailAddress = '';
    try {
      const emailRes = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${linkedInAccessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        emailAddress = emailData.elements?.[0]?.['handle~']?.emailAddress || '';
      }
    } catch (emailError) {
      console.warn('Failed to fetch LinkedIn email:', emailError);
      // Continue without email - it's optional
    }

    // Add email to profile for mapping
    const profileWithEmail = { ...profile, emailAddress };

    // Map to CV structure
    const cvData = mapLinkedInProfileToCV(profileWithEmail);

    return NextResponse.json({ 
      success: true, 
      data: cvData,
      metadata: {
        source: 'linkedin',
        linkedInId: profile.id,
        importedAt: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    console.error('LinkedIn import error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to import from LinkedIn' 
    }, { status: 500 });
  }
}

/**
 * POST /api/linkedin/import/refresh
 * Refresh LinkedIn access token
 * Note: LinkedIn OAuth 2.0 doesn't support refresh tokens for most integrations
 * This endpoint would typically redirect to re-authenticate
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Not authenticated' 
    }, { status: 401 });
  }

  return NextResponse.json({ 
    success: false, 
    error: 'Token refresh not supported. Please reconnect your LinkedIn account.' 
  }, { status: 400 });
}
