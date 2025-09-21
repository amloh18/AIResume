import mongoose from 'mongoose';

/**
 * Utility functions for handling Firebase UID to MongoDB queries
 * This module provides helper functions to properly query MongoDB documents
 * using Firebase UIDs instead of MongoDB ObjectIDs
 */

/**
 * Get a user by Firebase UID from any model that has firebaseUid field
 * @param model - Mongoose model to query
 * @param firebaseUid - Firebase UID string
 * @returns Promise<Document | null>
 */
export async function findByFirebaseUid<T>(
  model: mongoose.Model<T>, 
  firebaseUid: string
): Promise<T | null> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  return await model.findOne({ firebaseUid }).lean<T>();
}

/**
 * Get multiple documents by Firebase UID from any model that has firebaseUid field
 * @param model - Mongoose model to query
 * @param firebaseUid - Firebase UID string
 * @param additionalQuery - Additional query conditions
 * @returns Promise<Document[]>
 */
export async function findManyByFirebaseUid<T>(
  model: mongoose.Model<T>, 
  firebaseUid: string, 
  additionalQuery: Record<string, any> = {}
): Promise<T[]> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  const query = { firebaseUid, ...additionalQuery };
  return await model.find(query).lean<T[]>();
}

/**
 * Create a new document with both userId (ObjectId) and firebaseUid (string)
 * @param model - Mongoose model to create document in
 * @param data - Document data
 * @param userId - MongoDB ObjectId (can be string format)
 * @param firebaseUid - Firebase UID string
 * @returns Promise<Document>
 */
export async function createWithFirebaseUid<T>(
  model: mongoose.Model<T>,
  data: Partial<T>,
  userId: string | mongoose.Types.ObjectId,
  firebaseUid: string
): Promise<T> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Ensure we have a proper ObjectId for userId if it's a valid ObjectId format
  let finalUserId: string | mongoose.Types.ObjectId = userId;
  if (typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
    finalUserId = new mongoose.Types.ObjectId(userId);
  }
  
  const documentData = {
    ...data,
    userId: finalUserId,
    firebaseUid
  } as T;
  
  return await model.create(documentData);
}

/**
 * Update documents by Firebase UID
 * @param model - Mongoose model to update
 * @param firebaseUid - Firebase UID string
 * @param updateData - Data to update
 * @param additionalQuery - Additional query conditions
 * @returns Promise<UpdateResult>
 */
export async function updateByFirebaseUid<T>(
  model: mongoose.Model<T>,
  firebaseUid: string,
  updateData: Partial<T>,
  additionalQuery: Record<string, any> = {}
): Promise<any> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  const query = { firebaseUid, ...additionalQuery };
  return await model.updateMany(query, updateData);
}

/**
 * Delete documents by Firebase UID
 * @param model - Mongoose model to delete from
 * @param firebaseUid - Firebase UID string
 * @param additionalQuery - Additional query conditions
 * @returns Promise<DeleteResult>
 */
export async function deleteByFirebaseUid<T>(
  model: mongoose.Model<T>,
  firebaseUid: string,
  additionalQuery: Record<string, any> = {}
): Promise<any> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  const query = { firebaseUid, ...additionalQuery };
  return await model.deleteMany(query);
}

/**
 * Count documents by Firebase UID
 * @param model - Mongoose model to count
 * @param firebaseUid - Firebase UID string
 * @param additionalQuery - Additional query conditions
 * @returns Promise<number>
 */
export async function countByFirebaseUid<T>(
  model: mongoose.Model<T>,
  firebaseUid: string,
  additionalQuery: Record<string, any> = {}
): Promise<number> {
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    throw new Error('Firebase UID must be a valid string');
  }
  
  const query = { firebaseUid, ...additionalQuery };
  return await model.countDocuments(query);
}

/**
 * Get Firebase UID from session or request headers
 * Supports both NextAuth sessions and direct Firebase UID headers
 * @param request - NextRequest object
 * @param session - NextAuth session object (optional)
 * @returns string | null
 */
export function getFirebaseUidFromRequest(
  request: Request | { headers: { get: (key: string) => string | null } },
  session?: { user?: { id?: string; email?: string } } | null
): string | null {
  // Check request headers first (for direct Firebase auth)
  const firebaseUidHeader = request.headers.get('x-firebase-user-id');
  if (firebaseUidHeader) {
    return firebaseUidHeader;
  }
  
  // Check session for Firebase UID (NextAuth integration)
  if (session?.user?.id) {
    // Firebase UIDs are typically 28 characters, MongoDB ObjectIDs are 24 hex chars
    const userId = session.user.id;
    
    // If it's not a MongoDB ObjectId format (24 hex chars), treat it as Firebase UID
    if (typeof userId === 'string' && !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return userId;
    }
  }
  
  return null;
}

/**
 * Check if a string is a valid MongoDB ObjectId format
 * @param id - String to check
 * @returns boolean
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Check if a string looks like a Firebase UID
 * Firebase UIDs are typically 28 characters long and alphanumeric
 * @param id - String to check
 * @returns boolean
 */
export function isFirebaseUid(id: string): boolean {
  // Firebase UIDs are typically 28 characters, base64-like format
  return typeof id === 'string' && 
         id.length >= 20 && 
         id.length <= 128 && 
         !isValidObjectId(id) &&
         /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Extract user identifier and determine if it's Firebase UID or MongoDB ObjectId
 * @param request - Request object
 * @param session - Session object (optional)
 * @returns { type: 'firebase' | 'objectid' | null, id: string | null }
 */
export function extractUserIdentifier(
  request: Request | { headers: { get: (key: string) => string | null } },
  session?: { user?: { id?: string; email?: string } } | null
): { type: 'firebase' | 'objectid' | null; id: string | null } {
  console.log('🔍 extractUserIdentifier - Starting extraction');
  console.log('🔍 extractUserIdentifier - Session:', { 
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email
  });
  
  // Try to get Firebase UID first
  const firebaseUid = getFirebaseUidFromRequest(request, session);
  console.log('🔍 extractUserIdentifier - Firebase UID from request:', firebaseUid);
  
  if (firebaseUid) {
    console.log('✅ extractUserIdentifier - Using Firebase UID:', firebaseUid);
    return { type: 'firebase', id: firebaseUid };
  }
  
  // Check if session contains MongoDB ObjectId
  if (session?.user?.id && isValidObjectId(session.user.id)) {
    console.log('✅ extractUserIdentifier - Using MongoDB ObjectId:', session.user.id);
    return { type: 'objectid', id: session.user.id };
  }
  
  // Check if session contains any user ID (might be non-standard format)
  if (session?.user?.id) {
    console.log('🔍 extractUserIdentifier - Found user ID but not valid ObjectId:', {
      id: session.user.id,
      length: session.user.id.length,
      isValidObjectId: isValidObjectId(session.user.id),
      isFirebaseUid: isFirebaseUid(session.user.id)
    });
    
    // If it looks like a Firebase UID, treat it as such
    if (isFirebaseUid(session.user.id)) {
      console.log('✅ extractUserIdentifier - Treating as Firebase UID:', session.user.id);
      return { type: 'firebase', id: session.user.id };
    }
    
    // Otherwise, treat it as a regular user ID
    console.log('✅ extractUserIdentifier - Treating as regular user ID:', session.user.id);
    return { type: 'objectid', id: session.user.id };
  }
  
  console.log('❌ extractUserIdentifier - No valid identifier found');
  return { type: null, id: null };
}
