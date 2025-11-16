/**
 * WebSocket Server for Gemini Live API Calls
 *
 * Handles real-time bidirectional audio/video streaming between
 * frontend clients and Gemini Live API, maintaining character personality
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import {
  createLiveSession,
  shouldCharacterHangUp,
  initializeLiveClient,
  type CallSession,
  type HangUpReason,
} from "../services/gemini-live-service.ts";
import { loadSession } from "../persistence/session-store.ts";
import type { Character, Scenario } from "../types/game-types.ts";

interface LiveCallMessage {
  type: "start_call" | "audio_chunk" | "video_chunk" | "end_call" | "ping";
  sessionId?: string;
  characterId?: string;
  data?: string; // Base64 encoded audio/video
  format?: "pcm" | "opus" | "webm";
}

interface GeminiLiveMessage {
  type: "setup" | "audio_chunk" | "text_chunk" | "end_of_turn" | "error";
  data?: any;
}

interface ActiveCall {
  callSession: CallSession;
  character: Character;
  scenario: Scenario;
  geminiWs: any; // WebSocket connection to Gemini
  clientWs: WebSocket;
  recentResponses: string[];
  recentExchanges: string[];
  currentResponse: string;
}

const activeCalls = new Map<string, ActiveCall>();

/**
 * Initialize WebSocket server for live calls
 */
export function initializeLiveCallWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: "/api/game/live-call"
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("🎙️ Live call WebSocket client connected");

    let activeCall: ActiveCall | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message: LiveCallMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "start_call":
            await handleStartCall(ws, message, activeCalls);
            activeCall = activeCalls.get(message.sessionId!) || null;
            break;

          case "audio_chunk":
            if (activeCall && message.data) {
              await handleAudioChunk(activeCall, message.data);
            }
            break;

          case "video_chunk":
            if (activeCall && message.data) {
              await handleVideoChunk(activeCall, message.data);
            }
            break;

          case "end_call":
            if (activeCall) {
              await handleEndCall(activeCall);
              activeCalls.delete(activeCall.callSession.sessionId);
              activeCall = null;
            }
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.error("❌ Error handling WebSocket message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("🎙️ Live call WebSocket client disconnected");
      if (activeCall) {
        handleEndCall(activeCall);
        activeCalls.delete(activeCall.callSession.sessionId);
      }
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });
  });

  // Periodic cleanup of stale calls
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, call] of activeCalls.entries()) {
      const duration = (now - call.callSession.startTime) / 1000;
      if (duration > 600) { // 10 minutes hard timeout
        console.log(`🧹 Cleaning up stale call: ${sessionId}`);
        handleEndCall(call);
        activeCalls.delete(sessionId);
      }
    }
  }, 60000); // Check every minute

  console.log("🎙️ Live call WebSocket server initialized on /api/game/live-call");
  return wss;
}

/**
 * Handle starting a new live call
 */
async function handleStartCall(
  clientWs: WebSocket,
  message: LiveCallMessage,
  activeCalls: Map<string, ActiveCall>
): Promise<void> {
  const { sessionId, characterId } = message;

  if (!sessionId || !characterId) {
    throw new Error("sessionId and characterId are required");
  }

  console.log(`🎙️ Starting live call for character ${characterId}`);

  // Load session to get character and scenario
  const session = await loadSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Find the character and current scenario
  const thread = Object.values(session.advisorState.activeThreads).find(
    (t) => t.characterId === characterId
  );

  if (!thread) {
    throw new Error(`No active thread found for character: ${characterId}`);
  }

  const character = thread.character;
  const scenario = thread.scenario;

  // Create live session configuration
  const { sessionId: liveSessionId, config } = await createLiveSession(
    character,
    scenario
  );

  const callSession: CallSession = {
    sessionId: liveSessionId,
    characterId: character.characterId,
    startTime: Date.now(),
    callDurationSeconds: 0,
    isActive: true,
    problemSolved: false,
    conversationTurns: 0,
  };

  // Initialize Gemini Live API connection
  const geminiWs = await connectToGeminiLive(config, callSession, clientWs);

  const activeCall: ActiveCall = {
    callSession,
    character,
    scenario,
    geminiWs,
    clientWs,
    recentResponses: [],
    recentExchanges: [],
    currentResponse: "",
  };

  activeCalls.set(liveSessionId, activeCall);

  // Send confirmation to client
  clientWs.send(
    JSON.stringify({
      type: "call_started",
      sessionId: liveSessionId,
      character: {
        name: character.name,
        age: character.age,
        occupation: character.occupation,
      },
    })
  );

  // Start hang-up monitoring
  startHangUpMonitoring(activeCall);
}

/**
 * Connect to Gemini Live API WebSocket
 */
