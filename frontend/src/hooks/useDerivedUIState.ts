/**
 * useDerivedUIState - Derive UI state from server state
 *
 * Converts server-format data into UI-friendly formats
 * WITHOUT storing it locally - pure derivation from server state
 */

import { useMemo } from "react";
import type { Contact, Message } from "../types/ui";
import { generateAvatarUrl, getAvatarInitials } from "../utils/avatarUtils";

interface AdvisorState {
  activeThreads: Record<
    string,
    {
      threadId: string;
      characterId: string;
      scenarioId: string;
      status: "active" | "awaiting_response" | "resolved";
      createdAt: string;
      lastMessageAt: string;
    }
  >;
  hasCompletedOnboarding: boolean;
}

interface ThreadHistories {
  [threadId: string]: Array<{ role: "user" | "assistant"; content: string }>;
}

interface CharacterInfo {
  [threadId: string]: {
    name: string;
    age: number;
    occupation: string;
    gender: "male" | "female";
  };
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return date.toLocaleDateString();
  if (days > 1)
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  if (days === 1) return "Yesterday";
  if (hours > 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function useDerivedUIState(
  advisorState: AdvisorState | undefined,
  threadHistories: ThreadHistories,
  threadMetadata: CharacterInfo,
) {
  // Derive contacts from active threads
  const contacts: Contact[] = useMemo(() => {
    if (!advisorState?.activeThreads) return [];

    return Object.values(advisorState.activeThreads).map((thread) => {
      const charInfo = threadMetadata[thread.threadId];
      const threadMessages = threadHistories[thread.threadId] || [];
      const lastMessage = threadMessages[threadMessages.length - 1];

      return {
        id: thread.threadId,
        name: charInfo?.name || "Client",
        avatar: charInfo?.name ? getAvatarInitials(charInfo.name) : "CL",
        avatarImage: charInfo?.gender
          ? generateAvatarUrl(thread.characterId, charInfo.gender)
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.characterId}`,
        lastMessage: lastMessage?.content || "New consultation",
        timestamp: formatTimestamp(new Date(thread.lastMessageAt)),
        lastMessageTime: new Date(thread.lastMessageAt),
        unreadCount: thread.status === "awaiting_response" ? 1 : 0,
        online:
          thread.status === "active" || thread.status === "awaiting_response",
        trust: 50, // TODO: Get from backend
      };
    });
  }, [advisorState?.activeThreads, threadHistories, threadMetadata]);

  // Derive messages for each thread
  const messagesByThread: Record<string, Message[]> = useMemo(() => {
    const result: Record<string, Message[]> = {};

    for (const [threadId, history] of Object.entries(threadHistories)) {
      result[threadId] = history.map((msg, idx) => ({
        id: `${threadId}-${idx}`,
        contactId: threadId,
        role: msg.role === "user" ? ("user" as const) : ("contact" as const),
        content: msg.content,
        timestamp: new Date(), // Server doesn't persist timestamps
      }));
    }

    return result;
  }, [threadHistories]);

  return {
    contacts,
    messagesByThread,
  };
}
