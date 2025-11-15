/**
 * Error Recovery Utilities
 *
 * Provides retry logic with exponential backoff and error logging
 * to prevent AI failures from crashing the game.
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000
  maxDelayMs?: number; // Default: 10000
  backoffMultiplier?: number; // Default: 2
  shouldRetry?: (error: any) => boolean; // Optional custom retry logic
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: string;
  context: string;
  error: string;
  attempt: number;
  maxAttempts: number;
  recovered: boolean;
}

/**
 * In-memory error log for debugging
 */
const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log an error for debugging
 */
export function logError(
  context: string,
  error: any,
  attempt: number,
  maxAttempts: number,
  recovered: boolean,
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : String(error),
    attempt,
    maxAttempts,
    recovered,
  };

  errorLog.push(entry);

  // Keep log size manageable
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }

  // Console logging
  const emoji = recovered ? "✅" : "❌";
  console.error(
    `${emoji} [${context}] Attempt ${attempt}/${maxAttempts}: ${entry.error}`,
  );
}

/**
 * Get recent error logs
 */
export function getRecentErrors(count: number = 10): ErrorLogEntry[] {
  return errorLog.slice(-count);
}

/**
 * Clear error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Retry wrapper with exponential backoff
 *
 * Wraps an async function with retry logic. Will attempt the operation
 * up to maxAttempts times with exponential backoff between attempts.
 *
 * @param fn The async function to retry
 * @param context Description of what's being attempted (for logging)
 * @param config Retry configuration
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  config: RetryConfig = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = config;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Success! Log recovery if this wasn't the first attempt
      if (attempt > 1) {
        logError(context, lastError, attempt, maxAttempts, true);
        console.log(`✅ [${context}] Recovered after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logError(context, error, attempt, maxAttempts, false);
        throw error;
      }

      // If this was the last attempt, don't log yet (will log as unrecovered)
      if (attempt === maxAttempts) {
        logError(context, error, attempt, maxAttempts, false);
        throw error;
      }

      // Log this attempt and wait before retrying
      logError(context, error, attempt, maxAttempts, false);
      console.log(`⏳ [${context}] Retrying in ${delay}ms...`);

      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap an operation with retry logic and a fallback value
 *
 * Unlike withRetry, this never throws - it returns the fallback value
 * if all retries fail.
 *
 * @param fn The async function to retry
 * @param fallback The fallback value to return if all retries fail
 * @param context Description of what's being attempted (for logging)
 * @param config Retry configuration
 * @returns The result of the function if successful, otherwise the fallback
 */
export async function withRetryAndFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
  config: RetryConfig = {},
): Promise<T> {
  try {
    return await withRetry(fn, context, config);
  } catch (error) {
    console.error(
      `⚠️ [${context}] All retries failed, using fallback value`,
      error,
    );
    return fallback;
  }
}

/**
 * Check if an error is retryable (network errors, rate limits, etc.)
 */
export function isRetryableError(error: any): boolean {
  // Don't retry in test mode - fail fast to catch issues
  if (
    process.env.TEST_CACHE_MODE === "record" ||
    process.env.TEST_CACHE_MODE === "replay"
  ) {
    return false;
  }

  // Retry network errors
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return true;
  }

  // Retry rate limits
  if (error.status === 429 || error.statusCode === 429) {
    return true;
  }

  // Retry server errors (5xx)
  if (
    error.status >= 500 ||
    error.statusCode >= 500 ||
    error.response?.status >= 500
  ) {
    return true;
  }

  // Retry timeout errors
  if (error.message?.includes("timeout")) {
    return true;
  }

  // Don't retry client errors (4xx except 429)
  if (
    (error.status >= 400 && error.status < 500) ||
    (error.statusCode >= 400 && error.statusCode < 500)
  ) {
    return false;
  }

  // Default: retry unknown errors
  return true;
}

/**
 * Generate a user-friendly error message for display
 */
export function getUserFriendlyError(context: string, error: any): string {
  // Network errors
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return "Connection issue. Please check your internet connection and try again.";
  }

  // Rate limit
  if (error.status === 429 || error.statusCode === 429) {
    return "Service is busy. Please wait a moment and try again.";
  }

  // Server errors
  if (
    error.status >= 500 ||
    error.statusCode >= 500 ||
    error.response?.status >= 500
  ) {
    return "The service is temporarily unavailable. Please try again in a moment.";
  }

  // Generic fallback
  return "An unexpected error occurred. Your progress has been saved. Please try again.";
}
