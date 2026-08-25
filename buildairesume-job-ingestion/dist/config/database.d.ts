import { MongoClient, Db } from 'mongodb';
export interface DatabaseHealth {
    connected: boolean;
    database: string;
    pingMs: number;
    error?: string;
}
declare class DatabaseManager {
    private client;
    private db;
    private isConnected;
    private connectionPromise;
    connect(): Promise<Db>;
    getDb(): Db;
    getClient(): MongoClient;
    checkHealth(): Promise<DatabaseHealth>;
    disconnect(): Promise<void>;
}
export declare const dbManager: DatabaseManager;
export {};
