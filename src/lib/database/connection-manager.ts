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
   *
   * `isRetry` is set by the split-database guard below so a reconnect that
   * STILL lands on the wrong database fails loudly instead of looping.
   */
  private async connect(isRetry = false): Promise<typeof mongoose> {
    // TLS is required for Atlas/cloud URIs (mongodb+srv:// or .mongodb.net) or when tls/ssl is requested.
    const isTlsUri =
      this.config.uri.startsWith('mongodb+srv://') ||
      this.config.uri.includes('.mongodb.net') ||
      this.config.uri.includes('tls=true') ||
      this.config.uri.includes('ssl=true');
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
        ? { tls: true, tlsAllowInvalidCertificates: false }
        : { tls: false }),
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
      // Always log database name on cold start (critical for debugging)
      if (isColdStart) {
        const dbName = mongooseInstance.connection.db?.databaseName || 'unknown';
        console.log(`📊 Connected to MongoDB database: "${dbName}"`);
        if (!process.env.MONGODB_DB) {
          console.warn('⚠️  MONGODB_DB env var is NOT set — using URI default. Set MONGODB_DB=airesume in your environment!');
        }
      }
      // Only log full connection details in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Connected to MongoDB successfully');
        console.log(
          `🌐 Host: ${mongooseInstance.connection.host}:${mongooseInstance.connection.port}`
        );
      }
    } catch (pingError) {
      throw new Error(`MongoDB connection ping failed: ${pingError}`);
    }

    /*
      Split-database guard.

      mongoose.connect() on an already-open connection with the SAME URI is a
      silent no-op — the new options (including `dbName`) are dropped. So if any
      other code connected the shared default connection first (a raw
      mongoose.connect(process.env.MONGODB_URI) without dbName), our MONGODB_DB
      override above never took effect and this process would read AND write a
      different database than MONGODB_DB names. Data then "disappears" without
      any error: the user's documents exist in one database while the app
      queries another.

      Verify the database we actually landed on, and reconnect once with the
      correct dbName if it is wrong.
    */
    const expectedDb = this.config.options?.dbName || process.env.MONGODB_DB || null;
    const actualDb = mongooseInstance.connection.db?.databaseName || null;
    if (expectedDb && actualDb && actualDb !== expectedDb) {
      if (isRetry) {
        throw new Error(
          `Split-database guard: connected to database "${actualDb}" but expected "${expectedDb}" after a reconnect. ` +
            'Refusing to serve queries against the wrong database. ' +
            'A raw mongoose.connect() outside the connection manager is likely bypassing the MONGODB_DB override.'
        );
      }
      console.error(
        `🛑 Split-database guard: mongoose is connected to database "${actualDb}" but MONGODB_DB="${expectedDb}". ` +
          'An earlier raw mongoose.connect() bound the shared connection first. Reconnecting with the correct database...'
      );
      await mongoose.disconnect();
      return this.connect(true);
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

