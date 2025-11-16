# Leaderboards & Social Features

## Overview

Comprehensive leaderboard and social features for the Financial Advisor Simulator, including:

- **Global Rankings** - Compete with other advisors across multiple categories
- **Career Progression Tiers** - Advance through 5 career tiers (Junior → Master)
- **Community Challenges** - Weekly and monthly challenges with rewards
- **Case Sharing** - Share and learn from interesting consultation cases

## Implementation Status

✅ **Backend - Completed:**

- Core leaderboard logic and calculations
- TypeScript types for all social features
- Leaderboard calculator utilities
- Career progression system
- Challenge manager
- Case sharing functionality
- Database layer (PostgreSQL with automatic schema creation)
- API endpoints (Hono routes in routes.ts)
- Leaderboard service (PostgreSQL-only, schema auto-created)

⏳ **Frontend - In Progress:**

- React components (LeaderboardModal, ChallengesModal, CareerProgressModal)
- Data hooks (useLeaderboard, useChallenges, useCareerProgress)
- UI integration with WhatsAppInterface

## Features

### 1. Global Leaderboards

Track your performance across multiple categories:

- **Global Ranking**: Overall performance based on weighted score
- **Reputation**: Ranked by reputation points (0-100)
- **Financial Impact**: Total savings + debt cleared for clients
- **Expertise**: Skill level + average advice quality
- **Advisor Coins**: Currency earned from consultations
- **Achievements**: Total achievements unlocked

Each leaderboard shows:

- Top 10 advisors
- Your rank and percentile
- Surrounding advisors (contextual view)
- Motivational messages based on performance

### 2. Career Progression Tiers

Five career tiers with increasing requirements:

| Tier | Name              | Requirements                              | Coin Bonus |
| ---- | ----------------- | ----------------------------------------- | ---------- |
| 1 🌱 | Junior Advisor    | Starting tier                             | 0          |
| 2 📈 | Associate Advisor | 25 rep, 3 skill, 5 clients, 10 sessions   | 100        |
| 3 💼 | Senior Advisor    | 50 rep, 5 skill, 15 clients, 30 sessions  | 250        |
| 4 🏆 | Expert Advisor    | 75 rep, 7 skill, 35 clients, 60 sessions  | 500        |
| 5 👑 | Master Advisor    | 90 rep, 9 skill, 75 clients, 120 sessions | 1000       |

Each tier tracks progress across 6 dimensions:

- Reputation
- Skill Level
- Clients Helped
- Total Sessions
- Achievements Unlocked
- Financial Impact (€)

### 3. Community Challenges

#### Weekly Challenges

- **Session Marathon**: Complete 10 sessions (500 coins)
- **Financial Hero**: Help clients save €5,000 (1000 coins)
- **Perfect Streak**: Maintain 5 high-quality sessions (1500 coins)

#### Monthly Challenges

- **Master Advisor**: Help 50 unique clients (5000 coins)
- **Debt Destroyer**: Eliminate €25,000 in client debt (10000 coins)
- **Topic Expert**: Reach expertise level 8 in any topic (3000 coins)

Each challenge shows:

- Progress bar
- Time remaining
- Current progress vs. target
- Coin reward

### 4. Case Sharing

Share your best consultation cases with the community:

**Features:**

- Share high-quality sessions (score 7+)
- Auto-generated titles and summaries
- Privacy options (public/private, anonymize client)
- Social engagement (likes, comments, views)
- Browse popular and recent cases

**Shareable Cases Must Have:**

- Advice quality score ≥ 7
- Financial projection with impact ≥ €100
- Complete evaluation data

## Database Schema

### Tables Created

1. **leaderboard_entries** - Advisor statistics and rankings
2. **career_tiers** - Tier definitions and requirements
3. **community_challenges** - Challenge definitions
4. **challenge_participations** - Advisor participation in challenges
5. **shared_cases** - Shared consultation cases
6. **case_reactions** - Likes and reactions to cases
7. **case_comments** - Comments on shared cases
8. **weekly_rankings** - Historical ranking snapshots

