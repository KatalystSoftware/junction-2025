#!/usr/bin/env node
/**
 * TUI-based Financial Advisor Simulator
 *
 * Interactive terminal UI with multi-thread support using Ink (React for CLIs)
 */

import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { characterPool } from "./mastra/index.ts";
import {
  startNewConsultation,
  handleAdvisorResponse,
  createNewAdvisor,
  getActiveThreads,
} from "./mastra/game/orchestrator.ts";
import type {
  AdvisorState,
  ConversationThread,
  GameResponse,
} from "./mastra/types/game-types.ts";

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ThreadData {
  threadId: string;
  characterName: string;
  messages: Message[];
  unreadCount: number;
}

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const { exit } = useApp();
  const [advisorState, setAdvisorState] = useState<AdvisorState | null>(null);
  const [threads, setThreads] = useState<Map<string, ThreadData>>(new Map());
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [showStats, setShowStats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bossReview, setBossReview] = useState<any>(null);

  // Initialize game
  useEffect(() => {
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const advisor = createNewAdvisor(`advisor_${Date.now()}`);
      setAdvisorState(advisor);
      setStatusMessage("Ready! Press 'n' for new consultation");
    };
    init();
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    if (isLoading) return;

    // Quit
    if (input === "q") {
      exit();
      return;
    }

    // Toggle stats
    if (input === "s" && !inputValue) {
      setShowStats(!showStats);
      return;
    }

    // New consultation
    if (input === "n" && !inputValue) {
      handleNewConsultation();
      return;
    }

    // Switch threads (1-9)
    if (/^[1-9]$/.test(input) && !inputValue) {
      const threadIndex = parseInt(input) - 1;
      const threadList = Array.from(threads.values());
      if (threadIndex < threadList.length) {
        const targetThread = threadList[threadIndex];
        setCurrentThreadId(targetThread.threadId);
        // Mark as read
        const updated = new Map(threads);
        const thread = updated.get(targetThread.threadId);
        if (thread) {
          thread.unreadCount = 0;
          updated.set(targetThread.threadId, thread);
          setThreads(updated);
        }
        setStatusMessage(`Switched to ${targetThread.characterName}`);
      }
      return;
    }

    // Close boss review modal
    if (bossReview && input === " ") {
      setBossReview(null);
      return;
    }

    // Text input handling
    if (key.return && inputValue.trim()) {
      handleSendMessage(inputValue.trim());
      setInputValue("");
      return;
    }

    if (key.backspace || key.delete) {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputValue((prev) => prev + input);
    }
  });

  // Handle new consultation
  const handleNewConsultation = async () => {
    if (!advisorState) return;

    setIsLoading(true);
    setStatusMessage("Finding your next client...");

    try {
      const consultation = await startNewConsultation(
        advisorState.advisorId,
        advisorState,
      );

      // Boss review
      if (consultation.type === "god_boss_review" && consultation.review) {
        setBossReview(consultation.review);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage("Boss review received! Press SPACE to continue");
        setIsLoading(false);
        return;
      }

      // New character consultation
      if (
        consultation.type === "character_message" &&
        consultation.characterInfo &&
        consultation.threadId
      ) {
        const newThreadId = consultation.threadId;
        const characterName = consultation.characterInfo.name;

        // Create new thread
        const newThread: ThreadData = {
          threadId: newThreadId,
          characterName,
          messages: [
            {
              role: "system",
              content: `New client: ${characterName}, ${consultation.characterInfo.age}, ${consultation.characterInfo.occupation}`,
              timestamp: new Date(),
            },
            {
              role: "assistant",
              content: consultation.messages?.[0] || "Hello...",
              timestamp: new Date(),
            },
          ],
          unreadCount: 0,
        };

        const updated = new Map(threads);
        updated.set(newThreadId, newThread);
        setThreads(updated);
        setCurrentThreadId(newThreadId);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage(`New client: ${characterName}`);
      } else {
        setStatusMessage("No characters available");
      }
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending message
  const handleSendMessage = async (message: string) => {
    if (!advisorState || !currentThreadId) {
      setStatusMessage("No active thread. Press 'n' for new consultation");
      return;
    }

    const thread = threads.get(currentThreadId);
    if (!thread) return;

    setIsLoading(true);
    setStatusMessage("Character is thinking...");

    try {
      // Add user message
      const userMessage: Message = {
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      const history: Array<{ role: "user" | "assistant"; content: string }> =
        thread.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

      // Send to orchestrator
      const response = await handleAdvisorResponse(
        currentThreadId,
        message,
        advisorState,
        history,
      );

      setAdvisorState(response.stateUpdate);

      // Add messages to thread
      const updatedMessages = [...thread.messages, userMessage];
      if (response.messages && response.messages.length > 0) {
        updatedMessages.push({
          role: "assistant",
          content: response.messages.join("\n\n"),
          timestamp: new Date(),
        });
      }

      const updated = new Map(threads);
      updated.set(currentThreadId, {
        ...thread,
        messages: updatedMessages,
      });
      setThreads(updated);

      // Check if conversation ended
      if (response.type === "conversation_end") {
        setStatusMessage(
          `${thread.characterName} left. Reputation: ${response.stateUpdate.reputation}`,
        );

        // Remove thread
        updated.delete(currentThreadId);
        setThreads(updated);

        // Switch to another thread if available
        const remaining = Array.from(updated.values());
        if (remaining.length > 0) {
          setCurrentThreadId(remaining[0].threadId);
        } else {
          setCurrentThreadId(null);
          setStatusMessage("No active threads. Press 'n' for new client");
        }
      } else {
        setStatusMessage("Type your response");
      }
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!advisorState) {
    return (
      <Box padding={1}>
        <Text>Initializing character pool...</Text>
      </Box>
    );
  }

  // Boss review modal
  if (bossReview) {
    return <BossReviewModal review={bossReview} />;
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="double" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          💼 FINANCIAL ADVISOR SIMULATOR
        </Text>
      </Box>

      {/* Main content area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Sidebar - Thread List */}
        <Box
          width={25}
          borderStyle="single"
          borderColor="gray"
          flexDirection="column"
          paddingX={1}
        >
          <Text bold color="yellow">
            Active Threads ({threads.size})
          </Text>
          <Text dimColor> </Text>
          {Array.from(threads.values()).map((thread, index) => {
            const isCurrent = thread.threadId === currentThreadId;
            const indicator = isCurrent ? "►" : " ";
            const unreadBadge =
              thread.unreadCount > 0 ? ` (${thread.unreadCount})` : "";
            return (
              <Text
                key={thread.threadId}
                color={isCurrent ? "green" : "white"}
                bold={isCurrent}
              >
                {indicator}[{index + 1}] {thread.characterName}
                {unreadBadge}
              </Text>
            );
          })}
          {threads.size === 0 && <Text dimColor>No active threads</Text>}
          <Text dimColor> </Text>
          <Text dimColor>───────────────</Text>
          {showStats ? (
            <StatsPanel advisorState={advisorState} />
          ) : (
            <>
              <Text dimColor>Commands:</Text>
              <Text dimColor>1-9 Switch</Text>
              <Text dimColor>n New</Text>
              <Text dimColor>s Stats</Text>
              <Text dimColor>q Quit</Text>
            </>
          )}
        </Box>

        {/* Main conversation area */}
        <Box flexGrow={1} flexDirection="column" paddingX={1}>
          {currentThreadId && threads.get(currentThreadId) ? (
            <ConversationPanel thread={threads.get(currentThreadId)!} />
          ) : (
            <Box flexDirection="column" paddingTop={2}>
              <Text color="yellow">No active conversation</Text>
              <Text dimColor>Press 'n' to start a new consultation</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color={isLoading ? "yellow" : "cyan"}>{statusMessage}</Text>
        <Text dimColor>
          Rep: {advisorState.reputation} | Skill:{" "}
          {advisorState.skillLevel.toFixed(1)}
        </Text>
      </Box>

      {/* Input box */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="green">💼 You: </Text>
        <Text>{inputValue}</Text>
        <Text color="gray">█</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Conversation Panel Component
// ============================================================================

function ConversationPanel({ thread }: { thread: ThreadData }) {
  // Show last 10 messages
  const recentMessages = thread.messages.slice(-10);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          💬 {thread.characterName}
        </Text>
      </Box>

      {recentMessages.map((msg, index) => (
        <Box key={index} paddingY={0} flexDirection="column">
          {msg.role === "system" ? (
            <Text color="yellow">ℹ️ {msg.content}</Text>
          ) : msg.role === "user" ? (
            <Text color="green">💼 You: {msg.content}</Text>
          ) : (
            <Text color="blue">
              💬 {thread.characterName}: "{msg.content}"
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// Stats Panel Component
// ============================================================================

function StatsPanel({ advisorState }: { advisorState: AdvisorState }) {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        📊 Stats
      </Text>
      <Text dimColor>Rep: {advisorState.reputation}/100</Text>
      <Text dimColor>Skill: {advisorState.skillLevel.toFixed(1)}/10</Text>
      <Text dimColor>Sessions: {advisorState.totalSessions}</Text>
      <Text dimColor>Clients: {advisorState.totalClientsHelped}</Text>
    </Box>
  );
}

// ============================================================================
// Boss Review Modal Component
// ============================================================================

function BossReviewModal({ review }: { review: any }) {
  return (
    <Box
      flexDirection="column"
      padding={2}
      borderStyle="double"
      borderColor="magenta"
    >
      <Text bold color="magenta">
        👔 BOSS REVIEW
      </Text>
      <Text> </Text>
      <Text color="green">📈 Overall Score: {review.overallScore}/10</Text>
      <Text> </Text>

      <Text bold color="green">
        ✅ Strengths:
      </Text>
      {review.strengthsIdentified.map((s: string, i: number) => (
        <Text key={i} color="green">
          • {s}
        </Text>
      ))}
      <Text> </Text>

      <Text bold color="yellow">
        ⚠️ Areas for Improvement:
      </Text>
      {review.areasForImprovement.map((a: string, i: number) => (
        <Text key={i} color="yellow">
          • {a}
        </Text>
      ))}
      <Text> </Text>

      <Text bold color="cyan">
        📚 Learning Materials:
      </Text>
      {review.learningMaterials.map((m: any, i: number) => (
        <Text key={i} color="cyan">
          • {m.title} - {m.description}
        </Text>
      ))}
      <Text> </Text>

      <Text color="magenta">💬 Boss says:</Text>
      <Text color="magenta">"{review.encouragingMessage}"</Text>
      <Text> </Text>
      <Text dimColor>Press SPACE to continue</Text>
    </Box>
  );
}

// ============================================================================
// Main Entry Point
// ============================================================================

console.log("\n🎮 Starting Financial Advisor Simulator (TUI)...\n");
render(<App />);
