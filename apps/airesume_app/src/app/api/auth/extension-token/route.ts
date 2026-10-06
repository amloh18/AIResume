import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import jwt from 'jsonwebtoken';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';

// Token expiration: 30 days
const TOKEN_EXPIRY_DAYS = 30;
const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
// Warning threshold: warn when token expires in 7 days
const EXPIRY_WARNING_DAYS = 7;
const EXPIRY_WARNING_MS = EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Extension token request received');
    
    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body;
    
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_FAILED,
          'Not authenticated. Please sign in to generate an extension token.'
        ),
        { status: 401 }
      );
    }
    
    console.log('✅ Valid session found for:', session.user.email);
    
    await getConnection();
    
    // Find the user in the database
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_FAILED,
          'User not found'
        ),
        { status: 404 }
      );
    }
    
    console.log('✅ User found in database:', user._id);
    
    // If refreshToken is provided, verify it first
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.NEXTAUTH_SECRET!) as any;
        if (decoded.userId !== user._id.toString() || decoded.type !== 'extension') {
          throw new Error('Invalid refresh token');
        }
        console.log('✅ Refresh token verified');
      } catch (refreshError) {
        console.log('❌ Invalid refresh token');
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.AUTH_INVALID,
            'Invalid refresh token. Please sign in again.'
          ),
          { status: 401 }
        );
      }
    }
    
    // Calculate expiration times
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
    const expiresAtDate = new Date(expiresAt);
    const warningThreshold = Date.now() + EXPIRY_WARNING_MS;
    
    // Create a JWT token for the extension
    const extensionToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: 'extension'
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: `${TOKEN_EXPIRY_DAYS}d` }
    );
    
    // Create refresh token (longer expiry: 60 days)
    const refreshTokenNew = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: 'extension_refresh'
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '60d' }
    );
    
    console.log('✅ Extension token created');
    
    // Check if token is expiring soon
    const isExpiringSoon = expiresAt < warningThreshold;
    const daysUntilExpiry = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    
    return NextResponse.json(
      formatExtensionSuccess({
        token: extensionToken,
        refreshToken: refreshTokenNew,
        expiresAt: expiresAtDate.toISOString(),
        expiresInDays: daysUntilExpiry,
        warning: isExpiringSoon ? {
          message: `Token expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please refresh soon.`,
          daysRemaining: daysUntilExpiry
        } : undefined,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
      })
    );
    
  } catch (error: any) {
    console.error('❌ Extension token error:', error);
    return NextResponse.json(
      formatExtensionError(
        ExtensionErrorCode.SERVER_ERROR,
        error.message || 'Failed to create extension token'
      ),
      { status: 500 }
    );
  }
}