### Database Implementation

**Auto-Schema Creation:**

- Schema created automatically on service initialization
- File: `src/mastra/persistence/leaderboard-service.ts`
- Idempotent creation (safe to run multiple times)
- Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
- PostgreSQL-only implementation (requires DATABASE_URL)
- Throws clear error if DATABASE_URL is not set

### Postgres Schema

```sql
-- Leaderboard Entries
CREATE TABLE leaderboard_entries (
  id SERIAL PRIMARY KEY,
  advisor_id TEXT NOT NULL UNIQUE,
  advisor_name TEXT NOT NULL,
  reputation INTEGER DEFAULT 0,
  skill_level INTEGER DEFAULT 0,
  career_tier INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  total_clients_helped INTEGER DEFAULT 0,
  lifetime_savings_generated NUMERIC DEFAULT 0,
  lifetime_debt_cleared NUMERIC DEFAULT 0,
  advisor_coins INTEGER DEFAULT 0,
  average_advice_score NUMERIC DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  achievement_count INTEGER DEFAULT 0,
  trusted_relationships INTEGER DEFAULT 0,
  recommendations_received INTEGER DEFAULT 0,
  cases_shared INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  global_rank INTEGER,
  reputation_rank INTEGER,
  impact_rank INTEGER,
  expertise_rank INTEGER,
  last_updated TIMESTAMP NOT NULL,
  first_session_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_global_rank ON leaderboard_entries(global_rank);
CREATE INDEX idx_leaderboard_reputation ON leaderboard_entries(reputation DESC);
CREATE INDEX idx_leaderboard_impact ON leaderboard_entries((lifetime_savings_generated + lifetime_debt_cleared) DESC);

-- Career Tiers
CREATE TABLE career_tiers (
  tier_level INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_name_fi TEXT NOT NULL,
  tier_emoji TEXT NOT NULL,
  min_reputation INTEGER NOT NULL,
  min_skill_level INTEGER NOT NULL,
  min_clients INTEGER NOT NULL,
  min_sessions INTEGER NOT NULL,
  min_achievements INTEGER NOT NULL,
  min_savings_impact NUMERIC NOT NULL,
  coin_bonus INTEGER DEFAULT 0,
  unlock_description TEXT,
  unlock_description_fi TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Community Challenges
CREATE TABLE community_challenges (
  id SERIAL PRIMARY KEY,
  challenge_name TEXT NOT NULL,
  challenge_name_fi TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_description_fi TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  difficulty TEXT NOT NULL,
  coin_reward INTEGER NOT NULL,
  achievement_id TEXT,
  badge_emoji TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenge Participations
CREATE TABLE challenge_participations (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES community_challenges(id),
  advisor_id TEXT NOT NULL,
  current_progress NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  participant_rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(challenge_id, advisor_id)
);
```

## Web UI Integration

### Architecture

**Storage Layer:**

- **Production:** Postgres with Mastra's PostgresStore
- **Development:** LibSQL or Postgres

**UI Layer:**

- React with shadcn/ui components
- TanStack Query for state management

**API Layer:**

- HTTP API endpoints via Hono

### API Endpoints

```typescript
GET  /api/leaderboard/:category?limit=100
GET  /api/leaderboard/rank/:advisorId/:category
GET  /api/career-tiers
GET  /api/career-progress/:advisorId
GET  /api/challenges/active
GET  /api/challenges/:advisorId/progress
POST /api/challenges/:challengeId/update-progress
GET  /api/cases/popular?limit=20
GET  /api/cases/recent?limit=20
POST /api/cases/share
POST /api/cases/:caseId/react
```

### React Components

**LeaderboardModal.tsx**

