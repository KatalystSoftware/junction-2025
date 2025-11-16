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
  type CallSession,
} from "../services/gemini-live-service.ts";
import { loadSession } from "../persistence/session-store.ts";
import type { Character, Scenario } from "../types/game-types.ts";

interface LiveCallMessage {
  type: "start_call" | "audio_chunk" | "video_chunk" | "end_call" | "ping";
  sessionId?: string;
  characterId?: string;
  data?: string; // Base64 encoded audio/video
  format?: "pcm" | "opus" | "webm";
  language?: "english" | "finnish" | "swedish";
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
    path: "/api/game/live-call",
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
            console.log(
              "📞 Start call complete, activeCall exists:",
              !!activeCall,
              "sessionId:",
              message.sessionId
            );
            if (!activeCall) {
              console.error(
                "❌ Failed to create active call! activeCalls map size:",
                activeCalls.size
              );
              console.error(
                "   Available sessions:",
                Array.from(activeCalls.keys())
              );
            }
            break;

          case "audio_chunk":
            if (activeCall && message.data) {
              console.log(
                "📥 Received audio chunk from client, length:",
                message.data.length
              );
              await handleAudioChunk(activeCall, message.data);
            } else {
              console.warn(
                "⚠️ Received audio chunk but no active call or no data"
              );
              console.warn(
                "   activeCall exists:",
                !!activeCall,
                "message.data exists:",
                !!message.data
              );
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
      if (duration > 600) {
        // 10 minutes hard timeout
        console.log(`🧹 Cleaning up stale call: ${sessionId}`);
        handleEndCall(call);
        activeCalls.delete(sessionId);
      }
    }
  }, 60000); // Check every minute

  console.log(
    "🎙️ Live call WebSocket server initialized on /api/game/live-call"
  );
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
  const { sessionId, characterId, language = "english" } = message;

  if (!sessionId || !characterId) {
    throw new Error("sessionId and characterId are required");
  }

  console.log(`🎙️ Starting live call for thread ${characterId}`);

  // Load session to get character and scenario
  const session = await loadSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Find the thread by thread ID (characterId is actually the thread/contact ID from frontend)
  const threadId = characterId;

  // Debug: log available data
  console.log(
    "📋 Available activeThreads:",
    Object.keys(session.advisorState.activeThreads || {})
  );
  const metadataKeys =
    session.threadMetadata instanceof Map
      ? Array.from(session.threadMetadata.keys())
      : Object.keys(session.threadMetadata || {});
  console.log("📋 Available threadMetadata:", metadataKeys);

  // Import character pool to get character and scenario
  const { characterPool } = await import("../game/character-pool-manager.ts");

  let character: Character | undefined;
  let scenario: Scenario | undefined;

  // Get thread info from active threads
  const thread = session.advisorState.activeThreads?.[threadId];

  if (thread) {
    // Active thread found - get character and scenario using the IDs
    console.log(
      `📞 Found active thread: characterId=${thread.characterId}, scenarioId=${thread.scenarioId}`
    );

    character = characterPool.getCharacter(thread.characterId);
    scenario = characterPool.getScenario(thread.scenarioId);

    if (!character || !scenario) {
      console.error("❌ Thread found but character/scenario not in pool");
      console.error("   characterId:", thread.characterId);
      console.error("   scenarioId:", thread.scenarioId);
    }
  } else {
    // Thread not in activeThreads - try to reconstruct from threadMetadata and session history
    const metadata =
      session.threadMetadata?.get?.(threadId) ||
      (session.threadMetadata as any)?.[threadId];

    console.log(
      "🔧 Thread not in activeThreads, attempting reconstruction for:",
      threadId
    );
    console.log("   Metadata found:", metadata);

    // If we can't find by thread, try to find the most recent session
    let targetCharacterId: string | undefined = metadata?.characterId;

    if (!targetCharacterId && session.advisorState.sessionHistory.length > 0) {
      // Get the most recent session as fallback
      const recentSession =
        session.advisorState.sessionHistory[
          session.advisorState.sessionHistory.length - 1
        ];
      targetCharacterId = recentSession.characterId;
      console.log(
        `   Using most recent session's character: ${recentSession.characterName} (${targetCharacterId})`
      );
    }

    if (targetCharacterId) {
      character = characterPool.getCharacter(targetCharacterId);

      if (character) {
        // Find the most recent scenario for this character
        const characterSessions = session.advisorState.sessionHistory
          .filter((s) => s.characterId === targetCharacterId)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        if (characterSessions.length > 0) {
          const recentScenarioId = characterSessions[0].scenarioId;
          scenario = characterPool.getScenario(recentScenarioId);
        }
      }
    }
  }

  // Check if this is a boss call (special handling with ElevenLabs)
  const isBossCall = threadId === "boss-pinned";

  // Final validation (skip for boss calls)
  if (!isBossCall && (!character || !scenario)) {
    console.error(
      "❌ Could not find character or scenario for thread:",
      threadId
    );
    console.error("   Thread:", thread);
    throw new Error(
      `Thread ${threadId} not found or incomplete. Cannot start live call.`
    );
  }

  if (isBossCall) {
    console.log(`✅ Boss call setup - using ElevenLabs Conversational AI`);
  } else {
    console.log(`✅ Live call setup: ${character.name} - ${scenario.topic}`);
  }

  let callSession: CallSession;
  let geminiWs: any;

  if (isBossCall) {
    // Boss call - use ElevenLabs Conversational AI
    const liveSessionId = `live_boss_${Date.now()}`;

    callSession = {
      sessionId: liveSessionId,
      characterId: "boss",
      startTime: Date.now(),
      callDurationSeconds: 0,
      isActive: true,
      problemSolved: false,
      conversationTurns: 0,
    };

    // Connect to ElevenLabs Conversational AI
    geminiWs = await connectToElevenLabsAgent(callSession, clientWs, language);
  } else {
    // Regular character call - use Gemini Live API
    const { sessionId: liveSessionId, config } = await createLiveSession(
      character!,
      scenario!
    );

    callSession = {
      sessionId: liveSessionId,
      characterId: character!.characterId,
      startTime: Date.now(),
      callDurationSeconds: 0,
      isActive: true,
      problemSolved: false,
      conversationTurns: 0,
    };

    // Initialize Gemini Live API connection
    geminiWs = await connectToGeminiLive(config, callSession, clientWs);
  }

  const activeCall: ActiveCall = {
    callSession,
    character: isBossCall
      ? ({
          characterId: "boss",
          name: "Boss",
          age: 45,
          occupation: "Senior Financial Advisor",
        } as any)
      : character!,
    scenario: isBossCall
      ? ({
          scenarioId: "boss-call",
          topic: "performance-review",
        } as any)
      : scenario!,
    geminiWs,
    clientWs,
    recentResponses: [],
    recentExchanges: [],
    currentResponse: "",
  };

  // Store by BOTH the live session ID and the game session ID for lookup
  activeCalls.set(callSession.sessionId, activeCall);
  activeCalls.set(sessionId, activeCall); // Also store by game session ID for audio chunk lookup
  console.log(
    "✅ Stored active call with keys:",
    callSession.sessionId,
    "and",
    sessionId
  );

  // Set active call reference in gemini WebSocket for response tracking
  if (geminiWs.setActiveCall) {
    geminiWs.setActiveCall(activeCall);
  }

  // Send confirmation to client (only for non-boss calls, boss sends it in connectToElevenLabsAgent)
  if (!isBossCall) {
    clientWs.send(
      JSON.stringify({
        type: "call_started",
        sessionId: callSession.sessionId,
        character: {
          name: character!.name,
          age: character!.age,
          occupation: character!.occupation,
        },
      })
    );
  }

  // Start hang-up monitoring
  startHangUpMonitoring(activeCall);
}

