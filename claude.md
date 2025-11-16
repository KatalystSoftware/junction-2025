# Financial Advisor Simulator (Elämäpeli 2025)

A financial literacy game where you play as a **financial advisor** helping AI-powered characters with real money problems.

## 🎮 Core Game Concept

**You are the NPC, not the player character.**

Instead of managing your own money (which can create pressure), you act as a **public financial advisor**. AI characters with unique personalities and financial problems come to you for help. Your job is to give them good advice, build your reputation, and improve your skills.

### Key Features

- **AI Characters**: Each character has unique personality traits, financial situations, and communication styles
- **Dynamic Language Support**: Characters and boss automatically match your language (Finnish/English)
- **Real Financial Problems**: Budgeting, debt management, saving, investing, scam awareness, etc.
- **Consequence System**: Characters return later to show results of your advice (good or bad)
- **Boss Reviews**: Your boss reviews your performance every 3-5 sessions, provides feedback and learning materials
- **Progression**: Build reputation (0-100), skill level (0-10), and topic expertise
- **Beginner-Friendly**: Easier scenarios and gentler evaluation for first 10 sessions
- **RAG-Powered Evaluation**: Research-backed Finnish financial literacy standards for advice assessment
- **Thread History**: View past conversations, track completed and active consultations
- **Finnish Context**: Scenarios use Finnish financial context (ASP-tili, Takuu-Säätiö, etc.)

### Inspirations

- **Game Dev Tycoon**: Management sim style, incremental progression
- **Papers Please**: Character interactions, decision-making, consequences
- **Finnish Financial Literacy**: Real-world educational value

---

## ⚙️ Development Workflow - READ THIS FIRST

This is a **monorepo** containing:

- **Backend** (root): Mastra-based game orchestrator and API
- **Frontend** (`frontend/`): React + Vite WhatsApp-style UI

### Critical Commands

**WE USE `pnpm`, NOT `npm`!**

```bash
# Run full stack (backend API + frontend dev server)
pnpm dev

# Run backend only (API on port 4111)
pnpm dev:api

# Run frontend only (UI on port 3000)
pnpm dev:frontend

# BEFORE EVERY COMMIT - MANDATORY
pnpm format      # Format code with Prettier
pnpm check       # TypeScript type checking

# Build for production
pnpm build:all   # Build both backend and frontend
pnpm build:frontend  # Frontend only (outputs to public/)
```

### Ports & Services

- **Backend API**: http://localhost:4111
- **Frontend Dev**: http://localhost:3000
- **Frontend (production)**: Served from backend's `/public` directory

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
3. Fix any errors before committing
4. Commit with descriptive message

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
├── frontend/                     # React + Vite WhatsApp-style UI
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── hooks/               # React hooks
│   │   └── App.tsx              # Main app component
│   └── package.json
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
│   └── index.ts                  # Backend API server
│
├── HOW-TO-PLAY.md                # Player guide
├── CLAUDE.md                     # This file
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

### Web UI (Primary Interface)

```bash
pnpm dev
```

Then open:

- **Frontend**: http://localhost:3000 - Main game interface (WhatsApp-style UI)
- **Backend API**: http://localhost:4111 - API server (for debugging)

The web UI provides:

- WhatsApp-style chat interface
- Real-time conversations with characters
- Thread history view
- Boss review modals
- Stats tracking

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

### ✨ Recently Completed

- [x] **AI-Based Evaluation System** - Using evaluatorAgent with RAG knowledge base
- [x] **Dynamic Language Matching** - Characters/boss respond in advisor's language
- [x] **Thread History System** - View past conversations (active/completed)
- [x] **Difficulty Progression** - Beginner-friendly scenario selection
- [x] **Gentler Evaluation** - Scaled penalties/rewards for skill levels
- [x] **Knowledge Base** - Pre-generated Finnish financial literacy RAG database

### Priority: High-Value Improvements

#### 1. Tutorial Scenarios ⭐⭐⭐

**Goal**: Create 3-5 guaranteed-success scenarios for onboarding

**Why**: Give players early wins to build confidence and understand mechanics

**Tasks**:

- [ ] Create `characters/tutorial-scenarios.json` with 3 easy scenarios
- [ ] Topics: basic budgeting, simple saving advice, empathetic communication
- [ ] Set difficulty < 0.2, generous evaluation
- [ ] Mark as "completed" after first playthrough
- [ ] Add tutorial mode flag to advisor state

**Files**:

- `characters/tutorial-scenarios.json` (new)
- `src/mastra/game/character-pool-manager.ts`
- `src/mastra/types/game-types.ts`

#### 2. More Characters & Scenarios ⭐⭐⭐

**Goal**: Expand content variety and replayability

**Why**: Current pool of 4 characters x 10 scenarios gets repetitive

**Tasks**:

- [ ] Generate 8+ new characters covering diverse demographics
- [ ] Create 20+ scenarios across all topics (budgeting, debt, saving, investing, insurance, retirement, credit, scams)
- [ ] Include edge cases: unemployment, divorce, inheritance, medical debt, student loans
- [ ] Range of difficulties (0.2 - 0.8)
- [ ] Multi-part scenario chains with branching outcomes

**Files**:

- `characters/individuals/*.json`
- `characters/scenarios/*.json`

#### 3. Progress Visualization ⭐⭐

**Goal**: Show clear progress and growth to motivate players

**Why**: Hard to see improvement between boss reviews

**Tasks**:

