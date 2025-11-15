/**
 * Choice Generator
 *
 * Generates actionable advice choices from scenario data.
 * Turns idealAdvice points into player-selectable options with projected outcomes.
 */

import {
  calculateProjectedOutcome,
  type FinancialProjection,
} from "./financial-calculator.ts";
import type {
  Scenario,
  CharacterPersonality,
  FinancialTopic,
} from "../types/game-types.ts";

export interface AdviceChoice {
  choiceId: string;
  actionText: string; // What the advisor will do/say
  icon: string; // Emoji icon for the choice
  projectedOutcome: string; // Brief description of expected result
  financialImpact?: {
    // Optional financial projection
    monthlySavings?: number;
    debtReduction?: number;
    timeToGoal?: number;
    interestSaved?: number;
  };
  qualityScore: number; // How good this choice is (0-10)
  difficulty: "beginner" | "intermediate" | "advanced"; // Complexity level
  fullAdviceText: string; // What will actually be said to the client
}

/**
 * Generate 4-5 advice choices: mix of good advice and plausible traps
 */
export function generateAdviceChoices(
  scenario: Scenario,
  characterPersonality: CharacterPersonality,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
): AdviceChoice[] {
  const choices: AdviceChoice[] = [];

  // Determine which ideal advice points to offer based on conversation state
  const uncoveredAdvice = getUncoveredAdvice(
    scenario,
    conversationHistory || [],
  );

  // Generate 2 GOOD choices from ideal advice
  const goodAdvicePoints = uncoveredAdvice.slice(0, 2);

  goodAdvicePoints.forEach((advicePoint, index) => {
    const choice = createChoiceFromAdvicePoint(
      advicePoint,
      scenario,
      characterPersonality,
      index,
      true, // isGoodAdvice = true
    );
    choices.push(choice);
  });

  // Generate 2 TRAP choices from common mistakes
  const trapChoices = generateTrapChoices(scenario, characterPersonality);
  choices.push(...trapChoices.slice(0, 2));

  // Shuffle choices so good and bad are mixed
  shuffleArray(choices);

  // Always add a "custom advice" option at the end
  choices.push({
    choiceId: `custom_${Date.now()}`,
    actionText: "Give custom advice (advanced)",
    icon: "✍️",
    projectedOutcome: "Provide your own specific advice",
    qualityScore: 5, // Unknown quality
    difficulty: "advanced",
    fullAdviceText: "", // Will be filled by user input
  });

  return choices;
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generate plausible trap choices from common mistakes
 * These sound professional but have hidden problems
 */
function generateTrapChoices(
  scenario: Scenario,
  characterPersonality: CharacterPersonality,
): AdviceChoice[] {
  const trapChoices: AdviceChoice[] = [];
  const topic = scenario.topic;
  const commonMistakes = scenario.commonMistakes;

  // Generate context-specific traps based on topic
  const traps = getTrapAdviceByTopic(topic, scenario, commonMistakes);

  traps.forEach((trapAdvice, index) => {
    const choice = createChoiceFromAdvicePoint(
      trapAdvice,
      scenario,
      characterPersonality,
      1000 + index, // Different ID range for traps
      false, // isGoodAdvice = false
    );
    trapChoices.push(choice);
  });

  return trapChoices;
}

/**
 * Get topic-specific trap advice that sounds plausible
 */
function getTrapAdviceByTopic(
  topic: FinancialTopic,
  scenario: Scenario,
  commonMistakes: string[],
): string[] {
  const traps: string[] = [];

  // Transform common mistakes into plausible-sounding advice
  switch (topic) {
    case "debt_management":
      traps.push(
        "Consolidate with balance transfer credit card",
        "Pay minimum on debt, invest the difference in stocks",
        "Take personal loan to pay off credit cards",
      );
      break;

    case "budgeting":
      traps.push(
        "Switch to all-cash envelope budgeting system",
        "Cut all discretionary spending immediately",
        "Track every single expense manually in spreadsheet",
      );
      break;

    case "saving":
      traps.push(
        "Put all savings into high-yield account now",
        "Set ambitious 50% savings goal",
        "Open multiple savings accounts for every goal",
      );
      break;

    case "investing":
      traps.push(
        "Invest aggressively in growth stocks first",
        "Put everything into index funds immediately",
        "Focus on cryptocurrency for high returns",
      );
      break;

    case "scam_awareness":
      // Context-aware trap generation: prevention vs. aftermath
      const isPreventionScenario = detectPreventionScenario(scenario);

      if (isPreventionScenario) {
        // Prevention traps: encourage risky action (before money is lost)
        traps.push(
          "Just invest a small amount to test it out",
          "Ask your friend for the link and try it",
          "Don't research too much or you'll miss the opportunity",
        );
      } else {
        // Aftermath traps: ineffective recovery methods (after money is lost)
        traps.push(
          "Try to get money back directly from scammer",
          "Report to police and wait",
          "Just move on and forget about it",
        );
      }
      break;

    case "emergency_fund":
      traps.push(
        "Build 6-month fund before paying any debt",
        "Use credit card as emergency fund backup",
        "Keep emergency fund in investment account for growth",
      );
      break;

    case "loans":
      traps.push(
        "Take loan with longest possible term for lower payments",
        "Skip reading fine print, focus on APR only",
        "Get quick approval loan for faster access",
      );
      break;

    default:
      // Generic traps
      traps.push(
        "Focus on quick wins and shortcuts",
        "Make drastic immediate changes",
      );
  }

  return traps.slice(0, 3); // Return up to 3 traps
}

/**
 * Detect if a scam_awareness scenario is prevention (before money lost) vs. aftermath
 */
function detectPreventionScenario(scenario: Scenario): boolean {
  const details = scenario.problemContext.specificDetails as Record<
    string,
    any
  >;
  const situation = scenario.problemContext.currentSituation.toLowerCase();

  // Check for aftermath indicators in specificDetails
  if (details) {
    // Direct indicators that money was already lost
    if (
      details.moneyLost ||
      details.amountScammed ||
      (details.investmentAmount && details.investmentAmount > 0)
    ) {
      return false; // Aftermath scenario
    }
  }

  // Check currentSituation text for prevention keywords
  const preventionKeywords = [
    "should i",
    "can i try",
    "thinking about",
    "considering",
    "uncertain",
    "is it a scam",
    "worried it's a scam",
  ];

  const aftermathKeywords = [
    "lost money",
    "lost €",
    "scammed",
    "invested",
    "paid",
    "gave them",
  ];

  const hasPreventionKeywords = preventionKeywords.some((keyword) =>
    situation.includes(keyword),
  );
  const hasAftermathKeywords = aftermathKeywords.some((keyword) =>
    situation.includes(keyword),
  );

  // If both or neither, check idealAdvice for prevention-focused content
  if (hasPreventionKeywords && !hasAftermathKeywords) {
    return true; // Prevention
  }
  if (hasAftermathKeywords) {
    return false; // Aftermath
  }

  // Fallback: check idealAdvice for prevention vs recovery focus
  const adviceText = scenario.idealAdvice.join(" ").toLowerCase();
  const preventionAdviceKeywords = [
    "red flags",
    "before investing",
    "how to verify",
    "protect against fomo",
  ];
  const recoveryAdviceKeywords = [
    "report to",
    "get money back",
    "police",
    "recovery",
  ];

  const hasPreventionAdvice = preventionAdviceKeywords.some((keyword) =>
    adviceText.includes(keyword),
  );
  const hasRecoveryAdvice = recoveryAdviceKeywords.some((keyword) =>
    adviceText.includes(keyword),
  );

  if (hasPreventionAdvice && !hasRecoveryAdvice) {
    return true; // Prevention
  }

  // Default: assume aftermath (conservative, shows recovery traps)
  return false;
}

/**
 * Create a choice from an ideal advice point
 */
function createChoiceFromAdvicePoint(
  advicePoint: string,
  scenario: Scenario,
  characterPersonality: CharacterPersonality,
  index: number,
  isGoodAdvice: boolean = true,
): AdviceChoice {
  const topic = scenario.topic;
  const details = scenario.problemContext.specificDetails;

  // Select icon based on topic and advice content
  const icon = selectIcon(advicePoint, topic);

  // Generate projected outcome text and financial impact
  const { outcomeText, financialImpact } = calculateChoiceOutcome(
    advicePoint,
    scenario,
    characterPersonality,
    isGoodAdvice,
  );

  // Adapt advice text to character's literacy level
  const fullAdviceText = adaptAdviceToLiteracy(
    advicePoint,
    characterPersonality.financial_literacy,
  );

  // Determine difficulty
  const difficulty = determineChoiceDifficulty(
    advicePoint,
    characterPersonality,
  );

  // Quality score: choices from idealAdvice are high quality
  const qualityScore = isGoodAdvice
    ? 8 + Math.random() * 2 // Good advice: 8-10
    : 2 + Math.random() * 3; // Trap advice: 2-5

  return {
    choiceId: `choice_${index}_${Date.now()}`,
    actionText: formatActionText(advicePoint),
    icon,
    projectedOutcome: outcomeText,
    financialImpact,
    qualityScore,
    difficulty,
    fullAdviceText,
  };
}

/**
 * Calculate projected outcome for a choice
 */
function calculateChoiceOutcome(
  advicePoint: string,
  scenario: Scenario,
  characterPersonality: CharacterPersonality,
  isGoodAdvice: boolean = true,
): { outcomeText: string; financialImpact?: AdviceChoice["financialImpact"] } {
  // Estimate quality - but SHOW optimistic outcome even for trap advice
  // The trap will be revealed in follow-up scenarios
  const estimatedQuality = isGoodAdvice ? 8.5 : 7.0; // Trap shows slightly worse but still optimistic

  // Estimate willFollow based on personality
  const willFollow = estimateWillFollow(characterPersonality);
  const confidence = characterPersonality.trustingness || 0.6;

  // Calculate projection
  const projection = calculateProjectedOutcome(
    scenario,
    estimatedQuality,
    willFollow,
    confidence,
  );

  // Extract financial impact
  const financialImpact: AdviceChoice["financialImpact"] = {};
  if (projection.monthlySavings > 0) {
    financialImpact.monthlySavings = Math.round(projection.monthlySavings);
  }
  if (projection.totalDebtReduced > 0) {
    financialImpact.debtReduction = Math.round(projection.totalDebtReduced);
  }
  if (projection.monthsToGoal > 0 && projection.monthsToGoal < 999) {
    financialImpact.timeToGoal = Math.round(projection.monthsToGoal);
  }
  if (projection.totalInterestSaved > 0) {
    financialImpact.interestSaved = Math.round(projection.totalInterestSaved);
  }

  // Generate outcome text
  const outcomeText = generateOutcomeText(projection, scenario.topic);

  return { outcomeText, financialImpact };
}

/**
 * Generate human-readable outcome text from advice text
 * Shows what the advice aims to do (equally appealing for good and trap advice)
 * Pitfalls are NOT revealed - only discovered after character tries the advice
 */
function generateOutcomeText(
  projection: FinancialProjection,
  topic: FinancialTopic,
): string {
  // Generic, neutral descriptions that sound good for both good and trap advice
  // The actual results (good or bad) are revealed AFTER selection

  switch (topic) {
    case "budgeting":
      return "Get spending under control";

    case "debt_management":
      return "Tackle debt effectively";

    case "saving":
      return "Build savings faster";

    case "emergency_fund":
      return "Create financial safety net";

    case "investing":
      return "Grow wealth over time";

    case "scam_awareness":
      return "Avoid financial fraud";

    case "loans":
      return "Get better loan terms";

    case "insurance":
      return "Secure proper coverage";

    case "retirement":
      return "Prepare for retirement";

    case "credit_score":
      return "Improve credit rating";

    default:
      return "Improve financial situation";
  }
}

/**
 * Estimate if character will follow advice based on personality
 */
function estimateWillFollow(personality: CharacterPersonality): boolean {
  const trustingness = personality.trustingness || 0.5;
  const stubbornness = personality.stubbornness || 0.5;

  const followProbability = trustingness * 0.7 + (1 - stubbornness) * 0.3;
  return followProbability > 0.5;
}

/**
 * Adapt advice text to character's financial literacy level
 */
function adaptAdviceToLiteracy(
  advicePoint: string,
  literacyLevel: number,
): string {
  // For now, return the advice point as-is
  // In future, could simplify language for low literacy
  // or add more detail for high literacy
  return advicePoint;
}

/**
 * Determine difficulty level of a choice
 */
function determineChoiceDifficulty(
  advicePoint: string,
  personality: CharacterPersonality,
): "beginner" | "intermediate" | "advanced" {
  const literacy = personality.financial_literacy || 0.5;

  // Simple advice = beginner
  if (
    advicePoint.toLowerCase().includes("track") ||
    advicePoint.toLowerCase().includes("write down") ||
    advicePoint.toLowerCase().includes("list")
  ) {
    return "beginner";
  }

  // Complex advice = advanced
  if (
    advicePoint.toLowerCase().includes("invest") ||
    advicePoint.toLowerCase().includes("portfolio") ||
    advicePoint.toLowerCase().includes("consolidate")
  ) {
    return "advanced";
  }

  return "intermediate";
}

/**
 * Format advice point into actionable text
 */
function formatActionText(advicePoint: string): string {
  // Convert advice point to imperative action text
  // e.g., "Track all expenses for 1-2 weeks" → "Track expenses for 1-2 weeks"
  // Remove "should", "recommend", etc. to make it more direct

  let action = advicePoint;

  // Remove common prefixes
  action = action.replace(/^(Recommend |Suggest |Should |Could )/i, "");

  // Ensure it starts with a verb
  return action;
}

/**
 * Select appropriate icon for advice
 */
function selectIcon(advicePoint: string, topic: FinancialTopic): string {
  const lowerAdvice = advicePoint.toLowerCase();

  // Topic-based icons
  if (topic === "debt_management") {
    if (lowerAdvice.includes("consolidate")) return "🔄";
    if (lowerAdvice.includes("refinance")) return "💰";
    if (lowerAdvice.includes("payment")) return "💳";
    return "📉";
  }

  if (topic === "budgeting") {
    if (lowerAdvice.includes("track") || lowerAdvice.includes("list"))
      return "📝";
    if (lowerAdvice.includes("app")) return "📱";
    if (lowerAdvice.includes("category")) return "📊";
    return "💰";
  }

  if (topic === "saving") {
    if (lowerAdvice.includes("automatic")) return "⚙️";
    if (lowerAdvice.includes("goal")) return "🎯";
    if (lowerAdvice.includes("emergency")) return "🛡️";
    return "💰";
  }

  if (topic === "investing") {
    if (lowerAdvice.includes("risk")) return "⚖️";
    if (lowerAdvice.includes("diversif")) return "📊";
    if (lowerAdvice.includes("fund")) return "📈";
    return "💼";
  }

  if (topic === "scam_awareness") {
    if (lowerAdvice.includes("research")) return "🔍";
    if (lowerAdvice.includes("red flag")) return "🚩";
    if (lowerAdvice.includes("verify")) return "✅";
    return "🛡️";
  }

  // Generic icons based on keywords
  if (lowerAdvice.includes("calculate")) return "🧮";
  if (lowerAdvice.includes("plan")) return "📋";
  if (lowerAdvice.includes("talk") || lowerAdvice.includes("discuss"))
    return "💬";

  return "💡"; // Default
}

/**
 * Get uncovered advice points (not yet mentioned in conversation)
 */
function getUncoveredAdvice(
  scenario: Scenario,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): string[] {
  const idealAdvice = scenario.idealAdvice;

  if (conversationHistory.length === 0) {
    // First turn, all advice is uncovered
    return idealAdvice;
  }

  // Check which advice points have been mentioned
  const conversationText = conversationHistory
    .map((msg) => msg.content.toLowerCase())
    .join(" ");

  const uncovered = idealAdvice.filter((advice) => {
    // Extract key terms from advice
    const keyTerms = extractKeyTerms(advice);

    // Check if any key term appears in conversation
    const mentioned = keyTerms.some((term) =>
      conversationText.includes(term.toLowerCase()),
    );

    return !mentioned;
  });

  // If all covered, return all (allow repeating advice)
  if (uncovered.length === 0) {
    return idealAdvice;
  }

  return uncovered;
}

/**
 * Extract key terms from advice point for matching
 */
function extractKeyTerms(advice: string): string[] {
  // Simple keyword extraction
  const keywords: string[] = [];

  const lowerAdvice = advice.toLowerCase();

  // Common financial terms
  const terms = [
    "track",
    "budget",
    "save",
    "debt",
    "pay",
    "app",
    "goal",
    "emergency",
    "fund",
    "invest",
    "refinance",
    "consolidate",
    "interest",
    "expense",
    "income",
    "automatic",
  ];

  terms.forEach((term) => {
    if (lowerAdvice.includes(term)) {
      keywords.push(term);
    }
  });

  return keywords;
}
