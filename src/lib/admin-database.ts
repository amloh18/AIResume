// Admin database service - handles admin collections within cvcircle database
import mongoose from 'mongoose';
import connectDB from './database';

// Admin collections that are managed separately from user data
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

// Get admin database connection (uses same cvcircle database but with admin context)
export async function getAdminDB() {
  // Use a dedicated database for admin data (NOT the MongoDB system 'admin')
  const baseUri = process.env.MONGODB_URI || '';
  if (!baseUri) throw new Error('MONGODB_URI not set');
  const adminUri = baseUri.includes('/cvcircle')
    ? baseUri.replace('/cvcircle', '/cvcircle_admin')
    : baseUri.endsWith('/')
      ? baseUri + 'cvcircle_admin'
      : baseUri + '/cvcircle_admin';

  // Reuse mongoose but create a separate connection to admin DB
  const conn = await mongoose.createConnection(adminUri).asPromise();
  return conn.db;
}

// Admin collection service
export class AdminCollectionService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // Get admin collection
  getCollection(collectionName: string) {
    if (!isAdminCollection(collectionName)) {
      throw new Error(`Collection ${collectionName} is not an admin collection`);
    }
    return this.db.collection(collectionName);
  }

  // Admin-specific operations
  async getTemplates() {
    return this.getCollection('templates').find({}).toArray();
  }

  async getDiscountCodes() {
    return this.getCollection('discountcodes').find({}).toArray();
  }

  async getNewsletters() {
    return this.getCollection('newsletters').find({}).toArray();
  }

  async getTestimonials() {
    return this.getCollection('testimonials').find({}).toArray();
  }

  async getPricingPlans() {
    return this.getCollection('pricingplans').find({}).toArray();
  }

  async getInvoices() {
    return this.getCollection('invoices').find({}).toArray();
  }

  async getPaymentMethods() {
    return this.getCollection('paymentmethods').find({}).toArray();
  }

  async getSubscriptions() {
    return this.getCollection('subscriptions').find({}).toArray();
  }

  async getAIUsageLogs() {
    return this.getCollection('aiusagelogs').find({}).toArray();
  }
}

// Create admin service instance
export async function createAdminService() {
  const db = await getAdminDB();
  return new AdminCollectionService(db);
}