/**
 * Connect to ElevenLabs Conversational AI for boss calls
 */
async function connectToElevenLabsAgent(
  callSession: CallSession,
  clientWs: WebSocket,
  language: "english" | "finnish" | "swedish" = "english"
): Promise<any> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required for boss calls");
  }

  // ElevenLabs Conversational AI agent ID
  const BOSS_AGENT_ID = "agent_7201ka5kvscgevbvc4kkpvvzee5c";

  console.log("📞 Connecting to ElevenLabs Conversational AI...");
  console.log("    Agent ID:", BOSS_AGENT_ID);
  console.log(
    "    API key present:",
    apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "No"
  );

  // ElevenLabs Conversational AI WebSocket URL
  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${BOSS_AGENT_ID}`;

  const elevenLabsWs = new WebSocket(wsUrl, {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  let isConnected = false;

  elevenLabsWs.on("open", () => {
    console.log("✅ Connected to ElevenLabs Conversational AI");
    isConnected = true;

    // Send call_started to client
    clientWs.send(
      JSON.stringify({
        type: "call_started",
        sessionId: callSession.sessionId,
        character: {
          name: "Boss",
          age: 45,
          occupation: "Senior Financial Advisor",
        },
      })
    );

    // Send language configuration to ElevenLabs
    const languageCode =
      language === "finnish" ? "fi" : language === "swedish" ? "sv" : "en";
    const initMessage = {
      type: "conversation_initiation_client_data",
      conversation_config_override: {
        agent: {
          language: languageCode,
        },
      },
    };

    console.log(`🌍 Setting language to: ${language} (${languageCode})`);
    elevenLabsWs.send(JSON.stringify(initMessage));

    // Agent should start speaking automatically with its configured first message
    console.log("🎙️ Waiting for boss to start speaking...");
  });

  elevenLabsWs.on("message", (data: Buffer, isBinary: boolean) => {
    console.log(
      "📨 Received message from ElevenLabs, size:",
      data.length,
      "bytes, binary:",
      isBinary
    );

    if (isBinary) {
      // Binary audio data - forward directly to client as base64
      console.log("🎵 Received binary audio from boss");
      const base64Audio = data.toString("base64");
      clientWs.send(
        JSON.stringify({
          type: "audio_chunk",
          data: base64Audio,
        })
      );
    } else {
      // JSON message
      try {
        const response = JSON.parse(data.toString());
        console.log(
          "📨 ElevenLabs JSON response:",
          JSON.stringify(response, null, 2)
        );

        // Handle various ElevenLabs event types
        if (response.type === "conversation_initiation_metadata") {
          console.log("✅ Conversation initiated");
        } else if (
          response.type === "audio" &&
          response.audio_event?.audio_base_64
        ) {
          // Extract and forward audio to client
          console.log("🎵 Received JSON audio event, forwarding to client");
          clientWs.send(
            JSON.stringify({
              type: "audio_chunk",
              data: response.audio_event.audio_base_64,
            })
          );
        } else if (
          response.type === "agent_response" &&
          response.agent_response_event?.agent_response
        ) {
          // Extract transcript
          const text = response.agent_response_event.agent_response.trim();
          console.log("💬 Boss said:", text);
          clientWs.send(
            JSON.stringify({
              type: "character_message",
              text: text,
              isFinal: false,
            })
          );
        } else if (response.type === "interruption") {
          console.log("🔇 User interrupted boss");
        } else if (response.type === "ping") {
          // Respond to ping to keep connection alive
          const eventId = response.ping_event?.event_id || 0;
          console.log("🏓 Responding to ping, event_id:", eventId);

          // Try simple flat structure
          const pongResponse = {
            type: "pong",
            event_id: eventId,
          };
          console.log("🏓 Sending pong:", JSON.stringify(pongResponse));
          elevenLabsWs.send(JSON.stringify(pongResponse));
        }
      } catch (error) {
        console.error("❌ Error parsing ElevenLabs JSON:", error);
        console.error("   Raw data:", data.toString().substring(0, 200));
      }
    }
  });

  elevenLabsWs.on("error", (error) => {
    console.error("❌ ElevenLabs WebSocket error:", error);
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Boss call connection error",
      })
    );
  });

  elevenLabsWs.on("close", (code, reason) => {
    console.log("📡 ElevenLabs connection closed");
    console.log("   Close code:", code);
    console.log("   Close reason:", reason.toString());
    isConnected = false;

    // Remove all listeners to stop ping/pong after close
    elevenLabsWs.removeAllListeners();
  });

  // Return wrapper with send method (compatible with Gemini interface)
  return {
    send: (message: any) => {
      if (isConnected) {
        console.log(
          "📤 Forwarding message to ElevenLabs:",
          JSON.stringify(message).substring(0, 200)
        );
        // Convert to ElevenLabs format
        if (message.client_content) {
          const audioData =
            message.client_content.turns?.[0]?.parts?.[0]?.inline_data?.data;
          if (audioData) {
            console.log(
              "🎤 Sending user audio to ElevenLabs, base64 length:",
              audioData.length
            );
            // ElevenLabs expects binary PCM audio data, not base64
            // Decode base64 to binary buffer
            const audioBuffer = Buffer.from(audioData, "base64");
            console.log(
              "🎤 Converted to binary buffer, size:",
              audioBuffer.length,
              "bytes"
            );
            elevenLabsWs.send(audioBuffer);
          }
        }
      }
    },
    close: () => {
      elevenLabsWs.close();
    },
    isConnected: () => isConnected,
    setActiveCall: () => {}, // No-op for compatibility
    readyState: elevenLabsWs.readyState, // Expose readyState for compatibility
    get readyState() {
      return elevenLabsWs.readyState;
    }, // Dynamic getter
  };
}

/**
 * Connect to Gemini Live API WebSocket
 */
async function connectToGeminiLive(
  config: any,
  callSession: CallSession,
  clientWs: WebSocket
): Promise<any> {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY or GOOGLE_CLOUD_API_KEY is required");
  }

  console.log("📡 Connecting to Gemini Live API...");
  console.log("    Model:", config.model);
  console.log("    Character:", callSession.characterId);
  console.log(
    "    API key present:",
    apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "No"
  );

  // Use gemini-2.5-flash-live for real-time audio (Live API)
  const model = config.model || "gemini-2.5-flash-live";

  // Try Vertex AI endpoint first (if GOOGLE_CLOUD_API_KEY is set), otherwise use AI Studio
  const isVertexAI = !!process.env.GOOGLE_CLOUD_API_KEY;
  const region = process.env.GOOGLE_CLOUD_REGION || "us-central1";

  let wsUrl: string;
  if (isVertexAI) {
    // Vertex AI WebSocket URL with API key
    wsUrl = `wss://${region}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?key=${apiKey}`;
    console.log("    Using Vertex AI endpoint");
    console.log("    Region:", region);
  } else {
    // AI Studio WebSocket URL
    wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    console.log("    Using AI Studio endpoint");
  }

  console.log("    WebSocket URL:", wsUrl.replace(apiKey, "REDACTED"));

  const geminiWs = new WebSocket(wsUrl);

  // Setup message queue to send after connection opens
  const messageQueue: any[] = [];
  let isConnected = false;

  geminiWs.on("open", () => {
    console.log("✅ Connected to Gemini Live API");
    isConnected = true;

    // Send setup message with model configuration
    const setupMessage = {
      setup: {
        model: `models/${model}`,
        generation_config: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: "Aoede", // Female Finnish voice
              },
            },
          },
        },
        system_instruction: {
          parts: [
            {
              text: config.systemInstruction,
            },
          ],
        },
      },
    };

    console.log("📤 Sending setup to Gemini:");
    console.log("   Model:", setupMessage.setup.model);
    console.log(
      "   Response modalities:",
      setupMessage.setup.generation_config.response_modalities
    );
    console.log(
      "   Voice:",
      setupMessage.setup.generation_config.speech_config.voice_config
        .prebuilt_voice_config.voice_name
    );
    console.log(
      "   System instruction length:",
      setupMessage.setup.system_instruction.parts[0].text.length,
      "chars"
    );

    geminiWs.send(JSON.stringify(setupMessage));
    console.log("✅ Setup message sent");

    // Send any queued messages
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      geminiWs.send(JSON.stringify(msg));
    }
  });

  // Store active call reference for message handler
  let currentActiveCall: ActiveCall | null = null;

  geminiWs.on("message", (data: Buffer) => {
    console.log("📨 Received message from Gemini, size:", data.length, "bytes");
    try {
      const response = JSON.parse(data.toString());
      console.log(
        "📨 Full Gemini response:",
        JSON.stringify(response, null, 2)
      );

      // Handle server content (audio from Gemini)
      if (response.serverContent) {
        console.log("🎵 Received server content from Gemini");
        handleGeminiServerContent(
          response.serverContent,
          clientWs,
          currentActiveCall || undefined
        );
      }

      // Handle setup complete
      if (response.setupComplete) {
        console.log("✅ Gemini Live setup complete");

        // IMPORTANT: Gemini Live expects the user to speak first
        // We need to simulate this by sending a minimal audio prompt or text
        // Let's send an empty turn to signal we're ready to hear from the character
        const initialPrompt = {
          client_content: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: "Hello?",
                  },
                ],
              },
            ],
            turn_complete: true,
          },
        };

        console.log(
          "📞 Sending initial prompt:",
          JSON.stringify(initialPrompt, null, 2)
        );
        geminiWs.send(JSON.stringify(initialPrompt));
      }

      // Handle turn complete
      if (response.turnComplete) {
        console.log("🔄 Turn complete");
      }

      // Log any other fields we might be missing
      const knownFields = ["serverContent", "setupComplete", "turnComplete"];
      const unknownFields = Object.keys(response).filter(
        (k) => !knownFields.includes(k)
      );
      if (unknownFields.length > 0) {
        console.log("❓ Unknown response fields:", unknownFields, response);
      }
    } catch (error) {
      console.error("❌ Error parsing Gemini response:", error);
      console.error("   Raw data:", data.toString());
    }
  });

  geminiWs.on("error", (error) => {
    console.error("❌ Gemini WebSocket error:", error);
    console.error("   Error details:", JSON.stringify(error, null, 2));
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Gemini connection error",
      })
    );
  });

  geminiWs.on("close", (code, reason) => {
    console.log("📡 Gemini connection closed");
    console.log("   Close code:", code);
    console.log("   Close reason:", reason.toString());
    isConnected = false;
  });

  // Return wrapper with send method
  return {
    send: (message: any) => {
      if (isConnected) {
        geminiWs.send(JSON.stringify(message));
      } else {
        messageQueue.push(message);
      }
    },
    close: () => {
      geminiWs.close();
    },
    isConnected: () => isConnected,
    setActiveCall: (call: ActiveCall | null) => {
      currentActiveCall = call;
    },
  };
}

