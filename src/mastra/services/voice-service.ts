/**
 * Voice Service - ElevenLabs Integration
 *
 * Handles text-to-speech generation for emotional character moments
 * using ElevenLabs API via Mastra
 */

import type { Character, VoiceMessageConfig } from "../types/game-types.ts";

/**
 * ElevenLabs voice mapping for different character personalities
 * Each voice ID represents a different emotional tone/personality
 */
const VOICE_PERSONALITIES = {
  // Calm, professional voices
  calm_professional: "pNInz6obpgDQGcFmaJgB", // Adam - Deep, calm
  calm_friendly: "EXAVITQu4vr4xnSDxMaL", // Bella - Warm, friendly

  // Emotional, expressive voices
  emotional_young: "21m00Tcm4TlvDq8ikWAM", // Rachel - Expressive, emotional
  emotional_concerned: "AZnzlk1XvdvUeBnXmlld", // Domi - Concerned, worried

  // Scared/anxious voices
  scared_anxious: "ErXwobaYiN019PkySvjV", // Antoni - Anxious, nervous
  scared_young: "MF3mGyEYCl7XYWbV9V6O", // Elli - Young, scared

  // Crying/upset voices (using emotional voices with sadder prompts)
  crying_upset: "ThT5KcBeYPX3keUQqHPh", // Dorothy - Can convey sadness
  upset_frustrated: "SOYHLrjzK2X1ezoPC6cr", // Harry - Can sound frustrated

  // Excited/happy voices
  excited_happy: "TX3LPaxmHKxFdv7VOQHJ", // Liam - Energetic, excited
  happy_optimistic: "pqHfZKP75CvOlQylNhV4", // Bill - Upbeat, optimistic
};

/**
 * Emotional states mapped to voice configurations
 */
interface EmotionalVoiceMapping {
  voiceId: string;
  stability: number; // 0-1: Higher = more stable/consistent
  similarityBoost: number; // 0-1: Higher = closer to original voice
  style: number; // 0-1: How much style to apply
}

/**
 * Get appropriate voice based on character and emotional state
 * Uses character's assigned voiceId if available, otherwise falls back to personality-based selection
 */
