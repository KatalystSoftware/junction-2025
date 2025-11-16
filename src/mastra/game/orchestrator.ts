/**
 * Game Orchestrator - Financial Advisor Simulator
 *
 * Handles the flow of characters visiting the advisor,
 * manages consultations, and triggers reviews.
 */

import { mastra } from "../index.ts";
import { characterPool } from "./character-pool-manager.ts";
import { getCharacterInitialMessage } from "../agents/character-agent-factory.ts";
import { cachedGenerate } from "../test-cache.ts";
import {
  generateAdviceChoices,
  type AdviceChoice,
} from "./choice-generator.ts";
import {
  checkForNewAchievements,
  checkForMilestones,
  generateMiniFeedback,
  type Achievement,
  type Milestone,
} from "./progress-system.ts";
import {
  calculateCoinsEarned,
  updateGoalProgress,
} from "./earnings-calculator.ts";
import { calculateProjectedOutcome } from "./financial-calculator.ts";
import { checkForIntervention } from "./intervention-checker.ts";
import { generateInterventionMessage } from "../agents/god-boss-agent.ts";
import {
  checkStageTransition,
  transitionToNextStage,
  checkDownwardProgression,
  applyDownwardProgression,
  getTimeAccelerationForStage,
  updateMonthsInStage,
} from "./progression-manager.ts";
import {
  triggerLifeEvent,
  applyLifeEvent,
  getEventDialogueHook,
} from "./life-events.ts";
import type {
  AdvisorState,
  GameMasterDecision,
  GameResponse,
  ConsultationSession,
  FinancialTopic,
  Character,
  Scenario,
  ConversationThread,
  ThreadInfo,
  ConversationMessage,
} from "../types/game-types.ts";

/**
 * Translate advice choices to target language
 */
