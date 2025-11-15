# Analytics Dashboard 📊

The Analytics Dashboard provides comprehensive insights into advisor performance, topic expertise, character relationships, and financial impact.

## Features

### 1. **Advisor Performance Stats** 📈
- **Overall Metrics**:
  - Total sessions completed
  - Average quality score (0-10)
  - Average communication effectiveness
  - Overall success rate (% of sessions with quality >= 7)

- **Trends Analysis**:
  - Quality trend (improving/declining/stable)
  - Trend percentage change
  - Session streaks (current and longest)

- **Score Distribution**:
  - Excellent (9-10), Good (7-8), Average (5-6), Poor (0-4)

- **Evaluation Metrics**:
  - Empathy rate
  - Actionability rate
  - Accuracy rate

- **Time-Based Metrics**:
  - Sessions in last 7 days
  - Sessions in last 30 days

### 2. **Topic Expertise Radar Charts** 🎓
Tracks expertise across all 10 financial topics:
- Budgeting
- Saving
- Debt Management
- Investing
- Loans
- Insurance
- Retirement
- Emergency Fund
- Credit Score
- Scam Awareness

**For each topic:**
- Expertise level (0-10)
- Session count
- Average quality score
- Success rate
- Total financial impact
- Last practiced date

**Insights:**
- Overall expertise rating
- Strongest topic
- Weakest topic
- Topics needing practice (>30 days since last session)

### 3. **Success Rates per Character Type** 👥
- **Per Character Metrics**:
  - Total sessions
  - Average quality score
  - Success rate
  - Trust level (0-1) and tier
  - Relationship strength (weak/moderate/strong/excellent)
  - Visit count
  - Advice followed count
  - Positive/neutral/negative outcomes
  - Financial impact (savings generated, debt cleared)

- **Overall Analytics**:
  - Average success rate across all characters
  - Most successful character
  - Most challenging character
  - Total active relationships

### 4. **Financial Impact Visualizations** 💰
- **Lifetime Totals**:
  - Savings generated (€)
  - Debt cleared (€)
  - Interest saved (€)
  - Total clients helped

- **Averages**:
  - Average savings per session
  - Average debt cleared per session
  - Average coins per session

- **By Topic**:
  - Total savings by topic
  - Total debt cleared by topic
  - Session count by topic

- **Recent Performance**:
  - Savings in last 30 days
  - Debt cleared in last 30 days

- **Projection Analysis**:
  - Projection accuracy (% of projections within 20% of actual)

- **Rewards**:
  - Total coins earned
  - Average coins by quality range

### 5. **Trend Analytics** 📉
- Time-series data for all sessions
- Quality score trends
- Reputation trends
- Skill level progression
- Coins earned over time
- Financial impact over time
- Moving averages (7-session and 30-session)

### 6. **Insights & Recommendations** 💡
Automatically generated insights based on performance:
- **Success** insights: Celebrate achievements
- **Warning** insights: Alert to declining performance
- **Info** insights: Highlight areas for attention
- **Tip** insights: Suggest improvements

**Recommendations include:**
- Focus areas (topics to improve)
- Strength areas (topics you excel at)
- Relationships to nurture (characters needing attention)

## Usage

### Command Line

#### Test Analytics System
```bash
pnpm test:analytics
```
Tests the analytics calculator with mock data and displays all metrics.

#### View Analytics Dashboard
```bash
pnpm analytics [sessionId]
```
Displays the full analytics dashboard for a specific session in the terminal UI.

Default session ID: `default-session`

### Programmatic Usage

#### Using the Service Layer
```typescript
import { getAnalyticsService } from './mastra/analytics';

// Create service instance
const analyticsService = getAnalyticsService();

// Load session data
await analyticsService.loadAdvisorState('session-id');

// Get complete dashboard
const dashboard = analyticsService.getDashboard();

// Get specific sections
const performance = analyticsService.getPerformanceStats();
const expertise = analyticsService.getTopicExpertise();
const characters = analyticsService.getCharacterAnalytics();
const financial = analyticsService.getFinancialImpact();
const trends = analyticsService.getTrends();

// Get insights
const insights = analyticsService.getInsights();

// Get quick summary
const summary = analyticsService.getSummary();

// Export to JSON
const json = analyticsService.exportAsJSON();
```

#### Using Standalone Functions
```typescript
import {
  calculateAnalyticsDashboard,
  calculatePerformanceStats,
  calculateTopicExpertise,
  calculateCharacterAnalytics,
  calculateFinancialImpact,
  generateAnalyticsInsights,
  getAnalyticsForSession,
  compareAnalytics,
} from './mastra/analytics';

// Load session and calculate
const advisorState = await loadSession('session-id');
const dashboard = calculateAnalyticsDashboard(advisorState);

// Calculate specific sections
const performance = calculatePerformanceStats(advisorState);
const expertise = calculateTopicExpertise(advisorState);

// Get analytics directly from session ID
const dashboard = await getAnalyticsForSession('session-id');

// Compare two sessions
const comparison = await compareAnalytics('session-1', 'session-2');
```

