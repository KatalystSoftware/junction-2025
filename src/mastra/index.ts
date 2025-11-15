import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import path from "path";
import { fileURLToPath } from "url";

// Financial Advisor Simulator Agents
import { gameMasterAgent } from "./agents/game-master.ts";
import { godBossAgent } from "./agents/god-boss-agent.ts";
import { evaluatorAgent } from "./agents/evaluator-agent.ts";
// Note: Character agents are created dynamically via character-agent-factory

// Game Tools
import { invokeCharacterTool } from "./tools/invoke-character-tool.ts";
import { invokeGodBossTool } from "./tools/invoke-god-boss-tool.ts";
import { evaluateAdviceTool } from "./tools/evaluate-advice-tool.ts";

// Character Pool Manager
import { characterPool } from "./game/character-pool-manager.ts";

// Get current file path for resolving character files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mastra = new Mastra({
  agents: {
    gameMasterAgent,
    godBossAgent,
    evaluatorAgent,
    // Character agents are created dynamically as needed
  },
  tools: {
    invokeCharacterTool,
    invokeGodBossTool,
    evaluateAdviceTool,
  },
  storage: new LibSQLStore({
    id: "mastra-agent-store",
    // Use file storage for persistence
    url: "file:../elamapeli.db",
  }),
  logger: new PinoLogger({
    name: "Financial-Advisor-Simulator",
    level: "info",
  }),
});

// Initialize character pool on startup
async function initializeCharacterPool() {
  const charactersPath = path.join(
    __dirname,
    "../../characters/individuals",
  );
  const scenariosPath = path.join(__dirname, "../../characters/scenarios");

  try {
    await characterPool.loadFromFiles(charactersPath, scenariosPath);
    console.log("✅ Character pool initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize character pool:", error);
  }
}

// Initialize on module load
initializeCharacterPool().catch(console.error);

export { characterPool };
