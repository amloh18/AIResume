import { MongoClient } from 'mongodb'

const options = {}

// Lazily build and cache the MongoClient promise so the module can be
// imported during `next build` without MONGODB_URI being present.
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Please add your MongoDB URI to .env.local')
  }

  // Ensure the URI includes the cvcircle database
  let mongoUri = uri
  if (typeof mongoUri === 'string' && !mongoUri.includes('/cvcircle') && !mongoUri.includes('/test')) {
    if (mongoUri.endsWith('/') || mongoUri.includes('?')) {
      mongoUri = mongoUri.replace(/(\?.*)$/, '/cvcircle$1')
    } else {
      mongoUri = mongoUri + '/cvcircle'
    }
    console.log('MongoDB client: Added cvcircle database to URI')
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(mongoUri, options)
      global._mongoClientPromise = client.connect()
    }
    return global._mongoClientPromise
  }

  const client = new MongoClient(mongoUri, options)
  return client.connect()
}

// Proxy keeps the existing default-import API while deferring initialisation.
const clientPromise: Promise<MongoClient> = new Proxy({} as Promise<MongoClient>, {
  get(_target, prop) {
    const real = getClientPromise()
    return Reflect.get(real, prop, real)
  },
})

export default clientPromise
