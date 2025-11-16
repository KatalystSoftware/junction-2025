/**
 * Portfolio Impact Background Worker
 *
 * Runs every 60 seconds to:
 * 1. Load all active sessions
 * 2. Calculate and apply growth increments
 * 3. Persist updated advisor states
 * 4. Clean up stale sessions
 */

import {
  getActiveGrowthSessions,
  applyGrowthIncrement,
  updateGrowthRate,
  clearSessionGrowth,
} from "./portfolio-impact-service.ts";
import { loadSession, saveSession } from "../persistence/session-store.ts";

export class PortfolioImpactWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;
  private readonly TICK_INTERVAL = 60 * 1000; // 60 seconds
  private readonly STALE_SESSION_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  constructor() {
    console.log("💼 Portfolio Impact Worker initialized");
  }

  /**
   * Start the background worker
   */
  start(): void {
    if (this.running) {
      console.log("⚠️ Portfolio Impact Worker already running");
      return;
    }

    this.running = true;
    console.log(`✅ Portfolio Impact Worker started (tick every ${this.TICK_INTERVAL / 1000}s)`);

    // Run immediately on start
    this.tick();

    // Then run every interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.TICK_INTERVAL);
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log("🛑 Portfolio Impact Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Main tick function - processes all active sessions
   */
  private async tick(): Promise<void> {
    try {
      const activeSessions = getActiveGrowthSessions();

      if (activeSessions.length === 0) {
        // No active sessions, skip
        return;
      }

      console.log(`💰 Processing ${activeSessions.length} active portfolio growth sessions...`);

      let successCount = 0;
      let errorCount = 0;
      let totalGrowth = 0;

      for (const sessionId of activeSessions) {
        try {
          const result = await this.processSession(sessionId);
          if (result.updated) {
            successCount++;
            totalGrowth += result.growth;
          }
        } catch (error) {
          errorCount++;
          console.error(
            `❌ Error processing session ${sessionId.substring(0, 8)}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (successCount > 0) {
        const sign = totalGrowth >= 0 ? "+" : "";
        const emoji = totalGrowth >= 0 ? "✅" : "⚠️";
        const action = totalGrowth >= 0 ? "growth" : "decline";
        console.log(
          `${emoji} Portfolio ${action} applied: ${successCount} sessions, ${sign}€${totalGrowth.toFixed(2)} total`,
        );
      }

      if (errorCount > 0) {
        console.log(`⚠️ ${errorCount} sessions failed to process`);
      }
    } catch (error) {
      console.error("❌ Error in portfolio impact worker tick:", error);
    }
  }

  /**
   * Process a single session
   */
  private async processSession(sessionId: string): Promise<{
    updated: boolean;
    growth: number;
  }> {
    // Load session
    const savedSession = await loadSession(sessionId);
    if (!savedSession) {
      // Session no longer exists, clean up
      clearSessionGrowth(sessionId);
      return { updated: false, growth: 0 };
    }

    const { advisorState, updatedAt } = savedSession;

    // Check if session is stale (no activity in 30 minutes)
    const lastActivity = new Date(updatedAt).getTime();
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity > this.STALE_SESSION_THRESHOLD) {
      // Session is stale, clean up growth tracking
      clearSessionGrowth(sessionId);
      return { updated: false, growth: 0 };
    }

    // Only apply growth if advisor has completed at least one session
    if (advisorState.totalSessions === 0) {
      return { updated: false, growth: 0 };
    }

    // Recalculate growth rate (in case advisor state changed)
    updateGrowthRate(sessionId, advisorState);

    // Apply growth increment (can be negative if performance is poor!)
    const delta = applyGrowthIncrement(advisorState, sessionId);

    if (!delta) {
      // No delta calculated
      return { updated: false, growth: 0 };
    }

    // Save updated session (even if delta is negative - portfolio can decrease!)
    // IMPORTANT: Preserve threadHistories and threadMetadata from saved session
    await saveSession(
      sessionId,
      advisorState,
      savedSession.threadHistories,
      savedSession.threadMetadata
    );

    return {
      updated: true,
      growth: delta.total, // Can be negative!
    };
  }

  /**
   * Force process all sessions immediately (for testing)
   */
  async forceProcessAll(): Promise<void> {
    await this.tick();
  }
}

// Singleton instance
let workerInstance: PortfolioImpactWorker | null = null;

/**
 * Get the singleton worker instance
 */
export function getPortfolioImpactWorker(): PortfolioImpactWorker {
  if (!workerInstance) {
    workerInstance = new PortfolioImpactWorker();
  }
  return workerInstance;
}

/**
 * Start the portfolio impact worker (called on server startup)
 */
export function startPortfolioImpactWorker(): void {
  const worker = getPortfolioImpactWorker();
  worker.start();
}

/**
 * Stop the portfolio impact worker (called on server shutdown)
 */
export function stopPortfolioImpactWorker(): void {
  if (workerInstance) {
    workerInstance.stop();
  }
}
