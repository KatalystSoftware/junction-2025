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
  checkAndSendFollowUps,
  countUnresolvedThreads,
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
import {
  onAdvisorInit,
  syncLeaderboardSnapshot,
} from "../game/orchestrator-hooks.ts";

/**
 * Helper function to check for follow-ups and include them in responses
 * This makes the system server-led - frontend doesn't need to poll
 */
async function checkAndIncludeFollowUps(
  advisorState: AdvisorState,
): Promise<{
  followUps: Array<{
    threadId: string;
    characterName: string;
    messages: string[];
    frustrationLevel: number;
  }>;
  updatedState: AdvisorState;
}> {
  const result = await checkAndSendFollowUps(advisorState);
  return {
    followUps: result.followUpsSent,
    updatedState: result.stateUpdate,
  };
}

/**
 * Client-safe version of AdvisorState - only fields the frontend needs
 * Excludes sensitive server-only fields like database credentials
 */
export interface ClientSafeAdvisorState {
  advisorId: string;
  advisorName: string;
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
  isFired: boolean;
  fireReason?: string;
  criticalInterventionsForcedThrough: number;
}

/**
 * Map server AdvisorState to client-safe version
 * Explicitly includes only fields the frontend needs
 */
export function toClientSafeAdvisorState(
  state: AdvisorState,
): ClientSafeAdvisorState {
  return {
    advisorId: state.advisorId,
    advisorName: state.advisorName,
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
    isFired: state.isFired,
    fireReason: state.fireReason,
    criticalInterventionsForcedThrough:
      state.criticalInterventionsForcedThrough,
  };
}

