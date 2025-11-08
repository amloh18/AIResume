/**
 * Optimistic UI Utilities
 * 
 * Provides utilities for implementing optimistic UI patterns with rollback support
 */

export interface OptimisticAction<T> {
  optimisticUpdate: () => void;
  rollback: () => void;
  execute: () => Promise<T>;
}

/**
 * Creates an optimistic action with automatic rollback on error
 */
export function createOptimisticAction<T>({
  optimisticUpdate,
  rollback,
  execute
}: {
  optimisticUpdate: () => void;
  rollback: () => void;
  execute: () => Promise<T>;
}): () => Promise<T> {
  return async () => {
    // Apply optimistic update immediately
    optimisticUpdate();
    
    try {
      // Execute the actual action
      const result = await execute();
      return result;
    } catch (error) {
      // Rollback on error
      rollback();
      throw error;
    }
  };
}

/**
 * Optimistic state update helper
 */
export function createOptimisticStateUpdate<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  optimisticValue: T,
  rollbackValue: T
) {
  return {
    apply: () => setState(optimisticValue),
    rollback: () => setState(rollbackValue)
  };
}

/**
 * Optimistic array update helper
 */
export function createOptimisticArrayUpdate<T>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  findItem: (item: T) => boolean,
  updateItem: (item: T) => T
) {
  return {
    apply: () => {
      setState(prev => prev.map(item => 
        findItem(item) ? updateItem(item) : item
      ));
    },
    rollback: (originalState: T[]) => {
      setState(originalState);
    }
  };
}

/**
 * Optimistic delete helper
 */
export function createOptimisticDelete<T>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  findItem: (item: T) => boolean
) {
  return {
    apply: () => {
      setState(prev => prev.filter(item => !findItem(item)));
    },
    rollback: (originalState: T[]) => {
      setState(originalState);
    }
  };
}

/**
 * Optimistic toggle helper (for star/unstar, like/unlike, etc.)
 */
export function createOptimisticToggle<T>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  findItem: (item: T) => boolean,
  toggleProperty: keyof T
) {
  return {
    apply: () => {
      setState(prev => prev.map(item => 
        findItem(item) 
          ? { ...item, [toggleProperty]: !(item[toggleProperty] as boolean) }
          : item
      ));
    },
    rollback: (originalState: T[]) => {
      setState(originalState);
    }
  };
}

/**
 * Execute optimistic action with error handling
 */
export async function executeOptimistic<T>(
  optimisticUpdate: () => void,
  execute: () => Promise<T>,
  rollback: () => void,
  onError?: (error: Error) => void
): Promise<T> {
  optimisticUpdate();
  
  try {
    return await execute();
  } catch (error) {
    rollback();
    const err = error instanceof Error ? error : new Error(String(error));
    if (onError) {
      onError(err);
    }
    throw err;
  }
}

