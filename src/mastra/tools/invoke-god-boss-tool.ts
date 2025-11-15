/**
 * Invoke God/Boss Tool
 *
 * Triggers a performance review from the God/Boss agent.
 * Reviews recent consultation sessions and provides feedback.
 */

import { createGodBossAgent } from "../agents/god-boss-agent.ts";
import type {
  GodBossReview,
  ConsultationSession,
} from "../types/game-types.ts";
import { cachedGenerate } from "../test-cache.ts";

export const invokeGodBossTool = {
  id: "invokeGodBossTool",
  description:
    "Invokes the God/Boss agent to review advisor's recent performance and provide constructive feedback with learning materials.",
  execute: async (context: {
    sessionsToReview: ConsultationSession[];
    advisorReputation: number;
    advisorSkillLevel: number;
  }) => {
    try {
      const { sessionsToReview, advisorReputation, advisorSkillLevel } =
        context;

      // Collect all advisor messages for language detection
      const advisorMessages = sessionsToReview.flatMap(
        (session) => session.playerAdvice,
      );

      // Create boss agent with detected language
      const godBossAgent = createGodBossAgent(advisorMessages);

      // Build review prompt with session transcripts
      const sessionSummaries = sessionsToReview
        .map((session, idx) => {
          return `
=== SESSION ${idx + 1}: ${session.characterName} - ${session.scenarioId} ===
Topic: ${session.topicsCovered.join(", ")}
Advice Given:
${session.playerAdvice.map((advice, i) => `${i + 1}. ${advice}`).join("\n")}

Character Reactions:
${session.characterReactions.map((reaction, i) => `${i + 1}. ${reaction}`).join("\n")}

Previous Quality Score: ${session.adviceQualityScore}/10
`;
        })
        .join("\n\n");

      const prompt = `
Review the following ${sessionsToReview.length} consultation sessions:

${sessionSummaries}

ADVISOR CONTEXT:
- Current Reputation: ${advisorReputation}/100
- Current Skill Level: ${advisorSkillLevel}/10

Provide comprehensive feedback following your review format.
`;

      // Invoke God/Boss agent (cachedGenerate already includes retry logic via runAgentOperation)
      const response = await cachedGenerate(
        "agent",
        "godBoss_review",
        prompt,
        () => godBossAgent.generate(prompt),
      );

      const text = response.text || "";

      // Parse JSON response
      let parsed: GodBossReview;
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          "⚠️ Failed to parse God/Boss review JSON, using fallback:",
          parseError,
        );

        // Fallback review (English)
        parsed = {
          overallScore: 6,
          strengthsIdentified: [
            "You tried your best to help clients",
            "Conversations remained professional",
          ],
          areasForImprovement: [
            "You could provide more specific and concrete advice",
            "Remember to ask clarifying questions before giving advice",
          ],
          learningMaterials: [
            {
              materialId: "mat_general_001",
              title: "Financial Counseling Basics",
              description: "General guide to financial counseling",
              topic: "budgeting",
              type: "article" as const,
            },
          ],
          encouragingMessage:
            "Good start! Keep practicing and remember to ask clients clarifying questions. 💪",
          reputationChange: 5,
          skillLevelChange: 0.2,
          topicsExpertiseUpdates: {},
        };
      }

      return {
        overallScore: parsed.overallScore || 6,
        strengthsIdentified: parsed.strengthsIdentified || [],
        areasForImprovement: parsed.areasForImprovement || [],
        learningMaterials: parsed.learningMaterials || [],
        encouragingMessage:
          parsed.encouragingMessage || "Great work! Keep it up. 💪",
        reputationChange: parsed.reputationChange || 5,
        skillLevelChange: parsed.skillLevelChange || 0.1,
        topicsExpertiseUpdates: parsed.topicsExpertiseUpdates || {},
      };
    } catch (error) {
      console.error("❌ Error invoking God/Boss agent:", error);

      // Return fallback review (English)
      return {
        overallScore: 6,
        strengthsIdentified: ["You tried your best"],
        areasForImprovement: ["Keep practicing"],
        learningMaterials: [],
        encouragingMessage: "An error occurred, but keep trying! 💪",
        reputationChange: 0,
        skillLevelChange: 0,
        topicsExpertiseUpdates: {},
      };
    }
  },
};
