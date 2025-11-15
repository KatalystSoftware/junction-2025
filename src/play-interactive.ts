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
  handleAdviceChoice,
  createNewAdvisor,
  getAdvisorSummary,
  getActiveThreads,
  switchThread,
} from "./mastra/game/orchestrator.ts";
import type {
  AdvisorState,
  ConversationThread,
  AdviceChoice,
} from "./mastra/types/game-types.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
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

  print("\n" + "═".repeat(70), colors.bright + colors.cyan);
  print("📊 ADVISOR DASHBOARD", colors.bright + colors.cyan);
  print("═".repeat(70), colors.bright + colors.cyan);

  // Career & Performance
  const tierNames = [
    "",
    "Junior Advisor",
    "Associate Advisor",
    "Senior Advisor",
    "Specialist",
    "Expert",
  ];
  const tierName = tierNames[advisorState.careerTier] || "Advisor";
  print(
    `\n🎖️  Career: ${tierName} (Tier ${advisorState.careerTier}/5)`,
    colors.bright + colors.yellow,
  );
  print(`📊 Reputation: ${summary.performance.reputation}/100`, colors.yellow);
  print(`🎓 Skill Level: ${summary.performance.skillLevel}/10`, colors.yellow);

  // Earnings & Impact
  print(`\n💰 EARNINGS & IMPACT`, colors.bright + colors.green);
  print(`   Coins: ${advisorState.advisorCoins} 💎`, colors.cyan);
  print(
    `   Lifetime Savings Generated: ${advisorState.lifetimeSavingsGenerated}€`,
    colors.green,
  );
  print(
    `   Lifetime Debt Cleared: ${advisorState.lifetimeDebtCleared}€`,
    colors.green,
  );

  // Progress
  print(`\n📈 PROGRESS`, colors.bright + colors.green);
  print(`   Sessions: ${summary.progress.totalSessions}`, colors.cyan);
  print(
    `   Clients Helped: ${summary.progress.totalClientsHelped}`,
    colors.cyan,
  );

  // Show relationships summary
  const relationships = characterPool.getCharacterRelationships(
    advisorState.advisorId,
  );
  if (relationships.length > 0) {
    print(`   Characters Met: ${relationships.length}`, colors.yellow);
  }

  // Current Goal
  if (advisorState.currentGoal) {
    const goal = advisorState.currentGoal;
    print(
      `\n🎯 CURRENT GOAL (${goal.sessionsRemaining} sessions left)`,
      colors.bright + colors.yellow,
    );
    print(`   ${goal.description}`, colors.cyan);
    const progress = Math.min(
      100,
      Math.round((goal.progress / goal.target) * 100),
    );
    const progressBar =
      "█".repeat(Math.floor(progress / 5)) +
      "░".repeat(20 - Math.floor(progress / 5));
    print(`   Progress: ${progressBar} ${progress}%`, colors.yellow);
    print(`   ${goal.progress}/${goal.target}`, colors.cyan);
    print(
      `   Reward: +${goal.coinReward} coins, +${goal.skillBonus} skill`,
      colors.green,
    );
  }

  print("═".repeat(70) + "\n", colors.bright + colors.cyan);
}

function getTrustHearts(trustLevel: number): string {
  const fullHearts = Math.floor(trustLevel * 5);
  const emptyHearts = 5 - fullHearts;
  return "❤️".repeat(fullHearts) + "🖤".repeat(emptyHearts);
}

function getOutcomeIcon(
  outcome: "helped" | "struggling" | "pending" | "unknown",
): string {
  switch (outcome) {
    case "helped":
      return "✅ Helped";
    case "struggling":
      return "⚠️ Struggling";
    case "pending":
      return "❓ Pending";
    default:
      return "❓ Unknown";
  }
}