function getVoiceForEmotion(
  character: Character,
  emotionalState: string,
): EmotionalVoiceMapping {
  // If character has a specific voice assigned, use it with emotion-adjusted settings
  if (character.communicationStyle.voiceId) {
    const lowerEmotion = emotionalState.toLowerCase();

    // Adjust voice parameters based on emotional state
    // Scared/anxious states
    if (
      lowerEmotion.includes("scared") ||
      lowerEmotion.includes("anxious") ||
      lowerEmotion.includes("nervous") ||
      lowerEmotion.includes("worried")
    ) {
      return {
        voiceId: character.communicationStyle.voiceId,
        stability: 0.3, // More variation for anxiety
        similarityBoost: 0.5,
        style: 0.7, // High style for emotional expression
      };
    }

    // Crying/upset states
    if (
      lowerEmotion.includes("crying") ||
      lowerEmotion.includes("sad") ||
      lowerEmotion.includes("upset") ||
      lowerEmotion.includes("devastated") ||
      lowerEmotion.includes("depressed")
    ) {
      return {
        voiceId: character.communicationStyle.voiceId,
        stability: 0.2, // Very emotional, unstable
        similarityBoost: 0.6,
        style: 0.8, // Maximum emotion
      };
    }

    // Frustrated/angry states
    if (
      lowerEmotion.includes("frustrated") ||
      lowerEmotion.includes("angry") ||
      lowerEmotion.includes("annoyed") ||
      lowerEmotion.includes("irritated")
    ) {
      return {
        voiceId: character.communicationStyle.voiceId,
        stability: 0.4,
        similarityBoost: 0.6,
        style: 0.7,
      };
    }

    // Excited/happy states
    if (
      lowerEmotion.includes("excited") ||
      lowerEmotion.includes("happy") ||
      lowerEmotion.includes("thrilled") ||
      lowerEmotion.includes("ecstatic") ||
      lowerEmotion.includes("relieved")
    ) {
      return {
        voiceId: character.communicationStyle.voiceId,
        stability: 0.5,
        similarityBoost: 0.7,
        style: 0.6,
      };
    }

    // Concerned/worried but not panicked
    if (
      lowerEmotion.includes("concerned") ||
      lowerEmotion.includes("uncertain") ||
      lowerEmotion.includes("unsure")
    ) {
      return {
        voiceId: character.communicationStyle.voiceId,
        stability: 0.5,
        similarityBoost: 0.7,
        style: 0.5,
      };
    }

    // Default: Calm or neutral with character's voice
    return {
      voiceId: character.communicationStyle.voiceId,
      stability: 0.7, // More stable for calm states
      similarityBoost: 0.8,
      style: 0.3,
    };
  }

  // FALLBACK: If no voiceId assigned, use old personality-based selection
  const lowerEmotion = emotionalState.toLowerCase();

  // Scared/anxious states
  if (
    lowerEmotion.includes("scared") ||
    lowerEmotion.includes("anxious") ||
    lowerEmotion.includes("nervous") ||
    lowerEmotion.includes("worried")
  ) {
    return {
      voiceId:
        character.age < 25
          ? VOICE_PERSONALITIES.scared_young
          : VOICE_PERSONALITIES.scared_anxious,
      stability: 0.3, // More variation for anxiety
      similarityBoost: 0.5,
      style: 0.7, // High style for emotional expression
    };
  }

  // Crying/upset states
  if (
    lowerEmotion.includes("crying") ||
    lowerEmotion.includes("sad") ||
    lowerEmotion.includes("upset") ||
    lowerEmotion.includes("devastated") ||
    lowerEmotion.includes("depressed")
  ) {
    return {
      voiceId: VOICE_PERSONALITIES.crying_upset,
      stability: 0.2, // Very emotional, unstable
      similarityBoost: 0.6,
      style: 0.8, // Maximum emotion
    };
  }

  // Frustrated/angry states
  if (
    lowerEmotion.includes("frustrated") ||
    lowerEmotion.includes("angry") ||
    lowerEmotion.includes("annoyed") ||
    lowerEmotion.includes("irritated")
  ) {
    return {
      voiceId: VOICE_PERSONALITIES.upset_frustrated,
      stability: 0.4,
      similarityBoost: 0.6,
      style: 0.7,
    };
  }

  // Excited/happy states
  if (
    lowerEmotion.includes("excited") ||
    lowerEmotion.includes("happy") ||
    lowerEmotion.includes("thrilled") ||
    lowerEmotion.includes("ecstatic") ||
    lowerEmotion.includes("relieved")
  ) {
    return {
      voiceId:
        character.personality.emotionality > 0.6
          ? VOICE_PERSONALITIES.excited_happy
          : VOICE_PERSONALITIES.happy_optimistic,
      stability: 0.5,
      similarityBoost: 0.7,
      style: 0.6,
    };
  }

  // Concerned/worried but not panicked
  if (
    lowerEmotion.includes("concerned") ||
    lowerEmotion.includes("uncertain") ||
    lowerEmotion.includes("unsure")
  ) {
    return {
      voiceId: VOICE_PERSONALITIES.emotional_concerned,
      stability: 0.5,
      similarityBoost: 0.7,
      style: 0.5,
    };
  }

  // Default: Calm or neutral
  return {
    voiceId:
      character.personality.emotionality > 0.5
        ? VOICE_PERSONALITIES.calm_friendly
        : VOICE_PERSONALITIES.calm_professional,
    stability: 0.7, // More stable for calm states
    similarityBoost: 0.8,
    style: 0.3,
  };
}

/**
 * Enhance text with expressive ElevenLabs tags based on emotional state and character personality
 * Makes voice messages more fun and expressive
 */
