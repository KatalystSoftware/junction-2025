/**
 * Shared UI Types
 */

// ============================================================================
// Progression System Types
// ============================================================================

export type FinancialStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SuccessPath =
  | "comfortable_stability"
  | "corporate_career"
  | "tech_entrepreneur"
  | "real_estate_investor"
  | "small_business_owner"
  | "stock_market_investor";

export interface LifeEvent {
  id: string;
  type: "career" | "personal" | "windfall" | "setback" | "opportunity";
  name: string;
  description: string;
  date: string;
  financialImpact: {
    oneTime?: number;
    monthlyIncome?: number;
    monthlyExpense?: number;
    netWorthChange?: number;
  };
  scenarioCreated?: string;
  unlocks?: string[];
  locks?: string[];
}

export interface CharacterFinancialState {
  currentStage: FinancialStage;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  liquidSavings: number;
  investmentPortfolio: number;
  realEstateValue: number;
  currentOccupation: string;
  stageEntryDate: string;
  monthsInCurrentStage: number;
  readyForNextStage: boolean;
  selectedSuccessPath?: SuccessPath;
  netWorthHistory: Array<{ date: string; amount: number }>;
  incomeHistory: Array<{ date: string; amount: number }>;
  majorEvents: LifeEvent[];
}

// ============================================================================
// Contact & Message Types
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTime: Date;
  unreadCount: number;
  online: boolean;
  gender?: string;
  trust: number;
  age?: number;
  occupation?: string;
  financialProfile?: {
    incomeLevel: "low" | "medium" | "high";
    typicalMonthlyIncome: number;
    hasDebt: boolean;
    hasSavings: "none" | "minimal" | "moderate" | "good";
    bankAccounts: Array<{
      accountId: string;
      bankName: string;
      accountType: string;
      balance: number;
      currency: string;
    }>;
    creditCards: Array<{
      cardId: string;
      issuer: string;
      balance: number;
      creditLimit: number;
      interestRate: number;
      minimumPayment: number;
      currency: string;
    }>;
    debts: Array<{
      debtId?: string;
      creditor?: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyPayment: number;
      interestRate?: number;
      currency?: string;
    }>;
    subscriptions: Array<{
      subscriptionId: string;
      name: string;
      monthlyCost: number;
      category: string;
      currency: string;
      startDate: string;
    }>;
    monthlyExpenses: {
      rent?: number;
      groceries?: number;
      transportation?: number;
      utilities?: number;
      other?: number;
    };
  };
  financialState?: CharacterFinancialState;
}

export interface Message {
  id: string;
  contactId: string;
  role: "user" | "contact";
  content: string;
  timestamp: Date;
  type?: "text" | "voice";
  duration?: number; // duration in seconds for voice messages
  audioUrl?: string; // base64 data URL for voice messages
  voiceUrgency?: "calm" | "concerned" | "urgent" | "excited"; // urgency level for voice messages
}
