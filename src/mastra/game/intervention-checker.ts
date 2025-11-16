/**
 * Intervention Checker
 *
 * Quick evaluation of advisor's advice to determine if boss should intervene
 * in real-time before the character receives the message.
 *
 * Creates pressure and immediate feedback when bad financial advice is given.
 */

import type {
  Scenario,
  CharacterPersonality,
  Character,
} from "../types/game-types.ts";

export interface InterventionDecision {
  shouldIntervene: boolean;
  severity: "warning" | "critical";
  reason: string;
  correctApproach?: string;
  topic?: string;
}

/**
 * Quick heuristic check for obviously bad advice patterns
 * This runs BEFORE the full AI evaluation to provide instant feedback
 */
export function checkForIntervention(
  advice: string,
  scenario: Scenario,
  character: Character,
  advisorSkillLevel: number,
): InterventionDecision {
  const adviceLower = advice.toLowerCase();

  // No intervention needed
  const noIntervention: InterventionDecision = {
    shouldIntervene: false,
    severity: "warning",
    reason: "",
  };

  // Quick length check - too short advice is usually bad
  if (advice.trim().length < 30) {
    return {
      shouldIntervene: true,
      severity: "critical",
      reason:
        "Your advice is WAY too short! The client needs actual guidance, not a one-liner.",
      correctApproach: `Give at least 2-3 specific, actionable steps. Explain WHY they should do each thing. This is about ${scenario.topic}, so be thorough.`,
      topic: scenario.topic,
    };
  }

  // Check for common mistakes defined in the scenario
  for (const mistake of scenario.commonMistakes) {
    const mistakeLower = mistake.toLowerCase();

    // Check if advice contains this mistake
    const keywords = extractKeywords(mistakeLower);
    if (keywords.some((keyword) => adviceLower.includes(keyword))) {
      return {
        shouldIntervene: true,
        severity: "critical",
        reason: `Hold on. You're making a common mistake here: ${mistake}`,
        correctApproach: `Instead, try: ${getIdealAdviceHint(scenario)}`,
        topic: scenario.topic,
      };
    }
  }

  // Check if ideal advice points are being addressed
  const idealCoverage = checkIdealAdviceCoverage(advice, scenario.idealAdvice);

  // Skill-based thresholds (stricter for higher skill levels)
  const coverageThreshold =
    advisorSkillLevel < 3 ? 0.3 : advisorSkillLevel < 7 ? 0.4 : 0.5;

  if (idealCoverage < coverageThreshold) {
    return {
      shouldIntervene: true,
      severity: "warning",
      reason: `You're missing key points here. This is a ${scenario.topic} problem - you need to cover the essentials.`,
      correctApproach: `Make sure you address: ${scenario.idealAdvice.slice(0, 2).join(", ")}`,
      topic: scenario.topic,
    };
  }

  // Topic-specific checks
  const topicCheck = checkTopicSpecificIssues(adviceLower, scenario, character);
  if (topicCheck.shouldIntervene) {
    return topicCheck;
  }

  return noIntervention;
}

/**
 * Extract keywords from mistake description for pattern matching
 */
