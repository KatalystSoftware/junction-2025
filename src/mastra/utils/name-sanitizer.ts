/**
 * AI-Powered Name Sanitizer
 * Uses AI to detect and clean inappropriate or abusive player names
 */

import { generateText } from "ai";
import { getAgentModel } from "../agents/agent-model.ts";

const FALLBACK_NAME = "Player";

/**
 * Sanitize a player name using AI to detect inappropriate content
 * Returns a clean name or a fallback if the name is inappropriate
 */
export async function sanitizePlayerName(rawName: string): Promise<string> {
  // Basic checks first
  if (!rawName || rawName.trim().length === 0) {
    return FALLBACK_NAME;
  }

  const trimmedName = rawName.trim();

  // Length checks
  if (trimmedName.length > 50) {
    return trimmedName.substring(0, 50);
  }

  if (trimmedName.length < 2) {
    return FALLBACK_NAME;
  }

  // Check for obvious patterns
  if (/^[0-9]+$/.test(trimmedName)) {
    return FALLBACK_NAME; // All numbers
  }

  // Use AI to detect inappropriate content
  try {
    const result = await generateText({
      model: getAgentModel(),
      prompt: `You are a content moderation system. Analyze the following player name and determine if it's appropriate for a financial education game.

Player name: "${trimmedName}"

Check for:
- Profanity or vulgar language
- Offensive slurs or hate speech
- Sexual content
- References to violence or illegal activities
- Impersonation of officials or brands
- Spam or gibberish
- Attempts to inject code or special characters maliciously

Respond with ONLY one of these:
- "APPROVED" if the name is appropriate
- "REJECTED" if the name is inappropriate

Response:`,
      temperature: 0.1, // Low temperature for consistency
      maxTokens: 10,
    });

    const decision = result.text.trim().toUpperCase();

    if (decision.includes("REJECTED")) {
      console.log(`🚫 Name rejected by AI: "${trimmedName}"`);
      return FALLBACK_NAME;
    }

    console.log(`✅ Name approved: "${trimmedName}"`);
    return trimmedName;
  } catch (error) {
    console.error("Name sanitization failed:", error);
    // On error, apply basic sanitization
    return basicSanitize(trimmedName);
  }
}

/**
 * Basic fallback sanitization without AI
 */
function basicSanitize(name: string): string {
  // Remove special characters but keep spaces, letters, numbers, and basic punctuation
  const cleaned = name.replace(/[^\w\s\-_.]/g, "");

  if (cleaned.length < 2) {
    return FALLBACK_NAME;
  }

  return cleaned.substring(0, 50);
}
