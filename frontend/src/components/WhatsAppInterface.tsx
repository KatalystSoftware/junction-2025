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
import { useTranslation } from "../utils/translations";
import { ConsultationResultsModal } from "./ConsultationResultsModal";
import { MilestoneModal } from "./MilestoneModal";
import { AchievementUnlockModal } from "./AchievementUnlockModal";
import { QuizModal } from "./QuizModal";
import { GameOverModal } from "./GameOverModal";

interface WhatsAppInterfaceProps {
  onLogoClick: () => void;
}

export function WhatsAppInterface({ onLogoClick }: WhatsAppInterfaceProps) {
  // Server state - single source of truth
  const game = useGameState();

  // Translations
  const t = useTranslation();

  // Track last read message count for each thread to properly show unread indicators
  const [lastReadMessageCounts, setLastReadMessageCounts] = useState<{
    [threadId: string]: number;
  }>({});

  // Derived UI state - no storage, just computation
  const { contacts, messagesByThread } = useDerivedUIState(
    game.advisorState,
    game.threadHistories,
    game.threadMetadata,
    lastReadMessageCounts,
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

  // Pending voice messages (optimistic UI for user voice messages)
  const [pendingVoiceMessages, setPendingVoiceMessages] = useState<
    Record<string, Message[]>
  >({});

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

    // Show unread indicator if there are new messages since last read
    const lastReadCount = lastReadMessageCounts["boss-pinned"] || 0;
    const hasUnreadBossMessage =
      bossHistory.length > 0 &&
      bossHistory[bossHistory.length - 1].role === "assistant" &&
      bossHistory.length > lastReadCount;

    return {
      id: "boss-pinned",
      name: "Michael Scott",
      avatar: "MS",
      lastMessage: lastBossMessage,
      timestamp: "Pinned",
      lastMessageTime: new Date(),
      unreadCount: hasUnreadBossMessage ? 1 : 0,
      online: true,
      avatarImage: michaelScottImage,
      trust: 100,
    };
  }, [game.threadHistories, lastReadMessageCounts]);

  // Auto-trigger onboarding on first load (with race condition protection)
  const hasTriggeredOnboarding = useRef(false);
  useEffect(() => {
    if (
      game.advisorState &&
      !game.advisorState.hasCompletedOnboarding &&
      !game.isStartingConsultation &&
      !hasTriggeredOnboarding.current
    ) {
      console.log("👔 Starting onboarding...");
      hasTriggeredOnboarding.current = true;
      game.startConsultation();
    }
  }, [game.advisorState?.hasCompletedOnboarding, game.isStartingConsultation]);

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
    // Otherwise check if we have an auto-started consultation from init
    else if (
      game.autoStartedConsultation &&
      game.autoStartedConsultation !== processedAutoStartResponse.current
    ) {
      response = game.autoStartedConsultation;
      isFromMessage = false;
    }

    if (!response) return;

    console.log("📥 Got response:", response.type);
    console.log("📥 Full response:", response);

    // Mark this response as processed
    if (isFromMessage) {
      processedMessageResponse.current = game.lastMessageResponse;
    } else if (game.lastStartResponse && response === game.lastStartResponse) {
      processedStartResponse.current = game.lastStartResponse;
    } else if (
      game.autoStartedConsultation &&
      response === game.autoStartedConsultation
    ) {
      processedAutoStartResponse.current = game.autoStartedConsultation;
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

      // Show modals in sequence
      // 1. First show consultation results if available
      if (response.financialResults) {
        const characterInfo =
          response.characterInfo || game.threadMetadata?.[response.threadId];

        // Get the actual advisor advice and character response from thread history
        const threadHistory = game.threadHistories?.[response.threadId] || [];
        const adviceGiven = response.advisorAdvice?.join(" ") || undefined;
        const lastCharacterMessage =
          threadHistory.length > 0
            ? threadHistory[threadHistory.length - 1]?.content
            : undefined;

        setCurrentResultsData({
          characterName: characterInfo?.name || "Client",
          adviceGiven,
          extractedActions: response.financialResults.extractedActions,
          characterResponse: lastCharacterMessage || "Thank you for your help!",
          projection: response.financialResults.projection,
          evaluation: response.financialResults.evaluation,
          coinsEarned: response.financialResults.coinsEarned,
          tierChange: response.tierChangeNotification,
          recommendationMessage: response.recommendationMessage,
        });
        setShowResultsModal(true);
      }

      // Auto-trigger next consultation after modals are dismissed
      setTimeout(() => {
        console.log("🚀 Auto-triggering next consultation...");
        game.startConsultation();
      }, 3000);
    }

    // Handle boss intervention (real-time correction of bad advice)
    if (response.type === "boss_intervention" && response.interventionMessage) {
      console.log("🚨 Boss intervention received!");

      // Show notification that boss wants to talk
      // User can manually switch to boss-pinned thread to see the intervention message
      const severity = response.interventionMessage.severity;
      const icon = severity === "critical" ? "🚨" : "⚠️";

      // TODO: Show toast notification
      // For now, just log it
      console.log(
        `${icon} Boss intervention: Check the boss chat to discuss this advice!`,
      );

      // Optionally, highlight the boss thread in the contact list
      // The boss-pinned thread will have the intervention message already
    }

    // Handle boss check-in
    if (response.type === "boss_checkin") {
      console.log("👔 Boss check-in received");

      // Select boss chat to show the check-in message
      setSelectedContactId("boss-pinned");
      setShowChat(true);

      // Set acknowledgment choices for boss check-in
      setAdviceChoicesByThread((prev) => ({
        ...prev,
        "boss-pinned": [
          {
            choiceId: "checkin_1",
            actionText: "Thank boss and acknowledge feedback",
            icon: "🙏",
            projectedOutcome: "Show appreciation for guidance",
            fullAdviceText:
              "Thanks for the feedback, I really appreciate you taking the time to review my work. I'll keep your advice in mind for the next client.",
          },
          {
            choiceId: "checkin_2",
            actionText: "Commit to improvement",
            icon: "📈",
            projectedOutcome: "Demonstrate growth mindset",
            fullAdviceText:
              "Got it! I'll work on being more specific and actionable with my advice. I can see where I need to improve.",
          },
          {
            choiceId: "checkin_3",
            actionText: "Express gratitude for mentorship",
            icon: "💡",
            projectedOutcome: "Build rapport with boss",
            fullAdviceText:
              "Thank you, that's really helpful advice. It's great to have someone guiding me through this learning process. I'll apply these insights moving forward.",
          },
        ],
      }));
    }

    // Handle god boss review (full performance review with potential quiz)
    if (response.type === "god_boss_review" && response.review) {
      console.log("👔 Boss performance review received");

      // If review includes quiz, set it up for display
      if (response.review.quiz) {
        console.log("📝 Quiz included in review:", response.review.quiz);
        setCurrentQuiz(response.review.quiz);
        setShowQuizModal(true);
      }

      // Select boss chat to show the review
      setSelectedContactId("boss-pinned");
      setShowChat(true);
    }

    // Handle new thread (just log it, don't auto-jump)
    if (response.isNewThread && response.threadId) {
      console.log("✨ New thread created:", response.threadId);
      // Don't auto-select new threads - let user choose when to open them
    }

    // Handle onboarding - select boss chat
    if (response.type === "onboarding") {
      console.log(
        "👋 Onboarding message received - boss message is in threadHistories",
      );

      // Clear any existing timeout
      if (bossTypingTimeoutRef.current) {
        clearTimeout(bossTypingTimeoutRef.current);
      }

      // Show typing indicator first, then reveal message after delay
      setBossIsTypingOnboarding(true);
      
      // Select boss chat (acknowledgment choices will be derived from state)
      setSelectedContactId("boss-pinned");
      setShowChat(true); // Show the chat window

      // Hide typing indicator after a delay (simulating typing time)
      // The message will appear from threadHistories after this
      bossTypingTimeoutRef.current = setTimeout(() => {
        setBossIsTypingOnboarding(false);
        bossTypingTimeoutRef.current = null;
      }, 2500); // 2.5 second typing delay for more natural feel
    }

    // Handle game over - show firing modal
    if (response.type === "game_over" && response.firingMessage) {
      console.log("💀 Game over - advisor fired");
      setGameOverData(response.firingMessage);
      setShowGameOverModal(true);
    }
  }, [
    game.lastStartResponse,
    game.lastMessageResponse,
    game.autoStartedConsultation,
  ]);

  // Default to boss chat if no chat is selected
  useEffect(() => {
    if (!selectedContactId) {
      setSelectedContactId("boss-pinned");
      setShowChat(true);
    }
  }, []);

  // Temporary state for advice choices and conversation end data (UI-only)
  const [adviceChoicesByThread, setAdviceChoicesByThread] = useState<{
    [threadId: string]: any[];
  }>({});
  const [conversationEndDataByThread, setConversationEndDataByThread] =
    useState<{ [threadId: string]: any }>({});

  // Modal state management
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [currentResultsData, setCurrentResultsData] = useState<any>(null);
  const [currentMilestones, setCurrentMilestones] = useState<any[]>([]);
  const [currentAchievements, setCurrentAchievements] = useState<any[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);

  // Boss intervention state - removed modal, interventions now appear in boss chat

  // Input state (lifted from ChatWindow for intervention revision support)
  const [currentInputValue, setCurrentInputValue] = useState("");

  // Track boss typing state for onboarding message
  const [bossIsTypingOnboarding, setBossIsTypingOnboarding] = useState(false);
  const bossTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track which responses we've already processed to avoid duplicate processing
  const processedStartResponse = useRef<any>(null);
  const processedMessageResponse = useRef<any>(null);
  const processedAutoStartResponse = useRef<any>(null);

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
            {
              choiceId: "onboarding_1",
              actionText: t.bossOnboarding.response1Action,
              icon: "👍",
              projectedOutcome: t.bossOnboarding.response1Outcome,
              fullAdviceText: t.bossOnboarding.response1Full,
            },
            {
              choiceId: "onboarding_2",
              actionText: t.bossOnboarding.response2Action,
              icon: "🚀",
              projectedOutcome: t.bossOnboarding.response2Outcome,
              fullAdviceText: t.bossOnboarding.response2Full,
            },
            {
              choiceId: "onboarding_3",
              actionText: t.bossOnboarding.response3Action,
              icon: "💪",
              projectedOutcome: t.bossOnboarding.response3Outcome,
              fullAdviceText: t.bossOnboarding.response3Full,
            },
          ],
        }));
      }
    }
  }, [game.threadHistories, game.advisorState, t]);

  // Handle contact selection
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowChat(true);

    // Mark the chat as read by storing current message count
    const currentMessages = game.threadHistories[contactId]?.length || 0;
    setLastReadMessageCounts((prev) => ({
      ...prev,
      [contactId]: currentMessages,
    }));
  };

  const handleBackToContacts = () => {
    setShowChat(false);
  };

  // Handle sending messages
  const handleSendVoiceMessage = (voiceMessage: {
    audioBlob: Blob;
    transcription: string;
    duration: number;
  }) => {
    if (!selectedContactId) return;

    // Create blob URL for the audio
    const audioUrl = URL.createObjectURL(voiceMessage.audioBlob);

    // Create optimistic voice message
    const voiceMsg: Message = {
      id: `temp-voice-${Date.now()}`,
      contactId: selectedContactId,
      role: "user",
      content: voiceMessage.transcription,
      timestamp: new Date(),
      type: "voice",
      audioUrl,
      duration: voiceMessage.duration,
    };

    // Add to pending messages
    setPendingVoiceMessages((prev) => ({
      ...prev,
      [selectedContactId]: [...(prev[selectedContactId] || []), voiceMsg],
    }));

    // Send transcription to backend
    game.sendMessage(selectedContactId, voiceMessage.transcription);

    // Note: We keep the voice message in the UI permanently
    // The blob URL will be valid for the session
    // If we need to persist across page reloads, we'd need to store audio in localStorage or backend
  };

  const handleSendMessage = (content: string) => {
    if (!selectedContactId) return;

    // Clear input after sending
    setCurrentInputValue("");

    // Special handling for boss messages with advice choices (onboarding or check-in)
    if (selectedContactId === "boss-pinned") {
      const hasAdviceChoices =
        adviceChoicesByThread["boss-pinned"] &&
        adviceChoicesByThread["boss-pinned"].length > 0;

      if (hasAdviceChoices) {
        // This is either onboarding or check-in acknowledgment
        console.log(
          "👔 Boss message acknowledged! Starting next consultation...",
        );

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

    // Send to server (including regular boss messages and regular client messages)
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
  // Include pending voice messages for optimistic UI and filter boss typing indicator
  const messages: Message[] = useMemo(() => {
    if (!selectedContactId) return [];

    const serverMessages = messagesByThread[selectedContactId] || [];
    const voiceMessages = pendingVoiceMessages[selectedContactId] || [];

    // Create a map of transcriptions to voice messages for quick lookup
    const voiceByContent = new Map(voiceMessages.map((vm) => [vm.content, vm]));

    // Replace matching text messages with voice messages to preserve order
    const mergedMessages = serverMessages.map((msg) => {
      // If this is a user text message that has a matching voice message, replace it
      if (
        msg.role === "user" &&
        msg.type !== "voice" &&
        voiceByContent.has(msg.content)
      ) {
        return voiceByContent.get(msg.content)!;
      }
      return msg;
    });

    // Add any voice messages that don't have a server match yet (optimistic UI)
    const serverContents = new Set(serverMessages.map((m) => m.content));
    const newVoiceMessages = voiceMessages.filter(
      (vm) => !serverContents.has(vm.content),
    );

    let allMessages = [...mergedMessages, ...newVoiceMessages];

    // If showing typing indicator for boss onboarding, hide the first message temporarily
    if (
      selectedContactId === "boss-pinned" &&
      bossIsTypingOnboarding &&
      allMessages.length > 0 &&
      allMessages[0].role === "contact"
    ) {
      return [];
    }

    return allMessages;
  }, [selectedContactId, messagesByThread, pendingVoiceMessages, bossIsTypingOnboarding]);

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

  // Handler for closing results modal - show milestones/achievements next
  const handleResultsModalClose = (open: boolean) => {
    setShowResultsModal(open);
    if (!open) {
      // Check for milestones to show
      const endData = selectedContactId
        ? conversationEndDataByThread[selectedContactId]
        : undefined;

      if (
        endData?.milestonesAchieved &&
        endData.milestonesAchieved.length > 0
      ) {
        setCurrentMilestones(endData.milestonesAchieved);
        setShowMilestonesModal(true);
      } else if (
        endData?.achievementsUnlocked &&
        endData.achievementsUnlocked.length > 0
      ) {
        setCurrentAchievements(endData.achievementsUnlocked);
        setShowAchievementsModal(true);
      }
    }
  };

  // Handler for closing milestones modal - show achievements next
  const handleMilestonesModalClose = (open: boolean) => {
    setShowMilestonesModal(open);
    if (!open) {
      const endData = selectedContactId
        ? conversationEndDataByThread[selectedContactId]
        : undefined;

      if (
        endData?.achievementsUnlocked &&
        endData.achievementsUnlocked.length > 0
      ) {
        setCurrentAchievements(endData.achievementsUnlocked);
        setShowAchievementsModal(true);
      }
    }
  };

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
        onSendVoiceMessage={handleSendVoiceMessage}
        onBack={handleBackToContacts}
        showChat={showChat}
        contactIsTyping={
          selectedContactId === "boss-pinned" && bossIsTypingOnboarding
            ? true
            : game.isSending
        }
        adviceChoices={currentAdviceChoices}
        isThreadResolved={isThreadResolved}
        conversationEndData={conversationEndData}
        inputValue={currentInputValue}
        onInputChange={setCurrentInputValue}
      />

      {/* Modals - shown in sequence after consultation ends */}
      {currentResultsData && (
        <ConsultationResultsModal
          open={showResultsModal}
          onOpenChange={handleResultsModalClose}
          {...currentResultsData}
        />
      )}

      <MilestoneModal
        open={showMilestonesModal}
        onOpenChange={handleMilestonesModalClose}
        milestones={currentMilestones}
      />

      <AchievementUnlockModal
        open={showAchievementsModal}
        onOpenChange={setShowAchievementsModal}
        achievements={currentAchievements}
        totalCoins={currentAchievements.reduce(
          (sum, ach) => sum + (ach.coinReward || 0),
          0,
        )}
      />

      {currentQuiz && (
        <QuizModal
          open={showQuizModal}
          onOpenChange={setShowQuizModal}
          quiz={currentQuiz}
          onComplete={(score, correctCount) => {
            console.log("📝 Quiz completed:", { score, correctCount });
            // Don't close the modal here - let the user see the results
            // The modal will close when the user clicks the close button or outside
          }}
        />
      )}

      {/* Game Over Modal - shown when advisor is fired */}
      <GameOverModal
        open={showGameOverModal}
        onOpenChange={setShowGameOverModal}
        firingMessage={gameOverData}
        onRestart={() => {
          // Clear session and reload
          localStorage.clear();
          window.location.reload();
        }}
      />

      {/* Boss interventions now appear in boss-pinned chat thread, no modal needed */}
    </div>
  );
}

// Re-export types for backward compatibility
export type { Contact, Message } from "../types/ui";
