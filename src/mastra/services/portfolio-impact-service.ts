/**
 * Portfolio Impact Service
 *
 * Manages real-time portfolio impact growth for advisors.
 * Calculates growth rates based on completed consultations and
 * incrementally updates portfolio impact values.
 */

import type { AdvisorState } from "../types/game-types.ts";

export interface PortfolioGrowthRate {
  savingsPerMinute: number;
  debtReductionPerMinute: number;
  totalPerMinute: number;
  activeClients: number;
  lastCalculated: number; // timestamp
}

export interface PortfolioImpactDelta {
  savings: number;
  debtReduction: number;
  total: number;
  timestamp: number;
}

/**
 * In-memory store for growth rates per session
 * Key: sessionId, Value: growth rate data
 */
const growthRates = new Map<string, PortfolioGrowthRate>();

/**
 * Recent deltas for smooth UI updates
 * Key: sessionId, Value: array of recent deltas (last 10)
 */
const recentDeltas = new Map<string, PortfolioImpactDelta[]>();

/**
 * Calculate portfolio growth rate based on advisor's performance
 *
 * Growth formula:
 * - Base: €0.10 per minute per client helped
 * - Multiplier: Based on average coins earned (proxy for advice quality)
 * - Scaling: Increases with more clients and better advice
 * - Penalties: Bad advice, interventions, and poor performance cause negative growth
 */
export function calculateGrowthRate(advisorState: AdvisorState): PortfolioGrowthRate {
  const {
    lifetimeSavingsGenerated,
    lifetimeDebtCleared,
    advisorCoins,
    totalClientsHelped,
    totalSessions,
    isFired,
    activeIntervention,
    criticalInterventionsForcedThrough,
    currentStreak,
    godBossRelationship,
  } = advisorState;

  // If advisor is FIRED, portfolio tanks hard
  if (isFired) {
    return {
      savingsPerMinute: -5.0,
      debtReductionPerMinute: -5.0,
      totalPerMinute: -10.0,
      activeClients: totalClientsHelped,
      lastCalculated: Date.now(),
    };
  }

  // Count active clients (those we've helped)
  const activeClients = totalClientsHelped;

  // Calculate average impact per session
  const avgImpactPerSession = totalSessions > 0
    ? (lifetimeSavingsGenerated + lifetimeDebtCleared) / totalSessions
    : 0;

  // Calculate quality multiplier (based on coins earned)
  const avgCoinsPerSession = totalSessions > 0
    ? advisorCoins / totalSessions
    : 0;

  // Base quality multiplier
  let qualityMultiplier = 1 + (avgCoinsPerSession / 100); // +1% per coin

  // NEGATIVE GROWTH FACTORS:

  // 1. Active boss intervention = BAD advice being given RIGHT NOW
  if (activeIntervention) {
    const severity = activeIntervention.severity;
    if (severity === "critical") {
      // Critical intervention = clients losing money due to bad advice
      qualityMultiplier -= 2.0; // -200% penalty
    } else {
      // Warning intervention = risky advice
      qualityMultiplier -= 0.5; // -50% penalty
    }
  }

  // 2. Critical interventions forced through = reckless behavior
  if (criticalInterventionsForcedThrough > 0) {
    // Each forced-through critical intervention causes ongoing damage
    qualityMultiplier -= criticalInterventionsForcedThrough * 0.3;
  }

  // 3. Negative performance streak = consistent poor advice
  if (currentStreak < 0) {
    // Negative streak reduces growth (each bad session = -10% growth)
    qualityMultiplier += currentStreak * 0.1; // currentStreak is negative
  }

  // 4. Very low boss relationship = clients are suffering
  if (godBossRelationship < 3) {
    // Boss unhappy = clients not doing well
    qualityMultiplier -= (3 - godBossRelationship) * 0.15;
  }

  // 5. Very low coins per session = objectively bad advice
  if (totalSessions > 3 && avgCoinsPerSession < 2) {
    // Consistently earning very few coins = bad outcomes
    qualityMultiplier -= 0.5;
  }

  // Base rate: €0.10 per minute per active client
  const baseRatePerClient = 0.10;
  const baseRate = activeClients * baseRatePerClient;

  // Apply quality multiplier (can now be negative!)
  let totalPerMinute = baseRate * qualityMultiplier;

  // Minimum cap: Don't let it decay TOO fast (unless fired)
  if (totalPerMinute < -5.0 && !isFired) {
    totalPerMinute = -5.0;
  }

  // Split between savings and debt reduction
  const savingsRatio = lifetimeSavingsGenerated > 0
    ? lifetimeSavingsGenerated / (lifetimeSavingsGenerated + lifetimeDebtCleared + 1)
    : 0.7;

  const savingsPerMinute = totalPerMinute * savingsRatio;
  const debtReductionPerMinute = totalPerMinute * (1 - savingsRatio);

  return {
    savingsPerMinute,
    debtReductionPerMinute,
    totalPerMinute,
    activeClients,
    lastCalculated: Date.now(),
  };
}

