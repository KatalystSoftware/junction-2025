/**
 * Session Lock - In-memory locking for concurrent session updates
 *
 * Prevents race conditions when multiple requests try to update the same session
 * Uses an in-memory Map of promises to ensure sequential updates per session
 */

// Map of sessionId -> pending save promise
const lockMap = new Map<string, Promise<void>>();

// Lock timeout in milliseconds (60 seconds)
const LOCK_TIMEOUT_MS = 60000;

/**
 * Execute a session operation with exclusive lock
 * Ensures only one operation runs at a time per session
 * Throws error if lock cannot be acquired within timeout period
 */
export async function withSessionLock<T>(
  sessionId: string,
  operation: () => Promise<T>,
): Promise<T> {
  // Wait for any pending operation on this session (with timeout)
  const existingLock = lockMap.get(sessionId);
  if (existingLock) {
    console.log(`⏳ Waiting for lock on session ${sessionId.substring(0, 8)}...`);

    // Create timeout promise
    const timeout = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Lock timeout: Previous operation on session ${sessionId.substring(0, 8)} took too long`));
      }, LOCK_TIMEOUT_MS);
    });

    try {
      // Race between existing lock completion and timeout
      await Promise.race([
        existingLock.catch(() => {
          // Ignore errors from previous operation
        }),
        timeout,
      ]);
    } catch (error) {
      // Timeout occurred - clear the stuck lock
      if (lockMap.get(sessionId) === existingLock) {
        lockMap.delete(sessionId);
        console.error(`⚠️ Cleared stuck lock for session ${sessionId.substring(0, 8)}`);
      }
      throw error;
    }
  }

  // Create new lock for this operation
  const operationPromise = (async () => {
    try {
      console.log(`🔒 Acquired lock for session ${sessionId.substring(0, 8)}...`);
      const result = await operation();
      console.log(`✅ Released lock for session ${sessionId.substring(0, 8)}...`);
      return result;
    } catch (error) {
      console.error(`❌ Error in locked operation for session ${sessionId.substring(0, 8)}:`, error);
      throw error;
    } finally {
      // Remove lock when done
      if (lockMap.get(sessionId) === operationPromise) {
        lockMap.delete(sessionId);
      }
    }
  })();

  lockMap.set(sessionId, operationPromise as Promise<void>);

  return operationPromise;
}

/**
 * Get lock status for debugging
 */
export function getLockStatus(sessionId: string): boolean {
  return lockMap.has(sessionId);
}

/**
 * Clear all locks (for testing/debugging only)
 */
export function clearAllLocks(): void {
  lockMap.clear();
}
