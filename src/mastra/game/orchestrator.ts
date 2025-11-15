/**
 * Game Orchestrator - Main game loop for Elämäpeli 2025
 *
 * Handles player input, updates state, and coordinates agents
 */

import type { Mastra } from "@mastra/core/mastra";
import type {
  PlayerState,
  GameMasterDecision,
  GameResponse,
} from "../types/game-types.ts";

/**
 * Initialize a new player with default state
 */
export function createNewPlayer(playerId: string): PlayerState {
  return {
    playerId,
    financialState: {
      savings: 500, // Starting savings
      debt: 0,
      monthlyIncome: 0, // Will increase when they get first job
      creditScore: 100, // Perfect score to start
    },
    personalityProfile: {
      risk_tolerance: 0.5,
      confidence: 0.5,
      peer_influence: 0.5,
      scam_awareness: 0.5,
      planning_ability: 0.5,
    },
    scenarioHistory: [],
    choiceHistory: [],
    agentStates: {
      scammer: {
        player_engaged_before: false,
        rejection_count: 0,
      },
      friend: {
        times_validated_spending: 0,
        debt_level: 0,
        relationship_strength: 0.8,
      },
      parent: {
        knows_about_debt: false,
        trust_level: 0.9,
      },
    },
    currentMonth: 0,
    totalMessages: 0,
    currentScenario: null,
  };
}

/**
 * Analyze player's choice and update personality profile
 */
function analyzePlayerChoice(
  playerMessage: string,
  playerState: PlayerState,
): PlayerState {
  const messageLower = playerMessage.toLowerCase();

  // Simple pattern detection (can be enhanced with ML)
  const patterns = {
    impulsive: /\b(yea|yes|kyl|joo|ostetaan|lets go)\b/i.test(playerMessage),
    cautious: /\b(no|ei|mietin|en tiedä|not sure)\b/i.test(playerMessage),
    scam_aware: /\b(scam|huijaus|epäilyttävä|suspicious)\b/i.test(
      playerMessage,
    ),
  };

  // Update personality based on patterns
  const updatedProfile = { ...playerState.personalityProfile };

  if (patterns.impulsive) {
    updatedProfile.risk_tolerance = Math.min(
      1,
      updatedProfile.risk_tolerance + 0.05,
    );
    updatedProfile.confidence = Math.min(1, updatedProfile.confidence + 0.03);
  }

  if (patterns.cautious) {
    updatedProfile.risk_tolerance = Math.max(
      0,
      updatedProfile.risk_tolerance - 0.05,
    );
    updatedProfile.planning_ability = Math.min(
      1,
      updatedProfile.planning_ability + 0.05,
    );
  }

  if (patterns.scam_aware) {
    updatedProfile.scam_awareness = Math.min(
      1,
      updatedProfile.scam_awareness + 0.1,
    );
  }

  return {
    ...playerState,
    personalityProfile: updatedProfile,
    totalMessages: playerState.totalMessages + 1,
  };
}

/**
 * Main game loop - processes player input and returns response
 */