- Shows top 10 + user's rank
- Tabs for different categories (Global, Reputation, Impact, etc.)
- Table with: Rank, Avatar, Name, Tier Badge, Primary Stat

**ChallengesModal.tsx**

- Lists active challenges with progress bars
- Shows time remaining and coin rewards
- Section for completed challenges

**CareerProgressModal.tsx**

- Shows current tier with emoji/badge
- Progress bars for all 6 requirements
- Overall progress percentage
- Next tier and rewards

### Data Hooks

```typescript
// Fetch leaderboard data
const { leaderboard, isLoading, error, refetch } = useLeaderboard(category);

// Fetch challenges and progress
const challenges = useChallenges(advisorId);

// Fetch career progression
const careerProgress = useCareerProgress(advisorState);
```

### Example Integration

```tsx
import { LeaderboardModal } from "./components/LeaderboardModal";
import { useLeaderboard } from "./hooks/useLeaderboard";

export function LeaderboardButton() {
  const [open, setOpen] = useState(false);
  const { leaderboard, isLoading } = useLeaderboard("global");

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Trophy /> Leaderboard
      </Button>

      <LeaderboardModal
        open={open}
        onOpenChange={setOpen}
        leaderboard={leaderboard}
        isLoading={isLoading}
      />
    </>
  );
}
```

## Integration Points

### Orchestrator Hooks

The system integrates automatically with the game orchestrator:

```typescript
import {
  initializeSocialFeatures,
  afterSessionComplete,
  onAdvisorInit,
} from "./orchestrator-hooks.ts";

// On game start
await initializeSocialFeatures();

// On advisor initialization
await onAdvisorInit(advisorState, advisorName);

// After each session
gameResponse = await afterSessionComplete(
  advisorState,
  advisorName,
  gameResponse,
);
```

## Performance Considerations

1. **Ranking Recalculation**: Rankings recalculated every 10 sessions
2. **Challenge Archival**: Expired challenges archived automatically
3. **Database Indexing**: All critical queries have indexes
4. **Caching**: Leaderboard data cached in UI layer

## Testing

### Testing Checklist

- [x] Database schema auto-creates successfully
- [x] API endpoints return correct data (basic implementation complete)
- [ ] Leaderboard displays top 10 advisors
- [ ] User's rank is shown correctly
- [ ] Challenges display with progress bars
- [ ] Career progression shows correct tier and requirements
- [ ] Data updates after completing a session
- [ ] Tier advancement triggers notification
- [ ] Challenge completion awards coins
- [ ] All modals open/close properly

### Testing Commands

```bash
# Run the game
pnpm dev

# Then open http://localhost:3000

# The system will automatically:
# 1. Initialize the database on first run
# 2. Create initial challenges
# 3. Update leaderboards after each session
# 4. Check for tier advancements
# 5. Track challenge progress
```

## Next Steps

1. ~~**Database Migration**~~: ✅ Schema auto-created in service
2. ~~**Leaderboard Service**~~: ✅ PostgreSQL-only implementation complete
3. ~~**API Endpoints**~~: ✅ Basic Hono routes implemented in routes.ts
4. **Build React Components**: Create modals and UI (frontend components exist, need integration)
5. **Implement Missing Methods**: Add category support and getSurroundingAdvisors
6. **Test End-to-End**: Ensure everything works together

## Future Enhancements

Potential additions:

- Friend lists and private leaderboards
- Team challenges
- Mentor system for top advisors
- Case study library with search
- Achievement badges and display
- Season-based leaderboards with resets
- Push notifications for challenge completions
- Social profile pages

## Troubleshooting

**Database not initializing?**

- Check file permissions for database
- Ensure database client is properly configured
- Check console for initialization errors

**Leaderboard not updating?**

- Verify `afterSessionComplete` hook is called
- Check that advisor ID is consistent
- Ensure session data is complete

**Challenges not appearing?**

- Run `initializeChallenges()` manually
- Check date ranges in challenge definitions
- Verify database has challenge data
