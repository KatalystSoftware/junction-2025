/**
 * WhatsAppInterface - Server-First Refactor
 *
 * Single source of truth: THE SERVER
 * No local state, no localStorage, no client-side duplication
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import type { Contact, Message } from "../types/ui";
import michaelScottImage from "figma:asset/98a682f9e6eea0635304bf1ceada7ac6a7758d54.png";
import { useGameState } from "../hooks/useGameState";
import { useDerivedUIState } from "../hooks/useDerivedUIState";

interface WhatsAppInterfaceProps {
  onLogoClick: () => void;
}

export function WhatsAppInterface({ onLogoClick }: WhatsAppInterfaceProps) {
  // Server state - single source of truth
  const game = useGameState();

  // Derived UI state - no storage, just computation
  const { contacts, messagesByThread } = useDerivedUIState(
    game.advisorState,
    game.threadHistories,
    game.threadMetadata,
  );

  // UI-only state (persisted in URL)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    () => {
      // Initialize from URL hash on mount
      const hash = window.location.hash.slice(1); // Remove the #
      return hash || null;
    },
  );
  const [showChat, setShowChat] = useState(() => {
    // Show chat if there's a hash in URL
    return !!window.location.hash;
  });

  // Update URL when selectedContactId changes
  useEffect(() => {
    if (selectedContactId) {
      window.location.hash = selectedContactId;
    } else {
      window.location.hash = "";
    }
  }, [selectedContactId]);

  // Boss contact (static, derived from server threadHistories)
  const bossContact: Contact = useMemo(() => {
    const bossHistory = game.threadHistories["boss-pinned"] || [];
    const lastBossMessage =
      bossHistory.length > 0
        ? bossHistory[bossHistory.length - 1].content
        : "Welcome to your new job as a financial advisor!";

    return {
      id: "boss-pinned",
      name: "Michael Scott",
      avatar: "MS",
      lastMessage: lastBossMessage,
      timestamp: "Pinned",
      lastMessageTime: new Date(),
      unreadCount: 0,
      online: true,
      avatarImage: michaelScottImage,
      trust: 100,
    };
  }, [game.threadHistories]);

  // Auto-trigger onboarding on first load
  useEffect(() => {
    if (
      game.advisorState &&
      !game.advisorState.hasCompletedOnboarding &&
      !game.isStartingConsultation
    ) {
      console.log("👔 Starting onboarding...");
      game.startConsultation();
    }
  }, [game.advisorState?.hasCompletedOnboarding]);

  // Handle responses from mutations
  useEffect(() => {
    // Determine which response to process - prefer the one we haven't processed yet
    let response = null;
    let isFromMessage = false;

    // Check if we have a new message response to process
    if (
      game.lastMessageResponse &&
      game.lastMessageResponse !== processedMessageResponse.current
    ) {
      response = game.lastMessageResponse;
      isFromMessage = true;
    }
    // Otherwise check if we have a new start response to process
    else if (
      game.lastStartResponse &&
      game.lastStartResponse !== processedStartResponse.current
    ) {
      response = game.lastStartResponse;
      isFromMessage = false;
    }

    if (!response) return;

    console.log("📥 Got response:", response.type);
    console.log("📥 Full response:", response);

    // Mark this response as processed
    if (isFromMessage) {
      processedMessageResponse.current = game.lastMessageResponse;
    } else {
      processedStartResponse.current = game.lastStartResponse;
    }

    // Handle character info from response
    if (response.threadMetadata && response.threadId) {
      // Server will persist this - we just log it
      console.log(
        "👤 Got character info for thread",
        response.threadId,
        ":",
        response.threadMetadata,
      );
    }

    // Handle advice choices (only set if present and non-empty)
    if (
      response.adviceChoices &&
      response.adviceChoices.length > 0 &&
      response.threadId
    ) {
      console.log("🎯 Got advice choices for thread", response.threadId);
      // Store in component state for display
      setAdviceChoicesByThread((prev) => ({
        ...prev,
        [response.threadId!]: response.adviceChoices || [],
      }));
    }

    // Handle conversation end
    if (response.type === "conversation_end" && response.threadId) {
      console.log("🏁 Conversation ended for thread", response.threadId);
      console.log("🏁 Financial results:", response.financialResults);
      console.log("🏁 Mini feedback:", response.miniFeedback);
      console.log("🏁 Achievements:", response.achievementsUnlocked);
      console.log("🏁 Milestones:", response.milestonesAchieved);

      // Store end data for display
      const endData = {
        financialResults: response.financialResults,
        miniFeedback: response.miniFeedback,
        achievementsUnlocked: response.achievementsUnlocked,
        milestonesAchieved: response.milestonesAchieved,
      };

      console.log("🏁 Setting conversationEndData:", endData);

      setConversationEndDataByThread((prev) => {
        const updated = {
          ...prev,
          [response.threadId!]: endData,
        };
        console.log("🏁 Updated conversationEndDataByThread:", updated);
        return updated;
      });

      // Auto-trigger next consultation after 3 seconds
      setTimeout(() => {
        console.log("🚀 Auto-triggering next consultation...");
        game.startConsultation();
      }, 3000);
    }

    // Handle new thread (select it)
    if (response.isNewThread && response.threadId) {
      console.log("✨ New thread created:", response.threadId);
      setSelectedContactId(response.threadId);
      setShowChat(true);
    }

    // Handle onboarding - select boss chat
    if (response.type === "onboarding") {
      console.log(
        "👋 Onboarding message received - boss message is in threadHistories",
      );

      // Select boss chat (acknowledgment choices will be derived from state)
      setSelectedContactId("boss-pinned");
      setShowChat(true); // Show the chat window
    }
  }, [game.lastStartResponse, game.lastMessageResponse]);

  // Auto-select first contact if none selected
  useEffect(() => {
    if (
      contacts.length > 0 &&
      !selectedContactId &&
      selectedContactId !== "boss-pinned"
    ) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts]);

  // Temporary state for advice choices and conversation end data (UI-only)
  const [adviceChoicesByThread, setAdviceChoicesByThread] = useState<{
    [threadId: string]: any[];
  }>({});
  const [conversationEndDataByThread, setConversationEndDataByThread] =
    useState<{ [threadId: string]: any }>({});

  // Track which responses we've already processed to avoid duplicate processing
  const processedStartResponse = useRef<any>(null);
  const processedMessageResponse = useRef<any>(null);

  // Derive boss acknowledgment choices from conversation state
  useEffect(() => {
    const bossHistory = game.threadHistories["boss-pinned"] || [];

    // If boss has sent onboarding but user hasn't replied, show acknowledgment options
    if (
      bossHistory.length === 1 &&
      bossHistory[0].role === "assistant" &&
      game.advisorState?.hasCompletedOnboarding
    ) {
      const hasThreads =
        Object.keys(game.advisorState.activeThreads || {}).length > 0;

      // Only show if no other threads exist (first consultation not started yet)
      if (!hasThreads) {
        setAdviceChoicesByThread((prev) => ({
          ...prev,
          "boss-pinned": [
            { fullAdviceText: "Understood! I'm ready to help clients." },
            { fullAdviceText: "Got it! Let's get started." },
            { fullAdviceText: "Thanks! I'll do my best." },
          ],
        }));
      }
    }
  }, [game.threadHistories, game.advisorState]);

  // Handle contact selection
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowChat(true);
  };

  const handleBackToContacts = () => {
    setShowChat(false);
  };

  // Handle sending messages
  const handleSendMessage = (content: string) => {
    if (!selectedContactId) return;

    // Special handling for boss acknowledgment (first consultation trigger)
    if (
      selectedContactId === "boss-pinned" &&
      game.advisorState?.hasCompletedOnboarding
    ) {
      const hasThreads =
        Object.keys(game.advisorState.activeThreads || {}).length > 0;
      if (!hasThreads) {
        console.log("👔 Boss acknowledged! Starting first consultation...");

        // Send acknowledgment to boss (will be saved to threadHistories)
        game.sendMessage(selectedContactId, content);

        setTimeout(() => {
          game.startConsultation();
        }, 1500);

        // Clear advice choices
        setAdviceChoicesByThread((prev) => ({
          ...prev,
          [selectedContactId]: [],
        }));
        return;
      }
    }

    // Send to server (including regular boss messages)
    console.log("📤 Sending message to thread:", selectedContactId);
    game.sendMessage(selectedContactId, content);

    // Clear advice choices after sending
    setAdviceChoicesByThread((prev) => ({
      ...prev,
      [selectedContactId]: [],
    }));
  };

  // Get current contact and messages
  const displayContact =
    selectedContactId === "boss-pinned"
      ? bossContact
      : contacts.find((c) => c.id === selectedContactId);

  // Boss messages now come from server threadHistories like everything else
  const messages: Message[] = selectedContactId
    ? messagesByThread[selectedContactId] || []
    : [];

  const currentAdviceChoices = selectedContactId
    ? adviceChoicesByThread[selectedContactId] || []
    : [];

  const isThreadResolved =
    selectedContactId &&
    game.advisorState?.activeThreads?.[selectedContactId]?.status ===
      "resolved";
  const conversationEndData = selectedContactId
    ? conversationEndDataByThread[selectedContactId]
    : undefined;

  // Debug logging for conversation end display
  useEffect(() => {
    if (selectedContactId) {
      console.log("🔍 selectedContactId:", selectedContactId);
      console.log("🔍 isThreadResolved:", isThreadResolved);
      console.log("🔍 conversationEndData:", conversationEndData);
      console.log(
        "🔍 conversationEndDataByThread:",
        conversationEndDataByThread,
      );
    }
  }, [
    selectedContactId,
    isThreadResolved,
    conversationEndData,
    conversationEndDataByThread,
  ]);

  // Loading state
  if (game.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              color: "var(--muted-foreground)",
            }}
          >
            Loading game session...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (game.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              color: "var(--destructive)",
              marginBottom: "1rem",
            }}
          >
            Failed to load game session
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              color: "var(--muted-foreground)",
              fontSize: "0.875rem",
            }}
          >
            {game.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => game.refetchState()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              borderRadius: "var(--radius-button)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ChatSidebar
        contacts={contacts}
        selectedContactId={selectedContactId || ""}
        onSelectContact={handleSelectContact}
        showChat={showChat}
        bossContact={bossContact}
        onLogoClick={onLogoClick}
        advisorState={game.advisorState}
      />
      <ChatWindow
        contact={displayContact}
        messages={messages}
        onSendMessage={handleSendMessage}
        onBack={handleBackToContacts}
        showChat={showChat}
        contactIsTyping={game.isSending}
        adviceChoices={currentAdviceChoices}
        isThreadResolved={isThreadResolved}
        conversationEndData={conversationEndData}
      />
    </div>
  );
}

// Re-export types for backward compatibility
export type { Contact, Message } from "../types/ui";
