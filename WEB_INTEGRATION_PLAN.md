# Leaderboards & Social Features - Web UI Integration Plan

## Overview

This document outlines the plan to integrate leaderboards and social features into the web UI (frontend React app) using Postgres for storage instead of LibSQL.

## Current Status

✅ **Completed:**
- Core leaderboard logic and calculations
- TypeScript types for all social features
- Leaderboard calculator utilities
- Career progression system
- Challenge manager
- Case sharing functionality

❌ **Needs Migration:**
- Database layer (LibSQL → Postgres)
- UI components (Ink Terminal → React/shadcn)
- Storage service (needs Postgres adapter)
- API endpoints (needs Hono routes)

---

## Architecture Changes

### Storage Layer

**Current:** LibSQL with direct SQL queries
**Target:** Postgres with mastra's PostgresStore or direct pg client

### UI Layer

**Current:** Ink (React for CLIs) components
**Target:** React with shadcn/ui components

### API Layer

**Current:** Direct function calls from TUI
**Target:** HTTP API endpoints via Hono

---

## Implementation Plan

### Phase 1: Database Migration to Postgres

**1.1 Create Postgres Migration**
- File: `migrations/002_leaderboards.sql` (or similar)
- Convert `leaderboard-schema.sql` to Postgres-compatible SQL
- Key changes:
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMP DEFAULT NOW()`
  - Adjust index syntax if needed

**1.2 Update Leaderboard Service**
- File: `src/mastra/persistence/leaderboard-service.ts`
- Add Postgres client support (use `pg` package)
- Support both Postgres (production) and LibSQL (local dev)
- Pattern:
  ```typescript
  const client = process.env.DATABASE_URL
    ? createPostgresClient(process.env.DATABASE_URL)
    : createLibSQLClient('file:../elamapeli.db');
  ```

### Phase 2: API Endpoints

**2.1 Create Leaderboard Routes**
- File: `src/mastra/api/leaderboard-routes.ts`
- Endpoints needed:
  ```typescript
  GET  /leaderboard/:category?limit=100
  GET  /leaderboard/rank/:advisorId/:category
  GET  /career-tiers
  GET  /career-progress/:advisorId
  GET  /challenges/active
  GET  /challenges/:advisorId/progress
  POST /challenges/:challengeId/update-progress
  GET  /cases/popular?limit=20
  GET  /cases/recent?limit=20
  POST /cases/share
  POST /cases/:caseId/react
  ```

**2.2 Integrate into Main API**
- File: `src/mastra/api/routes.ts`
- Add leaderboard routes:
  ```typescript
  import { leaderboardApp } from './leaderboard-routes.ts';
  app.route('/leaderboard', leaderboardApp);
  ```

**2.3 Export Types for Frontend**
- File: `src/mastra/api/index.ts`
- Export leaderboard API types for RPC client

### Phase 3: Frontend Components

**3.1 Create Leaderboard Modal**
- File: `frontend/src/components/LeaderboardModal.tsx`
- Uses shadcn Dialog component
- Tabs for different categories (Global, Reputation, Impact, etc.)
- Shows top 10 + user's rank
- Table with: Rank, Avatar, Name, Tier Badge, Primary Stat

**3.2 Create Challenges Modal**
- File: `frontend/src/components/ChallengesModal.tsx`
- Lists active challenges with progress bars
- Shows time remaining
- Displays coin rewards
- Section for completed challenges

**3.3 Create Career Progression Modal**
- File: `frontend/src/components/CareerProgressModal.tsx`
- Shows current tier with emoji/badge
- Progress bars for all 6 requirements:
  - Reputation, Skill, Clients, Sessions, Achievements, Impact
- Overall progress percentage
- Shows next tier and rewards

**3.4 Add Navigation Buttons**
- File: `frontend/src/components/ChatSidebar.tsx`
- Add button group below player profile:
  ```tsx
  <div className="flex gap-2 mt-4">
    <Button onClick={() => setShowLeaderboard(true)}>
      <Trophy /> Leaderboard
    </Button>
    <Button onClick={() => setShowChallenges(true)}>
      <Target /> Challenges
    </Button>
    <Button onClick={() => setShowCareer(true)}>
      <Briefcase /> Career
    </Button>
  </div>
  ```

### Phase 4: Frontend Data Hooks

**4.1 Create useLeaderboard Hook**
- File: `frontend/src/hooks/useLeaderboard.ts`
- Fetches leaderboard data via RPC client
- Caches data, refreshes on mount
- Returns: `{ leaderboard, isLoading, error, refetch }`

**4.2 Create useChallenges Hook**
- File: `frontend/src/hooks/useChallenges.ts`
- Fetches active challenges and user progress
- Auto-refreshes when user state changes

**4.3 Create useCareerProgress Hook**
- File: `frontend/src/hooks/useCareerProgress.ts`
- Fetches career tier info and progress

### Phase 5: Integration & Auto-Updates

**5.1 Update Orchestrator Hooks**
- File: `src/mastra/game/orchestrator-hooks.ts`
- Already created but needs testing with Postgres
- Ensure it runs after each session completion

**5.2 Auto-Refresh Frontend**
- When `advisorState` updates (after session), trigger refetch of:
  - Leaderboard (if modal is open)
  - Challenges progress
  - Career progress

**5.3 Tier Advancement Notifications**
- When tier advances, show toast/notification
- Display: New Tier Badge + Coin Bonus

---

## Files to Create/Modify

### Backend (src/mastra/)

**New Files:**
- `migrations/002_leaderboards.sql` - Postgres migration
- `api/leaderboard-routes.ts` - API endpoints

**Modified Files:**
- `persistence/leaderboard-service.ts` - Add Postgres support
- `api/routes.ts` - Mount leaderboard routes
- `api/index.ts` - Export leaderboard types
- `game/orchestrator.ts` - Call hooks after session

### Frontend (frontend/src/)

**New Files:**
- `components/LeaderboardModal.tsx`
- `components/ChallengesModal.tsx`
- `components/CareerProgressModal.tsx`
- `hooks/useLeaderboard.ts`
- `hooks/useChallenges.ts`
- `hooks/useCareerProgress.ts`

**Modified Files:**
- `components/ChatSidebar.tsx` - Add nav buttons
- `components/WhatsAppInterface.tsx` - Add modal state

---

## Database Schema (Postgres Version)

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

-- Career Tiers (same data)
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

-- Insert tier data...

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

-- (Add other tables: shared_cases, case_reactions, case_comments, weekly_rankings)
```

