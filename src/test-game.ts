/**
 * Test script for Elämäpeli 2025 game system
 *
 * This demonstrates the multi-agent system in action
 */

import { mastra } from "./mastra/index.ts";
import {
  processPlayerInput,
  createNewPlayer,
  getPlayerSummary,
} from "./mastra/game/orchestrator.ts";

async function testGameFlow() {
  console.log("🎮 Elämäpeli 2025 - Testing Multi-Agent System\n");
  console.log("=".repeat(60));

  // Create a new player
  const playerId = "test-player-001";
  let playerState = createNewPlayer(playerId);

  console.log("\n✅ Created new player:");
  console.log(JSON.stringify(getPlayerSummary(playerState), null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("📱 Simulating Game Scenario...\n");

  // Simulate first interaction - player just got their first paycheck
  console.log("👤 Player: 'I just got my first paycheck! 500 euros!'");

  try {
    const response1 = await processPlayerInput(
      playerId,
      "I just got my first paycheck! 500 euros!",
      playerState,
    );

    console.log("\n🤖 Game Response:");
    console.log(`📊 Scenario: ${response1.scenarioType}`);
    console.log(`📨 Messages:`);
    response1.messages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });

    if (response1.voiceNeeded) {
      console.log("🔊 Voice message recommended");
    }

    playerState = response1.stateUpdate;

    console.log("\n📈 Updated Player State:");
    console.log(JSON.stringify(getPlayerSummary(playerState), null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("📱 Player responds with interest...\n");

    // Simulate player responding positively (showing some risk)
    console.log("👤 Player: 'Yeah that sounds interesting! Tell me more'");

    const response2 = await processPlayerInput(
      playerId,
      "Yeah that sounds interesting! Tell me more",
      playerState,
    );

    console.log("\n🤖 Game Response:");
    console.log(`📊 Scenario: ${response2.scenarioType}`);
    console.log(`📨 Messages:`);
    response2.messages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });

    playerState = response2.stateUpdate;

    console.log("\n📈 Final Player State:");
    console.log(JSON.stringify(getPlayerSummary(playerState), null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Test completed successfully!");
    console.log("\n🎯 Key observations:");
    console.log(
      `   - Player went through ${playerState.scenarioHistory.length} scenarios`,
    );
    console.log(
      `   - Risk tolerance: ${(playerState.personalityProfile.risk_tolerance * 100).toFixed(0)}%`,
    );
    console.log(
      `   - Scam awareness: ${(playerState.personalityProfile.scam_awareness * 100).toFixed(0)}%`,
    );
    console.log(`   - Total messages: ${playerState.totalMessages}`);
  } catch (error) {
    console.error("\n❌ Error during test:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }
}

// Run the test
console.log("Starting Elämäpeli 2025 test...\n");
testGameFlow()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
