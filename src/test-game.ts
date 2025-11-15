/**
 * Test script for Financial Advisor Simulator
 *
 * Demonstrates the new advisor-character interaction system
 */

import { characterPool } from "./mastra/index.ts";
import {
  startNewConsultation,
  handleAdvisorResponse,
  createNewAdvisor,
  getAdvisorSummary,
} from "./mastra/game/orchestrator.ts";

const ADVISOR_RESPONSES: Record<string, string> = {
  scenario_jukka_debt_001:
    "Hi Jukka! I understand that €8,000 of debt at 15% interest feels heavy. Let’s first map out all your income, expenses, and debts, then build a realistic repayment plan and see if a lower-interest consolidation loan is possible. This is absolutely solvable step by step.",
  scenario_jukka_debt_progress_002:
    "Great job getting the consolidation loan and lowering the interest! Let’s calculate a monthly payment that’s higher than the minimum but still leaves enough money for everyday life and a small buffer. We’ll also look at how much interest you save by paying a bit extra each month.",
  scenario_minna_budget_001:
    "Hi Minna! Let’s start simple: for the next week, track every expense and group them into a few basic categories like rent, food, transport, and fun. After that we’ll build you an easy budget, for example using a 50/30/20 style split, and pick a simple tool like an app or a spreadsheet.",
  scenario_minna_budget_success_002:
    "Awesome that you’ve already made a budget and spotted your biggest expense! One idea is to make one of your weekly meetups with friends a home-cooked or cheaper option and set a clear monthly limit for eating out. That way you save money without sacrificing your social life.",
  scenario_minna_budget_struggle_003:
    "You’re not bad with money at all – budgeting is a skill most people don’t master immediately. Let’s make this easier: track just one thing at a time, for example food spending for a single week, without trying to change anything yet. Then we’ll choose one small, concrete change you can make.",
  scenario_petri_scam_001:
    "Hi Petri! If someone promises €5,000 in a week with almost no risk, it’s almost always a scam. Let’s go through some red flags and why these schemes are often pyramids. Before you invest a single euro, we’ll look at safer, more realistic ways to start investing.",
  scenario_petri_first_paycheck_002:
    "Congrats on your first summer job! I suggest splitting your pay so that part goes to savings, part to basic expenses, and a small part purely for enjoying yourself. We can also open a separate savings account or fund where a portion of every paycheck goes automatically.",
  scenario_sari_savings_001:
    "Hi Sari! It’s great that your finances are under control and you want to save for both your children and retirement. First, we’ll confirm your emergency fund is solid, then divide your savings between short-term goals and long-term ones. Savings accounts work well for short-term goals, while diversified funds or index funds are better for the long term.",
  scenario_sari_investment_choice_002:
    "Good that you’ve already researched options! Often a simple, diversified solution works best, for example a broad global index fund combined with a slightly lower-risk component. Together we’ll check the fees (TER), risk level, and how monthly investing fits your time horizon and goals.",
};

// Intentionally weak / faulty advice samples for future negative-path tests
const FAULTY_ADVISOR_RESPONSES: Record<string, string> = {
  scenario_jukka_debt_001:
    "You’ve only got €8,000 of debt so I wouldn’t worry too much. Just keep paying the minimum and things will sort themselves out eventually.",
  scenario_jukka_debt_progress_002:
    "Now that the interest is lower you don’t really need to think about it. Just pay whatever the bank suggests and use the extra money for treats.",
  scenario_minna_budget_001:
    "If your money runs out you just have to stop spending near the end of the month. Budgeting apps are overkill for a student.",
  scenario_minna_budget_success_002:
    "If eating out is expensive, just stop going out with friends so often. That’s really the only way to save here.",
  scenario_minna_budget_struggle_003:
    "Maybe you’re just not very good with money. Budgets are simple, you should be able to just follow one if you really try.",
  scenario_petri_scam_001:
    "If your friend made €5,000 in a week it clearly works, so you might as well put in some money and see what happens.",
  scenario_petri_first_paycheck_002:
    "Since you still live with your parents you don’t really need a plan. Just enjoy the whole paycheck, you can think about saving later.",
  scenario_sari_savings_001:
    "Savings accounts are boring and interest is low, so you should probably just pick a few exciting stocks and hope they go up a lot.",
  scenario_sari_investment_choice_002:
    "Just choose the fund that went up the most last year and put everything there. If it did well once it will probably keep doing well.",
};

const DEFAULT_ADVISOR_ADVICE =
  "I understand your situation. Let’s track your money for a short period to see where it actually goes, and then build a clear but simple plan based on that. We’ll pick one or two concrete first steps you can already take this week.";

