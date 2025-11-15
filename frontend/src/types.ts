export interface PlayerState {
  playerId: string;
  financialState: {
    savings: number;
    debt: number;
    monthlyIncome: number;
    creditScore: number;
  };
  personalityProfile: {
    risk_tolerance: number;
    confidence: number;
    peer_influence: number;
    scam_awareness: number;
    planning_ability: number;
  };
  currentMonth: number;
  totalMessages: number;
}

export interface GameResponse {
  messages: string[];
  playerState: PlayerState;
  scenarioType: string;
  voiceNeeded?: boolean;
}
