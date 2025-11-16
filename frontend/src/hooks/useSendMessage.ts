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
    // ⚠️ IMPORTANT: Only ONE mutation can be pending at a time per hook instance
    // Multiple concurrent sends will queue/cancel each other, causing message loss
    mutationKey: ["send-message", sessionId], // Dedupe concurrent sends

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
      // Update ALL state fields from server response (server is source of truth)
      // This prevents race conditions when sending messages to multiple threads simultaneously
      queryClient.setQueryData(["game-session", sessionId], (old: any) => {
        const updatedData = {
          ...old,
          advisorState: response.stateUpdate,
          // Server returns updated threadHistories and threadMetadata in EVERY response
          threadHistories: (response as any).threadHistories || old?.threadHistories,
          threadMetadata: (response as any).threadMetadata || old?.threadMetadata,
        };
        console.log('📊 useSendMessage: Updated cache after message', {
          hasThreadHistories: !!(response as any).threadHistories,
          hasThreadMetadata: !!(response as any).threadMetadata,
          threadCount: Object.keys((response as any).threadHistories || {}).length,
        });
        return updatedData;
      });
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
