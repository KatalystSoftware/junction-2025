# 🎮 How to Play: Financial Advisor Simulator

You are a financial advisor! AI characters will come to you with real financial problems. Give them your best advice and watch your reputation grow.

---

## 🚀 Option 1: Interactive CLI (Recommended for Quick Play)

Play directly in your terminal with a chat-like interface.

### Start Playing

```bash
pnpm play
```

### How It Works

1. **Character appears** with a financial problem

   ```
   💬 Minna Virtanen (22, Yliopisto-opiskelija):
      "Hei! Mun rahat tuppaa loppuu aina ennen kuun loppua..."
   ```

2. **You give advice** by typing your response

   ```
   💼 You: Hei Minna! Aloitetaan seuraamalla menojasi viikon ajan...
   ```

3. **Character reacts** based on your advice quality

   ```
   💬 Minna Virtanen:
      "Okei, tää kuulostaa järkevältä! Mut miten mä kirjaan ne menot?"
   ```

4. **Conversation continues** until character is satisfied

5. **Your stats update** based on how well you advised

   ```
   📊 Your Stats:
      Reputation: 52/100
      Skill Level: 1.1/10
      Sessions: 1
   ```

6. **Next character appears** automatically

7. **Boss reviews you** every 3-5 sessions
   ```
   👔 BOSS REVIEW
   📈 Overall Score: 7.5/10
   ✅ Strengths: ...
   📚 Learning Materials: ...
   ```

### Special Commands

- Type `stats` - View your current statistics
- Type `quit` or `exit` - End the game
- Press ENTER - Continue to next client

---

## 🌐 Option 2: Mastra Dev UI (Best for Testing Agents)

Mastra provides a web UI where you can test agents interactively.

### Start the Dev Server

```bash
pnpm dev
```

This starts a local server at `http://localhost:4111` (or another port)

### Using the Mastra UI

1. **Navigate to Agents** in the sidebar
2. **Select an agent**:
   - `gameMasterAgent` - Orchestrator (sends you characters)
   - `godBossAgent` - Reviews your performance
   - `evaluatorAgent` - Evaluates advice quality
   - Character agents are created dynamically

3. **Test the flow**:
   - Send messages to Game Master to get character assignments
   - Test character responses
   - Try God/Boss reviews

4. **View agent responses** in real-time

**Note:** The Mastra UI is great for testing individual agents, but the CLI gives you the full game experience.

---

## 🎯 Gameplay Tips

### For Better Advice:

✅ **Be specific** - Give concrete steps, not vague suggestions
✅ **Show empathy** - Acknowledge their emotions and situation
✅ **Ask questions** - Understand their situation before advising
✅ **Recommend tools** - Apps, resources, calculators
✅ **Explain why** - Help them understand, not just what to do

### Common Mistakes to Avoid:

❌ Being too vague ("just save more money")
❌ Ignoring their financial literacy level
❌ Setting unrealistic goals
❌ Being judgmental about their situation
❌ Using too much jargon without explaining

---

## 👥 Characters You'll Meet

### Minna Virtanen (22, Student)

- **Problem**: Money runs out before month ends
- **Topic**: Budgeting basics
- **Difficulty**: Easy
- **Personality**: Impulsive, trusting, low financial literacy

### Jukka Laaksonen (28, Retail Worker)

- **Problem**: 8000€ debt, feeling overwhelmed
- **Topic**: Debt management
- **Difficulty**: Medium
- **Personality**: Emotional, trusting, moderate literacy

### Sari Mäkinen (35, Nurse)

- **Problem**: Wants to save for kids & retirement
- **Topic**: Saving & investing
- **Difficulty**: Medium
- **Personality**: Cautious, flexible, moderate literacy

### Petri Koskinen (19, High School Student)

- **Problem**: Confused about crypto scams
- **Topic**: Scam awareness
- **Difficulty**: Easy-Medium
- **Personality**: Skeptical, stubborn, low literacy

**Note:** Characters can return later to show consequences of your advice!

---

## 📈 Progression System

### Reputation (0-100)

- Starts at 50
- +10 for good advice
- -10 for poor advice
- Unlocks harder cases as it grows

### Skill Level (0-10)

- Starts at 1
- Grows with quality consultations
- Boss reviews accelerate growth

### Topic Expertise (0-10 per topic)

- Budgeting
- Saving
- Debt Management
- Investing
- Scam Awareness
- ...and more

---

## 🎓 Learning System

### God/Boss Reviews

Every 3-5 sessions, your boss reviews your performance:

- **Overall Score** (0-10)
- **Strengths** identified
- **Areas for Improvement**
- **Learning Materials** (Finnish resources)
- **Skill & Reputation adjustments**

### Follow-Up Scenarios

Characters return to show consequences:

- **Good advice** → They return grateful, showing progress
- **Bad advice** → They return confused, needing more help

---

## 🔧 Customization

### Add Your Own Characters

Edit `characters/characters.json`:

```json
{
  "characterId": "char_custom_001",
  "name": "Your Character",
  "age": 25,
  "occupation": "Your Occupation",
  "personality": {
    "impulsiveness": 0.5,
    "trustingness": 0.7,
    "financial_literacy": 0.4,
    ...
  },
  ...
}
```

### Add Scenarios

Edit `characters/scenarios.json`:

```json
{
  "scenarioId": "scenario_custom_001",
  "characterId": "char_custom_001",
  "scenarioType": "custom_scenario",
  "difficulty": 0.5,
  "topic": "budgeting",
  "initialContact": {
    "method": "text",
    "message": "Your scenario text..."
  },
  ...
}
```

---

## 🐛 Troubleshooting

### "Character pool initialization failed"

- Check that `characters/characters.json` and `characters/scenarios.json` exist
- Verify JSON is valid (use `cat characters/characters.json | jq`)

### "Agent not found"

- Make sure you've run `pnpm install`
- Try restarting the dev server

### "No characters available"

- You might have gone through all scenarios
- Edit the JSON files to add more or reset by restarting

---

## 💡 Pro Tips

1. **Take your time** - Don't rush through conversations
2. **Read character personality** - Adjust your communication style
3. **Watch for follow-ups** - Your advice has long-term consequences
4. **Learn from Boss reviews** - They contain valuable improvement tips
5. **Track your stats** - See which topics you're strong/weak in

---

**Ready to start?** Run `pnpm play` and begin your journey as a financial advisor! 💼✨
