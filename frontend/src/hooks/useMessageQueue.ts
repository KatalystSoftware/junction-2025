/**
 * useMessageQueue - Queue messages and send them sequentially
 *
 * Prevents race conditions by ensuring only one message is sent at a time
 * Messages are queued and processed in order
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useSendMessage } from "./useSendMessage";
import type { AdvisorState } from "../services/gameApi";

interface QueuedMessage {
  threadId: string;
  message: string;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;
}

export function useMessageQueue(advisorState: AdvisorState | undefined) {
  const messaging = useSendMessage();
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const isProcessingRef = useRef(false);

  // Process queue when it changes
  useEffect(() => {
    if (queue.length === 0 || isProcessingRef.current || !advisorState) {
      return;
    }

    const processNext = async () => {
      isProcessingRef.current = true;
      const next = queue[0];

      console.log(
        `📤 Processing queued message for thread ${next.threadId.substring(0, 8)}... (${queue.length - 1} remaining)`,
      );

      try {
        await messaging.sendMessageAsync({
          threadId: next.threadId,
          message: next.message,
          advisorState: advisorState,
          conversationHistory: [],
          threadHistories: next.threadHistories,
          threadMetadata: next.threadMetadata,
        });

        // Remove from queue after successful send
        setQueue((prev) => prev.slice(1));
      } catch (error) {
        console.error("❌ Failed to send queued message:", error);
        // Still remove from queue to prevent blocking
        setQueue((prev) => prev.slice(1));
      } finally {
        isProcessingRef.current = false;
      }
    };

    processNext();
  }, [queue, messaging, advisorState]);

  const queueMessage = useCallback(
    (
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
      console.log(
        `➕ Queued message for thread ${threadId.substring(0, 8)}...`,
      );
      setQueue((prev) => [
        ...prev,
        { threadId, message, threadHistories, threadMetadata },
      ]);
    },
    [],
  );

  return {
    queueMessage,
    queueSize: queue.length,
    isSending: messaging.isSending || isProcessingRef.current,
    error: messaging.error,
    data: messaging.data,
  };
}