export async function processPlayerInput(
  playerId: string,
  playerMessage: string,
  mastra: Mastra,
  currentState?: PlayerState,
): Promise<GameResponse> {
  // Load or create player state
  let playerState = currentState || createNewPlayer(playerId);

  // Update state based on player's message
  playerState = analyzePlayerChoice(playerMessage, playerState);

  // Get Game Master agent
  const gmAgent = mastra.getAgent("gameMasterAgent");
  if (!gmAgent) {
    throw new Error("Game Master agent not found");
  }

  // Ask Game Master to decide next scenario
  const gmPrompt = `
PLAYER STATE:
${JSON.stringify(playerState, null, 2)}

PLAYER MESSAGE: "${playerMessage}"

Analyze the player's state and decide:
1. What scenario should happen next?
2. Which agent should handle it?
3. What difficulty level?
4. What context should the agent receive?

Respond with ONLY valid JSON matching this structure:
{
  "scenario_type": "crypto_scam",
  "agent_to_invoke": "scammer",
  "difficulty": 0.6,
  "reasoning": "Player shows overconfidence...",
  "context_for_agent": {
    "player_type": "overconfident_risk_taker",
    "approach": "aggressive_fomo"
  }
}
`;

  const gmResult = await gmAgent.generate(gmPrompt);

  // Parse Game Master's decision
  let decision: GameMasterDecision;
  try {
    // Strip markdown code blocks if present
    let jsonText = gmResult.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    decision = JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to parse GM decision:", gmResult.text);
    // Fallback decision
    decision = {
      scenario_type: "first_paycheck",
      agent_to_invoke: "friend",
      difficulty: 0.5,
      reasoning: "Fallback scenario",
      context_for_agent: {},
    };
  }

  // Invoke the chosen agent via tool
  let agentResponse: any;

  try {
    switch (decision.agent_to_invoke) {
      case "scammer":
        const scammerTool = mastra.getTool("invokeScammerTool");
        if (!scammerTool) throw new Error("Scammer tool not found");
        agentResponse = await scammerTool.execute({
          player_type:
            decision.context_for_agent.player_type || "average_risk_taker",
          difficulty: decision.difficulty,
          approach: decision.context_for_agent.approach || "aggressive_fomo",
          context: {
            player_savings: playerState.financialState.savings,
            player_risk_tolerance:
              playerState.personalityProfile.risk_tolerance,
            player_recent_success: playerState.choiceHistory.length > 0,
          },
        });
        break;

      case "friend":
        const friendTool = mastra.getTool("invokeFriendTool");
        if (!friendTool) throw new Error("Friend tool not found");
        agentResponse = await friendTool.execute({
          scenario_type: decision.scenario_type.includes("peer_pressure")
            ? "peer_pressure_purchase"
            : decision.scenario_type.includes("loan")
              ? "asking_for_loan"
              : "seeking_advice",
          friend_state: {
            debt_level: playerState.agentStates.friend.debt_level,
            relationship_strength:
              playerState.agentStates.friend.relationship_strength,
          },
          player_history: playerState.choiceHistory.map((c) => c.choice),
          times_player_validated_spending:
            playerState.agentStates.friend.times_validated_spending,
        });
        break;

      case "parent":
        const parentTool = mastra.getTool("invokeParentTool");
        if (!parentTool) throw new Error("Parent tool not found");
        agentResponse = await parentTool.execute({
          scenario_type: decision.scenario_type.includes("finds_debt")
            ? "parent_finds_debt"
            : decision.scenario_type.includes("help")
              ? "offering_help"
              : "casual_check_in",
          player_debt: playerState.financialState.debt,
          parent_knows_debt: playerState.agentStates.parent.knows_about_debt,
          trust_level: playerState.agentStates.parent.trust_level,
          player_tried_hiding_it: playerState.financialState.debt > 0,
        });
        break;

      default:
        // Fallback to friend agent for system events
        const defaultTool = mastra.getTool("invokeFriendTool");
        if (!defaultTool) throw new Error("Default tool not found");
        agentResponse = await defaultTool.execute({
          scenario_type: "seeking_advice",
          friend_state: {
            debt_level: 0,
            relationship_strength: 0.8,
          },
          player_history: [],
        });
    }
  } catch (error) {
    console.error("Failed to invoke agent:", error);
    agentResponse = {
      messages: ["Hei! Miten menee? 😊"],
      voice_needed: false,
    };
  }

  // Update scenario history
  playerState.scenarioHistory.push({
    type: decision.scenario_type,
    outcome: "pending", // Will be updated based on player's response
    timestamp: new Date().toISOString(),
  });

  playerState.currentScenario = decision.scenario_type;
  playerState.currentMonth += 1; // Advance time

  return {
    messages: agentResponse?.messages || ["Hei! Miten menee?"],
    voiceNeeded: agentResponse?.voice_needed || false,
    stateUpdate: playerState,
    scenarioType: decision.scenario_type,
  };
}

/**
 * Get player state summary for display
 */
export function getPlayerSummary(playerState: PlayerState) {
  return {
    playerId: playerState.playerId,
    financial: {
      savings: `€${playerState.financialState.savings}`,
      debt: `€${playerState.financialState.debt}`,
      creditScore: playerState.financialState.creditScore,
    },
    gameProgress: {
      month: playerState.currentMonth,
      scenariosCompleted: playerState.scenarioHistory.length,
      messagesExchanged: playerState.totalMessages,
    },
    personality: {
      riskTolerance: `${(playerState.personalityProfile.risk_tolerance * 100).toFixed(0)}%`,
      scamAwareness: `${(playerState.personalityProfile.scam_awareness * 100).toFixed(0)}%`,
      confidence: `${(playerState.personalityProfile.confidence * 100).toFixed(0)}%`,
    },
  };
}
