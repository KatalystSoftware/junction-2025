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

/**
 * Helper: Load transaction context for evaluation
 */
async function getTransactionContextForEvaluation(
  characterId: string,
  databasePath: string = "saves/advisor_default.db",
): Promise<{
  spending: Record<string, number>;
  anomalies: string[];
  monthlyIncome: number;
  monthlyExpenses: number;
  balance: number;
}> {
  try {
    const { SimulationEngine } = await import(
      "../simulation/simulation-engine.ts"
    );
    const engine = new SimulationEngine(databasePath);

    const state = engine.getCharacterState(characterId);
    if (!state) {
      engine.close();
      return {
        spending: {},
        anomalies: [],
        monthlyIncome: 0,
        monthlyExpenses: 0,
        balance: 0,
      };
    }

    const summaries = engine.getMonthlySummaries(characterId, 1);
    const currentMonth = summaries[0];

    if (!currentMonth) {
      engine.close();
      return {
        spending: {},
        anomalies: [],
        monthlyIncome: 0,
        monthlyExpenses: 0,
        balance: state.currentBalance,
      };
    }

    // Get spending by category
    const db = engine.getDatabase();
    const spending = db.getSpendingByCategory(
      characterId,
      currentMonth.month + "-01",
      currentMonth.month + "-31",
    );
    engine.close();

    // Identify anomalies
    const anomalies: string[] = [];
    if (spending.coffee && Math.abs(spending.coffee) > 60) {
      anomalies.push(
        `High coffee spending: €${Math.abs(spending.coffee).toFixed(2)}/month`,
      );
    }
    if (spending.onlineShopping && Math.abs(spending.onlineShopping) > 100) {
      anomalies.push(
        `Excessive online shopping: €${Math.abs(spending.onlineShopping).toFixed(2)}/month`,
      );
    }
    if (spending.dining && Math.abs(spending.dining) > 150) {
      anomalies.push(
        `High dining/delivery costs: €${Math.abs(spending.dining).toFixed(2)}/month`,
      );
    }
    if (currentMonth.totalExpenses > currentMonth.totalIncome) {
      anomalies.push(
        `Spending exceeds income by €${(currentMonth.totalExpenses - currentMonth.totalIncome).toFixed(2)}`,
      );
    }

    return {
      spending,
      anomalies,
      monthlyIncome: currentMonth.totalIncome,
      monthlyExpenses: currentMonth.totalExpenses,
      balance: state.currentBalance,
    };
  } catch (error) {
    console.error("Error loading transaction context:", error);
    return {
      spending: {},
      anomalies: [],
      monthlyIncome: 0,
      monthlyExpenses: 0,
      balance: 0,
    };
  }
}

/**
 * Helper: Check if advisor mentioned specific spending categories
 */
