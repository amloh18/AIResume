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
        await this.gracefulShutdown();
        console.log('🛑 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await this.gracefulShutdown();
        console.log('🛑 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });
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
    const options: ConnectOptions = {
      bufferCommands: true,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      ssl: true,
      tlsAllowInvalidCertificates: false,
      ...this.config.options,
    };

    console.log('🔗 Attempting to connect to MongoDB...');
    console.log(
      '🔍 Connection URI:',
      this.config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    );

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
      console.log('✅ Connected to MongoDB successfully');
      console.log(
        `📊 Database: ${mongooseInstance.connection.db?.databaseName || 'unknown'}`
      );
      console.log(
        `🌐 Host: ${mongooseInstance.connection.host}:${mongooseInstance.connection.port}`
      );
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

// Export singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();

// Export convenience methods
export async function getConnection() {
  return await dbManager.getMongooseConnection();
}

export async function healthCheck() {
  return await dbManager.healthCheck();
}

export function isConnected() {
  return dbManager.isConnected();
}

export function getConnectionStatus() {
  return dbManager.getConnectionStatus();
}

export async function closeConnection() {
  return await dbManager.closeConnection();
}

export async function gracefulShutdown() {
  return await dbManager.gracefulShutdown();
}

