import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  saveRecoveryCodes,
  verifyRecoveryCode,
  getRecoveryCodesForDisplay,
  hasRecoveryCodes,
} from '@/lib/services/twoFactorService';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

/**
 * Generate recovery codes for 2FA
 * POST /api/auth/two-factor/recovery-codes
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, code } = await request.json();

    await getConnection();

    // Verify user exists
    const user = await User.findById(authResult.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if 2FA is enabled
    const userSettings = await UserSettings.findOne({ userId: user.id });
    if (!userSettings?.security?.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled for this account' },
        { status: 400 }
      );
    }

    if (action === 'generate') {
      // Generate new recovery codes
      const codes = generateRecoveryCodes();
      const displayCodes = getRecoveryCodesForDisplay(codes);
      
      // Save hashed codes
      await saveRecoveryCodes(user.id, codes);

      return NextResponse.json({
        success: true,
        recoveryCodes: displayCodes,
        message: 'Recovery codes generated successfully. Save them securely!',
      });
    } else if (action === 'verify') {
      // Verify a recovery code
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Code is required' },
          { status: 400 }
        );
      }

      const isValid = await verifyRecoveryCode(user.id, code);

      if (isValid) {
        return NextResponse.json({
          success: true,
          message: 'Recovery code verified successfully',
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid or already used recovery code' },
          { status: 401 }
        );
      }
    } else if (action === 'check') {
      // Check if user has available recovery codes
      const hasCodes = await hasRecoveryCodes(user.id);
      const userSettings = await UserSettings.findOne({ userId: user.id });
      const totalCodes = userSettings?.security?.twoFactorRecoveryCodes?.length || 0;
      const usedCodes = userSettings?.security?.twoFactorRecoveryUsed?.length || 0;
      const availableCodes = totalCodes - usedCodes;

      return NextResponse.json({
        success: true,
        hasCodes,
        availableCodes,
        totalCodes,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error handling recovery codes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check recovery code status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    const userSettings = await UserSettings.findOne({ userId: authResult.user.id });
    const hasCodes = await hasRecoveryCodes(authResult.user.id);
    const totalCodes = userSettings?.security?.twoFactorRecoveryCodes?.length || 0;
    const usedCodes = userSettings?.security?.twoFactorRecoveryUsed?.length || 0;
    const availableCodes = totalCodes - usedCodes;

    return NextResponse.json({
      success: true,
      hasCodes,
      availableCodes,
      totalCodes,
      has2FAEnabled: userSettings?.security?.twoFactorEnabled || false,
    });
  } catch (error: any) {
    console.error('❌ Error checking recovery codes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check recovery codes' },
      { status: 500 }
    );
  }
}
