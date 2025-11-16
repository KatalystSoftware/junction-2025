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
  handleInterventionResponse,
} from "../game/orchestrator.ts";
import {
  saveSession,
  loadSession,
  sessionExists,
  generateSessionId,
  type ThreadMetadata,
} from "../persistence/session-store.ts";
import type {
  AdvisorState,
  GameResponse,
  ThreadInfo,
  ConsultationSession,
  FinancialTopic,
  TopicExpertise,
  SessionGoal,
  CompletedMaterial,
} from "../types/game-types.ts";

/**
 * Client-safe version of AdvisorState - only fields the frontend needs
 * Excludes sensitive server-only fields like database credentials
 */
export interface ClientSafeAdvisorState {
  reputation: number;
  skillLevel: number;
  specializations: FinancialTopic[];
  topicsExpertise: TopicExpertise;
  sessionHistory: ConsultationSession[];
  totalClientsHelped: number;
  activeClients: string[];
  activeThreads: Record<string, ThreadInfo>;
  godBossRelationship: number;
  learningMaterials: CompletedMaterial[];
  totalSessions: number;
  lastReviewSession: number;
  hasCompletedOnboarding: boolean;
  currentStreak: number;
  lastStreakCheckSession: number;
  advisorCoins: number;
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  currentGoal: SessionGoal | null;
  achievementsUnlocked: string[];
  careerTier: number;
}

/**
 * Map server AdvisorState to client-safe version
 * Explicitly includes only fields the frontend needs
 */
function toClientSafeAdvisorState(state: AdvisorState): ClientSafeAdvisorState {
  return {
    reputation: state.reputation,
    skillLevel: state.skillLevel,
    specializations: state.specializations,
    topicsExpertise: state.topicsExpertise,
    sessionHistory: state.sessionHistory,
    totalClientsHelped: state.totalClientsHelped,
    activeClients: state.activeClients,
    activeThreads: state.activeThreads,
    godBossRelationship: state.godBossRelationship,
    learningMaterials: state.learningMaterials,
    totalSessions: state.totalSessions,
    lastReviewSession: state.lastReviewSession,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    currentStreak: state.currentStreak,
    lastStreakCheckSession: state.lastStreakCheckSession,
    advisorCoins: state.advisorCoins,
    lifetimeSavingsGenerated: state.lifetimeSavingsGenerated,
    lifetimeDebtCleared: state.lifetimeDebtCleared,
    currentGoal: state.currentGoal,
    achievementsUnlocked: state.achievementsUnlocked,
    careerTier: state.careerTier,
  };
}

/**
 * Client-safe version of GameResponse - sanitizes nested state
 */
interface ClientSafeGameResponse extends Omit<GameResponse, "stateUpdate"> {
  stateUpdate?: ClientSafeAdvisorState;
}

/**
 * Map GameResponse to client-safe version
 */
function toClientSafeGameResponse(
  response: GameResponse,
): ClientSafeGameResponse {
  const { stateUpdate, ...rest } = response;
  return {
    ...rest,
    stateUpdate: stateUpdate
      ? toClientSafeAdvisorState(stateUpdate)
      : undefined,
  };
}

// Create router
const app = new Hono();

// Enable CORS for frontend requests
app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"], // Vite dev servers
    credentials: true,
  }),
);

// ============================================================================
// ROUTE 1: Initialize or Load Session
// ============================================================================

interface InitRequest {
  sessionId?: string; // If provided, try to load existing session
}

interface InitResponse {
  sessionId: string;
  advisorState: ClientSafeAdvisorState;
  isNewSession: boolean;
  threadHistories?: Record<
    string,
    Array<{
      role: "user" | "assistant";
      content: string;
      isVoice?: boolean;
      audioUrl?: string;
      voiceUrgency?: string;
    }>
  >;
  threadMetadata?: Record<string, ThreadMetadata>;
  autoStartedConsultation?: ClientSafeGameResponse; // Auto-started if no active threads
}

