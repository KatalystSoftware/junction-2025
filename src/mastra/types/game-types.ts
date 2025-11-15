/**
 * Elämäpeli 2025 - Game Type Definitions
 * Financial literacy game for Finnish youth
 */

export interface PlayerFinancialState {
  savings: number;
  debt: number;
  monthlyIncome: number;
  creditScore: number;
}

export interface PlayerPersonalityProfile {
  risk_tolerance: number; // 0-1
  confidence: number; // 0-1
  peer_influence: number; // 0-1
  scam_awareness: number; // 0-1
  planning_ability: number; // 0-1
}

export interface ScenarioHistoryItem {
  type: string;
  outcome: string;
  timestamp: string;
}

export interface ChoiceHistoryItem {
  choice: string;
  consequence: string;
  pattern?: "impulsive" | "risky" | "cautious" | "overconfident";
}

export interface AgentMemory {
  scammer: {
    player_engaged_before: boolean;
    rejection_count: number;
  };
  friend: {
    times_validated_spending: number;
    debt_level: number;
    relationship_strength: number;
  };
  parent: {
    knows_about_debt: boolean;
    trust_level: number;
  };
}

export interface PlayerState {
  playerId: string;
  financialState: PlayerFinancialState;
  personalityProfile: PlayerPersonalityProfile;
  scenarioHistory: ScenarioHistoryItem[];
  choiceHistory: ChoiceHistoryItem[];
  agentStates: AgentMemory;
  currentMonth: number; // 0-120 (10 years)
  totalMessages: number;
  currentScenario: string | null;
}

export type ScenarioType =
  | "crypto_scam"
  | "peer_pressure_purchase"
  | "parent_finds_debt"
  | "friend_asks_loan"
  | "emergency_expense"
  | "bnpl_temptation"
  | "gambling_ad"
  | "housing_loan_confusion"
  | "first_paycheck"
  | "savings_opportunity";

export type AgentType = "scammer" | "friend" | "parent" | "teacher";

export type ScamApproach = "aggressive_fomo" | "patient_trust" | "social_proof";

export type FriendScenarioType =
  | "peer_pressure_purchase"
  | "asking_for_loan"
  | "confession_of_debt"
  | "seeking_advice";

export type ParentScenarioType =
  | "parent_finds_debt"
  | "offering_help"
  | "emergency_support"
  | "casual_check_in";

export interface GameMasterDecision {
  scenario_type: ScenarioType;
  agent_to_invoke: AgentType;
  difficulty: number; // 0-1
  reasoning: string;
  context_for_agent: {
    player_type?: string;
    approach?: ScamApproach;
    player_risk_level?: number;
    player_recent_success?: boolean;
    suggested_approach?: string;
    [key: string]: any;
  };
}

export interface AgentResponse {
  messages: string[];
  voice_needed?: boolean;
  scam_sophistication?: number;
  expected_player_response?: "engage" | "ignore" | "report";
}

export interface GameResponse {
  messages: string[];
  voiceNeeded?: boolean;
  stateUpdate: PlayerState;
  scenarioType: ScenarioType;
}
