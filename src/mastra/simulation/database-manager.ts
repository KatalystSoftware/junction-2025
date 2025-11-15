/**
 * Elämäpeli 2025 - Financial Simulation Database Manager
 * PostgreSQL database operations for transaction persistence
 *
 * Handles:
 * - Schema creation and migrations
 * - Character financial state CRUD
 * - Transaction CRUD with batch inserts
 * - Advice effects tracking
 * - Monthly summaries
 * - Query operations
 */

import { Pool, PoolClient } from "pg";
import type {
  Transaction,
  CharacterFinancialState,
  AdviceEffect,
  MonthSummary,
  TransactionQuery,
  AdviceEffectQuery,
  SpendingModel,
} from "./simulation-types.ts";

export class SimulationDatabaseManager {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.initializeSchema();
  }

  // ============================================================================
  // SCHEMA INITIALIZATION
  // ============================================================================

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Character financial state table
      await client.query(`
        CREATE TABLE IF NOT EXISTS character_states (
          character_id TEXT PRIMARY KEY,
          current_balance REAL NOT NULL,
          monthly_income_day INTEGER NOT NULL,
          last_simulated_date TEXT NOT NULL,
          spending_model TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          character_id TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          description TEXT NOT NULL,
          merchant_name TEXT,
          advice_influenced INTEGER DEFAULT 0,
          metadata TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (character_id) REFERENCES character_states(character_id)
        );
      `);

      // Advice effects table
      await client.query(`
        CREATE TABLE IF NOT EXISTS advice_effects (
          id TEXT PRIMARY KEY,
          character_id TEXT NOT NULL,
          advice_session_id TEXT NOT NULL,
          effect_type TEXT NOT NULL,
          strength REAL NOT NULL,
          applied_date TEXT NOT NULL,
          expires_date TEXT,
          metadata TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (character_id) REFERENCES character_states(character_id)
        );
      `);

      // Monthly summaries table
      await client.query(`
        CREATE TABLE IF NOT EXISTS monthly_summaries (
          character_id TEXT NOT NULL,
          month TEXT NOT NULL,
          total_income REAL NOT NULL,
          total_expenses REAL NOT NULL,
          end_balance REAL NOT NULL,
          transaction_count INTEGER NOT NULL,
          debt_reduction REAL DEFAULT 0,
          created_at TEXT NOT NULL,
          PRIMARY KEY (character_id, month),
          FOREIGN KEY (character_id) REFERENCES character_states(character_id)
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_character_date
          ON transactions(character_id, date DESC);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_type
          ON transactions(type);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_advice
          ON transactions(advice_influenced);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_advice_effects_character
          ON advice_effects(character_id, is_active);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_advice_effects_session
          ON advice_effects(advice_session_id);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month
          ON monthly_summaries(month);
      `);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CHARACTER STATE OPERATIONS
  // ============================================================================

  async createCharacterState(state: CharacterFinancialState): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO character_states (
        character_id, current_balance, monthly_income_day,
        last_simulated_date, spending_model, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        state.characterId,
        state.currentBalance,
        state.monthlyIncomeDay,
        state.lastSimulatedDate,
        JSON.stringify(state.spendingModel),
        state.createdAt,
        state.updatedAt,
      ]
    );
  }

  async getCharacterState(
    characterId: string
  ): Promise<CharacterFinancialState | null> {
    const result = await this.pool.query(
      `SELECT * FROM character_states WHERE character_id = $1`,
      [characterId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      characterId: row.character_id,
      currentBalance: row.current_balance,
      monthlyIncomeDay: row.monthly_income_day,
      lastSimulatedDate: row.last_simulated_date,
      spendingModel: JSON.parse(row.spending_model) as SpendingModel,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateCharacterBalance(
    characterId: string,
    newBalance: number
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE character_states
      SET current_balance = $1, updated_at = $2
      WHERE character_id = $3
    `,
      [newBalance, new Date().toISOString(), characterId]
    );
  }

  async updateCharacterState(state: CharacterFinancialState): Promise<void> {
    await this.pool.query(
      `
      UPDATE character_states
      SET current_balance = $1,
          monthly_income_day = $2,
          last_simulated_date = $3,
          spending_model = $4,
          updated_at = $5
      WHERE character_id = $6
    `,
      [
        state.currentBalance,
        state.monthlyIncomeDay,
        state.lastSimulatedDate,
        JSON.stringify(state.spendingModel),
        new Date().toISOString(),
        state.characterId,
      ]
    );
  }

  async getAllCharacterStates(): Promise<CharacterFinancialState[]> {
    const result = await this.pool.query(`SELECT * FROM character_states`);

    return result.rows.map((row) => ({
      characterId: row.character_id,
      currentBalance: row.current_balance,
      monthlyIncomeDay: row.monthly_income_day,
      lastSimulatedDate: row.last_simulated_date,
      spendingModel: JSON.parse(row.spending_model) as SpendingModel,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  async insertTransaction(transaction: Transaction): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO transactions (
        id, character_id, date, type, category, amount,
        balance_after, description, merchant_name,
        advice_influenced, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        transaction.id,
        transaction.characterId,
        transaction.date,
        transaction.type,
        transaction.category,
        transaction.amount,
        transaction.balanceAfter,
        transaction.description,
        transaction.merchantName || null,
        transaction.adviceInfluenced ? 1 : 0,
        transaction.metadata ? JSON.stringify(transaction.metadata) : null,
        transaction.createdAt,
      ]
    );
  }

  /**
   * Batch insert transactions (much faster than individual inserts)
   */
  async insertTransactionsBatch(transactions: Transaction[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      for (const txn of transactions) {
        await client.query(
          `
          INSERT INTO transactions (
            id, character_id, date, type, category, amount,
            balance_after, description, merchant_name,
            advice_influenced, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
          [
            txn.id,
            txn.characterId,
            txn.date,
            txn.type,
            txn.category,
            txn.amount,
            txn.balanceAfter,
            txn.description,
            txn.merchantName || null,
            txn.adviceInfluenced ? 1 : 0,
            txn.metadata ? JSON.stringify(txn.metadata) : null,
            txn.createdAt,
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransactions(query: TransactionQuery): Promise<Transaction[]> {
    let sql = `SELECT * FROM transactions WHERE character_id = $1`;
    const params: any[] = [query.characterId];
    let paramIndex = 2;

    if (query.startDate) {
      sql += ` AND date >= $${paramIndex++}`;
      params.push(query.startDate);
    }

    if (query.endDate) {
      sql += ` AND date <= $${paramIndex++}`;
      params.push(query.endDate);
    }

    if (query.type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(query.type);
    }

    if (query.category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(query.category);
    }

    sql += ` ORDER BY date DESC`;

    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      characterId: row.character_id,
      date: row.date,
      type: row.type,
      category: row.category,
      amount: row.amount,
      balanceAfter: row.balance_after,
      description: row.description,
      merchantName: row.merchant_name || undefined,
      adviceInfluenced: row.advice_influenced === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    }));
  }

  async getRecentTransactions(
    characterId: string,
    limit: number = 100
  ): Promise<Transaction[]> {
    return this.getTransactions({ characterId, limit });
  }

  async getTransactionsByMonth(
    characterId: string,
    month: string
  ): Promise<Transaction[]> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // Simple approximation

    return this.getTransactions({ characterId, startDate, endDate });
  }

  async getTransactionCount(characterId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM transactions WHERE character_id = $1`,
      [characterId]
    );

    return parseInt(result.rows[0].count);
  }

  // ============================================================================
  // ADVICE EFFECTS OPERATIONS
  // ============================================================================

  async insertAdviceEffect(effect: AdviceEffect): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO advice_effects (
        id, character_id, advice_session_id, effect_type,
        strength, applied_date, expires_date, metadata,
        is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        effect.id,
        effect.characterId,
        effect.adviceSessionId,
        effect.effectType,
        effect.strength,
        effect.appliedDate,
        effect.expiresDate || null,
        effect.metadata ? JSON.stringify(effect.metadata) : null,
        effect.isActive ? 1 : 0,
        effect.createdAt,
      ]
    );
  }

  async getAdviceEffects(query: AdviceEffectQuery): Promise<AdviceEffect[]> {
    let sql = `SELECT * FROM advice_effects WHERE character_id = $1`;
    const params: any[] = [query.characterId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex++}`;
      params.push(query.isActive ? 1 : 0);
    }

    if (query.effectType) {
      sql += ` AND effect_type = $${paramIndex++}`;
      params.push(query.effectType);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      characterId: row.character_id,
      adviceSessionId: row.advice_session_id,
      effectType: row.effect_type,
      strength: row.strength,
      appliedDate: row.applied_date,
      expiresDate: row.expires_date || undefined,
      isActive: row.is_active === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    }));
  }

  async getActiveAdviceEffects(characterId: string): Promise<AdviceEffect[]> {
    return this.getAdviceEffects({ characterId, isActive: true });
  }

  async deactivateAdviceEffect(effectId: string): Promise<void> {
    await this.pool.query(
      `UPDATE advice_effects SET is_active = 0 WHERE id = $1`,
      [effectId]
    );
  }

  async deactivateExpiredEffects(currentDate: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE advice_effects
      SET is_active = 0
      WHERE expires_date IS NOT NULL AND expires_date <= $1 AND is_active = 1
    `,
      [currentDate]
    );
  }

  // ============================================================================
  // MONTHLY SUMMARY OPERATIONS
  // ============================================================================

  async insertMonthlySummary(summary: MonthSummary): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO monthly_summaries (
        character_id, month, total_income, total_expenses,
        end_balance, transaction_count, debt_reduction, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (character_id, month)
      DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        end_balance = EXCLUDED.end_balance,
        transaction_count = EXCLUDED.transaction_count,
        debt_reduction = EXCLUDED.debt_reduction,
        created_at = EXCLUDED.created_at
    `,
      [
        summary.characterId,
        summary.month,
        summary.totalIncome,
        summary.totalExpenses,
        summary.endBalance,
        summary.transactionCount,
        summary.debtReduction,
        summary.createdAt,
      ]
    );
  }

  async getMonthlySummary(
    characterId: string,
    month: string
  ): Promise<MonthSummary | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM monthly_summaries
      WHERE character_id = $1 AND month = $2
    `,
      [characterId, month]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      characterId: row.character_id,
      month: row.month,
      totalIncome: row.total_income,
      totalExpenses: row.total_expenses,
      endBalance: row.end_balance,
      transactionCount: row.transaction_count,
      debtReduction: row.debt_reduction,
      createdAt: row.created_at,
    };
  }

  async getMonthlySummaries(
    characterId: string,
    limit?: number
  ): Promise<MonthSummary[]> {
    let sql = `
      SELECT * FROM monthly_summaries
      WHERE character_id = $1
      ORDER BY month DESC
    `;

    const params: any[] = [characterId];

    if (limit) {
      sql += ` LIMIT $2`;
      params.push(limit);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map((row) => ({
      characterId: row.character_id,
      month: row.month,
      totalIncome: row.total_income,
      totalExpenses: row.total_expenses,
      endBalance: row.end_balance,
      transactionCount: row.transaction_count,
      debtReduction: row.debt_reduction,
      createdAt: row.created_at,
    }));
  }

  // ============================================================================
  // ANALYTICS & AGGREGATIONS
  // ============================================================================

  /**
   * Get spending by category for a character over a date range
   */
  async getSpendingByCategory(
    characterId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, number>> {
    const result = await this.pool.query(
      `
      SELECT category, SUM(ABS(amount)) as total
      FROM transactions
      WHERE character_id = $1
        AND date >= $2
        AND date <= $3
        AND amount < 0
      GROUP BY category
    `,
      [characterId, startDate, endDate]
    );

    const spending: Record<string, number> = {};
    for (const row of result.rows) {
      spending[row.category] = parseFloat(row.total);
    }

    return spending;
  }

  /**
   * Get total income for a character over a date range
   */
  async getTotalIncome(
    characterId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const result = await this.pool.query(
      `
      SELECT SUM(amount) as total
      FROM transactions
      WHERE character_id = $1
        AND date >= $2
        AND date <= $3
        AND amount > 0
    `,
      [characterId, startDate, endDate]
    );

    return parseFloat(result.rows[0].total) || 0;
  }

  /**
   * Get total expenses for a character over a date range
   */
  async getTotalExpenses(
    characterId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const result = await this.pool.query(
      `
      SELECT SUM(ABS(amount)) as total
      FROM transactions
      WHERE character_id = $1
        AND date >= $2
        AND date <= $3
        AND amount < 0
    `,
      [characterId, startDate, endDate]
    );

    return parseFloat(result.rows[0].total) || 0;
  }

  /**
   * Get transactions influenced by advisor's advice
   */
  async getAdviceInfluencedTransactions(
    characterId: string
  ): Promise<Transaction[]> {
    const transactions = await this.getTransactions({ characterId });
    return transactions.filter((t) => t.adviceInfluenced);
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalTransactions: number;
    totalCharacters: number;
    totalAdviceEffects: number;
  }> {
    const txnResult = await this.pool.query(
      "SELECT COUNT(*) as count FROM transactions"
    );
    const charResult = await this.pool.query(
      "SELECT COUNT(*) as count FROM character_states"
    );
    const effectResult = await this.pool.query(
      "SELECT COUNT(*) as count FROM advice_effects"
    );

    return {
      totalTransactions: parseInt(txnResult.rows[0].count),
      totalCharacters: parseInt(charResult.rows[0].count),
      totalAdviceEffects: parseInt(effectResult.rows[0].count),
    };
  }

  /**
   * Delete all data for a character (for testing/reset)
   */
  async deleteCharacterData(characterId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query("DELETE FROM transactions WHERE character_id = $1", [
        characterId,
      ]);
      await client.query("DELETE FROM advice_effects WHERE character_id = $1", [
        characterId,
      ]);
      await client.query(
        "DELETE FROM monthly_summaries WHERE character_id = $1",
        [characterId]
      );
      await client.query("DELETE FROM character_states WHERE character_id = $1", [
        characterId,
      ]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
