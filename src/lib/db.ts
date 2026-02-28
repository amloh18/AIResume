import { MongoClient, Db } from 'mongodb';
import clientPromise from './mongodb';

let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'cvcircle');
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function getClient(): Promise<MongoClient> {
  return await clientPromise;
}
