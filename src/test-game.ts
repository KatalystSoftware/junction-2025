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

async function testAdvisorSimulator() {
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

      // Simulate advisor's response
      const advisorAdvice = `Hei! Ymmärrän tilanteesi. Aloitetaan seuraamalla menojasi viikon ajan, jotta nähdään mihin rahat menevät. Sen jälkeen voimme tehdä yksinkertaisen budjetin. Kokeile vaikkapa 50/30/20 sääntöä: 50% tuloista pakollisiin menoihin (vuokra, ruoka), 30% haluihin, ja 20% säästöihin. Suosittelen lataamaan jonkun budjetointiappin, esim. Nordea Wallet tai Spendee. Mitä mieltä olet?`;

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
