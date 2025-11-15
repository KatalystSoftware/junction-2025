/**
 * API Routes for Frontend Integration
 *
 * Exposes the game orchestrator via HTTP endpoints
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createNewAdvisor,
  startNewConsultation,
  handleAdvisorResponse,
} from "../game/orchestrator.ts";
import {
  saveSession,
  loadSession,
  sessionExists,
  generateSessionId,
  type ThreadMetadata,
} from "../persistence/session-store.ts";
import type { AdvisorState, GameResponse } from "../types/game-types.ts";

// Create router
const app = new Hono();

// Enable CORS for frontend requests
app.use("/*", cors({
  origin: ["http://localhost:3000", "http://localhost:5173"], // Vite dev servers
  credentials: true,
}));

// ============================================================================
// ROUTE 1: Initialize or Load Session
// ============================================================================

interface InitRequest {
  sessionId?: string; // If provided, try to load existing session
}

interface InitResponse {
  sessionId: string;
  advisorState: AdvisorState;
  isNewSession: boolean;
  threadHistories?: Record<string, Array<{ role: "user" | "assistant"; content: string }>>;
  threadMetadata?: Record<string, ThreadMetadata>;
}

app.post("/init", async (c) => {
  try {
    const body = await c.req.json<InitRequest>();
    let sessionId = body.sessionId;
    let advisorState: AdvisorState;
    let isNewSession = false;
    let threadHistories: Record<string, Array<{ role: "user" | "assistant"; content: string }>> = {};
    let threadMetadata: Record<string, ThreadMetadata> = {};

    // Try to load existing session
    if (sessionId) {
      const savedSession = await loadSession(sessionId);
      if (savedSession) {
        console.log(`📂 Loaded existing session: ${sessionId.substring(0, 8)}...`);
        advisorState = savedSession.advisorState;

        // Convert Maps to plain objects for JSON
        threadHistories = Object.fromEntries(savedSession.threadHistories);
        if (savedSession.threadMetadata) {
          threadMetadata = Object.fromEntries(savedSession.threadMetadata);
        }
        console.log(`💬 Loaded ${Object.keys(threadHistories).length} thread histories`);
        console.log(`📊 Loaded ${Object.keys(threadMetadata).length} thread metadata`);
      } else {
        console.log(`⚠️ Session ${sessionId.substring(0, 8)}... not found, creating new`);
        advisorState = createNewAdvisor(sessionId);
        isNewSession = true;
      }
    } else {
      // Create brand new session
      sessionId = generateSessionId();
      advisorState = createNewAdvisor(sessionId);
      isNewSession = true;
      console.log(`✨ Created new session: ${sessionId.substring(0, 8)}...`);
    }

    // Save initial state
    await saveSession(sessionId, advisorState);

    return c.json<InitResponse>({
      sessionId,
      advisorState,
      isNewSession,
      threadHistories,
      threadMetadata,
    });
  } catch (error) {
    console.error("❌ Error in /init:", error);
    return c.json({ error: "Failed to initialize session" }, 500);
  }
});

// ============================================================================
// ROUTE 2: Start New Consultation
// ============================================================================

interface StartConsultationRequest {
  sessionId: string;
  advisorState: AdvisorState;
  threadHistories?: Record<string, Array<{ role: "user" | "assistant"; content: string }>>;
  threadMetadata?: Record<string, ThreadMetadata>;
}

interface StartConsultationResponse extends GameResponse {
  sessionId: string;
}

app.post("/start-consultation", async (c) => {
  try {
    const { sessionId, advisorState, threadHistories, threadMetadata } = await c.req.json<StartConsultationRequest>();

    console.log(`🎬 Starting consultation for session: ${sessionId.substring(0, 8)}...`);

    // Call orchestrator to get next character/scenario
    const gameResponse = await startNewConsultation(
      advisorState.advisorId,
      advisorState
    );

    // Convert threadHistories and threadMetadata to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const metadataMap = threadMetadata
      ? new Map(Object.entries(threadMetadata))
      : new Map();

    // Save updated state with histories and metadata
    await saveSession(sessionId, gameResponse.stateUpdate, historiesMap, metadataMap);

    return c.json<StartConsultationResponse>({
      ...gameResponse,
      sessionId,
    });
  } catch (error) {
    console.error("❌ Error in /start-consultation:", error);
    return c.json({ error: "Failed to start consultation" }, 500);
  }
});

// ============================================================================
// ROUTE 3: Send Message in Thread
// ============================================================================

interface SendMessageRequest {
  sessionId: string;
  threadId: string;
  message: string;
  advisorState: AdvisorState;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  threadHistories?: Record<string, Array<{ role: "user" | "assistant"; content: string }>>;
  threadMetadata?: Record<string, ThreadMetadata>;
}

interface SendMessageResponse extends GameResponse {
  sessionId: string;
}

app.post("/send-message", async (c) => {
  try {
    const {
      sessionId,
      threadId,
      message,
      advisorState,
      conversationHistory,
      threadHistories,
      threadMetadata,
    } = await c.req.json<SendMessageRequest>();

    console.log(`💬 Message in thread ${threadId.substring(0, 8)}... from session ${sessionId.substring(0, 8)}...`);

    // Process advisor's response
    const gameResponse = await handleAdvisorResponse(
      threadId,
      message,
      advisorState,
      conversationHistory
    );

    // Convert threadHistories and threadMetadata to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const metadataMap = threadMetadata
      ? new Map(Object.entries(threadMetadata))
      : new Map();

    // Save updated state with message histories and metadata
    await saveSession(sessionId, gameResponse.stateUpdate, historiesMap, metadataMap);

    return c.json<SendMessageResponse>({
      ...gameResponse,
      sessionId,
    });
  } catch (error) {
    console.error("❌ Error in /send-message:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// ============================================================================
// ROUTE 4 (Optional): Get Session Status
// ============================================================================

app.get("/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const exists = await sessionExists(sessionId);

    if (!exists) {
      return c.json({ exists: false }, 404);
    }

    const savedSession = await loadSession(sessionId);

    return c.json({
      exists: true,
      advisorState: savedSession?.advisorState,
      lastSaved: savedSession?.savedAt,
    });
  } catch (error) {
    console.error("❌ Error in /session/:sessionId:", error);
    return c.json({ error: "Failed to get session" }, 500);
  }
});

// ============================================================================
// ROUTE 5: Get Financial Overview for Character
// ============================================================================

app.get("/financial-overview/:characterId", async (c) => {
  try {
    const characterId = c.req.param("characterId");
    const databasePath = c.req.query("database") || "saves/advisor_default.db";

    console.log(`📊 Getting financial overview for character: ${characterId}`);

    // Dynamically import SimulationEngine to avoid circular dependencies
    const { SimulationEngine } = await import("../simulation/simulation-engine.ts");
    const engine = new SimulationEngine(databasePath);

    const state = engine.getCharacterState(characterId);
    if (!state) {
      engine.close();
      return c.json({ error: "Character not found" }, 404);
    }

    const recentTxns = engine.getRecentTransactions(characterId, 10);
    const summaries = engine.getMonthlySummaries(characterId, 1);
    const currentMonth = summaries[0];

    if (!currentMonth) {
      engine.close();
      return c.json({ error: "No financial data available" }, 404);
    }

    // Get spending by category
    const db = engine.getDatabase();
    const spending = db.getSpendingByCategory(
      characterId,
      currentMonth.month + "-01",
      currentMonth.month + "-31",
    );

    // Calculate net income
    const netIncome = currentMonth.totalIncome - currentMonth.totalExpenses;

    // Top categories with percentages
    const totalExpenses = currentMonth.totalExpenses;
    const topCategories = Object.entries(spending)
      .map(([cat, amount]) => ({
        category: cat,
        amount: Math.abs(amount),
        percentage:
          totalExpenses > 0 ? (Math.abs(amount) / totalExpenses) * 100 : 0,
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Recent transactions (last 5)
    const recentTransactions = recentTxns.slice(0, 5).map((txn) => ({
      date: txn.date,
      description: txn.description.substring(0, 30),
      amount: txn.amount,
    }));

    // Check for anomalies
    const anomalies: string[] = [];
    if (spending.coffee && Math.abs(spending.coffee) > 60) {
      anomalies.push(
        `High coffee spending: €${Math.abs(spending.coffee).toFixed(2)}/month`,
      );
    }
    if (spending.onlineShopping && Math.abs(spending.onlineShopping) > 100) {
      anomalies.push(
        `Frequent online shopping: €${Math.abs(spending.onlineShopping).toFixed(2)}/month`,
      );
    }
    if (spending.dining && Math.abs(spending.dining) > 150) {
      anomalies.push(
        `High dining/delivery costs: €${Math.abs(spending.dining).toFixed(2)}/month`,
      );
    }
    if (currentMonth.totalExpenses > currentMonth.totalIncome) {
      anomalies.push(
        `SPENDING EXCEEDS INCOME by €${(currentMonth.totalExpenses - currentMonth.totalIncome).toFixed(2)}`,
      );
    }

    const overview = {
      balance: state.currentBalance,
      monthlyIncome: currentMonth.totalIncome,
      monthlyExpenses: currentMonth.totalExpenses,
      netIncome,
      topCategories,
      recentTransactions,
      anomalies,
    };

    engine.close();

    return c.json(overview);
  } catch (error) {
    console.error("❌ Error in /financial-overview/:characterId:", error);
    return c.json({ error: "Failed to get financial overview" }, 500);
  }
});

// ============================================================================
// ROUTE 6: Get Transactions for Character
// ============================================================================

app.get("/transactions/:characterId", async (c) => {
  try {
    const characterId = c.req.param("characterId");
    const limit = parseInt(c.req.query("limit") || "50");
    const databasePath = c.req.query("database") || "saves/advisor_default.db";

    console.log(`💰 Getting transactions for character: ${characterId}`);

    // Dynamically import SimulationEngine
    const { SimulationEngine } = await import("../simulation/simulation-engine.ts");
    const engine = new SimulationEngine(databasePath);

    const state = engine.getCharacterState(characterId);
    if (!state) {
      engine.close();
      return c.json({ error: "Character not found" }, 404);
    }

    const transactions = engine.getRecentTransactions(characterId, limit);
    engine.close();

    return c.json({
      characterId,
      transactions: transactions.map(txn => ({
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        category: txn.category,
        balance: txn.balanceAfter,
      })),
    });
  } catch (error) {
    console.error("❌ Error in /transactions/:characterId:", error);
    return c.json({ error: "Failed to get transactions" }, 500);
  }
});

// Export both the app and its type for RPC
export { app as gameRoutes };
export type GameApiType = typeof app;
