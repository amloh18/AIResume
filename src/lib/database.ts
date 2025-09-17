import mongoose from 'mongoose';

// Load environment variables manually if not already loaded
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && typeof window === 'undefined') {
  // Only try to load from file system on server side
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        MONGODB_URI = uriMatch[1].trim();
        console.log('✅ Loaded MONGODB_URI from .env.local');
      }
    }
  } catch (error) {
    console.error('❌ Error loading .env.local:', error);
  }
}

// Fallback to default if still not found
MONGODB_URI = MONGODB_URI || 'mongodb://localhost:27017/cvcircle';

// Ensure the URI includes a database name
if (MONGODB_URI && !MONGODB_URI.includes('/cvcircle') && !MONGODB_URI.includes('/test') && !MONGODB_URI.includes('/admin')) {
  // Add /cvcircle to the URI if no database name is specified
  if (MONGODB_URI.endsWith('/') || MONGODB_URI.includes('?')) {
    MONGODB_URI = MONGODB_URI.replace(/(\?.*)$/, '/cvcircle$1');
  } else {
    MONGODB_URI = MONGODB_URI + '/cvcircle';
  }
  console.log('🔧 Added database name to MongoDB URI');
}

console.log('🔍 Current MONGODB_URI:', MONGODB_URI ? MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'undefined');

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Enhanced connection options for production
const connectionOptions = {
  bufferCommands: false,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 30000, // Increase timeout for Atlas
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  // SSL settings - required for MongoDB Atlas
  ssl: true, // Enable SSL for Atlas connections
  // Connection monitoring
  heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
  // Timeout settings
  connectTimeoutMS: 30000, // Increase timeout for Atlas connections
};

// Connection event handlers
const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during MongoDB shutdown:', err);
      process.exit(1);
    }
  });
};

async function connectDB() {
  // Don't attempt database connection on client side
  if (typeof window !== 'undefined') {
    throw new Error('Database connection cannot be established on client side');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Setup connection event handlers
    setupConnectionHandlers();

    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions).then((mongoose) => {
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to establish MongoDB connection:', e);
    throw e;
  }

  return cached.conn;
}

// Utility function to check if connected
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Utility function to get connection status
export const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
};

// Utility function to close connection (useful for testing)
export const closeConnection = async () => {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 MongoDB connection closed');
  }
};

// Health check function
export const healthCheck = async () => {
  try {
    if (!isConnected()) {
      return { status: 'error', message: 'Not connected to MongoDB' };
    }
    
    // Test the connection with a simple operation
    await mongoose.connection.db.admin().ping();
    
    return { 
      status: 'healthy', 
      message: 'MongoDB connection is healthy',
      database: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  } catch (error) {
    return { 
      status: 'error', 
      message: 'MongoDB health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Export both as default and named export for compatibility
export { connectDB as connectToDatabase };
export default connectDB; 