/**
 * Hono RPC Typed Client
 *
 * Type-safe API client using Hono's inference
 * Imports types directly from backend for end-to-end type safety!
 */

import { hc } from "hono/client";
import type { GameApiType } from "@backend/mastra/api";

// Create fully typed client using backend route types
export const honoClient = hc<GameApiType>("/api/game");

// Usage example with FULL type safety:
// const response = await honoClient.init.$post({ json: { sessionId: "123" } });
// TypeScript knows the exact shape of the response!

export type { GameApiType };
