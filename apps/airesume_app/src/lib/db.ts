import mongoose from 'mongoose';
import type { Db, MongoClient } from 'mongodb';
import { getConnection } from '@/lib/database';

/**
 * Single database access layer.
 *
 * Everything routes through the Mongoose connection manager
 * (src/lib/database/connection-manager.ts), so the whole app shares one
 * MongoDB connection. `getDb` exposes the underlying native `Db` handle for
 * the (legacy) services that operate on raw collections directly.
 */
export async function getDb(): Promise<Db> {
  await getConnection();
  return mongoose.connection.db as unknown as Db;
}

export async function getClient() {
  await getConnection();
  return mongoose.connection.getClient();
}
