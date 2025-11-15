/**
 * Elämäpeli 2025 - Advice Action Extractor
 * Extract actionable advice from advisor's text and convert to simulation effects
 *
 * Uses keyword matching and pattern recognition to identify:
 * - Subscription cancellations
 * - Expense reductions
 * - Budget tracking
 * - Debt payment increases
 * - Impulse purchase reduction
 */

import type {
  AdviceEffect,
  AdviceEffectType,
  ExtractedAdviceAction,
} from "./simulation-types.ts";

/**
 * Extract concrete actions from advisor's advice text
 */
export function extractAdviceActions(
  adviceText: string[],
): ExtractedAdviceAction[] {
  const actions: ExtractedAdviceAction[] = [];
  const fullText = adviceText.join(" ").toLowerCase();

  // 1. Cancel subscription
  if (
    fullText.includes("cancel") ||
    fullText.includes("peruuta") ||
    fullText.includes("lopeta tilaus")
  ) {
    const subscriptionNames = extractSubscriptionNames(fullText);
    for (const subName of subscriptionNames) {
      actions.push({
        actionType: "cancel_subscription",
        specificSubscription: subName,
        confidence: 0.9,
      });
    }
  }

  // 2. Reduce expenses (groceries, entertainment, dining)
  if (
    fullText.includes("reduce") ||
    fullText.includes("cut") ||
    fullText.includes("vähennä") ||
    fullText.includes("säästä")
  ) {
    const categories = extractExpenseCategories(fullText);
    const reductionPercent = extractPercentage(fullText) || 0.2; // Default 20%

    for (const category of categories) {
      actions.push({
        actionType: "reduce_expense_category",
        targetCategory: category as any,
        reductionPercent: reductionPercent,
        confidence: 0.7,
      });
    }
  }

  // 3. Start tracking / budgeting
  if (
    fullText.includes("track") ||
    fullText.includes("budget") ||
    fullText.includes("seuraa") ||
    fullText.includes("budjetti")
  ) {
    actions.push({
      actionType: "start_tracking",
      confidence: 0.8,
    });
  }

  // 4. Reduce impulse purchases
  if (
    fullText.includes("impulse") ||
    fullText.includes("impulssi") ||
    fullText.includes("spontaani") ||
    fullText.includes("think before buying") ||
    fullText.includes("mieti ennen ostamista")
  ) {
    actions.push({
      actionType: "avoid_impulse",
      confidence: 0.85,
    });
  }

  // 5. Increase debt payment
  if (
    fullText.includes("pay extra") ||
    fullText.includes("pay more") ||
    fullText.includes("maksaa enemmän") ||
    fullText.includes("ylimääräinen maksu")
  ) {
    const extraAmount = extractMoneyAmount(fullText);
    actions.push({
      actionType: "increase_debt_payment",
      extraDebtPayment: extraAmount,
      confidence: 0.8,
    });
  }

  // 6. Create strict budget
  if (
    fullText.includes("strict budget") ||
    fullText.includes("tiukka budjetti") ||
    fullText.includes("limit spending") ||
    fullText.includes("rajoita menoja")
  ) {
    actions.push({
      actionType: "create_budget",
      confidence: 0.85,
    });
  }

  return actions;
}

/**
 * Convert extracted actions to advice effects
 */
