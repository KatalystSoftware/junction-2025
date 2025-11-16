/**
 * API Service for Elämäpeli 2025 Game Backend
 *
 * Handles communication with the Mastra backend
 * NOTE: Keep this file minimal and focused on API calls only to avoid Figma conflicts
 */

import { getOrCreateSessionId } from "./sessionManager";

// ============================================================================
// TYPE DEFINITIONS (matching backend types from puppet-master)
// ============================================================================

export interface AdvisorState {
  advisorId: string;
  reputation: number;
  skillLevel: number;
  specializations: string[];
  topicsExpertise: Record<string, number>;
  sessionHistory: ConsultationSession[];
  totalClientsHelped: number;
  activeClients: string[];
  activeThreads: Record<string, ThreadInfo>;
  godBossRelationship: number;
  learningMaterials: any[];
  totalSessions: number;
  lastReviewSession: number;
  hasCompletedOnboarding: boolean;
  currentStreak: number;
  lastStreakCheckSession: number;
  advisorCoins: number;
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  currentGoal: any | null;
  achievementsUnlocked: string[];
  careerTier: number;
}

export interface ThreadInfo {
  threadId: string;
  characterId: string;
  scenarioId: string;
  status: "active" | "awaiting_response" | "resolved";
  createdAt: string;
  lastMessageAt: string;
}

export interface ConsultationSession {
  sessionId: string;
  characterId: string;
  characterName: string;
  scenarioId: string;
  timestamp: string;
  playerAdvice: string[];
  characterReactions: string[];
  adviceQualityScore: number;
  topicsCovered: string[];
  followUpScheduled: boolean;
  outcomeRevealed: boolean;
  duration?: number;
  evaluation?: any;
  financialProjection?: any;
  actualResult?: any;
  coinsEarned?: number;
}

export interface ConversationMessage {
  messageId: string;
  sender: "character" | "advisor" | "god_boss";
  content: string;
  timestamp: string;
  isVoice?: boolean;
  voiceConfig?: any;
}

export interface ConversationThread {
  threadId: string;
  characterId: string;
  characterName: string;
  scenarioId: string;
  messages: ConversationMessage[];
  status: "active" | "awaiting_response" | "resolved";
  unreadCount: number;
  createdAt: string;
  lastMessageAt: string;
  threadMetadata?: {
    name: string;
    age: number;
    occupation: string;
  };
}

export interface GameResponse {
  type:
    | "character_message"
    | "god_boss_review"
    | "conversation_end"
    | "onboarding"
    | "boss_checkin"
    | "boss_intervention"
    | "boss_intervention_message"; // NEW: Boss responding during intervention

  // Various response data
  onboardingMessage?: any;
  checkinMessage?: {
    greeting: string;
    observation: string;
    mainMessage: string;
    advice: string;
    closing: string;
  };
  interventionMessage?: {
    severity: "warning" | "critical";
    reason: string;
    correctApproach: string;
    topic: string;
    canRevise: boolean;
    interventionActive: boolean; // Whether user is currently in conversation with boss
  };
  threadId?: string;
  messages?: string[];
  voiceNeeded?: boolean;
  voiceConfig?: any;
  isNewThread?: boolean;
  threadMetadata?: {
    name: string;
    age: number;
    occupation: string;
  };
  scenarioFinancialContext?: any;
  adviceChoices?: any[];
  review?: any;

  // State updates (always present)
  stateUpdate: AdvisorState;

  // Thread management
  activeThreads?: ConversationThread[];
  recommendationMessage?: string;
  tierChangeNotification?: any;
  decayNotifications?: any[];
  financialResults?: any;
  miniFeedback?: string;
  milestonesAchieved?: any[];
  achievementsUnlocked?: any[];
  advisorAdvice?: string[];

  // Updated histories (returned from mutations)
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

interface InitRequest {
  sessionId?: string;
}

interface InitResponse {
  sessionId: string;
  advisorState: AdvisorState;
  isNewSession: boolean;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;
  autoStartedConsultation?: GameResponse; // Auto-started if no active threads
}

interface StartConsultationRequest {
  sessionId: string;
  advisorState: AdvisorState;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;
}

interface SendMessageRequest {
  sessionId: string;
  threadId: string;
  message: string;
  advisorState: AdvisorState;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  threadHistories?: Record<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >;
  threadMetadata?: Record<
    string,
    { name: string; age: number; occupation: string }
  >;
}

// ============================================================================
// API CLIENT
// ============================================================================

class GameAPI {
  private baseUrl = "/api/game";

  /**
   * Initialize or load a game session
   */
  async initSession(sessionId?: string): Promise<InitResponse> {
    const response = await fetch(`${this.baseUrl}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId } as InitRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start a new consultation (get a new character/scenario)
   */
  async startConsultation(
    advisorState: AdvisorState,
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ): Promise<GameResponse> {
    const sessionId = getOrCreateSessionId();

    // Get user language preference from localStorage
    let userLanguage = "en"; // default
    try {
      const userProfileStr = localStorage.getItem("userProfile");
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr);
        if (userProfile.language) {
          userLanguage = userProfile.language;
        }
      }
    } catch (e) {
      console.error("Failed to get user language:", e);
    }

    const response = await fetch(`${this.baseUrl}/start-consultation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        advisorState,
        threadHistories,
        threadMetadata,
        userLanguage,
      } as StartConsultationRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to start consultation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send a message in an active thread
   */
  async sendMessage(
    threadId: string,
    message: string,
    advisorState: AdvisorState,
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>,
    threadHistories?: Record<
      string,
      Array<{ role: "user" | "assistant"; content: string }>
    >,
    threadMetadata?: Record<
      string,
      { name: string; age: number; occupation: string }
    >,
  ): Promise<GameResponse> {
    const sessionId = getOrCreateSessionId();

    // Get user language preference from localStorage
    let userLanguage = "en"; // default
    try {
      const userProfileStr = localStorage.getItem("userProfile");
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr);
        if (userProfile.language) {
          userLanguage = userProfile.language;
        }
      }
    } catch (e) {
      console.error("Failed to get user language:", e);
    }

    const response = await fetch(`${this.baseUrl}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        threadId,
        message,
        advisorState,
        conversationHistory,
        threadHistories,
        threadMetadata,
        userLanguage,
      } as SendMessageRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get session status (optional health check)
   */
  async getSessionStatus(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`, {
      method: "GET",
    });

    if (!response.ok) {
      return { exists: false };
    }

    return response.json();
  }

  /**
   * Transcribe audio to text using Gemini
   */
  async transcribeAudio(
    audioBlob: Blob,
    language?: string
  ): Promise<{ transcription: string; detectedLanguage?: string }> {
    // Convert blob to base64
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const response = await fetch(`${this.baseUrl}/transcribe-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioData: base64Audio,
        mimeType: audioBlob.type,
        language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.details || `Failed to transcribe audio: ${response.statusText}`
      );
    }

    return response.json();
  }
}

export const gameApi = new GameAPI();