- [ ] Add mini-feedback after each conversation (1-line hint on what went well/wrong)
- [ ] Show skill trend graph in stats (last 10 sessions)
- [ ] Display "Next boss review in X sessions" counter
- [ ] Celebrate milestones (first success, skill level up, reputation thresholds)
- [ ] Add achievements system (help 10 clients, master budgeting topic, etc.)

**Files**:

- `frontend/src/components/`
- `src/mastra/game/orchestrator.ts`

#### 4. Character Relationship System ⭐⭐

**Goal**: Track and visualize relationships with each character

**Why**: Returning characters should show trust/relationship progression

**Tasks**:

- [ ] Implement per-character trust tracking (already in code, needs UI)
- [ ] Display trust levels in stats view
- [ ] Relationship affects character openness/honesty
- [ ] High-trust characters unlock deeper scenarios
- [ ] Characters recommend advisor to friends (unlock new characters)
- [ ] Relationship decay if ignored for too long

**Files**:

- `src/mastra/game/character-pool-manager.ts`
- `frontend/src/components/`
- `src/mastra/types/game-types.ts`

---

### Enhancement Tasks

#### 5. Interactive Boss Review Quizzes ⭐

**Goal**: Make boss reviews more engaging with interactive learning

**Tasks**:

- [ ] Implement quiz UI in web interface (already generated in review JSON)
- [ ] Player answers quizzes to prove learning
- [ ] Quiz performance affects skill progression multiplier
- [ ] Track quiz completion and scores
- [ ] Unlock advanced topics after passing quizzes

**Files**:

- `frontend/src/components/`
- `src/mastra/game/orchestrator.ts`
- `src/mastra/types/game-types.ts` (Quiz types already defined)

#### 6. Multi-Character Group Sessions ⭐

**Goal**: Enable couple/family consultations

**Tasks**:

- [ ] Design group scenario structure (couple with disagreement, parent-child, etc.)
- [ ] Handle multiple character agents in same consultation
- [ ] Characters can respond to each other, not just advisor
- [ ] Track relationship dynamics between group members
- [ ] More complex evaluation (mediator skills, balance, fairness)

**Files**:

- `characters/group-scenarios.json` (new)
- `src/mastra/agents/character-agent-factory.ts`
- `src/mastra/game/orchestrator.ts`

#### 7. Voice Message Indicators ⭐

**Goal**: Better visual distinction for voice vs text

**Tasks**:

- [ ] Show voice indicator (🔊) for voice messages in web UI
- [ ] Display urgency/emotion: 🔊 calm, 😰 urgent, 😊 excited
- [ ] Format voice transcriptions with "(Voice message)" prefix
- [ ] Characters use voice based on `communicationStyle.prefersVoice`

**Files**:

- `frontend/src/components/`

#### 8. Learning Materials Tracking

**Goal**: Make boss-assigned learning materials actionable

**Tasks**:

- [ ] Track which materials advisor has "viewed"
- [ ] Show materials in stats view
- [ ] Boss reviews reference previous materials if not followed
- [ ] Material completion gives small topic expertise boost

**Files**:

- `src/mastra/game/orchestrator.ts`
- `src/mastra/types/game-types.ts`
- `frontend/src/components/`

---

### Quick Wins

#### 9. Save/Load Game ⭐

**Goal**: Persist game progress between sessions

**Tasks**:

- [ ] Create `src/mastra/game/save-manager.ts`
- [ ] Auto-save advisor state after each consultation
- [ ] Load previous game on startup (or offer "New Game")
- [ ] Show save timestamp and stats preview
- [ ] Multiple save slots (optional)

**Files**:

- `src/mastra/game/save-manager.ts` (new)
- `frontend/src/components/`
- `saves/` directory (new)

#### 10. Better Error Recovery ⭐

**Goal**: Handle AI failures gracefully without crashing

**Tasks**:

- [ ] Add retry logic for failed agent calls (3 attempts)
- [ ] Fallback to simpler prompts if complex ones fail
- [ ] User-friendly error messages ("Character is thinking... please wait")
- [ ] Log detailed errors to file for debugging
- [ ] Never lose progress on error

**Files**:

- `src/mastra/game/orchestrator.ts`
- `src/mastra/tools/*.ts`
- `frontend/src/components/`

---

## 🧪 Testing

```bash
# Run type checking
pnpm check

# Run unit tests
pnpm test:unit

# Start dev server (frontend + backend)
pnpm dev
```

---

## 🛠️ Tech Stack

- **Framework**: Mastra (multi-agent orchestration)
- **LLM**: Google Gemini 2.5 Flash
- **Runtime**: Node.js 22.13.0+
- **Language**: TypeScript
- **Character Generation**: n8n workflows (manual JSON export)
- **Frontend**: React + Vite (WhatsApp-style UI)
- **Backend**: Hono API server

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

## 📚 Additional Documentation

For specific topics, see the following documentation files:

### Features

- **[RAG System](docs/features/rag-system.md)** - Finnish financial literacy knowledge base and evaluation
- **[Voice Integration](docs/features/voice-integration.md)** - ElevenLabs character voice synthesis
- **[Relationship System](docs/features/relationship-system.md)** - Character trust and progression
- **[Leaderboards & Social Features](docs/features/leaderboard.md)** - Rankings, challenges, case sharing
- **[Localization](docs/features/localization.md)** - Multi-language support (Finnish/Swedish/English)

### Technical

- **[Error Recovery](docs/error-recovery.md)** - Retry logic and graceful degradation
- **[Deployment Guide](docs/deployment.md)** - Docker setup and production deployment
- **[Frontend Integration](docs/frontend-integration.md)** - React frontend integration guide

---

Made for **Elämäpeli 2025** 🇫🇮