function printRelationships(advisorState: AdvisorState) {
  const relationships = characterPool.getCharacterRelationships(
    advisorState.advisorId,
  );

  if (relationships.length === 0) {
    print("\n📊 Your Relationships:", colors.yellow);
    print(
      "   You haven't met any characters yet. Start a consultation to begin!",
      colors.yellow,
    );
    return;
  }

  print("\n📊 Your Relationships:", colors.yellow);
  print("");

  // Print table header
  print("┌" + "─".repeat(68) + "┐", colors.cyan);
  print("│ Character        │ Trust     │ Visits │ Last       │", colors.cyan);
  print("├" + "─".repeat(68) + "┤", colors.cyan);

  // Print each relationship
  for (const rel of relationships) {
    const nameCol = rel.name.padEnd(16).substring(0, 16);
    const trustCol = getTrustHearts(rel.trustLevel).padEnd(9);
    const visitsCol = rel.visitCount.toString().padEnd(6);
    const outcomeCol = getOutcomeIcon(rel.lastOutcome).padEnd(11);

    const row = `│ ${nameCol} │ ${trustCol} │ ${visitsCol} │ ${outcomeCol} │`;
    print(row, colors.cyan);
  }

  print("└" + "─".repeat(68) + "┘", colors.cyan);
  print("");
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
  print(
    "  • 'relationships' or 'r' - View character relationships",
    colors.yellow,
  );
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
    const urlText = m.url ? ` (${m.url})` : "";
    print(`   • ${m.title} - ${m.description}${urlText}`, colors.cyan);
  });

  print(`\n💬 Boss says:`, colors.magenta);
  print(`   "${review.encouragingMessage}"\n`, colors.magenta);
  print("═".repeat(70) + "\n", colors.magenta);
}

async function handleQuiz(
  quiz: any,
  advisorState: AdvisorState,
): Promise<AdvisorState> {
  print("\n" + "═".repeat(70), colors.cyan);
  print("   📝 INTERACTIVE QUIZ", colors.cyan + colors.bright);
  print("═".repeat(70), colors.cyan);
  print(
    "\nTime to test your knowledge! Answer these questions to earn bonus points.\n",
    colors.cyan,
  );

  let correctCount = 0;
  const totalQuestions = quiz.questions.length;

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];

    print(`\n${"─".repeat(70)}`, colors.blue);
    print(
      `Question ${i + 1}/${totalQuestions}: ${q.question}`,
      colors.blue + colors.bright,
    );
    print(`${"─".repeat(70)}`, colors.blue);

    q.options.forEach((opt: string, idx: number) => {
      print(`   ${idx + 1}. ${opt}`, colors.yellow);
    });

    let validAnswer = false;
    let userAnswer = -1;

    while (!validAnswer) {
      const answer = await askQuestion(
        `\n${colors.green}Your answer (1-${q.options.length}): ${colors.reset}`,
      );
      const answerNum = parseInt(answer);

      if (answerNum >= 1 && answerNum <= q.options.length) {
        userAnswer = answerNum - 1;
        validAnswer = true;
      } else {
        print(
          `Please enter a number between 1 and ${q.options.length}`,
          colors.red,
        );
      }
    }

    // Check answer
    if (userAnswer === q.correctAnswer) {
      print("\n✅ Correct!", colors.green + colors.bright);
      correctCount++;
    } else {
      print("\n❌ Incorrect.", colors.red);
      print(
        `   The correct answer was: ${q.options[q.correctAnswer]}`,
        colors.yellow,
      );
    }

    print(`\n💡 Explanation: ${q.explanation}`, colors.cyan);
  }

  // Calculate score and apply bonuses
  const scorePercentage = (correctCount / totalQuestions) * 100;

  print("\n" + "═".repeat(70), colors.magenta);
  print("   📊 QUIZ RESULTS", colors.magenta + colors.bright);
  print("═".repeat(70), colors.magenta);
  print(
    `\nYou got ${correctCount} out of ${totalQuestions} correct (${scorePercentage.toFixed(0)}%)`,
    colors.green,
  );

  let skillBonus = 0;
  let reputationBonus = 0;

  if (scorePercentage >= 80) {
    skillBonus = 0.3;
    reputationBonus = 5;
    print(
      "\n🌟 Excellent! You really know your stuff!",
      colors.green + colors.bright,
    );
  } else if (scorePercentage >= 60) {
    skillBonus = 0.2;
    reputationBonus = 3;
    print("\n✨ Good job! You're on the right track!", colors.green);
  } else if (scorePercentage >= 40) {
    skillBonus = 0.1;
    reputationBonus = 1;
    print("\n👍 Not bad, but there's room for improvement.", colors.yellow);
  } else {
    print(
      "\n📚 You might want to review the learning materials!",
      colors.yellow,
    );
  }

  if (skillBonus > 0 || reputationBonus > 0) {
    print(
      `\n🎁 Bonus: +${skillBonus} skill, +${reputationBonus} reputation`,
      colors.green,
    );

    // Apply bonuses to advisor state
    const updatedState = {
      ...advisorState,
      skillLevel: advisorState.skillLevel + skillBonus,
      reputation: advisorState.reputation + reputationBonus,
    };

    // Update topic expertise based on quiz topic
    if (quiz.topic && updatedState.topicsExpertise) {
      const topic = quiz.topic as keyof typeof updatedState.topicsExpertise;
      updatedState.topicsExpertise = {
        ...updatedState.topicsExpertise,
        [topic]: (updatedState.topicsExpertise[topic] || 0) + skillBonus,
      };
    }

    print("═".repeat(70) + "\n", colors.magenta);
    return updatedState;
  }

  print("═".repeat(70) + "\n", colors.magenta);
  return advisorState;
}

