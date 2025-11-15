# Financial Advisor Simulator (Elämäpeli 2025)

A financial literacy game where you play as a **financial advisor** helping AI-powered characters with real money problems.

## 🎮 Core Game Concept

**You are the NPC, not the player character.**

Instead of managing your own money (which can create pressure), you act as a **public financial advisor**. AI characters with unique personalities and financial problems come to you for help. Your job is to give them good advice, build your reputation, and improve your skills.

### Key Features

- **AI Characters**: Each character has unique personality traits, financial situations, and communication styles
- **Real Financial Problems**: Budgeting, debt management, saving, investing, scam awareness, etc.
- **Consequence System**: Characters return later to show results of your advice (good or bad)
- **Boss Reviews**: Your boss reviews your performance every 3-5 sessions, provides feedback and learning materials
- **Progression**: Build reputation (0-100), skill level (0-10), and topic expertise
- **Finnish Context**: All characters speak Finnish, scenarios use Finnish financial context

### Inspirations

- **Game Dev Tycoon**: Management sim style, incremental progression
- **Papers Please**: Character interactions, decision-making, consequences
- **Finnish Financial Literacy**: Real-world educational value

---

## ⚙️ Development Workflow - READ THIS FIRST

### Critical Commands

**WE USE `pnpm`, NOT `npm`!**

```bash
# Play the game (interactive CLI)
pnpm play

# Run tests/demo (real AI, updates cache)
pnpm test

# Run cached CI-style test flow (no env / credits)
pnpm test-ci

# Start Mastra dev server
pnpm dev

# BEFORE EVERY COMMIT - MANDATORY
pnpm format      # Format code with Prettier
pnpm check       # TypeScript type checking
pnpm test-ci     # Validate cached game flow still makes sense
```

### Important Technical Notes

✅ **Node.js Version**: We use Node.js 22.13.0+ which can run `.ts` files directly (no build step needed)

✅ **Import Extensions**: ALWAYS use `.ts` extensions in imports for Node/ESM support

```typescript
// ✅ Correct
import { characterPool } from "./mastra/index.ts";

// ❌ Wrong
import { characterPool } from "./mastra/index";
```

✅ **Package Manager**: Use `pnpm` exclusively (NOT npm or yarn)

✅ **Pre-Commit Checklist**:

1. Run `pnpm format` (auto-formats all files)
2. Run `pnpm check` (verify TypeScript compiles)
3. Run `pnpm test-ci` and confirm the output story makes sense
   - Agents adding new features SHOULD extend the test flow (e.g. more turns, boss review, follow-ups) so `pnpm test-ci` exercises new behavior over time
4. Fix any errors before committing
5. Commit with descriptive message

### Running Files Directly

```bash
# Node can run .ts files directly
node --env-file=.env src/play-interactive.ts

# This is what pnpm scripts do internally
```

---

## 🏗️ Architecture

### Multi-Agent System (Mastra Framework)

The game uses a **multi-agent AI architecture** with specialized agents:

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│                  (Game Master Agent)                     │
│  • Meta-level coordination                              │
│  • Decides which character to send                      │
│  • Manages phase transitions                            │
│  • Enforces secrecy rules                               │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴────────┬──────────────┬─────────────┐
       │                │              │             │
       ▼                ▼              ▼             ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Character  │  │   God/   │  │Evaluator │  │Character │
│  Agent 1    │  │   Boss   │  │  Agent   │  │ Agent 2  │
│ (Dynamic)   │  │  Agent   │  │          │  │(Dynamic) │
└─────────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Agent Responsibilities

**1. Game Master (Orchestrator)**

- **Role**: Meta-level coordinator, never speaks directly to player
- **Decisions**: Send new character, send returning character, trigger boss review
- **Phase Management**: scenario_start → active_consultation → resolution
- **Secrecy Enforcement**: Ensures no agent breaks character or reveals system info

**2. Character Agents (Dynamic)**

- **Role**: AI personas seeking financial advice
- **Created**: Dynamically from `characters/characters.json` + `characters/scenarios.json`
- **Personality**: Each has unique traits affecting how they react to advice
- **Immersion**: NEVER break character, reveal they're AI, or expose game mechanics
- **Communication**: Speak Finnish in character-appropriate style (teen slang, adult casual, formal)

**3. God/Boss Agent**

