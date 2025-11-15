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
  getActiveThreads,
  switchThread,
} from "./mastra/game/orchestrator.ts";
import type {
  AdvisorState,
  ConversationThread,
} from "./mastra/types/game-types.ts";

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
    colors.cyan,
  );
  print(
    "with real financial problems. Give them your best advice!\n",
    colors.cyan,
  );
}

function printCharacterMessage(
  name: string,
  message: string,
  isVoice: boolean,
) {
  print("\n" + "─".repeat(70), colors.blue);
  print(
    `💬 ${name}${isVoice ? " (🔊 voice message)" : ""}:`,
    colors.blue + colors.bright,
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
    colors.yellow,
  );
}

function printActiveThreads(
  threads: ConversationThread[],
  currentThreadId: string | null,
) {
  if (threads.length === 0) {
    return;
  }

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  print("\n" + "┌" + "─".repeat(68) + "┐", colors.cyan);
  print(
    `│ ACTIVE THREADS${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}${" ".repeat(68 - 15 - (totalUnread > 0 ? ` (${totalUnread} unread)`.length : 0))}│`,
    colors.cyan,
  );

  threads.forEach((thread, index) => {
    const isCurrent = thread.threadId === currentThreadId;
    const unreadText =
      thread.unreadCount > 0
        ? ` - ${thread.unreadCount} unread`
        : " - 0 unread";
    const currentIndicator = isCurrent ? " (CURRENT)" : "";
    const line = `│ [${index + 1}] 💬 ${thread.characterName}${unreadText}${currentIndicator}`;
    const padding = " ".repeat(Math.max(0, 70 - line.length));
    print(
      line + padding + "│",
      isCurrent ? colors.green + colors.bright : colors.cyan,
    );
  });

  print("└" + "─".repeat(68) + "┘", colors.cyan);
}

function printThreadCommands() {
  print("\nCommands:", colors.yellow);
  print("  • Type your response to current client", colors.yellow);
  print("  • 's1', 's2', etc. - Switch to thread 1, 2, etc.", colors.yellow);
  print("  • 'threads' or 't' - List all active threads", colors.yellow);
  print("  • 'new' or 'n' - Start new consultation", colors.yellow);
  print("  • 'stats' - View your stats", colors.yellow);
  print("  • 'quit' or 'exit' - Exit game", colors.yellow);
}