#### TUI Components
```typescript
import {
  renderAnalyticsDashboard,
  renderPerformancePanel,
  renderTopicExpertisePanel,
  renderCharacterStatsPanel,
  renderFinancialImpactPanel,
} from './mastra/analytics';

// Render full dashboard
return renderAnalyticsDashboard(dashboard);

// Render individual panels
return renderPerformancePanel(performance);
return renderTopicExpertisePanel(expertise);
return renderCharacterStatsPanel(characters);
return renderFinancialImpactPanel(financial);
```

## Architecture

### Module Structure
```
src/mastra/analytics/
├── analytics-types.ts        # TypeScript type definitions
├── analytics-calculator.ts   # Core calculation logic
├── analytics-service.ts      # Service layer / API
├── analytics-tui.tsx         # Terminal UI components
└── index.ts                  # Public exports
```

### Data Flow
```
AdvisorState (from game)
    ↓
Analytics Calculator
    ↓
Analytics Dashboard Data
    ↓
┌────────────┬──────────────┐
│            │              │
TUI Display  JSON Export   Frontend (future)
```

### Key Files
- **`analytics-types.ts`**: Complete type definitions for all analytics data structures
- **`analytics-calculator.ts`**: Pure functions for calculating all metrics
- **`analytics-service.ts`**: Service layer with state management
- **`analytics-tui.tsx`**: React/Ink components for terminal display
- **`index.ts`**: Centralized exports

## Integration with Game

The analytics system integrates seamlessly with the existing game:

1. **Data Source**: Uses `AdvisorState` from game sessions
2. **Persistence**: Leverages existing `session-store.ts`
3. **No Game Changes**: Analytics is completely separate - no game code modifications needed
4. **Real-time**: Can calculate analytics on-demand from current state

## Future Enhancements

### Ready for Web Frontend
The analytics backend is designed to easily integrate with a React web frontend:

```typescript
// Future web integration
import { getAnalyticsForSession } from '@/lib/analytics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  const analytics = await getAnalyticsForSession(sessionId);
  return Response.json(analytics);
}
```

### Visualization Options
The data structures are optimized for:
- **Recharts**: Line charts, bar charts, radar charts
- **Chart.js**: Performance trends, financial impact
- **D3.js**: Custom visualizations
- **Victory**: React Native mobile apps

### Export Formats
Currently supports:
- JSON export
- Terminal UI display

Future formats:
- CSV export
- PDF reports
- Excel spreadsheets

## Examples

### Quick Summary
```typescript
const service = getAnalyticsService();
await service.loadAdvisorState('my-session');
const summary = service.getSummary();

console.log(`
  Sessions: ${summary.totalSessions}
  Quality: ${summary.averageQuality}/10
  Success Rate: ${summary.successRate}%
  Reputation: ${summary.reputation}/100
  Skill Level: ${summary.skillLevel}/10
  Total Coins: ${summary.totalCoins}
  Savings Generated: €${summary.savingsGenerated}
  Clients Helped: ${summary.clientsHelped}
`);
```

### Compare Sessions
```typescript
const comparison = await compareAnalytics('session-1', 'session-2');

console.log('Performance Differences:');
console.log(`Sessions: +${comparison.differences.sessions}`);
console.log(`Quality: ${comparison.differences.quality > 0 ? '+' : ''}${comparison.differences.quality}`);
console.log(`Reputation: ${comparison.differences.reputation > 0 ? '+' : ''}${comparison.differences.reputation}`);
```

### Get Insights
```typescript
const insights = analyticsService.getInsights();

console.log('Insights:');
insights.insights.forEach(insight => {
  console.log(`[${insight.type}] ${insight.title}: ${insight.message}`);
  if (insight.actionable) {
    console.log(`  → ${insight.actionable}`);
  }
});

console.log('\nFocus on these topics:', insights.focusAreas.join(', '));
console.log('Your strengths:', insights.strengthAreas.join(', '));
```

## Testing

Run the test suite:
```bash
pnpm test:analytics
```

The test creates mock advisor data with 20 sessions and validates:
- ✅ Performance statistics calculation
- ✅ Topic expertise analysis
- ✅ Character success rate tracking
- ✅ Financial impact aggregation
- ✅ Trend analysis
- ✅ Insights generation
- ✅ JSON export

## Performance

The analytics system is optimized for performance:
- **Fast calculations**: All metrics calculated in <100ms for 100+ sessions
- **Memory efficient**: Processes data in single pass where possible
- **No database queries**: Uses in-memory AdvisorState
- **Lazy loading**: Only calculates requested sections

## Contributing

To add new analytics features:

1. Add types to `analytics-types.ts`
2. Implement calculation in `analytics-calculator.ts`
3. Add service method in `analytics-service.ts`
4. Create TUI component in `analytics-tui.tsx` (optional)
5. Update exports in `index.ts`
6. Add tests to `test-analytics.ts`
7. Update this documentation

## License

Part of the Elämäpeli 2025 - Financial Advisor Simulator project.
