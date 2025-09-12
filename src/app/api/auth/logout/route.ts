import { NextRequest, NextResponse } from 'next/server';
import { revokeToken, verifyToken } from '@/lib/jwt';
import { clearSessionFromResponse, validateCSRFFromRequest } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout attempt started');
    
    // CSRF validation
    const isValidCSRF = validateCSRFFromRequest(request);
    if (!isValidCSRF) {
      console.log('❌ CSRF validation failed');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid CSRF token',
          error: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      );
    }
    
    // Get tokens from cookies
    const accessToken = request.cookies.get('auth-token')?.value;
    const refreshToken = request.cookies.get('refresh-token')?.value;
    
    // Revoke tokens if they exist
    if (accessToken) {
      revokeToken(accessToken);
      console.log('✅ Access token revoked');
    }
    
    if (refreshToken) {
      revokeToken(refreshToken);
      console.log('✅ Refresh token revoked');
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    // Clear all session cookies
    clearSessionFromResponse(response);
    
    console.log('✅ Logout successful');
    
    return response;
    
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, clear cookies and return success
    // This ensures user is logged out from client side
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    clearSessionFromResponse(response);
    
    return response;
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    },
  });
}
