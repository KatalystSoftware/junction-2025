/**
 * Speech-to-Text Service - Google Gemini Integration
 *
 * Handles audio transcription using Gemini's native audio input capabilities.
 * Gemini 2.0 Flash and later models can process audio directly.
 */

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getAgentModel } from "../agents/agent-model.ts";

/**
 * Supported audio formats for Gemini
 */
export type AudioFormat = "audio/wav" | "audio/mp3" | "audio/mpeg" | "audio/webm" | "audio/ogg";

/**
 * Result from transcribing audio
 */
export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
}

/**
 * Transcribe audio using Gemini's native audio input
 *
 * @param audioBuffer - The audio data as a Buffer
 * @param mimeType - The MIME type of the audio (e.g., "audio/wav", "audio/webm")
 * @param options - Optional parameters like language hint
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: AudioFormat = "audio/webm",
  options?: {
    language?: string; // Language hint (e.g., "fi" for Finnish, "en" for English)
    prompt?: string; // Additional context for transcription
  }
): Promise<TranscriptionResult> {
  try {
    // Convert buffer to base64 for Gemini API
    const base64Audio = audioBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Audio}`;

    // Prepare the transcription prompt
    const languageHint = options?.language
      ? `The audio is in ${options.language === "fi" ? "Finnish" : options.language === "sv" ? "Swedish" : "English"}.`
      : "";

    const contextPrompt = options?.prompt
      ? `Context: ${options.prompt}\n\n`
      : "";

    const transcriptionPrompt = `${contextPrompt}${languageHint}

Please transcribe the following audio accurately. Return ONLY the transcribed text, nothing else.`;

    // Use configured Gemini model for transcription (supports audio input)
    const result = await generateText({
      model: google(getAgentModel()),
      prompt: transcriptionPrompt,
      experimental_attachments: [
        {
          name: "audio",
          contentType: mimeType,
          url: dataUrl,
        },
      ],
      temperature: 0.1, // Low temperature for accurate transcription
      maxTokens: 500, // Reasonable limit for speech transcription
    });

    const transcribedText = result.text.trim();

    return {
      text: transcribedText,
      language: options?.language,
      confidence: 1.0, // Gemini doesn't provide confidence scores
    };
  } catch (error) {
    console.error("Error transcribing audio with Gemini:", error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Transcribe audio with automatic language detection
 * Useful when you don't know the language of the audio
 */
export async function transcribeAudioWithLanguageDetection(
  audioBuffer: Buffer,
  mimeType: AudioFormat = "audio/webm"
): Promise<TranscriptionResult> {
  try {
    const base64Audio = audioBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Audio}`;

    const result = await generateText({
      model: google(getAgentModel()),
      prompt: `Please transcribe the following audio. First detect the language, then provide the transcription.

Format your response as:
Language: [detected language]
Transcription: [transcribed text]`,
      experimental_attachments: [
        {
          name: "audio",
          contentType: mimeType,
          url: dataUrl,
        },
      ],
      temperature: 0.1,
      maxTokens: 500,
    });

    // Parse the response to extract language and transcription
    const responseText = result.text.trim();
    const languageMatch = responseText.match(/Language:\s*(\w+)/i);
    const transcriptionMatch = responseText.match(/Transcription:\s*(.+)/is);

    const detectedLanguage = languageMatch ? languageMatch[1].toLowerCase() : undefined;
    const transcription = transcriptionMatch ? transcriptionMatch[1].trim() : responseText;

    return {
      text: transcription,
      language: detectedLanguage,
      confidence: 1.0,
    };
  } catch (error) {
    console.error("Error transcribing audio with language detection:", error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
