# Voice Integration in the TUI

## How Voice Integration Works in Terminal

The ElevenLabs voice integration **generates** audio for emotional character moments, but the Terminal User Interface (TUI) **cannot play audio** directly since it's a text-based application.

## What Happens

### Backend (Voice Generation)

1. ✅ **Voice audio is generated** via ElevenLabs API when appropriate
2. ✅ **Audio is encoded** as base64 data URL in `voiceConfig.audioUrl`
3. ✅ **Transcription is included** in `voiceConfig.transcription`
4. ✅ **Urgency level is set** based on emotional state

### TUI (Visual Indication + Audio Files)

Since terminals can't play audio directly, the TUI provides:

1. **Voice Icon**: Messages with voice show 🎤 instead of 💬
2. **Urgency Indicators**: Different icons based on emotional urgency:
   - `🎤` - Calm voice message (default)
   - `🎤⚠️` - Concerned voice message
   - `🎤❗` - Urgent voice message (scared, crying)
   - `🎤✨` - Excited voice message (happy, thrilled)
3. **Audio File Path**: Voice messages are saved to temp files with playback instructions
4. **Status Bar Instructions**: Shows how to play the audio file

### Example in TUI

```
💬 Matti: "I need some advice about my savings."

🎤❗ Matti: "I'm so scared! The debt collectors called!"
🎧 Audio saved: /tmp/junction-voice-messages/voice_Matti_1731676543210.mp3

💬 Matti: "Thanks, that helps a bit."

🎤✨ Matti: "You're amazing! Thank you so much!"
🎧 Audio saved: /tmp/junction-voice-messages/voice_Matti_1731676890123.mp3
```

**Status bar shows:**

```
🎧 Voice message received! Play: open "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
```

## Voice Message Triggering

Voice messages appear:

- ✅ **50% chance** on 2nd scenario (character's 2nd visit)
- ✅ **Guaranteed** on 3rd scenario (character's 3rd visit) - only if they didn't get it on 2nd
- ✅ **~10% chance** on other scenarios (1 in 10 messages)
- ✅ **Higher chance** (30%) for highly emotional states if character has `callsWhenEmotional: true`
- ✅ **Adjusted** by character's `prefersVoice` setting

**Note**: Scenario number = visitCount + 1 (first visit is scenario 1, second visit is scenario 2, etc.)

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
{
  response.voiceConfig?.enabled && (
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
      <p className="transcription">{response.voiceConfig.transcription}</p>
    </div>
  );
}
```

## TUI Capabilities & Limitations

**What the TUI CAN do:**

1. ✅ **Generate voice audio** - Creates MP3 files via ElevenLabs API
2. ✅ **Save audio files** - Automatically saves to `/tmp/junction-voice-messages/`
3. ✅ **Show file paths** - Displays playback instructions and file locations
4. ✅ **Visual indicators** - Shows voice icons (🎤) with urgency levels

**What the TUI CANNOT do:**

1. ❌ **Auto-play audio** - Terminals cannot play audio directly
2. ❌ **Inline audio player** - No built-in media player in terminal UI
3. ❌ **Background playback** - Would require external process management

**Workaround:** Copy the file path shown in the TUI and play it with your system's media player (see "Playing Audio Files" section above).

## Playing Audio Files (Implemented!)

The TUI now **automatically saves voice audio files** and shows you how to play them!

### Audio File Location

Voice messages are saved to:

```
/tmp/junction-voice-messages/voice_<CharacterName>_<timestamp>.mp3
```

Example:

```
/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3
```

### How to Play

**Method 1: Use the `open` command (shown in status bar)**

```bash
# Copy the command from status bar and run it
open "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
```

**Method 2: macOS - Default player**

```bash
open "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
# Or use afplay (no GUI)
afplay "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
```

**Method 3: Linux - Media players**

```bash
# VLC
vlc "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"

# mpg123 (terminal)
mpg123 "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"

# xdg-open (default player)
xdg-open "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
```

**Method 4: Windows - Media players**

```bash
# Windows Media Player
start "" "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"

# Or drag and drop the file into a media player
```

**Method 5: Browser**

```
1. Copy the file path
2. Open browser
3. Paste in address bar: file:///tmp/junction-voice-messages/voice_Matti_1731676543210.mp3
```

### Quick Playback Tips

**1. Keep the path handy**: The TUI shows it under each voice message

```
🎤❗ Matti: "I'm so scared!"
🎧 Audio saved: /tmp/junction-voice-messages/voice_Matti_1731676543210.mp3
         ↑ Copy this path
```

**2. Use terminal history**: The status bar command can be copied from terminal scrollback

```
🎧 Voice message received! Play: open "/tmp/junction-voice-messages/voice_Matti_1731676543210.mp3"
                                  ↑ Copy everything from "open" to end
```

**3. Play all voice messages**:

```bash
# List all saved voice files
ls -lt /tmp/junction-voice-messages/

# Play the most recent one
open "$(ls -t /tmp/junction-voice-messages/voice_*.mp3 | head -1)"

# Play all voice messages
for f in /tmp/junction-voice-messages/voice_*.mp3; do afplay "$f"; done
```

## Testing Voice Integration

To test voice in the TUI:

1. Set up ElevenLabs API key in `.env`
2. Run the TUI: `pnpm play`
3. Start a new consultation: press `n`
4. Continue with the **same character** for multiple visits (use `c` to continue with returning client)
5. Look for voice indicators:
   - **First scenario** (1st visit): ~10% chance of 🎤
   - **Second scenario** (2nd visit with same character): **50% chance of 🎤**
   - **Third scenario** (3rd visit with same character): **100% chance of 🎤** (if not received on 2nd)
6. Emotional responses more likely to have 🎤❗ or 🎤⚠️
7. Check console logs for debug output showing voice generation decisions

## Cost Tracking

The voice generation happens on the backend, so API costs apply even though audio isn't played:

- **Free tier**: 10,000 characters/month (ElevenLabs)
- **Average message**: ~50 characters
- **With 10% triggering**: 10 scenarios = ~50 characters total
- **100 scenarios**: ~500 characters total

Monitor usage at: https://elevenlabs.io/app/usage

## Summary

| Feature               | TUI Support | Notes                                            |
| --------------------- | ----------- | ------------------------------------------------ |
| Voice Generation      | ✅ Yes      | Audio is generated via ElevenLabs API            |
| Visual Indicator      | ✅ Yes      | Shows 🎤 with urgency icons                      |
| Audio File Saving     | ✅ Yes      | Auto-saves to `/tmp/junction-voice-messages/`    |
| File Path Display     | ✅ Yes      | Shows path under each voice message              |
| Playback Instructions | ✅ Yes      | Status bar shows `open` command                  |
| Inline Audio Playback | ❌ No       | Terminals can't play audio (use external player) |
| Transcription         | ✅ Yes      | Text is displayed normally                       |
| Urgency Display       | ✅ Yes      | Different icons per urgency level                |

**How to listen:**

1. **TUI users**: Copy the file path and play with `open`, `vlc`, `mpg123`, etc.
2. **Web frontend users**: Full inline audio player with base64 data URLs
