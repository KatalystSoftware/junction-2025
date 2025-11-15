#!/usr/bin/env node
/**
 * TUI-based Financial Advisor Simulator
 *
 * Interactive terminal UI with multi-thread support using Ink (React for CLIs)
 */

import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { characterPool, getTrustTierInfo } from "./mastra/index.ts";
import {
  startNewConsultation,
  handleAdvisorResponse,
  handleAdviceChoice,
  createNewAdvisor,
  getActiveThreads,
} from "./mastra/game/orchestrator.ts";
import {
  loadSession,
  saveSession,
  generateSessionId,
  formatSessionId,
} from "./mastra/persistence/session-store.ts";
import {
  getSkillTrend,
  createSkillTrendGraph,
  getBossReviewStatus,
  ACHIEVEMENTS,
  type Milestone,
  type Achievement,
} from "./mastra/game/progress-system.ts";
import type {
  AdvisorState,
  ConversationThread,
  GameResponse,
  AdviceChoice,
  TrustTier,
} from "./mastra/types/game-types.ts";
import { Modal } from "./components/Modal.tsx";

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  voiceUrgency?: "calm" | "concerned" | "urgent" | "excited";
}

interface ThreadData {
  threadId: string;
  characterName: string;
  messages: Message[];
  unreadCount: number;
  status: "active" | "completed";
  adviceChoices?: AdviceChoice[];
}

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const { exit } = useApp();
  const [sessionId, setSessionId] = useState<string>("");
  const [advisorState, setAdvisorState] = useState<AdvisorState | null>(null);
  const [threads, setThreads] = useState<Map<string, ThreadData>>(new Map());
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [activePanel, setActivePanel] = useState<
    "stats" | "relationships" | "progress" | "achievements" | null
  >(null);
  const [showAllThreads, setShowAllThreads] = useState(false); // Toggle active/all threads
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingMessage, setOnboardingMessage] = useState<any>(null);
  const [checkinMessage, setCheckinMessage] = useState<any>(null);
  const [bossReview, setBossReview] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [lastQuizAnswer, setLastQuizAnswer] = useState<number | null>(null);
  const [finalResults, setFinalResults] = useState<{
    characterName: string;
    response: GameResponse;
  } | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [miniFeedback, setMiniFeedback] = useState<string | null>(null);

  // Helper: Convert threads to format for saving (filter system messages, remove timestamps)
  const getThreadHistoriesForSave = (
    threadMap: Map<string, ThreadData>,
  ): Map<string, Array<{ role: "user" | "assistant"; content: string }>> => {
    const histories = new Map<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >();

    threadMap.forEach((thread, threadId) => {
      const history = thread.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      histories.set(threadId, history);
    });

    return histories;
  };

  // Initialize game
  useEffect(() => {
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Parse command line arguments for --uuid flag
      const args = process.argv.slice(2);
      const uuidIndex = args.indexOf("--uuid");
      const providedUuid = uuidIndex !== -1 ? args[uuidIndex + 1] : null;

      let currentSessionId: string;
      let savedState: Awaited<ReturnType<typeof loadSession>> = null;

      if (providedUuid) {
        // Try to load existing session
        setStatusMessage(`Loading session ${formatSessionId(providedUuid)}...`);
        savedState = await loadSession(providedUuid);
        currentSessionId = providedUuid;

        if (savedState) {
          setStatusMessage(
            `✅ Loaded session from ${new Date(savedState.savedAt).toLocaleString()}`,
          );
        } else {
          setStatusMessage(
            `⚠️ Session not found, creating new session with UUID ${formatSessionId(providedUuid)}`,
          );
        }
      } else {
        // Generate new session UUID
        currentSessionId = generateSessionId();
        setStatusMessage(
          `✨ New session: ${formatSessionId(currentSessionId)}`,
        );
      }

      // Create or restore advisor state
      const advisor = savedState
        ? savedState.advisorState
        : createNewAdvisor(currentSessionId);

      // Restore thread histories if available
      if (savedState?.threadHistories) {
        const restoredThreads = new Map<string, ThreadData>();
        savedState.threadHistories.forEach((history, threadId) => {
          // Find thread info from advisor state
          const threadInfo = advisor.activeThreads[threadId];
          if (threadInfo) {
            const messages: Message[] = history.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(),
            }));

            restoredThreads.set(threadId, {
              threadId,
              characterName: threadInfo.characterId, // We'll update this when we have character data
              messages,
              unreadCount: 0,
              status: threadInfo.status === "resolved" ? "completed" : "active",
            });
          }
        });
        setThreads(restoredThreads);
      }

      setSessionId(currentSessionId);
      setAdvisorState(advisor);

      const sessionInfo = savedState
        ? `Session: ${formatSessionId(currentSessionId)} | Rep: ${advisor.reputation}/100 | Skill: ${advisor.skillLevel.toFixed(1)}/10`
        : `Session: ${formatSessionId(currentSessionId)} | To continue later: pnpm play:tui --uuid ${currentSessionId}`;

      setStatusMessage(`${sessionInfo}\nReady! Press 'n' for new consultation`);
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

    // Toggle panels (s=stats, r=relationships, p=progress, a=achievements)
    const panelKeys: Record<
      string,
      "stats" | "relationships" | "progress" | "achievements"
    > = {
      s: "stats",
      r: "relationships",
      p: "progress",
      a: "achievements",
    };

    if (panelKeys[input] && !inputValue) {
      setActivePanel(
        activePanel === panelKeys[input] ? null : panelKeys[input],
      );
      return;
    }

    // Toggle history/all threads
    if (input === "h" && !inputValue) {
      setShowAllThreads(!showAllThreads);
      setStatusMessage(
        showAllThreads
          ? "Showing active threads only"
          : "Showing all threads (history)",
      );
      return;
    }

    // New consultation
    if (input === "n" && !inputValue) {
      handleNewConsultation();
      return;
    }

    // Handle number input (1-9)
    if (/^[1-9]$/.test(input) && !inputValue) {
      // Check if current thread has advice choices - if so, this is a choice selection
      const currentThread = currentThreadId
        ? threads.get(currentThreadId)
        : null;
      if (
        currentThread?.adviceChoices &&
        currentThread.adviceChoices.length > 0
      ) {
        const choiceIndex = parseInt(input) - 1;
        if (choiceIndex < currentThread.adviceChoices.length) {
          handleChoiceSelection(choiceIndex);
        } else {
          setStatusMessage(
            `Invalid choice. Select 1-${currentThread.adviceChoices.length}`,
          );
        }
        return;
      }

      // Otherwise, treat as thread switching
      const threadIndex = parseInt(input) - 1;
      // Filter based on current view (active only or all)
      const threadList = Array.from(threads.values()).filter((t) =>
        showAllThreads ? true : t.status === "active",
      );
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
        setStatusMessage(
          `Switched to ${targetThread.characterName}${targetThread.status === "completed" ? " (completed)" : ""}`,
        );
      } else {
        setStatusMessage(`Invalid thread number. Use 1-${threadList.length}`);
      }
      return;
    }

    // Close boss review modal and start quiz if available
    // Handle onboarding modal dismissal
    if (onboardingMessage && input === " ") {
      setOnboardingMessage(null);
      setStatusMessage("Press 'n' to meet your first client!");
      return;
    }

    // Handle boss check-in modal dismissal
    if (checkinMessage && input === " ") {
      setCheckinMessage(null);
      setStatusMessage("Press 'n' for new consultation");
      return;
    }

    if (bossReview && input === " ") {
      if (bossReview.quiz) {
        // Start quiz
        setQuiz(bossReview.quiz);
        setCurrentQuestionIndex(0);
        setQuizAnswers([]);
        setShowQuizFeedback(false);
        setLastQuizAnswer(null);
        setBossReview(null);
        setStatusMessage("Quiz started! Select your answer (1-4)");
      } else {
        // Boss review completed without quiz - auto-save
        setBossReview(null);
        if (advisorState && sessionId) {
          saveSession(
            sessionId,
            advisorState,
            getThreadHistoriesForSave(threads),
          );
        }
      }
      return;
    }

    // Handle quiz answer input
    if (quiz && !showQuizFeedback && !inputValue) {
      if (/^[1-4]$/.test(input)) {
        const answerIndex = parseInt(input) - 1;
        const updatedAnswers = [...quizAnswers, answerIndex];
        setQuizAnswers(updatedAnswers);
        setLastQuizAnswer(answerIndex);
        setShowQuizFeedback(true);

        const currentQuestion = quiz.questions[currentQuestionIndex];
        const isCorrect = answerIndex === currentQuestion.correctAnswer;
        setStatusMessage(
          isCorrect
            ? "✅ Correct! Press SPACE to continue"
            : "❌ Incorrect. Press SPACE to continue",
        );
      }
      return;
    }

    // Handle moving to next question after feedback
    if (quiz && showQuizFeedback && input === " ") {
      setShowQuizFeedback(false);
      setLastQuizAnswer(null);

      if (currentQuestionIndex + 1 < quiz.questions.length) {
        // Move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setStatusMessage(
          `Question ${currentQuestionIndex + 2}/${quiz.questions.length}`,
        );
      } else {
        // Quiz complete - calculate results
        const correctCount = quiz.questions.filter(
          (q: any, i: number) => quizAnswers[i] === q.correctAnswer,
        ).length;
        const scorePercentage = (correctCount / quiz.questions.length) * 100;

        let skillBonus = 0;
        let reputationBonus = 0;

        if (scorePercentage >= 80) {
          skillBonus = 0.3;
          reputationBonus = 5;
        } else if (scorePercentage >= 60) {
          skillBonus = 0.2;
          reputationBonus = 3;
        } else if (scorePercentage >= 40) {
          skillBonus = 0.1;
          reputationBonus = 1;
        }

        // Apply bonuses
        if (advisorState && (skillBonus > 0 || reputationBonus > 0)) {
          const updatedState = {
            ...advisorState,
            skillLevel: advisorState.skillLevel + skillBonus,
            reputation: advisorState.reputation + reputationBonus,
          };

          // Update topic expertise based on quiz topic
          if (quiz.topic && updatedState.topicsExpertise) {
            const topic =
              quiz.topic as keyof typeof updatedState.topicsExpertise;
            updatedState.topicsExpertise = {
              ...updatedState.topicsExpertise,
              [topic]: (updatedState.topicsExpertise[topic] || 0) + skillBonus,
            };
          }

          setAdvisorState(updatedState);

          // Auto-save after quiz completion
          if (sessionId) {
            saveSession(
              sessionId,
              updatedState,
              getThreadHistoriesForSave(threads),
            );
          }
        }

        // Show results (will be handled by QuizResultsModal)
        setStatusMessage(
          `Quiz complete! Score: ${scorePercentage.toFixed(0)}% (Press SPACE to continue)`,
        );
      }
      return;
    }

    // Close quiz results
    if (
      quiz &&
      currentQuestionIndex >= quiz.questions.length &&
      !showQuizFeedback &&
      input === " "
    ) {
      setQuiz(null);
      setCurrentQuestionIndex(0);
      setQuizAnswers([]);
      setShowQuizFeedback(false);
      setLastQuizAnswer(null);
      setStatusMessage("Ready! Press 'n' for new consultation");
      return;
    }

    // Close milestones modal
    if (milestones.length > 0 && input === " ") {
      setMilestones([]);
      // Check if there are achievements to show next
      if (newAchievements.length === 0) {
        setStatusMessage("Ready! Press 'n' for new consultation");
      }
      return;
    }

    // Close achievements modal
    if (newAchievements.length > 0 && input === " ") {
      setNewAchievements([]);
      setStatusMessage("Ready! Press 'n' for new consultation");
      return;
    }

    // Close final results modal
    if (finalResults && input === " ") {
      const threadIdToClose = currentThreadId;
      setFinalResults(null);

      // Mark thread as completed
      if (threadIdToClose) {
        const updated = new Map(threads);
        const thread = updated.get(threadIdToClose);
        if (thread) {
          thread.status = "completed";
          updated.set(threadIdToClose, thread);
          setThreads(updated);
        }

        // Switch to another active thread if available
        const activeThreads = Array.from(updated.values()).filter(
          (t) => t.status === "active",
        );
        if (activeThreads.length > 0) {
          setCurrentThreadId(activeThreads[0].threadId);
          setStatusMessage(`Switched to ${activeThreads[0].characterName}`);
        } else {
          setCurrentThreadId(null);
          setStatusMessage(
            "No active threads. Press 'n' for new client (or 'h' to view history)",
          );
        }
      }
      return;
    }

    // Text input handling (only if no choices available)
    const currentThread = currentThreadId ? threads.get(currentThreadId) : null;
    const hasChoices =
      currentThread?.adviceChoices && currentThread.adviceChoices.length > 0;

    if (!hasChoices) {
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

      // Onboarding
      if (
        consultation.type === "onboarding" &&
        consultation.onboardingMessage
      ) {
        setOnboardingMessage(consultation.onboardingMessage);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage("Welcome! Press SPACE to continue");
        setIsLoading(false);

        // Auto-save after onboarding
        if (sessionId) {
          await saveSession(
            sessionId,
            consultation.stateUpdate,
            getThreadHistoriesForSave(threads),
          );
        }
        return;
      }

      // Boss check-in
      if (consultation.type === "boss_checkin" && consultation.checkinMessage) {
        setCheckinMessage(consultation.checkinMessage);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage("Boss check-in! Press SPACE to continue");
        setIsLoading(false);

        // Auto-save after check-in
        if (sessionId) {
          await saveSession(
            sessionId,
            consultation.stateUpdate,
            getThreadHistoriesForSave(threads),
          );
        }
        return;
      }

      // Boss review
      if (consultation.type === "god_boss_review" && consultation.review) {
        setBossReview(consultation.review);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage("Boss review received! Press SPACE to continue");
        setIsLoading(false);

        // Auto-save after boss review state update
        if (sessionId) {
          await saveSession(
            sessionId,
            consultation.stateUpdate,
            getThreadHistoriesForSave(threads),
          );
        }
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
              isVoice: consultation.voiceNeeded,
              voiceUrgency: consultation.voiceConfig?.urgency,
            },
          ],
          unreadCount: 0,
          status: "active",
          adviceChoices: consultation.adviceChoices,
        };

        const updated = new Map(threads);
        updated.set(newThreadId, newThread);
        setThreads(updated);
        setCurrentThreadId(newThreadId);
        setAdvisorState(consultation.stateUpdate);
        setStatusMessage(`New client: ${characterName}`);

        // Auto-save after new consultation
        if (sessionId) {
          await saveSession(
            sessionId,
            consultation.stateUpdate,
            getThreadHistoriesForSave(updated),
          );
        }
      } else {
        setStatusMessage("No characters available");
      }
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle choice selection
  const handleChoiceSelection = async (choiceIndex: number) => {
    if (!advisorState || !currentThreadId) {
      setStatusMessage("No active thread. Press 'n' for new consultation");
      return;
    }

    const thread = threads.get(currentThreadId);
    if (!thread || !thread.adviceChoices) return;

    setIsLoading(true);
    setStatusMessage("Processing your advice...");

    try {
      const selectedChoice = thread.adviceChoices[choiceIndex];

      const history: Array<{ role: "user" | "assistant"; content: string }> =
        thread.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

      // Call handleAdviceChoice
      const response = await handleAdviceChoice(
        currentThreadId,
        choiceIndex,
        advisorState,
        history,
      );

      setAdvisorState(response.stateUpdate);

      // Add user's choice and response to messages
      const userMessage: Message = {
        role: "user",
        content: `[Selected: ${selectedChoice.actionText}]`,
        timestamp: new Date(),
      };

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
        adviceChoices: undefined, // Clear choices after selection
      });
      setThreads(updated);

      // Check if conversation ended
      if (response.type === "conversation_end") {
        // Show final results modal
        setFinalResults({
          characterName: thread.characterName,
          response: response,
        });
        setStatusMessage("Consultation complete! Press SPACE to continue");
      } else {
        setStatusMessage("Type your response");
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
          isVoice: response.voiceNeeded,
          voiceUrgency: response.voiceConfig?.urgency,
        });
      }

      const updated = new Map(threads);
      updated.set(currentThreadId, {
        ...thread,
        messages: updatedMessages,
      });
      setThreads(updated);

      // Auto-save after message exchange
      if (sessionId) {
        await saveSession(
          sessionId,
          response.stateUpdate,
          getThreadHistoriesForSave(updated),
        );
      }

      // Check if conversation ended
      if (response.type === "conversation_end") {
        // Capture progress data
        if (response.miniFeedback) {
          setMiniFeedback(response.miniFeedback);
        }

        // Check for milestones first (highest priority modal)
        if (
          response.milestonesAchieved &&
          response.milestonesAchieved.length > 0
        ) {
          setMilestones(response.milestonesAchieved);
          setStatusMessage("Milestone achieved! Press SPACE to continue");
          return;
        }

        // Then check for achievements
        if (
          response.achievementsUnlocked &&
          response.achievementsUnlocked.length > 0
        ) {
          setNewAchievements(response.achievementsUnlocked);
          setStatusMessage("New achievement unlocked! Press SPACE to continue");
          return;
        }

        // Finally show final results modal with relationship changes and financial impact
        let statusMsg = "Consultation complete!";

        // Add tier change to status message
        if (response.tierChangeNotification) {
          const tierInfo = getTrustTierInfo(
            response.tierChangeNotification.newTier,
          );
          statusMsg = `${tierInfo.icon} ${response.tierChangeNotification.characterName} is now ${tierInfo.name}! ${statusMsg}`;
        }

        // Add recommendation to status message
        if (response.recommendationMessage) {
          statusMsg = `${response.recommendationMessage} | ${statusMsg}`;
        }

        setFinalResults({
          characterName: thread.characterName,
          response: response,
        });
        setStatusMessage(statusMsg + " Press SPACE to continue");
      } else {
        // Show tier change notification even during conversation
        if (response.tierChangeNotification) {
          const tierInfo = getTrustTierInfo(
            response.tierChangeNotification.newTier,
          );
          setStatusMessage(
            `${tierInfo.icon} ${response.tierChangeNotification.characterName} trusts you more! (${tierInfo.name})`,
          );
        } else {
          setStatusMessage("Type your response");
        }
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

  // Milestone modal (highest priority)
  if (milestones.length > 0) {
    return <MilestoneModal milestones={milestones} />;
  }

  // Achievement modal (second priority)
  if (newAchievements.length > 0) {
    return <AchievementModal achievements={newAchievements} />;
  }

  // Final results modal (third priority)
  if (finalResults) {
    return (
      <FinalResultsModal
        characterName={finalResults.characterName}
        response={finalResults.response}
      />
    );
  }

  // Onboarding modal
  if (onboardingMessage) {
    return <OnboardingModal message={onboardingMessage} />;
  }

  // Boss check-in modal
  if (checkinMessage) {
    return <BossCheckinModal message={checkinMessage} />;
  }

  // Boss review modal
  if (bossReview) {
    return <BossReviewModal review={bossReview} />;
  }

  // Quiz modal
  if (quiz) {
    if (showQuizFeedback && lastQuizAnswer !== null) {
      // Show feedback for current question
      return (
        <QuizFeedbackModal
          quiz={quiz}
          currentQuestionIndex={currentQuestionIndex}
          userAnswer={lastQuizAnswer}
        />
      );
    } else if (currentQuestionIndex < quiz.questions.length) {
      return (
        <QuizQuestionModal
          quiz={quiz}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={quiz.questions.length}
        />
      );
    } else {
      return (
        <QuizResultsModal
          quiz={quiz}
          answers={quizAnswers}
          advisorState={advisorState}
        />
      );
    }
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
            {showAllThreads ? "All Threads" : "Active Threads"} (
            {
              Array.from(threads.values()).filter((t) =>
                showAllThreads ? true : t.status === "active",
              ).length
            }
            )
          </Text>
          <Text dimColor> </Text>
          {Array.from(threads.values())
            .filter((t) => (showAllThreads ? true : t.status === "active"))
            .map((thread, index) => {
              const isCurrent = thread.threadId === currentThreadId;
              const isCompleted = thread.status === "completed";
              const indicator = isCurrent ? "►" : " ";
              const statusIcon = isCompleted ? "✓ " : "";
              const unreadBadge =
                thread.unreadCount > 0 ? ` (${thread.unreadCount})` : "";
              return (
                <Text
                  key={thread.threadId}
                  color={isCompleted ? "gray" : isCurrent ? "green" : "white"}
                  bold={isCurrent}
                  dimColor={isCompleted}
                >
                  {indicator}[{index + 1}] {statusIcon}
                  {thread.characterName}
                  {unreadBadge}
                </Text>
              );
            })}
          {threads.size === 0 && <Text dimColor>No threads</Text>}
          {!showAllThreads &&
            Array.from(threads.values()).filter((t) => t.status === "active")
              .length === 0 &&
            threads.size > 0 && (
              <Text dimColor>No active threads (press 'h' for history)</Text>
            )}
          <Text dimColor> </Text>
          <Text dimColor>───────────────</Text>
          {activePanel === "stats" ? (
            <StatsPanel advisorState={advisorState} />
          ) : activePanel === "relationships" ? (
            <RelationshipsPanel advisorState={advisorState} />
          ) : activePanel === "progress" ? (
            <ProgressPanel advisorState={advisorState} />
          ) : activePanel === "achievements" ? (
            <AchievementsPanel advisorState={advisorState} />
          ) : (
            <>
              <Text dimColor>Commands:</Text>
              <Text dimColor>1-9 Switch</Text>
              <Text dimColor>n New</Text>
              <Text dimColor>h History</Text>
              <Text dimColor>s Stats</Text>
              <Text dimColor>r Relationships</Text>
              <Text dimColor>p Progress</Text>
              <Text dimColor>a Achievements</Text>
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
        <Box>
          <Text dimColor>
            Rep: {advisorState.reputation} | Skill:{" "}
            {advisorState.skillLevel.toFixed(1)} |{" "}
          </Text>
          <Text dimColor>{getBossReviewStatus(advisorState)}</Text>
        </Box>
      </Box>

      {/* Input box */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        {currentThreadId &&
        threads.get(currentThreadId)?.adviceChoices &&
        threads.get(currentThreadId)!.adviceChoices!.length > 0 ? (
          <Text dimColor>
            Select an option above (1-
            {threads.get(currentThreadId)!.adviceChoices!.length})
          </Text>
        ) : (
          <>
            <Text color="green">💼 You: </Text>
            <Text>{inputValue}</Text>
            <Text color="gray">█</Text>
          </>
        )}
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

      {recentMessages.map((msg, index) => {
        // Get voice icon based on urgency
        const getVoiceIcon = (urgency?: string) => {
          switch (urgency) {
            case "urgent": return "🎤❗";
            case "concerned": return "🎤⚠️";
            case "excited": return "🎤✨";
            default: return "🎤";
          }
        };

        return (
          <Box key={index} paddingY={0} flexDirection="column">
            {msg.role === "system" ? (
              <Text color="yellow">ℹ️ {msg.content}</Text>
            ) : msg.role === "user" ? (
              <Text color="green">💼 You: {msg.content}</Text>
            ) : (
              <Text color="blue">
                {msg.isVoice ? getVoiceIcon(msg.voiceUrgency) : "💬"} {thread.characterName}: "{msg.content}"
              </Text>
            )}
          </Box>
        );
      })}

      {/* Show advice choices if available */}
      {thread.adviceChoices && thread.adviceChoices.length > 0 && (
        <Box flexDirection="column" paddingTop={1}>
          <Box borderStyle="single" borderColor="yellow" paddingX={1}>
            <Text bold color="yellow">
              💡 Your Advice Options:
            </Text>
          </Box>
          {thread.adviceChoices.map((choice, index) => (
            <Box key={index} flexDirection="column" paddingY={0}>
              <Text color="cyan">
                [{index + 1}] {choice.icon} {choice.actionText}
              </Text>
              <Text dimColor> {choice.projectedOutcome}</Text>
            </Box>
          ))}
          <Text dimColor> </Text>
          <Text dimColor>Press 1-{thread.adviceChoices.length} to select</Text>
        </Box>
      )}
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
// Relationships Panel Component
// ============================================================================

function getTrustHearts(trustLevel: number): string {
  const fullHearts = Math.floor(trustLevel * 5);
  const emptyHearts = 5 - fullHearts;
  return "❤️".repeat(fullHearts) + "🤍".repeat(emptyHearts);
}

function getOutcomeIcon(
  outcome: "helped" | "struggling" | "pending" | "unknown",
): string {
  switch (outcome) {
    case "helped":
      return "✅";
    case "struggling":
      return "⚠️";
    case "pending":
      return "❓";
    default:
      return "❓";
  }
}

function getTrendIcon(trend: "improving" | "declining" | "stable"): string {
  switch (trend) {
    case "improving":
      return "📈";
    case "declining":
      return "📉";
    case "stable":
      return "➡️";
  }
}

function getTrustColor(trustLevel: number): string {
  if (trustLevel >= 0.8) return "magenta";
  if (trustLevel >= 0.6) return "green";
  if (trustLevel >= 0.4) return "cyan";
  if (trustLevel >= 0.2) return "yellow";
  return "gray";
}

function getTrustProgressBar(trustLevel: number): string {
  const barLength = 10;
  const filled = Math.floor(trustLevel * barLength);
  const empty = barLength - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function RelationshipsPanel({ advisorState }: { advisorState: AdvisorState }) {
  const relationships = characterPool.getCharacterRelationships(
    advisorState.advisorId,
  );

  if (relationships.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">
          💝 Relationships
        </Text>
        <Text dimColor>No characters met yet</Text>
        <Text dimColor> </Text>
        <Text dimColor>Build relationships by</Text>
        <Text dimColor>giving good advice!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        💝 Relationships ({relationships.length})
      </Text>
      <Text dimColor> </Text>
      {relationships.slice(0, 4).map((rel, index) => {
        const tierInfo = getTrustTierInfo(rel.trustTier);
        const trustPercent = Math.round(rel.trustLevel * 100);

        return (
          <Box key={index} flexDirection="column" paddingBottom={1}>
            {/* Character Name and Tier */}
            <Box>
              <Text color={getTrustColor(rel.trustLevel)}>
                {tierInfo.icon} {rel.name.substring(0, 16)}
              </Text>
            </Box>

            {/* Trust Progress Bar */}
            <Box>
              <Text dimColor>
                {getTrustProgressBar(rel.trustLevel)} {trustPercent}%
              </Text>
            </Box>

            {/* Status Icons */}
            <Box>
              <Text dimColor>
                {getTrendIcon(rel.recentTrend)}{" "}
                {rel.wasRecommended ? "🤝 " : ""}
                {getOutcomeIcon(rel.lastOutcome)} v{rel.visitCount}
              </Text>
            </Box>

            {/* Decay Warning */}
            {rel.decayApplied > 0.1 && (
              <Box>
                <Text color="red" dimColor>
                  ⚠️ Trust decayed
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {relationships.length > 4 && (
        <Text dimColor>...and {relationships.length - 4} more</Text>
      )}

      <Text dimColor> </Text>
      <Text dimColor>Legend:</Text>
      <Text dimColor>📈=improving 🤝=referred</Text>
      <Text dimColor>v=visits ✅=helped</Text>
    </Box>
  );
}

// ============================================================================
// Progress Panel Component
// ============================================================================

function ProgressPanel({ advisorState }: { advisorState: AdvisorState }) {
  const trend = getSkillTrend(advisorState.sessionHistory);
  const graph = createSkillTrendGraph(trend);

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        📈 Progress
      </Text>
      <Text dimColor> </Text>
      <Text dimColor>Skill Trend:</Text>
      {graph.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
      <Text dimColor> </Text>
      <Text dimColor>Sessions: {advisorState.totalSessions}</Text>
      <Text dimColor>Clients: {advisorState.totalClientsHelped}</Text>
      <Text dimColor>Coins: {advisorState.advisorCoins}</Text>
    </Box>
  );
}

// ============================================================================
// Achievements Panel Component
// ============================================================================

function AchievementsPanel({ advisorState }: { advisorState: AdvisorState }) {
  const unlockedIds = new Set(advisorState.achievementsUnlocked);
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        🏆 Achievements
      </Text>
      <Text dimColor> </Text>
      <Text color="green">
        Unlocked: {unlocked.length}/{ACHIEVEMENTS.length}
      </Text>
      <Text dimColor> </Text>
      {unlocked.slice(0, 3).map((achievement, index) => (
        <Box key={index} flexDirection="column">
          <Text color="green">
            {achievement.icon} {achievement.name}
          </Text>
          <Text dimColor>{achievement.description}</Text>
        </Box>
      ))}
      {unlocked.length === 0 && <Text dimColor>No achievements yet</Text>}
      {unlocked.length > 3 && (
        <Text dimColor>...and {unlocked.length - 3} more</Text>
      )}
      <Text dimColor> </Text>
      <Text dimColor>Next to unlock:</Text>
      {locked.slice(0, 2).map((achievement, index) => (
        <Box key={index} flexDirection="column">
          <Text dimColor>🔒 {achievement.name}</Text>
          <Text dimColor>{achievement.description}</Text>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// Milestone Modal Component
// ============================================================================

function MilestoneModal({ milestones }: { milestones: Milestone[] }) {
  return (
    <Modal title="🎯 MILESTONE ACHIEVED!" color="yellow">
      {milestones.map((milestone, index) => (
        <Box key={index} flexDirection="column" paddingY={1}>
          <Text bold color="green">
            {milestone.icon} {milestone.title}
          </Text>
          <Text color="cyan">{milestone.message}</Text>
          <Text> </Text>
        </Box>
      ))}
    </Modal>
  );
}

// ============================================================================
// Achievement Modal Component
// ============================================================================

function AchievementModal({ achievements }: { achievements: Achievement[] }) {
  const totalCoins = achievements.reduce((sum, a) => sum + a.coinReward, 0);

  return (
    <Modal title="🏆 ACHIEVEMENT UNLOCKED!" color="magenta">
      {achievements.map((achievement, index) => (
        <Box key={index} flexDirection="column" paddingY={1}>
          <Text bold color="green">
            {achievement.icon} {achievement.name}
          </Text>
          <Text color="cyan">{achievement.description}</Text>
          <Text color="yellow">Reward: +{achievement.coinReward} coins</Text>
          <Text> </Text>
        </Box>
      ))}

      <Text bold color="green">
        Total coins earned: {totalCoins}
      </Text>
    </Modal>
  );
}

// ============================================================================
// Quiz Question Modal Component
// ============================================================================

function QuizQuestionModal({
  quiz,
  currentQuestionIndex,
  totalQuestions,
}: {
  quiz: any;
  currentQuestionIndex: number;
  totalQuestions: number;
}) {
  const question = quiz.questions[currentQuestionIndex];

  return (
    <Modal title="📝 INTERACTIVE QUIZ" color="cyan" showContinue={false}>
      <Text dimColor>
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </Text>
      <Text> </Text>

      <Box
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color="blue">
          {question.question}
        </Text>
      </Box>
      <Text> </Text>

      <Text bold color="yellow">
        Options:
      </Text>
      {question.options.map((opt: string, idx: number) => (
        <Text key={idx} color="yellow">
          {idx + 1}. {opt}
        </Text>
      ))}
      <Text> </Text>

      <Text dimColor>Press 1-4 to answer</Text>
    </Modal>
  );
}

// ============================================================================
// Quiz Feedback Modal Component
// ============================================================================

function QuizFeedbackModal({
  quiz,
  currentQuestionIndex,
  userAnswer,
}: {
  quiz: any;
  currentQuestionIndex: number;
  userAnswer: number;
}) {
  const question = quiz.questions[currentQuestionIndex];
  const isCorrect = userAnswer === question.correctAnswer;

  return (
    <Modal
      title={isCorrect ? "✅ CORRECT!" : "❌ INCORRECT"}
      color={isCorrect ? "green" : "red"}
    >
      <Box
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        flexDirection="column"
      >
        <Text color="blue">{question.question}</Text>
      </Box>
      <Text> </Text>

      <Text color="yellow">Your answer:</Text>
      <Text color={isCorrect ? "green" : "red"}>
        • {question.options[userAnswer]}
      </Text>
      <Text> </Text>

      {!isCorrect && (
        <>
          <Text color="yellow">Correct answer:</Text>
          <Text color="green">
            • {question.options[question.correctAnswer]}
          </Text>
          <Text> </Text>
        </>
      )}

      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color="cyan">
          💡 Explanation:
        </Text>
        <Text color="cyan">{question.explanation}</Text>
      </Box>
    </Modal>
  );
}

// ============================================================================
// Quiz Results Modal Component
// ============================================================================

function QuizResultsModal({
  quiz,
  answers,
  advisorState,
}: {
  quiz: any;
  answers: number[];
  advisorState: AdvisorState | null;
}) {
  const correctCount = quiz.questions.filter(
    (q: any, i: number) => answers[i] === q.correctAnswer,
  ).length;
  const scorePercentage = (correctCount / quiz.questions.length) * 100;

  let skillBonus = 0;
  let reputationBonus = 0;
  let message = "";

  if (scorePercentage >= 80) {
    skillBonus = 0.3;
    reputationBonus = 5;
    message = "🌟 Excellent! You really know your stuff!";
  } else if (scorePercentage >= 60) {
    skillBonus = 0.2;
    reputationBonus = 3;
    message = "✨ Good job! You're on the right track!";
  } else if (scorePercentage >= 40) {
    skillBonus = 0.1;
    reputationBonus = 1;
    message = "👍 Not bad, but there's room for improvement.";
  } else {
    message = "📚 You might want to review the learning materials!";
  }

  return (
    <Modal title="📊 QUIZ RESULTS" color="magenta">
      <Text color="green" bold>
        Score: {correctCount}/{quiz.questions.length} (
        {scorePercentage.toFixed(0)}%)
      </Text>
      <Text> </Text>

      <Text color="cyan">{message}</Text>
      <Text> </Text>

      {(skillBonus > 0 || reputationBonus > 0) && (
        <>
          <Text bold color="green">
            🎁 Bonus Rewards:
          </Text>
          <Text color="green">• +{skillBonus} Skill Level</Text>
          <Text color="green">• +{reputationBonus} Reputation</Text>
          <Text> </Text>
        </>
      )}

      <Text bold color="yellow">
        Review:
      </Text>
      {quiz.questions.map((q: any, i: number) => {
        const userAnswer = answers[i];
        const isCorrect = userAnswer === q.correctAnswer;

        return (
          <Box key={i} flexDirection="column" paddingY={1}>
            <Text color={isCorrect ? "green" : "red"}>
              {i + 1}. {isCorrect ? "✅" : "❌"} {q.question}
            </Text>
            {!isCorrect && (
              <Text color="yellow" dimColor>
                Your answer: {q.options[userAnswer]}
              </Text>
            )}
            <Text color="yellow" dimColor>
              Correct: {q.options[q.correctAnswer]}
            </Text>
            <Text color="cyan" dimColor>
              💡 {q.explanation}
            </Text>
          </Box>
        );
      })}
    </Modal>
  );
}

// ============================================================================
// Final Results Modal Component
// ============================================================================

function FinalResultsModal({
  characterName,
  response,
}: {
  characterName: string;
  response: GameResponse;
}) {
  const financialResults = response.financialResults;
  const projection = financialResults?.projection;
  const coinsEarned = financialResults?.coinsEarned || 0;
  const evaluation = financialResults?.evaluation;

  return (
    <Modal title="✨ CONSULTATION COMPLETE ✨" color="green">
      <Text color="cyan">Client: {characterName}</Text>
      <Text> </Text>

      {/* Advisor's advice (what the player said) */}
      {response.advisorAdvice && response.advisorAdvice.length > 0 && (
        <>
          <Box
            borderStyle="single"
            borderColor="cyan"
            paddingX={1}
            flexDirection="column"
          >
            <Text color="cyan" bold>
              💼 YOUR ADVICE:
            </Text>
            {response.advisorAdvice.map((advice, idx) => (
              <Text key={idx} color="cyan">
                "{advice}"
              </Text>
            ))}
          </Box>
          <Text> </Text>
        </>
      )}

      {/* Character's final response */}
      {response.messages && response.messages.length > 0 && (
        <>
          <Box
            borderStyle="single"
            borderColor="blue"
            paddingX={1}
            flexDirection="column"
          >
            <Text color="blue">💬 {characterName} says:</Text>
            <Text color="blue">"{response.messages[0]}"</Text>
          </Box>
          <Text> </Text>
        </>
      )}

      {/* Financial Impact */}
      {projection && (
        <>
          <Text bold color="yellow">
            💰 FINANCIAL IMPACT
          </Text>
          <Text dimColor>─────────────────────────</Text>

          {projection.totalSaved !== undefined && (
            <>
              {projection.totalSaved > 0 ? (
                <>
                  <Text color="green">
                    📈 Client will save: {Math.round(projection.totalSaved)}€
                    over {projection.projectionPeriodMonths} months
                  </Text>
                  {projection.monthlySavings > 0 && (
                    <Text color="cyan">
                      ({Math.round(projection.monthlySavings)}€/month average)
                    </Text>
                  )}
                </>
              ) : projection.totalSaved < 0 ? (
                <>
                  <Text color="red" bold>
                    ⚠️ WARNING: Client will lose{" "}
                    {Math.abs(Math.round(projection.totalSaved))}€
                  </Text>
                  {projection.monthlySavings < 0 && (
                    <Text color="red">
                      Deficit: {Math.abs(Math.round(projection.monthlySavings))}
                      €/month
                    </Text>
                  )}
                </>
              ) : (
                <Text color="yellow" dimColor>
                  📈 Savings: 0€ (no meaningful financial progress)
                </Text>
              )}
            </>
          )}

          {projection.totalDebtReduced !== undefined && (
            <>
              {projection.totalDebtReduced > 0 ? (
                <>
                  <Text color="green">
                    💳 Debt reduced by:{" "}
                    {Math.round(projection.totalDebtReduced)}€
                  </Text>
                  {projection.totalInterestSaved > 0 && (
                    <Text color="green">
                      Interest saved:{" "}
                      {Math.round(projection.totalInterestSaved)}€
                    </Text>
                  )}
                  {projection.monthsToGoal > 0 &&
                    projection.monthsToGoal < 999 && (
                      <Text color="cyan">
                        Debt-free in: {Math.round(projection.monthsToGoal)}{" "}
                        months
                      </Text>
                    )}
                </>
              ) : projection.totalDebtReduced < 0 ? (
                <>
                  <Text color="red" bold>
                    ⚠️ Debt will INCREASE by{" "}
                    {Math.abs(Math.round(projection.totalDebtReduced))}€
                  </Text>
                  <Text color="red" bold>
                    This advice made the problem WORSE!
                  </Text>
                </>
              ) : (
                <Text color="yellow" dimColor>
                  💳 Debt reduction: 0€ (no debt progress)
                </Text>
              )}
            </>
          )}

          {projection.emergencyFundProgress > 0 &&
            projection.emergencyFundProgress < 1 && (
              <Text color="cyan">
                🛡️ Emergency Fund:{" "}
                {Math.round(projection.emergencyFundProgress * 100)}% toward
                3-month goal
              </Text>
            )}
          {projection.emergencyFundProgress >= 1 && (
            <Text color="green">🛡️ Emergency Fund: GOAL REACHED! ✅</Text>
          )}

          <Text> </Text>
        </>
      )}

      {/* Advice Feedback */}
      {evaluation && (
        <>
          <Text bold color="cyan">
            📊 ADVICE QUALITY
          </Text>
          <Text dimColor>─────────────────────────</Text>
          <Text
            bold
            color={
              evaluation.qualityScore >= 8
                ? "green"
                : evaluation.qualityScore >= 5
                  ? "yellow"
                  : "red"
            }
          >
            Quality Score: {evaluation.qualityScore.toFixed(1)}/10
          </Text>

          {evaluation.strengths.length > 0 && (
            <>
              <Text color="green" bold>
                ✅ Strengths:
              </Text>
              {evaluation.strengths.map((strength, idx) => (
                <Text key={idx} color="green">
                  • {strength}
                </Text>
              ))}
            </>
          )}

          {evaluation.weaknesses.length > 0 && (
            <>
              <Text color="red" bold>
                ⚠️ Weaknesses:
              </Text>
              {evaluation.weaknesses.map((weakness, idx) => (
                <Text key={idx} color="red">
                  • {weakness}
                </Text>
              ))}
            </>
          )}

          {evaluation.missedOpportunities.length > 0 && (
            <>
              <Text color="yellow" bold>
                💡 Missed Opportunities:
              </Text>
              {evaluation.missedOpportunities.map((opportunity, idx) => (
                <Text key={idx} color="yellow">
                  • {opportunity}
                </Text>
              ))}
            </>
          )}

          <Text> </Text>
        </>
      )}

      {/* Earnings */}
      <Text dimColor>─────────────────────────</Text>
      <Text
        bold
        color={coinsEarned >= 8 ? "green" : coinsEarned > 0 ? "yellow" : "red"}
      >
        💎 YOU {coinsEarned >= 0 ? "EARNED" : "LOST"}:{" "}
        {coinsEarned >= 0 ? "+" : ""}
        {coinsEarned} coins
      </Text>

      {coinsEarned >= 15 && (
        <Text color="green">
          ✅ Excellent! Great advice + strong financial impact!
        </Text>
      )}
      {coinsEarned >= 8 && coinsEarned < 15 && (
        <Text color="green">✓ Good advice with positive results</Text>
      )}
      {coinsEarned >= 5 && coinsEarned < 8 && (
        <Text color="yellow">~ Acceptable advice, room for improvement</Text>
      )}
      {coinsEarned > 0 && coinsEarned < 5 && (
        <Text color="yellow">
          ⚠️ Marginal quality - advice barely met minimum standards
        </Text>
      )}
      {coinsEarned === 0 && (
        <Text color="red">
          ❌ Poor advice (quality &lt; 5/10) - no payment earned
        </Text>
      )}
      {coinsEarned < 0 && (
        <Text color="red">
          ❌ Harmful advice - caused damage to client (penalty applied)
        </Text>
      )}

      {/* Relationship Changes */}
      {(response.tierChangeNotification || response.recommendationMessage) && (
        <>
          <Text> </Text>
          <Text dimColor>─────────────────────────</Text>
          <Text bold color="magenta">
            💝 RELATIONSHIP UPDATE
          </Text>
        </>
      )}

      {/* Tier change notification */}
      {response.tierChangeNotification && (
        <>
          <Text> </Text>
          <Box
            borderStyle="single"
            borderColor="magenta"
            paddingX={1}
            flexDirection="column"
          >
            <Text color="magenta">
              {getTrustTierInfo(response.tierChangeNotification.newTier).icon}{" "}
              {response.tierChangeNotification.characterName} now considers you
              a{" "}
              <Text bold>
                {getTrustTierInfo(response.tierChangeNotification.newTier).name}
              </Text>
              !
            </Text>
            <Text dimColor>
              Trust Level:{" "}
              {Math.round(response.tierChangeNotification.trustLevel * 100)}%
            </Text>
            <Text dimColor>
              {
                getTrustTierInfo(response.tierChangeNotification.newTier)
                  .description
              }
            </Text>
          </Box>
        </>
      )}

      {/* Recommendation message */}
      {response.recommendationMessage && (
        <>
          <Text> </Text>
          <Box
            borderStyle="single"
            borderColor="cyan"
            paddingX={1}
            flexDirection="column"
          >
            <Text color="cyan" bold>
              🎉 NEW CLIENT UNLOCKED!
            </Text>
            <Text color="cyan">{response.recommendationMessage}</Text>
          </Box>
        </>
      )}
    </Modal>
  );
}

// ============================================================================
// Boss Review Modal Component
// ============================================================================

function OnboardingModal({ message }: { message: any }) {
  return (
    <Modal
      title={`👔 ${message.welcomeTitle}`}
      color="cyan"
      continueText="Press SPACE to meet your first client"
    >
      <Text color="cyan" bold>
        {message.introduction}
      </Text>
      <Text> </Text>

      <Text color="white" bold>
        🎯 Your Role:
      </Text>
      <Text color="white">{message.roleExplanation}</Text>
      <Text> </Text>

      <Text color="white" bold>
        💼 How It Works:
      </Text>
      <Text color="white">{message.howItWorks}</Text>
      <Text> </Text>

      <Text color="yellow" bold>
        📋 What I Expect:
      </Text>
      <Text color="yellow">{message.expectations}</Text>
      <Text> </Text>

      <Text color="green" bold>
        💪 Remember:
      </Text>
      <Text color="green">{message.encouragement}</Text>
      <Text> </Text>

      <Text color="cyan">{message.readyMessage}</Text>
    </Modal>
  );
}

function BossCheckinModal({ message }: { message: any }) {
  return (
    <Modal
      title="👔 BOSS CHECK-IN"
      color="blue"
      continueText="Press SPACE to continue"
    >
      <Text color="blue" bold>
        {message.greeting}
      </Text>
      <Text> </Text>

      <Text color="white">{message.observation}</Text>
      <Text> </Text>

      <Text color="cyan">{message.mainMessage}</Text>
      <Text> </Text>

      {message.advice && (
        <>
          <Text color="yellow" bold>
            💡 Quick Tip:
          </Text>
          <Text color="yellow">{message.advice}</Text>
          <Text> </Text>
        </>
      )}

      <Text color="green">{message.closing}</Text>
    </Modal>
  );
}

function BossReviewModal({ review }: { review: any }) {
  return (
    <Modal
      title="👔 BOSS REVIEW"
      color="magenta"
      continueText={`Press SPACE to ${review.quiz ? "start quiz" : "continue"}`}
    >
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
      {review.learningMaterials.map((m: any, i: number) => {
        const urlText = m.url ? ` (${m.url})` : "";
        return (
          <Text key={i} color="cyan">
            • {m.title} - {m.description}
            {urlText}
          </Text>
        );
      })}
      <Text> </Text>

      <Text color="magenta">💬 Boss says:</Text>
      <Text color="magenta">"{review.encouragingMessage}"</Text>
      <Text> </Text>

      {review.quiz && (
        <>
          <Text bold color="cyan">
            🎯 Quiz Available!
          </Text>
          <Text dimColor>
            Your boss has prepared {review.quiz.questions.length} questions to
            test your knowledge.
          </Text>
        </>
      )}
    </Modal>
  );
}

// ============================================================================
// Main Entry Point
// ============================================================================

console.log("\n🎮 Starting Financial Advisor Simulator (TUI)...\n");
render(<App />);
