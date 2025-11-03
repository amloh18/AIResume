import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import usageLimitsService, { ActionContext } from '@/lib/services/usageLimitsService';

export interface UsageLimitsConfig {
  action: 'cv_journey' | 'cv_create' | 'export' | 'ats_check';
  requireDeviceFingerprint?: boolean;
  checkSuspiciousActivity?: boolean;
}

/**
 * Middleware to enforce usage limits on API routes
 */
export function withUsageLimits(config: UsageLimitsConfig) {
  return function (handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async function (req: NextRequest, ...args: any[]) {
      try {
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user ID from session or request
        const userId = args[0]?.params?.userId || session.user.id;
        if (!userId) {
          return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
        }

        // Extract device fingerprint from request headers
        const deviceFingerprint = req.headers.get('x-device-fingerprint');
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

        // Validate device fingerprint if required
        if (config.requireDeviceFingerprint && deviceFingerprint) {
          const isValidDevice = await usageLimitsService.validateDeviceFingerprint(userId, deviceFingerprint);
          if (!isValidDevice) {
            return NextResponse.json({ 
              error: 'Device validation failed',
              code: 'DEVICE_MISMATCH'
            }, { status: 403 });
          }
        }

        // Check for suspicious activity
        if (config.checkSuspiciousActivity) {
          const suspiciousCheck = await usageLimitsService.checkSuspiciousActivity({
            userId,
            action: config.action,
            deviceFingerprint: deviceFingerprint || undefined,
            ipAddress: ipAddress || undefined
          });

          if (suspiciousCheck.suspicious) {
            return NextResponse.json({ 
              error: 'Suspicious activity detected',
              reason: suspiciousCheck.reason,
              code: 'SUSPICIOUS_ACTIVITY'
            }, { status: 429 });
          }
        }

        // Check usage limits
        const usageCheck = await usageLimitsService.checkUsageLimit({
          userId,
          action: config.action,
          deviceFingerprint: deviceFingerprint || undefined,
          ipAddress: ipAddress || undefined
        });

        if (!usageCheck.allowed) {
          return NextResponse.json({ 
            error: 'Usage limit exceeded',
            reason: usageCheck.reason,
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
            resetTime: usageCheck.resetTime,
            code: 'USAGE_LIMIT_EXCEEDED'
          }, { status: 429 });
        }

        // Call the original handler
        const response = await handler(req, ...args);

        // If the response is successful, increment usage
        if (response.ok) {
          await usageLimitsService.incrementUsage({
            userId,
            action: config.action,
            deviceFingerprint: deviceFingerprint || undefined,
            ipAddress: ipAddress || undefined
          });
        }

        return response;

      } catch (error) {
        console.error('Usage limits middleware error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    };
  };
}

/**
 * Rate limiting middleware to prevent spam
 */
export function withRateLimit(maxRequests: number, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function (handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async function (req: NextRequest, ...args: any[]) {
      try {
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old entries
        for (const [key, value] of Array.from(requests.entries())) {
          if (value.resetTime < now) {
            requests.delete(key);
          }
        }

        // Check current request count
        const current = requests.get(ipAddress);
        if (current && current.resetTime > now && current.count >= maxRequests) {
          return NextResponse.json({ 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((current.resetTime - now) / 1000),
            code: 'RATE_LIMIT_EXCEEDED'
          }, { status: 429 });
        }

        // Update request count
        if (current && current.resetTime > now) {
          current.count++;
        } else {
          requests.set(ipAddress, {
            count: 1,
            resetTime: now + windowMs
          });
        }

        // Call the original handler
        return await handler(req, ...args);

      } catch (error) {
        console.error('Rate limit middleware error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    };
  };
}

/**
 * Device fingerprint validation middleware
 */
export function withDeviceValidation() {
  return function (handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async function (req: NextRequest, ...args: any[]) {
      try {
        const deviceFingerprint = req.headers.get('x-device-fingerprint');
        
        if (!deviceFingerprint) {
          return NextResponse.json({ 
            error: 'Device fingerprint required',
            code: 'DEVICE_FINGERPRINT_REQUIRED'
          }, { status: 400 });
        }

        // Validate fingerprint format (basic validation)
        if (deviceFingerprint.length < 10 || deviceFingerprint.length > 100) {
          return NextResponse.json({ 
            error: 'Invalid device fingerprint format',
            code: 'INVALID_DEVICE_FINGERPRINT'
          }, { status: 400 });
        }

        // Call the original handler
        return await handler(req, ...args);

      } catch (error) {
        console.error('Device validation middleware error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    };
  };
}
