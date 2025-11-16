/**
 * Elämäpeli 2025 - Financial Advisor Simulator
 * Type Definitions
 *
 * Player role: Financial advisor helping AI characters with their money problems
 */

// ============================================================================
// CHARACTER DEFINITIONS
// ============================================================================

export interface CharacterPersonality {
  impulsiveness: number; // 0-1: How impulsive with money
  trustingness: number; // 0-1: How likely to follow advice
  financial_literacy: number; // 0-1: Current understanding of finance
  stubbornness: number; // 0-1: Resistance to changing habits
  emotionality: number; // 0-1: How emotional they get about money
}

// ============================================================================
// FINANCIAL DATA STRUCTURES
// ============================================================================

export interface BankAccount {
  accountId: string;
  bankName: string;
  accountType: "checking" | "savings";
  balance: number; // Current balance in EUR
  currency: "EUR";
}

export interface CreditCard {
  cardId: string;
  issuer: string;
  balance: number; // Current debt in EUR
  creditLimit: number; // Maximum credit in EUR
  interestRate: number; // Annual percentage rate (e.g., 18.9)
  minimumPayment: number; // Monthly minimum payment in EUR
  currency: "EUR";
}

export interface Subscription {
  subscriptionId: string;
  name: string; // e.g., "Spotify Premium", "Netflix"
  monthlyCost: number; // Monthly cost in EUR
  category: "entertainment" | "utilities" | "fitness" | "software" | "other";
  currency: "EUR";
  startDate: string; // ISO date when subscription started
}

export interface Debt {
  debtId: string;
  type: "student_loan" | "personal_loan" | "car_loan" | "mortgage" | "other";
  creditor: string; // Who they owe money to
  totalAmount: number; // Total amount owed in EUR
  remainingAmount: number; // How much is left to pay in EUR
  monthlyPayment: number; // Required monthly payment in EUR
  interestRate: number; // Annual percentage rate
  currency: "EUR";
  startDate: string; // ISO date when debt was taken
}

export interface CharacterFinancialProfile {
  incomeLevel: "low" | "medium" | "high";
  typicalMonthlyIncome: number;
  hasDebt: boolean;
  hasSavings: "none" | "minimal" | "moderate" | "good";

  // Detailed financial data
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  debts: Debt[];
  subscriptions: Subscription[];
  monthlyExpenses: {
    rent?: number;
    groceries?: number;
    transportation?: number;
    utilities?: number;
    other?: number;
  };
}

export interface CharacterCommunicationStyle {
  formality: "casual" | "semi-formal" | "formal";
  language: "teen_finnish" | "casual_adult_finnish" | "formal_finnish";
  prefersVoice: number; // 0-1: How often they use voice messages
  callsWhenEmotional: boolean; // Use voice when upset/excited
  voiceId?: string; // ElevenLabs voice ID for consistent voice across sessions
}

export type TrustTier =
  | "stranger" // 0-0.2: Just met
  | "acquaintance" // 0.2-0.4: Getting to know you
  | "trusted" // 0.4-0.6: Starting to trust
  | "close" // 0.6-0.8: Close relationship
  | "best_friend"; // 0.8-1.0: Deep trust, unlocks special scenarios

export interface RelationshipProgression {
  timestamp: string;
  trustLevel: number;
  event: "advice_positive" | "advice_negative" | "decay" | "recommendation";
  trustChange: number;
}

export interface CharacterRelationshipState {
  trustLevel: number; // 0-1: How much they trust the advisor
  trustTier: TrustTier; // Calculated from trustLevel
  visitCount: number;
  lastVisit: string | null; // ISO date
  adviceFollowedHistory: AdviceOutcome[];
  progressionHistory: RelationshipProgression[]; // Track trust changes over time
  decayApplied: number; // Total decay applied
  wasRecommended: boolean; // True if character was unlocked via recommendation
  hasReceivedVoiceMessage?: boolean; // Track if character has received a voice message
  currentScenarioNumber?: number; // Current scenario number in their story arc
}

export interface CharacterConversationMemory {
  sessionId: string;
  timestamp: string;
  advisorAdvice: string[];
  characterResponses: string[];
  outcome: "positive" | "negative" | "neutral";
}

export interface AdviceOutcome {
  scenarioId: string;
  adviceGiven: string[];
  followed: boolean;
  outcome: "positive" | "negative" | "neutral";
  timestamp: string;
}

export interface Character {
  characterId: string;
  name: string;
  age: number;
  occupation: string;
  background: string;
  gender: "male" | "female"; // For avatar generation
  personality: CharacterPersonality;
  financialProfile: CharacterFinancialProfile;
  communicationStyle: CharacterCommunicationStyle;
  relationshipState: CharacterRelationshipState;
  conversationHistory: CharacterConversationMemory[];
  advisorNotes: string; // Summary of past interactions