export function enhanceTextWithVoiceTags(
  text: string,
  emotionalState: string,
  personality: Character["personality"],
): string {
  const lowerEmotion = emotionalState.toLowerCase();
  const lowerText = text.toLowerCase();

  let enhancedText = text;

  // Add emotional tags based on state
  // Scared/anxious - add nervous sounds
  if (
    lowerEmotion.includes("scared") ||
    lowerEmotion.includes("anxious") ||
    lowerEmotion.includes("panicked")
  ) {
    // Add nervous gulp/swallow at start
    if (Math.random() < 0.4) {
      enhancedText = `[gulps] ${enhancedText}`;
    }
    // Occasional whispers for anxiety
    if (personality.emotionality > 0.7 && Math.random() < 0.3) {
      enhancedText = enhancedText.replace(/\.$/, "... [whispers] En tiedä mitä tehdä.");
    }
  }

  // Crying/sad - add crying/sighs
  if (
    lowerEmotion.includes("crying") ||
    lowerEmotion.includes("sad") ||
    lowerEmotion.includes("devastated")
  ) {
    // Add crying tag if very emotional
    if (personality.emotionality > 0.6 && Math.random() < 0.5) {
      enhancedText = `[crying] ${enhancedText}`;
    } else if (Math.random() < 0.4) {
      enhancedText = `[sighs] ${enhancedText}`;
    }
  }

  // Frustrated/angry - add sarcastic or exasperated sounds
  if (
    lowerEmotion.includes("frustrated") ||
    lowerEmotion.includes("angry") ||
    lowerEmotion.includes("annoyed")
  ) {
    // Add exhale or sigh
    if (Math.random() < 0.4) {
      enhancedText = `[exhales] ${enhancedText}`;
    }
    // Make sarcastic comments more sarcastic
    if ((lowerText.includes("joo") || lowerText.includes("yeah")) && Math.random() < 0.3) {
      enhancedText = enhancedText.replace(/(joo|yeah)/i, "[sarcastic] $1");
    }
  }

  // Excited/happy - add laughs and excited sounds
  if (
    lowerEmotion.includes("excited") ||
    lowerEmotion.includes("thrilled") ||
    lowerEmotion.includes("ecstatic") ||
    lowerEmotion.includes("relieved")
  ) {
    // Add laughs to happy messages
    if (
      (lowerText.includes("kiitos") || lowerText.includes("thanks") || lowerText.includes("great")) &&
      Math.random() < 0.4
    ) {
      enhancedText = enhancedText.replace(/!/, "! [laughs]");
    }
    // Add excited exclamations
    if (personality.emotionality > 0.6 && Math.random() < 0.3) {
      enhancedText = `[excited] ${enhancedText}`;
    }
  }

  // Curious/questioning - add curious tone
  if (
    (lowerText.includes("?") || lowerText.includes("mitä") || lowerText.includes("miten")) &&
    lowerEmotion.includes("uncertain")
  ) {
    if (Math.random() < 0.3) {
      enhancedText = enhancedText.replace(/^/, "[curious] ");
    }
  }

  // Add occasional mischievous tag for impulsive personalities
  if (
    personality.impulsiveness > 0.7 &&
    (lowerText.includes("ehkä") || lowerText.includes("maybe")) &&
    Math.random() < 0.2
  ) {
    enhancedText = enhancedText.replace(/(ehkä|maybe)/i, "[mischievously] $1");
  }

  return enhancedText;
}

/**
 * Determine if a voice message should be generated based on:
 * - Random chance (1/10 or ~10%)
 * - Character preference for voice messages
 * - Emotional intensity
 * - Scenario count: 50% on scenario 2, guaranteed on scenario 3 if not received on 2
 */
export function shouldGenerateVoiceMessage(
  character: Character,
  emotionalState: string,
  scenarioNumber: number,
): boolean {
  const hasReceivedVoice =
    character.relationshipState.hasReceivedVoiceMessage ?? false;

  console.log(`🎤 Voice check for ${character.name}:`, {
    scenarioNumber,
    emotionalState,
    hasReceivedVoice,
    prefersVoice: character.communicationStyle.prefersVoice,
    callsWhenEmotional: character.communicationStyle.callsWhenEmotional,
  });

  // Scenario 2: 50% chance
  if (scenarioNumber === 2) {
    const shouldGenerate = Math.random() < 0.5;
    console.log(
      `🎲 Scenario 2 voice chance (50%): ${shouldGenerate ? "YES" : "no"}`,
    );
    return shouldGenerate;
  }

  // Scenario 3: Guaranteed if they didn't get it on scenario 2
  if (scenarioNumber === 3 && !hasReceivedVoice) {
    console.log(
      `✅ Guaranteed voice message (scenario 3, no voice on scenario 2)`,
    );
    return true;
  }

  // Check if character prefers voice messages
  const prefersVoice = character.communicationStyle.prefersVoice;
  const callsWhenEmotional = character.communicationStyle.callsWhenEmotional;

  // Higher chance if character calls when emotional
  const lowerEmotion = emotionalState.toLowerCase();
  const isHighlyEmotional =
    lowerEmotion.includes("scared") ||
    lowerEmotion.includes("crying") ||
    lowerEmotion.includes("devastated") ||
    lowerEmotion.includes("panicked") ||
    lowerEmotion.includes("ecstatic");

  if (callsWhenEmotional && isHighlyEmotional) {
    // 30% chance when emotional and prefers voice
    const shouldGenerate = Math.random() < 0.3;
    console.log(
      `🎲 Emotional voice chance (30%): ${shouldGenerate ? "YES" : "no"}`,
    );
    return shouldGenerate;
  }

  // Base random chance: 1/10 (10%)
  const baseChance = 0.1;

  // Adjust by character preference (prefersVoice is 0-1)
  const adjustedChance = baseChance * (1 + prefersVoice);

  const shouldGenerate = Math.random() < adjustedChance;
  console.log(
    `🎲 Random voice chance (${(adjustedChance * 100).toFixed(1)}%): ${shouldGenerate ? "YES" : "no"}`,
  );

  return shouldGenerate;
}

