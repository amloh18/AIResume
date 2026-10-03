import 'server-only';
/**
 * DEPRECATED: This file is kept for backward compatibility during migration.
 * Use the unified connection manager from '@/lib/database' instead.
 * 
 * This file will be removed after full migration to the unified connection manager.
 */

import {
  getConnection,
  isConnected as isConnectedNew,
  getConnectionStatus as getConnectionStatusNew,
  closeConnection as closeConnectionNew,
  healthCheck as healthCheckNew,
} from './database/connection-manager';

/**
 * @deprecated Use getConnection() from '@/lib/database' instead
 */
async function connectDB() {
  return await getConnection();
}

// Re-export utilities from unified manager
export { getConnection };
export const isConnected = isConnectedNew;
export const getConnectionStatus = getConnectionStatusNew;
export const closeConnection = closeConnectionNew;
export const healthCheck = healthCheckNew;

// Helper function to ensure connection is ready before queries
export async function ensureConnection() {
  await getConnection();
  return true;
}

// Export both as default and named export for compatibility
export { connectDB as connectToDatabase };
export default connectDB;