async function translateAdviceChoices(
  choices: AdviceChoice[],
  targetLanguage: string,
): Promise<AdviceChoice[]> {
  const languageNames: Record<string, string> = {
    fi: "Finnish",
    sv: "Swedish",
  };
  const targetLangName = languageNames[targetLanguage];
  if (!targetLangName) return choices;

  const { getAgentModel } = await import("../agents/agent-model.ts");
  const modelName = getAgentModel();
  const { generateText } = await import("ai");
  const { google } = await import("@ai-sdk/google");

  // Extract just the model name without the provider prefix
  const model = modelName.replace(/^google\//, "");

  const translatedChoices = await Promise.all(
    choices.map(async (choice) => {
      try {
        // Translate actionText
        const actionPrompt = `Translate this financial advisor action text to ${targetLangName}. Keep it concise and professional. Only output the ${targetLangName} translation:\n\n${choice.actionText}`;
        const actionResult = await generateText({
          model: google(model),
          prompt: actionPrompt,
        });

        // Translate projectedOutcome
        const outcomePrompt = `Translate this financial outcome description to ${targetLangName}. Keep it brief and clear. Only output the ${targetLangName} translation:\n\n${choice.projectedOutcome}`;
        const outcomeResult = await generateText({
          model: google(model),
          prompt: outcomePrompt,
        });

        // Translate fullAdviceText if present
        let fullAdviceText = choice.fullAdviceText;
        if (fullAdviceText) {
          const fullPrompt = `Translate this financial advice to ${targetLangName}. Keep the tone professional and empathetic. Only output the ${targetLangName} translation:\n\n${fullAdviceText}`;
          const fullResult = await generateText({
            model: google(model),
            prompt: fullPrompt,
          });
          fullAdviceText = fullResult.text.trim();
        }

        return {
          ...choice,
          actionText: actionResult.text.trim(),
          projectedOutcome: outcomeResult.text.trim(),
          fullAdviceText,
        };
      } catch (error) {
        console.error("Translation failed for advice choice:", error);
        return choice; // Return original on error
      }
    }),
  );

  return translatedChoices;
}

function clampValue(value: number, min: number, max: number, fallback: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function getSafeAverageDimensionScore(
  qualityScore: number,
  dimensions?: {
    adviceQuality?: number;
    communicationEffectiveness?: number;
    learningObjectives?: number;
    characterProgression?: number;
  },
): number {
  if (!dimensions) return qualityScore;

  const values = [
    dimensions.adviceQuality,
    dimensions.communicationEffectiveness,
    dimensions.learningObjectives,
    dimensions.characterProgression,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (values.length === 4) {
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    return Number.isFinite(avg) ? avg : qualityScore;
  }

  return qualityScore;
}

/**
 * Calculate frustration level based on wait time and character personality
 * @param createdAt - When the thread was created
 * @param lastMessageAt - When the last message was sent
 * @param character - Character whose patience we're measuring
 * @param lastFollowUpAt - When the last follow-up was sent (optional)
 * @returns Frustration level from 0 (calm) to 1 (very frustrated)
 */
function calculateFrustrationLevel(
  createdAt: string,
  lastMessageAt: string,
  character: Character,
  lastFollowUpAt?: string,
): number {
  const now = Date.now();
  const lastActivity = new Date(lastMessageAt).getTime();
  const minutesWaiting = (now - lastActivity) / 1000 / 60;

  // Character-specific patience based on personality
  // Impulsive people get frustrated faster, patient people wait longer
  const impulsiveness = character.personality.impulsiveness || 0.5;
  const emotionality = character.personality.emotionality || 0.5;

  // Patience multiplier: 0.5 (very impatient) to 1.5 (very patient)
  // High impulsiveness + high emotionality = low patience
  const patienceMultiplier = 1.5 - (impulsiveness * 0.7 + emotionality * 0.3);

  // Adjust time thresholds based on patience
  // Base thresholds: 2, 5, 10, 15 minutes
  const calmThreshold = 2 * patienceMultiplier;
  const slightlyImpatientThreshold = 5 * patienceMultiplier;
  const frustratedThreshold = 10 * patienceMultiplier;
  const veryFrustratedThreshold = 15 * patienceMultiplier;

  if (minutesWaiting < calmThreshold) return 0.0;
  if (minutesWaiting < slightlyImpatientThreshold) {
    return (minutesWaiting - calmThreshold) / (slightlyImpatientThreshold - calmThreshold) * 0.3;
  }
  if (minutesWaiting < frustratedThreshold) {
    return 0.3 + (minutesWaiting - slightlyImpatientThreshold) / (frustratedThreshold - slightlyImpatientThreshold) * 0.3;
  }
  if (minutesWaiting < veryFrustratedThreshold) {
    return 0.6 + (minutesWaiting - frustratedThreshold) / (veryFrustratedThreshold - frustratedThreshold) * 0.3;
  }
  return Math.min(1.0, 0.9 + (minutesWaiting - veryFrustratedThreshold) / veryFrustratedThreshold * 0.1);
}

/**
 * Determine if a follow-up message should be sent
 * @param frustrationLevel - Current frustration level
 * @param followUpMessagesSent - Number of follow-ups already sent
 * @param lastFollowUpAt - When the last follow-up was sent
 * @returns Whether to send a follow-up
 */
function shouldSendFollowUp(
  frustrationLevel: number,
  followUpMessagesSent: number,
  lastFollowUpAt?: string,
): boolean {
  // Don't send more than 3 follow-ups
  if (followUpMessagesSent >= 3) return false;

  // If no follow-up sent yet, send at frustration 0.3 (around 5 minutes)
  if (followUpMessagesSent === 0 && frustrationLevel >= 0.3) return true;

  // For subsequent follow-ups, check if enough time has passed since last follow-up
  if (lastFollowUpAt) {
    const minutesSinceLastFollowUp =
      (Date.now() - new Date(lastFollowUpAt).getTime()) / 1000 / 60;

    // Send 2nd follow-up after 5 more minutes (frustration ~0.6)
    if (followUpMessagesSent === 1 && minutesSinceLastFollowUp >= 5 && frustrationLevel >= 0.6) {
      return true;
    }

    // Send 3rd follow-up after 5 more minutes (frustration ~0.8)
    if (followUpMessagesSent === 2 && minutesSinceLastFollowUp >= 5 && frustrationLevel >= 0.8) {
      return true;
    }
  }

  return false;
}

/**
 * Map frustration level to emotional state
 */
function getEmotionalStateFromFrustration(frustrationLevel: number): string {
  if (frustrationLevel < 0.2) return "calm";
  if (frustrationLevel < 0.4) return "slightly impatient";
  if (frustrationLevel < 0.6) return "frustrated";
  if (frustrationLevel < 0.8) return "very frustrated";
  return "extremely frustrated and considering leaving";
}

/**
 * Map frustration level to voice urgency
 */
function getVoiceUrgencyFromFrustration(
  frustrationLevel: number,
): "calm" | "concerned" | "urgent" | "excited" {
  if (frustrationLevel < 0.3) return "calm";
  if (frustrationLevel < 0.6) return "concerned";
  return "urgent";
}

/**
 * Initialize a new advisor with default state
 */
export function createNewAdvisor(advisorId: string): AdvisorState {
  return {
    advisorId,
    reputation: 70, // Start higher to give more buffer for early mistakes
    skillLevel: 0, // Beginner (level 1 when displayed as Math.floor(0) + 1)
    specializations: [],
    topicsExpertise: {
      budgeting: 1,
      saving: 1,
      debt_management: 1,
      investing: 1,
      loans: 1,
      insurance: 1,
      retirement: 1,
      emergency_fund: 1,
      credit_score: 1,
      scam_awareness: 1,
    },
    sessionHistory: [],
    totalClientsHelped: 0,
    activeClients: [],
    activeThreads: {},
    godBossRelationship: 5, // Neutral start
    learningMaterials: [],
    totalSessions: 0,
    lastReviewSession: 0,
    hasCompletedOnboarding: false,
    // Performance streak tracking
    currentStreak: 0,
    lastStreakCheckSession: 0,
    // NEW: Gamification fields
    advisorCoins: 0,
    lifetimeSavingsGenerated: 0,
    lifetimeDebtCleared: 0,
    currentGoal: null,
    achievementsUnlocked: [],
    careerTier: 1, // Start as Junior Advisor
    // NEW: Financial Simulation
    currentGameMonth: "2025-01", // Start at January 2025 (game time, not real-time)
    simulatedMonthsPassed: 0,
    // NEW: Lose condition tracking
    isFired: false,
    fireReason: undefined,
    criticalInterventionsForcedThrough: 0,
    // NEW: Financial Impact History (for visualization)
    financialImpactHistory: [],
  };
}

/**
 * Get current game month from advisor state
 * NOTE: This is game time (session-based), NOT real-world calendar time
 */
function getCurrentMonth(advisorState?: AdvisorState): string {
  if (advisorState?.currentGameMonth) {
    return advisorState.currentGameMonth;
  }
  // Fallback for initialization
  return "2025-01";
}

/**
 * Start a new consultation - Game Master decides which character to send
 */
export async function startNewConsultation(
  advisorId: string,
  currentState?: AdvisorState,
  userLanguage: string = "en",
): Promise<GameResponse> {
  // Load or create advisor state
  let advisorState = currentState || createNewAdvisor(advisorId);

  // Check if this is the first time - trigger onboarding
  if (!advisorState.hasCompletedOnboarding) {
    const { invokeBossOnboardingTool } = await import(
      "../tools/invoke-boss-onboarding-tool.ts"
    );

    // Map user language codes to boss tool format
    const languageMap: Record<string, "finnish" | "english" | "swedish"> = {
      fi: "finnish",
      en: "english",
      sv: "swedish",
    };
    const language = languageMap[userLanguage] || "english";

    const onboardingMessage = await invokeBossOnboardingTool.execute({
      language,
    });

    // Mark onboarding as completed so it doesn't show again
    advisorState.hasCompletedOnboarding = true;

    return {
      type: "onboarding",
      onboardingMessage,
      stateUpdate: advisorState,
    };
  }

  // Apply trust decay for characters not visited recently
  if (advisorState.totalSessions > 0) {
    characterPool.applyTrustDecay(advisorState.totalSessions);
  }

  // NOTE: Financial simulation is now run at END of consultation (after advice given)
  // This allows us to advance time by 1 month per completed session

  // Check if we should trigger boss check-in based on performance streak
  const streak = advisorState.currentStreak;
  const shouldCheckin = Math.abs(streak) >= 2 && advisorState.totalSessions > 0;

  if (shouldCheckin) {
    const { invokeBossCheckinTool } = await import(
      "../tools/invoke-boss-checkin-tool.ts"
    );

    const recentSessions = advisorState.sessionHistory.slice(-3);
    const checkinMessage = await invokeBossCheckinTool.execute({
      streak,
      recentSessions,
      advisorReputation: advisorState.reputation,
      advisorSkillLevel: advisorState.skillLevel,
    });

    // Reset streak after check-in to avoid repeated messages
    advisorState.currentStreak = 0;

    return {
      type: "boss_checkin",
      checkinMessage,
      stateUpdate: advisorState,
    };
  }

  // Get Game Master agent
  const gmAgent = mastra.getAgent("gameMasterAgent");
  if (!gmAgent) {
    throw new Error("Game Master agent not found");
  }

  // Check if we should trigger God/Boss review
  const sessionsSinceReview =
    advisorState.totalSessions - advisorState.lastReviewSession;
  const shouldReview = sessionsSinceReview >= 3 && sessionsSinceReview <= 5;

  console.log(`📊 Review timing check:`, {
    totalSessions: advisorState.totalSessions,
    lastReviewSession: advisorState.lastReviewSession,
    sessionsSinceReview,
    shouldReview,
  });

  // Get pool stats
  const poolStats = characterPool.getPoolStats();

  // Get ready follow-ups
  const readyFollowUps = characterPool.getReadyFollowUps(
    advisorState.totalSessions,
  );

  // Build GM prompt
  const gmPrompt = `
ADVISOR STATE:
- Skill Level: ${advisorState.skillLevel}/10
- Reputation: ${advisorState.reputation}/100
- Total Sessions: ${advisorState.totalSessions}
- Sessions Since Last Review: ${sessionsSinceReview}
- Last 5 Topics Covered: ${advisorState.sessionHistory
    .slice(-5)
    .map((s) => s.topicsCovered.join(", "))
    .join("; ")}

REVIEW TIMING:
- Should trigger review now: ${shouldReview ? "YES - It's time for a performance review (3-5 sessions have passed)" : "NO - Too soon for another review"}
- IMPORTANT: You must respect this timing. Only trigger god_boss_review if shouldReview is YES.

AVAILABLE CHARACTERS:
- Total Characters: ${poolStats.totalCharacters}
- Characters Met: ${poolStats.charactersMetCount}
- Pending Follow-ups: ${poolStats.pendingFollowUps}
- Ready Follow-ups: ${readyFollowUps.length}

RECENT PERFORMANCE:
${advisorState.sessionHistory
  .slice(-3)
  .map(
    (session, idx) => `
Session ${idx + 1}:
- Character: ${session.characterName}
- Topics: ${session.topicsCovered.join(", ")}
- Advice Quality: ${session.adviceQualityScore}/10
`,
  )
  .join("\n")}

DECISION NEEDED:
Should you: send a new character, send a returning character (follow-up), or trigger God/Boss review?
Remember: ONLY trigger god_boss_review if "Should trigger review now" is YES above.

Respond with ONLY valid JSON (NO markdown):
`;

  // Call Game Master (cachedGenerate already includes retry logic via runAgentOperation)
  let decision: GameMasterDecision;
  try {
    const gmResult = await cachedGenerate(
      "agent",
      "gameMaster_decision",
      gmPrompt,
      () => gmAgent.generate(gmPrompt),
    );

    // Parse Game Master's decision
    let jsonText = gmResult.text.trim();
    // Strip markdown code blocks
    jsonText = jsonText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    decision = JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to get GM decision:", error);

    // Fallback: send a new character, or least recently used if pool depleted
    let newCharResult = characterPool.getNewCharacter(advisorState);
    if (!newCharResult) {
      console.log(
        "⚠️ All characters on cooldown, using least recently used character...",
      );
      newCharResult = characterPool.getLeastRecentlyUsedCharacter(advisorState);
    }

    if (!newCharResult) {
      throw new Error(
        "No scenarios available for any character (should never happen)",
      );
    }

    decision = {
      action: "send_character",
      reasoning: "Fallback decision after error",
      characterId: newCharResult.character.characterId,
      scenarioId: newCharResult.scenario.scenarioId,
      isNewCharacter: true,
      difficulty: newCharResult.scenario.difficulty,
    };
  }

  // Handle decision
  if (decision.action === "god_boss_review") {
    // Hard enforcement: Only allow review if it's actually time
    if (!shouldReview) {
      console.warn(
        `🚫 Game Master tried to trigger review too early (sessionsSinceReview=${sessionsSinceReview}). Forcing character send instead.`,
      );
      // Override decision to send a character instead
      let newCharResult = characterPool.getNewCharacter(advisorState);
      if (!newCharResult) {
        console.log(
          "⚠️ All characters on cooldown, using least recently used character...",
        );
        newCharResult =
          characterPool.getLeastRecentlyUsedCharacter(advisorState);
      }

      if (!newCharResult) {
        throw new Error(
          "No scenarios available for any character (should never happen)",
        );
      }

      decision = {
        action: "send_character",
        reasoning: "Overridden: Review too soon, sending character instead",
        characterId: newCharResult.character.characterId,
        scenarioId: newCharResult.scenario.scenarioId,
        isNewCharacter: true,
        difficulty: newCharResult.scenario.difficulty,
      };
      // Fall through to character handling below
    } else {
      return await triggerGodBossReview(advisorState);
    }
  }

  if (decision.action === "send_character") {
    // Get character and scenario
    let character: Character;
    let scenario: Scenario;

    if (decision.isNewCharacter) {
      // Get new character
      let result = characterPool.getNewCharacter(advisorState);
      if (!result) {
        console.log(
          "⚠️ All characters on cooldown, using least recently used character...",
        );
        result = characterPool.getLeastRecentlyUsedCharacter(advisorState);
      }

      if (!result) {
        throw new Error(
          "No scenarios available for any character (should never happen)",
        );
      }

      character = result.character;
      scenario = result.scenario;
    } else {
      // Get returning character
      const result = characterPool.getReturningCharacter(
        advisorState.totalSessions,
        advisorState,
      );
      if (!result) {
        // Fallback to new character
        let newResult = characterPool.getNewCharacter(advisorState);
        if (!newResult) {
          console.log(
            "⚠️ All characters on cooldown, using least recently used character...",
          );
          newResult = characterPool.getLeastRecentlyUsedCharacter(advisorState);
        }

        if (!newResult) {
          throw new Error(
            "No scenarios available for any character (should never happen)",
          );
        }

        character = newResult.character;
        scenario = newResult.scenario;
      } else {
        character = result.character;
        scenario = result.scenario;
      }
    }

    // For returning characters, retrieve baseline and calculate actual outcome
    let actualOutcome: any = undefined;
    if (!decision.isNewCharacter) {
      try {
        // Find the most recent session for this character that has a baseline
        const previousSessions = advisorState.sessionHistory.filter(
          (s) =>
            s.characterId === character.characterId &&
            (s as any).financialBaseline,
        );

        if (previousSessions.length > 0) {
          // Get the most recent session with baseline
          const baselineSession = previousSessions[previousSessions.length - 1];
          const baseline = (baselineSession as any).financialBaseline;

          // Load simulation engine and calculate current state
          const { SimulationEngine } = await import(
            "../simulation/simulation-engine.ts"
          );
          const { updateOutcomeWithFollowUp } = await import(
            "./outcome-tracker.ts"
          );

          const engine = new SimulationEngine();
          const updatedOutcome = await updateOutcomeWithFollowUp(
            engine,
            baseline,
          );
          await engine.close();

          actualOutcome = updatedOutcome;
        }
      } catch (error) {
        console.error("Failed to retrieve baseline outcome:", error);
      }
    }

    // Mark scenario as used (with cooldown tracking)
    characterPool.markScenarioUsed(
      scenario.scenarioId,
      advisorState.totalSessions,
    );

    // Create new thread
    const threadId = `thread_${Date.now()}`;
    const now = new Date().toISOString();

    // Add to active threads
    advisorState.activeThreads[threadId] = {
      threadId,
      characterId: character.characterId,
      scenarioId: scenario.scenarioId,
      status: "awaiting_response",
      createdAt: now,
      lastMessageAt: now,
      frustrationLevel: 0, // Start calm
      followUpMessagesSent: 0,
      lastFollowUpAt: undefined,
    };

    // Add to active clients if not already there
    if (!advisorState.activeClients.includes(character.characterId)) {
      advisorState.activeClients.push(character.characterId);
    }

    // Get character's initial message (translated if needed, with potential voice generation)
    const initialContact = await getCharacterInitialMessage(
      scenario,
      userLanguage, // Use user's selected language preference
      character,
      advisorState.totalSessions, // Pass total sessions for scenario number calculation
    );

    // Get all active threads for UI
    const activeThreads = getActiveThreads(advisorState);

    // Extract financial context from scenario
    const details = scenario.problemContext.specificDetails;
    const scenarioFinancialContext = {
      topic: scenario.topic,
      difficulty: scenario.difficulty,
      monthlyIncome: details.monthlyIncome,
      currentSavings: details.currentSavings,
      totalDebt: details.totalDebt,
      rent: details.rent,
      urgency: scenario.problemContext.urgency,
      situation: scenario.problemContext.currentSituation,
    };

    // Generate advice choices for the player to make the game more clickable
    let adviceChoices = generateAdviceChoices(
      scenario,
      character.personality,
      [], // No conversation history yet (first turn)
    );

    console.log(
      `🎯 Generated ${adviceChoices?.length || 0} advice choices for new consultation (thread ${threadId.substring(0, 8)}...)`,
    );

    // Translate advice choices if user language is not English
    if (adviceChoices && userLanguage !== "en") {
      adviceChoices = await translateAdviceChoices(adviceChoices, userLanguage);
    }

    // Return initial character message with advice choices and voice config
    return {
      type: "character_message",
      threadId,
      messages: [initialContact.message],
      voiceNeeded: initialContact.isVoice,
      voiceConfig: initialContact.voiceConfig,
      isNewThread: true,
      characterInfo: {
        name: character.name,
        age: character.age,
        occupation: character.occupation,
        gender: character.gender,
        financialProfile: character.financialProfile,
      },
      scenarioFinancialContext,
      adviceChoices,
      actualOutcome,
      stateUpdate: advisorState,
      activeThreads,
    };
  }

  // No action
  return {
    type: "conversation_end",
    stateUpdate: advisorState,
  };
}

/**
 * Handle advisor's response to character
 */
export async function handleAdvisorResponse(
  threadId: string,
  advisorMessage: string,
  currentState: AdvisorState,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  userLanguage: string = "en",
): Promise<GameResponse> {
  let advisorState = { ...currentState };
  let recommendationMessage: string | undefined;
  let tierChangeNotification:
    | {
        characterName: string;
        oldTier: any;
        newTier: any;
        trustLevel: number;
      }
    | undefined;

  // Get thread info
  const threadInfo = advisorState.activeThreads[threadId];
  if (!threadInfo) {
    throw new Error(`Thread ${threadId} not found`);
  }

  // Get character and scenario
  const character = characterPool.getCharacter(threadInfo.characterId);
  const scenario = characterPool.getScenario(threadInfo.scenarioId);

  if (!character || !scenario) {
    throw new Error("Character or scenario not found");
  }

  // Get character memory (conversation history from previous sessions)
  const characterMemory = character.conversationHistory || [];

  // Calculate current frustration level based on wait time
  const frustrationLevel = calculateFrustrationLevel(
    threadInfo.createdAt,
    threadInfo.lastMessageAt,
    character,
    threadInfo.lastFollowUpAt,
  );

  // Update thread frustration level
  threadInfo.frustrationLevel = frustrationLevel;

  // CHECK FOR INTERVENTION: Boss evaluates advice (but doesn't block character response)
  const interventionCheck = checkForIntervention(
    advisorMessage,
    scenario,
    character,
    advisorState.skillLevel,
  );

  let interventionMessage: any = undefined;

  if (interventionCheck.shouldIntervene) {
    // Boss will send a warning in parallel - but character still responds!
    const language = userLanguage.startsWith("fi") ? "finnish" : "english";

    const enhancedMessage = generateInterventionMessage(
      interventionCheck.reason,
      interventionCheck.correctApproach || "Rethink your approach.",
      interventionCheck.topic || scenario.topic,
      interventionCheck.severity,
      language,
    );

    // Store intervention state so we know we're in an intervention conversation
    advisorState.activeIntervention = {
      threadId, // Which character thread triggered this
      originalMessage: advisorMessage, // The bad advice
      severity: interventionCheck.severity,
      conversationHistory: [
        {
          role: "boss",
          content: `${enhancedMessage.reason}\n\n${enhancedMessage.correctApproach}`,
        },
      ],
    };

    // Prepare intervention message to include in response
    interventionMessage = {
      severity: interventionCheck.severity,
      reason: enhancedMessage.reason,
      correctApproach: enhancedMessage.correctApproach,
      topic: interventionCheck.topic || scenario.topic,
      canRevise: true,
      interventionActive: true,
    };

    // DON'T return here - continue to send message to character!
  }

  // Invoke character agent (tool internally uses cachedGenerate with retry logic)
  const characterTool = mastra.getTool("invokeCharacterTool");
  if (!characterTool) {
    throw new Error("Character tool not found");
  }

  let characterResponse: any;
  try {
    characterResponse = await characterTool.execute({
      character,
      scenario,
      advisorMessage,
      conversationHistory: conversationHistory || [],
      characterMemory,
      userLanguage,
      frustrationLevel,
      followUpMessagesSent: threadInfo.followUpMessagesSent,
    });
  } catch (error) {
    console.error("Character tool failed:", error);

    // Fallback: graceful generic response
    characterResponse = {
      messages: [
        "Thanks for your advice! I'll think about this and get back to you.",
      ],
      emotionalState: "thoughtful",
      conversationEnding: true,
      voiceNeeded: false,
    };
  }

  // Evaluate advice quality using AI-based evaluation (tool internally uses cachedGenerate with retry logic)
  const evaluateTool = mastra.getTool("evaluateAdviceTool");
  let adviceEvaluation: any = {
    qualityScore: 5,
    willFollowAdvice: false,
    outcome: "neutral",
    strengths: ["Attempted to address the client's concern"],
    weaknesses: [
      "Advice quality could not be fully evaluated",
      "Consider being more specific to the client's exact situation",
    ],
    missedOpportunities: ["Evaluation system temporarily unavailable"],
    topicsCovered: [scenario.topic],
    wasActionable: false,
    wasAccurate: true,
    // Include default financial projection so evaluation section always renders
    financialProjection: calculateProjectedOutcome(
      scenario,
      5,
      false,
      0.3,
      undefined, // No actions in default fallback
    ),
  };

  if (evaluateTool) {
    try {
      adviceEvaluation = await evaluateTool.execute({
        advice: advisorMessage,
        scenario,
        characterPersonality: character.personality,
        character, // Pass full character for more context
        conversationHistory, // Pass conversation history for context
      });
    } catch (error) {
      console.error("Evaluation tool failed:", error);
      // Keep default evaluation values as fallback
    }
  }

  // Update thread status
  threadInfo.status = "active";
  threadInfo.lastMessageAt = new Date().toISOString();

  // If conversation is ending, save session
  if (characterResponse.conversationEnding) {
    // Save previous state for milestone detection
    const previousState = { ...currentState };

    // Collect all advisor advice from the conversation
    const allAdvisorAdvice = conversationHistory
      ? conversationHistory
          .filter((msg) => msg.role === "user")
          .map((msg) => msg.content)
      : [];
    allAdvisorAdvice.push(advisorMessage);

    // Collect all character responses
    const allCharacterResponses = conversationHistory
      ? conversationHistory
          .filter((msg) => msg.role === "assistant")
          .map((msg) => msg.content)
      : [];
    allCharacterResponses.push(...characterResponse.messages);

    // Create consultation session record with detailed evaluation
    const session: ConsultationSession = {
      sessionId: `session_${Date.now()}`,
      characterId: character.characterId,
      characterName: character.name,
      scenarioId: scenario.scenarioId,
      timestamp: new Date().toISOString(),
      playerAdvice: allAdvisorAdvice,
      characterReactions: allCharacterResponses,
      adviceQualityScore: adviceEvaluation.qualityScore,
      topicsCovered: adviceEvaluation.topicsCovered || [scenario.topic],
      followUpScheduled: false,
      outcomeRevealed: false,
      duration: (conversationHistory?.length || 0) + 1,
      // Store detailed evaluation for later review
      evaluation: {
        strengths: adviceEvaluation.strengths,
        weaknesses: adviceEvaluation.weaknesses,
        missedOpportunities: adviceEvaluation.missedOpportunities,
        wasActionable: adviceEvaluation.wasActionable,
        wasAccurate: adviceEvaluation.wasAccurate,
        dimensions: adviceEvaluation.dimensions,
        characterProgression: adviceEvaluation.characterProgression,
      },
    };

    // PHASE C & D: Extract advice actions, create effects, and record outcome baseline
    if (character.characterId) {
      try {
        const { extractAdviceActions, createAdviceEffects } = await import(
          "../simulation/advice-action-extractor.ts"
        );
        const { SimulationEngine } = await import(
          "../simulation/simulation-engine.ts"
        );
        const { recordBaseline } = await import("./outcome-tracker.ts");

        const engine = new SimulationEngine();

        // Extract concrete actions from advice text
        const actions = extractAdviceActions(allAdvisorAdvice);

        // Create advice effects based on character's likelihood to follow
        const followProbability = adviceEvaluation.willFollowAdvice ? 0.8 : 0.3;
        const effects = createAdviceEffects(
          character.characterId,
          session.sessionId,
          actions,
          followProbability,
        );

        // Store effects in database
        if (effects.length > 0) {
          const db = engine.getDatabase();
          if (db) {
            for (const effect of effects) {
              await db.insertAdviceEffect(effect);
            }
          }
        }

        // Store extracted actions in session for UI display (Phase C visibility)
        if (actions.length > 0) {
          (session as any).extractedActions = actions;
        }

        // PHASE D: Record baseline financial state for outcome tracking
        const baseline = await recordBaseline(
          engine,
          character,
          session.sessionId,
        );
        if (baseline) {
          // Store baseline in session for later comparison
          (session as any).financialBaseline = baseline;
          console.log(
            `📊 Recorded financial baseline for ${character.name}: €${baseline.baselineExpenses.toFixed(2)}/month expenses`,
          );
        }

        await engine.close();
      } catch (error) {
        console.error("Failed to extract/store advice effects:", error);
      }
    }

    // Add to session history
    advisorState.sessionHistory.push(session);
    advisorState.totalSessions += 1;
    advisorState.totalClientsHelped += 1;

    // Save character memory for future sessions
    characterPool.saveCharacterMemory(character.characterId, {
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      advisorAdvice: allAdvisorAdvice,
      characterResponses: allCharacterResponses,
      outcome: adviceEvaluation.outcome,
    });

    // Update character relationship and check for recommendations
    const relationshipUpdate = characterPool.updateRelationship(
      character.characterId,
      {
        scenarioId: scenario.scenarioId,
        adviceGiven: allAdvisorAdvice,
        followed: adviceEvaluation.willFollowAdvice,
        outcome: adviceEvaluation.outcome,
      },
      advisorState.totalSessions,
    );

    // Check for tier change
    if (relationshipUpdate.tierChanged) {
      tierChangeNotification = {
        characterName: character.name,
        oldTier: relationshipUpdate.oldTier,
        newTier: relationshipUpdate.newTier,
        trustLevel: relationshipUpdate.newTrustLevel,
      };
    }

    // Handle character recommendation
    if (relationshipUpdate.willRecommend) {
      const recommendation = await characterPool.handleRecommendation(
        character.characterId,
      );
      if (recommendation.success && recommendation.newCharacterName) {
        recommendationMessage = `🎉 ${recommendation.recommendingCharacterName} was so happy with your help, they recommended you to their friend ${recommendation.newCharacterName}!`;
      }
    }

    // Store recommendation message in session for display
    if (recommendationMessage) {
      (session as any).recommendationMessage = recommendationMessage;
    }

    // Schedule follow-up if appropriate
    if (
      scenario.followUpScenarios &&
      scenario.followUpScenarios.length > 0 &&
      adviceEvaluation.willFollowAdvice
    ) {
      const followUpDef = scenario.followUpScenarios.find((f) =>
        adviceEvaluation.outcome === "positive"
          ? f.triggeredBy === "good_advice_followed"
          : f.triggeredBy === "bad_advice_or_not_followed",
      );

      if (followUpDef) {
        characterPool.scheduleFollowUp(
          character.characterId,
          followUpDef.scenarioId,
          advisorState.totalSessions,
          followUpDef.delayInSessions,
          followUpDef.triggeredBy,
        );
        session.followUpScheduled = true;
      }
    }

    // =========================================================================
    // PROGRESSION SYSTEM - Update character financial state and check stage transitions
    // =========================================================================

    // Initialize financial state if not present
    if (!character.financialState) {
      const { FinancialStage } = await import("../types/progression-types.ts");
      character.financialState = {
        currentStage: FinancialStage.INSTABILITY,
        netWorth: character.financialProfile.typicalMonthlyIncome * 0.5,
        monthlyIncome: character.financialProfile.typicalMonthlyIncome,
        monthlyExpenses: character.financialProfile.typicalMonthlyIncome * 0.8,
        totalDebt: 0,
        liquidSavings: character.financialProfile.typicalMonthlyIncome * 0.5,
        investmentPortfolio: 0,
        realEstateValue: 0,
        currentOccupation: character.occupation,
        stageEntryDate: new Date().toISOString().split("T")[0],
        monthsInCurrentStage: 0,
        readyForNextStage: false,
        netWorthHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            amount: character.financialProfile.typicalMonthlyIncome * 0.5,
          },
        ],
        incomeHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            amount: character.financialProfile.typicalMonthlyIncome,
          },
        ],
        majorEvents: [],
      };
    }

    // Update completed scenarios tracking
    if (!character.completedScenarios) {
      character.completedScenarios = [];
    }
    character.completedScenarios.push({
      scenarioId: scenario.scenarioId,
      timestamp: session.timestamp,
      outcome: adviceEvaluation.outcome,
      difficulty: scenario.difficulty,
    });

    // Update advice history tracking
    if (!character.adviceHistory) {
      character.adviceHistory = [];
    }
    character.adviceHistory.push({
      timestamp: session.timestamp,
      adviceGiven: allAdvisorAdvice.join(" | "),
      outcome: adviceEvaluation.outcome,
      scenarioId: scenario.scenarioId,
    });

    // Apply time progression (game months pass)
    const monthsPassed = getTimeAccelerationForStage(
      character.financialState.currentStage,
    );
    updateMonthsInStage(character, monthsPassed);

    // Add net worth snapshot
    character.financialState.netWorthHistory.push({
      date: new Date().toISOString().split("T")[0],
      amount: character.financialState.netWorth,
    });

    // Trigger random life event
    const lifeEvent = triggerLifeEvent(character);
    if (lifeEvent) {
      applyLifeEvent(character, lifeEvent);
      console.log(
        `🎲 Life event for ${character.name}: ${lifeEvent.name} - ${getEventDialogueHook(lifeEvent)}`,
      );
    }

    // Check for downward progression (bad advice consequences)
    const downwardCheck = checkDownwardProgression(character);
    if (downwardCheck.shouldRegress && downwardCheck.newStage !== undefined) {
      applyDownwardProgression(
        character,
        downwardCheck.newStage,
        downwardCheck.reason,
      );
      console.log(
        `📉 ${character.name} regressed to stage ${downwardCheck.newStage}: ${downwardCheck.reason}`,
      );
    }

    // Check for upward stage transition
    const transitionCheck = checkStageTransition(character);
    if (transitionCheck.ready) {
      const transition = transitionToNextStage(character);
      if (transition.success && transition.newStage !== undefined) {
        console.log(`📈 ${character.name} ${transition.message}`);
        // Could show this to the user in next interaction
      }
    }

    // =========================================================================
    // END PROGRESSION SYSTEM
    // =========================================================================

    // Update skill and reputation based on comprehensive evaluation
    // Use dimension scores if available for more nuanced updates
    const dimensionScores = adviceEvaluation.dimensions;
    const avgDimensionScore = getSafeAverageDimensionScore(
      adviceEvaluation.qualityScore,
      dimensionScores,
    );

    // BEGINNER-FRIENDLY EVALUATION SCALING
    // Scale penalties and rewards based on skill level to make early game more forgiving
    const isBeginner = advisorState.skillLevel < 3;
    const isIntermediate = advisorState.skillLevel < 6;

    // Skill change: beginners get faster learning (+50% bonus)
    let skillChangeMultiplier = 1.0;
    if (isBeginner) {
      skillChangeMultiplier = 1.5; // 50% faster skill growth for beginners
    } else if (isIntermediate) {
      skillChangeMultiplier = 1.2; // 20% faster for intermediate
    }

    const skillChange = (avgDimensionScore - 5) * 0.1 * skillChangeMultiplier; // Increased from 0.02 to 0.1 for faster progression

    // Reputation change: beginners get reduced penalties
    let repChangeMultiplier = 1.0;
    let penaltyReduction = 0;
    if (isBeginner) {
      penaltyReduction = 0.5; // Reduce penalties by 50% for beginners
      repChangeMultiplier = 1.3; // Increase rewards by 30%
    } else if (isIntermediate) {
      penaltyReduction = 0.3; // Reduce penalties by 30% for intermediate
      repChangeMultiplier = 1.1; // Increase rewards by 10%
    }

    let repChange = Math.round((avgDimensionScore - 5) * 2);
    if (repChange > 0) {
      // Positive: apply multiplier
      repChange = Math.round(repChange * repChangeMultiplier);
    } else {
      // Negative: apply penalty reduction
      repChange = Math.round(repChange * (1 - penaltyReduction));
    }

    // Bonus/penalty for specific evaluation criteria (scaled for beginners)
    if (adviceEvaluation.wasActionable) {
      const actionableBonus = isBeginner ? 0.1 : 0.05; // Increased from 0.02/0.01 for faster progression
      advisorState.skillLevel = clampValue(
        advisorState.skillLevel + actionableBonus,
        0,
        10,
        1,
      );
    }
    if (!adviceEvaluation.wasAccurate) {
      const accuracyPenalty = isBeginner ? 2 : 5; // Gentler penalty for beginners
      advisorState.reputation = clampValue(
        advisorState.reputation - accuracyPenalty,
        0,
        100,
        70,
      );
    }

    advisorState.skillLevel = clampValue(
      advisorState.skillLevel + skillChange,
      0,
      10,
      1,
    );
    advisorState.reputation = clampValue(
      advisorState.reputation + repChange,
      0,
      100,
      70,
    );

    // Update performance streak
    const qualityScore = adviceEvaluation.qualityScore;
    if (qualityScore >= 7) {
      // Good performance
      if (advisorState.currentStreak >= 0) {
        advisorState.currentStreak += 1;
      } else {
        advisorState.currentStreak = 1; // Reset from negative streak
      }
    } else if (qualityScore <= 4) {
      // Poor performance
      if (advisorState.currentStreak <= 0) {
        advisorState.currentStreak -= 1;
      } else {
        advisorState.currentStreak = -1; // Reset from positive streak
      }
    } else {
      // Neutral performance (score 5-6) - reset streak
      advisorState.currentStreak = 0;
    }
    advisorState.lastStreakCheckSession = advisorState.totalSessions;

    // CHECK FOR LOSE CONDITION: Fire advisor if performance is seriously bad
    const shouldFire =
      advisorState.reputation <= 20 || // Reputation critically low
      advisorState.currentStreak <= -3; // 3+ consecutive bad sessions

    if (shouldFire && !advisorState.isFired) {
      advisorState.isFired = true;

      // Determine specific fire reason
      if (advisorState.currentStreak <= -3) {
        advisorState.fireReason =
          "Consistent poor performance - multiple sessions with bad advice";
      } else if (advisorState.reputation <= 20) {
        advisorState.fireReason =
          "Reputation dropped too low - clients have lost trust";
      }

      // Generate firing message from boss
      const { generateFiringMessage } = await import(
        "../agents/god-boss-agent.ts"
      );
      const language = userLanguage.startsWith("fi")
        ? "finnish"
        : userLanguage.startsWith("sv")
          ? "swedish"
          : "english";

      const firingMessage = await generateFiringMessage(
        advisorState.fireReason || "unknown",
        {
          totalSessions: advisorState.totalSessions,
          clientsHelped: advisorState.totalClientsHelped,
          reputation: advisorState.reputation,
          skillLevel: advisorState.skillLevel,
        },
        language,
      );

      // Return game over response immediately
      return {
        type: "game_over",
        firingMessage,
        stateUpdate: advisorState,
      };
    }

    // Update topic expertise for all topics covered in the evaluation
    const topicsToUpdate = adviceEvaluation.topicsCovered || [scenario.topic];
    for (const topic of topicsToUpdate) {
      const topicChange = (adviceEvaluation.qualityScore - 5) * 0.05;
      advisorState.topicsExpertise[topic as FinancialTopic] = Math.max(
        0,
        Math.min(
          10,
          advisorState.topicsExpertise[topic as FinancialTopic] + topicChange,
        ),
      );
    }

    // NEW: Calculate earnings based on financial projection
    // Calculate coins earned and update state with context for impact tracking
    const { coinsEarned, updatedState } = calculateCoinsEarned(
      adviceEvaluation,
      advisorState,
      {
        characterId: character.characterId,
        characterName: character.name,
        scenarioId: scenario.scenarioId,
        topic: scenario.topic,
      },
    );
    advisorState = updatedState;

    // Store in session
    if (adviceEvaluation.financialProjection) {
      const projection = adviceEvaluation.financialProjection;
      session.financialProjection = projection;
      session.coinsEarned = coinsEarned;

      // Update current goal progress if exists
      updateGoalProgress(advisorState, projection);

      // NEW: Update per-character cumulative financial impact
      const { updateCharacterFinancialImpact } = await import(
        "./outcome-tracker.ts"
      );
      updateCharacterFinancialImpact(
        character,
        projection.totalSaved,
        projection.totalDebtReduced,
      );
    }

    // Check for milestones and achievements
    const milestonesAchieved = checkForMilestones(
      previousState,
      advisorState,
      session,
    );
    const newAchievements = checkForNewAchievements(advisorState, session);

    // Add achievements to unlocked list and award coins
    for (const achievement of newAchievements) {
      advisorState.achievementsUnlocked.push(achievement.id);
      advisorState.advisorCoins += achievement.coinReward;
      achievement.unlockedAt = new Date().toISOString();
    }

    // Generate mini-feedback for this session
    const miniFeedback = generateMiniFeedback(session);

    // Store progress data in session for later display
    (session as any).miniFeedback = miniFeedback;
    (session as any).milestonesAchieved = milestonesAchieved;
    (session as any).achievementsUnlocked = newAchievements;

    // Mark thread as resolved
    threadInfo.status = "resolved";

    // Remove from active clients if no other active threads
    const hasOtherActiveThreads = Object.values(
      advisorState.activeThreads,
    ).some(
      (t) =>
        t.characterId === character.characterId &&
        t.threadId !== threadId &&
        t.status !== "resolved",
    );
    if (!hasOtherActiveThreads) {
      advisorState.activeClients = advisorState.activeClients.filter(
        (id) => id !== character.characterId,
      );
    }

    // ADVANCE GAME TIME: Consultation complete, simulate 1 month passing
    await runMonthlySimulation(advisorState);
  } else {
    // Mark thread as awaiting response (character just responded, waiting for advisor)
    threadInfo.status = "awaiting_response";
  }

  // Get all active threads for UI
  const activeThreads = getActiveThreads(advisorState);

  // Generate fresh advice choices for next advisor response (if conversation is not ending)
  let adviceChoices;
  if (!characterResponse.conversationEnding) {
    // Build updated conversation history including the current exchange
    const updatedHistory = conversationHistory || [];
    updatedHistory.push({ role: "user", content: advisorMessage });
    updatedHistory.push({
      role: "assistant",
      content: characterResponse.messages.join(" "),
    });

    // Generate new advice choices based on conversation so far
    adviceChoices = generateAdviceChoices(
      scenario,
      character.personality,
      updatedHistory,
    );

    console.log(
      `🎯 Generated ${adviceChoices?.length || 0} advice choices for advisor response (thread ${threadId.substring(0, 8)}...)`,
    );

    // Translate advice choices if user language is not English
    if (adviceChoices && userLanguage !== "en") {
      adviceChoices = await translateAdviceChoices(adviceChoices, userLanguage);
    }
  }

  // If conversation is ending, include financial results and progress data from the last session
  let financialResults;
  let financialImpactUpdate;
  let miniFeedback;
  let milestonesAchieved;
  let achievementsUnlocked;

  if (
    characterResponse.conversationEnding &&
    advisorState.sessionHistory.length > 0
  ) {
    const lastSession =
      advisorState.sessionHistory[advisorState.sessionHistory.length - 1];
    // Create financialResults if we have EITHER financial projection OR evaluation data
    if (lastSession.financialProjection || lastSession.evaluation) {
      financialResults = {
        projection: lastSession.financialProjection,
        coinsEarned: lastSession.coinsEarned ?? 0, // Safe fallback if coins weren't calculated
        evaluation: lastSession.evaluation
          ? {
              qualityScore: lastSession.adviceQualityScore, // Quality score is stored at session level
              strengths: lastSession.evaluation.strengths,
              weaknesses: lastSession.evaluation.weaknesses,
              missedOpportunities: lastSession.evaluation.missedOpportunities,
              wasActionable: lastSession.evaluation.wasActionable,
              wasAccurate: lastSession.evaluation.wasAccurate,
            }
          : undefined,
        // NEW: Include extracted actions for UI display (Phase C)
        extractedActions: (lastSession as any).extractedActions,
      };

      // NEW: Create financial impact update for real-time visualization
      if (lastSession.financialProjection) {
        const projection = lastSession.financialProjection;
        financialImpactUpdate = {
          savingsIncrement: Math.round(projection.totalSaved),
          debtReductionIncrement: Math.round(projection.totalDebtReduced),
          characterId: character.characterId,
          characterName: character.name,
          isActual: false, // This is a projection (actual comes from follow-ups)
          newLifetimeTotals: {
            savings: advisorState.lifetimeSavingsGenerated,
            debtCleared: advisorState.lifetimeDebtCleared,
          },
          categorySavings: projection.categorySavings,
        };
      }
    }

    // Get progress data from session
    miniFeedback = (lastSession as any).miniFeedback;
    milestonesAchieved = (lastSession as any).milestonesAchieved;
    achievementsUnlocked = (lastSession as any).achievementsUnlocked;
  }

  const response: any = {
    type: characterResponse.conversationEnding
      ? "conversation_end"
      : "character_message",
    threadId,
    messages: characterResponse.messages,
    voiceNeeded: characterResponse.voiceNeeded,
    voiceConfig: characterResponse.voiceConfig,
    stateUpdate: advisorState,
    activeThreads,
    recommendationMessage,
    tierChangeNotification,
    financialResults,
    financialImpactUpdate, // NEW: Include financial impact delta for visualization
    miniFeedback,
    milestonesAchieved,
    achievementsUnlocked,
    adviceChoices, // Add fresh advice choices for every character response
    advisorAdvice: characterResponse.conversationEnding
      ? advisorState.sessionHistory[advisorState.sessionHistory.length - 1]
          ?.playerAdvice
      : undefined,
  };

  // Include intervention message if one was triggered (parallel to character response)
  if (interventionMessage) {
    response.interventionMessage = interventionMessage;
  }

  return response;
}

