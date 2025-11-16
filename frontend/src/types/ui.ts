/**
 * Shared UI Types
 */

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
