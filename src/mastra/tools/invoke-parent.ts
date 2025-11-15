import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parentAgent } from "../agents/parent-agent.ts";

/**
 * Tool for Game Master to invoke the Parent Agent
 */
export const invokeParentTool = createTool({
  id: "invoke-parent-agent",
  description:
    "Calls the parent agent (Äiti) for support, discovery, or teaching scenarios",

  inputSchema: z.object({
    scenario_type: z
      .enum([
        "parent_finds_debt",
        "offering_help",
        "emergency_support",
        "casual_check_in",
      ])
      .describe("Type of parent interaction"),
    player_debt: z.number().describe("Player's current debt"),
    parent_knows_debt: z
      .boolean()
      .describe("Whether parent already knows about the debt"),
    trust_level: z
      .number()
      .min(0)
      .max(1)
      .describe("Trust level between parent and player"),
    player_tried_hiding_it: z
      .boolean()
      .optional()
      .describe("Whether player tried to hide financial problems"),
    use_voice: z
      .boolean()
      .optional()
      .describe("Whether to use voice message for emotional moments"),
  }),

  outputSchema: z.object({
    messages: z.array(z.string()).describe("Array of parent messages"),
    voice_needed: z
      .boolean()
      .describe("Whether voice synthesis should be used"),
    trust_impact: z
      .number()
      .optional()
      .describe("How this affects trust level (-0.3 to +0.2)"),
  }),

  execute: async ({
    scenario_type,
    player_debt,
    parent_knows_debt,
    trust_level,
    player_tried_hiding_it,
    use_voice,
  }) => {
    const prompt = `
Generate parent (Äiti) messages for this scenario:

SCENARIO: ${scenario_type}
PLAYER'S DEBT: €${player_debt}
PARENT KNOWS ABOUT DEBT: ${parent_knows_debt}
TRUST LEVEL: ${trust_level}
PLAYER TRIED HIDING: ${player_tried_hiding_it || false}

Emotional context:
${
  scenario_type === "parent_finds_debt" && !parent_knows_debt
    ? "You just discovered the debt. You're worried and want to understand what happened."
    : ""
}
${
  player_tried_hiding_it
    ? "You feel hurt that your child tried to hide this from you, but you still want to help."
    : ""
}
${
  scenario_type === "offering_help" && trust_level > 0.7
    ? "You're proud of your child's progress and want to teach them more."
    : ""
}
${
  scenario_type === "emergency_support"
    ? "Your child needs help. Be supportive and non-judgmental."
    : ""
}

Generate 2-4 messages as the parent, using appropriate Finnish adult texting style.

Respond ONLY with valid JSON in this exact format:
{
  "messages": ["message 1", "message 2", ...],
  "voice_needed": true/false
}
`;

    const result = await parentAgent.generate(prompt);

    try {
      const parsed = JSON.parse(result.text);

      // Voice should be used for highly emotional scenarios
      const shouldUseVoice =
        use_voice ||
        (scenario_type === "parent_finds_debt" && player_debt > 1000) ||
        scenario_type === "emergency_support";

      return {
        messages: parsed.messages || [],
        voice_needed: parsed.voice_needed || shouldUseVoice,
        trust_impact: player_tried_hiding_it && !parent_knows_debt ? -0.2 : 0,
      };
    } catch (error) {
      console.error("Failed to parse parent response:", result.text);
      // Fallback response
      return {
        messages: [
          "Hei kulta! Miten menee?",
          "Muista et voit aina kysyä neuvoo 😊",
        ],
        voice_needed: false,
        trust_impact: 0,
      };
    }
  },
});