app.post("/init", async (c) => {
  try {
    const body = await c.req.json<InitRequest>();
    let sessionId = body.sessionId;
    let advisorState: AdvisorState;
    let isNewSession = false;
    let threadHistories: Record<
      string,
      Array<{
        role: "user" | "assistant";
        content: string;
        isVoice?: boolean;
        audioUrl?: string;
        voiceUrgency?: string;
      }>
    > = {};
    let threadMetadata: Record<string, ThreadMetadata> = {};

    // Try to load existing session
    if (sessionId) {
      const savedSession = await loadSession(sessionId);
      if (savedSession) {
        console.log(
          `📂 Loaded existing session: ${sessionId.substring(0, 8)}...`,
        );
        advisorState = savedSession.advisorState;

        // Convert Maps to plain objects for JSON
        threadHistories = Object.fromEntries(savedSession.threadHistories);
        if (savedSession.threadMetadata) {
          threadMetadata = Object.fromEntries(savedSession.threadMetadata);
        }
        console.log(
          `💬 Loaded ${Object.keys(threadHistories).length} thread histories`,
        );
        console.log(
          `📊 Loaded ${Object.keys(threadMetadata).length} thread metadata`,
        );

        // Don't save - we just loaded this data, don't overwrite it
      } else {
        console.log(
          `⚠️ Session ${sessionId.substring(0, 8)}... not found, creating new`,
        );
        advisorState = createNewAdvisor(sessionId);
        isNewSession = true;

        // Save initial state for new session
        await saveSession(sessionId, advisorState);
      }
    } else {
      // Create brand new session
      sessionId = generateSessionId();
      advisorState = createNewAdvisor(sessionId);
      isNewSession = true;
      console.log(`✨ Created new session: ${sessionId.substring(0, 8)}...`);

      // Save initial state for new session
      await saveSession(sessionId, advisorState);
    }

    // SANITY CHECK: Auto-start consultation if onboarding is done and no active threads
    let autoStartedConsultation: ClientSafeGameResponse | undefined;

    if (advisorState.hasCompletedOnboarding) {
      // Count active (non-resolved) threads
      const activeThreadCount = Object.values(
        advisorState.activeThreads,
      ).filter((thread) => thread.status !== "resolved").length;

      if (activeThreadCount === 0) {
        console.log(
          "🚨 SANITY CHECK: No active threads detected, auto-starting consultation...",
        );

        try {
          // Auto-start a new consultation
          const gameResponse = await startNewConsultation(
            advisorState.advisorId,
            advisorState,
          );

          // Convert to Maps for processing
          const historiesMap = threadHistories
            ? new Map(Object.entries(threadHistories))
            : new Map();
          const metadataMap = threadMetadata
            ? new Map(Object.entries(threadMetadata))
            : new Map();

          // Process the consultation response (same logic as /start-consultation)
          if (
            gameResponse.type === "character_message" &&
            gameResponse.threadId &&
            gameResponse.messages
          ) {
            const threadId = gameResponse.threadId;
            const existingHistory = historiesMap.get(threadId) || [];

            // Add character's initial messages
            for (const msg of gameResponse.messages) {
              const messageEntry: {
                role: "assistant";
                content: string;
                isVoice?: boolean;
                audioUrl?: string;
                voiceUrgency?: string;
              } = {
                role: "assistant" as const,
                content: msg,
              };

              // Include voice data if present
              if (gameResponse.voiceNeeded && gameResponse.voiceConfig) {
                messageEntry.isVoice = true;
                messageEntry.audioUrl = gameResponse.voiceConfig.audioUrl;
                messageEntry.voiceUrgency = gameResponse.voiceConfig.urgency;
              }

              existingHistory.push(messageEntry);
            }

            historiesMap.set(threadId, existingHistory);
            console.log(
              `💬 Auto-started: Saved initial message(s) to thread ${threadId.substring(0, 8)}...`,
            );

            // Save character metadata if provided
            if (gameResponse.characterInfo) {
              metadataMap.set(threadId, gameResponse.characterInfo);
              console.log(
                `👤 Auto-started: Saved character metadata for thread ${threadId.substring(0, 8)}...`,
              );
            }
          }

          // Save updated state with the new consultation
          await saveSession(
            sessionId,
            gameResponse.stateUpdate,
            historiesMap,
            metadataMap,
          );

          // Update our response data
          advisorState = gameResponse.stateUpdate;
          threadHistories = Object.fromEntries(historiesMap);
          threadMetadata = Object.fromEntries(metadataMap);
          autoStartedConsultation = toClientSafeGameResponse(gameResponse);

          console.log("✅ Auto-started consultation successfully");
        } catch (error) {
          console.error("❌ Failed to auto-start consultation:", error);
          // Don't fail the whole request, just log and continue
        }
      }
    }

    return c.json<InitResponse>({
      sessionId,
      advisorState: toClientSafeAdvisorState(advisorState),
      isNewSession,
      threadHistories,
      threadMetadata,
      autoStartedConsultation,
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
  threadHistories?: Record<
    string,
    Array<{
      role: "user" | "assistant";
      content: string;
      isVoice?: boolean;
      audioUrl?: string;
      voiceUrgency?: string;
    }>
  >;
  threadMetadata?: Record<string, ThreadMetadata>;
  userLanguage?: string; // User's preferred language: 'en', 'fi', or 'sv'
}

interface StartConsultationResponse extends ClientSafeGameResponse {
  sessionId: string;
}

app.post("/start-consultation", async (c) => {
  try {
    const {
      sessionId,
      advisorState,
      threadHistories,
      threadMetadata,
      userLanguage,
    } = await c.req.json<StartConsultationRequest>();

    console.log(
      `🎬 Starting consultation for session: ${sessionId.substring(0, 8)}... (language: ${userLanguage || "en"})`,
    );

    // Call orchestrator to get next character/scenario
    const gameResponse = await startNewConsultation(
      advisorState.advisorId,
      advisorState,
      userLanguage || "en",
    );

    // Convert threadHistories and threadMetadata to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const metadataMap = threadMetadata
      ? new Map(Object.entries(threadMetadata))
      : new Map();

    // If this is onboarding, save the boss message to threadHistories
    if (gameResponse.type === "onboarding" && gameResponse.onboardingMessage) {
      const msg = gameResponse.onboardingMessage;
      const bossMessageContent = `${msg.welcomeTitle}\n\n${msg.introduction}\n\n${msg.roleExplanation}\n\n${msg.howItWorks}\n\n${msg.expectations}\n\n${msg.encouragement}`;

      historiesMap.set("boss-pinned", [
        { role: "assistant" as const, content: bossMessageContent },
      ]);

      console.log("👔 Saved boss onboarding message to historiesMap");
      console.log("👔 historiesMap size:", historiesMap.size);
      console.log(
        "👔 historiesMap has boss-pinned:",
        historiesMap.has("boss-pinned"),
      );
    }

    // If this is a new character message, save it to threadHistories
    if (
      gameResponse.type === "character_message" &&
      gameResponse.threadId &&
      gameResponse.messages
    ) {
      const threadId = gameResponse.threadId;
      const existingHistory = historiesMap.get(threadId) || [];

      // Add character's initial messages
      for (const msg of gameResponse.messages) {
        const messageEntry: {
          role: "assistant";
          content: string;
          isVoice?: boolean;
          audioUrl?: string;
          voiceUrgency?: string;
        } = {
          role: "assistant" as const,
          content: msg,
        };

        // Include voice data if present
        if (gameResponse.voiceNeeded && gameResponse.voiceConfig) {
          console.log(`🎤 Voice message detected! Adding to history:`, {
            enabled: gameResponse.voiceConfig.enabled,
            urgency: gameResponse.voiceConfig.urgency,
            hasAudio: !!gameResponse.voiceConfig.audioUrl,
          });
          messageEntry.isVoice = true;
          messageEntry.audioUrl = gameResponse.voiceConfig.audioUrl;
          messageEntry.voiceUrgency = gameResponse.voiceConfig.urgency;
        } else {
          console.log(`📝 Regular text message (no voice):`, {
            voiceNeeded: gameResponse.voiceNeeded,
            hasVoiceConfig: !!gameResponse.voiceConfig,
          });
        }

        existingHistory.push(messageEntry);
      }

      historiesMap.set(threadId, existingHistory);
      console.log(
        `💬 Saved ${gameResponse.messages.length} initial message(s) to thread ${threadId.substring(0, 8)}...`,
      );

      // Save character metadata if provided
      if (gameResponse.characterInfo) {
        metadataMap.set(threadId, gameResponse.characterInfo);
        console.log(
          `👤 Saved character metadata for thread ${threadId.substring(0, 8)}...`,
        );
      }
    }

    // If this is a boss check-in, save it to boss threadHistories
    if (gameResponse.type === "boss_checkin" && gameResponse.checkinMessage) {
      const msg = gameResponse.checkinMessage;
      const bossHistory = historiesMap.get("boss-pinned") || [];

      // Format the check-in message
      const checkinContent = `${msg.greeting}\n\n${msg.observation}\n\n${msg.mainMessage}\n\n${msg.advice}\n\n${msg.closing}`;

      bossHistory.push({ role: "assistant" as const, content: checkinContent });
      historiesMap.set("boss-pinned", bossHistory);

      console.log("👔 Saved boss check-in message to historiesMap");
    }

    // If this is a boss intervention, save it to boss threadHistories
    if (
      gameResponse.type === "boss_intervention" &&
      gameResponse.interventionMessage
    ) {
      const msg = gameResponse.interventionMessage;
      const bossHistory = historiesMap.get("boss-pinned") || [];

      // Format the intervention message
      const interventionContent = `🚨 ${msg.severity === "critical" ? "CRITICAL" : "WARNING"} INTERVENTION 🚨\n\n${msg.reason}\n\n✅ CORRECT APPROACH:\n${msg.correctApproach}`;

      bossHistory.push({
        role: "assistant" as const,
        content: interventionContent,
      });
      historiesMap.set("boss-pinned", bossHistory);

      console.log("🚨 Saved boss intervention message to boss threadHistories");
    }

    // Save updated state with histories and metadata
    await saveSession(
      sessionId,
      gameResponse.stateUpdate,
      historiesMap,
      metadataMap,
    );

    // Convert Maps back to objects for response
    const threadHistoriesObject = Object.fromEntries(historiesMap);
    const threadMetadataObject = Object.fromEntries(metadataMap);

    // Log thread count instead of full content to reduce noise
    console.log(
      "📤 Returning threadHistories:",
      Object.keys(threadHistoriesObject).length,
      "threads",
    );

    return c.json<StartConsultationResponse>({
      ...toClientSafeGameResponse(gameResponse),
      sessionId,
      threadHistories: threadHistoriesObject,
      threadMetadata: threadMetadataObject,
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
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    isVoice?: boolean;
    audioUrl?: string;
    voiceUrgency?: string;
  }>;
  threadHistories?: Record<
    string,
    Array<{
      role: "user" | "assistant";
      content: string;
      isVoice?: boolean;
      audioUrl?: string;
      voiceUrgency?: string;
    }>
  >;
  threadMetadata?: Record<string, ThreadMetadata>;
  userLanguage?: string; // User's preferred language: 'en', 'fi', or 'sv'
}

interface SendMessageResponse extends ClientSafeGameResponse {
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
      userLanguage,
    } = await c.req.json<SendMessageRequest>();

    console.log(
      `💬 Message in thread ${threadId.substring(0, 8)}... from session ${sessionId.substring(0, 8)}... (language: ${userLanguage || "en"})`,
    );

    let gameResponse;

    // Convert threadHistories and threadMetadata to Maps
    const historiesMap = threadHistories
      ? new Map(Object.entries(threadHistories))
      : new Map();
    const metadataMap = threadMetadata
      ? new Map(Object.entries(threadMetadata))
      : new Map();

    // Special handling for boss messages
    if (threadId === "boss-pinned") {
      // Check if there's an active intervention
      if (advisorState.activeIntervention) {
        console.log("🚨 Handling intervention response from advisor");
        gameResponse = await handleInterventionResponse(message, advisorState);
      } else {
        console.log("👔 Boss message - using RAG help system");

        // Get current consultation context if available
        let currentConsultation;
        const activeThread = Object.values(advisorState.activeThreads).find(
          (t) => t.status === "awaiting_response",
        );

        if (activeThread) {
          // Get scenario details from session history
          const scenario = advisorState.sessionHistory.find(
            (s) => s.scenarioId === activeThread.scenarioId,
          );

          if (scenario) {
            currentConsultation = {
              characterName: scenario.characterName,
              topic: scenario.topicsCovered[0] || ("general" as any),
              scenarioSummary:
                scenario.characterReactions[0] || "Client seeking advice",
            };
          }
        }

        // Invoke boss help agent with RAG
        const { invokeBossHelpTool } = await import(
          "../tools/invoke-boss-help-tool.ts"
        );

        const bossHistory = historiesMap.get("boss-pinned") || [];

        const bossHelp = await invokeBossHelpTool({
          userQuestion: message,
          conversationHistory: bossHistory,
          advisorState,
          currentConsultationContext: currentConsultation,
        });

        gameResponse = {
          type: "character_message" as const,
          threadId: "boss-pinned",
          messages: [bossHelp.response],
          stateUpdate: advisorState,
          citations: bossHelp.citations,
          suggestedMaterials: bossHelp.suggestedMaterials,
        };

        // Add user message and boss response to threadHistories
        bossHistory.push(
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: bossHelp.response },
        );
      }

      historiesMap.set("boss-pinned", historiesMap.get("boss-pinned") || []);
    } else {
      // Process regular advisor response
      gameResponse = await handleAdvisorResponse(
        threadId,
        message,
        advisorState,
        conversationHistory,
        userLanguage || "en",
      );

      // Add user message and character response to threadHistories
      const threadHistory = historiesMap.get(threadId) || [];

      // Add user's message
      threadHistory.push({ role: "user" as const, content: message });

      // Add character's response messages
      if (gameResponse.messages) {
        for (const msg of gameResponse.messages) {
          const messageEntry: {
            role: "assistant";
            content: string;
            isVoice?: boolean;
            audioUrl?: string;
            voiceUrgency?: string;
          } = {
            role: "assistant" as const,
            content: msg,
          };

          // Include voice data if present
          if (gameResponse.voiceNeeded && gameResponse.voiceConfig) {
            messageEntry.isVoice = true;
            messageEntry.audioUrl = gameResponse.voiceConfig.audioUrl;
            messageEntry.voiceUrgency = gameResponse.voiceConfig.urgency;
          }

          threadHistory.push(messageEntry);
        }
      }

      historiesMap.set(threadId, threadHistory);
      console.log(
        `💬 Saved conversation to thread ${threadId.substring(0, 8)}... (now ${threadHistory.length} messages)`,
      );

      // ALSO save intervention message to boss thread if present (parallel notification)
      if (gameResponse.interventionMessage) {
        const msg = gameResponse.interventionMessage;
        const bossHistory = historiesMap.get("boss-pinned") || [];

        // Format the intervention message - keep it natural like a real boss
        const interventionContent = `${msg.reason}\n\n---\n\n${msg.correctApproach}`;

        bossHistory.push({
          role: "assistant" as const,
          content: interventionContent,
        });
        historiesMap.set("boss-pinned", bossHistory);

        console.log(
          "🚨 Saved parallel boss intervention message to boss threadHistories",
        );
      }
    }

    // Save updated state with message histories and metadata
    await saveSession(
      sessionId,
      gameResponse.stateUpdate,
      historiesMap,
      metadataMap,
    );

    // Convert Maps back to objects for response
    const threadHistoriesObject = Object.fromEntries(historiesMap);
    const threadMetadataObject = Object.fromEntries(metadataMap);

    return c.json<SendMessageResponse>({
      ...toClientSafeGameResponse(gameResponse),
      sessionId,
      threadHistories: threadHistoriesObject,
      threadMetadata: threadMetadataObject,
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
      advisorState: savedSession?.advisorState
        ? toClientSafeAdvisorState(savedSession.advisorState)
        : undefined,
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

    console.log(`📊 Getting financial overview for character: ${characterId}`);

    // Dynamically import SimulationEngine to avoid circular dependencies
    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );
    const engine = new SimulationEngine();

    const state = await engine.getCharacterState(characterId);
    if (!state) {
      await engine.close();
      return c.json({ error: "Character not found" }, 404);
    }

    const recentTxns = await engine.getRecentTransactions(characterId, 10);
    const summaries = await engine.getMonthlySummaries(characterId, 1);
    const currentMonth = summaries[0];

    if (!currentMonth) {
      await engine.close();
      return c.json({ error: "No financial data available" }, 404);
    }

    // Get spending by category
    const db = engine.getDatabase();
    if (!db) {
      await engine.close();
      return c.json({ error: "Database not available" }, 500);
    }

    const spending = await db.getSpendingByCategory(
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

    await engine.close();

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

    console.log(`💰 Getting transactions for character: ${characterId}`);

    // Dynamically import SimulationEngine
    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );
    const engine = new SimulationEngine();

    const state = await engine.getCharacterState(characterId);
    if (!state) {
      await engine.close();
      return c.json({ error: "Character not found" }, 404);
    }

    const transactions = await engine.getRecentTransactions(characterId, limit);
    await engine.close();

    return c.json({
      characterId,
      transactions: transactions.map((txn) => ({
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

// ============================================================================
// ROUTE: Serve Audio Files
// ============================================================================
app.get("/audio/:audioId", async (c) => {
  try {
    const audioId = c.req.param("audioId");

    // Validate UUID format to prevent path traversal
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(audioId)) {
      return c.json({ error: "Invalid audio ID" }, 400);
    }

    // Read from disk
    const fs = await import("fs/promises");
    const path = await import("path");
    const audioPath = path.join(
      process.cwd(),
      "saves",
      "audio",
      `${audioId}.mp3`,
    );

    // Check if file exists
    try {
      await fs.access(audioPath);
    } catch {
      return c.json({ error: "Audio not found" }, 404);
    }

    // Read audio file
    const audioBuffer = await fs.readFile(audioPath);

    // Serve as MP3
    c.header("Content-Type", "audio/mpeg");
    c.header("Content-Length", audioBuffer.length.toString());
    c.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    return c.body(audioBuffer);
  } catch (error) {
    console.error("❌ Error serving audio:", error);
    return c.json({ error: "Failed to serve audio" }, 500);
  }
});

// ============================================================================
// ROUTE 7: Get Analytics Dashboard
// ============================================================================

app.get("/analytics/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    console.log(
      `📊 Getting analytics for session: ${sessionId.substring(0, 8)}...`,
    );

    const savedSession = await loadSession(sessionId);
    if (!savedSession) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Dynamically import analytics service
    const { getAnalyticsDashboard } = await import(
      "../analytics/analytics-service.ts"
    );

    const dashboard = getAnalyticsDashboard(savedSession.advisorState);

    return c.json(dashboard);
  } catch (error) {
    console.error("❌ Error in /analytics/:sessionId:", error);
    return c.json({ error: "Failed to get analytics" }, 500);
  }
});

// ============================================================================
// LEADERBOARD ROUTES
// ============================================================================

/**
 * Get global leaderboard
 * Query params: category (global|reputation|impact|expertise|coins|achievements), limit (default 100)
 */
app.get("/leaderboard", async (c) => {
  try {
    const category = (c.req.query("category") || "global") as
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements";
    const limit = parseInt(c.req.query("limit") || "100");

    console.log(`🏆 Fetching leaderboard: ${category}, limit: ${limit}`);

    const { leaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const leaderboard = await leaderboardService.getLeaderboard(
      category,
      limit,
    );

    return c.json(leaderboard);
  } catch (error) {
    console.error("❌ Error in /leaderboard:", error);
    return c.json({ error: "Failed to get leaderboard" }, 500);
  }
});

/**
 * Get advisor rank in a specific category
 */
app.get("/leaderboard/rank/:advisorId", async (c) => {
  try {
    const advisorId = c.req.param("advisorId");
    const category = (c.req.query("category") || "global") as
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements";

    console.log(
      `🏆 Fetching rank for advisor ${advisorId.substring(0, 8)}... in ${category}`,
    );

    const { leaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const rank = await leaderboardService.getAdvisorRank(advisorId);

    if (!rank) {
      return c.json({ error: "Advisor not found in leaderboard" }, 404);
    }

    return c.json(rank);
  } catch (error) {
    console.error("❌ Error in /leaderboard/rank/:advisorId:", error);
    return c.json({ error: "Failed to get advisor rank" }, 500);
  }
});

/**
 * Get surrounding advisors in leaderboard (for contextual view)
 */
app.get("/leaderboard/surrounding/:advisorId", async (c) => {
  try {
    const advisorId = c.req.param("advisorId");
    const category = (c.req.query("category") || "global") as
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements";
    const range = parseInt(c.req.query("range") || "5");

    console.log(
      `🏆 Fetching surrounding advisors for ${advisorId.substring(0, 8)}... in ${category} (±${range})`,
    );

    const { leaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const surrounding = await leaderboardService.getSurroundingAdvisors(
      advisorId,
      category,
      range,
    );

    return c.json(surrounding);
  } catch (error) {
    console.error("❌ Error in /leaderboard/surrounding/:advisorId:", error);
    return c.json({ error: "Failed to get surrounding advisors" }, 500);
  }
});

// Export both the app and its type for RPC
export { app as gameRoutes };
export type GameApiType = typeof app;
