# Voice Integration with ElevenLabs

Complete documentation for the voice integration system, including character consistency and expressive voice tags.

## Overview

The game features AI-powered voice messages using ElevenLabs API, making character interactions more immersive and emotional. Characters send voice messages during highly emotional moments, with consistent voices across all sessions and expressive emotional tags.

## Features

### 1. Consistent Character Voices

Each of the 34 characters has a **permanent, assigned voice** that never changes:

- Based on age (young 18-25, adult 26-45, mature 46+)
- Gender-appropriate (inferred from Finnish names)
- Personality-matched (emotional, energetic, calm, anxious)

**Example assignments:**

- **Minna Virtanen** (22F, energetic) → Rachel (expressive young female)
- **Jukka Laaksonen** (28M, emotional) → Bill (upbeat adult male)
- **Anna Lehtonen** (48F) → Dorothy (mature calm female)

### 2. Expressive ElevenLabs Tags

Voice messages automatically include emotional tags based on character state:

| Emotion        | Tags Used                  | Example                                |
| -------------- | -------------------------- | -------------------------------------- |
| Anxious/Scared | `[gulps]`, `[whispers]`    | "[gulps] En tiedä mitä teen..."        |
| Crying/Sad     | `[crying]`, `[sighs]`      | "[crying] Mun tilanne on niin paha..." |
| Happy/Relieved | `[laughs]`, `[excited]`    | "[excited] Kiitos! [laughs]"           |
| Frustrated     | `[exhales]`, `[sarcastic]` | "[exhales] [sarcastic] Joo..."         |

### 3. Dynamic Voice Parameters

While voice ID stays consistent, parameters adjust to emotional state:

| Emotion        | Stability | Similarity | Style | Effect            |
| -------------- | --------- | ---------- | ----- | ----------------- |
| Scared/Anxious | 0.3       | 0.5        | 0.7   | Trembling, varied |
| Crying/Sad     | 0.2       | 0.6        | 0.8   | Maximum emotion   |
| Frustrated     | 0.4       | 0.6        | 0.7   | Tense, stressed   |
| Excited/Happy  | 0.5       | 0.7        | 0.6   | Energetic         |
| Calm/Neutral   | 0.7       | 0.8        | 0.3   | Stable            |

## Voice Mapping

### Available Voices

**Female Voices:**

- `female_young_energetic` - Rachel (ages 18-25, high energy)
- `female_young_calm` - Elli (ages 18-25, calmer)
- `female_adult_warm` - Bella (ages 26-45, friendly)
- `female_adult_emotional` - Domi (ages 26-45, emotional)
- `female_mature_calm` - Dorothy (ages 46+)

**Male Voices:**

- `male_young_energetic` - Liam (ages 18-25, energetic)
- `male_young_anxious` - Antoni (ages 18-25, anxious)
- `male_adult_calm` - Adam (ages 26-45, calm)
- `male_adult_upbeat` - Bill (ages 26-45, upbeat)
- `male_mature_firm` - Harry (ages 46+)

### Voice Triggering

Voice messages are generated based on:

1. **Scenario number:** 50% chance on scenario 2, guaranteed on scenario 3
2. **Character preference:** `prefersVoice` setting (0-1)
3. **Emotional state:** Higher chance when `callsWhenEmotional` is true
4. **Base random chance:** 10% + character preference modifier

## Technical Implementation

### Architecture

**Files:**

- `src/mastra/services/voice-service.ts` - Core voice generation logic
- `src/mastra/types/game-types.ts` - Type definitions
- `characters/individuals/*.json` - Character voice assignments
- `scripts/assign-voice-ids.ts` - Voice assignment automation

### Key Functions

#### `enhanceTextWithVoiceTags()`

```typescript
export function enhanceTextWithVoiceTags(
  text: string,
  emotionalState: string,
  personality: Character["personality"],
): string;
```

Automatically adds ElevenLabs emotional tags based on:

- Emotional state (scared, happy, sad, etc.)
- Personality traits (emotionality, impulsiveness)
- Message content analysis

#### `getVoiceForEmotion()`

```typescript
function getVoiceForEmotion(
  character: Character,
  emotionalState: string,
): EmotionalVoiceMapping;
```

Returns voice configuration:

- Uses character's assigned `voiceId` if available
- Adjusts stability, similarity, and style for emotion
- Falls back to personality-based selection

#### `generateVoiceMessage()`

```typescript
export async function generateVoiceMessage(
  character: Character,
  messageText: string,
  emotionalState: string,
): Promise<VoiceMessageConfig>;
```

Complete voice generation pipeline:

1. Enhances text with emotional tags
2. Gets appropriate voice configuration
3. Calls ElevenLabs API
4. Returns base64-encoded audio

### Character Schema

```json
{
  "communicationStyle": {
    "formality": "casual",
    "language": "casual_adult_finnish",
    "prefersVoice": 0.5,
    "callsWhenEmotional": true,
    "voiceId": "pqHfZKP75CvOlQylNhV4"
  }
}
```

## Setup

### 1. Get ElevenLabs API Key

1. Sign up at https://elevenlabs.io/
2. Go to your profile settings → API section
3. Copy your API key

### 2. Add to Environment

```bash
# In .env file
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Test Voice Generation

```bash
pnpm dev
```

Then open http://localhost:3000. Voice messages will automatically appear during emotional character moments!

## Adding New Characters

### Option A: Use the Script (Recommended)

```bash
npx tsx scripts/assign-voice-ids.ts
```

The script automatically:

- Infers gender from Finnish name
- Categorizes age (young/adult/mature)
- Analyzes personality traits
- Assigns appropriate voice ID
- Skips characters that already have voices

### Option B: Manual Assignment

Edit character JSON file:

```json
{
  "communicationStyle": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM" // Choose from voice mapping
  }
}
```

## Web UI Integration

Voice messages appear in the WhatsApp-style interface with:

**Visual indicator:**

```
🔊 [Voice Message] Jukka Laaksonen (Urgent):
   "..." (transcription shown)
   🎧 Audio player
```

**Features:**

- Audio player with play/pause controls
- Transcription always shown as fallback
- Urgency indicator (calm/concerned/urgent/excited)
- Emoji indicator for emotional state

**Implementation:** `frontend/src/components/`

The web UI components:

1. Detect voice messages via `voiceConfig.enabled`
2. Display transcription with 🔊 indicator
3. Show audio player if `audioUrl` is provided
4. Show urgency level visually

## Troubleshooting

### No Voice Messages Appearing

**Check:**

1. `ELEVENLABS_API_KEY` is set in `.env`
2. Character has `voiceId` assigned
3. Emotional state triggers voice (high emotionality)
4. API key has credits remaining

### Voice Sounds Wrong

**Solutions:**

- Verify character's `voiceId` matches their personality
- Check emotional state is being detected correctly
- Adjust stability/similarity/style parameters if needed

### Test Voice Generation:

```typescript
import { generateVoiceMessage } from "./services/voice-service";

const voiceConfig = await generateVoiceMessage(
  character,
  "Hei, mun rahat loppuu aina kesken kuun!",
  "stressed and worried",
);

console.log(voiceConfig.audioUrl); // base64 audio data
```

## Cost Considerations

**ElevenLabs Pricing (as of 2025):**

- Free tier: 10,000 characters/month
- Paid: Starting at $5/month

**Optimization:**

- Voice messages trigger ~10-20% of the time
- Average message: 50-100 characters
- 100 sessions ≈ 1,000-2,000 characters

**Recommendation:** Free tier sufficient for development and demos.

## Future Enhancements

Potential improvements:

1. **More voices** - Expand from 10 to 20+ unique voices
2. **Accent support** - `[strong Finnish accent]` for regional characters
3. **Voice customization** - Let users choose voice per character
4. **Voice cloning** - Use ElevenLabs voice cloning for unique characters
5. **Singing/effects** - `[sings]`, `[woo]` for special moments
6. **Multi-language** - Separate voices for Swedish/English characters

## Examples

### Scared Character (High Emotionality)

**Input:**

```
Character: Petri (19, anxious)
Message: "En tiedä mitä teen."
Emotion: "very anxious and scared"
```

**Output:**

```
Enhanced: "[gulps] En tiedä mitä teen... [whispers] En tiedä mitä tehdä."
Voice: Antoni (male_young_anxious)
Params: stability=0.3, style=0.7
```

### Happy Character (Relieved)

**Input:**

```
Character: Minna (22, energetic)
Message: "Kiitos! Se auttoi paljon!"
Emotion: "relieved and happy"
```

**Output:**

```
Enhanced: "[excited] Kiitos! Se auttoi paljon! [laughs]"
Voice: Rachel (female_young_energetic)
Params: stability=0.5, style=0.6
```

## References

- **ElevenLabs Docs:** https://docs.elevenlabs.io/
- **Voice Tags Reference:** https://elevenlabs.io/docs/speech-synthesis/prompting
- **Implementation:** `src/mastra/services/voice-service.ts`

---

**Version:** 1.0
**Last Updated:** 2025-11-15
