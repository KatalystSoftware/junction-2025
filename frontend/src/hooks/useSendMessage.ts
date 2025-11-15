/**
 * useSendMessage Hook
 *
 * Hook for sending messages in active conversation threads
 * Handles optimistic updates and state synchronization
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gameApi,
  type AdvisorState,
  type GameResponse,
} from "../services/gameApi";
import { getOrCreateSessionId } from "../services/sessionManager";

interface SendMessageParams {
  threadId: string;
  message: string;
  advisorState: AdvisorState;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const sessionId = getOrCreateSessionId();

  const mutation = useMutation({
    mutationFn: ({
      threadId,
      message,
      advisorState,
      conversationHistory,
      threadHistories,
      threadMetadata,
    }: SendMessageParams) =>
      gameApi.sendMessage(
        threadId,
        message,
        advisorState,
        conversationHistory,
        threadHistories,
        threadMetadata,
      ),

    onSuccess: (response: GameResponse) => {
      // Update the cached advisor state with the new state from backend
      queryClient.setQueryData(["game-session", sessionId], (old: any) => ({
        ...old,
        advisorState: response.stateUpdate,
      }));
    },

    onError: (error) => {
      console.error("Failed to send message:", error);
      // Could show a toast notification here
    },
  });

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
