/**
 * Interactive Financial Advisor Simulator
 *
 * Play as a financial advisor - characters will come to you for help!
 */

import readline from "readline";
import { characterPool } from "./mastra/index.ts";
import {
  startNewConsultation,
  handleAdvisorResponse,
  createNewAdvisor,
  getAdvisorSummary,
} from "./mastra/game/orchestrator.ts";
import type { AdvisorState } from "./mastra/types/game-types.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

function print(text: string, color?: string) {
  console.log(`${color || ""}${text}${colors.reset}`);
}

function printBanner() {
  print("\n" + "═".repeat(70), colors.cyan);
  print("   💼 FINANCIAL ADVISOR SIMULATOR 💼", colors.bright + colors.cyan);
  print("═".repeat(70) + "\n", colors.cyan);
  print(
    "You are a financial advisor. AI characters will come to you",
    colors.cyan
  );
  print(
    "with real financial problems. Give them your best advice!\n",
    colors.cyan
  );
}

function printCharacterMessage(
  name: string,
  message: string,
  isVoice: boolean
) {
  print("\n" + "─".repeat(70), colors.blue);
  print(
    `💬 ${name}${isVoice ? " (🔊 voice message)" : ""}:`,
    colors.blue + colors.bright
  );
  print(`   "${message}"`, colors.blue);
  print("─".repeat(70), colors.blue);
}

function printStats(advisorState: AdvisorState) {
  const summary = getAdvisorSummary(advisorState);
  print("\n📊 Your Stats:", colors.yellow);
  print(`   Reputation: ${summary.performance.reputation}`, colors.yellow);
  print(`   Skill Level: ${summary.performance.skillLevel}`, colors.yellow);
  print(`   Sessions: ${summary.progress.totalSessions}`, colors.yellow);
  print(
    `   Clients Helped: ${summary.progress.totalClientsHelped}`,
    colors.yellow
  );
}

function printBossReview(review: any) {
  print("\n" + "═".repeat(70), colors.magenta);
  print("   👔 BOSS REVIEW", colors.magenta + colors.bright);
  print("═".repeat(70), colors.magenta);
  print(`\n📈 Overall Score: ${review.overallScore}/10\n`, colors.green);

  print("✅ Strengths:", colors.green);
  review.strengthsIdentified.forEach((s: string) =>
    print(`   • ${s}`, colors.green)
  );

  print("\n⚠️  Areas for Improvement:", colors.yellow);
  review.areasForImprovement.forEach((a: string) =>
    print(`   • ${a}`, colors.yellow)
  );

  print("\n📚 Learning Materials:", colors.cyan);
  review.learningMaterials.forEach((m: any) => {
    print(`   • ${m.title} - ${m.description}`, colors.cyan);
  });

  print(`\n💬 Boss says:`, colors.magenta);
  print(`   "${review.encouragingMessage}"\n`, colors.magenta);
  print("═".repeat(70) + "\n", colors.magenta);
}

async function askQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${colors.green}💼 You: ${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
}

