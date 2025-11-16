import assert from "node:assert/strict";
import {
  getLeaderboardCategoryTagline,
  getLeaderboardMotivation,
} from "./src/components/LeaderboardModal";

function runTests() {
  assert.ok(
    getLeaderboardCategoryTagline("impact").includes("money saved"),
  );
  assert.ok(
    getLeaderboardCategoryTagline("coins").toLowerCase().includes("coins"),
  );

  const topMotivation = getLeaderboardMotivation(1, 100);
  assert.ok(topMotivation.length > 0);

  const invalidRank = getLeaderboardMotivation(0, 100);
  assert.equal(invalidRank, "");

  const invalidTotal = getLeaderboardMotivation(5, 0);
  assert.equal(invalidTotal, "");

  console.log("✅ Leaderboard helper tests passed");
}

runTests();

