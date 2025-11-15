/**
 * Progress Visualization & Achievement System
 *
 * Handles:
 * - Mini-feedback hints after each session
 * - Skill trend tracking
 * - Milestone detection
 * - Achievement unlocking
 */

import type {
  AdvisorState,
  ConsultationSession,
  FinancialTopic,
} from "../types/game-types.ts";

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "progress" | "skill" | "finance" | "relationship" | "special";
  coinReward: number;
  unlockedAt?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Progress achievements
  {
    id: "first_client",
    name: "First Steps",
    description: "Help your first client",
    icon: "🎯",
    category: "progress",
    coinReward: 50,
  },
  {
    id: "ten_clients",
    name: "Growing Practice",
    description: "Help 10 clients",
    icon: "📈",
    category: "progress",
    coinReward: 100,
  },
  {
    id: "fifty_clients",
    name: "Trusted Advisor",
    description: "Help 50 clients",
    icon: "⭐",
    category: "progress",
    coinReward: 250,
  },

  // Skill achievements
  {
    id: "skill_level_3",
    name: "Competent Advisor",
    description: "Reach skill level 3",
    icon: "📚",
    category: "skill",
    coinReward: 75,
  },
  {
    id: "skill_level_5",
    name: "Expert Advisor",
    description: "Reach skill level 5",
    icon: "🎓",
    category: "skill",
    coinReward: 150,
  },
  {
    id: "skill_level_8",
    name: "Master Advisor",
    description: "Reach skill level 8",
    icon: "🏆",
    category: "skill",
    coinReward: 300,
  },
  {
    id: "perfect_score",
    name: "Flawless Advice",
    description: "Get a perfect 10/10 quality score",
    icon: "💎",
    category: "skill",
    coinReward: 100,
  },

  // Financial achievements
  {
    id: "savings_10k",
    name: "Savings Champion",
    description: "Help clients save €10,000",
    icon: "💰",
    category: "finance",
    coinReward: 200,
  },
  {
    id: "debt_crusher",
    name: "Debt Crusher",
    description: "Help clients clear €5,000 in debt",
    icon: "💪",
    category: "finance",
    coinReward: 200,
  },
  {
    id: "millionaire_maker",
    name: "Millionaire Maker",
    description: "Help clients save €100,000 total",
    icon: "🌟",
    category: "finance",
    coinReward: 1000,
  },

  // Relationship achievements
  {
    id: "trusted_friend",
    name: "Trusted Friend",
    description: "Get a character recommendation",
    icon: "🤝",
    category: "relationship",
    coinReward: 100,
  },
  {
    id: "reputation_75",
    name: "Well Respected",
    description: "Reach 75 reputation",
    icon: "⭐",
    category: "relationship",
    coinReward: 150,
  },
  {
    id: "reputation_100",
    name: "Legendary Advisor",
    description: "Reach maximum reputation (100)",
    icon: "👑",
    category: "relationship",
    coinReward: 500,
  },

  // Topic mastery achievements
  {
    id: "budget_master",
    name: "Budget Master",
    description: "Reach level 7 in budgeting",
    icon: "📊",
    category: "skill",
    coinReward: 100,
  },
  {
    id: "debt_specialist",
    name: "Debt Specialist",
    description: "Reach level 7 in debt management",
    icon: "🎯",
    category: "skill",
    coinReward: 100,
  },
  {
    id: "investment_guru",
    name: "Investment Guru",
    description: "Reach level 7 in investing",
    icon: "💹",
    category: "skill",
    coinReward: 100,
  },

  // Special achievements
  {
    id: "empathy_streak",
    name: "Heart of Gold",
    description: "Show empathy in 5 consecutive sessions",
    icon: "❤️",
    category: "special",
    coinReward: 150,
  },
  {
    id: "quick_learner",
    name: "Quick Learner",
    description: "Pass a boss quiz with 100% score",
    icon: "🧠",
    category: "special",
    coinReward: 200,
  },
];

// ============================================================================
// MILESTONE DEFINITIONS
// ============================================================================

export interface Milestone {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: "skill" | "reputation" | "clients" | "finance" | "achievement";
}

// ============================================================================
// ACHIEVEMENT CHECKING
// ============================================================================

