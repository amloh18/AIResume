import mongoose from 'mongoose';
import LoginSession, { ILoginSession } from '@/models/LoginSession';

const SESSION_MAX_AGE_DAYS = 7;

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'unknown';
  if (/mobile|android|iphone|ipod/i.test(ua)) device = 'mobile';
  else if (/ipad|tablet/i.test(ua)) device = 'tablet';
  else if (/computer|desktop|windows|mac|linux/i.test(ua)) device = 'desktop';

  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

export class SessionService {
  /**
   * Create a new login session record.
   */
  static async createSession(params: {
    userId: string;
    jti: string;
    ip?: string;
    userAgent?: string;
    provider?: string;
    location?: string;
  }): Promise<ILoginSession> {
    await mongoose.connection.asPromise();

    const { device, browser, os } = parseUserAgent(params.userAgent || '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

    const session = await LoginSession.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      jti: params.jti,
      ip: params.ip || 'unknown',
      userAgent: params.userAgent || '',
      device,
      browser,
      os,
      location: params.location,
      provider: params.provider || 'credentials',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt,
    });

    return session;
  }

  /**
   * Validate that a session jti exists and is not revoked/expired.
   */
  static async validateSession(jti: string): Promise<boolean> {
    await mongoose.connection.asPromise();
    const session = await LoginSession.findOne({
      jti,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();

    return !!session;
  }

  /**
   * Touch a session to update lastActiveAt.
   */
  static async touchSession(jti: string): Promise<void> {
    await mongoose.connection.asPromise();
    await LoginSession.updateOne(
      { jti, revokedAt: { $exists: false } },
      { $set: { lastActiveAt: new Date() } }
    );
  }

  /**
   * Revoke a specific session by jti.
   */
  static async revokeSession(jti: string): Promise<boolean> {
    await mongoose.connection.asPromise();
    const result = await LoginSession.updateOne(
      { jti, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Revoke all sessions for a user except the current one.
   */
  static async revokeAllOtherSessions(userId: string, currentJti: string): Promise<number> {
    await mongoose.connection.asPromise();
    const result = await LoginSession.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        jti: { $ne: currentJti },
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  /**
   * Revoke ALL sessions for a user (used on password change).
   */
  static async revokeAllSessions(userId: string): Promise<number> {
    await mongoose.connection.asPromise();
    const result = await LoginSession.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  /**
   * Get all active sessions for a user.
   */
  static async getActiveSessions(userId: string) {
    await mongoose.connection.asPromise();
    return LoginSession.find({
      userId: new mongoose.Types.ObjectId(userId),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .lean();
  }

  /**
   * Get a session by jti.
   */
  static async getSessionByJti(jti: string) {
    await mongoose.connection.asPromise();
    return LoginSession.findOne({ jti }).lean();
  }

  /**
   * Delete expired and revoked sessions (cleanup job).
   */
  static async cleanupSessions(): Promise<{ expired: number; revoked: number }> {
    await mongoose.connection.asPromise();

    const expiredResult = await LoginSession.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    // Clean up revoked sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const revokedResult = await LoginSession.deleteMany({
      revokedAt: { $exists: true, $lt: thirtyDaysAgo },
    });

    return {
      expired: expiredResult.deletedCount,
      revoked: revokedResult.deletedCount,
    };
  }
}