async function testAdvisorSimulator() {
  if (process.env.FORCE_TEST_FAILURE === "1") {
    throw new Error("Forced test failure for verification");
  }

  console.log("🎮 Financial Advisor Simulator - Testing Multi-Agent System\n");
  console.log("=".repeat(70));

  // Wait a moment for character pool to initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create a new advisor
  const advisorId = "test-advisor-001";
  let advisorState = createNewAdvisor(advisorId);

  console.log("\n✅ Created new financial advisor:");
  console.log(JSON.stringify(getAdvisorSummary(advisorState), null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("📱 Starting first consultation...\n");

  try {
    // Start first consultation - Game Master sends a character
    console.log("🤖 Game Master is selecting a client for you...\n");

    const consultation1 = await startNewConsultation(advisorId, advisorState);

    if (
      consultation1.type === "character_message" &&
      consultation1.characterInfo
    ) {
      console.log(`\n📨 NEW CLIENT: ${consultation1.characterInfo.name}`);
      console.log(`   Age: ${consultation1.characterInfo.age}`);
      console.log(`   Occupation: ${consultation1.characterInfo.occupation}`);
      console.log(
        `   ${consultation1.voiceNeeded ? "🔊 Voice message" : "💬 Text message"}\n`,
      );
      console.log(`Character: "${consultation1.messages?.[0]}"\n`);

      advisorState = consultation1.stateUpdate;

      const scenarioId1 =
        consultation1.threadId &&
        advisorState.activeThreads[consultation1.threadId]?.scenarioId;

      const advisorAdvice =
        (scenarioId1 && ADVISOR_RESPONSES[scenarioId1]) ||
        DEFAULT_ADVISOR_ADVICE;

      console.log("=".repeat(70));
      console.log("💼 You (Advisor):");
      console.log(`"${advisorAdvice}"\n`);

      // Get character's response
      const response1 = await handleAdvisorResponse(
        consultation1.threadId || "thread_1",
        advisorAdvice,
        advisorState,
        [],
      );

      console.log("📨 Character responds:");
      response1.messages?.forEach((msg) => {
        console.log(`   "${msg}"`);
      });

      advisorState = response1.stateUpdate;

      if (response1.type === "conversation_end") {
        console.log("\n✅ Consultation ended");
      } else {
        console.log("\n↔️  Conversation continuing...");
      }

      console.log("\n📈 Updated Advisor State:");
      console.log(JSON.stringify(getAdvisorSummary(advisorState), null, 2));

      // Try to start a second consultation
      console.log("\n" + "=".repeat(70));
      console.log("📱 Starting second consultation...\n");

      const consultation2 = await startNewConsultation(advisorId, advisorState);

      if (
        consultation2.type === "character_message" &&
        consultation2.characterInfo
      ) {
        console.log(
          `\n📨 ${consultation2.isNewThread ? "NEW" : "RETURNING"} CLIENT: ${consultation2.characterInfo.name}`,
        );
        console.log(
          `   ${consultation2.voiceNeeded ? "🔊 Voice message" : "💬 Text message"}\n`,
        );
        console.log(`Character: "${consultation2.messages?.[0]}"\n`);

        advisorState = consultation2.stateUpdate;

        const scenarioId2 =
          consultation2.threadId &&
          advisorState.activeThreads[consultation2.threadId]?.scenarioId;

        const faultyAdvice =
          (scenarioId2 && FAULTY_ADVISOR_RESPONSES[scenarioId2]) ||
          DEFAULT_ADVISOR_ADVICE;

        console.log("=".repeat(70));
        console.log("💼 You (Advisor, faulty test advice):");
        console.log(`"${faultyAdvice}"\n`);

        const response2 = await handleAdvisorResponse(
          consultation2.threadId || "thread_2",
          faultyAdvice,
          advisorState,
          [],
        );

        console.log("📨 Character responds to faulty advice:");
        response2.messages?.forEach((msg) => {
          console.log(`   "${msg}"`);
        });

        advisorState = response2.stateUpdate;

        if (response2.type === "conversation_end") {
          console.log("\n✅ Second consultation ended");
        } else {
          console.log("\n↔️  Second conversation continuing...");
        }
      } else if (
        consultation2.type === "god_boss_review" &&
        consultation2.review
      ) {
        console.log("\n📊 GOD/BOSS REVIEW!\n");
        console.log(`Overall Score: ${consultation2.review.overallScore}/10`);
        console.log(`\nStrengths:`);
        consultation2.review.strengthsIdentified.forEach((s) =>
          console.log(`  ✅ ${s}`),
        );
        console.log(`\nAreas for Improvement:`);
        consultation2.review.areasForImprovement.forEach((a) =>
          console.log(`  ⚠️  ${a}`),
        );
        console.log(`\nLearning Materials:`);
        consultation2.review.learningMaterials.forEach((m) =>
          console.log(`  📚 ${m.title} - ${m.description}`),
        );
        console.log(
          `\nBoss says: "${consultation2.review.encouragingMessage}"`,
        );

        advisorState = consultation2.stateUpdate;
      }

      console.log("\n" + "=".repeat(70));
      console.log("📱 Starting third consultation...\n");

      const consultation3 = await startNewConsultation(advisorId, advisorState);

      if (
        consultation3.type === "character_message" &&
        consultation3.characterInfo
      ) {
        console.log(
          `\n📨 ${consultation3.isNewThread ? "NEW" : "RETURNING"} CLIENT: ${consultation3.characterInfo.name}`,
        );
        console.log(
          `   ${consultation3.voiceNeeded ? "🔊 Voice message" : "💬 Text message"}\n`,
        );
        console.log(`Character: "${consultation3.messages?.[0]}"\n`);

        advisorState = consultation3.stateUpdate;

        const scenarioId3 =
          consultation3.threadId &&
          advisorState.activeThreads[consultation3.threadId]?.scenarioId;

        const advisorAdvice3 =
          (scenarioId3 && ADVISOR_RESPONSES[scenarioId3]) ||
          DEFAULT_ADVISOR_ADVICE;

        console.log("=".repeat(70));
        console.log("💼 You (Advisor):");
        console.log(`"${advisorAdvice3}"\n`);

        const response3 = await handleAdvisorResponse(
          consultation3.threadId || "thread_3",
          advisorAdvice3,
          advisorState,
          [],
        );

        console.log("📨 Character responds:");
        response3.messages?.forEach((msg) => {
          console.log(`   "${msg}"`);
        });

        advisorState = response3.stateUpdate;

        if (response3.type === "conversation_end") {
          console.log("\n✅ Third consultation ended");
        } else {
          console.log("\n↔️  Third conversation continuing...");
        }
      } else if (
        consultation3.type === "god_boss_review" &&
        consultation3.review
      ) {
        console.log("\n📊 GOD/BOSS REVIEW (third consultation)!\n");
        console.log(`Overall Score: ${consultation3.review.overallScore}/10`);
        console.log(`\nStrengths:`);
        consultation3.review.strengthsIdentified.forEach((s) =>
          console.log(`  ✅ ${s}`),
        );
        console.log(`\nAreas for Improvement:`);
        consultation3.review.areasForImprovement.forEach((a) =>
          console.log(`  ⚠️  ${a}`),
        );
        console.log(`\nLearning Materials:`);
        consultation3.review.learningMaterials.forEach((m) =>
          console.log(`  📚 ${m.title} - ${m.description}`),
        );
        console.log(
          `\nBoss says: "${consultation3.review.encouragingMessage}"`,
        );

        advisorState = consultation3.stateUpdate;
      }

      console.log("\n" + "=".repeat(70));
      console.log("\n✅ Test completed successfully!");

      console.log("\n🎯 Key observations:");
      console.log(`   - Sessions completed: ${advisorState.totalSessions}`);
      console.log(`   - Clients helped: ${advisorState.totalClientsHelped}`);
      console.log(`   - Reputation: ${advisorState.reputation}/100`);
      console.log(`   - Skill level: ${advisorState.skillLevel.toFixed(1)}/10`);
      console.log(
        `   - Budgeting expertise: ${advisorState.topicsExpertise.budgeting.toFixed(1)}/10`,
      );

      // Show character pool stats
      const poolStats = characterPool.getPoolStats();
      console.log("\n📊 Character Pool Stats:");
      console.log(`   - Total characters: ${poolStats.totalCharacters}`);
      console.log(`   - Total scenarios: ${poolStats.totalScenarios}`);
      console.log(`   - Characters met: ${poolStats.charactersMetCount}`);
      console.log(`   - Scenarios used: ${poolStats.usedScenarios}`);
      console.log(`   - Pending follow-ups: ${poolStats.pendingFollowUps}`);
    }
  } catch (error) {
    console.error("\n❌ Error during test:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
}

// Run the test
console.log("Starting Financial Advisor Simulator test...\n");
testAdvisorSimulator()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
