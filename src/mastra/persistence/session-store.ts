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
  threadMetadata?: Map<string, ThreadMetadata>,
): Promise<void> {
  // Prepare metadata for quick lookups
  const metadata: Record<string, unknown> = {
    lastActive: new Date().toISOString(),
    totalSessions: advisorState.totalSessions,
    reputation: advisorState.reputation,
    skillLevel: advisorState.skillLevel,
  };

  // Prepare session data
  const sessionData = {
    advisorState,
    threadHistories: threadHistories ? Object.fromEntries(threadHistories) : {},
    threadMetadata: threadMetadata ? Object.fromEntries(threadMetadata) : {},
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
  } catch {
    // If update fails, create new resource
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
  }

  console.log(`💾 Session saved: ${sessionId.substring(0, 8)}...`);
}

/**
 * Load a previously saved game session
 */
export async function loadSession(
  sessionId: string,
): Promise<SavedSession | null> {
  try {
    // Query mastra_resources table
    const resource = await storage.getResourceById({ resourceId: sessionId });

    if (!resource || !resource.workingMemory) {
      return null;
    }

    // Parse saved data
    const sessionData = JSON.parse(resource.workingMemory);

    // Convert thread histories back to Map
    const threadHistories = new Map<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >(Object.entries(sessionData.threadHistories || {}));

    // Convert thread metadata back to Map
    const threadMetadata = new Map<string, ThreadMetadata>(
      Object.entries(sessionData.threadMetadata || {}),
    );

    return {
      sessionId,
      advisorState: sessionData.advisorState,
      threadHistories,
      threadMetadata,
      savedAt: sessionData.savedAt,
    };
  } catch (error) {
    console.error(`❌ Failed to load session ${sessionId}:`, error);
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
    // LibSQLStore doesn't have a built-in list method,
    // so we'd need to query SQLite directly
    // For now, return empty array (can be enhanced later)
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
