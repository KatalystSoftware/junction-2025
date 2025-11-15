/**
 * Session Manager - UUID-based Session Storage
 *
 * Manages user session IDs in browser localStorage
 */

const SESSION_KEY = "elamapeli_session_id";

/**
 * Get or create a session ID for the current user
 * Stored in localStorage to persist across page reloads
 */
export function getOrCreateSessionId(): string {
  // Try to get existing session ID from localStorage
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Generate new UUID using browser crypto API
    sessionId = crypto.randomUUID();

    // Store in localStorage
    localStorage.setItem(SESSION_KEY, sessionId);

    console.log("✨ New session created:", sessionId.substring(0, 8) + "...");
  } else {
    console.log(
      "📂 Existing session loaded:",
      sessionId.substring(0, 8) + "...",
    );
  }

  return sessionId;
}

/**
 * Clear the current session (useful for logout/reset)
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  console.log("🗑️ Session cleared");
}

/**
 * Get the current session ID without creating a new one
 * Returns null if no session exists
 */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Set a specific session ID (useful for loading saved games)
 */
export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
  console.log("💾 Session set:", sessionId.substring(0, 8) + "...");
}