async function connectToGeminiLive(
  config: any,
  callSession: CallSession,
  clientWs: WebSocket
): Promise<any> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required");
  }

  // Gemini Live API WebSocket URL
  // Note: The actual implementation would use Google's SDK
  // For now, this is a placeholder showing the architecture

  // In the real implementation, you would use:
  // const genAI = initializeLiveClient();
  // const liveSession = await genAI.startLiveSession(config);

  console.log("📡 Connecting to Gemini Live API...");
  console.log("⚠️  Note: Full Gemini Live API WebSocket integration requires SDK updates");
  console.log("    Model:", config.model);
  console.log("    Character:", callSession.characterId);

  // Placeholder: In production, this would return the actual Gemini WebSocket connection
  // and handle bidirectional streaming

  const mockGeminiWs = {
    send: (data: any) => {
      // Forward to Gemini Live API
      console.log("📤 Sending to Gemini:", data.type);
    },
    on: (event: string, handler: Function) => {
      // Handle events from Gemini
      console.log("📥 Registered handler for:", event);
    },
    close: () => {
      console.log("📡 Closing Gemini connection");
    },
  };

  return mockGeminiWs;
}

/**
 * Handle incoming audio chunk from client
 */
async function handleAudioChunk(
  activeCall: ActiveCall,
  audioData: string
): Promise<void> {
  // Decode base64 audio data
  const audioBuffer = Buffer.from(audioData, "base64");

  // Forward to Gemini Live API
  activeCall.geminiWs.send({
    type: "audio_chunk",
    data: audioBuffer,
  });

  // Update call duration
  activeCall.callSession.callDurationSeconds =
    Math.floor((Date.now() - activeCall.callSession.startTime) / 1000);
}

/**
 * Handle incoming video chunk from client (for video calls)
 */
async function handleVideoChunk(
  activeCall: ActiveCall,
  videoData: string
): Promise<void> {
  const videoBuffer = Buffer.from(videoData, "base64");

  // Forward to Gemini Live API
  activeCall.geminiWs.send({
    type: "video_chunk",
    data: videoBuffer,
  });
}

/**
 * Monitor call for hang-up conditions
 */
function startHangUpMonitoring(activeCall: ActiveCall): void {
  const monitorInterval = setInterval(() => {
    if (!activeCall.callSession.isActive) {
      clearInterval(monitorInterval);
      return;
    }

    const hangUpReason = shouldCharacterHangUp(
      activeCall.callSession,
      activeCall.character,
      activeCall.recentResponses,
      activeCall.recentExchanges
    );

    if (hangUpReason) {
      console.log(`📞 Character hanging up:`, hangUpReason.reason);

      // Send hang-up message if character has one
      if (hangUpReason.message) {
        activeCall.clientWs.send(
          JSON.stringify({
            type: "character_message",
            text: hangUpReason.message,
            isFinal: true,
          })
        );
      }

      // End the call
      setTimeout(() => {
        activeCall.clientWs.send(
          JSON.stringify({
            type: "call_ended",
            reason: hangUpReason.reason,
          })
        );
        handleEndCall(activeCall);
        clearInterval(monitorInterval);
      }, 2000); // Give 2 seconds for final message to play
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Handle call cleanup
 */
async function handleEndCall(activeCall: ActiveCall): Promise<void> {
  console.log(`📞 Ending call: ${activeCall.callSession.sessionId}`);

  activeCall.callSession.isActive = false;

  // Close Gemini connection
  if (activeCall.geminiWs) {
    activeCall.geminiWs.close();
  }

  // Update call session metadata (could save to database)
  const finalDuration = Math.floor(
    (Date.now() - activeCall.callSession.startTime) / 1000
  );
  console.log(`📊 Call stats:`, {
    duration: `${finalDuration}s`,
    turns: activeCall.callSession.conversationTurns,
    problemSolved: activeCall.callSession.problemSolved,
  });
}

/**
 * Handle response from Gemini Live API
 */
function handleGeminiResponse(
  activeCall: ActiveCall,
  response: GeminiLiveMessage
): void {
  switch (response.type) {
    case "audio_chunk":
      // Forward audio to client
      activeCall.clientWs.send(
        JSON.stringify({
          type: "audio_chunk",
          data: response.data, // Base64 encoded audio
        })
      );
      break;

    case "text_chunk":
      // Accumulate text for hang-up detection
      activeCall.currentResponse += response.data;
      break;

    case "end_of_turn":
      // Turn completed
      if (activeCall.currentResponse) {
        activeCall.recentResponses.push(activeCall.currentResponse);
        activeCall.recentExchanges.push(activeCall.currentResponse);

        // Keep only last 10 responses
        if (activeCall.recentResponses.length > 10) {
          activeCall.recentResponses.shift();
        }
        if (activeCall.recentExchanges.length > 20) {
          activeCall.recentExchanges.shift();
        }

        activeCall.currentResponse = "";
        activeCall.callSession.conversationTurns++;
      }
      break;

    case "error":
      console.error("❌ Gemini Live API error:", response.data);
      activeCall.clientWs.send(
        JSON.stringify({
          type: "error",
          error: response.data,
        })
      );
      break;
  }
}
