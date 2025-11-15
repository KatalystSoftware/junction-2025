/**
 * Invoke God/Boss Tool
 *
 * Triggers a performance review from the God/Boss agent.
 * Reviews recent consultation sessions and provides feedback.
 */

import { godBossAgent } from "../agents/god-boss-agent.ts";
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

      // Invoke God/Boss agent
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

        // Fallback review
        parsed = {
          overallScore: 6,
          strengthsIdentified: [
            "Yritit auttaa asiakkaita parhaasi mukaan",
            "Keskustelut pysyivät asiallisina",
          ],
          areasForImprovement: [
            "Voisit antaa tarkempia ja konkreettisempia neuvoja",
            "Muista kysyä tarkentavia kysymyksiä ennen neuvon antamista",
          ],
          learningMaterials: [
            {
              materialId: "mat_general_001",
              title: "Talousneuvonnan perusteet",
              description: "Yleisopas talousneuvontaan",
              topic: "budgeting",
              type: "article" as const,
            },
          ],
          encouragingMessage:
            "Hyvä alku! Jatka harjoittelua ja muista kysyä asiakkailta tarkentavia kysymyksiä. 💪",
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
          parsed.encouragingMessage || "Hyvä työ! Jatka samaan malliin. 💪",
        reputationChange: parsed.reputationChange || 5,
        skillLevelChange: parsed.skillLevelChange || 0.1,
        topicsExpertiseUpdates: parsed.topicsExpertiseUpdates || {},
      };
    } catch (error) {
      console.error("❌ Error invoking God/Boss agent:", error);

      // Return fallback review
      return {
        overallScore: 6,
        strengthsIdentified: ["Yritit parhaasi"],
        areasForImprovement: ["Jatka harjoittelua"],
        learningMaterials: [],
        encouragingMessage: "Virhe tapahtui, mutta jatka yrittämistä! 💪",
        reputationChange: 0,
        skillLevelChange: 0,
        topicsExpertiseUpdates: {},
      };
    }
  },
};
