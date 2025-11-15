/**
 * Invoke Character Tool
 *
 * Dynamically creates and invokes a character agent based on
 * character and scenario definitions.
 */

import { createCharacterAgent } from "../agents/character-agent-factory.ts";
import type {
  Character,
  Scenario,
  CharacterResponse,
  CharacterConversationMemory,
  VoiceMessageConfig,
} from "../types/game-types.ts";
import { cachedGenerate } from "../test-cache.ts";
import {
  shouldGenerateVoiceMessage,
  generateVoiceMessage,
  inferEmotionalStateFromContext,
} from "../services/voice-service.ts";

export const invokeCharacterTool = {
  id: "invokeCharacterTool",
  description:
    "Invokes a character agent to respond to the advisor's message. Creates a dynamic agent with the character's personality and scenario context.",
  execute: async (context: {
    character: Character;
    scenario: Scenario;
    advisorMessage: string;
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    characterMemory?: CharacterConversationMemory[];
    userLanguage?: string;
  }) => {
    try {
      const {
        character,
        scenario,
        advisorMessage,
        conversationHistory,
        characterMemory,
        userLanguage = "en",
      } = context;

      // Create character agent dynamically with memory and advisor message for language detection
      const characterAgent = await createCharacterAgent(
        character,
        scenario,
        characterMemory,
        advisorMessage,
      );

      // Build conversation history for context
      let prompt = `The advisor has responded to your initial message:\n\n"${advisorMessage}"\n\nRespond in character.`;

      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map(
            (msg) =>
              `${msg.role === "user" ? "Advisor" : "You"}: ${msg.content}`,
          )
          .join("\n");
        prompt = `Conversation so far:\n${historyText}\n\nAdvisor's latest message: "${advisorMessage}"\n\nRespond in character.`;
      }

      // Invoke character agent (cachedGenerate already includes retry logic via runAgentOperation)
      const response = await cachedGenerate(
        "agent",
        `character_${character.characterId}`,
        prompt,
        () => characterAgent.generate(prompt),
      );

      const text = response.text || "";

      // Try to parse JSON from response
      let parsed: CharacterResponse;
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          "⚠️ Failed to parse character response JSON, using fallback:",
          parseError,
        );

        // Fallback: treat entire response as a single message
        parsed = {
          messages: [text],
          emotionalState: "uncertain",
          conversationEnding: false,
        };
      }

      // Determine emotional state (from parsed response or scenario)
      const emotionalState =
        parsed.emotionalState ||
        inferEmotionalStateFromContext(
          character,
          scenario.problemContext.emotionalState,
        );

      // Determine scenario number (visitCount + 1, since first visit is visitCount=0)
      const scenarioNumber = (character.relationshipState.visitCount ?? 0) + 1;

      // Check if we should generate a voice message
      const shouldGenerateVoice = shouldGenerateVoiceMessage(
        character,
        emotionalState,
        scenarioNumber,
      );

      // Generate voice message if needed
      let voiceConfig: VoiceMessageConfig | undefined;
      if (
        shouldGenerateVoice &&
        parsed.messages &&
        parsed.messages.length > 0
      ) {
        // Generate voice for the first message (usually the most emotional one)
        const messageForVoice = parsed.messages[0];
        voiceConfig = await generateVoiceMessage(
          character,
          messageForVoice,
          emotionalState,
        );

        // Mark that this character has received a voice message
        if (voiceConfig?.enabled) {
          character.relationshipState.hasReceivedVoiceMessage = true;
        }
      }

      // Translate messages if user language is not English
      let finalMessages = parsed.messages || [text];
      if (userLanguage !== "en") {
        const languageNames: Record<string, string> = {
          fi: "Finnish",
          sv: "Swedish",
        };
        const targetLanguage = languageNames[userLanguage] || "English";

        finalMessages = await Promise.all(
          finalMessages.map(async (message: string) => {
            try {
              const translationPrompt = `Translate the following text to ${targetLanguage}. Keep the same tone, emotion, and formality. Only return the translated text, nothing else:\n\n${message}`;
              const translationResponse = await cachedGenerate(
                "translation",
                `${character.characterId}_${userLanguage}_${message.substring(0, 50)}`,
                translationPrompt,
                async () => {
                  const { Model } = await import("@mastra/core");
                  const model = new Model({
                    provider: "GOOGLE",
                    name: "gemini-2.0-flash-exp",
                    toolChoice: "auto",
                  });
                  return await model.generate(translationPrompt);
                }
              );
              return translationResponse.text || message;
            } catch (error) {
              console.error("Translation failed, using original:", error);
              return message;
            }
          })
        );
      }

      return {
        messages: finalMessages,
        emotionalState,
        conversationEnding: parsed.conversationEnding || false,
        voiceNeeded: shouldGenerateVoice && voiceConfig?.enabled,
        voiceConfig: voiceConfig,
        adviceQualityFeedback: parsed.adviceQualityFeedback,
      };
    } catch (error) {
      console.error("❌ Error invoking character agent:", error);

      if (
        process.env.TEST_CACHE_MODE === "record" ||
        process.env.TEST_CACHE_MODE === "replay"
      ) {
        throw error;
      }

      // Return friendly fallback in English
      return {
        messages: [
          "Thanks for the advice! I'll think about this and get back to you.",
        ],
        emotionalState: "thoughtful",
        conversationEnding: true,
        adviceQualityFeedback: {
          score: 5,
          reasoning: "Error occurred, defaulting to neutral score",
        },
      };
    }
  },
};
