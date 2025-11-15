import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { scammerAgent } from "../agents/scammer-agent.ts";

/**
 * Tool for Game Master to invoke the Scammer Agent
 */
export const invokeScammerTool = createTool({
  id: "invoke-scammer-agent",
  description:
    "Calls the scammer agent to generate a crypto/investment scam attempt targeting the player",

  inputSchema: z.object({
    player_type: z
      .string()
      .describe(
        "Player personality type (e.g., 'overconfident_risk_taker', 'cautious_saver')",
      ),
    difficulty: z
      .number()
      .min(0)
      .max(1)
      .describe("Scam sophistication level (0=obvious, 1=very sophisticated)"),
    approach: z
      .enum(["aggressive_fomo", "patient_trust", "social_proof"])
      .describe("Scam tactic to use"),
    context: z.object({
      player_savings: z.number().describe("Player's current savings"),
      player_risk_tolerance: z
        .number()
        .min(0)
        .max(1)
        .describe("Player's risk tolerance"),
      player_recent_success: z
        .boolean()
        .optional()
        .describe("Whether player recently made good choices"),
    }),
  }),

  outputSchema: z.object({
    messages: z.array(z.string()).describe("Array of scam messages"),
    scam_sophistication: z
      .number()
      .describe("Actual sophistication level used"),
    expected_player_response: z
      .enum(["engage", "ignore", "report"])
      .optional()
      .describe("Expected player reaction"),
  }),

  execute: async ({ player_type, difficulty, approach, context }) => {
    const prompt = `
Generate a scam attempt with the following parameters:

DIFFICULTY: ${difficulty}
APPROACH: ${approach}
PLAYER TYPE: ${player_type}
PLAYER SAVINGS: €${context.player_savings}
PLAYER RISK TOLERANCE: ${context.player_risk_tolerance}

Based on this context, create 1-3 messages from a scammer trying to get the player to invest/send money.
Adapt your sophistication and tactics to the difficulty level and player type.

Respond ONLY with valid JSON in this exact format:
{
  "messages": ["message 1", "message 2", ...]
}
`;

    const result = await scammerAgent.generate(prompt);

    try {
      const parsed = JSON.parse(result.text);

      return {
        messages: parsed.messages || [],
        scam_sophistication: difficulty,
        expected_player_response:
          context.player_risk_tolerance > 0.7 ? "engage" : "ignore",
      };
    } catch (error) {
      console.error("Failed to parse scammer response:", result.text);
      // Fallback response
      return {
        messages: [
          "Hei! Haluutko tienata helppoo rahaa? 🚀💰",
          "Mulla on hyvä systeemi mis voit tuplata rahas. Kiinnostaaks?",
        ],
        scam_sophistication: difficulty,
        expected_player_response: "ignore",
      };
    }
  },
});
