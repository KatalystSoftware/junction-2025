import { useQuery } from "@tanstack/react-query";
import { gameApi } from "../services/gameApi";
import { getOrCreateSessionId } from "../services/sessionManager";
import type { CharacterFinancialState } from "../types/ui";

export interface CharacterProgression {
  characterId: string;
  characterName: string;
  financialState: CharacterFinancialState | null;
  relationshipState: any;
}

export function useCharacterProgressions() {
  const sessionId = getOrCreateSessionId();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["character-progressions", sessionId],
    queryFn: () => gameApi.getSessionCharacterProgressions(sessionId),
    enabled: !!sessionId,
    staleTime: 60000, // Cache for 1 minute
  });

  return {
    characterProgressions: (data?.characterProgressions ||
      []) as CharacterProgression[],
    isLoading,
    error,
    refetch,
  };
}
