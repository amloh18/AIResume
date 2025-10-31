import mongoose from 'mongoose';

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MongoDB URI check:', MONGODB_URI ? 'URI found' : 'URI missing');

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Connection options with better error handling
const connectionOptions = {
  bufferCommands: true, // Enable buffering to queue commands while connecting
  bufferMaxEntries: 0, // 0 = unlimited buffering
  serverSelectionTimeoutMS: 30000, // 30 seconds for better connection reliability
  socketTimeoutMS: 45000, // 45 seconds for better connection reliability
  connectTimeoutMS: 30000, // 30 seconds for better connection reliability
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  // Remove family: 4 to allow IPv6 if available, IPv4 as fallback
  // This helps with MongoDB Atlas connections
  ssl: true, // Explicitly enable SSL for MongoDB Atlas
  tlsAllowInvalidCertificates: false,
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

  // Handle missing MONGODB_URI during build time
  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('⚠️ MongoDB URI not found during build - skipping connection');
      // Return a mock connection for build time
      return {
        connection: {
          readyState: 0,
          db: null,
          host: 'mock',
          port: 0
        }
      } as any;
    }
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // Validate MongoDB URI format
  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
  }

  // If already connected and ready, verify it's actually working
  if (cached.conn && mongoose.connection.readyState === 1) {
    try {
      // Verify connection is actually working with a ping
      await mongoose.connection.db?.admin().ping();
      return cached.conn;
    } catch (pingError) {
      // Connection is stale, reset it
      console.warn('⚠️ MongoDB connection stale, reconnecting...');
      cached.conn = null;
      cached.promise = null;
      try {
        await mongoose.connection.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }

  // If connection exists but is not ready, reset it
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    // Setup connection event handlers only once
    setupConnectionHandlers();

    console.log('🔗 Attempting to connect to MongoDB...');
    console.log('🔍 Connection URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs
    
    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions)
      .then(async (mongoose) => {
        // Wait until connection is actually ready (readyState === 1)
        if (mongoose.connection.readyState !== 1) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('MongoDB connection timeout - readyState never became 1'));
            }, 30000);
            
            if (mongoose.connection.readyState === 1) {
              clearTimeout(timeout);
              resolve();
              return;
            }
            
            mongoose.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            
            mongoose.connection.once('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          });
        }
        
        // Verify connection is actually working with a ping
        try {
          await mongoose.connection.db?.admin().ping();
          console.log('✅ Connected to MongoDB successfully');
          console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
          console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
        } catch (pingError) {
          throw new Error(`MongoDB connection ping failed: ${pingError}`);
        }
        
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    
    // Final verification - ensure connection is ready and working
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready (readyState !== 1)');
    }
    
    // Verify with ping one more time
    await mongoose.connection.db?.admin().ping();
    
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
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

// Helper function to ensure connection is ready before queries
export async function ensureConnection() {
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db?.admin().ping();
      return true;
    } catch (error) {
      console.warn('⚠️ Connection ping failed, reconnecting...');
      await connectDB();
      return true;
    }
  }
  await connectDB();
  return true;
}

// Export both as default and named export for compatibility
export { connectDB as connectToDatabase };
export default connectDB;
