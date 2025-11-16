-- Leaderboards & Social Features Schema
-- This schema supports global rankings, career progression, community challenges, and case sharing

-- Global Leaderboard Entries
-- Stores aggregated stats for all advisors across different ranking categories
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  advisor_id TEXT NOT NULL UNIQUE,
  advisor_name TEXT NOT NULL,

  -- Core Stats
  reputation INTEGER DEFAULT 0,
  skill_level INTEGER DEFAULT 0,
  career_tier INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  total_clients_helped INTEGER DEFAULT 0,

  -- Financial Impact
  lifetime_savings_generated REAL DEFAULT 0,
  lifetime_debt_cleared REAL DEFAULT 0,
  advisor_coins INTEGER DEFAULT 0,

  -- Performance Metrics
  average_advice_score REAL DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  achievement_count INTEGER DEFAULT 0,

  -- Social Metrics
  trusted_relationships INTEGER DEFAULT 0,
  recommendations_received INTEGER DEFAULT 0,
  cases_shared INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,

  -- Rankings (updated periodically)
  global_rank INTEGER,
  reputation_rank INTEGER,
  impact_rank INTEGER,
  expertise_rank INTEGER,

  -- Metadata
  last_updated TEXT NOT NULL,
  first_session_date TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient ranking queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard_entries(global_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_reputation ON leaderboard_entries(reputation DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_impact ON leaderboard_entries(lifetime_savings_generated DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_skill ON leaderboard_entries(skill_level DESC, reputation DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_coins ON leaderboard_entries(advisor_coins DESC);

-- Career Progression Tiers
-- Enhanced tier system with requirements and rewards
CREATE TABLE IF NOT EXISTS career_tiers (
  tier_level INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_name_fi TEXT NOT NULL,
  tier_emoji TEXT NOT NULL,

  -- Requirements
  min_reputation INTEGER NOT NULL,
  min_skill_level INTEGER NOT NULL,
  min_clients INTEGER NOT NULL,
  min_sessions INTEGER NOT NULL,
  min_achievements INTEGER NOT NULL,
  min_savings_impact REAL NOT NULL,

  -- Rewards
  coin_bonus INTEGER DEFAULT 0,
  unlock_description TEXT,
  unlock_description_fi TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default career tiers
-- BALANCED coin bonuses for better progression pacing (reduced from 100/250/500/1000)
INSERT OR IGNORE INTO career_tiers (tier_level, tier_name, tier_name_fi, tier_emoji, min_reputation, min_skill_level, min_clients, min_sessions, min_achievements, min_savings_impact, coin_bonus, unlock_description, unlock_description_fi) VALUES
(1, 'Junior Advisor', 'Juniori-neuvoja', '🌱', 0, 0, 0, 0, 0, 0, 0, 'Starting your career journey', 'Aloittaa urasi matka'),
(2, 'Associate Advisor', 'Avustava neuvoja', '📈', 25, 3, 5, 10, 3, 5000, 50, 'Building trust and expertise', 'Luottamuksen ja asiantuntemuksen rakentaminen'),
(3, 'Senior Advisor', 'Vanhempi neuvoja', '💼', 50, 5, 15, 30, 8, 25000, 150, 'Recognized expertise in financial guidance', 'Tunnustettu asiantuntemus talousohjauksessa'),
(4, 'Expert Advisor', 'Asiantuntijaneuvoja', '🏆', 75, 7, 35, 60, 12, 75000, 300, 'Master of financial wisdom', 'Talousviisauden mestari'),
(5, 'Master Advisor', 'Mestari-neuvoja', '👑', 90, 9, 75, 120, 16, 200000, 500, 'Elite advisor with legendary impact', 'Eliittineuvoja, jolla on legendaarinen vaikutus');

-- Community Challenges
-- Weekly/monthly challenges for competitive gameplay
CREATE TABLE IF NOT EXISTS community_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_name TEXT NOT NULL,
  challenge_name_fi TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_description_fi TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'weekly', 'monthly', 'special'

  -- Challenge Parameters
  metric_type TEXT NOT NULL, -- 'sessions', 'savings', 'clients', 'streak', 'expertise'
  target_value REAL NOT NULL,
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'extreme'

  -- Rewards
  coin_reward INTEGER NOT NULL,
  achievement_id TEXT,
  badge_emoji TEXT,

  -- Timing
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Challenge Participation
-- Track advisor participation in challenges
CREATE TABLE IF NOT EXISTS challenge_participations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  advisor_id TEXT NOT NULL,

  -- Progress
  current_progress REAL DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,

  -- Ranking (for competitive challenges)
  participant_rank INTEGER,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (challenge_id) REFERENCES community_challenges(id),
  UNIQUE(challenge_id, advisor_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participation ON challenge_participations(challenge_id, advisor_id);
CREATE INDEX IF NOT EXISTS idx_challenge_leaderboard ON challenge_participations(challenge_id, current_progress DESC);

-- Shared Cases
-- Allow advisors to share interesting consultation cases
CREATE TABLE IF NOT EXISTS shared_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_uuid TEXT NOT NULL UNIQUE,
  advisor_id TEXT NOT NULL,
  advisor_name TEXT NOT NULL,

  -- Case Details
  character_name TEXT NOT NULL,
  case_title TEXT NOT NULL,
  case_summary TEXT NOT NULL,

  -- Consultation Data
  initial_problem TEXT NOT NULL,
  advice_given TEXT NOT NULL,
  financial_impact REAL DEFAULT 0,
  advice_quality_score REAL DEFAULT 0,

  -- Session Info
  session_date TEXT NOT NULL,
  topics_covered TEXT, -- JSON array of topics

  -- Social Engagement
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Privacy
  is_public INTEGER DEFAULT 1,
  anonymize_character INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_cases_advisor ON shared_cases(advisor_id);
CREATE INDEX IF NOT EXISTS idx_shared_cases_popular ON shared_cases(likes_count DESC, views_count DESC);
CREATE INDEX IF NOT EXISTS idx_shared_cases_recent ON shared_cases(created_at DESC);

-- Case Reactions
-- Track likes/reactions to shared cases
CREATE TABLE IF NOT EXISTS case_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_uuid TEXT NOT NULL,
  reactor_advisor_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL, -- 'like', 'helpful', 'insightful'

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (case_uuid) REFERENCES shared_cases(case_uuid),
  UNIQUE(case_uuid, reactor_advisor_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_case_reactions ON case_reactions(case_uuid);

-- Case Comments
-- Allow advisors to comment on shared cases
CREATE TABLE IF NOT EXISTS case_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_uuid TEXT NOT NULL,
  commenter_advisor_id TEXT NOT NULL,
  commenter_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (case_uuid) REFERENCES shared_cases(case_uuid)
);

CREATE INDEX IF NOT EXISTS idx_case_comments ON case_comments(case_uuid, created_at DESC);

-- Weekly Rankings Snapshots
-- Historical leaderboard data for tracking progress over time
CREATE TABLE IF NOT EXISTS weekly_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  advisor_id TEXT NOT NULL,

  -- Rankings that week
  global_rank INTEGER,
  reputation_rank INTEGER,
  impact_rank INTEGER,

  -- Stats that week
  reputation INTEGER,
  skill_level INTEGER,
  total_sessions INTEGER,
  lifetime_savings_generated REAL,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(week_start_date, advisor_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_rankings ON weekly_rankings(week_start_date, global_rank);