/**
 * Generate voice message using ElevenLabs API
 */
export async function generateVoiceMessage(
  character: Character,
  messageText: string,
  emotionalState: string,
): Promise<VoiceMessageConfig> {
  console.log(`🎙️ Generating voice message for ${character.name}:`, {
    messageLength: messageText.length,
    emotionalState,
  });

  try {
    // Check if ElevenLabs API key is available
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ ELEVENLABS_API_KEY not found, skipping voice generation",
      );
      return {
        enabled: false,
        transcription: messageText,
      };
    }

    console.log("✅ ElevenLabs API key found, generating voice...");

    // Enhance text with expressive voice tags
    const enhancedText = enhanceTextWithVoiceTags(
      messageText,
      emotionalState,
      character.personality,
    );

    console.log(`🎨 Enhanced text with voice tags:`, {
      original: messageText,
      enhanced: enhancedText,
    });

    // Get appropriate voice for emotion
    const voiceConfig = getVoiceForEmotion(character, emotionalState);

    // Import ElevenLabs client
    const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");

    const client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Generate speech using ElevenLabs streaming API with enhanced text
    const audio = await client.textToSpeech.convert(voiceConfig.voiceId, {
      text: enhancedText,
      modelId: "eleven_multilingual_v2", // Supports Finnish and English
      voiceSettings: {
        stability: voiceConfig.stability,
        similarityBoost: voiceConfig.similarityBoost,
        style: voiceConfig.style,
      },
    });

    // Convert audio stream to base64 data URL
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    // Concatenate all chunks
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = audioBuffer.toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Determine urgency from emotional state
    let urgency: "calm" | "concerned" | "urgent" | "excited" = "calm";
    const lowerEmotion = emotionalState.toLowerCase();

    if (
      lowerEmotion.includes("scared") ||
      lowerEmotion.includes("crying") ||
      lowerEmotion.includes("panicked")
    ) {
      urgency = "urgent";
    } else if (
      lowerEmotion.includes("worried") ||
      lowerEmotion.includes("concerned") ||
      lowerEmotion.includes("anxious")
    ) {
      urgency = "concerned";
    } else if (
      lowerEmotion.includes("excited") ||
      lowerEmotion.includes("thrilled") ||
      lowerEmotion.includes("ecstatic")
    ) {
      urgency = "excited";
    }

    console.log(`✅ Voice message generated successfully:`, {
      audioSize: audioBuffer.length,
      urgency,
      voiceId: voiceConfig.voiceId,
    });

    return {
      enabled: true,
      transcription: messageText,
      audioUrl: audioUrl,
      urgency: urgency,
    };
  } catch (error) {
    console.error("❌ Failed to generate voice message:", error);
    // Fallback to text-only
    return {
      enabled: false,
      transcription: messageText,
    };
  }
}

/**
 * Helper to determine emotional state from character personality and scenario
 */
export function inferEmotionalStateFromContext(
  character: Character,
  scenarioEmotionalState: string,
): string {
  // If character is highly emotional, amplify the emotional state
  if (character.personality.emotionality > 0.7) {
    if (scenarioEmotionalState.toLowerCase().includes("stressed")) {
      return "very stressed and anxious";
    }
    if (scenarioEmotionalState.toLowerCase().includes("worried")) {
      return "extremely worried";
    }
  }

  // Otherwise use scenario's emotional state as-is
  return scenarioEmotionalState;
}
