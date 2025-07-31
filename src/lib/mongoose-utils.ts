import mongoose, { Document, Model, QueryOptions, UpdateQuery } from 'mongoose';

// Types for pagination
export interface PaginationOptions {
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

// Types for search and filtering
export interface SearchOptions {
  search?: string;
  filters?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
}

// Generic CRUD operations
export class MongooseService<T extends Document> {
  constructor(private model: Model<T>) {}

  // Create a new document
  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Find document by ID
  async findById(id: string): Promise<T | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Find documents with pagination
  async findWithPagination(
    query: Record<string, any> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.find(query).sort(sort).skip(skip).limit(limit),
        this.model.countDocuments(query)
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
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Find documents with search
  async search(
    searchFields: string[],
    options: SearchOptions = {}
  ): Promise<T[]> {
    try {
      const { search = '', filters = {}, sort = { createdAt: -1 } } = options;

      let query: Record<string, any> = { ...filters };

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const searchQuery = searchFields.map(field => ({
          [field]: searchRegex
        }));
        query.$or = searchQuery;
      }

      return await this.model.find(query).sort(sort);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update document by ID
  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete document by ID
  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Soft delete (set deletedAt field)
  async softDelete(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Bulk operations
  async bulkCreate(data: Partial<T>[]): Promise<T[]> {
    try {
      return await this.model.insertMany(data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkUpdate(
    filter: Record<string, any>,
    update: UpdateQuery<T>
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.model.updateMany(filter, update);
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Aggregation helpers
  async aggregate(pipeline: any[]): Promise<any[]> {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Count documents
  async count(query: Record<string, any> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Check if document exists
  async exists(query: Record<string, any>): Promise<boolean> {
    try {
      const count = await this.model.countDocuments(query);
      return count > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Find one document
  async findOne(query: Record<string, any>): Promise<T | null> {
    try {
      return await this.model.findOne(query);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Find all documents
  async findAll(query: Record<string, any> = {}): Promise<T[]> {
    try {
      return await this.model.find(query);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return new Error(`Validation Error: ${messages.join(', ')}`);
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return new Error(`${field} already exists`);
    }
    
    if (error instanceof mongoose.Error.CastError) {
      return new Error(`Invalid ${error.path}: ${error.value}`);
    }
    
    return error;
  }
}

// Utility functions for common operations
export const mongooseUtils = {
  // Create a service instance for a model
  createService: <T extends Document>(model: Model<T>) => {
    return new MongooseService<T>(model);
  },

  // Generate ObjectId
  generateId: () => new mongoose.Types.ObjectId(),

  // Check if string is valid ObjectId
  isValidObjectId: (id: string) => mongoose.Types.ObjectId.isValid(id),

  // Convert string to ObjectId
  toObjectId: (id: string) => new mongoose.Types.ObjectId(id),

  // Create date range query
  createDateRange: (startDate?: Date, endDate?: Date) => {
    const query: Record<string, any> = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }
    return query;
  },

  // Create text search query
  createTextSearch: (searchTerm: string, fields: string[]) => {
    if (!searchTerm) return {};
    
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchQuery = fields.map(field => ({
      [field]: searchRegex
    }));
    
    return { $or: searchQuery };
  },

  // Create pagination options
  createPaginationOptions: (page: number = 1, limit: number = 10) => ({
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit))
  }),

  // Create sort options
  createSortOptions: (sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') => ({
    [sortBy]: sortOrder === 'asc' ? 1 : -1
  }),

  // Sanitize query parameters
  sanitizeQuery: (query: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  },

  // Create update query with timestamps
  createUpdateQuery: (data: Record<string, any>) => ({
    ...data,
    updatedAt: new Date()
  }),

  // Handle transaction
  withTransaction: async <T>(
    session: mongoose.ClientSession,
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      const result = await operation();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
};

// Export types
export type { Document, Model, QueryOptions, UpdateQuery }; 