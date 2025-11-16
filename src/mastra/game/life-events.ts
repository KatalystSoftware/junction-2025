/**
 * Life Events System
 *
 * Handles random life events that affect character progression
 */

import type { Character } from "../types/game-types.ts";
import {
  type LifeEvent,
  type LifeEventDefinition,
  type LifeEventType,
  FinancialStage,
} from "../types/progression-types.ts";

/**
 * Life event pools by category
 */
const CAREER_EVENTS: LifeEventDefinition[] = [
  {
    id: "promotion_small",
    type: "career",
    name: "Promotion",
    description: "Got promoted at work with a salary increase",
    probability: 0.3,
    financialImpact: {
      monthlyIncomeRange: { min: 300, max: 800 },
    },
    minStage: FinancialStage.INSTABILITY,
    maxStage: FinancialStage.PROSPERITY,
  },
  {
    id: "bonus",
    type: "career",
    name: "Work Bonus",
    description: "Received performance bonus from employer",
    probability: 0.25,
    financialImpact: {
      oneTimeRange: { min: 2000, max: 15000 },
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "job_loss",
    type: "career",
    name: "Job Loss",
    description: "Lost job, income reduced to unemployment benefits",
    probability: 0.15,
    financialImpact: {
      monthlyIncomeRange: { min: -1500, max: -500 },
    },
    minStage: FinancialStage.INSTABILITY,
    maxStage: FinancialStage.ACTIVE_INVESTING,
  },
  {
    id: "side_gig",
    type: "career",
    name: "Side Gig Opportunity",
    description: "Started freelance work on the side",
    probability: 0.2,
    financialImpact: {
      monthlyIncomeRange: { min: 200, max: 500 },
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "certification",
    type: "career",
    name: "Professional Certification",
    description:
      "Completed professional certification, opens new opportunities",
    probability: 0.1,
    financialImpact: {
      oneTimeRange: { min: -1000, max: -500 }, // Cost of certification
    },
    minStage: FinancialStage.STABILITY,
  },
];

const PERSONAL_EVENTS: LifeEventDefinition[] = [
  {
    id: "marriage",
    type: "personal",
    name: "Marriage",
    description: "Got married, combined finances",
    probability: 0.15,
    financialImpact: {
      monthlyExpenseRange: { min: -200, max: 200 }, // Shared expenses
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "children",
    type: "personal",
    name: "New Baby",
    description: "Welcomed a child, increased expenses",
    probability: 0.1,
    financialImpact: {
      monthlyExpenseRange: { min: 400, max: 800 },
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "health_issue",
    type: "personal",
    name: "Health Issue",
    description: "Medical emergency with costs",
    probability: 0.12,
    financialImpact: {
      oneTimeRange: { min: -10000, max: -1000 },
    },
  },
  {
    id: "moving_in",
    type: "personal",
    name: "Moving In Together",
    description: "Moved in with partner, reduced living costs",
    probability: 0.15,
    financialImpact: {
      monthlyExpenseRange: { min: -400, max: -200 },
    },
    minStage: FinancialStage.INSTABILITY,
    maxStage: FinancialStage.SAVING,
  },
  {
    id: "early_retirement",
    type: "personal",
    name: "Early Retirement",
    description: "Achieved financial independence, retiring early",
    probability: 0.05,
    financialImpact: {
      monthlyIncomeRange: { min: -2000, max: 0 }, // Reduced income
      monthlyExpenseRange: { min: -500, max: 0 }, // Lower expenses
    },
    minStage: FinancialStage.PROSPERITY,
    requiresSuccessPath: [
      "stock_market_investor",
      "real_estate_investor",
      "tech_entrepreneur",
    ],
  },
  {
    id: "traditional_retirement",
    type: "personal",
    name: "Retirement",
    description: "Retiring at traditional age, living on pension and savings",
    probability: 0.08,
    financialImpact: {
      monthlyIncomeRange: { min: -1500, max: -500 }, // Pension income
      monthlyExpenseRange: { min: -300, max: 100 }, // Variable expenses
    },
    minStage: FinancialStage.SAVING,
  },
  {
    id: "career_peak",
    type: "personal",
    name: "Career Peak Achievement",
    description:
      "Reached highest position in career, maximum earning potential",
    probability: 0.1,
    financialImpact: {
      monthlyIncomeRange: { min: 1000, max: 3000 },
    },
    minStage: FinancialStage.ACTIVE_INVESTING,
    requiresSuccessPath: ["corporate_career"],
  },
  {
    id: "divorce",
    type: "personal",
    name: "Divorce",
    description: "Marriage ended, assets divided",
    probability: 0.08,
    financialImpact: {
      oneTimeRange: { min: -50000, max: -10000 }, // Asset division
      monthlyExpenseRange: { min: 200, max: 600 }, // Separate living
    },
    minStage: FinancialStage.STABILITY,
  },
];

const WINDFALL_EVENTS: LifeEventDefinition[] = [
  {
    id: "inheritance_small",
    type: "windfall",
    name: "Small Inheritance",
    description: "Received inheritance from relative",
    probability: 0.1,
    financialImpact: {
      oneTimeRange: { min: 5000, max: 30000 },
    },
    minStage: FinancialStage.INSTABILITY,
    maxStage: FinancialStage.SAVING,
  },
  {
    id: "inheritance_large",
    type: "windfall",
    name: "Large Inheritance",
    description: "Received substantial inheritance",
    probability: 0.05,
    financialImpact: {
      oneTimeRange: { min: 50000, max: 100000 },
    },
    minStage: FinancialStage.SAVING,
  },
  {
    id: "lottery_small",
    type: "windfall",
    name: "Lottery Win",
    description: "Won small lottery prize",
    probability: 0.08,
    financialImpact: {
      oneTimeRange: { min: 500, max: 5000 },
    },
  },
  {
    id: "tax_refund",
    type: "windfall",
    name: "Tax Refund",
    description: "Received unexpected tax refund",
    probability: 0.2,
    financialImpact: {
      oneTimeRange: { min: 500, max: 3000 },
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "stock_options_vest",
    type: "windfall",
    name: "Stock Options Vested",
    description: "Company stock options vested",
    probability: 0.1,
    financialImpact: {
      oneTimeRange: { min: 5000, max: 50000 },
    },
    minStage: FinancialStage.SAVING,
    requiresSuccessPath: ["corporate_career", "tech_entrepreneur"],
  },
];

const SETBACK_EVENTS: LifeEventDefinition[] = [
  {
    id: "car_breakdown",
    type: "setback",
    name: "Car Breakdown",
    description: "Car needs expensive repairs",
    probability: 0.15,
    financialImpact: {
      oneTimeRange: { min: -5000, max: -1000 },
    },
  },
  {
    id: "home_emergency",
    type: "setback",
    name: "Home Emergency",
    description: "Unexpected home repair needed",
    probability: 0.12,
    financialImpact: {
      oneTimeRange: { min: -10000, max: -2000 },
    },
    minStage: FinancialStage.SAVING,
  },
  {
    id: "identity_theft",
    type: "setback",
    name: "Identity Theft",
    description: "Victim of identity theft, recovery costs",
    probability: 0.05,
    financialImpact: {
      oneTimeRange: { min: -5000, max: -500 },
    },
  },
  {
    id: "pet_emergency",
    type: "setback",
    name: "Pet Emergency",
    description: "Pet needs emergency veterinary care",
    probability: 0.1,
    financialImpact: {
      oneTimeRange: { min: -3000, max: -500 },
    },
    minStage: FinancialStage.STABILITY,
  },
  {
    id: "scam_victim",
    type: "setback",
    name: "Fell for Scam",
    description: "Lost money to a financial scam",
    probability: 0.08,
    financialImpact: {
      oneTimeRange: { min: -5000, max: -200 },
    },
    maxStage: FinancialStage.SAVING,
  },
];

const OPPORTUNITY_EVENTS: LifeEventDefinition[] = [
  {
    id: "business_partnership",
    type: "opportunity",
    name: "Business Partnership Offer",
    description: "Friend wants to start business together",
    probability: 0.1,
    financialImpact: {
      oneTimeRange: { min: -10000, max: -5000 }, // Initial investment
    },
    minStage: FinancialStage.SAVING,
    requiresSuccessPath: ["small_business_owner", "tech_entrepreneur"],
  },
  {
    id: "real_estate_opportunity",
    type: "opportunity",
    name: "Real Estate Investment",
    description: "Good deal on rental property",
    probability: 0.08,
    financialImpact: {
      oneTimeRange: { min: -30000, max: -15000 }, // Down payment
    },
    minStage: FinancialStage.SAVING,
    requiresSuccessPath: ["real_estate_investor"],
  },
  {
    id: "startup_equity",
    type: "opportunity",
    name: "Startup Equity Offer",
    description: "Friend's startup offering early employee equity",
    probability: 0.05,
    financialImpact: {},
    minStage: FinancialStage.STABILITY,
    requiresSuccessPath: ["tech_entrepreneur", "stock_market_investor"],
  },
  {
    id: "consulting_gig",
    type: "opportunity",
    name: "Consulting Opportunity",
    description: "High-paying consulting project offered",
    probability: 0.12,
    financialImpact: {
      oneTimeRange: { min: 3000, max: 10000 },
    },
    minStage: FinancialStage.SAVING,
  },
];

/**
 * All life events pool
 */
const ALL_LIFE_EVENTS = [
  ...CAREER_EVENTS,
  ...PERSONAL_EVENTS,
  ...WINDFALL_EVENTS,
  ...SETBACK_EVENTS,
  ...OPPORTUNITY_EVENTS,
];

/**
 * Base probabilities by stage (chance per consultation)
 */
const STAGE_EVENT_PROBABILITIES: Record<FinancialStage, number> = {
  [FinancialStage.CRISIS]: 0.15, // More frequent events in crisis
  [FinancialStage.INSTABILITY]: 0.18,
  [FinancialStage.STABILITY]: 0.2,
  [FinancialStage.SAVING]: 0.2,
  [FinancialStage.ACTIVE_INVESTING]: 0.18,
  [FinancialStage.PROSPERITY]: 0.15,
  [FinancialStage.WEALTH]: 0.12,
  [FinancialStage.EXTREME_SUCCESS]: 0.1, // Fewer random events for billionaires
};

/**
 * Trigger a random life event for character
 */
export function triggerLifeEvent(character: Character): LifeEvent | null {
  const currentStage =
    character.financialState?.currentStage ?? FinancialStage.INSTABILITY;
  const baseProbability = STAGE_EVENT_PROBABILITIES[currentStage];

  // Random chance - should event trigger?
  if (Math.random() > baseProbability) {
    return null; // No event this time
  }

  // Filter eligible events for this character
  const eligibleEvents = ALL_LIFE_EVENTS.filter((event) => {
    // Check stage constraints
    if (event.minStage !== undefined && currentStage < event.minStage)
      return false;
    if (event.maxStage !== undefined && currentStage > event.maxStage)
      return false;

    // Check success path requirements
    if (event.requiresSuccessPath && event.requiresSuccessPath.length > 0) {
      const characterPath = character.financialState?.selectedSuccessPath;
      if (
        !characterPath ||
        !event.requiresSuccessPath.includes(characterPath)
      ) {
        return false;
      }
    }

    return true;
  });

  if (eligibleEvents.length === 0) {
    return null; // No eligible events
  }

  // Weighted random selection
  const totalProbability = eligibleEvents.reduce(
    (sum, e) => sum + e.probability,
    0,
  );
  let random = Math.random() * totalProbability;

  for (const eventDef of eligibleEvents) {
    random -= eventDef.probability;
    if (random <= 0) {
      return generateLifeEvent(eventDef);
    }
  }

  // Fallback - just pick first eligible event
  return generateLifeEvent(eligibleEvents[0]);
}

/**
 * Generate actual life event from definition
 */
function generateLifeEvent(definition: LifeEventDefinition): LifeEvent {
  const financialImpact: LifeEvent["financialImpact"] = {};

  // Generate random values within ranges
  if (definition.financialImpact.oneTimeRange) {
    const { min, max } = definition.financialImpact.oneTimeRange;
    financialImpact.oneTime = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  if (definition.financialImpact.monthlyIncomeRange) {
    const { min, max } = definition.financialImpact.monthlyIncomeRange;
    financialImpact.monthlyIncome =
      Math.floor(Math.random() * (max - min + 1)) + min;
  }

  if (definition.financialImpact.monthlyExpenseRange) {
    const { min, max } = definition.financialImpact.monthlyExpenseRange;
    financialImpact.monthlyExpense =
      Math.floor(Math.random() * (max - min + 1)) + min;
  }

  if (definition.financialImpact.netWorthChangeRange) {
    const { min, max } = definition.financialImpact.netWorthChangeRange;
    financialImpact.netWorthChange =
      Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return {
    id: `${definition.id}_${Date.now()}`,
    type: definition.type,
    name: definition.name,
    description: definition.description,
    date: new Date().toISOString().split("T")[0],
    financialImpact,
    scenarioCreated: definition.scenarioTemplate,
    unlocks: definition.unlocksScenarios,
    locks: definition.locksScenarios,
  };
}

/**
 * Apply life event to character financial state
 */
export function applyLifeEvent(character: Character, event: LifeEvent): void {
  if (!character.financialState) return;

  const impact = event.financialImpact;

  // Apply one-time changes
  if (impact.oneTime) {
    character.financialState.netWorth += impact.oneTime;
    character.financialState.liquidSavings += impact.oneTime;
  }

  // Apply monthly income changes
  if (impact.monthlyIncome) {
    character.financialState.monthlyIncome += impact.monthlyIncome;

    // Record in income history
    character.financialState.incomeHistory.push({
      date: event.date,
      amount: character.financialState.monthlyIncome,
    });
  }

  // Apply monthly expense changes
  if (impact.monthlyExpense) {
    character.financialState.monthlyExpenses += impact.monthlyExpense;
  }

  // Apply net worth changes
  if (impact.netWorthChange) {
    character.financialState.netWorth += impact.netWorthChange;
  }

  // Record event in major events
  character.financialState.majorEvents =
    character.financialState.majorEvents ?? [];
  character.financialState.majorEvents.push(event);

  // Add to net worth history
  character.financialState.netWorthHistory.push({
    date: event.date,
    amount: character.financialState.netWorth,
  });
}

/**
 * Get event description for character dialogue
 */
export function getEventDialogueHook(event: LifeEvent): string {
  const impact = event.financialImpact;

  let desc = event.description;

  // Add financial details
  if (impact.oneTime && impact.oneTime > 0) {
    desc += ` I received €${Math.abs(impact.oneTime).toLocaleString("fi-FI")}!`;
  } else if (impact.oneTime && impact.oneTime < 0) {
    desc += ` It cost me €${Math.abs(impact.oneTime).toLocaleString("fi-FI")}.`;
  }

  if (impact.monthlyIncome && impact.monthlyIncome > 0) {
    desc += ` My income increased by €${Math.abs(impact.monthlyIncome).toLocaleString("fi-FI")}/month!`;
  } else if (impact.monthlyIncome && impact.monthlyIncome < 0) {
    desc += ` My income dropped by €${Math.abs(impact.monthlyIncome).toLocaleString("fi-FI")}/month.`;
  }

  if (impact.monthlyExpense && impact.monthlyExpense > 0) {
    desc += ` My expenses went up by €${Math.abs(impact.monthlyExpense).toLocaleString("fi-FI")}/month.`;
  } else if (impact.monthlyExpense && impact.monthlyExpense < 0) {
    desc += ` My expenses went down by €${Math.abs(impact.monthlyExpense).toLocaleString("fi-FI")}/month.`;
  }

  return desc;
}

/**
 * Get events summary for stats display
 */
export function getEventsSummary(character: Character): {
  total: number;
  byType: Record<LifeEventType, number>;
  recent: LifeEvent[];
} {
  const events = character.financialState?.majorEvents ?? [];

  const byType: Record<LifeEventType, number> = {
    career: 0,
    personal: 0,
    windfall: 0,
    setback: 0,
    opportunity: 0,
  };

  for (const event of events) {
    byType[event.type]++;
  }

  // Get 5 most recent events
  const recent = events.slice(-5).reverse();

  return {
    total: events.length,
    byType,
    recent,
  };
}
