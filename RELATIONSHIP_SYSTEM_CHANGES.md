# Character Relationship System UI Implementation

## Overview
This implementation adds a comprehensive relationship tracking and visualization system to the Financial Advisor Simulator, making character relationships visible and meaningful to players.

**Status**: ✅ Rebased with main and fully integrated with the latest TUI features including quiz feedback and final results modal.

## Features Implemented

### 1. Trust Tier System
- **5 Trust Tiers**: stranger (0-0.2), acquaintance (0.2-0.4), trusted (0.4-0.6), close (0.6-0.8), best_friend (0.8-1.0)
- Each tier has unique icon, color, and description
- Tiers unlock deeper scenarios and affect gameplay

### 2. Relationship Progression Tracking
- Complete history of trust changes over time
- Tracks events: advice_positive, advice_negative, decay, recommendation
- Shows trends: improving, declining, stable
- Visual progress bars and trend indicators

### 3. Enhanced UI Display
- **Trust Progress Bars**: Visual 10-segment progress bars showing exact trust level
- **Tier Badges**: Color-coded icons showing current relationship tier
- **Status Icons**:
  - 📈 Improving relationship
  - 📉 Declining relationship
  - ➡️ Stable relationship
  - 🤝 Character was referred by friend
  - ✅ Last consultation helped
  - ⚠️ Character struggling
- **Visit Counter**: Track number of consultations per character
- **Decay Warnings**: Visual warning when trust has decayed

### 4. Viral Unlock System
- High-trust characters (60%+) can recommend you to friends (30% chance)
- Recommended characters start with higher trust (60% vs 50%)
- Recommendation badge (🤝) shows in relationship panel
- Notification message when unlocks occur

### 5. Trust Decay System
- Characters ignored for 10+ sessions lose trust (-0.02 per session)
- Decay is tracked and displayed
- Visual warnings in relationship panel
- Tracked in progression history

### 6. Real-time Notifications
- **Tier Change Notifications**: Immediate feedback when relationship tier changes
- **Recommendation Notifications**: Celebratory message when character refers friend
- Status bar updates with relationship changes

## Integration with Main Branch Features

The relationship system has been intelligently merged with the main branch's new features:

### Final Results Modal Integration
- **Relationship changes now appear in the comprehensive final results modal**
- Tier changes are displayed with icons and detailed descriptions
- Recommendations (viral unlocks) are highlighted as "NEW CLIENT UNLOCKED"
- All relationship updates are shown in a dedicated "RELATIONSHIP UPDATE" section
- Combined with financial impact and earnings display for complete consultation summary

### Quiz System Compatibility
- Relationship panel coexists with quiz feedback modals
- No conflicts with the enhanced quiz system featuring:
  - Per-question feedback
  - Multiple choice selection
  - Final results with explanations

### Multiple Choice Advice System
- Relationship tracking works seamlessly with choice-based consultations
- Trust changes calculated based on advice quality and outcomes
- No interference with the 1-9 number input for both thread switching and choice selection

## Files Modified

### Core Type Definitions
- `src/mastra/types/game-types.ts`
  - Added `TrustTier` type with 5 tiers
  - Added `RelationshipProgression` interface
  - Enhanced `CharacterRelationshipState` with tier tracking, progression history, decay tracking
  - Added tier change and decay notifications to `GameResponse`

### Character Pool Manager
- `src/mastra/game/character-pool-manager.ts`
  - Added `calculateTrustTier()` helper function
  - Added `getTrustTierInfo()` for tier display information
  - Enhanced `updateCharacterRelationship()` to track progression events
  - Updated `updateRelationship()` to return tier change information
  - Enhanced `applyTrustDecay()` to return decay information
  - Updated `handleRecommendation()` to mark recommended characters
  - Enhanced `getCharacterRelationships()` to return full relationship data
  - Updated `reset()` to include new fields

### Game Orchestrator
- `src/mastra/game/orchestrator.ts`
  - Added tier change notification tracking
  - Integrated tier change with conversation responses
  - Enhanced recommendation handling

### UI Components
- `src/play-tui.tsx`
  - Completely redesigned `RelationshipsPanel` component
  - Added trust progress bars visualization
  - Added tier badges and status icons
  - Added trend indicators (improving/declining/stable)
  - Added recommendation badges
  - Added decay warnings
  - Added tier change notifications in status bar
  - Added recommendation notifications
  - Enhanced relationship display with legend

### Exports
- `src/mastra/index.ts`
  - Exported `getTrustTierInfo` function
  - Exported `calculateTrustTier` function

## Visual Design

### Trust Tier Colors
- Best Friend (80-100%): 💎 Magenta
- Close (60-80%): 💚 Green
- Trusted (40-60%): 💙 Cyan
- Acquaintance (20-40%): 💛 Yellow
- Stranger (0-20%): 🤝 Gray

### Progress Bar
```
████████░░ 80%  (8 filled, 2 empty blocks)
```

### Relationship Display Example
```
💝 Relationships (3)

💎 Mika Virtanen
██████████ 85%
📈 🤝 ✅ v5

💚 Laura Nieminen
████████░░ 72%
📈 ✅ v3

💙 Jukka Mäkelä
██████░░░░ 55%
➡️ ❓ v2

Legend:
📈=improving 🤝=referred
v=visits ✅=helped
```

## User Experience Improvements

1. **Clear Progression**: Players can see exactly how their advice affects relationships
2. **Strategic Gameplay**: Players know which characters to focus on for recommendations
3. **Reward Feedback**: Immediate visual feedback when relationships improve
4. **Decay Awareness**: Players warned when ignoring characters too long
5. **Social Network**: Viral unlock system creates natural character introduction flow
6. **Tier Unlocks**: High-trust characters unlock special scenarios (framework in place)

## Future Enhancements

Potential additions:
- Detailed relationship view modal (press 'd' on character)
- Relationship graph/timeline visualization
- Character-specific unlock notifications ("New scenario available with X!")
- Relationship milestones and achievements
- Social network graph showing who referred whom
- Tier-specific scenario difficulty/depth adjustments

## Testing

To test the system:
1. Start new game: `npm run play`
2. Press 'r' to view relationships panel
3. Complete consultations with good/bad advice to see trust changes
4. Watch for tier change notifications when trust crosses thresholds
5. Build relationships to 60%+ to trigger recommendations
6. Ignore characters to test decay system

## Technical Notes

- Trust changes: +0.1 for positive advice followed, -0.05 for bad advice
- Recommendation threshold: 60%+ trust, 30% chance on positive outcome
- Decay threshold: 10 sessions ignored
- Decay rate: -0.02 per session over threshold
- Progression history: Last 20 events kept per character
