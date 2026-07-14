import 'server-only';
import mongoose, { Document, Model, FilterQuery, UpdateQuery, ClientSession } from 'mongoose';

/**
 * Base Repository Pattern Implementation
 *
 * Provides a standardized data access layer that:
 * - Abstracts direct database access
 * - Supports transactions
 * - Enables easy mocking for tests
 * - Centralizes query logic
 * - Handles errors consistently
 */

export interface RepositoryOptions {
  lean?: boolean;
  populate?: string | string[] | any;
  select?: string;
  session?: ClientSession;
}

// Type helper for lean queries
type LeanDocument<T> = T extends Document ? Omit<T, keyof Document> & { _id: any } : T;

export interface PaginationOptions extends RepositoryOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Abstract Base Repository
 * 
 * All repositories should extend this class to inherit
 * common CRUD operations and query utilities.
 */
export abstract class BaseRepository<T extends Document> {
  constructor(protected model: Model<T>) {}

  /**
   * Find document by ID
   */
  async findById(
    id: string,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    let query: any = this.model.findById(id);

    if (options.lean) query = query.lean();
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  /**
   * Find one document matching filter
   */
  async findOne(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    let query: any = this.model.findOne(filter);

    if (options.lean) query = query.lean();
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  /**
   * Find multiple documents
   */
  async find(
    filter: FilterQuery<T> = {},
    options: RepositoryOptions & { sort?: any; limit?: number; skip?: number } = {}
  ): Promise<T[]> {
    let query: any = this.model.find(filter);

    if (options.lean) query = query.lean();
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    filter: FilterQuery<T> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, ...queryOptions } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.find(filter, { ...queryOptions, sort, limit, skip }),
      this.count(filter, { session: queryOptions.session }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create new document
   */
  async create(
    data: Partial<T>,
    options: { session?: ClientSession } = {}
  ): Promise<T> {
    const document = new this.model(data);
    
    if (options.session) {
      return await document.save({ session: options.session });
    }
    
    return await document.save();
  }

  /**
   * Create multiple documents
   */
  async createMany(
    data: Partial<T>[],
    options: { session?: ClientSession } = {}
  ): Promise<T[]> {
    if (options.session) {
      return await this.model.insertMany(data, { session: options.session }) as any;
    }
    
    return await this.model.insertMany(data) as any;
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: { session?: ClientSession; runValidators?: boolean } = {}
  ): Promise<T | null> {
    const updateOptions: any = {
      new: true,
      runValidators: options.runValidators !== false,
    };

    if (options.session) {
      updateOptions.session = options.session;
    }

    return await this.model.findByIdAndUpdate(id, update, updateOptions).exec() as any;
  }

  /**
   * Update one document
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: { session?: ClientSession; runValidators?: boolean } = {}
  ): Promise<T | null> {
    const updateOptions: any = {
      new: true,
      runValidators: options.runValidators !== false,
    };

    if (options.session) {
      updateOptions.session = options.session;
    }

    return await this.model.findOneAndUpdate(filter, update, updateOptions).exec() as any;
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: { session?: ClientSession } = {}
  ): Promise<{ modifiedCount: number }> {
    const updateOptions: any = {};
    
    if (options.session) {
      updateOptions.session = options.session;
    }

    const result = await this.model.updateMany(filter, update, updateOptions).exec();
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete document by ID
   */
  async deleteById(
    id: string,
    options: { session?: ClientSession } = {}
  ): Promise<boolean> {
    const deleteOptions: any = {};
    
    if (options.session) {
      deleteOptions.session = options.session;
    }

    const result = await this.model.findByIdAndDelete(id, deleteOptions).exec();
    return !!result;
  }

  /**
   * Delete one document
   */
  async deleteOne(
    filter: FilterQuery<T>,
    options: { session?: ClientSession } = {}
  ): Promise<boolean> {
    const deleteOptions: any = {};
    
    if (options.session) {
      deleteOptions.session = options.session;
    }

    const result = await this.model.findOneAndDelete(filter, deleteOptions).exec();
    return !!result;
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: FilterQuery<T>,
    options: { session?: ClientSession } = {}
  ): Promise<{ deletedCount: number }> {
    const deleteOptions: any = {};
    
    if (options.session) {
      deleteOptions.session = options.session;
    }

    const result = await this.model.deleteMany(filter, deleteOptions).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Count documents
   */
  async count(
    filter: FilterQuery<T> = {},
    options: { session?: ClientSession } = {}
  ): Promise<number> {
    if (options.session) {
      return await this.model.countDocuments(filter).session(options.session).exec();
    }
    
    return await this.model.countDocuments(filter).exec();
  }

  /**
   * Check if document exists
   */
  async exists(
    filter: FilterQuery<T>,
    options: { session?: ClientSession } = {}
  ): Promise<boolean> {
    const count = await this.count(filter, options);
    return count > 0;
  }

  /**
   * Aggregate query
   */
  async aggregate(
    pipeline: any[],
    options: { session?: ClientSession } = {}
  ): Promise<any[]> {
    const aggregateQuery = this.model.aggregate(pipeline);
    
    if (options.session) {
      aggregateQuery.session(options.session);
    }
    
    return await aggregateQuery.exec();
  }

  /**
   * Execute within transaction
   * 
   * Usage:
   *   await repository.withTransaction(async (session) => {
   *     await repository.create(data, { session });
   *     await repository.updateById(id, update, { session });
   *   });
   */
  async withTransaction<R>(
    operation: (session: ClientSession | undefined) => Promise<R>
  ): Promise<R> {
    const disableTransactions = process.env.DISABLE_MONGODB_TRANSACTIONS === 'true';

    if (disableTransactions) {
      return operation(undefined as any);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await operation(session);
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
        console.warn('⚠️ Standalone MongoDB detected in base repository. Falling back to non-transactional execution.');
        return operation(undefined as any);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Soft delete (set deletedAt field)
   */
  async softDelete(
    id: string,
    options: { session?: ClientSession } = {}
  ): Promise<T | null> {
    return await this.updateById(
      id,
      { deletedAt: new Date() } as any,
      options
    );
  }

  /**
   * Restore soft deleted document
   */
  async restore(
    id: string,
    options: { session?: ClientSession } = {}
  ): Promise<T | null> {
    return await this.updateById(
      id,
      { $unset: { deletedAt: 1 } } as any,
      options
    );
  }

  /**
   * Find with search (case-insensitive)
   */
  async search(
    searchFields: string[],
    searchTerm: string,
    options: RepositoryOptions & { filters?: FilterQuery<T>; sort?: any; limit?: number } = {}
  ): Promise<T[]> {
    const { filters = {}, ...queryOptions } = options;

    if (!searchTerm) {
      return this.find(filters as FilterQuery<T>, queryOptions);
    }

    const searchRegex = new RegExp(searchTerm, 'i');
    const searchQuery = searchFields.map((field) => ({
      [field]: searchRegex,
    }));

    const filter: any = {
      ...filters,
      $or: searchQuery,
    };

    return this.find(filter, queryOptions);
  }
}