-- Junction 2025 PostgreSQL Schema Initialization
-- Migrated from SQLite to PostgreSQL

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Character States Table
-- Stores current financial state per character
CREATE TABLE IF NOT EXISTS character_states (
    character_id TEXT PRIMARY KEY,
    advisor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    income REAL NOT NULL,
    expenses REAL NOT NULL,
    savings REAL NOT NULL,
    debt REAL NOT NULL,
    credit_score INTEGER NOT NULL,
    risk_tolerance TEXT NOT NULL,
    financial_knowledge TEXT NOT NULL,
    goals JSONB NOT NULL,
    current_month INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on advisor_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_character_states_advisor_id
    ON character_states(advisor_id);

-- Index on advisor_id and character_id combination
CREATE INDEX IF NOT EXISTS idx_character_states_advisor_character
    ON character_states(advisor_id, character_id);

-- Transactions Table
-- Individual financial transactions (20-40 per month per character)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    advisor_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    FOREIGN KEY (character_id) REFERENCES character_states(character_id) ON DELETE CASCADE
);

-- Index on character_id for character-specific queries
CREATE INDEX IF NOT EXISTS idx_transactions_character_id
    ON transactions(character_id);

-- Index on advisor_id for advisor-specific queries
CREATE INDEX IF NOT EXISTS idx_transactions_advisor_id
    ON transactions(advisor_id);

-- Index on month for time-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_month
    ON transactions(month);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_transactions_advisor_character_month
    ON transactions(advisor_id, character_id, month);

-- Advice Effects Table
-- Tracks the advisor's influence on character decisions
CREATE TABLE IF NOT EXISTS advice_effects (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    advisor_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    advice_type TEXT NOT NULL,
    impact_category TEXT NOT NULL,
    impact_amount REAL NOT NULL,
    success_score REAL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    FOREIGN KEY (character_id) REFERENCES character_states(character_id) ON DELETE CASCADE
);

-- Index on character_id
CREATE INDEX IF NOT EXISTS idx_advice_effects_character_id
    ON advice_effects(character_id);

-- Index on advisor_id
CREATE INDEX IF NOT EXISTS idx_advice_effects_advisor_id
    ON advice_effects(advisor_id);

-- Monthly Summaries Table
-- Aggregated monthly financial data per character
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    advisor_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    total_income REAL NOT NULL,
    total_expenses REAL NOT NULL,
    net_savings REAL NOT NULL,
    debt_change REAL NOT NULL,
    credit_score_change INTEGER NOT NULL,
    key_events JSONB,
    advice_given JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES character_states(character_id) ON DELETE CASCADE,
    UNIQUE(character_id, month)
);

-- Index on character_id
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_character_id
    ON monthly_summaries(character_id);

-- Index on advisor_id
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_advisor_id
    ON monthly_summaries(advisor_id);

-- Index on month
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month
    ON monthly_summaries(month);

-- Composite unique index for advisor-character-month combination
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_advisor_character_month
    ON monthly_summaries(advisor_id, character_id, month);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO junction_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO junction_user;
