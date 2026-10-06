import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';
import { env } from './env';

export interface DatabaseHealth {
  connected: boolean;
  database: string;
  pingMs: number;
  error?: string;
}

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private connectionPromise: Promise<Db> | null = null;

  async connect(): Promise<Db> {
    if (this.db && this.isConnected) {
      return this.db;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        console.log(`🔌 Connecting to MongoDB: ${env.MONGODB_DATABASE}...`);

        // Connect Native MongoClient for high-throughput bulkWrite & Change Streams
        this.client = new MongoClient(env.MONGODB_URI, {
          maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
          minPoolSize: env.MONGODB_MIN_POOL_SIZE,
          connectTimeoutMS: env.DEFAULT_TIMEOUT_MS,
          socketTimeoutMS: env.DEFAULT_TIMEOUT_MS,
          retryWrites: true,
          writeConcern: { w: 'majority' },
        });

        await this.client.connect();
        this.db = this.client.db(env.MONGODB_DATABASE);

        // Also connect Mongoose for schema validation if models use it
        if (mongoose.connection.readyState !== 1) {
          await mongoose.connect(env.MONGODB_URI, {
            dbName: env.MONGODB_DATABASE,
            maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
            minPoolSize: env.MONGODB_MIN_POOL_SIZE,
          });
        }

        this.isConnected = true;
        console.log(`✅ Successfully connected to MongoDB [${env.MONGODB_DATABASE}]`);
        return this.db;
      } catch (error: any) {
        this.isConnected = false;
        this.connectionPromise = null;
        console.error('❌ Failed to connect to MongoDB:', error.message);
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  getDb(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getClient(): MongoClient {
    if (!this.client || !this.isConnected) {
      throw new Error('MongoClient not connected. Call connect() first.');
    }
    return this.client;
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      if (!this.db) {
        await this.connect();
      }
      await this.db!.command({ ping: 1 });
      return {
        connected: true,
        database: env.MONGODB_DATABASE,
        pingMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        connected: false,
        database: env.MONGODB_DATABASE,
        pingMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from MongoDB...');
    try {
      if (this.client) {
        await this.client.close();
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      this.isConnected = false;
      this.client = null;
      this.db = null;
      this.connectionPromise = null;
      console.log('✅ Disconnected from MongoDB');
    } catch (err: any) {
      console.error('❌ Error disconnecting from MongoDB:', err.message);
    }
  }
}

export const dbManager = new DatabaseManager();
