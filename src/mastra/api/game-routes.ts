/**
 * Game API Routes for Elämäpeli 2025
 *
 * Exposes the game orchestrator via HTTP endpoints
 */

import { registerApiRoute } from "@mastra/core/server";
import {
  processPlayerInput,
  createNewPlayer,
  getPlayerSummary,
} from "../game/orchestrator.ts";

/**
 * POST /game/message
 * Send a player message and get agent response
 */
export const gameMessageRoute = registerApiRoute("/game/message", {
  method: "POST",
  handler: async (c) => {
    try {
      const body = await c.req.json();
      const { playerId, message, playerState } = body;

      // Validate required fields
      if (!playerId || !message) {
        return c.json({ error: "playerId and message are required" }, 400);
      }

      // Get mastra instance from context
      const mastra = c.get("mastra");

      // Process the message through game orchestrator
      const response = await processPlayerInput(
        playerId,
        message,
        mastra,
        playerState,
      );

      return c.json(response);
    } catch (error) {
      console.error("Error in game message route:", error);
      return c.json(
        {
          error: "Failed to process message",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
});

/**
 * POST /game/start
 * Create a new player and start a new game
 */
export const gameStartRoute = registerApiRoute("/game/start", {
  method: "POST",
  handler: async (c) => {
    try {
      const body = await c.req.json();
      const { playerId } = body;

      if (!playerId) {
        return c.json({ error: "playerId is required" }, 400);
      }

      const playerState = createNewPlayer(playerId);
      const summary = getPlayerSummary(playerState);

      return c.json({ playerState, summary });
    } catch (error) {
      console.error("Error in game start route:", error);
      return c.json(
        {
          error: "Failed to start game",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
});
