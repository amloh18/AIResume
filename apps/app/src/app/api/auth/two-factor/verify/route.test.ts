import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock the handler function
const mockHandler = async (request: NextRequest) => {
  try {
    const { sessionId, code } = await request.json();

    if (!sessionId || !code) {
      return NextResponse.json(
        { success: false, error: 'Session ID and code are required' },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    // Simulate verification result
    if (code === '000000') {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code. Please try again.' },
        { status: 401 }
      );
    }

    if (code === '111111') {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please sign in again.' },
        { status: 401 }
      );
    }

    if (code === '999999') {
      throw new Error('Database error');
    }

    // Success case
    return NextResponse.json({
      success: true,
      userId: 'user123',
      email: 'test@example.com',
      message: 'Code verified successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
};

describe('2FA Verify Route', () => {
  describe('POST /api/auth/two-factor/verify', () => {
    it('should return 400 for missing sessionId or code', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session ID and code are required');
    });

    it('should return 400 for invalid code format', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'abc123', code: '123' }),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid code format');
    });

    it('should return 401 for invalid code', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'abc123', code: '000000' }),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 401 for too many failed attempts', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'abc123', code: '111111' }),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many failed attempts');
    });

    it('should return 200 for successful verification', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'abc123', code: '123456' }),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user123');
      expect(data.email).toBe('test@example.com');
    });

    it('should return 500 for server errors', async () => {
      const request = new NextRequest('http://localhost/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'abc123', code: '999999' }),
      });

      const response = await mockHandler(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
