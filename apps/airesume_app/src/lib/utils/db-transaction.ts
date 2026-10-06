import mongoose, { ClientSession } from 'mongoose';

/**
 * Checks if an error is caused by transactions not being supported by the MongoDB deployment
 * (e.g., standalone MongoDB instance without replica set).
 */
export function isTransactionUnsupportedError(error: any): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const errmsg = (error.errorResponse?.errmsg || '').toLowerCase();
  const code = error.code ?? error.errorResponse?.code;
  const codeName = error.codeName ?? error.errorResponse?.codeName;

  return (
    code === 20 ||
    codeName === 'IllegalOperation' ||
    message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
    errmsg.includes('transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are not supported') ||
    errmsg.includes('transactions are not supported') ||
    message.includes('replica set') ||
    errmsg.includes('replica set')
  );
}

/**
 * Database Transaction Helper
 * 
 * Wraps operations in a MongoDB transaction to ensure atomicity on replica sets/mongos.
 * If running on a standalone MongoDB instance (where transactions are unsupported),
 * it gracefully falls back to executing the operations without a transaction session.
 * 
 * @param callback - Function that performs database operations within the transaction
 * @returns The result of the callback function
 */
export async function withTransaction<T>(
  callback: (session?: ClientSession) => Promise<T>
): Promise<T> {
  let session: ClientSession | null = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (sessionError: any) {
    if (isTransactionUnsupportedError(sessionError)) {
      console.warn('⚠️ [DB Transaction] MongoDB transactions not supported on this instance. Running without transaction.');
      return await callback(undefined);
    }
    throw sessionError;
  }

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    // If the error was due to standalone MongoDB rejecting the transaction command during operation
    if (isTransactionUnsupportedError(error)) {
      console.warn('⚠️ [DB Transaction] Standalone MongoDB detected during transaction. Retrying operation without transaction.');
      try {
        await session.abortTransaction();
      } catch {
        // Ignore abort error
      }
      try {
        await session.endSession();
        session = null;
      } catch {
        // Ignore endSession error
      }
      return await callback(undefined);
    }

    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.warn('⚠️ [DB Transaction] Failed to abort transaction:', abortError);
    }
    throw error;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Ignore endSession error
      }
    }
  }
}

