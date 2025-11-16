# Broke No More!

[![Junction 2025](https://img.shields.io/badge/Junction_2025-Helsinki-blue)](https://junction2025.com)

## 🎮 [PLAY NOW → brokenomore.club](https://brokenomore.club)

**No installation required. Works on mobile and desktop.**

---

![Broke No More! intro](https://github.com/user-attachments/assets/a63c596a-32f3-45ad-9d6e-e0e6c41468db)

Welcome to **Broke No More!**, the fast-paced, narrative-driven advisor sim where everyone but you is a financial disaster waiting to happen.

As the town's newly appointed **Financial Advisor**, you'll guide a parade of lovable—but catastrophically clueless—NPCs through money dilemmas of their own making.

From impulse-buying a pet tiger to taking out a loan to start a "guaranteed-to-fail" underwater bakery, every NPC brings a new crisis. Your job? Ask smart questions, uncover the real motivations, and redirect them toward better choices—before their decisions blow up the economy… or at least their savings accounts.

**Earn trust. Unlock perks. Improve the town's prosperity.** And maybe—just maybe—teach these NPCs how not to financially implode.

**Save the town, one bad idea at a time.** 💸

---

## ⚡ What Makes This Special?

- **34 unique AI characters** - each with distinct personalities, voices, and terrible financial decisions
- **WhatsApp-style interface** - familiar, intuitive, works on your phone
- **Real consequences** - characters remember your advice and return to show results (good or bad)
- **Voice messages** - emotional audio from characters using AI voice synthesis
- **Research-backed** - evaluation based on [Bank of Finland](https://www.suomenpankki.fi/en/financial-literacy/), [OPH curriculum](https://www.oph.fi/en), and [OECD-INFE](https://www.oecd.org/financial/education/) standards
- **Learn by teaching** - giving advice builds deeper understanding than just reading about money

> _"I never understood budgeting until I had to explain it to someone else. The characters felt real—I actually cared if my advice helped them."_
>
> _"Pelaan tätä ihan oikeasti vapaa-ajalla. Parempi kuin TikTok ja opin jotain!"_ _(I actually play this in my free time. Better than TikTok and I learn something!)_

**Target audience**: Finnish youth (ages 13-25) learning financial literacy through play

---

## 🚀 Getting Started

### Option 1: Web App (Recommended)

**👉 [brokenomore.club](https://brokenomore.club)** - Just click and play!

### Option 2: Local Development

**Prerequisites**: Node.js 22.13.0+, pnpm

```bash
git clone https://github.com/KatalystSoftware/junction-2025.git
cd junction-2025
pnpm install

# Add your API key
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_key" > .env

# Initialize knowledge base
pnpm init:knowledge-base

# Start playing
pnpm play
```

---

## 🎮 How It Works

1. **Character arrives** with a financial disaster → "Hei! I bought a tiger on credit..."
2. **You give advice** → Type your wisdom or choose from AI-generated options
3. **Character reacts** → Personality affects how they take your advice (trust ↑ or ↓)
4. **See results** → AI evaluates against Finnish financial standards, shows projected outcomes
5. **Boss reviews** → Every few sessions, your boss gives feedback and learning materials

**Play modes**:

- ⚡ **Choice Mode** - Pick from 3 AI-generated advice options (fast)
- ✍️ **Free-Text Mode** - Type your own advice (deeper learning)

**Special features**:

- 🔊 Voice messages from characters (emotional, personality-matched)
- 📊 Progress tracking (reputation, skill level, topic expertise)
- 🏆 Achievements and leaderboards
- 🌍 Multi-language support (Finnish, Swedish, English)

---

## 👥 Sample Characters

**Minna Virtanen (22, Student)** - Money runs out before month ends. Impulsive, trusting, low financial literacy.

**Jukka Laaksonen (28, Retail Clerk)** - €8,000 debt, overwhelmed. Emotional, needs encouragement.

**Sari Mäkinen (35, Nurse)** - Wants to save for kids & retirement. Cautious, flexible.

...and **31 more** unique characters with distinct personalities and voices!

---

## 🏗️ Tech Stack

**AI Architecture**:

- Multi-agent system with Mastra Framework (Game Master orchestrates Character, Evaluator, and Boss agents)
- Google Gemini 2.0 Flash for fast, cost-effective AI responses
- RAG system with 800+ lines of Finnish financial literacy research (Bank of Finland, OPH, OECD)
- ElevenLabs voice synthesis for emotional character voices

**Frontend**: React + Vite (WhatsApp-style chat interface)
**Backend**: Hono API + PostgreSQL + LibSQL vector database
**Infrastructure**: Google Cloud Run, Terraform, Docker

**Key systems**:

- 🎯 **Relationship System** - 5 trust tiers, characters recommend you to friends if you do well
- 🔄 **Consequence System** - Characters return to show results of your advice
- 📊 **Progression** - Reputation (0-100), Skill Level (0-10), Topic Expertise per financial topic
- 🧠 **RAG Evaluation** - AI evaluates advice against research-backed Finnish standards

<details>
<summary>📁 Full project structure</summary>

```
junction-2025/
├── src/mastra/          # Multi-agent AI system
│   ├── agents/          # Game master, evaluator, boss, character factory
│   ├── rag/             # Knowledge base, RAG system
│   └── services/        # Voice, evaluation, financial calculations
├── characters/          # 34 characters + 70+ scenarios (JSON)
├── knowledge-base/      # Finnish/Swedish/English financial literacy
├── frontend/            # React web interface
└── infra/               # Terraform infrastructure
```

</details>

---

## 🎓 Why This Works (Research-Backed)

Aligned with **Finland's 2030 Financial Literacy Strategy** ([Bank of Finland report](https://www.suomenpankki.fi/en/financial-literacy/)):

- ✅ **Experiential learning** - Learn by teaching (more effective than lectures) - [Yrityskylä program](https://www.yrityskyla.fi/en/) (85% of Finnish 6th graders)
- ✅ **Safe environment** - Make mistakes without real consequences
- ✅ **Personalization** - Different personalities react differently (addressing [gender gaps](https://www.oecd.org/financial/education/oecd-infe-2020-international-survey-of-adult-financial-literacy.pdf) in financial confidence)
- ✅ **Consequence visibility** - See long-term impact of financial decisions
- ✅ **Research standards** - Based on [Bank of Finland](https://www.suomenpankki.fi/en/), [OPH curriculum](https://www.oph.fi/en/education-and-qualifications/basic-education-curriculum), [OECD-INFE frameworks](https://www.oecd.org/financial/education/)

**Target life stages**: First bank card, moving out, first job, managing debt

📚 **[View our full knowledge base](knowledge-base/)** - 800+ lines of Finnish financial literacy research

---

## 🛠️ For Developers

<details>
<summary>Development setup and commands</summary>

```bash
# Development commands
pnpm dev              # Start API + frontend dev servers
pnpm play             # Interactive CLI game
pnpm test             # Run demo with real AI
pnpm check            # TypeScript type checking
pnpm format           # Format code

# Adding content
pnpm init:knowledge-base  # Initialize RAG knowledge base
```

**Add characters**: Create JSON in `characters/individuals/` with personality traits
**Add scenarios**: Create JSON in `characters/scenarios/` linked to characters
**Add knowledge**: Edit `knowledge-base/*.md` files, then re-run `pnpm init:knowledge-base`

See [claude.md](claude.md) for full developer documentation.

</details>

---

## 🚀 Future Plans

- 🏫 Teacher dashboard for classroom use
- 🏆 Global leaderboards and achievements
- 📱 Native mobile app (React Native)
- 🔗 Integration with Finnish banking APIs (OP, Nordea youth accounts)
- 📰 Real-time Finnish financial news integration
- 🌍 More languages and localization

---

## 🙏 Built With

**Research**: Bank of Finland, Finnish National Agency for Education (OPH), Yrityskylä, OECD-INFE Framework
**Tech**: [Mastra](https://mastra.ai/), [Google Gemini](https://ai.google.dev/), [ElevenLabs](https://elevenlabs.io/)
**Team**: Katalyst Software @ Junction 2025 - Helsinki Education Hub Challenge

<details>
<summary>📚 Documentation</summary>

- [Developer Guide](claude.md)
- [RAG System Details](docs/features/rag-system.md)
- [Voice Integration](docs/features/voice-integration.md)
- [Relationship System](docs/features/relationship-system.md)
</details>

---

**Ready to save the town?** 👉 **[Play now at brokenomore.club](https://brokenomore.club)** 💸