  // NEW: Financial Simulation link
  financialSimulation?: {
    monthlyIncomeDay: number; // Day of month salary arrives (15-25)
    hasSimulationHistory: boolean; // Whether initial 6-month history has been generated
  };
}

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

export interface VoiceMessageConfig {
  enabled: boolean;
  transcription?: string;
  audioUrl?: string;
  urgency?: "calm" | "concerned" | "urgent" | "excited";
}

export interface InitialContact {
  method: "text" | "voice" | "call";
  message: string;
  voiceMessage?: VoiceMessageConfig;
}

export interface ProblemContext {
  currentSituation: string;
  emotionalState: string;
  urgency: "low" | "medium" | "high";
  specificDetails: Record<string, any>;
}

export interface TriggerConditions {
  advisorSkillLevel: { min: number; max: number };
  isFollowUp: boolean;
  requiresPreviousScenario?: string | null;
  characterMinVisits?: number;
}

export interface FollowUpScenario {
  scenarioId: string;
  triggeredBy:
    | "good_advice_followed"
    | "bad_advice_or_not_followed"
    | "mixed_results";
  delayInSessions: number; // How many other sessions before this follow-up
}

export interface Scenario {
  scenarioId: string;
  characterId: string;
  scenarioType: string;
  difficulty: number; // 0-1
  topic: FinancialTopic;
  triggerConditions: TriggerConditions;
  initialContact: InitialContact;
  problemContext: ProblemContext;
  idealAdvice: string[];
  commonMistakes: string[];
  followUpScenarios?: FollowUpScenario[];
}

export type FinancialTopic =
  | "budgeting"
  | "saving"
  | "debt_management"
  | "investing"
  | "loans"
  | "insurance"
  | "retirement"
  | "emergency_fund"
  | "credit_score"
  | "scam_awareness";

// ============================================================================
// ADVISOR STATE (replaces PlayerState)
// ============================================================================

export interface TopicExpertise {
  budgeting: number; // 0-10
  saving: number;
  debt_management: number;
  investing: number;
  loans: number;
  insurance: number;
  retirement: number;
  emergency_fund: number;
  credit_score: number;
  scam_awareness: number;
}

export interface FinancialProjection {
  monthlySavings: number;
  monthlyExpenseReduction: number;
  monthlyDebtPayment: number;
  totalSaved: number;
  totalDebtReduced: number;
  totalInterestSaved: number;
  monthsToGoal: number;
  projectionPeriodMonths: number;
  savingsRate: number;
  debtReductionRate: number;
  emergencyFundProgress: number;
  debtFreeProgress: number;
  // NEW: Category-level savings breakdown (Phase F)
  categorySavings?: Record<string, number>;
}

export interface ActualFinancialResult {
  moneySaved: number;
  expenseReduction: number;
  debtReduced: number;
  budgetAdherence: number;
  goalProgress: number;
  projectedVsActual: {
    projected: number;
    actual: number;
    difference: number;
    accuracy: number;
  };
}

export interface ConsultationSession {
  sessionId: string;
  characterId: string;
  characterName: string;
  scenarioId: string;
  timestamp: string;
  playerAdvice: string[];
  characterReactions: string[];
  adviceQualityScore: number; // 0-10: AI-evaluated quality
  topicsCovered: FinancialTopic[];
  followUpScheduled: boolean;
  outcomeRevealed: boolean;
  duration?: number; // Number of message exchanges
  evaluation?: {
    // Detailed AI evaluation results
    strengths: string[];
    weaknesses: string[];
    missedOpportunities: string[];
    wasActionable: boolean;
    wasAccurate: boolean;
    dimensions?: {
      adviceQuality: number;
      communicationEffectiveness: number;
      learningObjectives: number;
      characterProgression: number;
    };
    characterProgression?: {
      willFollowAdvice: boolean;
      confidence: number;
      emotionalChange: string;
      problemMovement: string;
      expectedOutcome: string;
    };
  };
  // NEW: Financial outcomes
  financialProjection?: FinancialProjection;
  actualResult?: ActualFinancialResult;
  coinsEarned?: number;
  // NEW: Extracted advice actions (Phase C)
  extractedActions?: Array<{
    actionType: string;
    specificSubscription?: string;
    targetCategory?: string;
    reductionPercent?: number;
    confidence?: number;
  }>;
}

export interface CompletedMaterial {
  materialId: string;
  title: string;
  topic: FinancialTopic;
  completedAt: string;
  quizScore?: number;
}

