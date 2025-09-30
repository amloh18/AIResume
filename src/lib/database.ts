import mongoose from 'mongoose';

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MongoDB URI check:', MONGODB_URI ? 'URI found' : 'URI missing');

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

// Simplified connection options
const connectionOptions = {
  bufferCommands: false,
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

    cached.promise = mongoose.connect(MONGODB_URI!, connectionOptions).then((mongoose) => {
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
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
    await mongoose.connection.db?.admin().ping();
    
    return {
      status: 'healthy',
      message: 'MongoDB connection is healthy',
      database: mongoose.connection.db?.databaseName || 'unknown',
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