/**
 * Handle server content (audio/text) from Gemini
 */
function handleGeminiServerContent(
  serverContent: any,
  clientWs: WebSocket,
  activeCall?: ActiveCall
): void {
  if (serverContent.modelTurn) {
    const parts = serverContent.modelTurn.parts || [];
    let textContent = "";
    let audioChunks = 0;

    for (const part of parts) {
      // Handle audio data
      if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
        audioChunks++;
        // Send audio chunk to client
        clientWs.send(
          JSON.stringify({
            type: "audio_chunk",
            data: part.inlineData.data, // Base64 encoded audio
          })
        );
      }

      // Handle text (for debugging/subtitles and hang-up detection)
      if (part.text) {
        textContent += part.text;

        clientWs.send(
          JSON.stringify({
            type: "character_message",
            text: part.text,
            isFinal: false,
          })
        );
      }
    }

    if (audioChunks > 0) {
      console.log(`🎵 Sent ${audioChunks} audio chunks to client`);
    }
    if (textContent) {
      console.log(`💬 Character said: ${textContent.substring(0, 100)}`);
    }

    // Track response for hang-up detection
    if (activeCall && textContent) {
      activeCall.currentResponse += textContent;
    }
  }

  // Handle turn complete
  if (serverContent.turnComplete && activeCall) {
    if (activeCall.currentResponse) {
      console.log(
        `✅ Turn complete, full response: ${activeCall.currentResponse}`
      );
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
  }
}

