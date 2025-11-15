/**
 * Evaluate Advice Tool
 *
 * Quickly evaluates the quality of advice given by the advisor.
 * Used to score advice and determine follow-up scenarios.
 */

import type {
  AdviceEvaluation,
  Scenario,
  CharacterPersonality,
} from "../types/game-types.ts";

export const evaluateAdviceTool = {
  id: "evaluateAdviceTool",
  description:
    "Evaluates the quality of advice given by the advisor. Checks if advice is specific, actionable, empathetic, and accurate.",
  execute: async (context: {
    advice: string;
    scenario: Scenario;
    characterPersonality: CharacterPersonality;
  }) => {
    try {
      const { advice, scenario, characterPersonality } = context;

      // Simple heuristic evaluation (can be replaced with AI evaluation later)
      let score = 5.0; // Start at middle
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      let wasActionable = false;
      let wasEmpathetic = false;
      let wasAccurate = true; // Assume accurate unless clear issues

      // Check for ideal advice points
      const idealAdviceMatches = scenario.idealAdvice.filter((ideal) => {
        const lowerAdvice = advice.toLowerCase();
        const lowerIdeal = ideal.toLowerCase();
        // Simple keyword matching
        const keywords = lowerIdeal.split(" ").filter((w) => w.length > 4);
        return keywords.some((keyword) => lowerAdvice.includes(keyword));
      });

      if (idealAdviceMatches.length > 0) {
        score += idealAdviceMatches.length * 1.5;
        strengths.push("Käsitteli tärkeitä neuvon osa-alueita");
      }

      // Check for common mistakes
      const mistakesMatches = scenario.commonMistakes.filter((mistake) => {
        const lowerAdvice = advice.toLowerCase();
        const lowerMistake = mistake.toLowerCase();
        const keywords = lowerMistake.split(" ").filter((w) => w.length > 4);
        return keywords.some((keyword) => lowerAdvice.includes(keyword));
      });

      if (mistakesMatches.length > 0) {
        score -= mistakesMatches.length * 1.5;
        weaknesses.push("Teki joitakin yleisiä virheitä");
      }

      // Check for actionability (specific numbers, tools, steps)
      const hasNumbers = /\d+/.test(advice);
      const hasSteps = /\d+\.|ensiksi|sitten|lopuksi|1\)|2\)/.test(
        advice.toLowerCase(),
      );
      const hasTools =
        /app|sovellus|laskuri|työkalu|excel|nordea|op|pankki/.test(
          advice.toLowerCase(),
        );

      if (hasNumbers || hasSteps || hasTools) {
        wasActionable = true;
        score += 1.5;
        strengths.push("Antoi konkreettisia ja käytännöllisiä neuvoja");
      } else {
        weaknesses.push("Neuvo oli hieman epämääräinen");
      }

      // Check for empathy
      const empatheticPhrases = [
        "ymmärrän",
        "kuulostaa",
        "varmasti",
        "hyvä kysymys",
        "ei hätää",
        "auttaa",
      ];
      const hasEmpathy = empatheticPhrases.some((phrase) =>
        advice.toLowerCase().includes(phrase),
      );

      if (hasEmpathy) {
        wasEmpathetic = true;
        score += 1.0;
        strengths.push("Osoitti empatiaa asiakkaan tilanteelle");
      } else {
        weaknesses.push("Voisi osoittaa enemmän empatiaa");
      }

      // Check for judgmental language (negative)
      const judgmentalPhrases = [
        "väärin",
        "tyhmä",
        "pitäisi tietää",
        "itsestään selvää",
      ];
      const isJudgmental = judgmentalPhrases.some((phrase) =>
        advice.toLowerCase().includes(phrase),
      );

      if (isJudgmental) {
        score -= 2.0;
        weaknesses.push("Oli hieman tuomitseva");
        wasAccurate = false;
      }

      // Check if too short (< 30 chars = probably not helpful)
      if (advice.length < 30) {
        score -= 1.5;
        weaknesses.push("Neuvo oli liian lyhyt ja puutteellinen");
      }

      // Clamp score to 0-10
      score = Math.max(0, Math.min(10, score));

      // Determine if character will follow advice (based on score + personality)
      const trustiness = (characterPersonality as any).trustingness || 0.5;
      const stubbornness = (characterPersonality as any).stubbornness || 0.5;

      // High trust + good advice = high chance
      // Low trust or high stubbornness = need better advice
      const followThreshold = 5 + stubbornness * 2 - trustiness * 2;
      const willFollowAdvice = score >= followThreshold;

      // Determine outcome
      let outcome: "positive" | "negative" | "neutral" = "neutral";
      if (score >= 7) {
        outcome = "positive";
      } else if (score < 4) {
        outcome = "negative";
      }

      // Add default strength/weakness if none found
      if (strengths.length === 0) {
        strengths.push("Yritti auttaa asiakasta");
      }
      if (weaknesses.length === 0 && score < 7) {
        weaknesses.push("Voisi olla tarkempi ja yksityiskohtaisempi");
      }

      return {
        qualityScore: parseFloat(score.toFixed(1)),
        willFollowAdvice,
        outcome,
        strengths,
        weaknesses,
        wasActionable,
        wasEmpathetic,
        wasAccurate,
      };
    } catch (error) {
      console.error("❌ Error evaluating advice:", error);

      // Return neutral evaluation
      return {
        qualityScore: 5.0,
        willFollowAdvice: false,
        outcome: "neutral" as const,
        strengths: ["Yritti auttaa"],
        weaknesses: ["Arviointivirhe tapahtui"],
        wasActionable: false,
        wasEmpathetic: false,
        wasAccurate: true,
      };
    }
  },
};
