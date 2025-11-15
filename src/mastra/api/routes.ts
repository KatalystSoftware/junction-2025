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
  characterInfo?: Record<string, { name: string; age: number; occupation: string }>;
}

app.post("/init", async (c) => {
  try {
    const body = await c.req.json<InitRequest>();
    let sessionId = body.sessionId;
    let advisorState: AdvisorState;
    let isNewSession = false;
    let threadHistories: Record<string, Array<{ role: "user" | "assistant"; content: string }>> = {};
    let characterInfo: Record<string, { name: string; age: number; occupation: string }> = {};

    // Try to load existing session
    if (sessionId) {
      const savedSession = await loadSession(sessionId);
      if (savedSession) {
        console.log(`📂 Loaded existing session: ${sessionId.substring(0, 8)}...`);
        advisorState = savedSession.advisorState;

        // Convert Maps to plain objects for JSON
        threadHistories = Object.fromEntries(savedSession.threadHistories);
        characterInfo = Object.fromEntries(savedSession.characterInfo);
        console.log(`💬 Loaded ${Object.keys(threadHistories).length} thread histories`);
        console.log(`👤 Loaded ${Object.keys(characterInfo).length} character infos`);
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
      characterInfo,
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
  characterInfo?: Record<string, { name: string; age: number; occupation: string }>;
}

interface StartConsultationResponse extends GameResponse {
  sessionId: string;
}

app.post("/start-consultation", async (c) => {
  try {
    const { sessionId, advisorState, threadHistories, characterInfo } = await c.req.json<StartConsultationRequest>();

    console.log(`🎬 Starting consultation for session: ${sessionId.substring(0, 8)}...`);

    // Call orchestrator to get next character/scenario
    const gameResponse = await startNewConsultation(
      advisorState.advisorId,
      advisorState
    );

    // Convert threadHistories and characterInfo to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const characterInfoMap = characterInfo
      ? new Map(Object.entries(characterInfo))
      : new Map();

    // Save updated state with histories and character info
    await saveSession(sessionId, gameResponse.stateUpdate, historiesMap, characterInfoMap);

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
  characterInfo?: Record<string, { name: string; age: number; occupation: string }>;
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
      characterInfo,
    } = await c.req.json<SendMessageRequest>();

    console.log(`💬 Message in thread ${threadId.substring(0, 8)}... from session ${sessionId.substring(0, 8)}...`);

    // Process advisor's response
    const gameResponse = await handleAdvisorResponse(
      threadId,
      message,
      advisorState,
      conversationHistory
    );

    // Convert threadHistories and characterInfo to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const characterInfoMap = characterInfo
      ? new Map(Object.entries(characterInfo))
      : new Map();

    // Save updated state with message histories and character info
    await saveSession(sessionId, gameResponse.stateUpdate, historiesMap, characterInfoMap);

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

// Export both the app and its type for RPC
export { app as gameRoutes };
export type GameApiType = typeof app;
