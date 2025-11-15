/**
 * View Transactions CLI Tool
 * Quick utility to view character transactions from the simulation database
 *
 * Usage:
 *   node --env-file=.env src/view-transactions.ts [characterId]
 */

import { SimulationEngine } from "./mastra/simulation/simulation-engine.ts";
import { characterPool } from "./mastra/game/character-pool-manager.ts";

async function main() {
  // Load character pool
  await characterPool.loadFromFiles(
    "characters/individuals",
    "characters/scenarios",
  );

  const characterId = process.argv[2];

  if (!characterId) {
    console.log("📊 Available Characters:");
    console.log("=".repeat(80));

    const allCharacters = characterPool.getAllCharacters();
    allCharacters.forEach((char) => {
      console.log(
        `${char.characterId.padEnd(25)} - ${char.name} (${char.age}, ${char.occupation})`,
      );
    });

    console.log("\n💡 Usage:");
    console.log(
      `   node --env-file=.env src/view-transactions.ts [characterId]`,
    );
    console.log(
      `   Example: node --env-file=.env src/view-transactions.ts char_minna_001`,
    );
    return;
  }

  const character = characterPool.getCharacter(characterId);
  if (!character) {
    console.error(`❌ Character not found: ${characterId}`);
    return;
  }

  console.log(`\n📊 Transactions for ${character.name}\n`);
  console.log("=".repeat(100));

  const engine = new SimulationEngine();

  // Get character state
  const state = await engine.getCharacterState(characterId);
  if (!state) {
    console.log(
      `⚠️  No simulation data found for ${character.name}. Run the game first to generate transactions.`,
    );
    await engine.close();
    return;
  }

  console.log(`💰 Current Balance: €${state.currentBalance.toFixed(2)}`);
  console.log(`📅 Last Simulated: ${state.lastSimulatedDate}`);
  console.log("");

  // Get monthly summaries
  const summaries = await engine.getMonthlySummaries(characterId, 3);
  if (summaries.length > 0) {
    console.log("📈 Monthly Summaries (Last 3 Months):");
    console.log("-".repeat(100));
    summaries.forEach((summary) => {
      const net = summary.totalIncome - summary.totalExpenses;
      const netStr =
        net >= 0 ? `+€${net.toFixed(2)}` : `-€${Math.abs(net).toFixed(2)}`;
      console.log(
        `${summary.month}  |  Income: €${summary.totalIncome.toFixed(2)}  |  Expenses: €${summary.totalExpenses.toFixed(2)}  |  Net: ${netStr}  |  Txns: ${summary.transactionCount}`,
      );
    });
    console.log("");
  }

  // Get recent transactions
  const transactions = await engine.getRecentTransactions(characterId, 50);
  if (transactions.length === 0) {
    console.log("⚠️  No transactions found.");
    await engine.close();
    return;
  }

  console.log(`📝 Recent Transactions (Last 50):`);
  console.log("-".repeat(100));
  console.log(
    "DATE         | AMOUNT       | DESCRIPTION                                    | MERCHANT              | BALANCE",
  );
  console.log("-".repeat(100));

  transactions.forEach((txn) => {
    const amountStr =
      txn.amount >= 0
        ? `+€${txn.amount.toFixed(2)}`.padEnd(13)
        : `-€${Math.abs(txn.amount).toFixed(2)}`.padEnd(13);
    const desc = txn.description.substring(0, 46).padEnd(46);
    const merchant = (txn.merchantName || "N/A").substring(0, 20).padEnd(20);
    const balance = `€${txn.balanceAfter.toFixed(2)}`;

    console.log(
      `${txn.date} | ${amountStr} | ${desc} | ${merchant} | ${balance}`,
    );
  });

  console.log("-".repeat(100));
  console.log(`\n✅ Total: ${transactions.length} transactions`);

  // Database stats
  const db = engine.getDatabase();
  if (db) {
    const stats = await db.getStats();
    console.log(`\n📊 Database Stats:`);
    console.log(
      `   - Total Transactions: ${stats.totalTransactions.toLocaleString()}`,
    );
    console.log(`   - Total Characters: ${stats.totalCharacters}`);
    console.log(`   - Total Advice Effects: ${stats.totalAdviceEffects}`);
  }

  await engine.close();
}

main().catch(console.error);
