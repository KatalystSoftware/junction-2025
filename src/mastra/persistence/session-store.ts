/**
 * Session Store - Persistent Storage for Game Sessions
 *
 * Uses Mastra's built-in LibSQLStore to persist advisor sessions,
 * allowing players to save progress and continue later.
 */

import { storage } from "../index.ts";
import type { AdvisorState, AdviceChoice } from "../types/game-types.ts";

// Thread metadata types (matching play-tui.tsx)
export interface FinancialOverview {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  anomalies: string[];
}

export interface ThreadMetadata {
  characterId?: string;
  characterName: string;
  name: string;
  age?: number;
  occupation?: string;
  gender?: "male" | "female";
  financialProfile?: {
    incomeLevel: "low" | "medium" | "high";
    typicalMonthlyIncome: number;
    hasDebt: boolean;
    hasSavings: "none" | "minimal" | "moderate" | "good";
    bankAccounts: Array<{
      accountId: string;
      bankName: string;
      accountType: string;
      balance: number;
      currency: string;
    }>;
    creditCards: Array<{
      cardId: string;
      issuer: string;
      balance: number;
      creditLimit: number;
      interestRate: number;
      minimumPayment: number;
      currency: string;
    }>;
    debts: Array<{
      debtId?: string;
      creditor?: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyPayment: number;
      interestRate?: number;
      currency?: string;
    }>;
    subscriptions: Array<{
      subscriptionId: string;
      name: string;
      monthlyCost: number;
      category: string;
      currency: string;
      startDate: string;
    }>;
    monthlyExpenses: {
      rent?: number;
      groceries?: number;
      transportation?: number;
      utilities?: number;
      other?: number;
    };
  };
  status: "active" | "completed";
  financialOverview?: FinancialOverview;
  adviceChoices?: AdviceChoice[];
}

export interface SavedSession {
  sessionId: string;
  advisorState: AdvisorState;
  threadHistories: Map<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Map<string, ThreadMetadata>;
  savedAt: string;
}

export interface SessionMetadata {
  lastActive: string;
  totalSessions: number;
  reputation: number;
  skillLevel: number;
}

/**
 * Save a complete game session to persistent storage
 */
export async function saveSession(
  sessionId: string,
  advisorState: AdvisorState,
  threadHistories?: Map<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >,
  threadMetadata?: Map<string, ThreadMetadata>
): Promise<void> {
  // Prepare metadata for quick lookups
  const metadata: Record<string, unknown> = {
    lastActive: new Date().toISOString(),
    totalSessions: advisorState.totalSessions,
    reputation: advisorState.reputation,
    skillLevel: advisorState.skillLevel,
  };

  // Prepare session data
  const threadHistoriesObject = threadHistories
    ? Object.fromEntries(threadHistories)
    : {};
  const threadMetadataObject = threadMetadata
    ? Object.fromEntries(threadMetadata)
    : {};

  // Log counts instead of full content to reduce noise
  console.log(
    `💾 Saving ${Object.keys(threadHistoriesObject).length} threads and ${Object.keys(threadMetadataObject).length} metadata entries`
  );

  const sessionData = {
    advisorState,
    threadHistories: threadHistoriesObject,
    threadMetadata: threadMetadataObject,
    savedAt: metadata.lastActive,
  };

  // Save to mastra_resources table
  try {
    // Try to update existing resource first
    await storage.updateResource({
      resourceId: sessionId,
      workingMemory: JSON.stringify(sessionData),
      metadata,
    });
    console.log(`💾 Session updated: ${sessionId.substring(0, 8)}...`);
  } catch (updateError) {
    // If update fails, try to create new resource
    console.log(
      `⚠️ Update failed for ${sessionId.substring(0, 8)}, trying create...`
    );
    try {
      const now = new Date();
      await storage.saveResource({
        resource: {
          id: sessionId,
          workingMemory: JSON.stringify(sessionData),
          metadata,
          createdAt: now,
          updatedAt: now,
        },
      });
      console.log(`💾 Session created: ${sessionId.substring(0, 8)}...`);
    } catch (createError) {
      // CRITICAL: Both update and create failed - throw error
      console.error(
        `❌ CRITICAL: Failed to save session ${sessionId.substring(0, 8)}:`,
        {
          updateError,
          createError,
        }
      );
      throw new Error(
        `Failed to save session ${sessionId.substring(0, 8)} - data may be lost. Please try again.`
      );
    }
  }
}