export function ensureAdvisorId(
  state: AdvisorState,
  sessionId: string,
): AdvisorState {
  if (state.advisorId) {
    return state;
  }
  return { ...state, advisorId: sessionId };
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
// ElevenLabs Signed URL Endpoint (for boss voice calls)
// ============================================================================

app.post("/elevenlabs-signed-url", async (c) => {
  try {
    const BOSS_AGENT_ID = "agent_7201ka5kvscgevbvc4kkpvvzee5c";
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

    if (!ELEVENLABS_API_KEY) {
      console.error("❌ ELEVENLABS_API_KEY not configured");
      return c.json({ error: "ELEVENLABS_API_KEY not configured" }, 500);
    }

    // Get review data from request body (optional)
    const body = await c.req.json().catch(() => ({}));
    const { review, language } = body;

    console.log("🔑 Requesting signed URL for boss agent...");

    // Prepare custom variables for ElevenLabs agent
    const customVariables: Record<string, string> = {};

    if (review) {
      // Pass review data as variables the agent can reference
      customVariables.overall_score = String(review.overallScore || "N/A");
      customVariables.strengths = Array.isArray(review.strengthsIdentified)
        ? review.strengthsIdentified.join(", ")
        : "N/A";
      customVariables.areas_for_improvement = Array.isArray(review.areasForImprovement)
        ? review.areasForImprovement.join(", ")
        : "N/A";
      customVariables.encouraging_message = review.encouragingMessage || "Keep up the good work!";
      customVariables.reputation_change = String(review.reputationChange || 0);
      customVariables.skill_level_change = String(review.skillLevelChange || 0);
    }

    if (language) {
      customVariables.language = language; // User's preferred language
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${BOSS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        ...(Object.keys(customVariables).length > 0 && {
          body: JSON.stringify({ variables: customVariables }),
        }),
      }
    );

    if (!response.ok) {
      console.error("❌ Failed to get signed URL:", response.statusText);
      return c.json({ error: `Failed to get signed URL: ${response.statusText}` }, 500);
    }

    const data = await response.json();
    console.log("✅ Generated ElevenLabs signed URL for boss call");
    if (review) {
      console.log("📊 Passed review data as custom variables:", customVariables);
    }

    return c.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("❌ Error getting signed URL:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================================
// ROUTE 1: Initialize or Load Session
// ============================================================================

interface InitRequest {
  sessionId?: string; // If provided, try to load existing session
  advisorName?: string; // User's chosen name (from onboarding)
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
  followUps?: Array<{
    threadId: string;
    characterName: string;
    messages: string[];
    frustrationLevel: number;
  }>;
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

        // FALLBACK: Generate advice choices for threads that don't have them (old threads from before the fix)
        let needsUpdate = false;
        for (const [threadId, metadata] of Object.entries(threadMetadata)) {
          if (!metadata.adviceChoices || metadata.adviceChoices.length === 0) {
            console.log(
              `🔧 Thread ${threadId.substring(0, 8)}... missing advice choices, generating fallback...`,
            );

            // Try to generate advice choices based on the scenario
            try {
              const threadInfo = advisorState.activeThreads[threadId];
              if (threadInfo) {
                const { characterPool } = await import(
                  "../game/character-pool-manager.ts"
                );
                const { generateAdviceChoices } = await import(
                  "../game/choice-generator.ts"
                );

                const character = characterPool.getCharacter(
                  threadInfo.characterId,
                );
                const scenario = characterPool.getScenario(
                  threadInfo.scenarioId,
                );

                if (character && scenario) {
                  // Get conversation history for this thread to avoid repeating advice
                  const history = threadHistories[threadId] || [];

                  // Generate advice choices
                  const choices = generateAdviceChoices(
                    scenario,
                    character.personality,
                    history,
                  );

                  metadata.adviceChoices = choices;
                  needsUpdate = true;

                  console.log(
                    `✅ Generated ${choices.length} advice choices for thread ${threadId.substring(0, 8)}...`,
                  );
                } else {
                  console.log(
                    `⚠️ Could not find character/scenario for thread ${threadId.substring(0, 8)}..., using empty array`,
                  );
                  metadata.adviceChoices = [];
                  needsUpdate = true;
                }
              } else {
                // Thread not in activeThreads, likely resolved - use empty array
                metadata.adviceChoices = [];
                needsUpdate = true;
              }
            } catch (error) {
              console.error(
                `❌ Failed to generate advice choices for thread ${threadId.substring(0, 8)}...:`,
                error,
              );
              metadata.adviceChoices = [];
              needsUpdate = true;
            }
          }
        }

        // Save updated metadata if any threads were fixed
        if (needsUpdate) {
          const metadataMap = new Map(Object.entries(threadMetadata));
          await saveSession(
            sessionId,
            advisorState,
            savedSession.threadHistories,
            metadataMap,
          );
          console.log("💾 Saved updated threadMetadata with fallback choices");
        }

        if (!advisorState.advisorId) {
          advisorState = ensureAdvisorId(advisorState, sessionId);
          await saveSession(
            sessionId,
            advisorState,
            savedSession.threadHistories,
            savedSession.threadMetadata,
          );
          console.log("💾 Backfilled advisorId for legacy session");
        }

        // Don't save - we just loaded this data, don't overwrite it
      } else {
        console.log(
          `⚠️ Session ${sessionId.substring(0, 8)}... not found, creating new`,
        );
        advisorState = createNewAdvisor(sessionId, body.advisorName);
        isNewSession = true;

        // Save initial state for new session
        await saveSession(sessionId, advisorState);

        // Initialize in leaderboard
        await onAdvisorInit(advisorState, advisorState.advisorName);
      }
    } else {
      // Create brand new session
      sessionId = generateSessionId();
      advisorState = createNewAdvisor(sessionId, body.advisorName);
      isNewSession = true;
      console.log(`✨ Created new session: ${sessionId.substring(0, 8)}...`);

      // Save initial state for new session
      await saveSession(sessionId, advisorState);

      // Initialize in leaderboard
      await onAdvisorInit(advisorState, advisorState.advisorName);
    }

    // SANITY CHECK: Auto-start consultations if onboarding is done and we have too few active threads
    let autoStartedConsultation: ClientSafeGameResponse | undefined;

    if (advisorState.hasCompletedOnboarding) {
      // Count active (non-resolved) threads (excluding boss)
      let activeThreadCount = Object.values(
        advisorState.activeThreads,
      ).filter((thread) => thread.status !== "resolved").length;

      if (activeThreadCount < 3) {
        console.log(
          `🚨 SANITY CHECK: Only ${activeThreadCount} active threads, auto-starting consultations to reach 3...`,
        );

        const historiesMap = new Map(Object.entries(threadHistories));
        const metadataMap = new Map(Object.entries(threadMetadata));

        while (activeThreadCount < 3) {
          try {
            const gameResponse = await startNewConsultation(
              advisorState.advisorId,
              advisorState,
            );

            if (
              gameResponse.type === "character_message" &&
              gameResponse.threadId &&
              gameResponse.messages
            ) {
              const threadId = gameResponse.threadId;
              const existingHistory = historiesMap.get(threadId) || [];

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

                if (gameResponse.voiceNeeded && gameResponse.voiceConfig) {
                  messageEntry.isVoice = true;
                  messageEntry.audioUrl = gameResponse.voiceConfig.audioUrl;
                  messageEntry.voiceUrgency = gameResponse.voiceConfig.urgency;
                }

                existingHistory.push(messageEntry);
              }

              historiesMap.set(threadId, existingHistory);

              if (gameResponse.characterInfo && threadId) {
                const metadata: ThreadMetadata = {
                  characterName: gameResponse.characterInfo.name,
                  name: gameResponse.characterInfo.name,
                  age: gameResponse.characterInfo.age,
                  occupation: gameResponse.characterInfo.occupation,
                  gender: gameResponse.characterInfo.gender,
                  financialProfile: gameResponse.characterInfo.financialProfile,
                  status: "active",
                  adviceChoices: gameResponse.adviceChoices || [],
                };
                metadataMap.set(threadId, metadata);
              }
            }

            advisorState = gameResponse.stateUpdate;
            activeThreadCount = Object.values(
              advisorState.activeThreads,
            ).filter((thread) => thread.status !== "resolved").length;
            autoStartedConsultation = toClientSafeGameResponse(gameResponse);
          } catch (error) {
            console.error("❌ Failed to auto-start consultation:", error);
            break;
          }
        }

        await saveSession(
          sessionId,
          advisorState,
          historiesMap,
          metadataMap,
        );

        threadHistories = Object.fromEntries(historiesMap);
        threadMetadata = Object.fromEntries(metadataMap);
        console.log("✅ Auto-started consultations to maintain active threads");
      }
    }

    // Check for follow-ups (server-led approach)
    const { followUps, updatedState } = await checkAndIncludeFollowUps(
      advisorState,
    );

    // Save updated state if follow-ups were sent
    if (followUps.length > 0) {
      const historiesMap = threadHistories
        ? new Map(Object.entries(threadHistories))
        : new Map();
      const metadataMap = threadMetadata
        ? new Map(Object.entries(threadMetadata))
        : new Map();
      await saveSession(sessionId, updatedState, historiesMap, metadataMap);
      advisorState = updatedState;
    }

    // Sync latest advisor snapshot to leaderboard
    await syncLeaderboardSnapshot(advisorState, advisorState.advisorName);

    return c.json<InitResponse>({
      sessionId,
      advisorState: toClientSafeAdvisorState(advisorState),
      isNewSession,
      threadHistories,
      threadMetadata,
      autoStartedConsultation,
      followUps: followUps.length > 0 ? followUps : undefined,
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
      advisorState: requestAdvisorState,
      threadHistories,
      threadMetadata,
      userLanguage,
    } = await c.req.json<StartConsultationRequest>();

    const advisorState = ensureAdvisorId(requestAdvisorState, sessionId);

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
      if (gameResponse.characterInfo && threadId) {
        const metadata: ThreadMetadata = {
          characterName: gameResponse.characterInfo.name,
          name: gameResponse.characterInfo.name,
          age: gameResponse.characterInfo.age,
          occupation: gameResponse.characterInfo.occupation,
          gender: gameResponse.characterInfo.gender,
          financialProfile: gameResponse.characterInfo.financialProfile,
          status: "active",
          adviceChoices: gameResponse.adviceChoices || [],
        };
        metadataMap.set(threadId, metadata);
        console.log(
          `👤 Saved character metadata for thread ${threadId.substring(0, 8)}... (${metadata.adviceChoices?.length || 0} advice choices)`,
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

    // Check for follow-ups (server-led approach)
    const { followUps, updatedState } = await checkAndIncludeFollowUps(
      gameResponse.stateUpdate,
    );

    // Save updated state if follow-ups were sent
    if (followUps.length > 0) {
      await saveSession(sessionId, updatedState, historiesMap, metadataMap);
      gameResponse.stateUpdate = updatedState;
    }

    // Convert Maps back to objects for response
    const threadHistoriesObject = Object.fromEntries(historiesMap);
    const threadMetadataObject = Object.fromEntries(metadataMap);

    // Log thread count instead of full content to reduce noise
    console.log(
      "📤 Returning threadHistories:",
      Object.keys(threadHistoriesObject).length,
      "threads",
    );

    const response = {
      ...toClientSafeGameResponse(gameResponse),
      sessionId,
      threadHistories: threadHistoriesObject,
      threadMetadata: threadMetadataObject,
    };

    // Add follow-ups if any
    if (followUps.length > 0) {
      (response as any).followUps = followUps;
    }

    return c.json<StartConsultationResponse>(response);
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
      advisorState: requestAdvisorState,
      conversationHistory,
      threadHistories,
      threadMetadata,
      userLanguage,
    } = await c.req.json<SendMessageRequest>();

    let advisorState = ensureAdvisorId(requestAdvisorState, sessionId);

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
      const bossHistory = historiesMap.get("boss-pinned") || [];

      // Check if this is onboarding acknowledgment (simple response, no RAG needed)
      const isOnboardingAck =
        !advisorState.hasCompletedOnboarding &&
        bossHistory.length === 1 &&
        bossHistory[0].role === "assistant";

      if (isOnboardingAck) {
        console.log("👋 Boss onboarding acknowledgment - skipping RAG help");

        // Simple acknowledgment, no boss help needed
        gameResponse = {
          type: "character_message" as const,
          threadId: "boss-pinned",
          messages: [], // No response needed, next consultation will come from frontend auto-start
          stateUpdate: advisorState,
        };

        // Just save user's acknowledgment
        bossHistory.push({ role: "user" as const, content: message });
        historiesMap.set("boss-pinned", bossHistory);
      } else if (advisorState.activeIntervention) {
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
        historiesMap.set("boss-pinned", bossHistory);
      }
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
    // Check for follow-ups (server-led approach)
    const followUpResult = await checkAndIncludeFollowUps(
      gameResponse.stateUpdate,
    );

    if (followUpResult.followUps.length > 0) {
      gameResponse.stateUpdate = followUpResult.stateUpdate;
    }

    let finalState = gameResponse.stateUpdate;

    // After a conversation ends, try to maintain ~3 active character threads
    if (
      finalState.hasCompletedOnboarding &&
      gameResponse.type === "conversation_end"
    ) {
      const currentCount = countUnresolvedThreads(finalState);
      if (currentCount < 3) {
        try {
          const autoResponse = await startNewConsultation(
            finalState.advisorId,
            finalState,
            userLanguage || "en",
          );

          if (
            autoResponse.type === "character_message" &&
            autoResponse.threadId &&
            autoResponse.messages
          ) {
            const threadId = autoResponse.threadId;
            const existingHistory = historiesMap.get(threadId) || [];

            for (const msg of autoResponse.messages) {
              existingHistory.push({
                role: "assistant" as const,
                content: msg,
              });
            }

            historiesMap.set(threadId, existingHistory);

            if (autoResponse.characterInfo && threadId) {
              const metadata: ThreadMetadata = {
                characterName: autoResponse.characterInfo.name,
                name: autoResponse.characterInfo.name,
                age: autoResponse.characterInfo.age,
                occupation: autoResponse.characterInfo.occupation,
                gender: autoResponse.characterInfo.gender,
                financialProfile: autoResponse.characterInfo.financialProfile,
                status: "active",
                adviceChoices: autoResponse.adviceChoices || [],
              };
              metadataMap.set(threadId, metadata);
            }
          }

          finalState = autoResponse.stateUpdate;
          gameResponse.stateUpdate = autoResponse.stateUpdate;
        } catch (error) {
          console.error("❌ Failed to auto-start consultation:", error);
        }
      }
    }

    await saveSession(sessionId, finalState, historiesMap, metadataMap);

    // Sync latest advisor snapshot to leaderboard after every interaction
    await syncLeaderboardSnapshot(finalState, finalState.advisorName);

    // Convert Maps back to objects for response
    const threadHistoriesObject = Object.fromEntries(historiesMap);
    const threadMetadataObject = Object.fromEntries(metadataMap);

    const response = {
      ...toClientSafeGameResponse(gameResponse),
      sessionId,
      threadHistories: threadHistoriesObject,
      threadMetadata: threadMetadataObject,
    };

    // Add follow-ups if any
    if (followUpResult.followUps.length > 0) {
      (response as any).followUps = followUpResult.followUps;
    }

    return c.json<SendMessageResponse>(response);
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
      | "achievements"
      | "messages";
    const limit = parseInt(c.req.query("limit") || "100");

    console.log(`🏆 Fetching leaderboard: ${category}, limit: ${limit}`);

    const { getLeaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const leaderboardService = getLeaderboardService();
    if (!leaderboardService) {
      return c.json({ error: "Leaderboard service not available" }, 503);
    }
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
      | "achievements"
      | "messages";

    console.log(
      `🏆 Fetching rank for advisor ${advisorId.substring(0, 8)}... in ${category}`,
    );

    const { getLeaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const leaderboardService = getLeaderboardService();
    if (!leaderboardService) {
      return c.json({ error: "Leaderboard service not available" }, 503);
    }
    const rank = await leaderboardService.getAdvisorRank(advisorId, category);

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
      | "achievements"
      | "messages";
    const range = parseInt(c.req.query("range") || "5");

    console.log(
      `🏆 Fetching surrounding advisors for ${advisorId.substring(0, 8)}... in ${category} (±${range})`,
    );

    const { getLeaderboardService } = await import(
      "../persistence/leaderboard-service.ts"
    );
    const leaderboardService = getLeaderboardService();
    if (!leaderboardService) {
      return c.json({ error: "Leaderboard service not available" }, 503);
    }
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

// ============================================================================
// ROUTE: Transcribe Audio (Voice Messages)
// ============================================================================

interface TranscribeAudioRequest {
  audioData: string; // Base64 encoded audio
  mimeType:
    | "audio/wav"
    | "audio/mp3"
    | "audio/mpeg"
    | "audio/webm"
    | "audio/ogg";
  language?: string; // Optional language hint (fi, en, sv)
}

interface TranscribeAudioResponse {
  transcription: string;
  detectedLanguage?: string;
}

app.post("/transcribe-audio", async (c) => {
  try {
    const body = await c.req.json<TranscribeAudioRequest>();
    const { audioData, mimeType, language } = body;

    if (!audioData || !mimeType) {
      return c.json({ error: "Missing audioData or mimeType" }, 400);
    }

    console.log(
      `🎤 Transcribing audio (${mimeType}, language hint: ${language || "auto"})`,
    );

    // Import the speech-to-text service
    const { transcribeAudio } = await import(
      "../services/speech-to-text-service.ts"
    );

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, "base64");

    // Transcribe the audio
    const result = await transcribeAudio(audioBuffer, mimeType, {
      language,
      prompt:
        "This is a voice message from a financial advisor client discussing their financial situation.",
    });

    console.log(
      `✅ Transcription complete: "${result.text.substring(0, 50)}..."`,
    );

    return c.json({
      transcription: result.text,
      detectedLanguage: result.language,
    } as TranscribeAudioResponse);
  } catch (error) {
    console.error("❌ Error transcribing audio:", error);
    return c.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// ============================================================================
// ROUTE: Get Real Portfolio Impact (Based on Actual Transactions)
// ============================================================================
app.get("/real-portfolio-impact/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    console.log(
      `💰 Calculating real portfolio impact for session: ${sessionId.substring(0, 8)}...`,
    );

    const savedSession = await loadSession(sessionId);
    if (!savedSession) {
      return c.json({ error: "Session not found" }, 404);
    }

    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );
    const { characterPool } = await import("../index.ts");
    const engine = new SimulationEngine();

    // Get all characters this advisor has helped
    const allRelationships = characterPool.getCharacterRelationships(
      savedSession.advisorState.advisorId,
    );

    let totalRealSavings = 0;
    let totalRealDebtReduced = 0;
    const clientImpacts: Array<{
      characterId: string;
      characterName: string;
      savingsGenerated: number;
      debtReduced: number;
      balanceImprovement: number;
      sessionsCount: number;
    }> = [];

    for (const rel of allRelationships) {
      const character = characterPool.getCharacter(rel.characterId);
      if (!character) continue;

      // Get monthly summaries to calculate improvement
      const summaries = await engine.getMonthlySummaries(rel.characterId, 12);

      if (summaries.length >= 2) {
        // Compare first month (baseline) vs latest month
        const firstMonth = summaries[summaries.length - 1]; // oldest
        const latestMonth = summaries[0]; // most recent

        // Calculate balance improvement
        const balanceImprovement = latestMonth.endBalance - firstMonth.endBalance;

        // Calculate savings improvement (net income trend)
        const firstNetIncome = firstMonth.totalIncome - firstMonth.totalExpenses;
        const latestNetIncome = latestMonth.totalIncome - latestMonth.totalExpenses;
        const savingsImprovement = latestNetIncome - firstNetIncome;

        // Calculate debt reduction from debt_payment transactions
        const db = engine.getDatabase();
        if (db) {
          const allTransactions = await engine.getRecentTransactions(
            rel.characterId,
            1000,
          );
          const debtPayments = allTransactions
            .filter((txn) => txn.type === "debt_payment")
            .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

          totalRealDebtReduced += debtPayments;
        }

        totalRealSavings += Math.max(0, balanceImprovement);

        clientImpacts.push({
          characterId: rel.characterId,
          characterName: character.name,
          savingsGenerated: Math.max(0, balanceImprovement),
          debtReduced: 0, // Will calculate separately if needed
          balanceImprovement,
          sessionsCount: rel.totalSessions,
        });
      }
    }

    await engine.close();

    return c.json({
      totalRealSavings: Math.round(totalRealSavings),
      totalRealDebtReduced: Math.round(totalRealDebtReduced),
      totalClientsHelped: allRelationships.length,
      avgImpactPerClient:
        allRelationships.length > 0
          ? Math.round(totalRealSavings / allRelationships.length)
          : 0,
      clientImpacts: clientImpacts.sort(
        (a, b) => b.savingsGenerated - a.savingsGenerated,
      ),
      // Also include projected numbers for comparison
      projectedSavings: savedSession.advisorState.lifetimeSavingsGenerated,
      projectedDebtCleared: savedSession.advisorState.lifetimeDebtCleared,
    });
  } catch (error) {
    console.error("❌ Error in /real-portfolio-impact/:sessionId:", error);
    return c.json({ error: "Failed to calculate real portfolio impact" }, 500);
  }
});

// ============================================================================
// ROUTE: Get Portfolio Impact with Real-Time Growth Data
// ============================================================================
app.get("/portfolio-impact/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    const savedSession = await loadSession(sessionId);
    if (!savedSession) {
      return c.json({ error: "Session not found" }, 404);
    }

    const { advisorState } = savedSession;

    // Get growth rate and recent deltas
    const { getGrowthSummary, updateGrowthRate } = await import(
      "../services/portfolio-impact-service.ts"
    );

    // Ensure growth rate is calculated for this session
    updateGrowthRate(sessionId, advisorState);

    // Get growth summary
    const summary = getGrowthSummary(sessionId);

    return c.json({
      sessionId,
      portfolioImpact: {
        savings: Math.round(advisorState.lifetimeSavingsGenerated),
        debtCleared: Math.round(advisorState.lifetimeDebtCleared),
        total: Math.round(
          advisorState.lifetimeSavingsGenerated + advisorState.lifetimeDebtCleared,
        ),
      },
      growth: {
        perMinute: summary.currentRate?.totalPerMinute || 0,
        perHour: summary.projectedHourly,
        perDay: summary.projectedDaily,
        recentGrowth: summary.recentGrowth,
      },
      activeClients: summary.currentRate?.activeClients || 0,
      stats: {
        totalSessions: advisorState.totalSessions,
        totalClientsHelped: advisorState.totalClientsHelped,
        totalCoins: advisorState.advisorCoins,
        careerTier: advisorState.careerTier,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Error in /portfolio-impact/:sessionId:", error);
    return c.json(
      { error: "Failed to get portfolio impact" },
      500,
    );
  }
});

// ============================================================================
// ROUTE: Get Client Financial Details (Full Dashboard Data)
// ============================================================================
app.get("/client-financial-details/:characterId", async (c) => {
  try {
    const characterId = c.req.param("characterId");
    const monthsBack = parseInt(c.req.query("months") || "6");

    console.log(
      `📊 Getting detailed financial data for character: ${characterId}`,
    );

    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );
    const { characterPool } = await import("../index.ts");
    const engine = new SimulationEngine();

    const character = characterPool.getCharacter(characterId);
    if (!character) {
      await engine.close();
      return c.json({ error: "Character not found" }, 404);
    }

    const state = await engine.getCharacterState(characterId);
    if (!state) {
      await engine.close();
      return c.json({ error: "Character state not found" }, 404);
    }

    // Get monthly summaries for trend
    const monthlySummaries = await engine.getMonthlySummaries(
      characterId,
      monthsBack,
    );

    // Get recent transactions
    const recentTransactions = await engine.getRecentTransactions(
      characterId,
      50,
    );

    // Get spending by category for current month
    const db = engine.getDatabase();
    let categorySpending = {};

    if (db && monthlySummaries.length > 0) {
      const currentMonth = monthlySummaries[0];
      categorySpending = await db.getSpendingByCategory(
        characterId,
        currentMonth.month + "-01",
        currentMonth.month + "-31",
      );
    }

    // Calculate income vs expenses trend
    const monthlyTrend = monthlySummaries.reverse().map((month) => ({
      month: month.month,
      income: month.totalIncome,
      expenses: month.totalExpenses,
      netSavings: month.totalIncome - month.totalExpenses,
      balance: month.endBalance,
    }));

    // Get advice-influenced transactions
    const adviceInfluencedTransactions = recentTransactions.filter(
      (txn) => txn.adviceInfluenced,
    );

    // Calculate total impact from advice
    const adviceImpact = adviceInfluencedTransactions.reduce((sum, txn) => {
      // For expenses, positive impact = reduced spending (saved money)
      if (txn.amount < 0) return sum + Math.abs(txn.amount);
      return sum;
    }, 0);

    await engine.close();

    return c.json({
      characterId,
      characterName: character.name,
      currentBalance: state.currentBalance,
      financialProfile: character.financialProfile,
      monthlySummaries,
      monthlyTrend,
      recentTransactions: recentTransactions.slice(0, 30).map((txn) => ({
        id: txn.id,
        date: txn.date,
        type: txn.type,
        category: txn.category,
        amount: txn.amount,
        balanceAfter: txn.balanceAfter,
        description: txn.description,
        merchantName: txn.merchantName,
        adviceInfluenced: txn.adviceInfluenced,
      })),
      categorySpending,
      adviceInfluencedTransactions: adviceInfluencedTransactions.length,
      totalAdviceImpact: Math.round(adviceImpact),
    });
  } catch (error) {
    console.error("❌ Error in /client-financial-details/:characterId:", error);
    return c.json(
      {
        error: "Failed to get client financial details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// ============================================================================
// ROUTE: Get Character Progression Data
// ============================================================================
app.get("/character-progression/:characterId", async (c) => {
  try {
    const characterId = c.req.param("characterId");

    // Import characterPool
    const { characterPool } = await import("../index.ts");

    const character = characterPool.getCharacter(characterId);
    if (!character) {
      return c.json({ error: "Character not found" }, 404);
    }

    return c.json({
      characterId,
      characterName: character.name,
      financialState: character.financialState || null,
      completedScenarios: character.completedScenarios || [],
      adviceHistory: character.adviceHistory || [],
      relationshipState: character.relationshipState || null,
    });
  } catch (error) {
    console.error("❌ Error in /character-progression/:characterId:", error);
    return c.json(
      {
        error: "Failed to get character progression",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// ============================================================================
// ROUTE: Get All Character Progressions for Session
// ============================================================================
app.get("/session/:sessionId/character-progressions", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    // Load session to get advisor state
    const savedSession = await loadSession(sessionId);
    if (!savedSession) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Import characterPool
    const { characterPool } = await import("../index.ts");

    // Get all characters the advisor has helped (from relationships)
    const allRelationships = characterPool.getCharacterRelationships(
      savedSession.advisorState.advisorId,
    );

    const characterProgressions = allRelationships
      .map((rel) => {
        const character = characterPool.getCharacter(rel.characterId);
        if (!character) return null;

        return {
          characterId: rel.characterId,
          characterName: character.name,
          financialState: character.financialState || null,
          relationshipState: rel,
        };
      })
      .filter((c) => c !== null);

    return c.json({
      sessionId,
      characterProgressions,
    });
  } catch (error) {
    console.error(
      "❌ Error in /session/:sessionId/character-progressions:",
      error,
    );
    return c.json(
      {
        error: "Failed to get character progressions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// ============================================================================
// FOLLOW-UP SYSTEM DOCUMENTATION
// ============================================================================
/**
 * SERVER-LED FOLLOW-UP SYSTEM
 *
 * Follow-ups are automatically checked and included in ALL game flow endpoints:
 * - /init - Session initialization
 * - /start-consultation - Starting new consultations
 * - /send-message - Sending messages
 *
 * IDLE DETECTION (optional):
 * If you want follow-ups to appear while the user is idle (not interacting),
 * set up a timer in the frontend to call /init every 30-60 seconds:
 *
 * Example:
 *   setInterval(async () => {
 *     const response = await fetch('/init', {
 *       method: 'POST',
 *       body: JSON.stringify({ sessionId: currentSessionId })
 *     });
 *     const data = await response.json();
 *     if (data.followUps && data.followUps.length > 0) {
 *       // Display follow-up messages to user
 *       displayFollowUps(data.followUps);
 *     }
 *   }, 60000); // Every 60 seconds
 *
 * This approach:
 * - Refreshes the entire session state (useful for detecting changes)
 * - Automatically includes any pending follow-ups
 * - No need for a special-purpose polling endpoint
 */

// Export both the app and its type for RPC
export { app as gameRoutes };
export type GameApiType = typeof app;