function extractKeywords(mistake: string): string[] {
  // Remove common words
  const stopWords = [
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "and",
    "or",
    "in",
    "on",
    "at",
  ];

  const words = mistake
    .toLowerCase()
    .replace(/[^a-zäö\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.includes(word));

  return words;
}

/**
 * Check how many ideal advice points are being addressed
 */
function checkIdealAdviceCoverage(
  advice: string,
  idealAdvice: string[],
): number {
  const adviceLower = advice.toLowerCase();
  let covered = 0;

  for (const ideal of idealAdvice) {
    const keywords = extractKeywords(ideal);
    // If at least 2 keywords from this ideal point appear, count it as covered
    const matchCount = keywords.filter((keyword) =>
      adviceLower.includes(keyword),
    ).length;
    if (matchCount >= Math.min(2, keywords.length)) {
      covered++;
    }
  }

  return idealAdvice.length > 0 ? covered / idealAdvice.length : 0;
}

/**
 * Get a hint about ideal advice without spoiling everything
 */
function getIdealAdviceHint(scenario: Scenario): string {
  if (scenario.idealAdvice.length === 0) {
    return "Focus on practical, actionable steps for this situation.";
  }

  // Return first 1-2 ideal points as hints
  return scenario.idealAdvice.slice(0, 2).join(" AND ");
}

/**
 * Topic-specific intervention checks
 */
function checkTopicSpecificIssues(
  adviceLower: string,
  scenario: Scenario,
  character: Character,
): InterventionDecision {
  const noIntervention: InterventionDecision = {
    shouldIntervene: false,
    severity: "warning",
    reason: "",
  };

  switch (scenario.topic) {
    case "budgeting":
      // Check if they're ignoring obvious spending issues
      if (
        scenario.problemContext.currentSituation
          .toLowerCase()
          .includes("money runs out")
      ) {
        if (
          !adviceLower.includes("track") &&
          !adviceLower.includes("seur") &&
          !adviceLower.includes("budget")
        ) {
          return {
            shouldIntervene: true,
            severity: "critical",
            reason:
              "They literally said money runs out before month ends. Start with tracking spending!",
            correctApproach:
              "First step: Have them track ALL spending for at least a week. Then identify where money is leaking. Then make a plan.",
            topic: "budgeting",
          };
        }
      }
      break;

    case "debt_management":
      // Check if they're giving risky debt advice
      if (
        adviceLower.includes("ignore") ||
        adviceLower.includes("skip payment")
      ) {
        return {
          shouldIntervene: true,
          severity: "critical",
          reason:
            "NEVER tell someone to skip debt payments. That destroys credit and adds fees.",
          correctApproach:
            "Focus on: 1) Contact creditors about payment plans, 2) Prioritize high-interest debt, 3) Look into debt counseling if needed.",
          topic: "debt_management",
        };
      }

      // Check if they're addressing the emotional overwhelm
      if (
        character.personality.emotionality > 0.6 &&
        !adviceLower.includes("takuu-säätiö") &&
        !adviceLower.includes("neuvonta")
      ) {
        return {
          shouldIntervene: true,
          severity: "warning",
          reason:
            "This client is stressed about debt. Mention free debt counseling (Takuu-Säätiö).",
          correctApproach:
            "Acknowledge the stress, then suggest Takuu-Säätiö for free professional debt counseling. They need support, not just numbers.",
          topic: "debt_management",
        };
      }
      break;

    case "saving":
      // Check for unrealistic savings goals
      if (
        adviceLower.includes("save 50%") ||
        adviceLower.includes("save half")
      ) {
        const income = character.financialProfile.typicalMonthlyIncome;
        if (income < 2000) {
          return {
            shouldIntervene: true,
            severity: "critical",
            reason:
              "Saving 50% on a low income? Be realistic. They have rent and groceries to pay.",
            correctApproach: `With their income (€${income}/month), suggest starting with 5-10% savings. Something achievable builds confidence.`,
            topic: "saving",
          };
        }
      }
      break;

    case "investing":
      // Check if they're recommending risky investments to low-literacy clients
      if (character.personality.financial_literacy < 0.4) {
        if (
          adviceLower.includes("stock") ||
          adviceLower.includes("individual stock") ||
          adviceLower.includes("crypto")
        ) {
          return {
            shouldIntervene: true,
            severity: "critical",
            reason:
              "This client has low financial literacy. DON'T recommend individual stocks or crypto.",
            correctApproach:
              "Start with basics: emergency fund first, then low-cost index funds (indeksirahasto). Keep it simple.",
            topic: "investing",
          };
        }
      }
      break;

    case "scam_awareness":
      // Check if they're being too trusting
      if (
        adviceLower.includes("probably safe") ||
        adviceLower.includes("might be okay")
      ) {
        return {
          shouldIntervene: true,
          severity: "critical",
          reason: "There's NO 'probably safe' with money scams. Be definitive.",
          correctApproach:
            "If it sounds too good to be true, it IS a scam. Red flags: guaranteed returns, pressure to act fast, unknown sender. End of story.",
          topic: "scam_awareness",
        };
      }
      break;
  }

  return noIntervention;
}