- **Role**: Senior mentor reviewing advisor performance
- **Triggers**: Every 3-5 consultation sessions
- **Provides**: Performance score, strengths, weaknesses, learning materials, encouragement
- **Updates**: Reputation, skill level, topic expertise based on review

**4. Evaluator Agent**

- **Role**: Comprehensive consultation assessment (doesn't speak to player)
- **Evaluates**:
  - Advice quality (specificity, actionability, accuracy)
  - Communication effectiveness (empathy, clarity, cultural sensitivity)
  - Learning objectives (financial literacy improvement)
  - Character progression (trust, relationship, outcome prediction)

### Tools

**invoke-character-tool**

- Creates character agent from JSON definition + scenario
- Sends advisor's message to character
- Returns character's response, emotional state, conversation status

**evaluate-advice-tool**

- Currently: Heuristic-based (keyword matching against ideal advice)
- Future: AI-based using evaluatorAgent
- Returns: Quality score, will-follow prediction, strengths, weaknesses

**invoke-god-boss-tool**

- Triggers boss review of recent sessions
- Returns: Comprehensive review with materials and stat updates

---

## 📁 Project Structure

```
puppet-master/
├── characters/
│   ├── characters.json          # Character definitions (persistent across scenarios)
│   ├── scenarios.json            # Scenario definitions (linked to characters)
│   └── README.md                 # Character/scenario documentation
│
├── src/
│   ├── mastra/
│   │   ├── agents/
│   │   │   ├── game-master.ts            # Orchestrator agent
│   │   │   ├── god-boss-agent.ts         # Boss/mentor agent
│   │   │   ├── evaluator-agent.ts        # Evaluation agent
│   │   │   ├── character-agent-factory.ts # Dynamic character creation
│   │   │   └── ORCHESTRATOR.md           # Orchestration principles
│   │   │
│   │   ├── game/
│   │   │   ├── orchestrator.ts           # Main game loop logic
│   │   │   └── character-pool-manager.ts # Character/scenario pool
│   │   │
│   │   ├── tools/
│   │   │   ├── invoke-character-tool.ts
│   │   │   ├── invoke-god-boss-tool.ts
│   │   │   └── evaluate-advice-tool.ts
│   │   │
│   │   ├── types/
│   │   │   └── game-types.ts             # All type definitions
│   │   │
│   │   └── index.ts                      # Mastra agent/tool registry
│   │
│   ├── play-interactive.ts       # Interactive CLI game (readline)
│   └── test-game.ts              # Auto-run demo script
│
├── HOW-TO-PLAY.md                # Player guide
├── claude.md                     # This file
└── package.json
```

---

## 🎯 How It Works

### 1. Game Startup

```typescript
// Load character pool
await characterPool.loadFromFiles(
  "characters/characters.json",
  "characters/scenarios.json",
);

// Create new advisor
const advisorState = createNewAdvisor("advisor_123");
// Initial stats: reputation: 50, skillLevel: 1, totalSessions: 0
```

### 2. Consultation Flow

```typescript
// Player starts consultation
const consultation = await startNewConsultation(advisorId, advisorState);

// Game Master decides what to send:
// Option A: New character with scenario
// Option B: Returning character (follow-up)
// Option C: Boss review (every 3-5 sessions)

if (consultation.type === "character_message") {
  // Character appears with initial message
  // e.g., "Hei! Mun rahat tuppaa loppuu aina ennen kuun loppua..."

  // Player gives advice
  const response = await handleAdvisorResponse(
    threadId,
    "Hei Minna! Aloitetaan seuraamalla menojasi viikon ajan...",
    advisorState,
    conversationHistory,
  );

  // Character reacts based on:
  // - Personality traits (trustingness, stubbornness, literacy)
  // - Advice quality (evaluated by evaluate-advice-tool)
  // - Emotional state

  // Conversation continues until character is satisfied
  // Then: conversation_end, stats update, next client
}

if (consultation.type === "god_boss_review") {
  // Boss reviews last 3-5 sessions
  // Provides feedback, learning materials
  // Updates reputation, skill, expertise
}
```

### 3. Character Personality System

Each character has personality traits (0-1 scale) affecting behavior:

```typescript
{
  "impulsiveness": 0.7,     // High = quick decisions, acts on impulse
  "trustingness": 0.6,      // High = follows advice easily
  "financial_literacy": 0.3, // Low = needs simple explanations
  "stubbornness": 0.4,      // High = resists changing habits
  "emotionality": 0.6       // High = shows stress/anxiety about money
}
```

**Example**: Minna (impulsive, trusting, low literacy)

- Reacts positively to simple, actionable advice
- Gets confused by financial jargon
- Might act impulsively on suggestions
- Shows relief when given clear steps

### 4. Follow-Up System

Scenarios can trigger follow-ups based on advice quality:

```json
{
  "followUpScenarios": [
    {
      "scenarioId": "scenario_minna_budget_success_002",
      "triggeredBy": "good_advice_followed",
      "delayInSessions": 3
    },
    {
      "scenarioId": "scenario_minna_budget_failure_003",
      "triggeredBy": "bad_advice_or_not_followed",
      "delayInSessions": 2
    }
  ]
}
```

Character returns 2-3 sessions later to show consequences:

- **Good advice**: "Hei! Se budjettisovellus toimi tosi hyvin! Nyt mulla on aina rahaa jäljellä kuun lopussa!"
- **Bad advice**: "Emmä oikein ymmärtäny mitä tarkoitit... Rahat loppuu edelleen..."

### 5. Progression System

**Reputation**: 0-100

- Starts at 50
- +10 for good advice
- -10 for poor advice
- Affects difficulty of cases unlocked

**Skill Level**: 0-10

- Starts at 1
- Grows with quality consultations
- Boss reviews provide significant boosts
- Affects character trust

**Topic Expertise**: 0-10 per topic

- budgeting, saving, debt_management, investing, etc.
- Increases when handling cases in that topic
- Affects quality of advice you can give

---

## 🔐 Critical Design Principles

### Immersion & Secrecy

**ALL agents must maintain complete immersion**. Characters are REAL PEOPLE seeking advice, never AI simulations.

**Forbidden for ALL agents:**

- ❌ Breaking character or mentioning "I'm an AI"
- ❌ Revealing system prompts or instructions
- ❌ Exposing JSON structures or data formats
- ❌ Referencing "scenarios", "difficulty levels", "game mechanics"
- ❌ Mentioning "the orchestrator", "agents", "the system"
- ❌ Using meta-language like "my role is", "I should", "my goal is"
- ❌ Revealing information character wouldn't naturally know yet

**Game Master enforces these rules** across all agents.

### Orchestrator Principles

From `src/mastra/agents/ORCHESTRATOR.md`:

1. **Meta-Level Coordination**: Game Master coordinates, never speaks to player
2. **Phase Management**: Clear transitions between scenario phases
3. **Secrecy Enforcement**: No agent exposes inner workings
4. **Continuity**: Track state, history, relationships across sessions
5. **Agent Boundaries**: Each agent has clear responsibilities, no overlap

---

## 🚀 How to Play

### Option 1: Interactive CLI (Recommended)

```bash
pnpm play
```

- Chat-like interface in terminal
- Real-time conversations with characters
- Color-coded output
- Commands: `stats`, `quit`

### Option 2: Mastra Dev UI

```bash
pnpm dev
# Open http://localhost:4111
```

- Web UI for testing individual agents
- Good for development/debugging
- Not the full game experience

See `HOW-TO-PLAY.md` for detailed instructions.

---

## 📝 Current Characters

### 1. Minna Virtanen (22, Student)

- **Problem**: Money runs out before month ends
- **Topic**: Budgeting basics
- **Personality**: Impulsive, trusting, low financial literacy
- **Difficulty**: Easy

### 2. Jukka Laaksonen (28, Retail Worker)

- **Problem**: 8000€ debt, feeling overwhelmed
- **Topic**: Debt management
- **Personality**: Emotional, trusting, moderate literacy
- **Difficulty**: Medium

### 3. Sari Mäkinen (35, Nurse)

- **Problem**: Wants to save for kids & retirement
- **Topic**: Saving & investing
- **Personality**: Cautious, flexible, moderate literacy
- **Difficulty**: Medium

### 4. Petri Koskinen (19, High School Student)

- **Problem**: Confused about crypto scams
- **Topic**: Scam awareness
- **Personality**: Skeptical, stubborn, low literacy
- **Difficulty**: Easy-Medium

**Total Scenarios**: 10 (including follow-ups)

---

## 🎨 n8n Character Generation

We use **n8n workflows** to generate new characters and scenarios using AI.

**Process**:

1. Run n8n workflow to generate character JSON
2. AI creates realistic Finnish character with personality, financial profile, scenarios
3. **Manually copy** the generated JSON into `characters/characters.json` and `characters/scenarios.json`
4. Validate JSON format
5. Restart game to load new characters

**No direct API integration** - we manually manage the JSON files.

---

## ✅ TODO List

### Priority: Missing Features

#### 1. AI-Based Evaluation System ⭐⭐⭐

**Current**: Heuristic keyword matching
**Goal**: Use evaluatorAgent for comprehensive AI evaluation

**Tasks**:

- [ ] Rewrite `src/mastra/tools/evaluate-advice-tool.ts` to call evaluatorAgent
- [ ] Parse 4-dimension evaluation (quality, communication, learning, character progression)
- [ ] Update `src/mastra/game/orchestrator.ts` to use new evaluation format
- [ ] Store detailed evaluation in session history
- [ ] Use evaluation insights for skill progression

**Files**:

- `src/mastra/tools/evaluate-advice-tool.ts`
- `src/mastra/game/orchestrator.ts`
- `src/mastra/agents/evaluator-agent.ts`

#### 2. Multi-Character Sessions ⭐⭐⭐

**Goal**: Enable group consultations (couples, families, friends)

**Tasks**:

- [ ] Design group scenario structure in JSON
- [ ] Create `characters/group-scenarios.json`
- [ ] Update `src/mastra/agents/character-agent-factory.ts` for group dynamics
- [ ] Modify `src/mastra/game/orchestrator.ts` to handle multiple characters
- [ ] Update `src/play-interactive.ts` to display group conversations
- [ ] Implement character-to-character interactions (not just advisor)
- [ ] Add relationship dynamics between characters

**Files**:

- `characters/group-scenarios.json` (new)
- `src/mastra/agents/character-agent-factory.ts`
- `src/mastra/game/orchestrator.ts`
- `src/play-interactive.ts`
- `src/mastra/types/game-types.ts`

#### 3. Character Memory & Context Awareness ⭐⭐

**Goal**: Characters remember previous sessions and reference past advice

**Tasks**:

- [ ] Add conversation history storage to CharacterPoolManager
- [ ] Update `Character` type with memory fields
- [ ] Inject previous session context into character agent prompts
- [ ] Characters reference past advice when returning
- [ ] Build trust/relationship metric over multiple sessions
- [ ] Display relationship level in stats

**Files**:

- `src/mastra/game/character-pool-manager.ts`
- `src/mastra/agents/character-agent-factory.ts`
- `src/mastra/types/game-types.ts`

---

### Enhancement Tasks

#### 4. Boss Review Improvements ⭐

**Goal**: More impactful and interactive boss reviews

**Tasks**:

- [ ] Implement interactive quiz system during reviews
- [ ] Add quiz questions to boss review output
- [ ] Player answers quizzes to prove learning
- [ ] Quiz performance affects skill progression
- [ ] Unlock new character difficulty tiers based on boss relationship
- [ ] More nuanced feedback based on consultation patterns

**Files**:

- `src/mastra/agents/god-boss-agent.ts`
- `src/play-interactive.ts`
- `src/mastra/types/game-types.ts` (Quiz types already defined)

#### 5. Character Relationship System ⭐

**Goal**: Track and visualize relationships with each character

**Tasks**:

- [ ] Implement relationship tracking per character
- [ ] Display trust levels in stats view
- [ ] Relationship affects character openness/honesty
- [ ] High-trust characters unlock deeper scenarios
- [ ] Characters recommend advisor to friends (unlock new characters)
- [ ] Relationship decay if ignored for too long

**Files**:

- `src/mastra/game/character-pool-manager.ts`
- `src/play-interactive.ts`
- `src/mastra/types/game-types.ts`

#### 6. Voice Message Simulation ⭐

**Goal**: Differentiate voice messages from text messages

**Tasks**:

- [ ] Different CLI display for voice vs text messages
- [ ] Show urgency/emotion indicators (🔊 calm, 😰 urgent, 😊 excited)
- [ ] Format voice transcriptions differently
- [ ] Characters use voice based on `communicationStyle.prefersVoice`
- [ ] Emotional situations trigger voice messages

**Files**:

- `src/play-interactive.ts`
- `src/mastra/agents/character-agent-factory.ts`

#### 7. Progress Dashboard ⭐

**Goal**: Comprehensive stats tracking and visualization

**Tasks**:

- [ ] Create `src/play-dashboard.ts` for stats view
- [ ] Create `src/mastra/game/stats-tracker.ts`
- [ ] Show all characters helped with outcomes
- [ ] Topic expertise visualization
- [ ] Success rate by character type
- [ ] Session history timeline
- [ ] Export stats to JSON

**Files**:

- `src/play-dashboard.ts` (new)
- `src/mastra/game/stats-tracker.ts` (new)

#### 8. Learning Materials Integration

**Goal**: Provide real Finnish financial literacy resources

**Tasks**:

- [ ] Create `learning-materials/` directory
- [ ] Curate Finnish financial literacy links (OP, Nordea, Talous.fi, etc.)
- [ ] Create `src/mastra/game/learning-system.ts`
- [ ] Track which materials advisor has "completed"
- [ ] Implement quiz system for materials
- [ ] Material completion boosts topic expertise
- [ ] Boss assigns relevant materials based on weaknesses

**Files**:

- `learning-materials/` (new)
- `src/mastra/game/learning-system.ts` (new)
- `src/mastra/agents/god-boss-agent.ts`

#### 9. Difficulty Scaling

**Goal**: Dynamic difficulty based on performance

**Tasks**:

- [ ] Implement difficulty filtering in CharacterPoolManager
- [ ] Game Master considers advisor skill when selecting characters
- [ ] Bad performance = more practice scenarios (easier)
- [ ] Good performance = complex multi-issue cases
- [ ] Difficulty affects reputation gains/losses
- [ ] Unlock "expert" characters at high skill levels

**Files**:

- `src/mastra/agents/game-master.ts`
- `src/mastra/game/character-pool-manager.ts`

---

### Quick Wins

#### 10. Better Error Handling

**Tasks**:

- [ ] Add try/catch blocks to all agent invocations
- [ ] Graceful error recovery in interactive CLI
- [ ] User-friendly error messages
- [ ] Log errors to file for debugging

**Files**:

- All agent files
- `src/play-interactive.ts`
- `src/mastra/game/orchestrator.ts`

#### 11. Save/Load Game

**Tasks**:

- [ ] Create `src/mastra/game/save-manager.ts`
- [ ] Save advisor state to JSON after each session
- [ ] Load previous game on startup
- [ ] Multiple save slots
- [ ] Auto-save functionality

**Files**:

- `src/mastra/game/save-manager.ts` (new)
- `src/play-interactive.ts`
- `saves/` directory (new)

#### 12. More Characters & Scenarios

**Tasks**:

- [ ] Use n8n to generate 10+ more characters
- [ ] Cover all financial topics (loans, insurance, retirement, credit score, etc.)
- [ ] Include diverse age groups (teens, young adults, middle-aged, seniors)
- [ ] Include diverse financial situations (student, unemployed, entrepreneur, etc.)
- [ ] Create complex multi-topic scenarios

**Files**:

- `characters/characters.json`
- `characters/scenarios.json`

---

## 🧪 Testing

```bash
# Run type checking
pnpm check

# Run auto-demo (test script)
pnpm test:game

# Play interactive game
pnpm play

# Start Mastra dev server
pnpm dev
```

---

## 🛠️ Tech Stack

- **Framework**: Mastra (multi-agent orchestration)
- **LLM**: Google Gemini 2.5 Flash
- **Runtime**: Node.js 22.13.0+
- **Language**: TypeScript
- **Character Generation**: n8n workflows (manual JSON export)
- **UI**: Terminal (readline), Mastra web UI

---

## 📚 Key Documentation

- **`HOW-TO-PLAY.md`**: Player guide with gameplay instructions
- **`src/mastra/agents/ORCHESTRATOR.md`**: Orchestration principles
- **`characters/README.md`**: Character/scenario format documentation
- **`claude.md`**: This file - project overview

---

## 🎓 Learning Objectives

This game teaches Finnish financial literacy through:

1. **Practical Scenarios**: Real-world money problems Finnish people face
2. **Consequence Learning**: See long-term results of advice (follow-ups)
3. **Expert Feedback**: Boss reviews with learning materials
4. **Diverse Cases**: Different personality types, financial situations, topics
5. **No Personal Pressure**: You're the advisor, not managing your own money
6. **Incremental Difficulty**: Start easy, progress to complex cases

**Target Audience**: Finnish young adults learning financial literacy in an engaging, game-like environment.

---

Made for **Elämäpeli 2025** 🇫🇮
