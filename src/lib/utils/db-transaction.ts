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
  callback: (session: mongoose.ClientSession | undefined) => Promise<T>
): Promise<T> {
  const disableTransactions = process.env.DISABLE_MONGODB_TRANSACTIONS === 'true';

  if (disableTransactions) {
    return callback(undefined);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();

    // Check if error is due to transactions not being supported (standalone MongoDB)
    const isTransactionUnsupportedError = 
      error && 
      (error.message?.includes('Transaction numbers are only allowed') || 
       error.errmsg?.includes('Transaction numbers are only allowed') ||
       error.codeName === 'IllegalOperation' ||
       error.code === 20);

    if (isTransactionUnsupportedError) {
      console.warn('⚠️ Standalone MongoDB detected. Falling back to non-transactional execution.');
      // Execute the callback again, but without transaction session
      return callback(undefined);
    }
    
    throw error;
  } finally {
    session.endSession();
  }
}