function printBossReview(review: any) {
  print("\n" + "═".repeat(70), colors.magenta);
  print("   👔 BOSS REVIEW", colors.magenta + colors.bright);
  print("═".repeat(70), colors.magenta);
  print(`\n📈 Overall Score: ${review.overallScore}/10\n`, colors.green);

  print("✅ Strengths:", colors.green);
  review.strengthsIdentified.forEach((s: string) =>
    print(`   • ${s}`, colors.green),
  );

  print("\n⚠️  Areas for Improvement:", colors.yellow);
  review.areasForImprovement.forEach((a: string) =>
    print(`   • ${a}`, colors.yellow),
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

  // Store conversation history per thread
  const threadHistories = new Map<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >();

  // Store character info per thread
  const threadCharacterInfo = new Map<
    string,
    { name: string; age: number; occupation: string }
  >();

  while (continueGame) {
    try {
      const activeThreads = getActiveThreads(advisorState);

      // Show active threads if any
      if (activeThreads.length > 0) {
        printActiveThreads(activeThreads, currentThreadId);
      }

      // If we have a current thread, show it
      if (currentThreadId && advisorState.activeThreads[currentThreadId]) {
        const currentThread = activeThreads.find(
          (t) => t.threadId === currentThreadId,
        );
        if (currentThread) {
          print(
            `\n💬 Current client: ${currentThread.characterName}`,
            colors.green + colors.bright,
          );
        }
      }

      // Show commands if there are active threads
      if (activeThreads.length > 0 || currentThreadId) {
        printThreadCommands();
      }

      const userInput = await askQuestion("");

      // Handle quit
      if (
        userInput.toLowerCase() === "quit" ||
        userInput.toLowerCase() === "exit"
      ) {
        print("\n👋 Thanks for playing! Goodbye!", colors.yellow);
        continueGame = false;
        break;
      }

      // Handle stats
      if (userInput.toLowerCase() === "stats") {
        printStats(advisorState);
        continue;
      }

      // Handle thread list
      if (
        userInput.toLowerCase() === "threads" ||
        userInput.toLowerCase() === "t"
      ) {
        if (activeThreads.length === 0) {
          print(
            "\nNo active threads. Type 'new' or 'n' to start a consultation.",
            colors.yellow,
          );
        }
        continue;
      }

      // Handle new consultation
      if (
        userInput.toLowerCase() === "new" ||
        userInput.toLowerCase() === "n"
      ) {
        print("\n🔄 Finding your next client...", colors.cyan);
        const consultation = await startNewConsultation(
          advisorId,
          advisorState,
        );

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
          continue;
        }

        // New character appeared
        advisorState = consultation.stateUpdate;
        const newThreadId = consultation.threadId || `thread_${Date.now()}`;
        currentThreadId = newThreadId;

        // Initialize conversation history for this thread
        threadHistories.set(newThreadId, []);
        threadCharacterInfo.set(newThreadId, consultation.characterInfo);

        print("\n\n" + "═".repeat(70), colors.bright);
        print(
          `   ${consultation.isNewThread ? "🆕 NEW CLIENT" : "🔄 RETURNING CLIENT"}`,
          colors.bright + colors.green,
        );
        print("═".repeat(70), colors.bright);
        print(`Name: ${consultation.characterInfo.name}`, colors.cyan);
        print(`Age: ${consultation.characterInfo.age}`, colors.cyan);
        print(
          `Occupation: ${consultation.characterInfo.occupation}`,
          colors.cyan,
        );

        const initialMessage = consultation.messages?.[0] || "Hello...";
        printCharacterMessage(
          consultation.characterInfo.name,
          initialMessage,
          consultation.voiceNeeded || false,
        );

        continue;
      }

      // Handle thread switching (s1, s2, etc.)
      const switchMatch = userInput.match(/^s(\d+)$/i);
      if (switchMatch) {
        const threadIndex = parseInt(switchMatch[1]) - 1;
        if (threadIndex >= 0 && threadIndex < activeThreads.length) {
          const targetThread = activeThreads[threadIndex];
          currentThreadId = targetThread.threadId;

          print(
            `\n🔄 Switched to thread with ${targetThread.characterName}`,
            colors.green,
          );

          // Show thread info
          const charInfo = threadCharacterInfo.get(currentThreadId);
          if (charInfo) {
            print("\n" + "═".repeat(70), colors.bright);
            print(`Name: ${charInfo.name}`, colors.cyan);
            print(`Age: ${charInfo.age}`, colors.cyan);
            print(`Occupation: ${charInfo.occupation}`, colors.cyan);
            print("═".repeat(70), colors.bright);
          }

          // Show recent messages from history
          const history = threadHistories.get(currentThreadId) || [];
          if (history.length > 0) {
            const lastExchange = history.slice(-2);
            lastExchange.forEach((msg) => {
              if (msg.role === "assistant") {
                printCharacterMessage(
                  targetThread.characterName,
                  msg.content,
                  false,
                );
              }
            });
          }

          continue;
        } else {
          print(
            `\n❌ Invalid thread number. Use s1-s${activeThreads.length}`,
            colors.red,
          );
          continue;
        }
      }

      // Handle advisor response to current thread
      if (!currentThreadId) {
        print(
          "\nNo active thread. Type 'new' or 'n' to start a consultation.",
          colors.yellow,
        );
        continue;
      }

      if (!userInput.trim()) {
        print("Please type your advice for the client.", colors.yellow);
        continue;
      }

      const currentThread = activeThreads.find(
        (t) => t.threadId === currentThreadId,
      );
      if (!currentThread) {
        print(
          "\n❌ Current thread not found. Please switch to another thread or start a new one.",
          colors.red,
        );
        currentThreadId = null;
        continue;
      }

      print("\n⏳ Character is thinking...", colors.cyan);

      // Send advice to character
      const history = threadHistories.get(currentThreadId) || [];
      const response = await handleAdvisorResponse(
        currentThreadId,
        userInput,
        advisorState,
        history,
      );

      advisorState = response.stateUpdate;

      // Add to thread history
      history.push({ role: "user", content: userInput });
      if (response.messages && response.messages.length > 0) {
        history.push({
          role: "assistant",
          content: response.messages[0],
        });
      }
      threadHistories.set(currentThreadId, history);

      // Show character response
      if (response.messages && response.messages.length > 0) {
        const charInfo = threadCharacterInfo.get(currentThreadId);
        printCharacterMessage(
          charInfo?.name || currentThread.characterName,
          response.messages.join("\n\n"),
          response.voiceNeeded || false,
        );
      }

      // Check if conversation ended
      if (response.type === "conversation_end") {
        print("\n✅ Client has left the consultation.", colors.green);
        print(
          `📊 Your reputation: ${advisorState.reputation}/100`,
          colors.yellow,
        );
        print(
          `🎓 Skill level: ${advisorState.skillLevel.toFixed(1)}/10`,
          colors.yellow,
        );

        const poolStats = characterPool.getPoolStats();
        if (poolStats.pendingFollowUps > 0) {
          print(
            `\n📅 ${poolStats.pendingFollowUps} follow-up(s) scheduled for later!`,
            colors.cyan,
          );
        }

        // Clear current thread
        threadHistories.delete(currentThreadId);
        threadCharacterInfo.delete(currentThreadId);

        // Switch to another active thread if available
        const remainingThreads = getActiveThreads(advisorState);
        if (remainingThreads.length > 0) {
          currentThreadId = remainingThreads[0].threadId;
          print(
            `\n🔄 Switched to thread with ${remainingThreads[0].characterName}`,
            colors.green,
          );
        } else {
          currentThreadId = null;
          print(
            "\n\nNo more active threads. Type 'new' or 'n' to start a new consultation.",
            colors.yellow,
          );
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