---

## Example API Endpoint

```typescript
// src/mastra/api/leaderboard-routes.ts
import { Hono } from "hono";
import { leaderboardService } from "../persistence/leaderboard-service.ts";

export const leaderboardApp = new Hono();

leaderboardApp.get("/:category", async (c) => {
  const category = c.req.param("category") as any;
  const limit = Number(c.req.query("limit") || "100");

  const leaderboard = await leaderboardService.getLeaderboard(category, limit);

  return c.json(leaderboard);
});

leaderboardApp.get("/rank/:advisorId/:category", async (c) => {
  const advisorId = c.req.param("advisorId");
  const category = c.req.param("category") as any;

  const rank = await leaderboardService.getAdvisorRank(advisorId, category);

  return c.json({ rank });
});

// ... more endpoints
```

---

## Example React Component

```tsx
// frontend/src/components/LeaderboardModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { Trophy, TrendingUp, Coins } from "lucide-react";

export function LeaderboardModal({ open, onOpenChange }: Props) {
  const [category, setCategory] = useState("global");
  const { leaderboard, isLoading } = useLeaderboard(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Leaderboards
          </DialogTitle>
        </DialogHeader>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="reputation">Reputation</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
            <TabsTrigger value="expertise">Expertise</TabsTrigger>
          </TabsList>

          <TabsContent value={category}>
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <LeaderboardTable entries={leaderboard.entries} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Estimated Implementation Time

- **Phase 1** (Postgres Migration): 2-3 hours
- **Phase 2** (API Endpoints): 3-4 hours
- **Phase 3** (React Components): 4-5 hours
- **Phase 4** (Data Hooks): 2-3 hours
- **Phase 5** (Integration & Testing): 2-3 hours

**Total**: 13-18 hours for full implementation

---

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] API endpoints return correct data
- [ ] Leaderboard displays top 10 advisors
- [ ] User's rank is shown correctly
- [ ] Challenges display with progress bars
- [ ] Career progression shows correct tier and requirements
- [ ] Data updates after completing a session
- [ ] Tier advancement triggers notification
- [ ] Challenge completion awards coins
- [ ] All modals open/close properly

---

## Next Steps

1. **Start with Database Migration**: Create the Postgres schema
2. **Update Leaderboard Service**: Add Postgres support
3. **Create API Endpoints**: Build the Hono routes
4. **Build React Components**: Create modals and UI
5. **Test End-to-End**: Ensure everything works together

---

## Questions to Resolve

1. **Schema Namespace**: Should leaderboard tables go in the `mastra` schema or a separate `leaderboard` schema?
2. **Advisor Names**: How to get/store advisor names? From session metadata?
3. **Auto-Init**: Should challenges be auto-created on server start?
4. **Real-time Updates**: Should leaderboard update live or on page refresh?

---

This plan provides a comprehensive roadmap for migrating the leaderboard features from TUI to Web UI with Postgres support.
