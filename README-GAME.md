# Elämäpeli 2025 - Financial Literacy Game

An AI-powered choose-your-own-adventure game teaching Finnish youth (13-25) financial literacy through realistic scenarios.

## 🎯 Overview

Elämäpeli 2025 uses a multi-agent AI system to create dynamic, personalized financial education experiences. Players navigate 10 years of financial decisions compressed into an interactive story, where their choices have compounding consequences.

## 🏗️ Architecture

### Multi-Agent System

```
Game Master (Orchestrator)
    ├── Scammer Agent (Antagonist)
    ├── Friend Agent (Peer Pressure)
    ├── Parent Agent (Support)
    └── Teacher Agent (Analysis) [TODO]
```

### Agent Roles

- **Game Master**: Decides which scenarios to trigger and adjusts difficulty based on player patterns
- **Scammer Agent**: Simulates crypto/investment scams with varying sophistication
- **Friend Agent**: Generates peer pressure and social influence scenarios
- **Parent Agent**: Provides support, discovery, and teaching moments
- **Teacher Agent**: Post-game analysis with research-backed insights [TODO]

## 📁 Project Structure

```
src/mastra/
├── agents/
│   ├── game-master.ts       # Orchestrator agent
│   ├── scammer-agent.ts     # Scam scenarios
│   ├── friend-agent.ts      # Peer pressure
│   └── parent-agent.ts      # Parental support
├── tools/
│   ├── invoke-scammer.ts    # Tool to call scammer agent
│   ├── invoke-friend.ts     # Tool to call friend agent
│   └── invoke-parent.ts     # Tool to call parent agent
├── types/
│   └── game-types.ts        # TypeScript interfaces
├── game/
│   └── orchestrator.ts      # Main game loop
└── index.ts                 # Mastra configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.13.0
- pnpm (recommended) or npm
- Google Gemini API key (using Google Cloud credits)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Get your API key from: https://aistudio.google.com/app/apikey
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here" > .env
```

**Getting your Gemini API Key:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key" or "Create API Key"
3. Copy the key (starts with `AIza...`)
4. Add it to your `.env` file

### Running the Test

```bash
# Run the test script
pnpm tsx src/test-game.ts

# Or start the Mastra dev server
pnpm dev
```

## 🎮 How It Works

1. **Player Input**: Player sends a message (e.g., "I just got my first paycheck!")
2. **Game Master Analysis**: Analyzes player state and decides next scenario
3. **Agent Invocation**: GM calls appropriate character agent via tools
4. **Response Generation**: Character agent generates contextual messages
5. **State Update**: Player personality and financial state updated
6. **Loop Continues**: Next scenario based on updated state

## 🧠 Key Features

### Dynamic Difficulty Adjustment

- Overconfident players face harsher consequences
- Cautious players get confidence-building opportunities
- Difficulty scales from 0.3 (obvious) to 0.9 (sophisticated)

### Personality Tracking

Monitors and adapts to:

- Risk tolerance
- Confidence level
- Peer influence susceptibility
- Scam awareness
- Planning ability

### Agent Memory

Characters remember past interactions:

- Scammer remembers if player engaged before
- Friend's behavior changes based on player's validation
- Parent's trust level affected by honesty

### Compounding Consequences

- One bad choice leads to another
- Debt spirals are realistic
- Good habits build over time

## 📊 Player State

Each player has:

```typescript
{
  financialState: {
    savings: number,
    debt: number,
    monthlyIncome: number,
    creditScore: number
  },
  personalityProfile: {
    risk_tolerance: 0-1,
    confidence: 0-1,
    peer_influence: 0-1,
    scam_awareness: 0-1,
    planning_ability: 0-1
  },
  scenarioHistory: [...],
  agentStates: {
    scammer: { player_engaged_before, rejection_count },
    friend: { times_validated_spending, relationship_strength },
    parent: { knows_about_debt, trust_level }
  }
}
```

## 🎯 Available Scenarios

- `crypto_scam` - Cryptocurrency investment scam
- `peer_pressure_purchase` - Friend pressures expensive purchase
- `parent_finds_debt` - Parent discovers financial problems
- `friend_asks_loan` - Friend needs money
- `bnpl_temptation` - Buy-Now-Pay-Later offer
- `gambling_ad` - Gambling/betting advertisement
- `first_paycheck` - First job paycheck decisions
- `emergency_expense` - Unexpected costs
- More scenarios coming...

## 🔧 Configuration

### Current Setup: Google Gemini 2.5 Flash

All agents currently use `google/gemini-2.5-flash` which is:

- Fast and responsive
- Cost-effective with Google Cloud credits
- Great for real-time character generation

### Alternative Models

You can switch models by editing the agent files:

**For better quality (higher cost):**

```typescript
model: "google/gemini-1.5-pro";
```

**For faster/cheaper:**

```typescript
model: "google/gemini-1.5-flash";
```

### Using OpenAI or Anthropic Instead

1. Add the appropriate API key to `.env`:

```bash
# For OpenAI
OPENAI_API_KEY=your_key_here

# For Anthropic Claude
ANTHROPIC_API_KEY=your_key_here
```

2. Update model in agent files:

```typescript
// OpenAI
model: "openai/gpt-4o";

// Anthropic Claude
model: "anthropic/claude-sonnet-4-5-20250929";
```

## 📈 Next Steps

### TODO

- [ ] Implement Teacher Agent with RAG for post-game analysis
- [ ] Add more scenario types
- [ ] Build web/mobile frontend
- [ ] Integrate voice synthesis for emotional moments
- [ ] Add multiplayer comparisons
- [ ] Research data integration
- [ ] Analytics dashboard
- [ ] Save/load game progress to database

### Testing Priorities

1. Test different player personality types
2. Verify agent memory persistence
3. Validate difficulty scaling
4. Test edge cases and error handling

## 🎓 Educational Approach

Based on research-aligned learning methods:

- **Experiential Learning**: Learn by doing, not just reading
- **Consequence Visibility**: See how choices compound
- **Personalization**: Tailored to individual risk profiles
- **Safe Environment**: Make mistakes without real consequences
- **Research-Backed**: Informed by Finnish youth financial literacy studies

## 🤝 Contributing

This is a hackathon project. Feel free to:

- Add new scenario types
- Improve agent personalities
- Enhance difficulty algorithms
- Add analytics features

## 📝 License

Created for Junction 2025 Hackathon - Helsinki Education Hub Challenge

---

**Core Hook**: "Learn financial literacy the hard way—without the hard consequences. Your phone becomes a 10-year time machine showing exactly how today's choices compound into tomorrow's reality."
