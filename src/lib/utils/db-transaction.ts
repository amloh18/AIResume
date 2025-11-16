import mongoose from 'mongoose';

/**
 * Database Transaction Helper
 * 
 * Wraps operations in a MongoDB transaction to ensure atomicity.
 * If any operation fails, all changes are rolled back.
 * 
 * @param callback - Function that performs database operations within the transaction
 * @returns The result of the callback function
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(async (session) => {
 *   const user = await User.create([{ name: 'John' }], { session });
 *   const job = await Job.create([{ userId: user[0]._id }], { session });
 *   return { user, job };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

