import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

// Elämäpeli 2025 Game Agents
import { gameMasterAgent } from "./agents/game-master.ts";
import { scammerAgent } from "./agents/scammer-agent.ts";
import { friendAgent } from "./agents/friend-agent.ts";
import { parentAgent } from "./agents/parent-agent.ts";

// Game Tools
import { invokeScammerTool } from "./tools/invoke-scammer.ts";
import { invokeFriendTool } from "./tools/invoke-friend.ts";
import { invokeParentTool } from "./tools/invoke-parent.ts";

export const mastra = new Mastra({
  agents: {
    gameMasterAgent,
    scammerAgent,
    friendAgent,
    parentAgent,
  },
  tools: {
    invokeScammerTool,
    invokeFriendTool,
    invokeParentTool,
  },
  storage: new LibSQLStore({
    id: "mastra-agent-store",
    // Use file storage for persistence
    url: "file:../elamapeli.db",
  }),
  logger: new PinoLogger({
    name: "Elämäpeli-2025",
    level: "info",
  }),
});
