/**
 * Evaluate Advice Tool
 *
 * Evaluates the quality of advice given by the advisor using AI-based evaluation.
 * Used to score advice and determine follow-up scenarios.
 */

import { evaluatorAgent } from "../agents/evaluator-agent.ts";
import { cachedGenerate } from "../test-cache.ts";
import {
  calculateProjectedOutcome,
  type FinancialProjection,
} from "../game/financial-calculator.ts";
import type {
  AdviceEvaluation,
  Scenario,
  CharacterPersonality,
  FinancialTopic,
  Character,
} from "../types/game-types.ts";

export const evaluateAdviceTool = {
  id: "evaluateAdviceTool",
  description:
    "Evaluates the quality of advice given by the advisor using AI-based comprehensive evaluation. Checks advice quality, communication, learning objectives, and character progression.",
  execute: async (context: {
    advice: string;
    scenario: Scenario;
    characterPersonality: CharacterPersonality;
    character?: Character;
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
  }) => {
    try {
      const {
        advice,
        scenario,
        characterPersonality,
        character,
        conversationHistory,
      } = context;

      // Build evaluation prompt for evaluatorAgent
      const evaluationPrompt = `
EVALUATION REQUEST:

CHARACTER PERSONALITY:
${JSON.stringify(characterPersonality, null, 2)}

${
  character
    ? `
CHARACTER DETAILS:
- Name: ${character.name}
- Age: ${character.age}
- Occupation: ${character.occupation}
- Financial Literacy: ${characterPersonality.financial_literacy}
- Trustingness: ${characterPersonality.trustingness}
- Stubbornness: ${characterPersonality.stubbornness}
`
    : ""
}

SCENARIO:
- Topic: ${scenario.topic}
- Difficulty: ${scenario.difficulty}
- Problem: ${scenario.problemContext.currentSituation}
- Emotional State: ${scenario.problemContext.emotionalState}
- Urgency: ${scenario.problemContext.urgency}

IDEAL ADVICE POINTS:
${scenario.idealAdvice.map((point, idx) => `${idx + 1}. ${point}`).join("\n")}

COMMON MISTAKES TO AVOID:
${scenario.commonMistakes.map((mistake, idx) => `${idx + 1}. ${mistake}`).join("\n")}

ADVISOR'S ADVICE:
"${advice}"

${
  conversationHistory && conversationHistory.length > 0
    ? `
CONVERSATION HISTORY:
${conversationHistory.map((msg, idx) => `${msg.role === "user" ? "Character" : "Advisor"}: ${msg.content}`).join("\n")}
`
    : ""
}

Please evaluate this advice comprehensively across all dimensions.
`;

      // Call evaluatorAgent (cachedGenerate already includes retry logic via runAgentOperation)
      const evaluationResult = await cachedGenerate(
        "agent",
        "evaluator_advice",
        evaluationPrompt,
        () => evaluatorAgent.generate(evaluationPrompt),
      );

      // Parse JSON response
      let jsonText = evaluationResult.text.trim();
      // Strip markdown code blocks if present
      jsonText = jsonText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const evaluation = JSON.parse(jsonText);

      // Map evaluatorAgent response to expected format
      const qualityScore = evaluation.overallScore || 5.0;
      const willFollowAdvice =
        evaluation.characterProgression?.willFollowAdvice ?? false;

      // Map consultationStatus to outcome
      let outcome: "positive" | "negative" | "neutral" = "neutral";
      if (evaluation.consultationStatus === "successful") {
        outcome = "positive";
      } else if (evaluation.consultationStatus === "unsuccessful") {
        outcome = "negative";
      } else {
        // For "partially_successful" or "ongoing", use score-based determination
        if (qualityScore >= 7) {
          outcome = "positive";
        } else if (qualityScore < 4) {
          outcome = "negative";
        }
      }

      // Calculate financial projection
      const willFollowConfidence =
        evaluation.characterProgression?.confidence ?? 0.5;

      const financialProjection = calculateProjectedOutcome(
        scenario,
        qualityScore,
        willFollowAdvice,
        willFollowConfidence,
      );

      // Ensure arrays are never empty - add generic feedback if missing
      let strengths = evaluation.strengths || [];
      let weaknesses = evaluation.weaknesses || [];
      let missedOpportunities = evaluation.missedOpportunities || [];

      if (strengths.length === 0) {
        if (qualityScore >= 7) {
          strengths.push("Provided helpful and relevant advice");
        } else if (qualityScore >= 5) {
          strengths.push("Attempted to address the client's concern");
        } else {
          strengths.push("Engaged with the client");
        }
      }

      if (weaknesses.length === 0 && qualityScore < 8) {
        if (qualityScore < 4) {
          weaknesses.push(
            "Advice did not adequately address the specific problem",
          );
          weaknesses.push(
            "Lacked concrete, actionable steps appropriate for the situation",
          );
        } else if (qualityScore < 6) {
          weaknesses.push(
            "Advice could be more specific to the client's situation",
          );
        } else {
          weaknesses.push(
            "Minor improvements could make the advice more actionable",
          );
        }
      }

      if (missedOpportunities.length === 0) {
        const topicGuidance: { [key: string]: string } = {
          budgeting:
            "Could have suggested specific budgeting tools or the 50/30/20 rule",
          debt_management:
            "Could have discussed debt prioritization strategies (avalanche vs snowball)",
          saving:
            "Could have recommended specific savings vehicles (ASP-tili, etc.)",
          investing:
            "Could have explained risk tolerance and diversification principles",
          scam_awareness:
            "Could have provided red flags to watch for and verification steps",
          credit_building:
            "Could have explained how credit scores work in Finland",
          insurance:
            "Could have discussed appropriate coverage levels for their situation",
        };

        const guidance =
          topicGuidance[scenario.topic] ||
          "Could have provided more specific, actionable guidance";
        missedOpportunities.push(guidance);
      }

      // Return comprehensive evaluation
      return {
        qualityScore: parseFloat(qualityScore.toFixed(1)),
        willFollowAdvice,
        outcome,
        strengths,
        weaknesses,
        missedOpportunities,
        topicsCovered: (evaluation.topicsCovered || [
          scenario.topic,
        ]) as FinancialTopic[],
        wasActionable: evaluation.wasActionable ?? true,
        wasEmpathetic: evaluation.wasEmpathetic ?? true,
        wasAccurate: evaluation.wasAccurate ?? true,
        // Include additional evaluation details for orchestrator
        dimensions: evaluation.dimensions,
        characterProgression: evaluation.characterProgression,
        consultationStatus: evaluation.consultationStatus,
        // NEW: Financial projection
        financialProjection,
      };
    } catch (error) {
      console.error("❌ Error evaluating advice with AI:", error);

      if (
        process.env.TEST_CACHE_MODE === "record" ||
        process.env.TEST_CACHE_MODE === "replay"
      ) {
        throw error;
      }

      // Fallback to simple heuristic evaluation if AI fails
      console.log("⚠️ Falling back to heuristic evaluation");

      const { advice, scenario, characterPersonality } = context;

      let score = 5.0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      // Basic checks
      const hasNumbers = /\d+/.test(advice);
      const hasSteps = /\d+\.|first|then|finally|1\)|2\)/.test(
        advice.toLowerCase(),
      );
      const wasActionable = hasNumbers || hasSteps;

      if (wasActionable) {
        score += 1.5;
        strengths.push("Provided concrete and practical advice");
      } else {
        weaknesses.push("Advice could be more specific");
      }

      // Check length
      if (advice.length < 30) {
        score -= 1.5;
        weaknesses.push("Advice was too brief");
      }

      // Clamp score
      score = Math.max(0, Math.min(10, score));

      // Determine if character will follow advice
      const trustingness = characterPersonality.trustingness || 0.5;
      const stubbornness = characterPersonality.stubbornness || 0.5;
      const followThreshold = 5 + stubbornness * 2 - trustingness * 2;
      const willFollowAdvice = score >= followThreshold;

      // Determine outcome
      let outcome: "positive" | "negative" | "neutral" = "neutral";
      if (score >= 7) {
        outcome = "positive";
      } else if (score < 4) {
        outcome = "negative";
      }

      if (strengths.length === 0) {
        strengths.push("Attempted to help the client");
      }
      if (weaknesses.length === 0 && score < 7) {
        weaknesses.push("Could be more detailed and specific");
      }

      // Calculate financial projection for fallback
      const willFollowConfidence = willFollowAdvice ? 0.6 : 0.3;
      const financialProjection = calculateProjectedOutcome(
        scenario,
        score,
        willFollowAdvice,
        willFollowConfidence,
      );

      return {
        qualityScore: parseFloat(score.toFixed(1)),
        willFollowAdvice,
        outcome,
        strengths,
        weaknesses,
        missedOpportunities: ["AI evaluation unavailable"],
        topicsCovered: [scenario.topic] as FinancialTopic[],
        wasActionable,
        wasEmpathetic: false,
        wasAccurate: true,
        // NEW: Financial projection
        financialProjection,
      };
    }
  },
};
