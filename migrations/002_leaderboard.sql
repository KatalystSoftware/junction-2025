-- Global Leaderboard Schema for Postgres
-- Simple leaderboard tracking for all advisors

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  advisor_id TEXT NOT NULL UNIQUE,
  advisor_name TEXT NOT NULL, -- AI-sanitized display name

  -- Core Stats
  reputation INTEGER DEFAULT 0,
  skill_level NUMERIC(4,2) DEFAULT 0, -- 0.00 to 10.00
  total_sessions INTEGER DEFAULT 0,
  total_clients_helped INTEGER DEFAULT 0,

  -- Financial Impact
  lifetime_savings_generated NUMERIC(12,2) DEFAULT 0,
  lifetime_debt_cleared NUMERIC(12,2) DEFAULT 0,
  advisor_coins INTEGER DEFAULT 0,

  -- Performance Metrics
  average_advice_score NUMERIC(4,2) DEFAULT 0, -- 0.00 to 10.00
  achievement_count INTEGER DEFAULT 0,

  -- Global Rank (calculated)
  global_rank INTEGER,
  global_score NUMERIC(10,2) DEFAULT 0, -- Weighted score for ranking

  -- Metadata
  first_session_date TIMESTAMP NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard_entries(global_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_score ON leaderboard_entries(global_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_advisor_id ON leaderboard_entries(advisor_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leaderboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_updated_at();