async function playGame() {
  printBanner();

  print("Initializing character pool...", colors.cyan);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const advisorId = `advisor_${Date.now()}`;
  let advisorState = createNewAdvisor(advisorId);

  print("✅ Character pool loaded!", colors.green);
  printStats(advisorState);

  print("\n\nPress ENTER to start your first consultation...", colors.yellow);
  await askQuestion("");

  let continueGame = true;
  let currentThreadId: string | null = null;
  let conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  while (continueGame) {
    try {
      // Start new consultation
      print("\n🔄 Finding your next client...", colors.cyan);
      const consultation = await startNewConsultation(advisorId, advisorState);

      if (consultation.type === "god_boss_review" && consultation.review) {
        // Boss review!
        printBossReview(consultation.review);
        advisorState = consultation.stateUpdate;
        printStats(advisorState);

        print("\nPress ENTER to continue...", colors.yellow);
        await askQuestion("");
        continue;
      }

      if (
        consultation.type !== "character_message" ||
        !consultation.characterInfo
      ) {
        print("No more characters available right now.", colors.red);
        break;
      }

      // New character appeared
      advisorState = consultation.stateUpdate;
      currentThreadId = consultation.threadId || null;
      conversationHistory = [];

      print("\n\n" + "═".repeat(70), colors.bright);
      print(
        `   ${consultation.isNewThread ? "🆕 NEW CLIENT" : "🔄 RETURNING CLIENT"}`,
        colors.bright + colors.green
      );
      print("═".repeat(70), colors.bright);
      print(`Name: ${consultation.characterInfo.name}`, colors.cyan);
      print(`Age: ${consultation.characterInfo.age}`, colors.cyan);
      print(
        `Occupation: ${consultation.characterInfo.occupation}`,
        colors.cyan
      );

      const initialMessage = consultation.messages?.[0] || "Hello...";
      printCharacterMessage(
        consultation.characterInfo.name,
        initialMessage,
        consultation.voiceNeeded || false
      );

      // Conversation loop
      let conversationActive = true;

      while (conversationActive) {
        const yourAdvice = await askQuestion("");

        if (
          yourAdvice.toLowerCase() === "quit" ||
          yourAdvice.toLowerCase() === "exit"
        ) {
          print("\n👋 Thanks for playing! Goodbye!", colors.yellow);
          continueGame = false;
          conversationActive = false;
          break;
        }

        if (yourAdvice.toLowerCase() === "stats") {
          printStats(advisorState);
          continue;
        }

        if (!yourAdvice.trim()) {
          print("Please type your advice for the client.", colors.yellow);
          continue;
        }

        print("\n⏳ Character is thinking...", colors.cyan);

        // Send advice to character
        const response = await handleAdvisorResponse(
          currentThreadId || "thread_1",
          yourAdvice,
          advisorState,
          conversationHistory
        );

        advisorState = response.stateUpdate;

        // Add to history
        conversationHistory.push({ role: "user", content: yourAdvice });
        if (response.messages && response.messages.length > 0) {
          conversationHistory.push({
            role: "assistant",
            content: response.messages[0],
          });
        }

        // Show character response
        if (response.messages && response.messages.length > 0) {
          printCharacterMessage(
            consultation.characterInfo?.name || "Client",
            response.messages.join("\n\n"),
            response.voiceNeeded || false
          );
        }

        // Check if conversation ended
        if (response.type === "conversation_end") {
          print("\n✅ Client has left the consultation.", colors.green);
          print(
            `📊 Your reputation: ${advisorState.reputation}/100`,
            colors.yellow
          );
          print(
            `🎓 Skill level: ${advisorState.skillLevel.toFixed(1)}/10`,
            colors.yellow
          );

          const poolStats = characterPool.getPoolStats();
          if (poolStats.pendingFollowUps > 0) {
            print(
              `\n📅 ${poolStats.pendingFollowUps} follow-up(s) scheduled for later!`,
              colors.cyan
            );
          }

          print(
            '\n\nPress ENTER for next client (or type "quit" to exit)...',
            colors.yellow
          );
          const next = await askQuestion("");

          if (next.toLowerCase() === "quit" || next.toLowerCase() === "exit") {
            continueGame = false;
          }

          conversationActive = false;
        }
      }
    } catch (error) {
      print(`\n❌ Error: ${error}`, colors.red);
      print("Press ENTER to try again...", colors.yellow);
      await askQuestion("");
    }
  }

  // Game over
  print("\n" + "═".repeat(70), colors.cyan);
  print("   🎉 FINAL STATS", colors.cyan + colors.bright);
  print("═".repeat(70), colors.cyan);
  printStats(advisorState);
  print("\nThanks for being a financial advisor! 👔💼", colors.green);
  print("═".repeat(70) + "\n", colors.cyan);

  rl.close();
  process.exit(0);
}

// Start the game
print("\nStarting Financial Advisor Simulator...\n", colors.cyan);
playGame().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