/**
 * Handle advisor's response to boss during an intervention
 * This is called when user sends a message to "boss-pinned" thread while activeIntervention exists
 */
export async function handleInterventionResponse(
  advisorMessage: string,
  currentState: AdvisorState,
): Promise<GameResponse> {
  const advisorState = { ...currentState };

  if (!advisorState.activeIntervention) {
    throw new Error("No active intervention found");
  }

  const { threadId, originalMessage, severity, conversationHistory } =
    advisorState.activeIntervention;

  // Add advisor's response to conversation history
  conversationHistory.push({
    role: "advisor",
    content: advisorMessage,
  });

  // Get character context for intervention
  const threadInfo = advisorState.activeThreads[threadId];
  if (!threadInfo) {
    throw new Error(`Thread ${threadId} not found`);
  }

  const character = characterPool.getCharacter(threadInfo.characterId);
  const scenario = characterPool.getScenario(threadInfo.scenarioId);

  if (!character || !scenario) {
    throw new Error("Character or scenario not found");
  }

  // Invoke boss intervention agent
  const bossAgent = mastra.getAgent("bossInterventionAgent");
  if (!bossAgent) {
    throw new Error("Boss intervention agent not found");
  }

  const interventionContext = {
    originalAdvice: originalMessage,
    characterName: character.name,
    scenario: {
      topic: scenario.topic,
      situation: scenario.problemContext.currentSituation,
    },
    conversationHistory: conversationHistory.map((msg) => ({
      role: msg.role,
      message: msg.content,
    })),
  };

  const interventionPrompt = `The advisor has responded to your intervention.

**Intervention Context:**
- Original bad advice: "${originalMessage}"
- Character: ${character.name} (${character.age}, ${character.occupation})
- Situation: ${scenario.problemContext.currentSituation}
- Topic: ${scenario.topic}
- Severity: ${severity}

**Conversation so far:**
${conversationHistory.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}

**Advisor's latest message:**
"${advisorMessage}"

Respond to the advisor. Decide if the intervention should end (they've revised well, you've approved their reasoning, or they're forcing it anyway) or continue the discussion.`;

  const bossResponseRaw = await cachedGenerate(
    "agent",
    "bossIntervention_response",
    interventionPrompt,
    () => bossAgent.generate(interventionPrompt),
  );

  // Parse boss response
  let bossResponse;
  try {
    bossResponse = JSON.parse(bossResponseRaw.text);
  } catch (error) {
    console.error("Failed to parse boss response:", error);
    // Fallback response
    bossResponse = {
      message:
        "Look, just think about what the client actually needs here and try again.",
      shouldEndIntervention: false,
      decision: "continue_discussion",
    };
  }

  // Add boss response to conversation history
  conversationHistory.push({
    role: "boss",
    content: bossResponse.message,
  });

  // Check if intervention should end
  if (bossResponse.shouldEndIntervention) {
    // Resolve intervention based on decision
    const reputationChange = bossResponse.reputationChange || 0;
    advisorState.reputation = clampValue(
      advisorState.reputation + reputationChange,
      0,
      100,
      50,
    );

    let resolvedMessage = originalMessage;

    if (bossResponse.decision === "approved_revision") {
      // User provided a revised message that boss approved
      resolvedMessage = bossResponse.revisedMessage || advisorMessage;
    } else if (bossResponse.decision === "approved_original") {
      // Boss was convinced original was OK
      resolvedMessage = originalMessage;
    } else if (bossResponse.decision === "forced_send") {
      // User insisted, send original with penalty
      resolvedMessage = originalMessage;
    }

    // Clear intervention state
    delete advisorState.activeIntervention;

    // Now send the resolved message to the character
    return handleAdvisorResponse(threadId, resolvedMessage, advisorState);
  }

  // Intervention continues
  advisorState.activeIntervention.conversationHistory = conversationHistory;

  return {
    type: "boss_intervention_message",
    threadId: "boss-pinned", // Boss messages go to boss thread
    messages: [bossResponse.message],
    interventionMessage: {
      severity,
      reason: bossResponse.message,
      correctApproach: "",
      topic: scenario.topic,
      canRevise: true,
      interventionActive: true,
    },
    stateUpdate: advisorState,
  };
}

