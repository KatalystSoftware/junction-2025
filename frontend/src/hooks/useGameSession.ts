/**
 * useGameSession Hook
 *
 * Main hook for managing game session state
 * Initializes/loads session and provides current advisor state
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gameApi,
  type AdvisorState,
  type GameResponse,
} from "../services/gameApi";
import { getOrCreateSessionId } from "../services/sessionManager";

export function useGameSession() {
  const queryClient = useQueryClient();
  const sessionId = getOrCreateSessionId();

  // Query to initialize/load session
  const {
    data: sessionData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["game-session", sessionId],
    queryFn: () => gameApi.initSession(sessionId),
    staleTime: Infinity, // Session data doesn't get stale
    retry: 3,
  });

  // Mutation to start a new consultation
  const startConsultation = useMutation({
    mutationFn: (params: {
      advisorState: AdvisorState;
      threadHistories?: Record<
        string,
        Array<{ role: "user" | "assistant"; content: string }>
      >;
      threadMetadata?: Record<
        string,
        { name: string; age: number; occupation: string }
      >;
    }) =>
      gameApi.startConsultation(
        params.advisorState,
        params.threadHistories,
        params.threadMetadata,
      ),
    onSuccess: (response: GameResponse) => {
      // Update ALL state fields from server response (server is source of truth)
      queryClient.setQueryData(["game-session", sessionId], (old: any) => {
        const updatedData = {
          ...old,
          advisorState: response.stateUpdate,
          // Server returns updated threadHistories and threadMetadata
          threadHistories: (response as any).threadHistories || old?.threadHistories,
          threadMetadata: (response as any).threadMetadata || old?.threadMetadata,
        };
        console.log('📊 useGameSession: Updated cache after startConsultation', {
          hasThreadHistories: !!(response as any).threadHistories,
          hasThreadMetadata: !!(response as any).threadMetadata,
          threadCount: Object.keys((response as any).threadHistories || {}).length,
        });
        return updatedData;
      });
    },
  });

  // Helper function to update advisor state in cache
  const updateAdvisorState = (newState: AdvisorState) => {
    queryClient.setQueryData(["game-session", sessionId], (old: any) => ({
      ...old,
      advisorState: newState,
    }));
  };

  return {
    // Session data
    sessionId,
    advisorState: sessionData?.advisorState,
    isNewSession: sessionData?.isNewSession,
    threadHistories: sessionData?.threadHistories, // Expose saved histories
    threadMetadata: sessionData?.threadMetadata, // Expose saved character info

    // Loading states
    isLoading,
    isError,
    error,

    // Actions
    startConsultation: startConsultation.mutate,
    isStarting: startConsultation.isPending,
    startError: startConsultation.error,
    startData: startConsultation.data, // Expose response data

    // Utils
    updateAdvisorState,
  };
}
