/**
 * Elämäpeli 2025 - Financial Simulation Database Manager
 * SQLite database operations for transaction persistence
 *
 * Handles:
 * - Schema creation and migrations
 * - Character financial state CRUD
 * - Transaction CRUD with batch inserts
 * - Advice effects tracking
 * - Monthly summaries
 * - Query operations
 */

import Database from "better-sqlite3";
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
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL"); // Better concurrency
    this.initializeSchema();
  }

  // ============================================================================
  // SCHEMA INITIALIZATION
  // ============================================================================

  private initializeSchema(): void {
    // Character financial state table
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_character_date
        ON transactions(character_id, date DESC);

      CREATE INDEX IF NOT EXISTS idx_transactions_type
        ON transactions(type);

      CREATE INDEX IF NOT EXISTS idx_transactions_advice
        ON transactions(advice_influenced);

      CREATE INDEX IF NOT EXISTS idx_advice_effects_character
        ON advice_effects(character_id, is_active);

      CREATE INDEX IF NOT EXISTS idx_advice_effects_session
        ON advice_effects(advice_session_id);

      CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month
        ON monthly_summaries(month);
    `);
  }

  // ============================================================================
  // CHARACTER STATE OPERATIONS
  // ============================================================================

  createCharacterState(state: CharacterFinancialState): void {
    const stmt = this.db.prepare(`
      INSERT INTO character_states (
        character_id, current_balance, monthly_income_day,
        last_simulated_date, spending_model, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      state.characterId,
      state.currentBalance,
      state.monthlyIncomeDay,
      state.lastSimulatedDate,
      JSON.stringify(state.spendingModel),
      state.createdAt,
      state.updatedAt,
    );
  }

  getCharacterState(characterId: string): CharacterFinancialState | null {
    const stmt = this.db.prepare(`
      SELECT * FROM character_states WHERE character_id = ?
    `);

    const row = stmt.get(characterId) as any;

    if (!row) return null;

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

  updateCharacterBalance(characterId: string, newBalance: number): void {
    const stmt = this.db.prepare(`
      UPDATE character_states
      SET current_balance = ?, updated_at = ?
      WHERE character_id = ?
    `);

    stmt.run(newBalance, new Date().toISOString(), characterId);
  }

  updateCharacterState(state: CharacterFinancialState): void {
    const stmt = this.db.prepare(`
      UPDATE character_states
      SET current_balance = ?,
          monthly_income_day = ?,
          last_simulated_date = ?,
          spending_model = ?,
          updated_at = ?
      WHERE character_id = ?
    `);

    stmt.run(
      state.currentBalance,
      state.monthlyIncomeDay,
      state.lastSimulatedDate,
      JSON.stringify(state.spendingModel),
      new Date().toISOString(),
      state.characterId,
    );
  }

  getAllCharacterStates(): CharacterFinancialState[] {
    const stmt = this.db.prepare(`SELECT * FROM character_states`);
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
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

  insertTransaction(transaction: Transaction): void {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        id, character_id, date, type, category, amount,
        balance_after, description, merchant_name,
        advice_influenced, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
    );
  }

  /**
   * Batch insert transactions (much faster than individual inserts)
   */
  insertTransactionsBatch(transactions: Transaction[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        id, character_id, date, type, category, amount,
        balance_after, description, merchant_name,
        advice_influenced, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((txns: Transaction[]) => {
      for (const txn of txns) {
        stmt.run(
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
        );
      }
    });

    insertMany(transactions);
  }

  getTransactions(query: TransactionQuery): Transaction[] {
    let sql = `SELECT * FROM transactions WHERE character_id = ?`;
    const params: any[] = [query.characterId];

    if (query.startDate) {
      sql += ` AND date >= ?`;
      params.push(query.startDate);
    }

    if (query.endDate) {
      sql += ` AND date <= ?`;
      params.push(query.endDate);
    }

    if (query.type) {
      sql += ` AND type = ?`;
      params.push(query.type);
    }

    if (query.category) {
      sql += ` AND category = ?`;
      params.push(query.category);
    }

    sql += ` ORDER BY date DESC`;

    if (query.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET ?`;
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
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

  getRecentTransactions(
    characterId: string,
    limit: number = 100,
  ): Transaction[] {
    return this.getTransactions({ characterId, limit });
  }

  getTransactionsByMonth(characterId: string, month: string): Transaction[] {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // Simple approximation

    return this.getTransactions({ characterId, startDate, endDate });
  }

  getTransactionCount(characterId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM transactions WHERE character_id = ?
    `);

    const result = stmt.get(characterId) as any;
    return result.count;
  }

  // ============================================================================
  // ADVICE EFFECTS OPERATIONS
  // ============================================================================

  insertAdviceEffect(effect: AdviceEffect): void {
    const stmt = this.db.prepare(`
      INSERT INTO advice_effects (
        id, character_id, advice_session_id, effect_type,
        strength, applied_date, expires_date, metadata,
        is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
    );
  }

  getAdviceEffects(query: AdviceEffectQuery): AdviceEffect[] {
    let sql = `SELECT * FROM advice_effects WHERE character_id = ?`;
    const params: any[] = [query.characterId];

    if (query.isActive !== undefined) {
      sql += ` AND is_active = ?`;
      params.push(query.isActive ? 1 : 0);
    }

    if (query.effectType) {
      sql += ` AND effect_type = ?`;
      params.push(query.effectType);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
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

  getActiveAdviceEffects(characterId: string): AdviceEffect[] {
    return this.getAdviceEffects({ characterId, isActive: true });
  }

  deactivateAdviceEffect(effectId: string): void {
    const stmt = this.db.prepare(`
      UPDATE advice_effects SET is_active = 0 WHERE id = ?
    `);

    stmt.run(effectId);
  }

  deactivateExpiredEffects(currentDate: string): void {
    const stmt = this.db.prepare(`
      UPDATE advice_effects
      SET is_active = 0
      WHERE expires_date IS NOT NULL AND expires_date <= ? AND is_active = 1
    `);

    stmt.run(currentDate);
  }

  // ============================================================================
  // MONTHLY SUMMARY OPERATIONS
  // ============================================================================

  insertMonthlySummary(summary: MonthSummary): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO monthly_summaries (
        character_id, month, total_income, total_expenses,
        end_balance, transaction_count, debt_reduction, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      summary.characterId,
      summary.month,
      summary.totalIncome,
      summary.totalExpenses,
      summary.endBalance,
      summary.transactionCount,
      summary.debtReduction,
      summary.createdAt,
    );
  }

  getMonthlySummary(characterId: string, month: string): MonthSummary | null {
    const stmt = this.db.prepare(`
      SELECT * FROM monthly_summaries
      WHERE character_id = ? AND month = ?
    `);

    const row = stmt.get(characterId, month) as any;

    if (!row) return null;

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

  getMonthlySummaries(characterId: string, limit?: number): MonthSummary[] {
    let sql = `
      SELECT * FROM monthly_summaries
      WHERE character_id = ?
      ORDER BY month DESC
    `;

    if (limit) {
      sql += ` LIMIT ?`;
    }

    const stmt = this.db.prepare(sql);
    const rows = limit
      ? (stmt.all(characterId, limit) as any[])
      : (stmt.all(characterId) as any[]);

    return rows.map((row) => ({
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
  getSpendingByCategory(
    characterId: string,
    startDate: string,
    endDate: string,
  ): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT category, SUM(ABS(amount)) as total
      FROM transactions
      WHERE character_id = ?
        AND date >= ?
        AND date <= ?
        AND amount < 0
      GROUP BY category
    `);

    const rows = stmt.all(characterId, startDate, endDate) as any[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.category] = row.total;
    }

    return result;
  }

  /**
   * Get total income for a character over a date range
   */
  getTotalIncome(
    characterId: string,
    startDate: string,
    endDate: string,
  ): number {
    const stmt = this.db.prepare(`
      SELECT SUM(amount) as total
      FROM transactions
      WHERE character_id = ?
        AND date >= ?
        AND date <= ?
        AND amount > 0
    `);

    const result = stmt.get(characterId, startDate, endDate) as any;
    return result.total || 0;
  }

  /**
   * Get total expenses for a character over a date range
   */
  getTotalExpenses(
    characterId: string,
    startDate: string,
    endDate: string,
  ): number {
    const stmt = this.db.prepare(`
      SELECT SUM(ABS(amount)) as total
      FROM transactions
      WHERE character_id = ?
        AND date >= ?
        AND date <= ?
        AND amount < 0
    `);

    const result = stmt.get(characterId, startDate, endDate) as any;
    return result.total || 0;
  }

  /**
   * Get transactions influenced by advisor's advice
   */
  getAdviceInfluencedTransactions(characterId: string): Transaction[] {
    return this.getTransactions({ characterId }).filter(
      (t) => t.adviceInfluenced,
    );
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Vacuum database to reclaim space
   */
  vacuum(): void {
    this.db.exec("VACUUM");
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalTransactions: number;
    totalCharacters: number;
    totalAdviceEffects: number;
    databaseSizeKB: number;
  } {
    const txnCount = this.db
      .prepare("SELECT COUNT(*) as count FROM transactions")
      .get() as any;
    const charCount = this.db
      .prepare("SELECT COUNT(*) as count FROM character_states")
      .get() as any;
    const effectCount = this.db
      .prepare("SELECT COUNT(*) as count FROM advice_effects")
      .get() as any;
    const pageCount = this.db.pragma("page_count") as any[];
    const pageSize = this.db.pragma("page_size") as any[];

    const sizeKB =
      (pageCount[0]["page_count"] * pageSize[0]["page_size"]) / 1024;

    return {
      totalTransactions: txnCount.count,
      totalCharacters: charCount.count,
      totalAdviceEffects: effectCount.count,
      databaseSizeKB: Math.round(sizeKB),
    };
  }

  /**
   * Delete all data for a character (for testing/reset)
   */
  deleteCharacterData(characterId: string): void {
    const deleteTransactions = this.db.prepare(
      "DELETE FROM transactions WHERE character_id = ?",
    );
    const deleteEffects = this.db.prepare(
      "DELETE FROM advice_effects WHERE character_id = ?",
    );
    const deleteSummaries = this.db.prepare(
      "DELETE FROM monthly_summaries WHERE character_id = ?",
    );
    const deleteState = this.db.prepare(
      "DELETE FROM character_states WHERE character_id = ?",
    );

    const deleteAll = this.db.transaction((charId: string) => {
      deleteTransactions.run(charId);
      deleteEffects.run(charId);
      deleteSummaries.run(charId);
      deleteState.run(charId);
    });

    deleteAll(characterId);
  }
}
