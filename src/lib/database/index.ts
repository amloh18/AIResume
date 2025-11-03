/**
 * Unified Database Connection Module
 * 
 * This is the single source of truth for database connections.
 */

import {
  dbManager,
  getConnection,
  healthCheck,
  isConnected,
  getConnectionStatus,
  closeConnection,
  gracefulShutdown,
} from './connection-manager';

// Named exports
export {
  dbManager,
  getConnection,
  healthCheck,
  isConnected,
  getConnectionStatus,
  closeConnection,
  gracefulShutdown,
};

// Backward compatibility aliases
export const connectDB = getConnection;
export const connectToDatabase = getConnection;

// Default export
export default getConnection;
