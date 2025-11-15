/**
 * Leaderboard Service
 * Manages all database operations for leaderboards, challenges, and social features
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type {
  LeaderboardEntry,
  LeaderboardCategory,
  LeaderboardRanking,
  CareerTier,
  CommunityChallenge,
  ChallengeParticipation,
  SharedCase,
  CaseReaction,
  CaseComment,
  WeeklyRanking,
  AdvisorState,
} from "../types/game-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LeaderboardService {
  private client;
  private initialized = false;

  constructor(dbPath = "file:../elamapeli.db") {
    this.client = createClient({
      url: dbPath,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const schemaPath = join(__dirname, "leaderboard-schema.sql");
      const schema = readFileSync(schemaPath, "utf-8");

      // Execute schema creation
      const statements = schema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await this.client.execute(statement);
      }

      this.initialized = true;
      console.log("✅ Leaderboard database initialized");
    } catch (error) {
      console.error("❌ Failed to initialize leaderboard database:", error);
      throw error;
    }
  }

  // ============================================================================
  // LEADERBOARD ENTRIES
  // ============================================================================

  /**
   * Update or insert leaderboard entry for an advisor
   */
  async upsertLeaderboardEntry(
    advisorState: AdvisorState,
    advisorName: string
  ): Promise<void> {
    await this.initialize();

    // Calculate average advice score
    const totalScores = advisorState.sessionHistory.reduce(
      (sum, session) => sum + session.adviceQualityScore,
      0
    );
    const averageAdviceScore =
      advisorState.sessionHistory.length > 0
        ? totalScores / advisorState.sessionHistory.length
        : 0;

    // Calculate best streak
    const allStreaks = advisorState.sessionHistory.map((s) =>
      Math.abs(advisorState.currentStreak)
    );
    const bestStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 0;

    // Calculate trusted relationships (characters with trust tier >= "trusted")
    // This would need to be passed from the character pool manager
    const trustedRelationships = 0; // TODO: Calculate from character pool

    // Calculate recommendations received
    const recommendationsReceived = 0; // TODO: Calculate from character pool

    // First session date
    const firstSessionDate =
      advisorState.sessionHistory.length > 0
        ? advisorState.sessionHistory[0].timestamp
        : new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT INTO leaderboard_entries (
          advisor_id, advisor_name, reputation, skill_level, career_tier,
          total_sessions, total_clients_helped, lifetime_savings_generated,
          lifetime_debt_cleared, advisor_coins, average_advice_score,
          current_streak, best_streak, achievement_count,
          trusted_relationships, recommendations_received,
          cases_shared, challenges_completed,
          last_updated, first_session_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(advisor_id) DO UPDATE SET
          advisor_name = excluded.advisor_name,
          reputation = excluded.reputation,
          skill_level = excluded.skill_level,
          career_tier = excluded.career_tier,
          total_sessions = excluded.total_sessions,
          total_clients_helped = excluded.total_clients_helped,
          lifetime_savings_generated = excluded.lifetime_savings_generated,
          lifetime_debt_cleared = excluded.lifetime_debt_cleared,
          advisor_coins = excluded.advisor_coins,
          average_advice_score = excluded.average_advice_score,
          current_streak = excluded.current_streak,
          best_streak = excluded.best_streak,
          achievement_count = excluded.achievement_count,
          trusted_relationships = excluded.trusted_relationships,
          recommendations_received = excluded.recommendations_received,
          last_updated = excluded.last_updated,
          updated_at = excluded.updated_at
      `,
      args: [
        advisorState.advisorId,
        advisorName,
        advisorState.reputation,
        advisorState.skillLevel,
        advisorState.careerTier,
        advisorState.totalSessions,
        advisorState.totalClientsHelped,
        advisorState.lifetimeSavingsGenerated,
        advisorState.lifetimeDebtCleared,
        advisorState.advisorCoins,
        averageAdviceScore,
        advisorState.currentStreak,
        bestStreak,
        advisorState.achievementsUnlocked.length,
        trustedRelationships,
        recommendationsReceived,
        0, // cases_shared - will be updated separately
        0, // challenges_completed - will be updated separately
        new Date().toISOString(),
        firstSessionDate,
        new Date().toISOString(),
      ],
    });
  }

  /**
   * Recalculate all rankings
   */
  async recalculateRankings(): Promise<void> {
    await this.initialize();

    // Update global ranking (based on weighted score)
    await this.client.execute(`
      UPDATE leaderboard_entries
      SET global_rank = (
        SELECT COUNT(*) + 1
        FROM leaderboard_entries AS e2
        WHERE (
          e2.reputation * 0.3 +
          e2.skill_level * 10 * 0.2 +
          e2.average_advice_score * 10 * 0.2 +
          (e2.lifetime_savings_generated + e2.lifetime_debt_cleared) / 1000 * 0.15 +
          e2.achievement_count * 5 * 0.15
        ) > (
          leaderboard_entries.reputation * 0.3 +
          leaderboard_entries.skill_level * 10 * 0.2 +
          leaderboard_entries.average_advice_score * 10 * 0.2 +
          (leaderboard_entries.lifetime_savings_generated + leaderboard_entries.lifetime_debt_cleared) / 1000 * 0.15 +
          leaderboard_entries.achievement_count * 5 * 0.15
        )
      )
    `);

    // Update reputation ranking
    await this.client.execute(`
      UPDATE leaderboard_entries
      SET reputation_rank = (
        SELECT COUNT(*) + 1
        FROM leaderboard_entries AS e2
        WHERE e2.reputation > leaderboard_entries.reputation
      )
    `);

    // Update impact ranking (financial impact)
    await this.client.execute(`
      UPDATE leaderboard_entries
      SET impact_rank = (
        SELECT COUNT(*) + 1
        FROM leaderboard_entries AS e2
        WHERE (e2.lifetime_savings_generated + e2.lifetime_debt_cleared) >
              (leaderboard_entries.lifetime_savings_generated + leaderboard_entries.lifetime_debt_cleared)
      )
    `);

    // Update expertise ranking (skill + advice quality)
    await this.client.execute(`
      UPDATE leaderboard_entries
      SET expertise_rank = (
        SELECT COUNT(*) + 1
        FROM leaderboard_entries AS e2
        WHERE (e2.skill_level * 0.5 + e2.average_advice_score * 0.5) >
              (leaderboard_entries.skill_level * 0.5 + leaderboard_entries.average_advice_score * 0.5)
      )
    `);
  }

  /**
   * Get leaderboard rankings by category
   */
  async getLeaderboard(
    category: LeaderboardCategory,
    limit = 100
  ): Promise<LeaderboardRanking> {
    await this.initialize();

    let orderBy: string;
    switch (category) {
      case "global":
        orderBy = "global_rank ASC";
        break;
      case "reputation":
        orderBy = "reputation DESC";
        break;
      case "impact":
        orderBy = "(lifetime_savings_generated + lifetime_debt_cleared) DESC";
        break;
      case "expertise":
        orderBy = "(skill_level * 0.5 + average_advice_score * 0.5) DESC";
        break;
      case "coins":
        orderBy = "advisor_coins DESC";
        break;
      case "achievements":
        orderBy = "achievement_count DESC";
        break;
      default:
        orderBy = "global_rank ASC";
    }

    const result = await this.client.execute({
      sql: `
        SELECT * FROM leaderboard_entries
        ORDER BY ${orderBy}
        LIMIT ?
      `,
      args: [limit],
    });

    const totalResult = await this.client.execute(
      "SELECT COUNT(*) as count FROM leaderboard_entries"
    );
    const totalParticipants = (totalResult.rows[0].count as number) || 0;

    return {
      category,
      entries: result.rows.map((row) => this.mapRowToLeaderboardEntry(row)),
      lastUpdated: new Date().toISOString(),
      totalParticipants,
    };
  }

  /**
   * Get advisor's rank in a specific category
   */
  async getAdvisorRank(
    advisorId: string,
    category: LeaderboardCategory
  ): Promise<number | null> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `SELECT * FROM leaderboard_entries WHERE advisor_id = ?`,
      args: [advisorId],
    });

    if (result.rows.length === 0) return null;

    const entry = this.mapRowToLeaderboardEntry(result.rows[0]);

    switch (category) {
      case "global":
        return entry.globalRank ?? null;
      case "reputation":
        return entry.reputationRank ?? null;
      case "impact":
        return entry.impactRank ?? null;
      case "expertise":
        return entry.expertiseRank ?? null;
      default:
        return entry.globalRank ?? null;
    }
  }

  /**
   * Get surrounding advisors in leaderboard (for showing context around player)
   */
  async getSurroundingAdvisors(
    advisorId: string,
    category: LeaderboardCategory,
    range = 5
  ): Promise<LeaderboardEntry[]> {
    await this.initialize();

    const rank = await this.getAdvisorRank(advisorId, category);
    if (!rank) return [];

    const leaderboard = await this.getLeaderboard(category, 1000);

    const startIndex = Math.max(0, rank - range - 1);
    const endIndex = Math.min(leaderboard.entries.length, rank + range);

    return leaderboard.entries.slice(startIndex, endIndex);
  }

  // ============================================================================
  // CAREER TIERS
  // ============================================================================

  /**
   * Get all career tiers
   */
  async getCareerTiers(): Promise<CareerTier[]> {
    await this.initialize();

    const result = await this.client.execute(
      "SELECT * FROM career_tiers ORDER BY tier_level ASC"
    );

    return result.rows.map((row) => ({
      tierLevel: row.tier_level as number,
      tierName: row.tier_name as string,
      tierNameFi: row.tier_name_fi as string,
      tierEmoji: row.tier_emoji as string,
      minReputation: row.min_reputation as number,
      minSkillLevel: row.min_skill_level as number,
      minClients: row.min_clients as number,
      minSessions: row.min_sessions as number,
      minAchievements: row.min_achievements as number,
      minSavingsImpact: row.min_savings_impact as number,
      coinBonus: row.coin_bonus as number,
      unlockDescription: row.unlock_description as string,
      unlockDescriptionFi: row.unlock_description_fi as string,
    }));
  }

  /**
   * Get tier for advisor based on their stats
   */
  async calculateAdvisorTier(advisorState: AdvisorState): Promise<CareerTier> {
    const tiers = await this.getCareerTiers();

    // Find highest tier advisor qualifies for
    let qualifiedTier = tiers[0]; // Default to Junior

    for (const tier of tiers) {
      if (
        advisorState.reputation >= tier.minReputation &&
        advisorState.skillLevel >= tier.minSkillLevel &&
        advisorState.totalClientsHelped >= tier.minClients &&
        advisorState.totalSessions >= tier.minSessions &&
        advisorState.achievementsUnlocked.length >= tier.minAchievements &&
        advisorState.lifetimeSavingsGenerated >= tier.minSavingsImpact
      ) {
        qualifiedTier = tier;
      }
    }

    return qualifiedTier;
  }

  /**
   * Get next tier and progress towards it
   */
  async getNextTierProgress(advisorState: AdvisorState): Promise<{
    currentTier: CareerTier;
    nextTier: CareerTier | null;
    progress: {
      reputation: number;
      skillLevel: number;
      clients: number;
      sessions: number;
      achievements: number;
      savingsImpact: number;
    };
  }> {
    const currentTier = await this.calculateAdvisorTier(advisorState);
    const allTiers = await this.getCareerTiers();

    const nextTier =
      allTiers.find((t) => t.tierLevel === currentTier.tierLevel + 1) || null;

    if (!nextTier) {
      return {
        currentTier,
        nextTier: null,
        progress: {
          reputation: 1,
          skillLevel: 1,
          clients: 1,
          sessions: 1,
          achievements: 1,
          savingsImpact: 1,
        },
      };
    }

    return {
      currentTier,
      nextTier,
      progress: {
        reputation: Math.min(
          1,
          advisorState.reputation / nextTier.minReputation
        ),
        skillLevel: Math.min(
          1,
          advisorState.skillLevel / nextTier.minSkillLevel
        ),
        clients: Math.min(
          1,
          advisorState.totalClientsHelped / nextTier.minClients
        ),
        sessions: Math.min(
          1,
          advisorState.totalSessions / nextTier.minSessions
        ),
        achievements: Math.min(
          1,
          advisorState.achievementsUnlocked.length / nextTier.minAchievements
        ),
        savingsImpact: Math.min(
          1,
          advisorState.lifetimeSavingsGenerated / nextTier.minSavingsImpact
        ),
      },
    };
  }

  // ============================================================================
  // COMMUNITY CHALLENGES
  // ============================================================================

  /**
   * Get active challenges
   */
  async getActiveChallenges(): Promise<CommunityChallenge[]> {
    await this.initialize();

    const now = new Date().toISOString();
    const result = await this.client.execute({
      sql: `
        SELECT * FROM community_challenges
        WHERE is_active = 1 AND start_date <= ? AND end_date >= ?
        ORDER BY end_date ASC
      `,
      args: [now, now],
    });

    return result.rows.map((row) => this.mapRowToChallenge(row));
  }

  /**
   * Create a new community challenge
   */
  async createChallenge(
    challenge: Omit<CommunityChallenge, "id">
  ): Promise<number> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        INSERT INTO community_challenges (
          challenge_name, challenge_name_fi, challenge_description,
          challenge_description_fi, challenge_type, metric_type,
          target_value, difficulty, coin_reward, achievement_id,
          badge_emoji, start_date, end_date, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        challenge.challengeName,
        challenge.challengeNameFi,
        challenge.challengeDescription,
        challenge.challengeDescriptionFi,
        challenge.challengeType,
        challenge.metricType,
        challenge.targetValue,
        challenge.difficulty,
        challenge.coinReward,
        challenge.achievementId || null,
        challenge.badgeEmoji || null,
        challenge.startDate,
        challenge.endDate,
        challenge.isActive ? 1 : 0,
      ],
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Update challenge participation
   */
  async updateChallengeProgress(
    challengeId: number,
    advisorId: string,
    progress: number
  ): Promise<void> {
    await this.initialize();

    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) return;

    const isCompleted = progress >= challenge.targetValue;
    const completedAt = isCompleted ? new Date().toISOString() : null;

    await this.client.execute({
      sql: `
        INSERT INTO challenge_participations (
          challenge_id, advisor_id, current_progress,
          is_completed, completed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(challenge_id, advisor_id) DO UPDATE SET
          current_progress = excluded.current_progress,
          is_completed = excluded.is_completed,
          completed_at = COALESCE(completed_at, excluded.completed_at),
          updated_at = excluded.updated_at
      `,
      args: [
        challengeId,
        advisorId,
        progress,
        isCompleted ? 1 : 0,
        completedAt,
        new Date().toISOString(),
      ],
    });
  }

  /**
   * Get advisor's challenge participations
   */
  async getAdvisorChallenges(
    advisorId: string
  ): Promise<ChallengeParticipation[]> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM challenge_participations
        WHERE advisor_id = ?
        ORDER BY created_at DESC
      `,
      args: [advisorId],
    });

    return result.rows.map((row) => ({
      challengeId: row.challenge_id as number,
      advisorId: row.advisor_id as string,
      currentProgress: row.current_progress as number,
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at as string | undefined,
      participantRank: row.participant_rank as number | undefined,
    }));
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(
    challengeId: number,
    limit = 100
  ): Promise<ChallengeParticipation[]> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM challenge_participations
        WHERE challenge_id = ?
        ORDER BY current_progress DESC
        LIMIT ?
      `,
      args: [challengeId, limit],
    });

    return result.rows.map((row, index) => ({
      challengeId: row.challenge_id as number,
      advisorId: row.advisor_id as string,
      currentProgress: row.current_progress as number,
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at as string | undefined,
      participantRank: index + 1,
    }));
  }

  // ============================================================================
  // SHARED CASES
  // ============================================================================

  /**
   * Share a case
   */
  async shareCase(caseData: Omit<SharedCase, "createdAt">): Promise<void> {
    await this.initialize();

    await this.client.execute({
      sql: `
        INSERT INTO shared_cases (
          case_uuid, advisor_id, advisor_name, character_name,
          case_title, case_summary, initial_problem, advice_given,
          financial_impact, advice_quality_score, session_date,
          topics_covered, is_public, anonymize_character
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        caseData.caseUuid,
        caseData.advisorId,
        caseData.advisorName,
        caseData.characterName,
        caseData.caseTitle,
        caseData.caseSummary,
        caseData.initialProblem,
        caseData.adviceGiven,
        caseData.financialImpact,
        caseData.adviceQualityScore,
        caseData.sessionDate,
        JSON.stringify(caseData.topicsCovered),
        caseData.isPublic ? 1 : 0,
        caseData.anonymizeCharacter ? 1 : 0,
      ],
    });

    // Update cases_shared count
    await this.client.execute({
      sql: `
        UPDATE leaderboard_entries
        SET cases_shared = cases_shared + 1
        WHERE advisor_id = ?
      `,
      args: [caseData.advisorId],
    });
  }

  /**
   * Get popular shared cases
   */
  async getPopularCases(limit = 20): Promise<SharedCase[]> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM shared_cases
        WHERE is_public = 1
        ORDER BY likes_count DESC, views_count DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return result.rows.map((row) => this.mapRowToSharedCase(row));
  }

  /**
   * Get recent shared cases
   */
  async getRecentCases(limit = 20): Promise<SharedCase[]> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM shared_cases
        WHERE is_public = 1
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return result.rows.map((row) => this.mapRowToSharedCase(row));
  }

  /**
   * Add reaction to a case
   */
  async addCaseReaction(
    caseUuid: string,
    advisorId: string,
    reactionType: "like" | "helpful" | "insightful"
  ): Promise<void> {
    await this.initialize();

    await this.client.execute({
      sql: `
        INSERT OR IGNORE INTO case_reactions (
          case_uuid, reactor_advisor_id, reaction_type
        ) VALUES (?, ?, ?)
      `,
      args: [caseUuid, advisorId, reactionType],
    });

    // Update likes count
    await this.client.execute({
      sql: `
        UPDATE shared_cases
        SET likes_count = (
          SELECT COUNT(*) FROM case_reactions WHERE case_uuid = ?
        )
        WHERE case_uuid = ?
      `,
      args: [caseUuid, caseUuid],
    });
  }

  /**
   * Add comment to a case
   */
  async addCaseComment(
    caseUuid: string,
    advisorId: string,
    advisorName: string,
    comment: string
  ): Promise<void> {
    await this.initialize();

    await this.client.execute({
      sql: `
        INSERT INTO case_comments (
          case_uuid, commenter_advisor_id, commenter_name, comment_text
        ) VALUES (?, ?, ?, ?)
      `,
      args: [caseUuid, advisorId, advisorName, comment],
    });

    // Update comments count
    await this.client.execute({
      sql: `
        UPDATE shared_cases
        SET comments_count = (
          SELECT COUNT(*) FROM case_comments WHERE case_uuid = ?
        )
        WHERE case_uuid = ?
      `,
      args: [caseUuid, caseUuid],
    });
  }

  /**
   * Get case comments
   */
  async getCaseComments(caseUuid: string): Promise<CaseComment[]> {
    await this.initialize();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM case_comments
        WHERE case_uuid = ?
        ORDER BY created_at ASC
      `,
      args: [caseUuid],
    });

    return result.rows.map((row) => ({
      id: row.id as number,
      caseUuid: row.case_uuid as string,
      commenterAdvisorId: row.commenter_advisor_id as string,
      commenterName: row.commenter_name as string,
      commentText: row.comment_text as string,
      createdAt: row.created_at as string,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapRowToLeaderboardEntry(row: any): LeaderboardEntry {
    return {
      advisorId: row.advisor_id as string,
      advisorName: row.advisor_name as string,
      reputation: row.reputation as number,
      skillLevel: row.skill_level as number,
      careerTier: row.career_tier as number,
      totalSessions: row.total_sessions as number,
      totalClientsHelped: row.total_clients_helped as number,
      lifetimeSavingsGenerated: row.lifetime_savings_generated as number,
      lifetimeDebtCleared: row.lifetime_debt_cleared as number,
      advisorCoins: row.advisor_coins as number,
      averageAdviceScore: row.average_advice_score as number,
      currentStreak: row.current_streak as number,
      bestStreak: row.best_streak as number,
      achievementCount: row.achievement_count as number,
      trustedRelationships: row.trusted_relationships as number,
      recommendationsReceived: row.recommendations_received as number,
      casesShared: row.cases_shared as number,
      challengesCompleted: row.challenges_completed as number,
      globalRank: row.global_rank as number | undefined,
      reputationRank: row.reputation_rank as number | undefined,
      impactRank: row.impact_rank as number | undefined,
      expertiseRank: row.expertise_rank as number | undefined,
      lastUpdated: row.last_updated as string,
      firstSessionDate: row.first_session_date as string,
    };
  }

  private mapRowToChallenge(row: any): CommunityChallenge {
    return {
      id: row.id as number,
      challengeName: row.challenge_name as string,
      challengeNameFi: row.challenge_name_fi as string,
      challengeDescription: row.challenge_description as string,
      challengeDescriptionFi: row.challenge_description_fi as string,
      challengeType: row.challenge_type as "weekly" | "monthly" | "special",
      metricType: row.metric_type as
        | "sessions"
        | "savings"
        | "clients"
        | "streak"
        | "expertise",
      targetValue: row.target_value as number,
      difficulty: row.difficulty as "easy" | "medium" | "hard" | "extreme",
      coinReward: row.coin_reward as number,
      achievementId: row.achievement_id as string | undefined,
      badgeEmoji: row.badge_emoji as string | undefined,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      isActive: Boolean(row.is_active),
    };
  }

  private mapRowToSharedCase(row: any): SharedCase {
    return {
      caseUuid: row.case_uuid as string,
      advisorId: row.advisor_id as string,
      advisorName: row.advisor_name as string,
      characterName: row.character_name as string,
      caseTitle: row.case_title as string,
      caseSummary: row.case_summary as string,
      initialProblem: row.initial_problem as string,
      adviceGiven: row.advice_given as string,
      financialImpact: row.financial_impact as number,
      adviceQualityScore: row.advice_quality_score as number,
      sessionDate: row.session_date as string,
      topicsCovered: JSON.parse(row.topics_covered as string),
      viewsCount: row.views_count as number,
      likesCount: row.likes_count as number,
      commentsCount: row.comments_count as number,
      isPublic: Boolean(row.is_public),
      anonymizeCharacter: Boolean(row.anonymize_character),
      createdAt: row.created_at as string,
    };
  }

  private async getChallengeById(
    id: number
  ): Promise<CommunityChallenge | null> {
    const result = await this.client.execute({
      sql: "SELECT * FROM community_challenges WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) return null;
    return this.mapRowToChallenge(result.rows[0]);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.client.close();
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