function checkCategoryMentions(
  advice: string,
  spending: Record<string, number>,
): {
  mentionedCategories: string[];
  missedCategories: string[];
} {
  const adviceLower = advice.toLowerCase();
  const mentionedCategories: string[] = [];
  const significantCategories = Object.entries(spending)
    .filter(([cat, amount]) => Math.abs(amount) > 50) // Categories with >€50/month
    .map(([cat]) => cat);

  // Category keywords
  const categoryKeywords: Record<string, string[]> = {
    coffee: ["coffee", "caffeine", "café", "espresso", "starbucks"],
    dining: [
      "dining",
      "restaurant",
      "eating out",
      "food delivery",
      "wolt",
      "foodora",
      "takeout",
      "takeaway",
    ],
    onlineShopping: [
      "online shopping",
      "temu",
      "amazon",
      "zalando",
      "shopping",
      "impulse",
    ],
    groceries: ["groceries", "grocery", "food shopping", "supermarket"],
    subscriptions: ["subscription", "netflix", "spotify", "streaming"],
    transportation: ["transport", "travel", "hsl", "commute"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (significantCategories.includes(category)) {
      const mentioned = keywords.some((keyword) =>
        adviceLower.includes(keyword),
      );
      if (mentioned) {
        mentionedCategories.push(category);
      }
    }
  }

  const missedCategories = significantCategories.filter(
    (cat) => !mentionedCategories.includes(cat),
  );

  return { mentionedCategories, missedCategories };
}

/**
 * Helper: Check if advisor addressed anomalies
 */
function checkAnomalyAwareness(
  advice: string,
  anomalies: string[],
): {
  addressedAnomalies: number;
  totalAnomalies: number;
} {
  const adviceLower = advice.toLowerCase();
  let addressedCount = 0;

  for (const anomaly of anomalies) {
    // Check if anomaly topic is mentioned in advice
    if (anomaly.includes("coffee") && adviceLower.includes("coffee")) {
      addressedCount++;
    } else if (
      anomaly.includes("online shopping") &&
      (adviceLower.includes("shopping") || adviceLower.includes("temu"))
    ) {
      addressedCount++;
    } else if (
      anomaly.includes("dining") &&
      (adviceLower.includes("dining") ||
        adviceLower.includes("restaurant") ||
        adviceLower.includes("delivery"))
    ) {
      addressedCount++;
    } else if (
      anomaly.includes("exceeds income") &&
      (adviceLower.includes("spending") || adviceLower.includes("budget"))
    ) {
      addressedCount++;
    }
  }

  return {
    addressedAnomalies: addressedCount,
    totalAnomalies: anomalies.length,
  };
}

/**
 * Filter out empathy/customer service feedback from evaluation arrays.
 * This game teaches financial literacy, not customer service skills.
 */
function filterEmpathyFeedback(items: string[]): string[] {
  const empathyPatterns = [
    /engaged with.*client/i,
    /engaged with.*character/i,
    /acknowledged.*(stress|feelings|emotions|concerns)/i,
    /showed (empathy|compassion|understanding)/i,
    /validated.*concerns/i,
    /(provided|gave) emotional support/i,
    /asked clarifying questions/i,
    /built rapport/i,
    /(was |being )(encouraging|supportive|empathetic)/i,
    /celebrated.*(progress|achievement)/i,
    /praised/i,
    /reassured/i,
    /warm.*tone/i,
    /friendly.*manner/i,
    /compassionate/i,
  ];

  return items.filter(
    (item) => !empathyPatterns.some((pattern) => pattern.test(item)),
  );
}

export const evaluateAdviceTool = {
  id: "evaluateAdviceTool",
  description:
    "Evaluates the quality of advice given by the advisor using AI-based comprehensive evaluation. Checks advice quality, communication, learning objectives, and character progression. NOW includes transaction awareness scoring.",
  execute: async (context: {
    advice: string;
    scenario: Scenario;
    characterPersonality: CharacterPersonality;
    character?: Character;
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    databasePath?: string;
  }) => {
    try {
      const {
        advice,
        scenario,
        characterPersonality,
        character,
        conversationHistory,
        databasePath,
      } = context;

      // Load transaction context if character available
      let transactionContext: Awaited<
        ReturnType<typeof getTransactionContextForEvaluation>
      > | null = null;
      let categoryAnalysis: ReturnType<typeof checkCategoryMentions> | null =
        null;
      let anomalyAnalysis: ReturnType<typeof checkAnomalyAwareness> | null =
        null;

      if (character?.characterId) {
        transactionContext = await getTransactionContextForEvaluation(
          character.characterId,
          databasePath,
        );
        categoryAnalysis = checkCategoryMentions(
          advice,
          transactionContext.spending,
        );
        anomalyAnalysis = checkAnomalyAwareness(
          advice,
          transactionContext.anomalies,
        );
      }

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

${
  transactionContext && Object.keys(transactionContext.spending).length > 0
    ? `
CHARACTER'S ACTUAL SPENDING DATA (shown to advisor before giving advice):
- Monthly Income: €${transactionContext.monthlyIncome.toFixed(2)}
- Monthly Expenses: €${transactionContext.monthlyExpenses.toFixed(2)}
- Current Balance: €${transactionContext.balance.toFixed(2)}

Top Spending Categories:
${Object.entries(transactionContext.spending)
  .filter(([_, amount]) => Math.abs(amount) > 50)
  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  .map(([cat, amount]) => `  • ${cat}: €${Math.abs(amount).toFixed(2)}/month`)
  .join("\n")}

HIGHLIGHTED SPENDING ANOMALIES (advisor should have noticed these):
${transactionContext.anomalies.map((a) => `  ⚠️ ${a}`).join("\n")}

TRANSACTION AWARENESS:
- Advisor mentioned these categories: ${categoryAnalysis?.mentionedCategories.join(", ") || "none"}
- Advisor MISSED these significant categories: ${categoryAnalysis?.missedCategories.join(", ") || "none"}
- Anomalies addressed: ${anomalyAnalysis?.addressedAnomalies}/${anomalyAnalysis?.totalAnomalies}

**IMPORTANT**: The advisor was shown this transaction data BEFORE giving advice. Evaluate whether they used this data effectively.
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

Please evaluate this advice comprehensively across all dimensions, including transaction data awareness.
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
      let qualityScore = evaluation.overallScore || 5.0;

      // Apply transaction awareness modifiers
      if (transactionContext && categoryAnalysis && anomalyAnalysis) {
        let scoreModifier = 0;

        // Bonus for addressing anomalies (+0.5 per anomaly, max +2.0)
        if (anomalyAnalysis.totalAnomalies > 0) {
          const anomalyRatio =
            anomalyAnalysis.addressedAnomalies / anomalyAnalysis.totalAnomalies;
          scoreModifier += anomalyRatio * 2.0;
        }

        // Bonus for mentioning significant categories (+0.3 per category, max +1.5)
        const mentionBonus = Math.min(
          categoryAnalysis.mentionedCategories.length * 0.3,
          1.5,
        );
        scoreModifier += mentionBonus;

        // Penalty for missing obvious spending patterns (-0.5 per missed category, max -2.0)
        if (categoryAnalysis.missedCategories.length > 0) {
          const missedPenalty = Math.min(
            categoryAnalysis.missedCategories.length * 0.5,
            2.0,
          );
          scoreModifier -= missedPenalty;
        }

        // Special penalty for ignoring budget deficit (-1.5)
        const hasDeficit =
          transactionContext.monthlyExpenses > transactionContext.monthlyIncome;
        const addressedDeficit =
          advice.toLowerCase().includes("budget") ||
          advice.toLowerCase().includes("spending") ||
          advice.toLowerCase().includes("expense");
        if (hasDeficit && !addressedDeficit) {
          scoreModifier -= 1.5;
        }

        qualityScore = Math.max(0, Math.min(10, qualityScore + scoreModifier));
      }
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

      // Extract actions from advice to calculate accurate projections
      const { extractAdviceActions } = await import(
        "../simulation/advice-action-extractor.ts"
      );
      const extractedActions = extractAdviceActions([advice]);

      // Calculate financial projection using extracted actions
      const willFollowConfidence =
        evaluation.characterProgression?.confidence ?? 0.5;

      const financialProjection = calculateProjectedOutcome(
        scenario,
        qualityScore,
        willFollowAdvice,
        willFollowConfidence,
        extractedActions, // Pass extracted actions for accurate calculation
      );

      // Ensure arrays are never empty - add generic feedback if missing
      let strengths = evaluation.strengths || [];
      let weaknesses = evaluation.weaknesses || [];
      let missedOpportunities = evaluation.missedOpportunities || [];

      // Add transaction-specific feedback
      if (transactionContext && categoryAnalysis && anomalyAnalysis) {
        // Strengths for transaction awareness
        if (categoryAnalysis.mentionedCategories.length > 0) {
          strengths.push(
            `Noticed specific spending patterns: ${categoryAnalysis.mentionedCategories.join(", ")}`,
          );
        }
        if (
          anomalyAnalysis.addressedAnomalies ===
            anomalyAnalysis.totalAnomalies &&
          anomalyAnalysis.totalAnomalies > 0
        ) {
          strengths.push("Addressed all highlighted spending anomalies");
        } else if (anomalyAnalysis.addressedAnomalies > 0) {
          strengths.push(
            `Addressed ${anomalyAnalysis.addressedAnomalies} of ${anomalyAnalysis.totalAnomalies} spending anomalies`,
          );
        }

        // Weaknesses for missing data
        if (categoryAnalysis.missedCategories.length > 0) {
          weaknesses.push(
            `Failed to address significant spending in: ${categoryAnalysis.missedCategories.join(", ")}`,
          );
        }
        if (
          anomalyAnalysis.addressedAnomalies === 0 &&
          anomalyAnalysis.totalAnomalies > 0
        ) {
          weaknesses.push(
            `Ignored all ${anomalyAnalysis.totalAnomalies} highlighted spending anomalies`,
          );
        }

        // Missed opportunities based on transaction data
        if (transactionContext.anomalies.length > 0) {
          transactionContext.anomalies.forEach((anomaly) => {
            if (
              anomaly.includes("coffee") &&
              !advice.toLowerCase().includes("coffee")
            ) {
              missedOpportunities.push(
                `Could have addressed high coffee spending (€${Math.abs(transactionContext.spending.coffee || 0).toFixed(2)}/month)`,
              );
            }
            if (
              anomaly.includes("online shopping") &&
              !advice.toLowerCase().includes("shopping") &&
              !advice.toLowerCase().includes("temu")
            ) {
              missedOpportunities.push(
                `Could have addressed excessive online shopping (€${Math.abs(transactionContext.spending.onlineShopping || 0).toFixed(2)}/month)`,
              );
            }
            if (
              anomaly.includes("dining") &&
              !advice.toLowerCase().includes("dining") &&
              !advice.toLowerCase().includes("restaurant")
            ) {
              missedOpportunities.push(
                `Could have addressed high dining/delivery costs (€${Math.abs(transactionContext.spending.dining || 0).toFixed(2)}/month)`,
              );
            }
          });
        }
      }

      // Filter out empathy/customer service feedback
      strengths = filterEmpathyFeedback(strengths);
      weaknesses = filterEmpathyFeedback(weaknesses);
      missedOpportunities = filterEmpathyFeedback(missedOpportunities);

      if (strengths.length === 0) {
        if (qualityScore >= 7) {
          strengths.push("Provided helpful financial advice");
        } else if (qualityScore >= 5) {
          strengths.push("Addressed the financial problem");
        } else {
          strengths.push("Attempted to provide financial guidance");
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
        strengths.push("Attempted to provide financial guidance");
      }
      if (weaknesses.length === 0 && score < 7) {
        weaknesses.push("Could be more detailed and specific");
      }

      // Calculate financial projection for fallback
      // Extract actions for accurate fallback calculation
      const { extractAdviceActions: extractFallback } = await import(
        "../simulation/advice-action-extractor.ts"
      );
      const fallbackActions = extractFallback([advice]);

      const willFollowConfidence = willFollowAdvice ? 0.6 : 0.3;
      const financialProjection = calculateProjectedOutcome(
        scenario,
        score,
        willFollowAdvice,
        willFollowConfidence,
        fallbackActions, // Pass extracted actions
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
        wasAccurate: true,
        // NEW: Financial projection
        financialProjection,
      };
    }
  },
};
