/**
 * Main Server Entry Point
 *
 * Standalone server that combines Mastra with custom game API routes
 */

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { mastra } from "./mastra/index.ts";
import { gameRoutes } from "./mastra/api/routes.ts";

const app = new Hono();

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

serve({
  fetch: app.fetch,
  port,
});

// Export for Mastra CLI compatibility
export { mastra };
