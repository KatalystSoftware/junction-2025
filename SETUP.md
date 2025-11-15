# Quick Setup Guide - Elämäpeli 2025

## Get Your Google Gemini API Key

### Option 1: Google AI Studio (Recommended - Fastest)

1. **Go to Google AI Studio:**
   - Visit: **https://aistudio.google.com/app/apikey**
   - Sign in with your Google account

2. **Create API Key:**
   - Click "Get API Key" or "Create API Key"
   - Click "Create API key in new project" (or select existing project)
   - Copy the key (starts with `AIza...`)

3. **Add to your project:**

   ```bash
   # Edit .env file
   nano .env

   # Replace the placeholder with your actual key:
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXX
   ```

## Get Your ElevenLabs API Key (Optional - For Voice Integration)

Voice integration adds emotional character voice messages to enhance the experience.

1. **Sign up at ElevenLabs:**
   - Visit: **https://elevenlabs.io/**
   - Create a free account

2. **Get your API key:**
   - Go to your profile settings
   - Navigate to the API section
   - Copy your API key

3. **Add to your .env file:**

   ```bash
   # Edit .env file
   nano .env

   # Add ElevenLabs API key:
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

**Note:** Voice integration is optional. The game will work without it, but characters won't send voice messages.

### Option 2: Google Cloud Platform (For Cloud Credits)

If you want to use Vertex AI with your Google Cloud credits:

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Enable **Vertex AI API** for your project
3. Set up authentication (service account or API key)
4. Use Vertex AI models instead

**Note:** For hackathon purposes, Google AI Studio (Option 1) is simpler and works great!

## Test Your Setup

```bash
# Run the game test
pnpm test

# You should see the multi-agent system in action!
```

## Models Currently Used

All agents default to **Gemini 2.5 Flash** (`google/gemini-2.5-flash`), configurable via the `AGENT_LLM_MODEL` environment variable:

- **Game Master Agent**: Orchestrator making decisions
- **Scammer Agent**: Generates scam scenarios
- **Friend Agent**: Creates peer pressure situations
- **Parent Agent**: Supportive teaching moments

## Troubleshooting

### Error: "Could not find API key"

Make sure:

1. You added the key to `.env` file
2. The key is named `GOOGLE_GENERATIVE_AI_API_KEY` (exactly)
3. The key starts with `AIza...`
4. No extra spaces or quotes around the key

### Test just the API key:

```bash
# Check if your .env is being read
node --env-file=.env -e "console.log(process.env.GOOGLE_GENERATIVE_AI_API_KEY)"
```

You should see your API key printed (starts with `AIza...`)

## Cost Estimates

Gemini 2.5 Flash is very cost-effective:

- **Free tier**: Up to 1,500 requests per day
- **Paid**: ~$0.075 per 1M input tokens

For this hackathon project, you'll likely stay within the free tier! 🎉

## Next Steps

Once your API key is set up:

1. ✅ Test the system: `pnpm test`
2. 🎮 Build more scenarios
3. 🎨 Add a frontend
4. 🚀 Demo at Junction 2025!

---

Need help? Check the main **README-GAME.md** for full documentation.