export function createAdviceEffects(
  characterId: string,
  adviceSessionId: string,
  actions: ExtractedAdviceAction[],
  characterFollowsProbability: number, // 0-1: will character follow advice?
): AdviceEffect[] {
  const effects: AdviceEffect[] = [];
  const now = new Date().toISOString();

  for (const action of actions) {
    // Character may not follow all advice
    if (Math.random() > characterFollowsProbability) continue;

    const strength = action.confidence * characterFollowsProbability;

    switch (action.actionType) {
      case "cancel_subscription":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "cancel_subscription",
          strength: strength,
          appliedDate: now,
          isActive: true,
          metadata: {
            subscriptionName: action.specificSubscription,
          },
          createdAt: now,
        });
        break;

      case "reduce_expense_category":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "reduce_expense_category",
          strength: strength,
          appliedDate: now,
          expiresDate: addMonths(now, 3), // Effect lasts 3 months
          isActive: true,
          metadata: {
            category: action.targetCategory,
            reductionPercent: action.reductionPercent,
          },
          createdAt: now,
        });
        break;

      case "start_tracking":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "start_tracking",
          strength: strength,
          appliedDate: now,
          expiresDate: addMonths(now, 6), // Effect lasts 6 months
          isActive: true,
          metadata: {
            reducesImpulse: true,
            increasesAwareness: true,
          },
          createdAt: now,
        });
        break;

      case "avoid_impulse":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "avoid_impulse",
          strength: strength,
          appliedDate: now,
          expiresDate: addMonths(now, 2), // Effect lasts 2 months
          isActive: true,
          metadata: {
            impulsePurchaseReduction: 0.5, // Reduce by 50%
          },
          createdAt: now,
        });
        break;

      case "increase_debt_payment":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "increase_debt_payment",
          strength: strength,
          appliedDate: now,
          expiresDate: addMonths(now, 12), // Effect lasts 12 months
          isActive: true,
          metadata: {
            extraAmount: action.extraDebtPayment || 50,
          },
          createdAt: now,
        });
        break;

      case "create_budget":
        effects.push({
          id: `effect_${characterId}_${Date.now()}_${Math.random()}`,
          characterId,
          adviceSessionId,
          effectType: "create_budget",
          strength: strength,
          appliedDate: now,
          expiresDate: addMonths(now, 6), // Effect lasts 6 months
          isActive: true,
          metadata: {
            strictness: 0.3, // Reduce variable expenses by 30%
          },
          createdAt: now,
        });
        break;
    }
  }

  return effects;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract subscription names from text
 */
function extractSubscriptionNames(text: string): string[] {
  const subscriptions: string[] = [];

  const commonSubscriptions = [
    "netflix",
    "spotify",
    "hbo",
    "disney",
    "youtube premium",
    "kuntosali",
    "gym",
  ];

  for (const sub of commonSubscriptions) {
    if (text.includes(sub)) {
      subscriptions.push(
        sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase(),
      );
    }
  }

  return subscriptions;
}

/**
 * Extract expense categories from text
 */
function extractExpenseCategories(text: string): string[] {
  const categories: string[] = [];

  const categoryKeywords = {
    groceries: ["groceries", "food", "ruoka", "kauppa"],
    entertainment: [
      "entertainment",
      "viihde",
      "games",
      "pelit",
      "elokuvat",
      "movies",
    ],
    dining: [
      "restaurant",
      "ravintola",
      "wolt",
      "foodora",
      "delivery",
      "eating out",
    ],
    shopping: ["shopping", "ostokset", "clothes", "vaatteet"],
    transportation: ["transport", "kulku", "hsl", "taxi"],
    coffee: ["coffee", "kahvi", "café", "espresso", "starbucks"],
    onlineShopping: [
      "online shopping",
      "temu",
      "amazon",
      "zalando",
      "verkkokauppa",
      "nettiostokset",
    ],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      categories.push(category);
    }
  }

  return categories;
}

/**
 * Extract percentage from text (e.g., "reduce by 20%")
 */
function extractPercentage(text: string): number | null {
  const percentMatch = text.match(/(\d+)\s*%/);
  if (percentMatch) {
    return parseInt(percentMatch[1]) / 100;
  }

  // Finnish: "20 prosenttia"
  const finnishMatch = text.match(/(\d+)\s*prosentt/);
  if (finnishMatch) {
    return parseInt(finnishMatch[1]) / 100;
  }

  return null;
}

/**
 * Extract money amount from text (e.g., "pay extra 50€")
 */
function extractMoneyAmount(text: string): number {
  const euroMatch = text.match(/(\d+)\s*€/);
  if (euroMatch) {
    return parseInt(euroMatch[1]);
  }

  const euroWordMatch = text.match(/(\d+)\s*euro/);
  if (euroWordMatch) {
    return parseInt(euroWordMatch[1]);
  }

  return 50; // Default extra payment
}

/**
 * Add months to ISO date string
 */
function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}