export function checkForNewAchievements(
  advisorState: AdvisorState,
  lastSession?: ConsultationSession,
): Achievement[] {
  const newAchievements: Achievement[] = [];
  const unlocked = new Set(advisorState.achievementsUnlocked);

  // Progress achievements
  if (advisorState.totalClientsHelped === 1 && !unlocked.has("first_client")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "first_client")!);
  }
  if (advisorState.totalClientsHelped === 10 && !unlocked.has("ten_clients")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "ten_clients")!);
  }
  if (advisorState.totalClientsHelped === 50 && !unlocked.has("fifty_clients")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "fifty_clients")!);
  }

  // Skill level achievements
  if (advisorState.skillLevel >= 3 && !unlocked.has("skill_level_3")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "skill_level_3")!);
  }
  if (advisorState.skillLevel >= 5 && !unlocked.has("skill_level_5")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "skill_level_5")!);
  }
  if (advisorState.skillLevel >= 8 && !unlocked.has("skill_level_8")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "skill_level_8")!);
  }

  // Perfect score
  if (
    lastSession &&
    lastSession.adviceQualityScore === 10 &&
    !unlocked.has("perfect_score")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "perfect_score")!);
  }

  // Financial achievements
  if (
    advisorState.lifetimeSavingsGenerated >= 10000 &&
    !unlocked.has("savings_10k")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "savings_10k")!);
  }
  if (
    advisorState.lifetimeDebtCleared >= 5000 &&
    !unlocked.has("debt_crusher")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "debt_crusher")!);
  }
  if (
    advisorState.lifetimeSavingsGenerated >= 100000 &&
    !unlocked.has("millionaire_maker")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "millionaire_maker")!);
  }

  // Reputation achievements
  if (advisorState.reputation >= 75 && !unlocked.has("reputation_75")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "reputation_75")!);
  }
  if (advisorState.reputation >= 100 && !unlocked.has("reputation_100")) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "reputation_100")!);
  }

  // Topic mastery achievements
  if (
    advisorState.topicsExpertise.budgeting >= 7 &&
    !unlocked.has("budget_master")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "budget_master")!);
  }
  if (
    advisorState.topicsExpertise.debt_management >= 7 &&
    !unlocked.has("debt_specialist")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "debt_specialist")!);
  }
  if (
    advisorState.topicsExpertise.investing >= 7 &&
    !unlocked.has("investment_guru")
  ) {
    newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "investment_guru")!);
  }

  // Special: Empathy streak
  if (!unlocked.has("empathy_streak")) {
    const last5 = advisorState.sessionHistory.slice(-5);
    if (
      last5.length === 5 &&
      last5.every((s) => s.evaluation?.wasEmpathetic === true)
    ) {
      newAchievements.push(ACHIEVEMENTS.find((a) => a.id === "empathy_streak")!);
    }
  }

  return newAchievements;
}

// ============================================================================
// MILESTONE DETECTION
// ============================================================================

export function checkForMilestones(
  previousState: AdvisorState,
  currentState: AdvisorState,
  lastSession?: ConsultationSession,
): Milestone[] {
  const milestones: Milestone[] = [];

  // Skill level up (whole number crossed)
  const prevSkillFloor = Math.floor(previousState.skillLevel);
  const currSkillFloor = Math.floor(currentState.skillLevel);
  if (currSkillFloor > prevSkillFloor) {
    milestones.push({
      id: `skill_level_${currSkillFloor}`,
      title: "Level Up!",
      message: `Your skill level increased to ${currSkillFloor}!`,
      icon: "⬆️",
      type: "skill",
    });
  }

  // Reputation milestones
  const repMilestones = [25, 50, 75, 100];
  for (const milestone of repMilestones) {
    if (previousState.reputation < milestone && currentState.reputation >= milestone) {
      milestones.push({
        id: `reputation_${milestone}`,
        title: "Reputation Milestone!",
        message: `You've reached ${milestone} reputation!`,
        icon: "⭐",
        type: "reputation",
      });
    }
  }

  // Perfect score
  if (lastSession && lastSession.adviceQualityScore === 10) {
    milestones.push({
      id: "perfect_score_session",
      title: "Perfect Advice!",
      message: "You gave flawless advice! Quality score: 10/10",
      icon: "💎",
      type: "skill",
    });
  }

  // First client
  if (currentState.totalClientsHelped === 1) {
    milestones.push({
      id: "first_client_milestone",
      title: "First Client Helped!",
      message: "Congratulations on helping your first client!",
      icon: "🎉",
      type: "clients",
    });
  }

  // Client count milestones
  const clientMilestones = [5, 10, 25, 50, 100];
  for (const count of clientMilestones) {
    if (
      previousState.totalClientsHelped < count &&
      currentState.totalClientsHelped >= count
    ) {
      milestones.push({
        id: `clients_${count}`,
        title: "Client Milestone!",
        message: `You've helped ${count} clients!`,
        icon: "🎯",
        type: "clients",
      });
    }
  }

  // Financial milestones
  const savingsMilestones = [1000, 5000, 10000, 50000];
  for (const amount of savingsMilestones) {
    if (
      previousState.lifetimeSavingsGenerated < amount &&
      currentState.lifetimeSavingsGenerated >= amount
    ) {
      milestones.push({
        id: `savings_${amount}`,
        title: "Savings Impact!",
        message: `Your advice has helped clients save €${amount.toLocaleString()}!`,
        icon: "💰",
        type: "finance",
      });
    }
  }

  return milestones;
}

// ============================================================================
// MINI-FEEDBACK GENERATION
// ============================================================================

