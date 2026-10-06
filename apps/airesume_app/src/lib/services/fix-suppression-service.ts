/**
 * Fix Suppression Service
 * Manages the "Ignore List" with dual storage:
 * - Session Storage (temporary, per-session)
 * - Database (persistent across sessions via API)
 */

export interface SuppressedFix {
  fixId: string;
  fixSignatureHash?: string; // Hash for persistent suppression
  cvId?: string;
  fieldPath: string;
  originalIssue: string;
  suppressedAt: number;
  reason: 'manual_override' | 'semantic_detected' | 'conflict_resolution';
  userId?: string;
}

const STORAGE_KEY_PREFIX = 'cv_suppressed_fixes_';
const SYNC_QUEUE_KEY = 'cv_suppression_sync_queue';

/**
 * Generate a signature hash for a fix
 * This ensures suppression persists even if the fix ID changes on re-analysis
 */
export function generateFixSignatureHash(fix: {
  issue: string;
  fieldPath: string;
  originalText: string;
}): string {
  const signature = `${fix.issue}|${fix.fieldPath}|${fix.originalText}`;
  
  // Simple hash function (for client-side)
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex string (16 chars)
  return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}

/**
 * Get storage key for a CV
 */
function getStorageKey(cvId: string): string {
  return `${STORAGE_KEY_PREFIX}${cvId}`;
}

/**
 * Get suppressed fixes from session storage
 */
function getSuppressedFromStorage(cvId: string): SuppressedFix[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = getStorageKey(cvId);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to read suppressed fixes from session storage:', error);
  }
  
  return [];
}

/**
 * Save suppressed fixes to session storage
 */
function saveSuppressedToStorage(cvId: string, fixes: SuppressedFix[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(cvId);
    sessionStorage.setItem(key, JSON.stringify(fixes));
  } catch (error) {
    console.warn('Failed to save suppressed fixes to session storage:', error);
  }
}

/**
 * Get sync queue from storage
 */
function getSyncQueue(): Array<{ cvId: string; fix: SuppressedFix }> {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = sessionStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to read sync queue from session storage:', error);
  }
  
  return [];
}

/**
 * Add to sync queue
 */
function addToSyncQueue(cvId: string, fix: SuppressedFix): void {
  if (typeof window === 'undefined') return;
  
  try {
    const queue = getSyncQueue();
    queue.push({ cvId, fix });
    sessionStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Failed to add to sync queue:', error);
  }
}

/**
 * Clear sync queue
 */
function clearSyncQueue(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.warn('Failed to clear sync queue:', error);
  }
}

/**
 * Sync suppressed fixes to database (async, non-blocking)
 */
