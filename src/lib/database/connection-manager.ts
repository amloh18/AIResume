import 'server-only';
import mongoose, { ConnectOptions } from 'mongoose';

/**
 * Unified Database Connection Manager
 * 
 * Singleton pattern implementation to ensure only one MongoDB connection
 * exists across the entire application. This replaces the fragmented
 * connection implementations in database.ts, mongodb.ts, and mongodb-client.ts
 */

interface ConnectionConfig {
  uri: string;
  options?: ConnectOptions;
}

interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  database?: string;
  host?: string;
  port?: number;
}

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private mongooseConnection: typeof mongoose | null = null;
  private connectionPromise: Promise<typeof mongoose> | null = null;
  private handlersSetup: boolean = false;

  private constructor(private config: ConnectionConfig) {
    this.setupConnectionHandlers();
  }

  /**
   * Get or create the singleton instance
   */
  static getInstance(config?: ConnectionConfig): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      if (!config || !config.uri) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error(
            'Please define the MONGODB_URI environment variable inside .env.local'
          );
        }
        config = { uri };
      }
      DatabaseConnectionManager.instance = new DatabaseConnectionManager(config);
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Setup connection event handlers (only once)
   */
  private setupConnectionHandlers(): void {
    if (this.handlersSetup) return;
    this.handlersSetup = true;

    // Increase max listeners to prevent MaxListenersExceededWarning
    // This is needed because Next.js hot reloading can cause multiple handler setups
    mongoose.connection.setMaxListeners(20);

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

    // Graceful shutdown - only set up once to prevent duplicate handlers
    // In Next.js serverless environments, these signals may not be triggered
    // Connection pooling handles connection lifecycle automatically
    if (!process.env._SHUTDOWN_HANDLERS_SETUP) {
      process.env._SHUTDOWN_HANDLERS_SETUP = 'true';
      
      process.on('SIGINT', async () => {
        try {
          await this.gracefulShutdown();
          console.log('🛑 MongoDB connection closed through app termination (SIGINT)');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during MongoDB shutdown:', err);
          process.exit(1);
        }
      });

      process.on('SIGTERM', async () => {
        try {
          await this.gracefulShutdown();
          console.log('🛑 MongoDB connection closed through app termination (SIGTERM)');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during MongoDB shutdown:', err);
          process.exit(1);
        }
      });
    }
  }

  /**
   * Get Mongoose connection (creates if doesn't exist)
   */
  async getMongooseConnection(): Promise<typeof mongoose> {
    // Don't attempt database connection on client side
    if (typeof window !== 'undefined') {
      throw new Error('Database connection cannot be established on client side');
    }

    // Validate MongoDB URI format
    if (
      !this.config.uri.startsWith('mongodb://') &&
      !this.config.uri.startsWith('mongodb+srv://')
    ) {
      throw new Error(
        'Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://'
      );
    }

    // If already connected and ready, verify it's actually working
    if (this.mongooseConnection && mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db?.admin().ping();
        // Connection reused - only log in development for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('♻️  Reusing existing MongoDB connection (cached)');
        }
        return this.mongooseConnection;
      } catch (pingError) {
        // Connection is stale, reset it
        console.warn('⚠️ MongoDB connection stale, reconnecting...');
        this.mongooseConnection = null;
        this.connectionPromise = null;
        try {
          await mongoose.connection.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
    }

    // If connection exists but is not ready, reset it
    if (this.mongooseConnection && mongoose.connection.readyState !== 1) {
      this.mongooseConnection = null;
      this.connectionPromise = null;
    }

    // Create new connection if needed
    if (!this.connectionPromise) {
      this.connectionPromise = this.connect();
    }

    try {
      this.mongooseConnection = await this.connectionPromise;

      // Final verification - ensure connection is ready and working
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection is not ready (readyState !== 1)');
      }

      // Verify with ping one more time
      await mongoose.connection.db?.admin().ping();

      return this.mongooseConnection;
    } catch (e) {
      this.connectionPromise = null;
      this.mongooseConnection = null;
      console.error('❌ Failed to establish MongoDB connection:', e);
      throw e;
    }
  }

  /**
   * Internal connection method
   */
  private async connect(): Promise<typeof mongoose> {
    // TLS is only required for Atlas/cloud URIs (mongodb+srv://). Forcing ssl:true
    // on a local mongodb:// connection fails because local mongod has TLS disabled.
    const isTlsUri = this.config.uri.startsWith('mongodb+srv://');
    const options: ConnectOptions = {
      bufferCommands: true,
      maxPoolSize: 10,
      minPoolSize: 5, // Increased from 2 to 5 for better connection pooling
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      // Override database name if MONGODB_DB env var is set
      ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
      ...(isTlsUri
        ? { ssl: true, tlsAllowInvalidCertificates: false }
        : { ssl: false }),
      ...this.config.options,
    };

    // Only log on cold start (first connection) to reduce log spam
    const isColdStart = !this.mongooseConnection && mongoose.connection.readyState === 0;
    if (isColdStart) {
      console.log('🔗 Cold start - connecting to MongoDB...');
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '🔍 Connection URI:',
          this.config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
        );
      }
    }

    const mongooseInstance = await mongoose.connect(this.config.uri, options);

    // Wait until connection is actually ready (readyState === 1)
    if (mongooseInstance.connection.readyState !== 1) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error('MongoDB connection timeout - readyState never became 1')
          );
        }, 30000);

        if (mongooseInstance.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        mongooseInstance.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        mongooseInstance.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    // Verify connection is actually working with a ping
    try {
      await mongooseInstance.connection.db?.admin().ping();
      // Only log successful connections in development or first connection
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Connected to MongoDB successfully');
        console.log(
          `📊 Database: ${mongooseInstance.connection.db?.databaseName || 'unknown'}`
        );
        console.log(
          `🌐 Host: ${mongooseInstance.connection.host}:${mongooseInstance.connection.port}`
        );
      }
    } catch (pingError) {
      throw new Error(`MongoDB connection ping failed: ${pingError}`);
    }

    return mongooseInstance;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      if (mongoose.connection.readyState !== 1) {
        return { healthy: false, latency: Date.now() - start };
      }

      await mongoose.connection.db?.admin().ping();

      return {
        healthy: true,
        latency: Date.now() - start,
        database: mongoose.connection.db?.databaseName,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    if (this.mongooseConnection) {
      await mongoose.connection.close();
      this.mongooseConnection = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }

  /**
   * Close connection (useful for testing)
   */
  async closeConnection(): Promise<void> {
    if (this.mongooseConnection) {
      await mongoose.connection.close();
      this.mongooseConnection = null;
      this.connectionPromise = null;
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Lazy singleton accessor -- getInstance() is NOT called at module-eval time so
// the build can succeed without MONGODB_URI being present in the environment.
function getDbManager(): DatabaseConnectionManager {
  return DatabaseConnectionManager.getInstance();
}

/** @deprecated Use getDbManager() internally; kept for backward compat */
export const dbManager = {
  get getMongooseConnection() { return getDbManager().getMongooseConnection.bind(getDbManager()); },
  get healthCheck() { return getDbManager().healthCheck.bind(getDbManager()); },
  get isConnected() { return getDbManager().isConnected.bind(getDbManager()); },
  get getConnectionStatus() { return getDbManager().getConnectionStatus.bind(getDbManager()); },
  get closeConnection() { return getDbManager().closeConnection.bind(getDbManager()); },
  get gracefulShutdown() { return getDbManager().gracefulShutdown.bind(getDbManager()); },
};

// Export convenience methods
export async function getConnection() {
  return await getDbManager().getMongooseConnection();
}

export async function healthCheck() {
  return await getDbManager().healthCheck();
}

export function isConnected() {
  return getDbManager().isConnected();
}

export function getConnectionStatus() {
  return getDbManager().getConnectionStatus();
}

export async function closeConnection() {
  return await getDbManager().closeConnection();
}

export async function gracefulShutdown() {
  return await getDbManager().gracefulShutdown();
}

