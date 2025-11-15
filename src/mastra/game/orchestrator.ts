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
 * Initialize a new advisor with default state
 */
export function createNewAdvisor(advisorId: string): AdvisorState {
  return {
    advisorId,
    reputation: 70, // Start higher to give more buffer for early mistakes
    skillLevel: 1, // Beginner
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
    // NEW: Gamification fields
    advisorCoins: 0,
    lifetimeSavingsGenerated: 0,
    lifetimeDebtCleared: 0,
    currentGoal: null,
    achievementsUnlocked: [],
    careerTier: 1, // Start as Junior Advisor
  };
}

/**
 * Start a new consultation - Game Master decides which character to send
 */
export async function startNewConsultation(
  advisorId: string,
  currentState?: AdvisorState,
): Promise<GameResponse> {
  // Load or create advisor state
  let advisorState = currentState || createNewAdvisor(advisorId);

  // Apply trust decay for characters not visited recently
  if (advisorState.totalSessions > 0) {
    characterPool.applyTrustDecay(advisorState.totalSessions);
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

    // Fallback: send a new character
    const newCharResult = characterPool.getNewCharacter(advisorState);
    if (!newCharResult) {
      throw new Error("No characters available");
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
    return await triggerGodBossReview(advisorState);
  }

  if (decision.action === "send_character") {
    // Get character and scenario
    let character: Character;
    let scenario: Scenario;

    if (decision.isNewCharacter) {
      // Get new character
      const result = characterPool.getNewCharacter(advisorState);
      if (!result) {
        throw new Error("No new characters available");
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
        const newResult = characterPool.getNewCharacter(advisorState);
        if (!newResult) throw new Error("No characters available");
        character = newResult.character;
        scenario = newResult.scenario;
      } else {
        character = result.character;
        scenario = result.scenario;
      }
    }

    // Mark scenario as used
    characterPool.markScenarioUsed(scenario.scenarioId);

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
    };

    // Add to active clients if not already there
    if (!advisorState.activeClients.includes(character.characterId)) {
      advisorState.activeClients.push(character.characterId);
    }

    // Get character's initial message
    const initialContact = getCharacterInitialMessage(scenario);

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

    // Generate advice choices for the player (only for first session)
    const adviceChoices =
      advisorState.totalSessions === 0
        ? generateAdviceChoices(
            scenario,
            character.personality,
            [], // No conversation history yet (first turn)
          )
        : undefined;

    // Return initial character message with advice choices
    return {
      type: "character_message",
      threadId,
      messages: [initialContact.message],
      voiceNeeded: initialContact.isVoice,
      isNewThread: true,
      characterInfo: {
        name: character.name,
        age: character.age,
        occupation: character.occupation,
      },
      scenarioFinancialContext,
      adviceChoices, // NEW: Provide choices to player (only first session)
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
): Promise<GameResponse> {
  let advisorState = { ...currentState };
  let recommendationMessage: string | undefined;

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
    strengths: [],
    weaknesses: [],
    missedOpportunities: [],
    topicsCovered: [scenario.topic],
    wasActionable: false,
    wasEmpathetic: false,
    wasAccurate: true,
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
      console.log("⚠️ Using default evaluation values");
    }
  }

  // Update thread status
  threadInfo.status = "active";
  threadInfo.lastMessageAt = new Date().toISOString();

  // If conversation is ending, save session
  if (characterResponse.conversationEnding) {
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
        wasEmpathetic: adviceEvaluation.wasEmpathetic,
        wasAccurate: adviceEvaluation.wasAccurate,
        dimensions: adviceEvaluation.dimensions,
        characterProgression: adviceEvaluation.characterProgression,
      },
    };

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
    );

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

    // Update skill and reputation based on comprehensive evaluation
    // Use dimension scores if available for more nuanced updates
    const dimensionScores = adviceEvaluation.dimensions;
    let avgDimensionScore = adviceEvaluation.qualityScore;

    if (dimensionScores) {
      avgDimensionScore =
        (dimensionScores.adviceQuality +
          dimensionScores.communicationEffectiveness +
          dimensionScores.learningObjectives +
          dimensionScores.characterProgression) /
        4;
    }

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

    const skillChange = (avgDimensionScore - 5) * 0.02 * skillChangeMultiplier; // Scaled: -0.1 to +0.15 for beginners

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
    if (adviceEvaluation.wasEmpathetic) {
      const empathyBonus = isBeginner ? 3 : 2; // Extra reward for beginners
      advisorState.reputation = Math.min(
        100,
        advisorState.reputation + empathyBonus,
      );
    }
    if (adviceEvaluation.wasActionable) {
      const actionableBonus = isBeginner ? 0.02 : 0.01; // Double skill gain for beginners
      advisorState.skillLevel = Math.min(
        10,
        advisorState.skillLevel + actionableBonus,
      );
    }
    if (!adviceEvaluation.wasAccurate) {
      const accuracyPenalty = isBeginner ? 2 : 5; // Gentler penalty for beginners
      advisorState.reputation = Math.max(
        0,
        advisorState.reputation - accuracyPenalty,
      );
    }

    advisorState.skillLevel = Math.max(
      0,
      Math.min(10, advisorState.skillLevel + skillChange),
    );
    advisorState.reputation = Math.max(
      0,
      Math.min(100, advisorState.reputation + repChange),
    );

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
    let coinsEarned = 0;
    if (adviceEvaluation.financialProjection) {
      const projection = adviceEvaluation.financialProjection;

      // Base consultation fee
      coinsEarned = 10;

      // Bonus for client financial results (projected)
      // For every 100€ client saves: +5 coins
      const savingsBonus = Math.floor(projection.totalSaved / 100) * 5;
      coinsEarned += savingsBonus;

      // For every 500€ debt reduced: +10 coins
      const debtBonus = Math.floor(projection.totalDebtReduced / 500) * 10;
      coinsEarned += debtBonus;

      // Bonus for high quality advice
      if (adviceEvaluation.qualityScore >= 8) {
        coinsEarned += 5;
      }

      // Bonus for empathy
      if (adviceEvaluation.wasEmpathetic) {
        coinsEarned += 3;
      }

      // Penalty for poor outcomes
      if (adviceEvaluation.outcome === "negative") {
        coinsEarned = Math.max(0, coinsEarned - 20);
      }

      // Apply earnings
      advisorState.advisorCoins += coinsEarned;

      // Track lifetime stats
      advisorState.lifetimeSavingsGenerated += Math.round(
        projection.totalSaved,
      );
      advisorState.lifetimeDebtCleared += Math.round(
        projection.totalDebtReduced,
      );

      // Store in session
      session.financialProjection = projection;
      session.coinsEarned = coinsEarned;

      // Update current goal progress if exists
      if (advisorState.currentGoal) {
        const goal = advisorState.currentGoal;
        if (goal.type === "save_target") {
          goal.progress += Math.round(projection.totalSaved);
        } else if (goal.type === "debt_reduction") {
          goal.progress += Math.round(projection.totalDebtReduced);
        } else if (goal.type === "clients_helped") {
          goal.progress += 1;
        }
        goal.sessionsRemaining -= 1;
      }
    }

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
  } else {
    // Mark thread as awaiting response (character just responded, waiting for advisor)
    threadInfo.status = "awaiting_response";
  }

  // Get all active threads for UI
  const activeThreads = getActiveThreads(advisorState);

  // If conversation is ending, include financial results from the last session
  let financialResults;
  if (
    characterResponse.conversationEnding &&
    advisorState.sessionHistory.length > 0
  ) {
    const lastSession =
      advisorState.sessionHistory[advisorState.sessionHistory.length - 1];
    if (
      lastSession.financialProjection &&
      lastSession.coinsEarned !== undefined
    ) {
      financialResults = {
        projection: lastSession.financialProjection,
        coinsEarned: lastSession.coinsEarned,
      };
    }
  }

  return {
    type: characterResponse.conversationEnding
      ? "conversation_end"
      : "character_message",
    threadId,
    messages: characterResponse.messages,
    voiceNeeded: characterResponse.voiceNeeded,
    stateUpdate: advisorState,
    activeThreads,
    recommendationMessage,
    financialResults,
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
      wasEmpathetic: true,
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

  // NEW: Calculate earnings based on financial projection
  let coinsEarned = 0;
  if (adviceEvaluation.financialProjection) {
    const projection = adviceEvaluation.financialProjection;

    coinsEarned = 10; // Base consultation fee

    // Bonus for client financial results
    const savingsBonus = Math.floor(projection.totalSaved / 100) * 5;
    coinsEarned += savingsBonus;

    const debtBonus = Math.floor(projection.totalDebtReduced / 500) * 10;
    coinsEarned += debtBonus;

    // Quality bonus
    if (adviceEvaluation.qualityScore >= 8) {
      coinsEarned += 5; // High quality bonus
    }

    // Empathy bonus
    if (adviceEvaluation.wasEmpathetic) {
      coinsEarned += 3;
    }

    // Penalty for negative outcomes
    if (adviceEvaluation.outcome === "negative") {
      coinsEarned = Math.max(0, coinsEarned - 20);
    }

    // Update advisor coins and lifetime stats
    advisorState.advisorCoins += coinsEarned;
    advisorState.lifetimeSavingsGenerated += Math.round(projection.totalSaved);
    advisorState.lifetimeDebtCleared += Math.round(projection.totalDebtReduced);
  }

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
      wasEmpathetic: adviceEvaluation.wasEmpathetic,
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

  // Update skill level gradually
  if (adviceEvaluation.qualityScore >= 8) {
    advisorState.skillLevel = Math.min(10, advisorState.skillLevel + 0.1);
  }

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

  // Return immediate financial results
  return {
    type: "conversation_end",
    threadId,
    messages: [characterReaction],
    stateUpdate: advisorState,
    activeThreads,
    financialResults: {
      projection: adviceEvaluation.financialProjection,
      coinsEarned,
    },
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
