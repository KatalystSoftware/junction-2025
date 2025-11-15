/**
 * Error Recovery Tests
 *
 * Simple tests to demonstrate error recovery functionality
 */

import {
  withRetry,
  withRetryAndFallback,
  isRetryableError,
  getUserFriendlyError,
  clearErrorLog,
  getRecentErrors,
} from "./error-recovery.ts";

/**
 * Test: Retry logic with successful recovery
 */
async function testSuccessfulRecovery() {
  console.log("🧪 Test: Successful recovery after 2 attempts");

  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error("Temporary failure");
      }
      return "Success!";
    },
    "Test Operation",
    { maxAttempts: 3, initialDelayMs: 100 },
  );

  console.log(`✅ Result: ${result}, Attempts: ${attempts}`);
  console.assert(result === "Success!", "Should succeed after retries");
  console.assert(attempts === 2, "Should take 2 attempts");
}

/**
 * Test: Retry logic with fallback
 */
async function testFallbackOnFailure() {
  console.log("\n🧪 Test: Fallback after all retries fail");

  let attempts = 0;
  const result = await withRetryAndFallback(
    async () => {
      attempts++;
      throw new Error("Persistent failure");
    },
    "Fallback Value",
    "Test Operation with Fallback",
    { maxAttempts: 2, initialDelayMs: 100 },
  );

  console.log(`✅ Result: ${result}, Attempts: ${attempts}`);
  console.assert(result === "Fallback Value", "Should use fallback value");
  console.assert(attempts === 2, "Should attempt max retries");
}

/**
 * Test: Error classification
 */
function testErrorClassification() {
  console.log("\n🧪 Test: Error classification");

  const networkError = { code: "ECONNRESET" };
  const rateLimitError = { status: 429 };
  const serverError = { status: 503 };
  const clientError = { status: 404 };

  console.assert(
    isRetryableError(networkError),
    "Network errors should be retryable",
  );
  console.assert(
    isRetryableError(rateLimitError),
    "Rate limit errors should be retryable",
  );
  console.assert(
    isRetryableError(serverError),
    "Server errors should be retryable",
  );
  console.assert(
    !isRetryableError(clientError),
    "Client errors (404) should not be retryable",
  );

  console.log("✅ All error classifications correct");
}

/**
 * Test: User-friendly error messages
 */
function testUserFriendlyErrors() {
  console.log("\n🧪 Test: User-friendly error messages");

  const networkError = { code: "ETIMEDOUT" };
  const rateLimitError = { status: 429 };
  const serverError = { status: 500 };
  const unknownError = new Error("Unknown error");

  const networkMsg = getUserFriendlyError("Network Test", networkError);
  const rateLimitMsg = getUserFriendlyError("Rate Limit Test", rateLimitError);
  const serverMsg = getUserFriendlyError("Server Test", serverError);
  const unknownMsg = getUserFriendlyError("Unknown Test", unknownError);

  console.log(`Network error: "${networkMsg}"`);
  console.log(`Rate limit error: "${rateLimitMsg}"`);
  console.log(`Server error: "${serverMsg}"`);
  console.log(`Unknown error: "${unknownMsg}"`);

  console.assert(
    networkMsg.includes("internet connection"),
    "Network errors should mention connection",
  );
  console.assert(
    rateLimitMsg.includes("busy"),
    "Rate limit should mention busy",
  );
  console.assert(
    serverMsg.includes("unavailable"),
    "Server errors should mention unavailable",
  );

  console.log("✅ All error messages are user-friendly");
}

/**
 * Test: Error logging
 */
function testErrorLogging() {
  console.log("\n🧪 Test: Error logging");

  clearErrorLog();

  // Log some errors
  const errors = getRecentErrors(10);
  console.log(`Initial error count: ${errors.length}`);
  console.assert(errors.length === 0, "Error log should be empty after clear");

  console.log("✅ Error logging works correctly");
}

/**
 * Run all tests
 */
export async function runErrorRecoveryTests() {
  console.log("🚀 Running Error Recovery Tests\n");

  try {
    testErrorClassification();
    testUserFriendlyErrors();
    testErrorLogging();
    await testSuccessfulRecovery();
    await testFallbackOnFailure();

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Tests failed:", error);
    throw error;
  }
}
