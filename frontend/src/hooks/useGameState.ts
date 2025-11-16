/**
 * useGameState - Server-First Game State Management
 *
 * This hook uses the server as the single source of truth.
 * All state comes from the backend via TanStack Query.
 * No local state management or localStorage - server handles persistence.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gameApi, type GameResponse } from "../services/gameApi";
import { getOrCreateSessionId } from "../services/sessionManager";

export function useGameState() {
  const queryClient = useQueryClient();
  const sessionId = getOrCreateSessionId();

  // Single query for all game state
  const {
    data: gameState,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["game-state", sessionId],
    queryFn: () => gameApi.initSession(sessionId),
    staleTime: Infinity, // We manage updates via mutations
    retry: 3,
  });

  // Mutation: Start new consultation
  const startConsultationMutation = useMutation({
    mutationFn: () => {
      if (!gameState?.advisorState) throw new Error("No advisor state");
      return gameApi.startConsultation(
        gameState.advisorState,
        gameState.threadHistories,
        gameState.threadMetadata,
      );
    },
    onSuccess: (response: any) => {
      // Update the cache with response data (includes threadHistories and threadMetadata)
      queryClient.setQueryData(["game-state", sessionId], (old: any) => ({
        ...old,
        advisorState: response.stateUpdate,
        threadHistories: response.threadHistories || old?.threadHistories || {},
        threadMetadata: response.threadMetadata || old?.threadMetadata || {},
      }));

      console.log(
        "✅ Updated cache:",
        Object.keys(response.threadHistories || {}).length,
        "threads",
      );
    },
  });

  // Mutation: Send message
  const sendMessageMutation = useMutation({
    mutationFn: ({
      threadId,
      message,
    }: {
      threadId: string;
      message: string;
    }) => {
      if (!gameState?.advisorState) throw new Error("No advisor state");

      // Get conversation history for this thread
      const conversationHistory = gameState.threadHistories?.[threadId] || [];

      return gameApi.sendMessage(
        threadId,
        message,
        gameState.advisorState,
        conversationHistory,
        gameState.threadHistories,
        gameState.threadMetadata,
      );
    },
    onMutate: async ({ threadId, message }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["game-state", sessionId] });

      // Snapshot previous value
      const previousState = queryClient.getQueryData(["game-state", sessionId]);

      // Optimistically update by adding the user message to thread history
      queryClient.setQueryData(["game-state", sessionId], (old: any) => {
        const newThreadHistories = { ...old.threadHistories };
        const threadHistory = newThreadHistories[threadId] || [];
        newThreadHistories[threadId] = [
          ...threadHistory,
          { role: "user" as const, content: message },
        ];

        return {
          ...old,
          threadHistories: newThreadHistories,
        };
      });

      return { previousState };
    },
    onSuccess: (response: any) => {
      // Update with server response (includes updated threadHistories)
      queryClient.setQueryData(["game-state", sessionId], (old: any) => ({
        ...old,
        advisorState: response.stateUpdate,
        threadHistories: response.threadHistories || old?.threadHistories || {},
        threadMetadata: response.threadMetadata || old?.threadMetadata || {},
      }));

      console.log(
        "✅ Updated cache after message:",
        Object.keys(response.threadHistories || {}).length,
        "threads",
      );
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousState) {
        queryClient.setQueryData(
          ["game-state", sessionId],
          context.previousState,
        );
      }
    },
  });

  return {
    // Session info
    sessionId,
    isNewSession: gameState?.isNewSession,

    // Server state
    advisorState: gameState?.advisorState,
    threadHistories: gameState?.threadHistories || {},
    threadMetadata: gameState?.threadMetadata || {},

    // Loading states
    isLoading,
    isSending: sendMessageMutation.isPending,
    isStartingConsultation: startConsultationMutation.isPending,

    // Errors
    error,
    sendError: sendMessageMutation.error,
    startError: startConsultationMutation.error,

    // Latest response data
    lastStartResponse: startConsultationMutation.data,
    lastMessageResponse: sendMessageMutation.data,
    autoStartedConsultation: gameState?.autoStartedConsultation, // Auto-started from init sanity check

    // Actions
    startConsultation: () => startConsultationMutation.mutate(),
    sendMessage: (threadId: string, message: string) =>
      sendMessageMutation.mutate({ threadId, message }),

    // Utility
    refetchState: refetch,
  };
}