export interface ThreadInfo {
  threadId: string;
  characterId: string;
  scenarioId: string;
  status: ThreadStatus;
  createdAt: string;
  lastMessageAt: string;
}

export type ThreadStatus = "active" | "awaiting_response" | "resolved";

export interface SessionGoal {
  goalId: string;
  type: "save_target" | "debt_reduction" | "clients_helped" | "accuracy_target";
  description: string;
  target: number; // Target value to reach
  progress: number; // Current progress
  sessionsRemaining: number; // Sessions left to achieve goal
  coinReward: number; // Coins earned if goal met
  coinPenalty: number; // Coins lost if goal missed
  skillBonus: number; // Skill points if goal met
  createdAt: string;
}

export interface AdvisorState {
  advisorId: string;
  reputation: number; // 0-100
  skillLevel: number; // 0-10 overall skill
  specializations: FinancialTopic[]; // Topics they're good at
  topicsExpertise: TopicExpertise;
  sessionHistory: ConsultationSession[];
  totalClientsHelped: number;
  activeClients: string[]; // Array of characterIds currently in consultation
  activeThreads: Record<string, ThreadInfo>; // Map of threadId to thread info
  godBossRelationship: number; // 0-10: how pleased your boss is
  learningMaterials: CompletedMaterial[];
  totalSessions: number;
  lastReviewSession: number; // Session count when last reviewed
  hasCompletedOnboarding: boolean; // Whether the user has seen the welcome onboarding

  // Performance streak tracking
  currentStreak: number; // Positive for consecutive good sessions (score >= 7), negative for consecutive bad sessions (score <= 4), 0 for neutral or mixed
  lastStreakCheckSession: number; // Session number when streak was last updated

  // NEW: Gamification & Earnings
  advisorCoins: number; // Currency earned from successful consultations
  lifetimeSavingsGenerated: number; // Total € clients have saved
  lifetimeDebtCleared: number; // Total € debt eliminated
  currentGoal: SessionGoal | null; // Active goal to achieve
  achievementsUnlocked: string[]; // Achievement IDs
  careerTier: number; // 1-5: Junior → Associate → Senior → Specialist → Expert

  // NEW: Financial Simulation
  currentGameMonth: string; // Current game month in YYYY-MM format (session-based, not real-time)
  simulatedMonthsPassed: number; // Total months simulated since game start
}

// ============================================================================
// CONVERSATION THREAD (for messaging UI)
// ============================================================================

export interface ConversationMessage {
  messageId: string;
  sender: "character" | "advisor" | "god_boss";
  content: string;
  timestamp: string;
  isVoice?: boolean;
  voiceConfig?: VoiceMessageConfig;
}

export interface ConversationThread {
  threadId: string;
  characterId: string;
  characterName: string;
  scenarioId: string;
  messages: ConversationMessage[];
  status: ThreadStatus;
  unreadCount: number;
  createdAt: string;
  lastMessageAt: string;
  characterInfo?: {
    name: string;
    age: number;
    occupation: string;
    gender: "male" | "female";
    financialProfile: CharacterFinancialProfile;
  };
}

// ============================================================================
// GAME MASTER DECISIONS
// ============================================================================

export interface GameMasterDecision {
  action: "send_character" | "god_boss_review" | "no_action";
  phase?: "scenario_start" | "review_phase" | "waiting"; // Consultation phase tracking
  reasoning: string;

  // If action is 'send_character'
  characterId?: string;
  scenarioId?: string;
  isNewCharacter?: boolean; // true = new thread, false = returning
  difficulty?: number;

  // If action is 'god_boss_review'
  sessionsToReview?: string[]; // sessionIds to review
}

// ============================================================================
// AGENT RESPONSES
// ============================================================================

export interface CharacterResponse {
  messages: string[];
  voiceNeeded?: boolean;
  voiceConfig?: VoiceMessageConfig;
  emotionalState?: string;
  willFollowAdvice?: boolean; // AI's assessment
  conversationEnding?: boolean; // Character ready to leave
  adviceQualityFeedback?: {
    score: number; // 0-10
    reasoning: string;
  };
}

export interface BossOnboardingMessage {
  welcomeTitle: string;
  introduction: string;
  roleExplanation: string;
  howItWorks: string;
  expectations: string;
  encouragement: string;
  readyMessage: string;
}

export interface BossCheckinMessage {
  greeting: string;
  observation: string;
  mainMessage: string;
  advice: string;
  closing: string;
}

export interface GodBossReview {
  overallScore: number; // 0-10
  strengthsIdentified: string[];
  areasForImprovement: string[];
  learningMaterials: LearningMaterial[];
  quiz?: Quiz;
  encouragingMessage: string;
  reputationChange: number; // +/- reputation points
  skillLevelChange: number; // +/- skill level
  topicsExpertiseUpdates: Partial<TopicExpertise>;
}

