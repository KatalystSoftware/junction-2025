/**
 * Main Server Entry Point
 *
 * Standalone server that combines Mastra with custom game API routes
 */

import { createServer } from "http";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { mastra } from "./mastra/index.ts";
import { gameRoutes } from "./mastra/api/routes.ts";
import { checkPostgresHealth } from "./mastra/config/postgres-health.ts";
import { initializeLeaderboard } from "./mastra/game/orchestrator-hooks.ts";
import { startPortfolioImpactWorker } from "./mastra/services/portfolio-impact-worker.ts";
import { initializeLiveCallWebSocket } from "./mastra/api/live-call-websocket.ts";

const app = new Hono();

app.get("/health/db", async (c) => {
  const healthy = await checkPostgresHealth();

  if (!healthy) {
    return c.json({ status: "error" }, 500);
  }

  return c.json({ status: "ok" });
});

// Mount custom game API routes first
app.route("/api/game", gameRoutes);

// If Mastra provides a Hono app, mount it
// This gives us both Mastra's built-in routes AND our custom routes
try {
  // Mastra might export an API or server - check what's available
  if (typeof (mastra as any).getApiRoutes === "function") {
    const mastraRoutes = (mastra as any).getApiRoutes();
    app.route("/", mastraRoutes);
  }
} catch (error) {
  console.log("ℹ️ Mastra routes not available (this is OK)");
}

// Serve static files from the public directory (production frontend build)
app.use(
  "/*",
  serveStatic({
    root: "./public",
  })
);

// SPA fallback - serve index.html for all non-API routes
app.get("*", serveStatic({ path: "./public/index.html" }));

const port = process.env.PORT ? parseInt(process.env.PORT) : 4111;

console.log(`🚀 Server starting on port ${port}`);
console.log(`📡 Game API available at http://localhost:${port}/api/game`);
console.log(`🌐 Frontend available at http://localhost:${port}`);

// Initialize leaderboard system on startup
initializeLeaderboard().catch((error) => {
  console.error("Failed to initialize leaderboard on startup:", error);
});

// Start portfolio impact background worker
startPortfolioImpactWorker();

// Create HTTP server for both Hono and WebSocket
const server = createServer((req, res) => {
  // Use Hono's fetch handler
  app.fetch(req as any).then((response) => {
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    response.arrayBuffer().then((buffer) => {
      res.end(Buffer.from(buffer));
    });
  });
});

// Initialize WebSocket server for live calls
const liveCallWss = initializeLiveCallWebSocket(server);
console.log(
  `🎙️ Live Call WebSocket available at ws://localhost:${port}/api/game/live-call`
);

// Start server
server.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

// Export for Mastra CLI compatibility
export { mastra };
