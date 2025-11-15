/**
 * Invoke Boss Check-in Tool
 *
 * Generates dynamic boss check-in messages based on performance streaks.
 */

import { createBossCheckinAgent } from "../agents/boss-checkin-agent.ts";
import { cachedGenerate } from "../test-cache.ts";
import type { BossCheckinMessage, ConsultationSession } from "../types/game-types.ts";

export const invokeBossCheckinTool = {
  id: "invokeBossCheckinTool",
  description:
    "Generates a proactive boss check-in message based on performance streak.",
  execute: async (context: {
    streak: number; // Positive for good streak, negative for bad streak
    recentSessions: ConsultationSession[];
    advisorReputation: number;
    advisorSkillLevel: number;
  }): Promise<BossCheckinMessage> => {
    try {
      const { streak, recentSessions, advisorReputation, advisorSkillLevel } = context;

      // Collect advisor messages for language detection
      const advisorMessages = recentSessions.flatMap(
        (session) => session.playerAdvice,
      );

      // Create check-in agent with detected language
      const checkinAgent = createBossCheckinAgent(advisorMessages);

      // Determine check-in type
      const isPositiveStreak = streak >= 2;
      const isNegativeStreak = streak <= -2;
      const streakType = isPositiveStreak ? "positive" : "negative";
      const streakLength = Math.abs(streak);

      // Build prompt
      const sessionSummaries = recentSessions
        .slice(-3)
        .map((session, idx) => {
          return `
Session ${idx + 1}:
- Character: ${session.characterName}
- Topics: ${session.topicsCovered.join(", ")}
- Quality Score: ${session.adviceQualityScore}/10
`;
        })
        .join("\n");

      const prompt = `
Generate a ${streakType} check-in message for an advisor who has had ${streakLength} consecutive ${isPositiveStreak ? "good" : "challenging"} sessions.

RECENT PERFORMANCE:
${sessionSummaries}

ADVISOR CONTEXT:
- Current Reputation: ${advisorReputation}/100
- Current Skill Level: ${advisorSkillLevel}/10
- Performance Streak: ${streak} (${isPositiveStreak ? "doing great!" : "struggling"})

${isPositiveStreak
  ? "This advisor has been doing excellent work! Acknowledge their progress, celebrate their wins, and encourage them to keep it up."
  : "This advisor is having a tough time. Show empathy, normalize the struggle, offer support, and remind them that learning takes time."}

Generate a warm, authentic check-in message following your instructions.
`;

      // Invoke check-in agent
      const response = await cachedGenerate(
        "agent",
        `bossCheckin_${streakType}_${streakLength}`,
        prompt,
        () => checkinAgent.generate(prompt),
      );

      const text = response.text || "";

      // Parse JSON response
      let parsed: BossCheckinMessage;
      try {
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          "⚠️ Failed to parse boss check-in JSON, using fallback:",
          parseError,
        );

        // Fallback message
        if (isPositiveStreak) {
          parsed = {
            greeting: "Hey! Got a minute?",
            observation: "I've noticed you've been doing great work lately!",
            mainMessage: "Your last few consultations have been really strong. Clients are responding well to your advice.",
            advice: "Keep up that empathetic approach - it's working!",
            closing: "Proud of your progress. Keep it up!",
          };
        } else {
          parsed = {
            greeting: "Hey, how are you doing?",
            observation: "I noticed the last few clients have been challenging.",
            mainMessage: "Don't be too hard on yourself - these are tough situations. Every advisor goes through this.",
            advice: "Try asking more clarifying questions before giving advice. It helps you understand their situation better.",
            closing: "You're doing fine. Keep learning, and don't hesitate to ask for help!",
          };
        }
      }

      return {
        greeting: parsed.greeting || "Hey!",
        observation: parsed.observation || "I've been watching your work.",
        mainMessage: parsed.mainMessage || "You're doing great!",
        advice: parsed.advice || "Keep it up!",
        closing: parsed.closing || "I'm here if you need me!",
      };
    } catch (error) {
      console.error("❌ Error generating boss check-in message:", error);

      // Return fallback message
      return {
        greeting: "Hey!",
        observation: "I wanted to check in with you.",
        mainMessage: "How are things going?",
        advice: "Remember, I'm here to support you.",
        closing: "Keep doing your best!",
      };
    }
  },
};
