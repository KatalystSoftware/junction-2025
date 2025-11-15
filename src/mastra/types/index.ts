/**
 * Type Exports for Frontend Integration
 *
 * Re-exports types that the frontend needs to communicate with the backend
 */

// Export all types from game-types
export type {
  // Core State
  AdvisorState,
  TopicExpertise,
  FinancialTopic,

  // Game Responses
  GameResponse,
  GameMasterDecision,

  // Characters & Relationships
  Character,
  CharacterPersonality,
  CharacterFinancialProfile,
  CharacterCommunicationStyle,
  CharacterRelationshipState,
  TrustTier,

  // Scenarios
  Scenario,
  ProblemContext,

  // Conversations
  ConversationThread,
  ConversationMessage,
  ThreadInfo,
  ThreadStatus,

  // Sessions
  ConsultationSession,

  // Evaluations
  AdviceEvaluation,
  AdviceOutcome,

  // Financial Data
  BankAccount,
  CreditCard,
  Debt,
  Subscription,
  FinancialProjection,
  ActualFinancialResult,

  // Voice & Communication
  VoiceMessageConfig,
  InitialContact,

  // Progress & Gamification
  Achievement,
  Milestone,
  SessionGoal,
  AdviceChoice,

  // Boss System
  GodBossReview,
  BossOnboardingMessage,
  BossCheckinMessage,
  LearningMaterial,
  Quiz,
  QuizQuestion,
  CompletedMaterial,

  // Character Responses
  CharacterResponse,
} from "./game-types.ts";

// Export session types
export type {
  SavedSession,
  SessionMetadata,
} from "../persistence/session-store.ts";