/**
 * Load a previously saved game session
 */
/**
 * Custom error for session load failures
 * Allows callers to distinguish between "not found" and "database error"
 */
export class SessionLoadError extends Error {
  constructor(message: string, cause: unknown, isNotFound: boolean) {
    super(message);
    this.name = "SessionLoadError";
  }
}

export async function loadSession(
  sessionId: string
): Promise<SavedSession | null> {
  try {
    // Query mastra_resources table
    const resource = await storage.getResourceById({ resourceId: sessionId });

    if (!resource || !resource.workingMemory) {
      // Session legitimately doesn't exist - this is OK
      return null;
    }

    // Parse saved data
    const sessionData = JSON.parse(resource.workingMemory);

    console.log(
      `📖 Raw sessionData.threadHistories:`,
      sessionData.threadHistories
    );
    console.log(
      `📖 Raw sessionData.threadMetadata:`,
      sessionData.threadMetadata
    );

    // Convert thread histories back to Map
    const threadHistories = new Map<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >(Object.entries(sessionData.threadHistories || {}));

    // Convert thread metadata back to Map
    const threadMetadata = new Map<string, ThreadMetadata>(
      Object.entries(sessionData.threadMetadata || {})
    );

    console.log(`📖 Converted threadHistories Map size:`, threadHistories.size);
    console.log(`📖 Converted threadMetadata Map size:`, threadMetadata.size);

    return {
      sessionId,
      advisorState: sessionData.advisorState,
      threadHistories,
      threadMetadata,
      savedAt: sessionData.savedAt,
    };
  } catch (error) {
    // CRITICAL: Distinguish between "not found" and "database error"
    console.error(`❌ Failed to load session ${sessionId}:`, error);

    // Check if this is a database connectivity error
    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    const isDatabaseError =
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("database") ||
      errorMessage.includes("sqlite");

    if (isDatabaseError) {
      // This is a database error - throw it so caller knows DB is down
      throw new SessionLoadError(
        `Database error while loading session ${sessionId.substring(0, 8)}`,
        error,
        false
      );
    }

    // Otherwise, treat as "not found" (JSON parse error, corrupted data, etc.)
    console.warn(
      `⚠️ Session ${sessionId.substring(0, 8)} found but could not be parsed - treating as not found`
    );
    return null;
  }
}

/**
 * Check if a session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  try {
    const resource = await storage.getResourceById({ resourceId: sessionId });
    return !!resource?.workingMemory;
  } catch {
    return false;
  }
}

/**
 * Delete a session (cleanup)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    // Mark session as deleted by updating it
    await storage.updateResource({
      resourceId: sessionId,
      workingMemory: JSON.stringify({ deleted: true }),
      metadata: {
        deleted: true,
        deletedAt: new Date().toISOString(),
      },
    });
    console.log(`🗑️  Session deleted: ${sessionId.substring(0, 8)}...`);
  } catch (error) {
    console.error(`❌ Failed to delete session ${sessionId}:`, error);
  }
}

/**
 * List all saved sessions (for debugging/management)
 */
export async function listSessions(): Promise<
  Array<{ sessionId: string; metadata: SessionMetadata }>
> {
  try {
    console.warn("⚠️ listSessions() not yet implemented");
    return [];
  } catch (error) {
    console.error("❌ Failed to list sessions:", error);
    return [];
  }
}

/**
 * Generate a new session UUID
 */
export function generateSessionId(): string {
  // Use Node.js built-in crypto.randomUUID() (available in Node 16+)
  return crypto.randomUUID();
}

/**
 * Format session ID for display (shortened)
 */
export function formatSessionId(sessionId: string): string {
  return `${sessionId.substring(0, 8)}...${sessionId.substring(sessionId.length - 4)}`;
}
