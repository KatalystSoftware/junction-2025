/**
 * useGame - All-in-One Game Integration Hook
 *
 * Combines session management and messaging into a single hook
 * Use this for quick integration with minimal boilerplate
 */

import { useGameSession } from "./useGameSession";
import { useSendMessage } from "./useSendMessage";
import { useEffect, useState } from "react";
import type { GameResponse } from "../services/gameApi";

export interface UseGameReturn {
  // Session State
  sessionId: string;
  advisorState: any;
  isNewSession: boolean | undefined;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;

  // Loading States
  isLoading: boolean;
  isSending: boolean;
  isStarting: boolean;

  // Errors
  error: any;
  sendError: any;
  startError: any;

  // Actions
  startConsultation: (
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ) => void;
  sendMessage: (
    threadId: string,
    message: string,
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ) => void;

  // Latest Response
  lastResponse: GameResponse | undefined;

  // Utility
  updateState: (newState: any) => void;
}

/**
 * Main game hook - use this in your components
 *
 * @example
 * ```tsx
 * const game = useGame();
 *
 * // Start game on mount
 * useEffect(() => {
 *   if (game.advisorState && !game.advisorState.hasCompletedOnboarding) {
 *     game.startConsultation();
 *   }
 * }, [game.advisorState]);
 *
 * // Send message
 * const handleSend = (threadId: string, message: string) => {
 *   game.sendMessage(threadId, message);
 * };
 *
 * // Show typing indicator
 * {game.isSending && <div>Typing...</div>}
 *
 * // Display response
 * {game.lastResponse?.messages?.map(msg => <p>{msg}</p>)}
 * ```
 */
export function useGame(): UseGameReturn {
  const session = useGameSession();
  const messaging = useSendMessage();
  const [lastResponse, setLastResponse] = useState<GameResponse | undefined>(
    undefined,
  );

  // Track latest response from either mutation
  useEffect(() => {
    if (session.startData) {
      console.log("📥 Got startConsultation response:", session.startData.type);
      setLastResponse(session.startData);
    }
  }, [session.startData]);

  useEffect(() => {
    if (messaging.data) {
      console.log("📥 Got sendMessage response:", messaging.data.type);
      setLastResponse(messaging.data);
    }
  }, [messaging.data]);

  const sendMessage = (
    threadId: string,
    message: string,
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ) => {
    if (!session.advisorState) {
      console.error("Cannot send message: advisorState not loaded");
      return;
    }

    messaging.sendMessage({
      threadId,
      message,
      advisorState: session.advisorState,
      conversationHistory: [], // Could be enhanced to track history
      threadHistories,
      threadMetadata,
    });
  };

  const startConsultation = (
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ) => {
    if (!session.advisorState) {
      console.error("Cannot start consultation: advisorState not loaded");
      return;
    }

    session.startConsultation({
      advisorState: session.advisorState,
      threadHistories,
      threadMetadata,
    });
  };

  return {
    // Session
    sessionId: session.sessionId,
    advisorState: session.advisorState,
    isNewSession: session.isNewSession,
    threadHistories: session.threadHistories,
    threadMetadata: session.threadMetadata,

    // Loading States
    isLoading: session.isLoading,
    isSending: messaging.isSending,
    isStarting: session.isStarting,

    // Errors
    error: session.error,
    sendError: messaging.error,
    startError: session.startError,

    // Actions
    startConsultation,
    sendMessage,

    // Latest Response - tracked from both sources
    lastResponse,

    // Utility
    updateState: session.updateAdvisorState,
  };
}

// Export for convenience
export type { GameResponse } from "../services/gameApi";
