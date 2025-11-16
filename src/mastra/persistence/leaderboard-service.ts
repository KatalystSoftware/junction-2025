/**
 * Global Leaderboard Service
 * Manages global rankings for all advisors with Postgres storage
 */

import type { AdvisorState } from "../types/game-types.ts";
import { createClient } from "@libsql/client";
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
  private pgPool: pg.Pool | null = null;
  private libsqlClient: any = null;
  private initialized = false;
  private usePostgres: boolean;

  constructor() {
    this.usePostgres = !!process.env.DATABASE_URL;

    if (this.usePostgres) {
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      console.log("✅ Leaderboard using Postgres");
    } else {
      this.libsqlClient = createClient({
        url: "file:../elamapeli.db",
      });
      console.log("ℹ️ Leaderboard using LibSQL (dev mode)");
    }
  }

  /**
   * Initialize database schema (LibSQL only - Postgres uses migrations)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // For Postgres, migrations handle schema
    if (this.usePostgres) {
      this.initialized = true;
      return;
    }

    // For LibSQL, create schema inline
    if (this.libsqlClient) {
      await this.libsqlClient.execute(`
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          advisor_id TEXT NOT NULL UNIQUE,
          advisor_name TEXT NOT NULL,
          reputation INTEGER DEFAULT 0,
          skill_level REAL DEFAULT 0,
          total_sessions INTEGER DEFAULT 0,
          total_clients_helped INTEGER DEFAULT 0,
          lifetime_savings_generated REAL DEFAULT 0,
          lifetime_debt_cleared REAL DEFAULT 0,
          advisor_coins INTEGER DEFAULT 0,
          average_advice_score REAL DEFAULT 0,
          achievement_count INTEGER DEFAULT 0,
          global_rank INTEGER,
          global_score REAL DEFAULT 0,
          first_session_date TEXT NOT NULL,
          last_updated TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.libsqlClient.execute(
        `CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard_entries(global_rank)`
      );
      await this.libsqlClient.execute(
        `CREATE INDEX IF NOT EXISTS idx_leaderboard_global_score ON leaderboard_entries(global_score DESC)`
      );
    }

    this.initialized = true;
    console.log("✅ Leaderboard database initialized");
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

    if (this.usePostgres && this.pgPool) {
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
    } else if (this.libsqlClient) {
      await this.libsqlClient.execute({
        sql: `
          INSERT INTO leaderboard_entries (
            advisor_id, advisor_name, reputation, skill_level,
            total_sessions, total_clients_helped, lifetime_savings_generated,
            lifetime_debt_cleared, advisor_coins, average_advice_score,
            achievement_count, global_score, first_session_date, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(advisor_id) DO UPDATE SET
            advisor_name = excluded.advisor_name,
            reputation = excluded.reputation,
            skill_level = excluded.skill_level,
            total_sessions = excluded.total_sessions,
            total_clients_helped = excluded.total_clients_helped,
            lifetime_savings_generated = excluded.lifetime_savings_generated,
            lifetime_debt_cleared = excluded.lifetime_debt_cleared,
            advisor_coins = excluded.advisor_coins,
            average_advice_score = excluded.average_advice_score,
            achievement_count = excluded.achievement_count,
            global_score = excluded.global_score,
            last_updated = excluded.last_updated
        `,
        args: [
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
      });
    }
  }

  /**
   * Recalculate all rankings based on global score
   */
  async recalculateRankings(): Promise<void> {
    await this.initialize();

    if (this.usePostgres && this.pgPool) {
      await this.pgPool.query(`
        UPDATE leaderboard_entries
        SET global_rank = subquery.rank
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY global_score DESC) as rank
          FROM leaderboard_entries
        ) AS subquery
        WHERE leaderboard_entries.id = subquery.id
      `);
    } else if (this.libsqlClient) {
      await this.libsqlClient.execute(`
        UPDATE leaderboard_entries
        SET global_rank = (
          SELECT COUNT(*) + 1
          FROM leaderboard_entries AS e2
          WHERE e2.global_score > leaderboard_entries.global_score
        )
      `);
    }
  }

  /**
   * Get global leaderboard rankings
   */
  async getLeaderboard(limit = 100): Promise<LeaderboardRanking> {
    await this.initialize();

    let rows: any[] = [];
    let totalParticipants = 0;

    if (this.usePostgres && this.pgPool) {
      const result = await this.pgPool.query(
        `SELECT * FROM leaderboard_entries ORDER BY global_score DESC LIMIT $1`,
        [limit]
      );
      rows = result.rows;

      const countResult = await this.pgPool.query(
        `SELECT COUNT(*) as count FROM leaderboard_entries`
      );
      totalParticipants = Number(countResult.rows[0].count);
    } else if (this.libsqlClient) {
      const result = await this.libsqlClient.execute({
        sql: `SELECT * FROM leaderboard_entries ORDER BY global_score DESC LIMIT ?`,
        args: [limit],
      });
      rows = result.rows;

      const countResult = await this.libsqlClient.execute(
        `SELECT COUNT(*) as count FROM leaderboard_entries`
      );
      totalParticipants = Number(countResult.rows[0].count);
    }

    return {
      entries: rows.map((row, index) => this.mapRowToEntry(row, index + 1)),
      lastUpdated: new Date().toISOString(),
      totalParticipants,
    };
  }

  /**
   * Get advisor's rank
   */
  async getAdvisorRank(advisorId: string): Promise<number | null> {
    await this.initialize();

    if (this.usePostgres && this.pgPool) {
      const result = await this.pgPool.query(
        `SELECT global_rank FROM leaderboard_entries WHERE advisor_id = $1`,
        [advisorId]
      );
      return result.rows[0]?.global_rank || null;
    } else if (this.libsqlClient) {
      const result = await this.libsqlClient.execute({
        sql: `SELECT global_rank FROM leaderboard_entries WHERE advisor_id = ?`,
        args: [advisorId],
      });
      return result.rows[0]?.global_rank || null;
    }

    return null;
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
    if (this.pgPool) {
      await this.pgPool.end();
    }
    // LibSQL client doesn't need explicit closing
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
