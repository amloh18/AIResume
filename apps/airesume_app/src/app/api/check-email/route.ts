import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleCheck(email: string | null | undefined) {
  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { success: false, message: 'Email is required' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { success: false, message: 'Invalid email format' },
      { status: 400 }
    );
  }

  try {
    await getConnection();
  } catch (dbError: any) {
    console.error('❌ MongoDB connection error in check-email:', dbError);
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed. Please try again later.',
        error: 'DATABASE_CONNECTION_ERROR',
      },
      { status: 503 }
    );
  }

  try {
    // 1. Check User collection
    const existingUser = await User.findOne({ email: normalizedEmail }).lean().exec();
    if (existingUser) {
      return NextResponse.json({
        success: true,
        exists: true,
        isEmailVerified: (existingUser as any).isEmailVerified ?? false,
        role: (existingUser as any).role || 'user',
      });
    }

    // 2. Check AdminAuth collection as fallback
    try {
      const AdminAuth = (await import('@/models/AdminAuth')).default;
      const existingAdmin = await AdminAuth.findOne({ email: normalizedEmail }).lean().exec();
      if (existingAdmin) {
        return NextResponse.json({
          success: true,
          exists: true,
          isEmailVerified: true,
          role: (existingAdmin as any).role || 'admin',
        });
      }
    } catch {
      // Ignore fallback error
    }

    return NextResponse.json({
      success: true,
      exists: false,
      isEmailVerified: false,
    });
  } catch (queryError: any) {
    console.error('❌ Database query error in check-email:', queryError);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check email. Please try again later.',
        error: 'DATABASE_QUERY_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return await handleCheck(body.email);
  } catch (error: any) {
    console.error('❌ Check email error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check email' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    return await handleCheck(email);
  } catch (error: any) {
    console.error('❌ Check email error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check email' },
      { status: 500 }
    );
  }
}
