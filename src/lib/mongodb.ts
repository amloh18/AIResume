import { MongoClient } from 'mongodb';

const options = {};

let cachedClientPromise: Promise<MongoClient> | null = null;

// Lazily initialise the MongoClient promise so the module can be imported
// during Next.js build even when MONGODB_URI is not set.
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  // In production mode, cache and reuse the connection promise across requests.
  if (!cachedClientPromise) {
    const client = new MongoClient(uri, options);
    cachedClientPromise = client.connect();
  }
  return cachedClientPromise;
}

// Re-export a proxy promise that defers initialisation to first await.
// This keeps the existing default-import API (`import clientPromise from './mongodb'`)
// while avoiding module-level side-effects that break `next build`.
const clientPromise: Promise<MongoClient> = new Proxy({} as Promise<MongoClient>, {
  get(_target, prop) {
    const real = getClientPromise();
    return Reflect.get(real, prop, real);
  },
});

export default clientPromise;

// Export function for backward compatibility
export const connectToDatabase = async () => {
  return await getClientPromise();
};

// Export connectDB function for mongoose compatibility
export const connectDB = async () => {
  return await getClientPromise();
};