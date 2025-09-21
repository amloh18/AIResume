import mongoose from 'mongoose';

// Admin database connection utility
// This creates a separate connection to the cvcircle_admin database for admin collections

let adminConnection: mongoose.Connection | null = null;

export async function getAdminConnection(): Promise<mongoose.Connection> {
  if (adminConnection && adminConnection.readyState === 1) {
    return adminConnection;
  }

  const baseUri = process.env.MONGODB_URI || '';
  if (!baseUri) {
    throw new Error('MONGODB_URI not set');
  }

  // Create admin database URI
  const adminUri = baseUri.includes('/cvcircle')
    ? baseUri.replace('/cvcircle', '/cvcircle_admin')
    : baseUri.endsWith('/')
      ? baseUri + 'cvcircle_admin'
      : baseUri + '/cvcircle_admin';

  console.log('🔗 Connecting to admin database:', adminUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    adminConnection = await mongoose.createConnection(adminUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      ssl: true,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
    });

    console.log('✅ Admin database connected successfully');
    console.log(`📊 Admin Database: ${adminConnection.db.databaseName}`);
    
    return adminConnection;
  } catch (error) {
    console.error('❌ Admin database connection error:', error);
    throw error;
  }
}

export function getAdminConnectionSync(): mongoose.Connection | null {
  return adminConnection;
}

export async function closeAdminConnection(): Promise<void> {
  if (adminConnection) {
    await adminConnection.close();
    adminConnection = null;
    console.log('🔌 Admin database connection closed');
  }
}

// Admin collections that should use the admin database
export const ADMIN_COLLECTIONS = [
  'templates',
  'invoices', 
  'newsletters',
  'discountcodes',
  'paymentmethods',
  'aiusagelogs',
  'testimonials',
  'pricingplans',
  'subscriptions'
];

export function isAdminCollection(collectionName: string): boolean {
  return ADMIN_COLLECTIONS.includes(collectionName);
}