export function generateMiniFeedback(session: ConsultationSession): string {
  const score = session.adviceQualityScore;
  const evaluation = session.evaluation;

  // Perfect score
  if (score === 10) {
    return "💎 Perfect! Keep up this level of excellence!";
  }

  // High score
  if (score >= 8) {
    const tips = [
      "🌟 Great job! Small refinements will make you even better.",
      "✨ Excellent work! You're on the path to mastery.",
      "👏 Strong advice! Keep building on this foundation.",
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Good score - give specific feedback
  if (score >= 6) {
    if (evaluation?.wasEmpathetic === false) {
      return "💡 Tip: Show more empathy - acknowledge their feelings first.";
    }
    if (evaluation?.wasActionable === false) {
      return "💡 Tip: Give specific, actionable steps they can follow.";
    }
    if (evaluation?.missedOpportunities && evaluation.missedOpportunities.length > 0) {
      return `💡 Tip: ${evaluation.missedOpportunities[0]}`;
    }
    return "💡 Good effort! Focus on being more specific and actionable.";
  }

  // Struggling - give constructive feedback
  if (score >= 4) {
    if (evaluation?.weaknesses && evaluation.weaknesses.length > 0) {
      return `⚠️ Focus on: ${evaluation.weaknesses[0]}`;
    }
    if (evaluation?.wasAccurate === false) {
      return "⚠️ Tip: Double-check your financial facts and calculations.";
    }
    return "⚠️ Tip: Break problems down step-by-step, one issue at a time.";
  }

  // Poor score - encourage improvement
  if (evaluation?.weaknesses && evaluation.weaknesses.length > 0) {
    return `📚 To improve: ${evaluation.weaknesses[0]}`;
  }
  return "📚 Tip: Review learning materials and take time to understand the situation.";
}

// ============================================================================
// SKILL TREND TRACKING
// ============================================================================

export interface SkillTrendPoint {
  sessionNumber: number;
  skillLevel: number;
  reputation: number;
  qualityScore: number;
}

export function getSkillTrend(
  sessionHistory: ConsultationSession[],
  startingSkillLevel: number = 1,
): SkillTrendPoint[] {
  const trend: SkillTrendPoint[] = [];

  // Start point
  let currentSkill = startingSkillLevel;
  let currentRep = 70;

  // Calculate trend from sessions (last 10)
  const recentSessions = sessionHistory.slice(-10);

  recentSessions.forEach((session, index) => {
    // Approximate skill/rep at that point (simplified)
    // In real implementation, you'd track this per session
    trend.push({
      sessionNumber: sessionHistory.length - recentSessions.length + index + 1,
      skillLevel: currentSkill,
      reputation: currentRep,
      qualityScore: session.adviceQualityScore,
    });

    // Estimate changes (simplified)
    const scoreChange = (session.adviceQualityScore - 5) * 0.02;
    currentSkill = Math.max(0, Math.min(10, currentSkill + scoreChange));
    currentRep = Math.max(0, Math.min(100, currentRep + (session.adviceQualityScore - 5) * 2));
  });

  return trend;
}

export function createSkillTrendGraph(trend: SkillTrendPoint[]): string[] {
  if (trend.length === 0) {
    return ["No session history yet"];
  }

  const lines: string[] = [];
  const height = 10;
  const width = Math.min(trend.length, 20);

  // Normalize skill levels to graph height (0-10 scale to 0-height)
  const normalizedPoints = trend.slice(-width).map((p) => ({
    ...p,
    y: Math.round((p.skillLevel / 10) * (height - 1)),
  }));

  // Draw graph top to bottom
  for (let row = height - 1; row >= 0; row--) {
    let line = "";
    const skillValue = ((row / (height - 1)) * 10).toFixed(1);
    line += skillValue.padStart(4) + " │";

    for (let col = 0; col < normalizedPoints.length; col++) {
      const point = normalizedPoints[col];
      if (point.y === row) {
        line += "●";
      } else if (col > 0 && isBetween(row, normalizedPoints[col - 1].y, point.y)) {
        line += "│";
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  // Add x-axis
  const xAxis = "     └" + "─".repeat(normalizedPoints.length);
  lines.push(xAxis);
  lines.push(`      Last ${normalizedPoints.length} sessions`);

  return lines;
}

function isBetween(value: number, a: number, b: number): boolean {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return value > min && value < max;
}

// ============================================================================
// BOSS REVIEW COUNTDOWN
// ============================================================================

export function getSessionsUntilBossReview(advisorState: AdvisorState): number {
  const sessionsSinceReview = advisorState.totalSessions - advisorState.lastReviewSession;

  // Boss review happens between 3-5 sessions
  // Show countdown starting from session 3
  if (sessionsSinceReview >= 3) {
    return Math.max(0, 5 - sessionsSinceReview);
  }

  return 3 - sessionsSinceReview;
}

export function getBossReviewStatus(advisorState: AdvisorState): string {
  const remaining = getSessionsUntilBossReview(advisorState);

  if (remaining === 0) {
    return "👔 Boss review coming up!";
  } else if (remaining === 1) {
    return "👔 Boss review in 1 session";
  } else {
    return `👔 Boss review in ${remaining} sessions`;
  }
}