/**
 * Handle incoming audio chunk from client
 */
async function handleAudioChunk(
  activeCall: ActiveCall,
  audioData: string
): Promise<void> {
  // Check if this is an ElevenLabs call (boss) or Gemini call
  const isBossCall = activeCall.callSession.characterId === "boss";

  if (isBossCall) {
    // ElevenLabs expects JSON with user_audio_chunk field (base64)
    console.log(
      "🎤 Sending user audio to ElevenLabs (boss call), base64 length:",
      audioData.length
    );

    const audioMessage = {
      user_audio_chunk: audioData, // Base64 encoded PCM audio
    };

    // Send JSON message to ElevenLabs
    if (activeCall.geminiWs.readyState === 1) {
      // WebSocket.OPEN
      activeCall.geminiWs.send(JSON.stringify(audioMessage));
      console.log("✅ Sent user_audio_chunk to ElevenLabs");
    } else {
      console.warn(
        "⚠️ ElevenLabs WebSocket not open, state:",
        activeCall.geminiWs.readyState
      );
    }
  } else {
    // Send audio to Gemini in the expected format
    const clientContent = {
      client_content: {
        turns: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "audio/pcm",
                  data: audioData, // Already base64 encoded
                },
              },
            ],
          },
        ],
        turn_complete: false, // Streaming chunks
      },
    };

    activeCall.geminiWs.send(clientContent);
  }

  // Update call duration
  activeCall.callSession.callDurationSeconds = Math.floor(
    (Date.now() - activeCall.callSession.startTime) / 1000
  );
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

    const duration = Math.floor(
      (Date.now() - activeCall.callSession.startTime) / 1000
    );
    console.log(
      `🔍 Hang-up check: ${duration}s, responses: ${activeCall.recentResponses.length}, turns: ${activeCall.callSession.conversationTurns}`
    );

    const hangUpReason = shouldCharacterHangUp(
      activeCall.callSession,
      activeCall.character,
      activeCall.recentResponses,
      activeCall.recentExchanges
    );

    if (hangUpReason) {
      console.log(
        `📞 Character hanging up:`,
        hangUpReason.reason,
        hangUpReason.message
      );

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
