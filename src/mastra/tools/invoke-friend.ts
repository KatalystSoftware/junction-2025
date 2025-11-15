import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { friendAgent } from "../agents/friend-agent.ts";

/**
 * Tool for Game Master to invoke the Friend Agent
 */
export const invokeFriendTool = createTool({
  id: "invoke-friend-agent",
  description:
    "Calls the friend agent (Miska) for peer pressure, loan requests, or advice-seeking scenarios",

  inputSchema: z.object({
    scenario_type: z
      .enum([
        "peer_pressure_purchase",
        "asking_for_loan",
        "confession_of_debt",
        "seeking_advice",
      ])
      .describe("Type of friend interaction"),
    friend_state: z.object({
      debt_level: z.number().describe("Friend's current debt in euros"),
      relationship_strength: z
        .number()
        .min(0)
        .max(1)
        .describe("How close the friendship is"),
    }),
    player_history: z
      .array(z.string())
      .describe("Array of player's recent choices/patterns"),
    times_player_validated_spending: z
      .number()
      .optional()
      .describe("How many times player encouraged friend's spending"),
  }),

  outputSchema: z.object({
    messages: z.array(z.string()).describe("Array of friend messages"),
    relationship_impact: z
      .number()
      .optional()
      .describe("How this interaction affects relationship (-0.2 to +0.2)"),
  }),

  execute: async ({
    scenario_type,
    friend_state,
    player_history,
    times_player_validated_spending,
  }) => {
    // Calculate memory impact
    const timesValidated = times_player_validated_spending || 0;
    const enabledBadHabits = timesValidated >= 3;

    const prompt = `
Generate friend (Miska) messages for this scenario:

SCENARIO: ${scenario_type}
FRIEND'S DEBT: €${friend_state.debt_level}
RELATIONSHIP STRENGTH: ${friend_state.relationship_strength}
PLAYER'S RECENT CHOICES: ${player_history.join(", ")}
TIMES PLAYER VALIDATED SPENDING: ${timesValidated}
PLAYER ENABLED BAD HABITS: ${enabledBadHabits}

Context:
${
  scenario_type === "asking_for_loan" && enabledBadHabits
    ? "Player has encouraged your spending before, so you feel comfortable asking for money."
    : ""
}
${
  scenario_type === "seeking_advice" && friend_state.relationship_strength > 0.7
    ? "You trust the player and genuinely want their advice."
    : ""
}
${
  scenario_type === "confession_of_debt" && friend_state.debt_level > 500
    ? "You're really stressed about your debt situation and need help."
    : ""
}

Generate 2-4 messages as Miska (the friend), staying authentic to a 17-year-old Finnish teen.

Respond ONLY with valid JSON in this exact format:
{
  "messages": ["message 1", "message 2", ...]
}
`;

    const result = await friendAgent.generate(prompt);

    try {
      const parsed = JSON.parse(result.text);

      return {
        messages: parsed.messages || [],
        relationship_impact: 0, // Will be determined by player's response
      };
    } catch (error) {
      console.error("Failed to parse friend response:", result.text);
      // Fallback response
      return {
        messages: [
          "Hei! Miten menee? 😊",
          "Pitäskö lähtee joskus shoppaa yhdessä?",
        ],
        relationship_impact: 0,
      };
    }
  },
});
