import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import { createErrorResponse } from '@/lib/db-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    let userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      userSettings = new UserSettings({ userId });
      await userSettings.save();
    }

    // Get user for password info
    const user = await User.findById(userId).select('password lastLogin');

    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: userSettings.security.twoFactorEnabled,
        lastPasswordChange: userSettings.security.lastPasswordChange,
        loginAttempts: userSettings.security.loginAttempts,
        lockedUntil: userSettings.security.lockedUntil,
        trustedDevices: userSettings.security.trustedDevices,
        hasPassword: !!user?.password,
        lastLogin: user?.lastLogin
      }
    });

  } catch (error: any) {
    console.error('Get security settings error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, data } = body;

    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      userSettings = new UserSettings({ userId });
    }

    switch (action) {
      case 'changePassword':
        await handlePasswordChange(userId, data, userSettings, clientIP, userAgent);
        break;
        
      case 'enableTwoFactor':
        await handleEnableTwoFactor(userId, userSettings, clientIP, userAgent);
        break;
        
      case 'disableTwoFactor':
        await handleDisableTwoFactor(userId, data, userSettings, clientIP, userAgent);
        break;
        
      case 'addTrustedDevice':
        await handleAddTrustedDevice(userId, data, userSettings, clientIP, userAgent);
        break;
        
      case 'removeTrustedDevice':
        await handleRemoveTrustedDevice(userId, data, userSettings, clientIP, userAgent);
        break;
        
      case 'setSecurityQuestions':
        await handleSetSecurityQuestions(userId, data, userSettings, clientIP, userAgent);
        break;
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully'
    });

  } catch (error: any) {
    console.error('Update security settings error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

async function handlePasswordChange(userId: string, data: any, userSettings: any, clientIP: string, userAgent: string) {
  const { currentPassword, newPassword } = data;
  
  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Update security settings
  userSettings.security.lastPasswordChange = new Date();
  userSettings.security.loginAttempts = 0;
  userSettings.security.lockedUntil = undefined;

  // Add audit log
  userSettings.auditLog.push({
    action: 'password_changed',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { passwordChanged: true }
  });

  await userSettings.save();
}

async function handleEnableTwoFactor(userId: string, userSettings: any, clientIP: string, userAgent: string) {
  // Generate 2FA secret
  const secret = crypto.randomBytes(32).toString('base64');
  
  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  userSettings.security.twoFactorEnabled = true;
  userSettings.security.twoFactorSecret = secret;
  userSettings.security.backupCodes = backupCodes;

  // Add audit log
  userSettings.auditLog.push({
    action: 'two_factor_enabled',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { twoFactorEnabled: true }
  });

  await userSettings.save();
}

async function handleDisableTwoFactor(userId: string, data: any, userSettings: any, clientIP: string, userAgent: string) {
  const { password } = data;
  
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  // If user has a password, require it to disable 2FA
  if (user.password) {
    if (!password) {
      throw new Error('Password is required to disable two-factor authentication');
    }
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }
  }

  userSettings.security.twoFactorEnabled = false;
  userSettings.security.twoFactorSecret = undefined;
  userSettings.security.backupCodes = [];

  // Add audit log
  userSettings.auditLog.push({
    action: 'two_factor_disabled',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { twoFactorEnabled: false }
  });

  await userSettings.save();
}

async function handleAddTrustedDevice(userId: string, data: any, userSettings: any, clientIP: string, userAgent: string) {
  const { deviceId, deviceName } = data;
  
  if (!deviceId || !deviceName) {
    throw new Error('Device ID and device name are required');
  }

  // Remove existing device with same ID
  userSettings.security.trustedDevices = userSettings.security.trustedDevices.filter(
    (device: any) => device.deviceId !== deviceId
  );

  // Add new trusted device
  userSettings.security.trustedDevices.push({
    deviceId,
    deviceName,
    lastUsed: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent
  });

  // Keep only last 10 trusted devices
  if (userSettings.security.trustedDevices.length > 10) {
    userSettings.security.trustedDevices = userSettings.security.trustedDevices.slice(-10);
  }

  // Add audit log
  userSettings.auditLog.push({
    action: 'trusted_device_added',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { deviceId, deviceName }
  });

  await userSettings.save();
}

async function handleRemoveTrustedDevice(userId: string, data: any, userSettings: any, clientIP: string, userAgent: string) {
  const { deviceId } = data;
  
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  userSettings.security.trustedDevices = userSettings.security.trustedDevices.filter(
    (device: any) => device.deviceId !== deviceId
  );

  // Add audit log
  userSettings.auditLog.push({
    action: 'trusted_device_removed',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { deviceId }
  });

  await userSettings.save();
}

async function handleSetSecurityQuestions(userId: string, data: any, userSettings: any, clientIP: string, userAgent: string) {
  const { questions } = data;
  
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new Error('Security questions are required');
  }

  // Hash answers
  const hashedQuestions = await Promise.all(questions.map(async (q: any) => ({
    question: q.question,
    answer: await bcrypt.hash(q.answer, 12)
  })));

  userSettings.security.securityQuestions = hashedQuestions;

  // Add audit log
  userSettings.auditLog.push({
    action: 'security_questions_set',
    timestamp: new Date(),
    ipAddress: clientIP,
    userAgent: userAgent,
    changes: { questionsCount: questions.length }
  });

  await userSettings.save();
}
