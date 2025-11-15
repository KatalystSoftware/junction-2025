# Voice Integration in the TUI

## How Voice Integration Works in Terminal

The ElevenLabs voice integration **generates** audio for emotional character moments, but the Terminal User Interface (TUI) **cannot play audio** directly since it's a text-based application.

## What Happens

### Backend (Voice Generation)
1. ✅ **Voice audio is generated** via ElevenLabs API when appropriate
2. ✅ **Audio is encoded** as base64 data URL in `voiceConfig.audioUrl`
3. ✅ **Transcription is included** in `voiceConfig.transcription`
4. ✅ **Urgency level is set** based on emotional state

### TUI (Visual Indication)
Since terminals can't play audio, the TUI shows **visual indicators**:

1. **Voice Icon**: Messages with voice show 🎤 instead of 💬
2. **Urgency Indicators**: Different icons based on emotional urgency:
   - `🎤` - Calm voice message (default)
   - `🎤⚠️` - Concerned voice message
   - `🎤❗` - Urgent voice message (scared, crying)
   - `🎤✨` - Excited voice message (happy, thrilled)

### Example in TUI

```
💬 Matti: "I need some advice about my savings."
🎤❗ Matti: "I'm so scared! The debt collectors called!"
💬 Matti: "Thanks, that helps a bit."
🎤✨ Matti: "You're amazing! Thank you so much!"
```

## Voice Message Triggering

Voice messages appear:
- ✅ **Guaranteed** on 2nd and 3rd scenario (for consistent experience)
- ✅ **~10% chance** on other scenarios (1 in 10 messages)
- ✅ **Higher chance** (30%) for highly emotional states if character has `callsWhenEmotional: true`
- ✅ **Adjusted** by character's `prefersVoice` setting

## Backend Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Character Response Generated                             │
│ - Emotional state: "scared and anxious"                 │
│ - Character prefers voice: 0.7                          │
│ - Scenario number: 2 (scripted)                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ shouldGenerateVoiceMessage()                             │
│ → Returns: TRUE (scripted scenario)                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ generateVoiceMessage()                                   │
│ - Selects voice based on emotion (scared_anxious)       │
│ - Calls ElevenLabs API                                  │
│ - Converts audio to base64 data URL                     │
│ - Sets urgency: "urgent"                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ GameResponse                                             │
│ voiceNeeded: true                                        │
│ voiceConfig: {                                           │
│   enabled: true,                                         │
│   transcription: "I'm so scared!",                       │
│   audioUrl: "data:audio/mpeg;base64,...",               │
│   urgency: "urgent"                                      │
│ }                                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ TUI Display                                              │
│ Shows: 🎤❗ Matti: "I'm so scared!"                      │
└─────────────────────────────────────────────────────────┘
```

## Playing Audio (Future Enhancement)

For audio playback, you need a web frontend. Here's how it would work:

### Web Frontend Example

```tsx
{response.voiceConfig?.enabled && (
  <div className="voice-message">
    {/* Audio player */}
    <audio
      controls
      src={response.voiceConfig.audioUrl}
      autoPlay={response.voiceConfig.urgency === "urgent"}
    />

    {/* Visual urgency indicator */}
    <div className={`urgency-${response.voiceConfig.urgency}`}>
      <Icon name="microphone" />
      {response.voiceConfig.urgency === "urgent" && "⚠️"}
    </div>

    {/* Transcription */}
    <p className="transcription">
      {response.voiceConfig.transcription}
    </p>
  </div>
)}
```

## TUI Limitations

The TUI has fundamental limitations:

1. ❌ **Cannot play audio** - terminals are text-only
2. ❌ **Cannot save audio files** - no built-in file system access in terminal
3. ❌ **Cannot open external players** - would break the TUI flow

## Alternative Solutions for Terminal

If you really want audio in terminal, you could:

### Option 1: Save Audio to File
```typescript
// Add to TUI when voice message received
if (response.voiceConfig?.audioUrl) {
  const base64Data = response.voiceConfig.audioUrl.split(',')[1];
  const audioBuffer = Buffer.from(base64Data, 'base64');
  const filename = `/tmp/voice_${Date.now()}.mp3`;
  fs.writeFileSync(filename, audioBuffer);
  setStatusMessage(`🎤 Voice message saved to ${filename} (play with: mpg123 ${filename})`);
}
```

### Option 2: Auto-play with System Command
```typescript
// Automatically play audio using system player
if (response.voiceConfig?.audioUrl && process.platform !== 'win32') {
  const base64Data = response.voiceConfig.audioUrl.split(',')[1];
  const audioBuffer = Buffer.from(base64Data, 'base64');
  const filename = `/tmp/voice_${Date.now()}.mp3`;
  fs.writeFileSync(filename, audioBuffer);

  // Play on macOS
  exec(`afplay ${filename}`);
  // Or on Linux
  // exec(`mpg123 ${filename}`);
}
```

### Option 3: Web UI Recommendation
The TUI could show a message:
```
🎤❗ Voice message available!
   To hear emotional voice messages, use the web UI:
   npm run start:web
   http://localhost:3000
```

## Testing Voice Integration

To test voice in the TUI:

1. Set up ElevenLabs API key in `.env`
2. Run the TUI: `pnpm play`
3. Start a new consultation: press `n`
4. Look for voice indicators:
   - First scenario: ~10% chance of 🎤
   - **Second scenario: 100% chance of 🎤**
   - **Third scenario: 100% chance of 🎤**
5. Emotional responses more likely to have 🎤❗ or 🎤⚠️

## Cost Tracking

The voice generation happens on the backend, so API costs apply even though audio isn't played:

- **Free tier**: 10,000 characters/month (ElevenLabs)
- **Average message**: ~50 characters
- **With 10% triggering**: 10 scenarios = ~50 characters total
- **100 scenarios**: ~500 characters total

Monitor usage at: https://elevenlabs.io/app/usage

## Summary

| Feature | TUI Support | Notes |
|---------|-------------|-------|
| Voice Generation | ✅ Yes | Audio is generated via API |
| Visual Indicator | ✅ Yes | Shows 🎤 with urgency icons |
| Audio Playback | ❌ No | Terminals can't play audio |
| Transcription | ✅ Yes | Text is displayed normally |
| Urgency Display | ✅ Yes | Different icons per urgency |
| Audio Export | 🟡 Possible | Could save to file manually |

For full voice experience with audio playback, use a **web frontend** that can play the base64 audio data URLs.
