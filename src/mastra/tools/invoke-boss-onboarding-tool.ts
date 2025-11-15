/**
 * Invoke Boss Onboarding Tool
 *
 * Generates a welcome message from the boss for new advisors.
 * Creates context and sets expectations for the game.
 */

import { createBossOnboardingAgent } from "../agents/boss-onboarding-agent.ts";
import { cachedGenerate } from "../test-cache.ts";
import type { BossOnboardingMessage } from "../types/game-types.ts";

export const invokeBossOnboardingTool = {
  id: "invokeBossOnboardingTool",
  description:
    "Generates a welcoming onboarding message from the boss for new advisors.",
  execute: async (context: {
    language?: "finnish" | "english";
  }): Promise<BossOnboardingMessage> => {
    try {
      const { language = "english" } = context;

      // Create onboarding agent with specified language
      const bossOnboardingAgent = createBossOnboardingAgent(language);

      const prompt = `
Generate a warm, welcoming onboarding message for a new financial advisor joining the team.
This is their first day, and you want to:
1. Make them feel welcomed
2. Explain their role clearly
3. Set expectations
4. Build their confidence
5. Get them excited to start

Create a comprehensive onboarding message following your instructions.
`;

      // Invoke onboarding agent
      const response = await cachedGenerate(
        "agent",
        `bossOnboarding_${language}`,
        prompt,
        () => bossOnboardingAgent.generate(prompt),
      );

      const text = response.text || "";

      // Parse JSON response
      let parsed: BossOnboardingMessage;
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          "⚠️ Failed to parse boss onboarding JSON, using fallback:",
          parseError,
        );

        // Fallback message based on language
        if (language === "finnish") {
          parsed = {
            welcomeTitle: "Tervetuloa tiimiin!",
            introduction: "Hei! Olen Mika, seniorineuvoja. Tervetuloa mukaan!",
            roleExplanation:
              "Olet nyt osa talouskonsulttitiimiämme. Tehtäväsi on auttaa asiakkaita heidän talousasioissaan.",
            howItWorks:
              "Tapaat erilaisia asiakkaita. Kuuntele heitä ja anna neuvoja heidän tilanteeseensa.",
            expectations:
              "Tarkistan työsi laatua säännöllisesti ja annan palautetta.",
            encouragement:
              "Älä huoli, jos et tiedä kaikkea - opimme tekemällä. Olen täällä tukemassa!",
            readyMessage: "Ensimmäinen asiakas odottaa. Onnea! 🚀",
          };
        } else {
          parsed = {
            welcomeTitle: "Welcome to the Team!",
            introduction:
              "Hey! I'm your senior advisor. Welcome aboard!",
            roleExplanation:
              "You're now part of our financial consulting team. Your job is to help clients with their finances.",
            howItWorks:
              "You'll meet different clients. Listen carefully and give personalized advice.",
            expectations:
              "I'll check in regularly and provide feedback on your work.",
            encouragement:
              "Don't worry if you don't know everything - we learn by doing. I'm here to help!",
            readyMessage: "Your first client is waiting. Good luck! 🚀",
          };
        }
      }

      return {
        welcomeTitle: parsed.welcomeTitle || "Welcome!",
        introduction: parsed.introduction || "Welcome to the team!",
        roleExplanation:
          parsed.roleExplanation || "You're a financial advisor.",
        howItWorks: parsed.howItWorks || "You'll help clients.",
        expectations: parsed.expectations || "I'll provide feedback.",
        encouragement: parsed.encouragement || "You've got this!",
        readyMessage: parsed.readyMessage || "Let's get started! 🚀",
      };
    } catch (error) {
      console.error("❌ Error generating boss onboarding message:", error);

      // Return fallback English message
      return {
        welcomeTitle: "Welcome to the Team!",
        introduction: "Hey! I'm your senior advisor. Welcome!",
        roleExplanation: "You'll be helping clients with their finances.",
        howItWorks: "Listen to clients and provide personalized advice.",
        expectations: "I'll check in and give you feedback regularly.",
        encouragement: "Don't worry - you'll learn as you go!",
        readyMessage: "Your first client is ready. Good luck! 🚀",
      };
    }
  },
};