export interface LearningMaterial {
  materialId: string;
  title: string;
  description: string;
  topic: FinancialTopic;
  url?: string;
  type: "article" | "video" | "tool" | "calculator" | "quiz";
}

export interface Quiz {
  quizId: string;
  topic: FinancialTopic;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  questionId: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
}

// ============================================================================
// GAME RESPONSES
// ============================================================================

export interface AdviceChoice {
  choiceId: string;
  actionText: string;
  icon: string;
  projectedOutcome: string;
  financialImpact?: {
    monthlySavings?: number;
    debtReduction?: number;
    timeToGoal?: number;
    interestSaved?: number;
  };
  qualityScore: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  fullAdviceText: string;
}

export interface Milestone {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: "skill" | "reputation" | "clients" | "finance" | "achievement";
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "progress" | "skill" | "finance" | "relationship" | "special";
  coinReward: number;
  unlockedAt?: string;
}

export interface GameResponse {
  type:
    | "character_message"
    | "god_boss_review"
    | "conversation_end"
    | "onboarding"
    | "boss_checkin";

  // For onboarding
  onboardingMessage?: BossOnboardingMessage;

  // For boss check-in
  checkinMessage?: BossCheckinMessage;

  // For character messages
  threadId?: string;
  messages?: string[];
  voiceNeeded?: boolean;
  voiceConfig?: VoiceMessageConfig;
  isNewThread?: boolean;
  characterInfo?: {
    name: string;
    age: number;
    occupation: string;
    gender: "male" | "female";
    financialProfile: CharacterFinancialProfile;
  };

  // For boss help messages (RAG-powered citations and learning materials)
  citations?: Array<{
    text: string;
    source: string;
    section: string;
    relevanceScore: number;
  }>;
  suggestedMaterials?: Array<{
    materialId: string;
    title: string;
    description: string;
    topic: string;
    url: string;
    type: "article" | "guide" | "tool" | "calculator";
  }>;
  // NEW: Scenario financial context for pre-consultation dashboard
  scenarioFinancialContext?: {
    topic: FinancialTopic;
    difficulty: number;
    monthlyIncome?: number;
    currentSavings?: number;
    totalDebt?: number;
    rent?: number;
    urgency: "low" | "medium" | "high";
    situation: string;
  };

  // Advice choices for choice-based gameplay
  adviceChoices?: AdviceChoice[];

  // Actual financial outcome for returning characters
  actualOutcome?: {
    baselineMonth: string;
    baselineExpenses: number;
    followUpMonth?: string;
    followUpExpenses?: number;
    totalSaved?: number;
    categorySavings?: Record<string, number>;
  };

  // For god boss reviews
  review?: GodBossReview;

  // State updates
  stateUpdate: AdvisorState;

  // Thread management
  activeThreads?: ConversationThread[];

  // Character recommendation notification
  recommendationMessage?: string;

  // Trust tier change notification
  tierChangeNotification?: {
    characterName: string;
    oldTier: TrustTier;
    newTier: TrustTier;
    trustLevel: number;
  };

  // Trust decay notifications
  decayNotifications?: Array<{
    characterName: string;
    decayAmount: number;
    newTrustLevel: number;
  }>;

  // NEW: Post-consultation results
  financialResults?: {
    projection?: FinancialProjection;
    actualResult?: ActualFinancialResult;
    coinsEarned?: number;
    evaluation?: {
      qualityScore: number;
      strengths: string[];
      weaknesses: string[];
      missedOpportunities: string[];
      wasActionable: boolean;
      wasAccurate: boolean;
    };
    // NEW: Extracted actions from advice (Phase C)
    extractedActions?: Array<{
      actionType: string;
      specificSubscription?: string;
      targetCategory?: string;
      reductionPercent?: number;
      confidence?: number;
    }>;
  };

  // NEW: Progress visualization
  miniFeedback?: string;
  milestonesAchieved?: Milestone[];
  achievementsUnlocked?: Achievement[];

  // Advisor's advice (what the player said)
  advisorAdvice?: string[];

  // Thread histories (returned from mutations for cache updates)
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string; gender: "male" | "female" }
  >;
}

// ============================================================================
// ADVICE EVALUATION
// ============================================================================

export interface AdviceEvaluation {
  qualityScore: number; // 0-10
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  topicsCovered: FinancialTopic[];
  wasActionable: boolean;
  wasAccurate: boolean;
}

// ============================================================================
// BACKWARD COMPATIBILITY (for migration)
// ============================================================================

// Keep old types temporarily for migration purposes
export interface PlayerState {
  playerId: string;
  // ... old fields (to be removed after migration)
}
