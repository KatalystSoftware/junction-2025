# Broke No More! 2025 - Financial Advisor Simulator

> **Learn financial literacy by teaching it.** An AI-powered game where you play as a financial advisor helping realistic characters with their money problems.

[![Junction 2025](https://img.shields.io/badge/Junction_2025-Helsinki-blue)](https://junction2025.com)

![Broke No More! intro](https://github.com/user-attachments/assets/a63c596a-32f3-45ad-9d6e-e0e6c41468db)

---

## 🎯 What Is This?

**You are not managing your own money** (which creates pressure and anxiety). Instead, you're a **financial advisor** helping AI-powered characters solve their real financial problems.

- **34 unique AI characters** with distinct personalities and financial situations
- **Real Finnish financial literacy** powered by research from Bank of Finland, OPH, and OECD
- **Dynamic conversations** - characters remember your advice and return with consequences
- **Boss reviews** - periodic feedback on your performance with learning materials
- **Voice integration** - emotional voice messages using ElevenLabs (optional)
- **Progressive difficulty** - from basic budgeting to complex debt management

### Core Hook

_"Learn financial literacy the hard way—without the hard consequences. Give advice, see results, and build your expertise through practice."_

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22.13.0
- **pnpm** (recommended) or npm
- **Google Gemini API key** - Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/KatalystSoftware/junction-2025.git
cd junction-2025/puppet-master

# Install dependencies
pnpm install

# Set up environment variables
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here" > .env

# (Optional) Add ElevenLabs for voice
echo "ELEVENLABS_API_KEY=your_elevenlabs_key" >> .env
```

### Initialize Knowledge Base

```bash
# Initialize the Finnish financial literacy knowledge base
pnpm init:knowledge-base
```

This creates a vector database with research-backed Finnish financial literacy content.

### Start Playing

```bash
# Play the game in interactive terminal mode
pnpm play
```

---

## 🎮 How to Play

### Gameplay Flow

1. **Character arrives** with a financial problem

   ```
   💬 Minna Virtanen (22, University Student):
   "Hei! Mun rahat tuppaa loppuu aina ennen kuun loppua..."
   ```

2. **You give advice** by typing your response

   ```
   💼 You: Hei Minna! Let's start by tracking your expenses for a week...
   ```

3. **Character reacts** based on advice quality
   - Personality affects how they receive advice
   - Trust level increases/decreases
   - Conversation continues until satisfied

4. **Evaluation & results**
   - AI evaluates your advice against Finnish standards
   - Financial projection shows expected outcomes
   - You earn advisor coins based on impact

5. **Boss reviews** every 3-5 sessions
   - Overall performance score
   - Strengths and areas for improvement
   - Learning materials and resources

### Special Features

**Choice Mode (Fast):**

- Select from 3 AI-generated advice options
- Quick gameplay for testing

**Free-Text Mode (Deep):**

- Type your own advice
- More engaging, better learning
- Full evaluation feedback

**Voice Messages:**

- Characters send emotional voice messages
- ~10% of the time, guaranteed by scenario 3
- Consistent voices per character

### Commands

```bash
pnpm play          # Interactive CLI game
pnpm test          # Run demo with real AI
pnpm test-ci       # Run cached test flow
pnpm dev           # Start Mastra dev server
pnpm check         # Type checking
pnpm format        # Format code
```

---

## 👥 Meet the Characters

### Minna Virtanen (22, Student)

- **Problem:** Money runs out before month ends
- **Personality:** Impulsive (0.7), trusting (0.6), low financial literacy (0.3)
- **Voice:** Rachel (energetic young female)

### Jukka Laaksonen (28, Retail Clerk)

- **Problem:** €8,000 debt, feeling overwhelmed
- **Personality:** Emotional (0.8), trusting (0.7), moderate literacy (0.4)
- **Voice:** Bill (upbeat adult male)

### Sari Mäkinen (35, Nurse)

- **Problem:** Wants to save for kids & retirement
- **Personality:** Cautious, flexible, moderate literacy
- **Voice:** Bella (warm adult female)

...and 31 more unique characters!

---

## 🏗️ Architecture

### Multi-Agent AI System

```
Game Master (Orchestrator)
    ├── Character Agents (34 unique personalities)
    ├── Evaluator Agent (RAG-powered quality assessment)
    └── God/Boss Agent (Performance reviews)
```

### Key Technologies

- **Mastra Framework** - Multi-agent orchestration
- **Google Gemini 2.0 Flash** - Fast, cost-effective AI model
- **LibSQL** - Vector database for RAG (22MB knowledge base)
- **ElevenLabs** - Character voice synthesis (optional)
- **Ink** - React-based terminal UI

### RAG System

Research-backed evaluation using:

- Bank of Finland financial literacy standards
- Finnish National Agency for Education (OPH) curriculum
- Yrityskylä program (85% of Finnish 6th graders)
- OECD-INFE international frameworks

**Features:**

- Multi-language support (Finnish, Swedish, English)
- Semantic reranking for better relevance
- Real-time news integration (mock for now)

See [docs/features/rag-system.md](docs/features/rag-system.md) for details.

### Voice Integration

Each character has a consistent, personality-matched voice:

- 10 unique ElevenLabs voices
- Expressive emotional tags (`[laughs]`, `[sighs]`, `[crying]`)
- Dynamic parameters adjust to emotional state

See [docs/features/voice-integration.md](docs/features/voice-integration.md) for details.

### Relationship System

Characters build (or lose) trust with you:

- **5 trust tiers:** Stranger → Acquaintance → Trusted → Close → Best Friend
- **Trust decay:** Ignored characters lose trust over time
- **Viral unlocks:** High-trust characters recommend you to friends
- **Follow-ups:** Characters return to show consequences

See [docs/features/relationship-system.md](docs/features/relationship-system.md) for details.

---

## 📊 Progression System

### Reputation (0-100)

- Starts at 50
- +10 for good advice, -10 for poor advice
- Unlocks harder cases as it grows

### Skill Level (0-10)

- Starts at 1
- Grows with quality consultations
- Boss reviews accelerate growth

### Topic Expertise (0-10 per topic)

- Budgeting, Saving, Debt Management
- Investing, Scam Awareness, Emergency Fund
- Credit Score, Loans, Insurance, Retirement

### Advisor Coins

- Earn based on financial impact of advice
- €X saved/debt cleared = Y coins
- Future: Unlock features with coins

---

## 🧠 Key Features

### Dynamic Language Support

- Characters automatically match your language (Finnish/English)
- Real-time translation for character messages
- Maintains authentic Finnish context

### Beginner-Friendly Evaluation

- First 10 sessions use gentler evaluation
- 80% chance of easier scenarios early on
- Progressive difficulty scaling

### Memory & Consequences

- Characters remember past interactions
- Advice outcomes shown in follow-up scenarios
- Trust levels evolve based on advice quality

### Research-Backed Content

- 800+ lines of Finnish financial literacy content
- Sourced from Bank of Finland, OPH, OECD
- Citations included in evaluations

---

## 📁 Project Structure

```
puppet-master/
├── src/
│   ├── mastra/
│   │   ├── agents/          # AI agents (game master, evaluator, boss, character factory)
│   │   ├── tools/           # Mastra tools (invoke character, query knowledge)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── game/            # Game orchestrator and character pool manager
│   │   ├── rag/             # RAG system (knowledge base init, reranking, news)
│   │   └── services/        # Voice service, evaluation, projections
│   ├── play-tui.tsx         # Terminal UI (Ink-based React)
│   └── test-game.ts         # Demo script
├── characters/
│   ├── individuals/         # 34 character JSON files
│   └── scenarios/           # 50+ scenario JSON files
├── knowledge-base/          # Financial literacy content (Finnish/Swedish/English)
├── docs/
│   ├── features/            # Feature documentation
│   │   ├── rag-system.md
│   │   ├── voice-integration.md
│   │   └── relationship-system.md
│   └── error-recovery.md
├── agents/                  # Agent system prompts
├── scripts/                 # Utility scripts (voice ID assignment)
└── claude.md                # Developer documentation
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Optional (for voice integration)
ELEVENLABS_API_KEY=your_key_here

# Optional (change default LLM model)
AGENT_LLM_MODEL=gemini-2.0-flash  # or openai/gpt-4o, etc.
```

### Changing AI Models

By default, all agents use **Gemini 2.0 Flash**. To change:

```bash
# Environment variable (runtime)
AGENT_LLM_MODEL=openai/gpt-4o-mini

# Or edit src/mastra/agents/agent-model.ts
const DEFAULT_AGENT_MODEL = "google/gemini-2.0-flash";
```

---

## 🎓 Educational Approach

Based on research-aligned learning methods:

- **Experiential Learning** - Learn by doing, not just reading
- **Consequence Visibility** - See how choices compound over time
- **Personalization** - Tailored to individual scenarios and personalities
- **Safe Environment** - Make mistakes without real-world consequences
- **Research-Backed** - Informed by Finnish youth financial literacy studies

### Target Audience

- **Primary:** Finnish youth (ages 13-25)
- **Secondary:** Anyone learning financial literacy
- **Educators:** Teachers can use for financial education classes

---

## 🛠️ Development

### Adding Characters

Create a JSON file in `characters/individuals/`:

```json
{
  "characterId": "char_new_001",
  "name": "New Character",
  "age": 25,
  "occupation": "Occupation",
  "personality": {
    "impulsiveness": 0.5,
    "trustingness": 0.7,
    "financial_literacy": 0.4,
    "stubbornness": 0.5,
    "emotionality": 0.6
  },
  "communicationStyle": {
    "voiceId": "voice_id_here"
  }
  ...
}
```

Then assign a voice ID:

```bash
npx tsx scripts/assign-voice-ids.ts
```

### Adding Scenarios

Create scenarios in `characters/scenarios/`:

```json
{
  "scenarioId": "scenario_new_001",
  "characterId": "char_new_001",
  "scenarioType": "budgeting_crisis",
  "difficulty": 0.5,
  "topic": "budgeting",
  "initialContact": {
    "method": "text",
    "message": "Scenario text..."
  }
  ...
}
```

### Adding Knowledge

Edit knowledge base files in `knowledge-base/`:

- `finnish-financial-literacy.md` - Finnish content
- `swedish-financial-literacy.md` - Swedish content
- `english-financial-literacy.md` - English content

Then re-initialize:

```bash
pnpm init:knowledge-base
```

---

## 📈 Future Roadmap

- [ ] Web/mobile frontend (React Native)
- [ ] User authentication & cloud persistence
- [ ] Multiplayer leaderboards & comparisons
- [ ] Real-time Finnish news integration
- [ ] Teacher dashboard for classroom use
- [ ] More scenarios & characters (100+ goal)
- [ ] Voice personality consistency improvements
- [ ] Integration with banking APIs (with permissions)

---

## 🤝 Contributing

This is a Junction 2025 hackathon project. Contributions welcome!

### Areas for Contribution

- **Content:** Add characters, scenarios, knowledge base content
- **Features:** Leaderboards, analytics, web frontend
- **Localization:** Expand beyond Finnish/Swedish/English
- **Testing:** Add test coverage, improve evaluation accuracy

---

## 🙏 Acknowledgments

### Research Sources

- Bank of Finland Financial Literacy Centre
- Finnish National Agency for Education (OPH)
- Yrityskylä / Junior Achievement Finland
- OECD-INFE Financial Education Framework
- OP Financial Group Youth Programs
- Helsinki Deaconess Foundation (Taloustaito)

### Technology

- [Mastra](https://mastra.ai/) - Multi-agent orchestration framework
- [Google Gemini](https://ai.google.dev/) - Fast, cost-effective LLM
- [ElevenLabs](https://elevenlabs.io/) - Voice synthesis
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs

---

## 📞 Contact

**Team:** Katalyst Software
**Event:** Junction 2025 - Helsinki Education Hub Challenge
**Repo:** [github.com/KatalystSoftware/junction-2025](https://github.com/KatalystSoftware/junction-2025)

---

## 📚 Documentation

- **Getting Started:** This README
- **Developer Guide:** [claude.md](claude.md)
- **RAG System:** [docs/features/rag-system.md](docs/features/rag-system.md)
- **Voice Integration:** [docs/features/voice-integration.md](docs/features/voice-integration.md)
- **Relationship System:** [docs/features/relationship-system.md](docs/features/relationship-system.md)
- **Error Recovery:** [docs/error-recovery.md](docs/error-recovery.md)

---

**Ready to start?** Run `pnpm play` and begin your journey as a financial advisor! 💼✨
