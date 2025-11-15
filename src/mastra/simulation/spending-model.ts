/**
 * Elämäpeli 2025 - Spending Model Generator
 * Generate personality-driven spending behavior
 *
 * Converts character personality + financial profile into realistic spending patterns:
 * - Fixed expenses (rent, utilities, subscriptions)
 * - Variable expenses (groceries, dining, entertainment)
 * - Personality-driven habits (coffee, online shopping, impulse purchases)
 */

import type { Character, CharacterPersonality } from "../types/game-types.ts";
import type {
  SpendingModel,
  MonthlyExpense,
  ExpenseRange,
  CoffeeHabit,
  OnlineShoppingHabit,
} from "./simulation-types.ts";

/**
 * Generate complete spending model from character data
 */
export function generateSpendingModel(character: Character): SpendingModel {
  const { personality, financialProfile, occupation } = character;
  const { monthlyExpenses, subscriptions } = financialProfile;

  return {
    // Fixed expenses from financial profile
    rent: {
      amount: monthlyExpenses.rent || 0,
      dayOfMonth: 1,
      description: "Rent payment",
    },

    utilities: {
      amount: monthlyExpenses.utilities || 0,
      dayOfMonth: 5,
      description: "Utilities (electricity, water, internet)",
    },

    subscriptions: subscriptions.map((sub) => ({
      amount: sub.monthlyCost,
      dayOfMonth: randomDay(1, 28),
      description: sub.name,
    })),

    // Variable expenses with realistic ranges
    groceries: {
      min: (monthlyExpenses.groceries || 0) * 0.85,
      max: (monthlyExpenses.groceries || 0) * 1.15,
      frequency: 4, // ~weekly shopping trips
    },

    // Dining/restaurants (scaled from "other" expenses)
    dining: {
      min: (monthlyExpenses.other || 0) * 0.15,
      max: (monthlyExpenses.other || 0) * 0.4,
      frequency: calculateDiningFrequency(personality),
    },

    // Coffee habit
    coffee: {
      hasDailyHabit: hasCoffeeHabit(personality, occupation),
      frequency: hasCoffeeHabit(personality, occupation)
        ? randomInt(15, 22)
        : 0,
      amountRange: [2.5, 5.0],
    },

    transportation: {
      min: (monthlyExpenses.transportation || 0) * 0.8,
      max: (monthlyExpenses.transportation || 0) * 1.2,
      frequency: getTransportFrequency(occupation),
    },

    entertainment: {
      min: (monthlyExpenses.other || 0) * 0.2,
      max: (monthlyExpenses.other || 0) * 0.5,
      frequency: calculateEntertainmentFrequency(personality),
    },

    // Online shopping
    onlineShopping: {
      monthlyBudget:
        (monthlyExpenses.other || 0) * (0.1 + personality.impulsiveness * 0.3),
      frequency: Math.floor(1 + personality.impulsiveness * 4), // 1-5 purchases
      prefersCheapMarketplaces: personality.impulsiveness > 0.6,
    },

    // Personality-driven impulse behavior
    impulsePurchaseChance: personality.impulsiveness * 0.2, // 0-20% per month
    impulsePurchaseRange: [10, Math.min(personality.impulsiveness * 150, 100)],

    savingsRate: personality.financial_literacy * 0.25,
  };
}

/**
 * Calculate how often character dines out/orders food
 * Impulsive + emotional people eat out more
 */
function calculateDiningFrequency(personality: CharacterPersonality): number {
  const base = 4; // 4 times per month baseline
  const impulsiveBonus = personality.impulsiveness * 8; // +0-8
  const emotionalBonus = personality.emotionality * 4; // +0-4 (comfort food)
  return Math.floor(base + impulsiveBonus + emotionalBonus);
}

/**
 * Determine if character has daily coffee habit
 * Office workers, nurses, stressed/emotional people drink coffee daily
 */
function hasCoffeeHabit(
  personality: CharacterPersonality,
  occupation: string,
): boolean {
  // Stressful jobs = coffee habit
  const stressfulJob = ["office", "nurse", "teacher", "retail"].some((job) =>
    occupation.toLowerCase().includes(job),
  );
  const emotionalPerson = personality.emotionality > 0.5;

  return stressfulJob || emotionalPerson || Math.random() > 0.6;
}

/**
 * Calculate entertainment frequency
 * Emotional people seek entertainment more
 */
function calculateEntertainmentFrequency(
  personality: CharacterPersonality,
): number {
  const base = 2; // 2 times per month baseline
  const emotionalBonus = personality.emotionality * 4; // +0-4
  return Math.floor(base + emotionalBonus);
}

/**
 * Get transportation frequency based on occupation
 * Daily commuters need more transport
 */
function getTransportFrequency(occupation: string): number {
  const dailyCommute = ["retail worker", "nurse", "office worker", "teacher"];
  return dailyCommute.some((occ) => occupation.toLowerCase().includes(occ))
    ? 20
    : 10;
}

/**
 * Random day of month (1-28 to avoid month-end issues)
 */
function randomDay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random integer in range
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
