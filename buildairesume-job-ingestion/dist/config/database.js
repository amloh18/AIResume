"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbManager = void 0;
const mongodb_1 = require("mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
class DatabaseManager {
    client = null;
    db = null;
    isConnected = false;
    connectionPromise = null;
    async connect() {
        if (this.db && this.isConnected) {
            return this.db;
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = (async () => {
            try {
                console.log(`🔌 Connecting to MongoDB: ${env_1.env.MONGODB_DATABASE}...`);
                // Connect Native MongoClient for high-throughput bulkWrite & Change Streams
                this.client = new mongodb_1.MongoClient(env_1.env.MONGODB_URI, {
                    maxPoolSize: env_1.env.MONGODB_MAX_POOL_SIZE,
                    minPoolSize: env_1.env.MONGODB_MIN_POOL_SIZE,
                    connectTimeoutMS: env_1.env.DEFAULT_TIMEOUT_MS,
                    socketTimeoutMS: env_1.env.DEFAULT_TIMEOUT_MS,
                    retryWrites: true,
                    writeConcern: { w: 'majority' },
                });
                await this.client.connect();
                this.db = this.client.db(env_1.env.MONGODB_DATABASE);
                // Also connect Mongoose for schema validation if models use it
                if (mongoose_1.default.connection.readyState !== 1) {
                    await mongoose_1.default.connect(env_1.env.MONGODB_URI, {
                        dbName: env_1.env.MONGODB_DATABASE,
                        maxPoolSize: env_1.env.MONGODB_MAX_POOL_SIZE,
                        minPoolSize: env_1.env.MONGODB_MIN_POOL_SIZE,
                    });
                }
                this.isConnected = true;
                console.log(`✅ Successfully connected to MongoDB [${env_1.env.MONGODB_DATABASE}]`);
                return this.db;
            }
            catch (error) {
                this.isConnected = false;
                this.connectionPromise = null;
                console.error('❌ Failed to connect to MongoDB:', error.message);
                throw error;
            }
        })();
        return this.connectionPromise;
    }
    getDb() {
        if (!this.db || !this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
    getClient() {
        if (!this.client || !this.isConnected) {
            throw new Error('MongoClient not connected. Call connect() first.');
        }
        return this.client;
    }
    async checkHealth() {
        const start = Date.now();
        try {
            if (!this.db) {
                await this.connect();
            }
            await this.db.command({ ping: 1 });
            return {
                connected: true,
                database: env_1.env.MONGODB_DATABASE,
                pingMs: Date.now() - start,
            };
        }
        catch (err) {
            return {
                connected: false,
                database: env_1.env.MONGODB_DATABASE,
                pingMs: Date.now() - start,
                error: err.message,
            };
        }
    }
    async disconnect() {
        console.log('🔌 Disconnecting from MongoDB...');
        try {
            if (this.client) {
                await this.client.close();
            }
            if (mongoose_1.default.connection.readyState !== 0) {
                await mongoose_1.default.disconnect();
            }
            this.isConnected = false;
            this.client = null;
            this.db = null;
            this.connectionPromise = null;
            console.log('✅ Disconnected from MongoDB');
        }
        catch (err) {
            console.error('❌ Error disconnecting from MongoDB:', err.message);
        }
    }
}
exports.dbManager = new DatabaseManager();
//# sourceMappingURL=database.js.map