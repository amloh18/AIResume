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

/**
 * `jti` carries a unique index, so two writers racing on the same jti make the loser fail
 * with E11000 rather than merely updating. That is expected under concurrency, not an error.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: number; message?: string };
  // 11000 is MongoDB's duplicate-key code. Fall back to the message because a driver or
  // proxy layer can surface the error without preserving `code`.
  return code === 11000 || (typeof message === 'string' && message.includes('E11000'));
}

export interface SessionRecordParams {
  userId: string;
  jti: string;
  ip?: string;
  userAgent?: string;
  provider?: string;
  location?: string;
}

/**
 * The slice of a Mongoose model this module writes through. Narrowing it to the two calls
 * actually used is what makes the concurrency behaviour below testable without a live
 * database — `session-service.test.ts` drives it with a fake that rejects the way MongoDB
 * does when two writers collide.
 */
export interface LoginSessionWriteModel {
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<ILoginSession | null>;
  findOne(filter: Record<string, unknown>): Promise<ILoginSession | null>;
}

/**
 * Record a login session for `jti` — **idempotent**, and safe to call concurrently.
 *
 * Callers are not always a single well-ordered sign-in. The `jwt` callback re-records a
 * session whenever a validly-signed token has no matching `LoginSession` row, and a browser
 * fires its requests in parallel: every one of them reads `missing` before any of them has
 * written, so several then try to insert the *same* jti.
 *
 * A plain `LoginSession.create()` makes all but one of those fail with
 * `E11000 duplicate key error … index: jti_1`, which is pure noise — the row the caller
 * wanted exists. Worse, it surfaces through a `catch` whose whole purpose is to make a write
 * failure visible, so a benign race looks exactly like a broken database.
 *
 * Upserting instead makes the operation converge on one row no matter how many callers race,
 * and `$setOnInsert` keeps the *first* writer's metadata (ip, userAgent, provider) rather than
 * letting a later request replace a real device with the `recovered` placeholder.
 *
 * The retry is load-bearing: MongoDB upserts are **not** atomic against concurrent upserts on
 * the same key, so the loser of the insert still gets E11000 even with `upsert: true`. Reading
 * the winner's row is the correct response to that, not an error.
 */
export async function upsertLoginSession(
  model: LoginSessionWriteModel,
  params: SessionRecordParams
): Promise<ILoginSession | null> {
  const { device, browser, os } = parseUserAgent(params.userAgent || '');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);
  const now = new Date();

  const insert = {
    userId: new mongoose.Types.ObjectId(params.userId),
    jti: params.jti,
    ip: params.ip || 'unknown',
    userAgent: params.userAgent || '',
    device,
    browser,
    os,
    location: params.location,
    provider: params.provider || 'credentials',
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
  };

  try {
    return await model.findOneAndUpdate(
      { jti: params.jti },
      { $setOnInsert: insert },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Another request inserted the same jti between our read and our write.
      return model.findOne({ jti: params.jti });
    }
    throw error;
  }
}

export class SessionService {
  /**
   * Record a login session, or return the one that already exists for this `jti`.
   * Throws only if the row cannot be written *and* cannot be read back.
   */
  static async createSession(params: SessionRecordParams): Promise<ILoginSession> {
    const session = await SessionService.ensureSession(params);
    if (!session) {
      throw new Error(`Failed to record login session for jti ${params.jti}`);
    }
    return session;
  }

  /**
   * Like `createSession`, but returns `null` instead of throwing when the row cannot be read
   * back after a lost insert race. Used by best-effort recovery paths, where a failure to
   * record telemetry must never be allowed to affect authentication.
   */
  static async ensureSession(params: SessionRecordParams): Promise<ILoginSession | null> {
    await mongoose.connection.asPromise();
    return upsertLoginSession(LoginSession as unknown as LoginSessionWriteModel, params);
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
   * Like validateSession, but distinguishes *why* a session is not usable.
   *
   * This matters because "no row at all" and "row exists but was revoked" are not
   * the same signal:
   *
   *   - `revoked` / `expired` — an explicit administrative or temporal decision.
   *     The row is still there and carries the intent. MUST fail closed.
   *   - `missing` — the row was never written, or was purged. Session recording is
   *     best-effort telemetry wrapped in a `catch` that only logs, so a failed write
   *     must not be able to brick authentication: the token is still a validly
   *     signed JWT. Callers may choose to tolerate this.
   *
   * Revocation is implemented by setting `revokedAt` (see revokeSession), never by
   * deleting the row — and cleanupSessions only deletes already-expired rows. So
   * tolerating `missing` does not weaken revocation.
   */
  static async getSessionState(
    jti: string
  ): Promise<'ok' | 'missing' | 'revoked' | 'expired'> {
    await mongoose.connection.asPromise();

    const session = await LoginSession.findOne({ jti })
      .select('revokedAt expiresAt')
      .lean<{ revokedAt?: Date; expiresAt?: Date } | null>();

    if (!session) return 'missing';
    if (session.revokedAt) return 'revoked';
    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) return 'expired';
    return 'ok';
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
