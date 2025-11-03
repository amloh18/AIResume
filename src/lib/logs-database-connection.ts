import mongoose from 'mongoose';

// Logs database connection utility
// This creates a separate connection to the cvcircle_logs database for high-volume logging data

let logsConnection: mongoose.Connection | null = null;

export async function getLogsConnection(): Promise<mongoose.Connection> {
  if (logsConnection && logsConnection.readyState === 1) {
    return logsConnection;
  }

  const baseUri = process.env.MONGODB_URI || '';
  if (!baseUri) {
    throw new Error('MONGODB_URI not set');
  }

  // Create logs database URI
  const logsUri = baseUri && typeof baseUri === 'string' && baseUri.includes('/cvcircle')
    ? baseUri.replace('/cvcircle', '/cvcircle_logs')
    : baseUri && typeof baseUri === 'string' && baseUri.endsWith('/')
      ? baseUri + 'cvcircle_logs'
      : baseUri && typeof baseUri === 'string' ? baseUri + '/cvcircle_logs' : baseUri;

  console.log('🔗 Connecting to logs database:', logsUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    logsConnection = await mongoose.createConnection(logsUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      ssl: true,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
    });

    console.log('✅ Logs database connected successfully');
    console.log(`📊 Logs Database: ${logsConnection.db?.databaseName || 'unknown'}`);
    
    return logsConnection;
  } catch (error) {
    console.error('❌ Logs database connection error:', error);
    throw error;
  }
}

export function getLogsConnectionSync(): mongoose.Connection | null {
  return logsConnection;
}

// Helper function to get logs database
export async function getLogsDB() {
  const connection = await getLogsConnection();
  return connection.db;
}