/**
 * Update growth rate for a session
 */
export function updateGrowthRate(sessionId: string, advisorState: AdvisorState): PortfolioGrowthRate {
  const rate = calculateGrowthRate(advisorState);
  growthRates.set(sessionId, rate);
  return rate;
}

/**
 * Get current growth rate for a session
 */
export function getGrowthRate(sessionId: string): PortfolioGrowthRate | null {
  return growthRates.get(sessionId) || null;
}

/**
 * Apply growth increment to advisor state
 * Returns the delta that was applied
 *
 * NOTE: Can apply NEGATIVE deltas if performance is poor!
 */
export function applyGrowthIncrement(
  advisorState: AdvisorState,
  sessionId: string,
): PortfolioImpactDelta | null {
  const rate = growthRates.get(sessionId);
  if (!rate) {
    return null;
  }

  // Apply increment (rounded to 2 decimal places)
  // NOTE: Can be negative if advisor is performing poorly!
  const savingsDelta = Math.round(rate.savingsPerMinute * 100) / 100;
  const debtDelta = Math.round(rate.debtReductionPerMinute * 100) / 100;

  advisorState.lifetimeSavingsGenerated += savingsDelta;
  advisorState.lifetimeDebtCleared += debtDelta;

  // Don't let values go below 0 (can't have negative savings generated)
  if (advisorState.lifetimeSavingsGenerated < 0) {
    advisorState.lifetimeSavingsGenerated = 0;
  }
  if (advisorState.lifetimeDebtCleared < 0) {
    advisorState.lifetimeDebtCleared = 0;
  }

  const delta: PortfolioImpactDelta = {
    savings: savingsDelta,
    debtReduction: debtDelta,
    total: savingsDelta + debtDelta,
    timestamp: Date.now(),
  };

  // Store recent delta
  const deltas = recentDeltas.get(sessionId) || [];
  deltas.unshift(delta);
  if (deltas.length > 10) {
    deltas.pop(); // Keep only last 10
  }
  recentDeltas.set(sessionId, deltas);

  return delta;
}

/**
 * Get recent deltas for a session
 */
export function getRecentDeltas(sessionId: string): PortfolioImpactDelta[] {
  return recentDeltas.get(sessionId) || [];
}

/**
 * Clear growth data for a session (on session end)
 */
export function clearSessionGrowth(sessionId: string): void {
  growthRates.delete(sessionId);
  recentDeltas.delete(sessionId);
}

/**
 * Get all active sessions with growth rates
 */
export function getActiveGrowthSessions(): string[] {
  return Array.from(growthRates.keys());
}

/**
 * Calculate summary statistics
 */
export function getGrowthSummary(sessionId: string): {
  currentRate: PortfolioGrowthRate | null;
  recentGrowth: number; // Total growth in last 5 minutes
  projectedHourly: number;
  projectedDaily: number;
} {
  const rate = growthRates.get(sessionId);
  const deltas = recentDeltas.get(sessionId) || [];

  // Sum deltas from last 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentGrowth = deltas
    .filter(d => d.timestamp > fiveMinutesAgo)
    .reduce((sum, d) => sum + d.total, 0);

  const totalPerMinute = rate?.totalPerMinute || 0;

  return {
    currentRate: rate,
    recentGrowth: Math.round(recentGrowth * 100) / 100,
    projectedHourly: Math.round(totalPerMinute * 60 * 100) / 100,
    projectedDaily: Math.round(totalPerMinute * 60 * 24 * 100) / 100,
  };
}