async function askQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${colors.green}💼 You: ${colors.reset}`, (answer: string) => {
      resolve(answer);
    });
  });
}

async function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    rl.question("", () => {
      resolve();
    });
  });
}

/**
 * Interactive choice selector with arrow key navigation
 */
async function selectChoiceWithArrows(
  choices: AdviceChoice[],
): Promise<number> {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    // Set up raw mode for keypress detection
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    // Save cursor position before drawing
    process.stdout.write("\u001b7"); // Save cursor position
    displayAdviceChoices(choices, selectedIndex);

    const redrawChoices = () => {
      process.stdout.write("\u001b8"); // Restore cursor position
      process.stdout.write("\u001b[J"); // Clear from cursor to end of screen
      displayAdviceChoices(choices, selectedIndex);
    };

    const onKeyPress = (key: string) => {
      if (key === "\u001b[A") {
        // Up arrow
        selectedIndex = Math.max(0, selectedIndex - 1);
        redrawChoices();
      } else if (key === "\u001b[B") {
        // Down arrow
        selectedIndex = Math.min(choices.length - 1, selectedIndex + 1);
        redrawChoices();
      } else if (key === "\r" || key === "\n") {
        // Enter key
        cleanup();
        resolve(selectedIndex);
      } else if (key === "q" || key === "Q") {
        // Quit
        cleanup();
        print("\n👋 Thanks for playing!\n", colors.cyan);
        process.exit(0);
      } else if (key === "\u0003") {
        // Ctrl+C
        cleanup();
        process.exit(0);
      }
    };

    const cleanup = () => {
      stdin.removeListener("data", onKeyPress);
      stdin.setRawMode(false);
      stdin.pause();
    };

    stdin.on("data", onKeyPress);
  });
}

/**
 * Display advice choices to player
 */
function displayAdviceChoices(
  choices: AdviceChoice[],
  selectedIndex?: number,
): void {
  print(
    "\n┌─ YOUR MOVE " + "─".repeat(57) + "┐",
    colors.bright + colors.yellow,
  );
  print(
    "│ What's your advice?                                             │",
    colors.yellow,
  );
  print(
    "│                                                                 │",
    colors.yellow,
  );

  choices.forEach((choice, index) => {
    const isSelected = selectedIndex !== undefined && selectedIndex === index;
    const arrow = isSelected ? "→" : " ";
    const number = `[${index + 1}]`;
    const icon = choice.icon;
    const action = choice.actionText;
    const outcome = choice.projectedOutcome;

    // First line: Arrow, Number, icon, action
    const actionLine = `${arrow} ${number} ${icon} ${action}`;
    const actionPadded =
      actionLine + " ".repeat(Math.max(0, 65 - actionLine.length));
    const actionColor = isSelected ? colors.bright + colors.green : colors.cyan;
    print(`│ ${actionPadded}│`, actionColor);

    // Second line: Outcome
    const outcomeLine = `     ${outcome}`;
    const outcomePadded =
      outcomeLine + " ".repeat(Math.max(0, 65 - outcomeLine.length));
    print(`│ ${outcomePadded}│`, colors.dim);

    // Blank line between choices
    if (index < choices.length - 1) {
      print(
        "│                                                                 │",
        colors.yellow,
      );
    }
  });

  print("└" + "─".repeat(67) + "┘", colors.bright + colors.yellow);

  // Show instructions if in arrow key mode
  if (selectedIndex !== undefined) {
    print("  ↑↓ Navigate  │  Enter Select  │  Q Quit", colors.dim);
  }
  print("", colors.reset);
}

/**
 * Display financial results after consultation
 */
function displayFinancialResults(
  financialResults: { projection?: any; coinsEarned?: number },
  characterName: string,
): void {
  print("\n" + "━".repeat(70), colors.bright + colors.green);
  print("✨ CONSULTATION COMPLETE ✨", colors.bright + colors.green);
  print("━".repeat(70), colors.bright + colors.green);

  if (financialResults.projection) {
    const proj = financialResults.projection;

    print("\n💰 FINANCIAL IMPACT", colors.bright + colors.yellow);
    print("─".repeat(70), colors.dim);

    let hasAnyImpact = false;

    // Show primary outcomes
    if (proj.totalSaved !== undefined && proj.totalSaved !== 0) {
      hasAnyImpact = true;
      if (proj.totalSaved > 0) {
        print(
          `📈 Client will save: ${Math.round(proj.totalSaved)}€ over ${proj.projectionPeriodMonths} months`,
          colors.green,
        );
        if (proj.monthlySavings > 0) {
          print(
            `   (${Math.round(proj.monthlySavings)}€/month average)`,
            colors.cyan,
          );
        }
      } else {
        // Negative savings = spending more than income
        print(
          `⚠️  WARNING: Client will lose ${Math.abs(Math.round(proj.totalSaved))}€ over ${proj.projectionPeriodMonths} months`,
          colors.red + colors.bright,
        );
        if (proj.monthlySavings < 0) {
          print(
            `   Deficit: ${Math.abs(Math.round(proj.monthlySavings))}€/month`,
            colors.red,
          );
        }
      }
    }

    if (proj.totalDebtReduced !== undefined && proj.totalDebtReduced !== 0) {
      hasAnyImpact = true;
      if (proj.totalDebtReduced > 0) {
        print(
          `💳 Debt reduced by: ${Math.round(proj.totalDebtReduced)}€`,
          colors.green,
        );
        if (proj.totalInterestSaved > 0) {
          print(
            `   Interest saved: ${Math.round(proj.totalInterestSaved)}€`,
            colors.green,
          );
        }
        if (proj.monthsToGoal > 0 && proj.monthsToGoal < 999) {
          print(
            `   Debt-free in: ${Math.round(proj.monthsToGoal)} months`,
            colors.cyan,
          );
        }
      } else {
        // Negative debt reduction = taking on more debt
        print(
          `⚠️  WARNING: Debt will INCREASE by ${Math.abs(Math.round(proj.totalDebtReduced))}€`,
          colors.red + colors.bright,
        );
        print(
          `   This advice will make the problem WORSE!`,
          colors.red + colors.bright,
        );
      }
    }

    // Emergency fund progress
    if (proj.emergencyFundProgress > 0 && proj.emergencyFundProgress < 1) {
      hasAnyImpact = true;
      const progressPercent = Math.round(proj.emergencyFundProgress * 100);
      print(
        `🛡️  Emergency Fund: ${progressPercent}% toward 3-month goal`,
        colors.cyan,
      );
    } else if (proj.emergencyFundProgress >= 1) {
      hasAnyImpact = true;
      print(`🛡️  Emergency Fund: GOAL REACHED! ✅`, colors.green);
    }

    // If no financial impact at all, show a message
    if (!hasAnyImpact) {
      print(
        `ℹ️  No measurable financial impact in the short term`,
        colors.yellow,
      );
      print(
        `   This advice may have other benefits (emotional, behavioral, etc.)`,
        colors.dim,
      );
    }
  }

  // Show earnings
  if (financialResults.coinsEarned !== undefined) {
    print("\n" + "─".repeat(70), colors.dim);
    print(
      `💎 YOU EARNED: +${financialResults.coinsEarned} coins`,
      colors.bright + colors.yellow,
    );
  }

  print("━".repeat(70) + "\n", colors.bright + colors.green);
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
  await waitForEnter();

  // Automatically start first consultation
  print("\n🔄 Finding your first client...", colors.cyan);
  const firstConsultation = await startNewConsultation(advisorId, advisorState);

  if (
    firstConsultation.type !== "character_message" ||
    !firstConsultation.characterInfo
  ) {
    print("❌ Failed to start consultation.", colors.red);
    rl.close();
    return;
  }

  advisorState = firstConsultation.stateUpdate;
  const firstThreadId = firstConsultation.threadId || `thread_${Date.now()}`;

  let continueGame = true;
  let currentThreadId: string | null = firstThreadId;

  // Store conversation history per thread
  const threadHistories = new Map<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >();
  threadHistories.set(firstThreadId, []);

  // Store character info per thread
  const threadCharacterInfo = new Map<
    string,
    { name: string; age: number; occupation: string }
  >();
  threadCharacterInfo.set(firstThreadId, firstConsultation.characterInfo);

  // Display first client
  print("\n\n" + "═".repeat(70), colors.bright);
  print(`   🆕 NEW CLIENT`, colors.bright + colors.green);
  print("═".repeat(70), colors.bright);
  print(`Name: ${firstConsultation.characterInfo.name}`, colors.cyan);
  print(`Age: ${firstConsultation.characterInfo.age}`, colors.cyan);
  print(
    `Occupation: ${firstConsultation.characterInfo.occupation}`,
    colors.cyan,
  );

  // Display financial snapshot if available
  if (firstConsultation.scenarioFinancialContext) {
    const ctx = firstConsultation.scenarioFinancialContext;
    print("\n📊 FINANCIAL SNAPSHOT", colors.bright + colors.yellow);
    print("━".repeat(70), colors.dim);

    // Difficulty & Topic
    const difficultyStars =
      "⭐".repeat(Math.ceil(ctx.difficulty * 5)) +
      "☆".repeat(5 - Math.ceil(ctx.difficulty * 5));
    print(`Difficulty: ${difficultyStars}`, colors.yellow);
    print(
      `Topic: ${ctx.topic.replace(/_/g, " ").toUpperCase()}`,
      colors.yellow,
    );

    // Income & Expenses
    print("\n💰 INCOME & EXPENSES", colors.green);
    if (ctx.monthlyIncome) {
      print(`  Income:     ${ctx.monthlyIncome}€/month`, colors.cyan);
      if (ctx.rent) {
        const rentPercent = Math.round((ctx.rent / ctx.monthlyIncome) * 100);
        const rentWarning = rentPercent > 50 ? " 🔴" : "";
        print(
          `  Rent:       ${ctx.rent}€ (${rentPercent}% of income)${rentWarning}`,
          colors.cyan,
        );
      } else {
        print(`  Rent:       Unknown`, colors.cyan);
      }
    } else {
      print(`  Income:     Unknown`, colors.cyan);
      print(`  Rent:       Unknown`, colors.cyan);
    }

    // Debt & Savings
    print("\n💳 DEBT & SAVINGS", colors.green);
    if (ctx.totalDebt) {
      print(`  Debt:       ${ctx.totalDebt}€ 🔴`, colors.cyan);
    } else {
      print(`  Debt:       None ✅`, colors.cyan);
    }
    if (ctx.currentSavings !== undefined) {
      print(`  Savings:    ${ctx.currentSavings}€`, colors.cyan);
    } else {
      print(`  Savings:    Unknown`, colors.cyan);
    }

    // Situation
    print("\n📈 SITUATION", colors.green);
    print(`  ${ctx.situation}`, colors.cyan);
    const urgencyEmoji =
      ctx.urgency === "high" ? "🔴" : ctx.urgency === "medium" ? "⚠️" : "✅";
    print(
      `  Urgency:    ${ctx.urgency.toUpperCase()} ${urgencyEmoji}`,
      colors.yellow,
    );

    print("━".repeat(70) + "\n", colors.dim);
  }

  const firstMessage = firstConsultation.messages?.[0] || "Hello...";
  printCharacterMessage(
    firstConsultation.characterInfo.name,
    firstMessage,
    firstConsultation.voiceNeeded || false,
  );

  // Show advice choices for first consultation
  if (
    firstConsultation.adviceChoices &&
    firstConsultation.adviceChoices.length > 0 &&
    firstConsultation.characterInfo
  ) {
    // Use arrow key selector
    const selectedIndex = await selectChoiceWithArrows(
      firstConsultation.adviceChoices,
    );
    const selectedChoice = firstConsultation.adviceChoices[selectedIndex];

    // For compatibility, also set choiceNumber
    const choiceNumber = selectedIndex + 1;

    if (selectedChoice) {
      // Check if custom advice option
      if (selectedChoice.actionText.toLowerCase().includes("custom")) {
        // Allow free-text input
        const customAdvice = await askQuestion("Enter your custom advice: ");
        // Handle as normal free-text response
        const response = await handleAdvisorResponse(
          firstThreadId,
          customAdvice,
          advisorState,
          [],
        );
        advisorState = response.stateUpdate;

        if (response.messages && response.messages.length > 0) {
          response.messages.forEach((msg) => {
            printCharacterMessage(
              firstConsultation.characterInfo!.name,
              msg,
              false,
            );
          });
        }

        // Show financial results if consultation ended
        if (response.type === "conversation_end" && response.financialResults) {
          displayFinancialResults(
            response.financialResults,
            firstConsultation.characterInfo!.name,
          );
          currentThreadId = null;
        }
      } else {
        // Handle choice-based advice
        print("\n⏳ Processing your advice...", colors.cyan);
        const response = await handleAdviceChoice(
          firstThreadId,
          choiceNumber - 1, // Pass zero-based array index
          advisorState,
          [],
        );
        advisorState = response.stateUpdate;

        // Show character's acceptance
        if (response.messages && response.messages.length > 0) {
          printCharacterMessage(
            firstConsultation.characterInfo!.name,
            response.messages[0],
            false,
          );
        }

        // Show financial results
        if (response.financialResults) {
          displayFinancialResults(
            response.financialResults,
            firstConsultation.characterInfo!.name,
          );
        }

        // Consultation is complete, clear current thread
        currentThreadId = null;
      }
    }
  }

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

      // Handle relationships
      if (
        userInput.toLowerCase() === "relationships" ||
        userInput.toLowerCase() === "r"
      ) {
        printRelationships(advisorState);
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

          // Handle quiz if present
          if (consultation.review.quiz) {
            print("\n🎯 Your boss has prepared a quiz for you!\n", colors.cyan);
            print("Press ENTER to start the quiz...", colors.yellow);
            await askQuestion("");

            advisorState = await handleQuiz(
              consultation.review.quiz,
              advisorState,
            );
          }

          printStats(advisorState);
          print("\nPress ENTER to continue...", colors.yellow);
          await waitForEnter();
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

        // NEW: Display financial snapshot if available
        if (consultation.scenarioFinancialContext) {
          const ctx = consultation.scenarioFinancialContext;
          print("\n📊 FINANCIAL SNAPSHOT", colors.bright + colors.yellow);
          print("━".repeat(70), colors.dim);

          // Difficulty & Topic
          const difficultyStars =
            "⭐".repeat(Math.ceil(ctx.difficulty * 5)) +
            "☆".repeat(5 - Math.ceil(ctx.difficulty * 5));
          print(`Difficulty: ${difficultyStars}`, colors.yellow);
          print(
            `Topic: ${ctx.topic.replace(/_/g, " ").toUpperCase()}`,
            colors.yellow,
          );

          // Income & Expenses
          print("\n💰 INCOME & EXPENSES", colors.green);
          if (ctx.monthlyIncome) {
            print(`  Income:     ${ctx.monthlyIncome}€/month`, colors.cyan);
            if (ctx.rent) {
              const rentPercent = Math.round(
                (ctx.rent / ctx.monthlyIncome) * 100,
              );
              const rentWarning = rentPercent > 50 ? " 🔴" : "";
              print(
                `  Rent:       ${ctx.rent}€ (${rentPercent}% of income)${rentWarning}`,
                colors.cyan,
              );
            } else {
              print(`  Rent:       Unknown`, colors.cyan);
            }
          } else {
            print(`  Income:     Unknown`, colors.cyan);
            print(`  Rent:       Unknown`, colors.cyan);
          }

          // Debt & Savings
          print("\n💳 DEBT & SAVINGS", colors.green);
          if (ctx.totalDebt) {
            print(`  Debt:       ${ctx.totalDebt}€ 🔴`, colors.cyan);
          } else {
            print(`  Debt:       None ✅`, colors.cyan);
          }
          if (ctx.currentSavings !== undefined) {
            print(`  Savings:    ${ctx.currentSavings}€`, colors.cyan);
          } else {
            print(`  Savings:    Unknown`, colors.cyan);
          }

          // Situation
          print("\n📈 SITUATION", colors.green);
          print(`  ${ctx.situation}`, colors.cyan);
          const urgencyEmoji =
            ctx.urgency === "high"
              ? "🔴"
              : ctx.urgency === "medium"
                ? "⚠️"
                : "✅";
          print(
            `  Urgency:    ${ctx.urgency.toUpperCase()} ${urgencyEmoji}`,
            colors.yellow,
          );

          print("━".repeat(70) + "\n", colors.dim);
        }

        const initialMessage = consultation.messages?.[0] || "Hello...";
        printCharacterMessage(
          consultation.characterInfo.name,
          initialMessage,
          consultation.voiceNeeded || false,
        );

        // Show advice choices if available
        if (
          consultation.adviceChoices &&
          consultation.adviceChoices.length > 0
        ) {
          // Use arrow key selector
          const selectedIndex = await selectChoiceWithArrows(
            consultation.adviceChoices,
          );
          const selectedChoice = consultation.adviceChoices[selectedIndex];

          // For compatibility, also set choiceNumber
          const choiceNumber = selectedIndex + 1;

          if (selectedChoice) {
            // Check if custom advice option
            if (selectedChoice.actionText.toLowerCase().includes("custom")) {
              // Allow free-text input
              const customAdvice = await askQuestion(
                "Enter your custom advice: ",
              );
              // Handle as normal free-text response
              const response = await handleAdvisorResponse(
                newThreadId,
                customAdvice,
                advisorState,
                [],
              );
              advisorState = response.stateUpdate;

              if (response.messages && response.messages.length > 0) {
                response.messages.forEach((msg) => {
                  printCharacterMessage(
                    consultation.characterInfo!.name,
                    msg,
                    false,
                  );
                });
              }

              // Show financial results if consultation ended
              if (
                response.type === "conversation_end" &&
                response.financialResults
              ) {
                displayFinancialResults(
                  response.financialResults,
                  consultation.characterInfo!.name,
                );
                currentThreadId = null;
              }
            } else {
              // Handle choice-based advice
              print("\n⏳ Processing your advice...", colors.cyan);
              const response = await handleAdviceChoice(
                newThreadId,
                choiceNumber - 1, // Pass zero-based array index
                advisorState,
                [],
              );
              advisorState = response.stateUpdate;

              // Show character's acceptance
              if (response.messages && response.messages.length > 0) {
                printCharacterMessage(
                  consultation.characterInfo!.name,
                  response.messages[0],
                  false,
                );
              }

              // Show financial results
              if (response.financialResults) {
                displayFinancialResults(
                  response.financialResults,
                  consultation.characterInfo!.name,
                );
              }

              // Consultation is complete, clear current thread
              currentThreadId = null;
            }
          }
        }

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

        // NEW: Display financial projection results
        if (response.financialResults?.projection) {
          const proj = response.financialResults.projection;
          const coins = response.financialResults.coinsEarned || 0;

          print("\n" + "━".repeat(70), colors.bright + colors.yellow);
          print(
            "💰 FINANCIAL OUTCOME PROJECTION",
            colors.bright + colors.yellow,
          );
          print("━".repeat(70), colors.bright + colors.yellow);

          // Show primary outcome based on topic
          if (proj.totalSaved > 0) {
            print(
              `\n📈 Projected Savings: ${Math.round(proj.totalSaved)}€ over ${proj.projectionPeriodMonths} months`,
              colors.green,
            );
            if (proj.monthlySavings > 0) {
              print(
                `   (${Math.round(proj.monthlySavings)}€/month average)`,
                colors.cyan,
              );
            }
          }

          if (proj.totalDebtReduced !== 0) {
            const isPositive = proj.totalDebtReduced > 0;
            const color = isPositive ? colors.green : colors.red;
            const label = isPositive
              ? "Projected Debt Reduction"
              : "⚠️  WARNING: Debt Increase";
            const amount = Math.abs(Math.round(proj.totalDebtReduced));

            print(`\n💳 ${label}: ${amount}€`, color);

            if (isPositive) {
              if (proj.totalInterestSaved > 0) {
                print(
                  `   Interest saved: ${Math.round(proj.totalInterestSaved)}€`,
                  colors.green,
                );
              }
              if (proj.monthsToGoal > 0 && proj.monthsToGoal < 999) {
                print(
                  `   Debt-free in: ${Math.round(proj.monthsToGoal)} months`,
                  colors.cyan,
                );
              }
            } else {
              print(
                `   This advice will make the problem WORSE!`,
                colors.red + colors.bright,
              );
            }
          }

          // Emergency fund progress
          if (
            proj.emergencyFundProgress > 0 &&
            proj.emergencyFundProgress < 1
          ) {
            const progressPercent = Math.round(
              proj.emergencyFundProgress * 100,
            );
            print(
              `\n🛡️  Emergency Fund: ${progressPercent}% toward 3-month goal`,
              colors.cyan,
            );
          } else if (proj.emergencyFundProgress >= 1) {
            print(`\n🛡️  Emergency Fund: GOAL REACHED! ✅`, colors.green);
          }

          // Quality feedback
          print("\n" + "─".repeat(70), colors.dim);
          if (coins > 10) {
            print(
              `✅ Quality Bonus! Great advice!`,
              colors.green + colors.bright,
            );
          } else if (coins === 10) {
            print(`✓ Decent advice`, colors.yellow);
          } else if (coins > 0) {
            print(`⚠️  Advice had some issues`, colors.yellow);
          } else {
            print(
              `❌ Poor advice - caused harm to client`,
              colors.red + colors.bright,
            );
          }

          // Earnings display
          print("\n" + "─".repeat(70), colors.dim);
          const earnColor =
            coins > 0 ? colors.bright + colors.yellow : colors.red;
          print(`💎 YOU EARNED: +${coins} coins`, earnColor);
          print(
            `   Total coins: ${advisorState.advisorCoins} coins`,
            colors.cyan,
          );
          print("━".repeat(70) + "\n", colors.bright + colors.yellow);
        }

        print(
          `📊 Your reputation: ${advisorState.reputation}/100`,
          colors.yellow,
        );
        print(
          `🎓 Skill level: ${advisorState.skillLevel.toFixed(1)}/10`,
          colors.yellow,
        );

        // Show recommendation message if any
        if (response.recommendationMessage) {
          print(
            "\n" + response.recommendationMessage,
            colors.green + colors.bright,
          );
        }

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
      await waitForEnter();
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