async function syncToDatabase(cvId: string, fix: SuppressedFix): Promise<void> {
  if (!cvId || !fix.userId) {
    // Queue for later sync
    addToSyncQueue(cvId, fix);
    return;
  }
  
  try {
    const response = await fetch(`/api/cvs/${cvId}/suppressed-fixes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixId: fix.fixId,
        fixSignatureHash: fix.fixSignatureHash,
        reason: fix.reason,
        fieldPath: fix.fieldPath,
        originalIssue: fix.originalIssue
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync suppression: ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to sync suppression to database, queuing for retry:', error);
    addToSyncQueue(cvId, fix);
  }
}

/**
 * Load suppressed fixes from database
 */
export async function loadSuppressedFromDatabase(cvId: string): Promise<SuppressedFix[]> {
  if (!cvId) return [];
  
  try {
    const response = await fetch(`/api/cvs/${cvId}/suppressed-fixes`);
    if (response.ok) {
      const data = await response.json();
      return data.suppressedFixes || [];
    }
  } catch (error) {
    console.warn('Failed to load suppressed fixes from database:', error);
  }
  
  return [];
}

/**
 * Suppress a fix
 * Adds to both session storage and database (async)
 */
export async function suppressFix(
  fixId: string,
  reason: 'manual_override' | 'semantic_detected' | 'conflict_resolution',
  options: {
    cvId?: string;
    userId?: string;
    fieldPath: string;
    originalIssue: string;
    originalText: string;
    fixSignatureHash?: string;
  }
): Promise<void> {
  const { cvId, userId, fieldPath, originalIssue, originalText, fixSignatureHash } = options;
  
  const hash = fixSignatureHash || generateFixSignatureHash({
    issue: originalIssue,
    fieldPath,
    originalText
  });
  
  const suppressedFix: SuppressedFix = {
    fixId,
    fixSignatureHash: hash,
    cvId,
    fieldPath,
    originalIssue,
    suppressedAt: Date.now(),
    reason,
    userId
  };
  
  // Save to session storage immediately
  if (cvId) {
    const stored = getSuppressedFromStorage(cvId);
    const updated = [...stored.filter(f => f.fixId !== fixId && f.fixSignatureHash !== hash), suppressedFix];
    saveSuppressedToStorage(cvId, updated);
  }
  
  // Sync to database (async, non-blocking)
  if (cvId) {
    syncToDatabase(cvId, suppressedFix).catch(console.error);
  }
}

/**
 * Check if a fix is suppressed
 * Checks both session storage and provided database list
 */
export function isSuppressed(
  fixId: string,
  options: {
    cvId?: string;
    fixSignatureHash?: string;
    dbSuppressedFixes?: SuppressedFix[];
  }
): boolean {
  const { cvId, fixSignatureHash, dbSuppressedFixes = [] } = options;
  
  // Check database list first (takes precedence)
  if (dbSuppressedFixes.length > 0) {
    const dbMatch = dbSuppressedFixes.find(
      f => f.fixId === fixId || (fixSignatureHash && f.fixSignatureHash === fixSignatureHash)
    );
    if (dbMatch) return true;
  }
  
  // Check session storage
  if (cvId) {
    const stored = getSuppressedFromStorage(cvId);
    const match = stored.find(
      f => f.fixId === fixId || (fixSignatureHash && f.fixSignatureHash === fixSignatureHash)
    );
    if (match) return true;
  }
  
  return false;
}

/**
 * Get all suppressed fixes for a CV
 * Merges session storage and database (DB takes precedence)
 */
export async function getSuppressedFixes(cvId?: string): Promise<SuppressedFix[]> {
  if (!cvId) return [];
  
  // Load from both sources
  const [stored, dbFixes] = await Promise.all([
    Promise.resolve(getSuppressedFromStorage(cvId)),
    loadSuppressedFromDatabase(cvId)
  ]);
  
  // Merge: DB takes precedence, then session storage (deduplicate by hash)
  const merged = new Map<string, SuppressedFix>();
  
  // Add DB fixes first (higher priority)
  dbFixes.forEach(fix => {
    const key = fix.fixSignatureHash || fix.fixId;
    merged.set(key, fix);
  });
  
  // Add session storage fixes (only if not in DB)
  stored.forEach(fix => {
    const key = fix.fixSignatureHash || fix.fixId;
    if (!merged.has(key)) {
      merged.set(key, fix);
    }
  });
  
  return Array.from(merged.values());
}

/**
 * Remove a fix from suppression (resurrect)
 */
export async function resurrectFix(
  fixId: string,
  options: {
    cvId?: string;
    fixSignatureHash?: string;
  }
): Promise<void> {
  const { cvId, fixSignatureHash } = options;
  
  // Remove from session storage
  if (cvId) {
    const stored = getSuppressedFromStorage(cvId);
    const updated = stored.filter(
      f => f.fixId !== fixId && (!fixSignatureHash || f.fixSignatureHash !== fixSignatureHash)
    );
    saveSuppressedToStorage(cvId, updated);
  }
  
  // Remove from database
  if (cvId && fixSignatureHash) {
    try {
      await fetch(`/api/cvs/${cvId}/suppressed-fixes/${fixSignatureHash}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('Failed to remove suppression from database:', error);
    }
  }
}

/**
 * Clear all suppressions for a CV
 * Used when a new PDF is uploaded (hash check)
 */
export async function clearSuppressionsForCV(cvId: string): Promise<void> {
  if (!cvId) return;
  
  // Clear session storage
  if (typeof window !== 'undefined') {
    try {
      const key = getStorageKey(cvId);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear suppressions from session storage:', error);
    }
  }
  
  // Note: We don't clear database suppressions here
  // They should be cleared by the backend when a new CV version is uploaded
}

/**
 * Process sync queue (retry failed syncs)
 */
export async function processSyncQueue(): Promise<void> {
  const queue = getSyncQueue();
  if (queue.length === 0) return;
  
  const processed: number[] = [];
  
  for (let i = 0; i < queue.length; i++) {
    const { cvId, fix } = queue[i];
    try {
      await syncToDatabase(cvId, fix);
      processed.push(i);
    } catch (error) {
      // Keep in queue for next retry
      console.warn(`Failed to sync suppression ${fix.fixId}, will retry later:`, error);
    }
  }
  
  // Remove processed items
  if (processed.length > 0) {
    const remaining = queue.filter((_, i) => !processed.includes(i));
    if (remaining.length === 0) {
      clearSyncQueue();
    } else {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
        } catch (error) {
          console.warn('Failed to update sync queue:', error);
        }
      }
    }
  }
}

// Auto-process sync queue on page load
if (typeof window !== 'undefined') {
  // Process queue after a short delay to allow page to load
  setTimeout(() => {
    processSyncQueue().catch(console.error);
  }, 2000);
  
  // Also process on visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      processSyncQueue().catch(console.error);
    }
  });
}

