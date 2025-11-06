import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/database';
import AdminAuth from '@/models/AdminAuth';
import { ActivityLogService } from '@/lib/services/activityLogService';

// Admin authentication using database
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await getConnection();

    // Find admin user by email
    const adminUser = await AdminAuth.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!adminUser) {
      // Log failed login attempt
      await ActivityLogService.logAdminAction({
        adminUserId: undefined,
        adminEmail: email.toLowerCase(),
        action: 'admin_login_failed',
        actionType: 'authentication',
        status: 'failed',
        metadata: {
          reason: 'user_not_found',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
        }
      });

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await adminUser.comparePassword(password);
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await ActivityLogService.logAdminAction({
        adminUserId: adminUser._id.toString(),
        adminEmail: adminUser.email,
        action: 'admin_login_failed',
        actionType: 'authentication',
        status: 'failed',
        metadata: {
          reason: 'invalid_password',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
        }
      });

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    adminUser.lastLogin = new Date();
    await adminUser.save();

    // Log successful admin login
    await ActivityLogService.logAdminAction({
      adminUserId: adminUser._id.toString(),
      adminEmail: adminUser.email,
      action: 'admin_login_success',
      actionType: 'authentication',
      status: 'success',
      metadata: {
        role: adminUser.role,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    });

    // Create JWT token
    const token = jwt.sign(
      {
        id: adminUser._id.toString(),
        email: adminUser.email,
        name: adminUser.email.split('@')[0], // Use email prefix as name
        role: adminUser.role,
        type: 'admin',
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        name: adminUser.email.split('@')[0],
        role: adminUser.role,
        type: 'admin',
      },
    });

    // Set cookie (use base domain in production to avoid duplicates across subdomains)
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
      ...(process.env.NODE_ENV === 'production' ? { domain: '.cvcircle.io' } : {}),
    });

    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
