# Voice Integration with ElevenLabs

This document describes the voice integration feature that adds emotional text-to-speech capabilities to character messages.

## Overview

The voice integration uses ElevenLabs API to generate realistic voice messages for characters during emotional moments. This enhances player engagement by making the experience more immersive and emotionally resonant.

## Features

- **Emotional Voice Mapping**: Different voices based on character personality and emotional state
- **Rare Triggering**: Voice messages appear approximately 1/10 times (10% chance) to maintain novelty
- **Scripted Scenarios**: Guaranteed voice messages on 2nd or 3rd scenario for consistent experience
- **Character Preferences**: Respects character's `prefersVoice` and `callsWhenEmotional` settings
- **Multilingual Support**: Supports both Finnish and English using ElevenLabs multilingual models

## Setup

### 1. Install Dependencies

The required packages are already installed via `@mastra/voice-elevenlabs` and `@elevenlabs/elevenlabs-js`.

### 2. Get ElevenLabs API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Navigate to your profile settings
3. Go to the API section
4. Copy your API key

### 3. Configure Environment

Add to your `.env` file:

```bash
ELEVENLABS_API_KEY=your_api_key_here
```

**Note**: Voice integration is optional. If the API key is not provided, the game will work normally but characters won't send voice messages.

## Voice Personality Mapping

Characters get different voices based on their emotional state:

### Emotional States → Voices

- **Scared/Anxious**: Young or nervous voices with low stability (high variation)
- **Crying/Upset**: Emotional voices with very low stability for maximum expression
- **Frustrated/Angry**: Firm, frustrated tones
- **Excited/Happy**: Energetic, upbeat voices
- **Concerned/Worried**: Moderately concerned tones
- **Calm/Neutral**: Professional or friendly voices with high stability

### Voice Parameters

Each emotional state uses specific voice settings:

- **Stability** (0-1): How consistent the voice sounds
  - Low (0.2-0.3): Highly emotional, variable (crying, scared)
  - Medium (0.4-0.5): Moderately emotional
  - High (0.7-0.8): Calm, professional

- **Similarity Boost** (0-1): How closely to match the original voice
  - Typically 0.5-0.8 for natural variation

- **Style** (0-1): How much emotional style to apply
  - High (0.7-0.8): Maximum emotion (crying, scared)
  - Medium (0.5-0.6): Moderate emotion
  - Low (0.3): Minimal emotional expression

## Triggering Logic

Voice messages are generated based on:

### 1. Scripted Triggers
- **2nd scenario**: Always generates voice
- **3rd scenario**: Always generates voice

### 2. Random Triggers
- **Base chance**: 10% (1 in 10 messages)
- **Character preference**: Adjusted by `character.communicationStyle.prefersVoice`
- **Emotional boost**: 30% chance if `callsWhenEmotional` and highly emotional state

### 3. Emotional States that Boost Probability
- Scared, crying, devastated, panicked
- Ecstatic, thrilled, extremely excited

## Implementation Details

### Core Service
`src/mastra/services/voice-service.ts`

Three main functions:

1. **shouldGenerateVoiceMessage()**: Determines if voice should be generated
2. **generateVoiceMessage()**: Generates the actual audio using ElevenLabs
3. **inferEmotionalStateFromContext()**: Derives emotional state from character/scenario

### Integration Points

1. **Character Agent Tool** (`src/mastra/tools/invoke-character-tool.ts`)
   - Checks if voice should be generated after character response
   - Generates voice for first message if triggered

2. **Character Agent Factory** (`src/mastra/agents/character-agent-factory.ts`)
   - `getCharacterInitialMessage()` generates voice for initial contacts
   - Supports translated messages (Finnish/English)

3. **Game Orchestrator** (`src/mastra/game/orchestrator.ts`)
   - Passes `voiceConfig` through GameResponse
   - Returns voice data to frontend for playback

### Type Definitions

```typescript
export interface VoiceMessageConfig {
  enabled: boolean;
  transcription?: string;    // Text version of message
  audioUrl?: string;         // Base64 data URL of audio
  urgency?: "calm" | "concerned" | "urgent" | "excited";
}
```

## Usage Example

```typescript
// In character response
const characterResponse = {
  messages: ["I'm so worried about my debt!"],
  emotionalState: "anxious",
  voiceNeeded: true,
  voiceConfig: {
    enabled: true,
    transcription: "I'm so worried about my debt!",
    audioUrl: "data:audio/mpeg;base64,//uQx...",
    urgency: "concerned"
  }
};

// Frontend can play the audio from voiceConfig.audioUrl
```

## Frontend Integration

To integrate with a frontend:

1. Check if `response.voiceConfig?.enabled === true`
2. Display transcription text
3. Provide audio player with `response.voiceConfig.audioUrl`
4. Show urgency indicator based on `response.voiceConfig.urgency`

Example:

```jsx
{response.voiceConfig?.enabled && (
  <div className="voice-message">
    <audio controls src={response.voiceConfig.audioUrl} />
    <p className={`urgency-${response.voiceConfig.urgency}`}>
      {response.voiceConfig.transcription}
    </p>
  </div>
)}
```

## Testing

The voice service includes graceful fallbacks:

- If ELEVENLABS_API_KEY is missing: Returns disabled voice config
- If API call fails: Returns text-only config
- If network errors: Catches and logs, returns fallback

## Cost Considerations

ElevenLabs pricing (as of 2025):
- **Free tier**: 10,000 characters/month
- **Paid plans**: Starting at $5/month for 30,000 characters

With 10% triggering rate:
- Average message: ~50 characters
- 10 scenarios: ~500 characters (well within free tier)
- 100 scenarios: ~5,000 characters (still within free tier)

## Future Enhancements

Potential improvements:

1. **Voice Caching**: Cache generated voices for repeated messages
2. **Voice Selection UI**: Let players choose preferred voices
3. **Volume Control**: Add volume settings for voice messages
4. **Speed Control**: Variable playback speed
5. **Character Voice Profiles**: Consistent voices per character across sessions
6. **Emotion Detection**: More sophisticated emotion analysis from AI responses

## Troubleshooting

### Voice not generating?

1. Check if `ELEVENLABS_API_KEY` is set in `.env`
2. Verify API key is valid (check ElevenLabs dashboard)
3. Check console logs for error messages
4. Verify character has appropriate emotional state

### Audio not playing?

1. Check if browser supports HTML5 audio
2. Verify `audioUrl` is a valid base64 data URL
3. Check browser console for errors
4. Try different browsers (Chrome, Firefox, Safari)

### Cost concerns?

1. Monitor usage in ElevenLabs dashboard
2. Reduce triggering probability in `voice-service.ts`
3. Disable for specific scenarios
4. Use shorter messages when possible

## Related Files

- `src/mastra/services/voice-service.ts` - Core voice generation logic
- `src/mastra/tools/invoke-character-tool.ts` - Character response integration
- `src/mastra/agents/character-agent-factory.ts` - Initial message integration
- `src/mastra/game/orchestrator.ts` - Game flow integration
- `src/mastra/types/game-types.ts` - Type definitions
- `SETUP.md` - Setup instructions including ElevenLabs API key
