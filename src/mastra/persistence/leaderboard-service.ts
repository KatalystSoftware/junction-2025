/**
 * Global Leaderboard Service
 * Manages global rankings for all advisors with Postgres storage
 */

import type {
  AdvisorState,
  LeaderboardEntry,
  LeaderboardRanking,
} from "../types/game-types.ts";
import pg from "pg";
import { sanitizePlayerName } from "../utils/name-sanitizer.ts";

const { Pool } = pg;

export class LeaderboardService {
  private pgPool: pg.Pool;
  private initialized = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required for leaderboard service",
      );
    }

    this.pgPool = new Pool({
      connectionString: databaseUrl,
    });
    console.log("✅ Leaderboard using Postgres");
  }

  /**
   * Initialize database schema (idempotent - safe to run multiple times)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = await this.pgPool.connect();
    try {
      // Create leaderboard_entries table
      await client.query(`
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id SERIAL PRIMARY KEY,
          advisor_id TEXT NOT NULL UNIQUE,
          advisor_name TEXT NOT NULL,
          reputation INTEGER DEFAULT 0,
          skill_level NUMERIC(4,2) DEFAULT 0,
          total_sessions INTEGER DEFAULT 0,
          total_clients_helped INTEGER DEFAULT 0,
          lifetime_savings_generated NUMERIC(12,2) DEFAULT 0,
          lifetime_debt_cleared NUMERIC(12,2) DEFAULT 0,
          advisor_coins INTEGER DEFAULT 0,
          average_advice_score NUMERIC(4,2) DEFAULT 0,
          achievement_count INTEGER DEFAULT 0,
          global_rank INTEGER,
          global_score NUMERIC(10,2) DEFAULT 0,
          first_session_date TIMESTAMP NOT NULL,
          last_updated TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard_entries(global_rank);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_leaderboard_global_score ON leaderboard_entries(global_score DESC);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_leaderboard_advisor_id ON leaderboard_entries(advisor_id);
      `);

      // Create trigger function for updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_leaderboard_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS leaderboard_updated_at ON leaderboard_entries;
      `);
      await client.query(`
        CREATE TRIGGER leaderboard_updated_at
          BEFORE UPDATE ON leaderboard_entries
          FOR EACH ROW
          EXECUTE FUNCTION update_leaderboard_updated_at();
      `);

      this.initialized = true;
      console.log("✅ Leaderboard database schema initialized");
    } finally {
      client.release();
    }
  }

  /**
   * Calculate global score for ranking.
   * Primary driver is total financial impact (savings + debt cleared),
   * with smaller bonuses for reputation, skill, advice quality and achievements.
   * This keeps rankings mostly aligned with money saved.
   */
  private calculateGlobalScore(
    reputation: number,
    skillLevel: number,
    averageAdviceScore: number,
    lifetimeSavingsGenerated: number,
    lifetimeDebtCleared: number,
    achievementCount: number,
  ): number {
    const totalImpact = Math.max(
      0,
      lifetimeSavingsGenerated + lifetimeDebtCleared,
    );

    // 1 point per €10 of impact (dominant term)
    const impactScore = totalImpact / 10;

    // Smaller bonuses so ordering mostly tracks totalImpact
    const reputationBonus = Math.max(0, reputation) * 2;
    const skillBonus = Math.max(0, skillLevel) * 5;
    const adviceBonus = Math.max(0, averageAdviceScore) * 5;
    const achievementBonus = Math.max(0, achievementCount) * 10;

    return Number(
      (
        impactScore +
        reputationBonus +
        skillBonus +
        adviceBonus +
        achievementBonus
      ).toFixed(2),
    );
  }

  /**
   * Update or insert leaderboard entry for an advisor
   */
  async upsertLeaderboardEntry(
    advisorState: AdvisorState,
    rawAdvisorName: string,
  ): Promise<void> {
    await this.initialize();

    // Sanitize the name with AI
    const advisorName = await sanitizePlayerName(rawAdvisorName);

    // Calculate metrics
    const totalScores = advisorState.sessionHistory.reduce(
      (sum, session) => sum + session.adviceQualityScore,
      0,
    );
    const averageAdviceScore =
      advisorState.sessionHistory.length > 0
        ? totalScores / advisorState.sessionHistory.length
        : 0;

    const firstSessionDate =
      advisorState.sessionHistory.length > 0
        ? advisorState.sessionHistory[0].timestamp
        : new Date().toISOString();

    const globalScore = this.calculateGlobalScore(
      advisorState.reputation,
      advisorState.skillLevel,
      averageAdviceScore,
      advisorState.lifetimeSavingsGenerated,
      advisorState.lifetimeDebtCleared,
      advisorState.achievementsUnlocked.length,
    );

    const now = new Date().toISOString();

    await this.pgPool.query(
      `
        INSERT INTO leaderboard_entries (
          advisor_id, advisor_name, reputation, skill_level,
          total_sessions, total_clients_helped, lifetime_savings_generated,
          lifetime_debt_cleared, advisor_coins, average_advice_score,
          achievement_count, global_score, first_session_date, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT(advisor_id) DO UPDATE SET
          advisor_name = EXCLUDED.advisor_name,
          reputation = EXCLUDED.reputation,
          skill_level = EXCLUDED.skill_level,
          total_sessions = EXCLUDED.total_sessions,
          total_clients_helped = EXCLUDED.total_clients_helped,
          lifetime_savings_generated = EXCLUDED.lifetime_savings_generated,
          lifetime_debt_cleared = EXCLUDED.lifetime_debt_cleared,
          advisor_coins = EXCLUDED.advisor_coins,
          average_advice_score = EXCLUDED.average_advice_score,
          achievement_count = EXCLUDED.achievement_count,
          global_score = EXCLUDED.global_score,
          last_updated = EXCLUDED.last_updated
      `,
      [
        advisorState.advisorId,
        advisorName,
        advisorState.reputation,
        advisorState.skillLevel,
        advisorState.totalSessions,
        advisorState.totalClientsHelped,
        advisorState.lifetimeSavingsGenerated,
        advisorState.lifetimeDebtCleared,
        advisorState.advisorCoins,
        averageAdviceScore,
        advisorState.achievementsUnlocked.length,
        globalScore,
        firstSessionDate,
        now,
      ],
    );
  }

  /**
   * Recalculate all rankings based on global score
   */
  async recalculateRankings(): Promise<void> {
    await this.initialize();

    await this.pgPool.query(`
      UPDATE leaderboard_entries
      SET global_rank = subquery.rank
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY global_score DESC) as rank
        FROM leaderboard_entries
      ) AS subquery
      WHERE leaderboard_entries.id = subquery.id
    `);
  }

  /**
   * Get leaderboard rankings by category
   */
  async getLeaderboard(
    category:
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements" = "global",
    limit = 100,
  ): Promise<LeaderboardRanking> {
    await this.initialize();

    // Determine ORDER BY clause based on category
    let orderByClause: string;
    switch (category) {
      case "reputation":
        orderByClause = "reputation DESC, global_score DESC";
        break;
      case "impact":
        orderByClause =
          "(lifetime_savings_generated + lifetime_debt_cleared) DESC, global_score DESC";
        break;
      case "expertise":
        orderByClause = "skill_level DESC, global_score DESC";
        break;
      case "coins":
        orderByClause = "advisor_coins DESC, global_score DESC";
        break;
      case "achievements":
        orderByClause = "achievement_count DESC, global_score DESC";
        break;
      case "global":
      default:
        orderByClause = "global_score DESC";
        break;
    }

    const result = await this.pgPool.query(
      `SELECT * FROM leaderboard_entries ORDER BY ${orderByClause} LIMIT $1`,
      [limit],
    );

    const countResult = await this.pgPool.query(
      `SELECT COUNT(*) as count FROM leaderboard_entries`,
    );
    const totalParticipants = Number(countResult.rows[0].count);

    return {
      category,
      entries: result.rows.map((row: any, index: number) =>
        this.mapRowToEntry(row, index + 1),
      ),
      lastUpdated: new Date().toISOString(),
      totalParticipants,
    };
  }

  /**
   * Get advisor's rank in a specific category
   */
  async getAdvisorRank(
    advisorId: string,
    category:
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements" = "global",
  ): Promise<{
    rank: number;
    totalParticipants: number;
    entry: LeaderboardEntry;
  } | null> {
    await this.initialize();

    // Determine ORDER BY clause based on category
    let orderByClause: string;
    switch (category) {
      case "reputation":
        orderByClause = "reputation DESC, global_score DESC";
        break;
      case "impact":
        orderByClause =
          "(lifetime_savings_generated + lifetime_debt_cleared) DESC, global_score DESC";
        break;
      case "expertise":
        orderByClause = "skill_level DESC, global_score DESC";
        break;
      case "coins":
        orderByClause = "advisor_coins DESC, global_score DESC";
        break;
      case "achievements":
        orderByClause = "achievement_count DESC, global_score DESC";
        break;
      case "global":
      default:
        orderByClause = "global_score DESC";
        break;
    }

    // Get advisor's rank using window function
    const result = await this.pgPool.query(
      `
      WITH ranked_advisors AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY ${orderByClause}) as rank
        FROM leaderboard_entries
      )
      SELECT * FROM ranked_advisors WHERE advisor_id = $1
      `,
      [advisorId],
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];

    // Get total count
    const countResult = await this.pgPool.query(
      `SELECT COUNT(*) as count FROM leaderboard_entries`,
    );
    const totalParticipants = Number(countResult.rows[0].count);

    return {
      rank: Number(row.rank),
      totalParticipants,
      entry: this.mapRowToEntry(row, Number(row.rank)),
    };
  }

  /**
   * Get surrounding advisors in leaderboard (for contextual view)
   */
  async getSurroundingAdvisors(
    advisorId: string,
    category:
      | "global"
      | "reputation"
      | "impact"
      | "expertise"
      | "coins"
      | "achievements" = "global",
    range = 5,
  ): Promise<LeaderboardRanking> {
    await this.initialize();

    // First, get the advisor's rank
    const rankData = await this.getAdvisorRank(advisorId, category);
    if (!rankData) {
      // Advisor not found, return empty leaderboard
      return {
        category,
        entries: [],
        lastUpdated: new Date().toISOString(),
        totalParticipants: 0,
      };
    }

    const advisorRank = rankData.rank;

    // Determine ORDER BY clause based on category
    let orderByClause: string;
    switch (category) {
      case "reputation":
        orderByClause = "reputation DESC, global_score DESC";
        break;
      case "impact":
        orderByClause =
          "(lifetime_savings_generated + lifetime_debt_cleared) DESC, global_score DESC";
        break;
      case "expertise":
        orderByClause = "skill_level DESC, global_score DESC";
        break;
      case "coins":
        orderByClause = "advisor_coins DESC, global_score DESC";
        break;
      case "achievements":
        orderByClause = "achievement_count DESC, global_score DESC";
        break;
      case "global":
      default:
        orderByClause = "global_score DESC";
        break;
    }

    // Get surrounding advisors (range before and after)
    const offset = Math.max(0, advisorRank - range - 1);
    const limit = range * 2 + 1; // advisors before + current + advisors after

    const result = await this.pgPool.query(
      `SELECT * FROM leaderboard_entries ORDER BY ${orderByClause} LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return {
      category,
      entries: result.rows.map((row: any, index: number) =>
        this.mapRowToEntry(row, offset + index + 1),
      ),
      lastUpdated: new Date().toISOString(),
      totalParticipants: rankData.totalParticipants,
    };
  }

  /**
   * Map database row to LeaderboardEntry
   */
  private mapRowToEntry(row: any, rank: number): LeaderboardEntry {
    return {
      advisorId: row.advisor_id,
      advisorName: row.advisor_name,
      reputation: Number(row.reputation),
      skillLevel: Number(row.skill_level),
      totalSessions: Number(row.total_sessions),
      totalClientsHelped: Number(row.total_clients_helped),
      lifetimeSavingsGenerated: Number(row.lifetime_savings_generated),
      lifetimeDebtCleared: Number(row.lifetime_debt_cleared),
      advisorCoins: Number(row.advisor_coins),
      averageAdviceScore: Number(row.average_advice_score),
      achievementCount: Number(row.achievement_count),
      globalRank: row.global_rank ? Number(row.global_rank) : rank,
      globalScore: Number(row.global_score),
      firstSessionDate: row.first_session_date,
      lastUpdated: row.last_updated,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pgPool.end();
  }
}

// Lazy-loaded singleton instance - only created if DATABASE_URL is set
let _leaderboardService: LeaderboardService | null = null;

export function getLeaderboardService(): LeaderboardService | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  
  if (!_leaderboardService) {
    _leaderboardService = new LeaderboardService();
  }
  
  return _leaderboardService;
}

// Export getter for backward compatibility
export const leaderboardService = getLeaderboardService();
