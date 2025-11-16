/**
 * Global Leaderboard Service
 * Manages global rankings for all advisors with Postgres storage
 */

import type { AdvisorState } from "../types/game-types.ts";
import pg from "pg";
import { sanitizePlayerName } from "../utils/name-sanitizer.ts";

const { Pool } = pg;

export interface LeaderboardEntry {
  advisorId: string;
  advisorName: string;
  reputation: number;
  skillLevel: number;
  totalSessions: number;
  totalClientsHelped: number;
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  advisorCoins: number;
  averageAdviceScore: number;
  achievementCount: number;
  globalRank?: number;
  globalScore: number;
  firstSessionDate: string;
  lastUpdated: string;
}

export interface LeaderboardRanking {
  entries: LeaderboardEntry[];
  lastUpdated: string;
  totalParticipants: number;
}

export class LeaderboardService {
  private pgPool: pg.Pool;
  private initialized = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required for leaderboard service"
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
   * Calculate global score for ranking
   * Weighted formula:
   * - Reputation: 30%
   * - Skill Level: 20%
   * - Average Advice Quality: 20%
   * - Financial Impact: 15%
   * - Achievements: 15%
   */
  private calculateGlobalScore(
    reputation: number,
    skillLevel: number,
    averageAdviceScore: number,
    lifetimeSavingsGenerated: number,
    lifetimeDebtCleared: number,
    achievementCount: number
  ): number {
    const reputationScore = reputation * 0.3; // Max 30
    const skillScore = skillLevel * 10 * 0.2; // Max 20
    const adviceScore = averageAdviceScore * 10 * 0.2; // Max 20
    const impactScore =
      ((lifetimeSavingsGenerated + lifetimeDebtCleared) / 1000) * 0.15;
    const achievementScore = achievementCount * 5 * 0.15;

    return Number(
      (
        reputationScore +
        skillScore +
        adviceScore +
        impactScore +
        achievementScore
      ).toFixed(2)
    );
  }

  /**
   * Update or insert leaderboard entry for an advisor
   */
  async upsertLeaderboardEntry(
    advisorState: AdvisorState,
    rawAdvisorName: string
  ): Promise<void> {
    await this.initialize();

    // Sanitize the name with AI
    const advisorName = await sanitizePlayerName(rawAdvisorName);

    // Calculate metrics
    const totalScores = advisorState.sessionHistory.reduce(
      (sum, session) => sum + session.adviceQualityScore,
      0
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
      advisorState.achievementsUnlocked.length
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
      ]
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
   * Get global leaderboard rankings
   */
  async getLeaderboard(limit = 100): Promise<LeaderboardRanking> {
    await this.initialize();

    const result = await this.pgPool.query(
      `SELECT * FROM leaderboard_entries ORDER BY global_score DESC LIMIT $1`,
      [limit]
    );

    const countResult = await this.pgPool.query(
      `SELECT COUNT(*) as count FROM leaderboard_entries`
    );
    const totalParticipants = Number(countResult.rows[0].count);

    return {
      entries: result.rows.map((row: any, index: number) => this.mapRowToEntry(row, index + 1)),
      lastUpdated: new Date().toISOString(),
      totalParticipants,
    };
  }

  /**
   * Get advisor's rank
   */
  async getAdvisorRank(advisorId: string): Promise<number | null> {
    await this.initialize();

    const result = await this.pgPool.query(
      `SELECT global_rank FROM leaderboard_entries WHERE advisor_id = $1`,
      [advisorId]
    );
    return result.rows[0]?.global_rank || null;
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
      globalRank: row.global_rank || rank,
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

// Export singleton instance
export const leaderboardService = new LeaderboardService();
