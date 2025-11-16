# Leaderboards & Social Features - Usage Guide

## Overview

This implementation adds comprehensive leaderboard and social features to the Financial Advisor Simulator, including:

- **Global Rankings** - Compete with other advisors across multiple categories
- **Career Progression Tiers** - Advance through 5 career tiers (Junior → Master)
- **Community Challenges** - Weekly and monthly challenges with rewards
- **Case Sharing** - Share and learn from interesting consultation cases

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

| Tier | Name | Requirements | Coin Bonus |
|------|------|--------------|------------|
| 1 🌱 | Junior Advisor | Starting tier | 0 |
| 2 📈 | Associate Advisor | 25 rep, 3 skill, 5 clients, 10 sessions | 100 |
| 3 💼 | Senior Advisor | 50 rep, 5 skill, 15 clients, 30 sessions | 250 |
| 4 🏆 | Expert Advisor | 75 rep, 7 skill, 35 clients, 60 sessions | 500 |
| 5 👑 | Master Advisor | 90 rep, 9 skill, 75 clients, 120 sessions | 1000 |

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

## Integration Points

### Orchestrator Hooks

The system integrates automatically with the game orchestrator through hooks:

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
gameResponse = await afterSessionComplete(advisorState, advisorName, gameResponse);
```

### UI Integration Example

To display leaderboards in the TUI, use the provided components:

```typescript
import {
  LeaderboardPanel,
  CareerProgressPanel,
  ChallengesPanel,
} from "../components/LeaderboardPanel.tsx";
import {
  getLeaderboardData,
  getCareerProgressionData,
  getChallengesData,
} from "../mastra/game/orchestrator-hooks.ts";

// In your UI component
const leaderboardData = await getLeaderboardData(advisorId, "global");
const careerData = await getCareerProgressionData(advisorState);
const challengesData = await getChallengesData(advisorState);

// Render
<LeaderboardPanel
  leaderboard={leaderboardData.leaderboard}
  currentAdvisorId={advisorId}
  showSurrounding={false}
/>

<CareerProgressPanel
  currentTier={careerData.currentTier}
  nextTier={careerData.nextTier}
  progress={careerData.progress}
  overallProgress={careerData.overallProgress}
/>

<ChallengesPanel challenges={challengesData} />
```

### Keyboard Shortcuts (Suggested)

Add these to your TUI for easy navigation:

- `l` - View leaderboards
- `c` - View challenges
- `p` - View career progression
- `s` - Share current case
- `b` - Browse shared cases
- `tab` - Cycle through leaderboard categories

## API Reference

### Leaderboard Service

```typescript
import { leaderboardService } from "../persistence/leaderboard-service.ts";

// Initialize database
await leaderboardService.initialize();

// Update advisor entry
await leaderboardService.upsertLeaderboardEntry(advisorState, advisorName);

// Get leaderboard
const leaderboard = await leaderboardService.getLeaderboard("global", 100);

// Get advisor rank
const rank = await leaderboardService.getAdvisorRank(advisorId, "global");

// Get surrounding advisors
const surrounding = await leaderboardService.getSurroundingAdvisors(advisorId, "global", 5);
```

### Career Progression

```typescript
import {
  checkTierAdvancement,
  getTierProgressBreakdown,
} from "../game/career-progression.ts";

// Check for tier advancement
const advancement = await checkTierAdvancement(advisorState);

// Get progress breakdown
const progress = await getTierProgressBreakdown(advisorState);
```

### Challenge Manager

```typescript
import {
  initializeChallenges,
  updateChallengeProgress,
  getAdvisorChallengesWithProgress,
} from "../game/challenge-manager.ts";

// Initialize challenges
await initializeChallenges();

// Update progress
await updateChallengeProgress(advisorState);

// Get advisor's challenges with progress
const challenges = await getAdvisorChallengesWithProgress(advisorState);
```

### Case Sharing

```typescript
import {
  shareConsultationCase,
  getShareableSessions,
  getPopularCases,
  likeCase,
  commentOnCase,
} from "../game/case-sharing.ts";

// Share a case
await shareConsultationCase(advisorState, advisorName, {
  sessionId: "session_123",
  title: "Helping John with budgeting",
  summary: "Helped create a sustainable budget...",
  isPublic: true,
  anonymizeCharacter: false,
});

// Get shareable sessions
const shareable = getShareableSessions(advisorState);

// Get popular cases
const popular = await getPopularCases(20);

// Like a case
await likeCase(caseUuid, advisorId);
```

## Performance Considerations

1. **Ranking Recalculation**: Rankings are recalculated every 10 sessions to reduce database load
2. **Challenge Archival**: Expired challenges are archived automatically
3. **Database Indexing**: All critical queries have indexes for fast retrieval
4. **Caching**: Leaderboard data can be cached in the UI layer

## Testing

To test the features:

```bash
# Run the game
pnpm play

# The system will automatically:
# 1. Initialize the database on first run
# 2. Create initial challenges
# 3. Update leaderboards after each session
# 4. Check for tier advancements
# 5. Track challenge progress
```

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
- Check file permissions for `elamapeli.db`
- Ensure LibSQL client is properly configured
- Check console for initialization errors

**Leaderboard not updating?**
- Verify `afterSessionComplete` hook is called
- Check that advisor ID is consistent
- Ensure session data is complete

**Challenges not appearing?**
- Run `initializeChallenges()` manually
- Check date ranges in challenge definitions
- Verify database has challenge data

## Contributing

When adding new features:
1. Update database schema in `leaderboard-schema.sql`
2. Add types to `game-types.ts`
3. Implement service methods in `leaderboard-service.ts`
4. Create UI components in `components/`
5. Add hooks in `orchestrator-hooks.ts`
6. Update this documentation

## License

Part of the Elämäpeli 2025 - Financial Advisor Simulator project.