/**
 * Handle choice-based advice (fast gameplay, no back-and-forth)
 * Character accepts advice and we immediately show financial outcome
 */
export async function handleAdviceChoice(
  threadId: string,
  choiceIndex: number,
  currentState: AdvisorState,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<GameResponse> {
  let advisorState = { ...currentState };

  // Get thread info
  const threadInfo = advisorState.activeThreads[threadId];
  if (!threadInfo) {
    throw new Error(`Thread ${threadId} not found`);
  }

  // Get character and scenario
  const character = characterPool.getCharacter(threadInfo.characterId);
  const scenario = characterPool.getScenario(threadInfo.scenarioId);

  if (!character || !scenario) {
    throw new Error("Character or scenario not found");
  }

  // Generate choices to find the selected one
  const choices = generateAdviceChoices(
    scenario,
    character.personality,
    conversationHistory || [],
  );

  const selectedChoice = choices[choiceIndex];
  if (!selectedChoice) {
    throw new Error(`Choice at index ${choiceIndex} not found`);
  }

  const adviceText = selectedChoice.fullAdviceText;

  // Evaluate the advice using the evaluate tool (tool internally uses cachedGenerate with retry logic)
  const evaluateTool = mastra.getTool("evaluateAdviceTool");
  if (!evaluateTool) {
    throw new Error("Evaluate tool not found");
  }

  let adviceEvaluation: any;
  try {
    adviceEvaluation = await evaluateTool.execute({
      advice: adviceText,
      scenario,
      characterPersonality: character.personality,
      character,
      conversationHistory: conversationHistory || [],
    });
  } catch (error) {
    console.error("Evaluation tool failed:", error);

    // Fallback: use neutral evaluation
    adviceEvaluation = {
      qualityScore: 5,
      willFollowAdvice: true, // Assume positive in fallback
      outcome: "neutral",
      strengths: ["Provided guidance"],
      weaknesses: [],
      missedOpportunities: [],
      topicsCovered: [scenario.topic],
      wasActionable: true,
      wasAccurate: true,
      financialProjection: {
        totalSaved: 0,
        totalDebtReduced: 0,
        estimatedMonthlyImpact: 0,
      },
    };
  }

  // Character accepts the advice (almost always)
  const characterAccepts = Math.random() > 0.1; // 90% acceptance rate

  let characterReaction: string;
  if (characterAccepts) {
    // Generate positive acceptance response
    characterReaction = generateAcceptanceResponse(
      character,
      adviceText,
      scenario.topic,
    );
  } else {
    // Rare case: character is hesitant
    characterReaction = generateHesitantResponse(character, adviceText);
  }

  // Create consultation session
  const sessionId = `session_${Date.now()}`;
  const now = new Date().toISOString();

  // Calculate earnings based on financial projection
  const { coinsEarned, updatedState } = calculateCoinsEarned(
    adviceEvaluation,
    advisorState,
  );
  advisorState = updatedState;

  const session: ConsultationSession = {
    sessionId,
    characterId: character.characterId,
    characterName: character.name,
    scenarioId: scenario.scenarioId,
    timestamp: now,
    playerAdvice: [adviceText],
    characterReactions: [characterReaction],
    adviceQualityScore: adviceEvaluation.qualityScore,
    topicsCovered: adviceEvaluation.topicsCovered,
    followUpScheduled: false,
    outcomeRevealed: false,
    duration: 1, // Single exchange
    evaluation: {
      strengths: adviceEvaluation.strengths,
      weaknesses: adviceEvaluation.weaknesses,
      missedOpportunities: adviceEvaluation.missedOpportunities,
      wasActionable: adviceEvaluation.wasActionable,
      wasAccurate: adviceEvaluation.wasAccurate,
      dimensions: adviceEvaluation.dimensions,
      characterProgression: adviceEvaluation.characterProgression,
    },
    financialProjection: adviceEvaluation.financialProjection,
    coinsEarned,
  };

  // Add session to history
  advisorState.sessionHistory.push(session);
  advisorState.totalSessions += 1;

  // Update topic expertise
  const topicExpertiseIncrease = Math.min(
    0.2,
    adviceEvaluation.qualityScore / 50,
  );
  advisorState.topicsExpertise[scenario.topic] = Math.min(
    10,
    advisorState.topicsExpertise[scenario.topic] + topicExpertiseIncrease,
  );

  // Update reputation based on quality
  const reputationChange = Math.round((adviceEvaluation.qualityScore - 5) * 2);
  advisorState.reputation = Math.max(
    0,
    Math.min(100, advisorState.reputation + reputationChange),
  );

  // Update skill level gradually - IMPROVED PACING
  // Base gain for any session
  let skillGain = 0.2; // Base gain increased from 0.1

  // Bonus for excellent advice
  if (adviceEvaluation.qualityScore >= 9) {
    skillGain = 0.5; // Excellent sessions give bigger boost
  } else if (adviceEvaluation.qualityScore >= 8) {
    skillGain = 0.3; // Good sessions still rewarding
  }

  advisorState.skillLevel = Math.min(10, advisorState.skillLevel + skillGain);

  // Mark character as helped
  if (!advisorState.totalClientsHelped) {
    advisorState.totalClientsHelped = 0;
  }
  advisorState.totalClientsHelped += 1;

  // Close the thread (consultation is done)
  threadInfo.status = "resolved";
  advisorState.activeClients = advisorState.activeClients.filter(
    (id) => id !== character.characterId,
  );

  // Get active threads for UI
  const activeThreads = getActiveThreads(advisorState);

  // Return immediate financial results with evaluation
  return {
    type: "conversation_end",
    threadId,
    messages: [characterReaction],
    stateUpdate: advisorState,
    activeThreads,
    financialResults: {
      projection: adviceEvaluation.financialProjection,
      coinsEarned,
      evaluation: {
        qualityScore: adviceEvaluation.qualityScore,
        strengths: adviceEvaluation.strengths,
        weaknesses: adviceEvaluation.weaknesses,
        missedOpportunities: adviceEvaluation.missedOpportunities,
        wasActionable: adviceEvaluation.wasActionable,
        wasAccurate: adviceEvaluation.wasAccurate,
      },
    },
    advisorAdvice: session.playerAdvice,
  };
}

/**
 * Generate acceptance response from character
 */
function generateAcceptanceResponse(
  character: Character,
  advice: string,
  topic: FinancialTopic,
): string {
  const responses = [
    `Kiitos! Tämä kuulostaa hyvältä suunnitelmalta. Aloitan heti!`,
    `Joo, ymmärrän. Kokeilen tätä!`,
    `Okei, kuulostaa järkevältä. Kiitos avusta!`,
    `Selvä! Tämä auttaa varmasti.`,
    `Hyvä idea! En olisi itse tullut ajatelleeksi.`,
  ];

  // Select random response
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Generate hesitant response (rare)
 */
function generateHesitantResponse(
  character: Character,
  advice: string,
): string {
  const responses = [
    `Hmm, en ole ihan varma... Mutta ehkä kokeilen.`,
    `Kuulostaa vähän haastavalta, mutta yritän.`,
    `Okei... Täytyy miettiä vielä.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Trigger God/Boss performance review
 */
async function triggerGodBossReview(
  advisorState: AdvisorState,
): Promise<GameResponse> {
  // Get sessions to review (last 3-5)
  const sessionsToReview = advisorState.sessionHistory.slice(-5);

  if (sessionsToReview.length === 0) {
    // Not enough sessions yet
    return {
      type: "conversation_end",
      stateUpdate: advisorState,
    };
  }

  // Invoke God/Boss tool (tool internally uses cachedGenerate with retry logic)
  const godBossTool = mastra.getTool("invokeGodBossTool");
  if (!godBossTool) {
    throw new Error("God/Boss tool not found");
  }

  let review: any;
  try {
    review = await godBossTool.execute({
      sessionsToReview,
      advisorReputation: advisorState.reputation,
      advisorSkillLevel: advisorState.skillLevel,
    });
  } catch (error) {
    console.error("God/Boss review failed:", error);

    // Fallback: use generic positive review
    review = {
      overallScore: 6,
      strengthsIdentified: ["You're making progress"],
      areasForImprovement: ["Keep practicing and learning"],
      learningMaterials: [],
      encouragingMessage:
        "An error occurred during review, but keep up the good work! 💪",
      reputationChange: 0,
      skillLevelChange: 0,
      topicsExpertiseUpdates: {},
    };
  }

  // Update advisor state based on review
  advisorState.reputation = Math.max(
    0,
    Math.min(100, advisorState.reputation + review.reputationChange),
  );
  advisorState.skillLevel = Math.max(
    0,
    Math.min(10, advisorState.skillLevel + review.skillLevelChange),
  );
  advisorState.godBossRelationship = Math.max(
    0,
    Math.min(10, advisorState.godBossRelationship + review.skillLevelChange),
  );

  // Update topic expertise
  for (const [topic, change] of Object.entries(review.topicsExpertiseUpdates)) {
    const topicKey = topic as FinancialTopic;
    const changeValue = typeof change === "number" ? change : 0;
    advisorState.topicsExpertise[topicKey] = Math.max(
      0,
      Math.min(10, advisorState.topicsExpertise[topicKey] + changeValue),
    );
  }

  // Add learning materials
  if (review.learningMaterials && review.learningMaterials.length > 0) {
    review.learningMaterials.forEach((material: any) => {
      advisorState.learningMaterials.push({
        materialId: material.materialId,
        title: material.title,
        topic: material.topic as FinancialTopic,
        completedAt: new Date().toISOString(),
      });
    });
  }

  // Update last review session
  advisorState.lastReviewSession = advisorState.totalSessions;

  return {
    type: "god_boss_review",
    review,
    stateUpdate: advisorState,
  };
}

/**
 * Get advisor state summary for display
 */
export function getAdvisorSummary(advisorState: AdvisorState) {
  return {
    advisorId: advisorState.advisorId,
    performance: {
      reputation: `${advisorState.reputation}/100`,
      skillLevel: `${advisorState.skillLevel.toFixed(1)}/10`,
      godBossRelationship: `${advisorState.godBossRelationship}/10`,
    },
    progress: {
      totalSessions: advisorState.totalSessions,
      totalClientsHelped: advisorState.totalClientsHelped,
      learningMaterialsCompleted: advisorState.learningMaterials.length,
    },
    expertise: {
      budgeting: `${advisorState.topicsExpertise.budgeting.toFixed(1)}/10`,
      debtManagement: `${advisorState.topicsExpertise.debt_management.toFixed(1)}/10`,
      investing: `${advisorState.topicsExpertise.investing.toFixed(1)}/10`,
    },
    specializations: advisorState.specializations,
  };
}

/**
 * Get all active conversation threads with character info
 */
export function getActiveThreads(
  advisorState: AdvisorState,
): ConversationThread[] {
  const threads: ConversationThread[] = [];

  for (const [threadId, threadInfo] of Object.entries(
    advisorState.activeThreads,
  )) {
    // Skip resolved threads
    if (threadInfo.status === "resolved") {
      continue;
    }

    const character = characterPool.getCharacter(threadInfo.characterId);
    if (!character) {
      continue;
    }

    threads.push({
      threadId,
      characterId: threadInfo.characterId,
      characterName: character.name,
      scenarioId: threadInfo.scenarioId,
      messages: [], // Messages would be stored separately in full implementation
      status: threadInfo.status,
      unreadCount: threadInfo.status === "awaiting_response" ? 1 : 0,
      createdAt: threadInfo.createdAt,
      lastMessageAt: threadInfo.lastMessageAt,
      characterInfo: {
        name: character.name,
        age: character.age,
        occupation: character.occupation,
        gender: character.gender,
        financialProfile: character.financialProfile,
      },
    });
  }

  // Sort by last message time (most recent first)
  threads.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  return threads;
}

/**
 * Switch to a specific thread and get its details
 */
export function switchThread(
  threadId: string,
  advisorState: AdvisorState,
): ConversationThread | null {
  const threadInfo = advisorState.activeThreads[threadId];
  if (!threadInfo || threadInfo.status === "resolved") {
    return null;
  }

  const character = characterPool.getCharacter(threadInfo.characterId);
  const scenario = characterPool.getScenario(threadInfo.scenarioId);

  if (!character || !scenario) {
    return null;
  }

  return {
    threadId,
    characterId: threadInfo.characterId,
    characterName: character.name,
    scenarioId: threadInfo.scenarioId,
    messages: [], // Would retrieve from storage in full implementation
    status: threadInfo.status,
    unreadCount: 0, // Reset unread count when switching
    createdAt: threadInfo.createdAt,
    lastMessageAt: threadInfo.lastMessageAt,
    characterInfo: {
      name: character.name,
      age: character.age,
      occupation: character.occupation,
      gender: character.gender,
      financialProfile: character.financialProfile,
    },
  };
}

/**
 * Get thread by ID
 */
export function getThread(
  threadId: string,
  advisorState: AdvisorState,
): ConversationThread | null {
  return switchThread(threadId, advisorState);
}

// ============================================================================
// FINANCIAL SIMULATION INTEGRATION
// ============================================================================

/**
 * Run monthly financial simulation for all characters
 * Called at END of each consultation to advance game time by 1 month
 */
async function runMonthlySimulation(advisorState: AdvisorState): Promise<void> {
  // Advance game time by 1 month per consultation (session-based progression)
  const monthsToAdvance = 1;
  const currentMonth = getCurrentMonth(advisorState);

  try {
    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );

    const engine = new SimulationEngine();

    // Get all characters
    const allCharacters = characterPool.getAllCharacters();

    // Simulate the next month for all characters
    const nextMonth = addMonthsToDate(currentMonth, 1);

    for (const character of allCharacters) {
      try {
        // Initialize character if not already in simulation
        const state = await engine.getCharacterState(character.characterId);
        if (!state) {
          await engine.initializeCharacter(character);
        }

        // Simulate this month
        await engine.simulateMonth(character, nextMonth, true);
      } catch (error) {
        console.error(
          `Error simulating ${nextMonth} for ${character.name}:`,
          error,
        );
      }
    }

    // Update advisor state - advance to next month
    advisorState.currentGameMonth = nextMonth;
    advisorState.simulatedMonthsPassed += monthsToAdvance;

    console.log(
      `⏰ Game time advanced: ${currentMonth} → ${nextMonth} (${advisorState.simulatedMonthsPassed} months total)`,
    );

    await engine.close();
  } catch (error) {
    console.error("Error running monthly simulation:", error);
  }
}

/**
 * Check all active threads for frustration and send follow-up messages if needed
 * This should be called periodically (e.g., every minute) from the frontend
 */
export async function checkAndSendFollowUps(
  advisorState: AdvisorState,
): Promise<{
  followUpsSent: Array<{
    threadId: string;
    characterName: string;
    messages: string[];
    frustrationLevel: number;
  }>;
  stateUpdate: AdvisorState;
}> {
  const followUpsSent: Array<{
    threadId: string;
    characterName: string;
    messages: string[];
    frustrationLevel: number;
  }> = [];

  // Check each active thread
  for (const [threadId, threadInfo] of Object.entries(
    advisorState.activeThreads,
  )) {
    // Skip resolved threads
    if (threadInfo.status === "resolved") continue;

    // Get character
    const character = characterPool.getCharacter(threadInfo.characterId);
    if (!character) continue;

    // Calculate current frustration
    const frustrationLevel = calculateFrustrationLevel(
      threadInfo.createdAt,
      threadInfo.lastMessageAt,
      character,
      threadInfo.lastFollowUpAt,
    );

    // Update frustration level
    threadInfo.frustrationLevel = frustrationLevel;

    // Check if we should send a follow-up
    if (
      shouldSendFollowUp(
        frustrationLevel,
        threadInfo.followUpMessagesSent,
        threadInfo.lastFollowUpAt,
      )
    ) {

      // Generate follow-up message based on frustration level
      const followUpMessages = generateFollowUpMessage(
        character,
        frustrationLevel,
        threadInfo.followUpMessagesSent,
      );

      // Update thread
      threadInfo.followUpMessagesSent++;
      threadInfo.lastFollowUpAt = new Date().toISOString();
      threadInfo.lastMessageAt = new Date().toISOString();

      followUpsSent.push({
        threadId,
        characterName: character.name,
        messages: followUpMessages,
        frustrationLevel,
      });
    }
  }

  return {
    followUpsSent,
    stateUpdate: advisorState,
  };
}

/**
 * Generate follow-up message based on character frustration level
 */
function generateFollowUpMessage(
  character: Character,
  frustrationLevel: number,
  followUpCount: number,
): string[] {
  const name = character.name;

  // First follow-up (around 5 minutes, frustration ~0.3-0.5)
  if (followUpCount === 0) {
    return [
      `Hei, oletko siellä? Tarvitsisin kyllä apua tässä... 🤔`,
      `Hei...? Voisitko vastata? Olen vähän huolissani tästä tilanteesta.`,
    ];
  }

  // Second follow-up (around 10 minutes, frustration ~0.6-0.7)
  if (followUpCount === 1) {
    return [
      `Okei, nyt alkaa oikeasti tuntua siltä että et ota tätä tosissaan... 😕`,
      `Hei nyt oikeasti. Minulla on oikea ongelma tässä ja odotan apua. Missä olet?`,
    ];
  }

  // Third and final follow-up (around 15 minutes, frustration ~0.8-0.9)
  return [
    `Tiedätkö mitä, ehkä menen etsimään apua muualta. Et selvästikään ole kiinnostunut auttamaan. 😤`,
    `Tämä on jo naurettavaa. Odotan vastausta HETI tai lähden etsimään toista neuvonantajaa.`,
  ];
}

/**
 * Calculate number of months between two YYYY-MM dates
 */
function calculateMonthsElapsed(startMonth: string, endMonth: string): number {
  const [startYear, startMo] = startMonth.split("-").map(Number);
  const [endYear, endMo] = endMonth.split("-").map(Number);

  return (endYear - startYear) * 12 + (endMo - startMo);
}

/**
 * Add months to YYYY-MM date string
 */
function addMonthsToDate(monthString: string, months: number): string {
  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + months);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}
