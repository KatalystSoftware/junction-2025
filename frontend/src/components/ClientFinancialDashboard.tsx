import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Wallet, CreditCard, Calendar, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  balanceAfter: number;
  description: string;
  merchantName?: string;
  adviceInfluenced?: boolean;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
  balance: number;
}

interface ClientFinancialData {
  characterId: string;
  characterName: string;
  currentBalance: number;
  monthlyTrend: MonthlyTrend[];
  recentTransactions: Transaction[];
  categorySpending: Record<string, number>;
  adviceInfluencedTransactions: number;
  totalAdviceImpact: number;
}

interface ClientFinancialDashboardProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
}

export function ClientFinancialDashboard({
  characterId,
  characterName,
  onClose,
}: ClientFinancialDashboardProps) {
  const [data, setData] = useState<ClientFinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"overview" | "transactions" | "trends">("overview");

  useEffect(() => {
    fetchFinancialData();
  }, [characterId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/client-financial-details/${characterId}?months=6`);

      if (!response.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const financialData = await response.json();
      setData(financialData);
      setError(null);
    } catch (err) {
      console.error("Error fetching financial data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fi-FI", {
      month: "short",
      day: "numeric",
    });
  };

  const formatMonth = (monthString: string): string => {
    const [year, month] = monthString.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("fi-FI", {
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      salary: "💰",
      rent: "🏠",
      groceries: "🛒",
      dining: "🍽️",
      coffee: "☕",
      transportation: "🚗",
      entertainment: "🎬",
      shopping: "🛍️",
      subscription_service: "📱",
      utilities: "💡",
      debt_payment: "💳",
      debt_interest: "📉",
    };
    return icons[category] || "📄";
  };

  const getTransactionColor = (amount: number): string => {
    return amount >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-gray-600">{error || "Failed to load financial data"}</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  const latestMonth = data.monthlyTrend[data.monthlyTrend.length - 1];
  const previousMonth = data.monthlyTrend[data.monthlyTrend.length - 2];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{characterName}'s Finances</h2>
            <p className="text-sm text-gray-500">Complete financial overview and history</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 border-b">
          <button
            onClick={() => setSelectedView("overview")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedView === "overview"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView("transactions")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedView === "transactions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setSelectedView("trends")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedView === "trends"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Trends
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {selectedView === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(data.currentBalance)}
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-blue-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Monthly Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(latestMonth?.income || 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Monthly Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(latestMonth?.expenses || 0)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                </Card>
              </div>

              {/* Advice Impact */}
              {data.totalAdviceImpact > 0 && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Your Advice Impact</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(data.totalAdviceImpact)} saved
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {data.adviceInfluencedTransactions} transactions influenced by your advice
                      </p>
                    </div>
                    <div className="text-4xl">🎯</div>
                  </div>
                </Card>
              )}

              {/* Category Spending Breakdown */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Spending by Category
                </h3>
                <div className="space-y-3">
                  {Object.entries(data.categorySpending)
                    .filter(([_, amount]) => Math.abs(amount) > 0)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 8)
                    .map(([category, amount]) => {
                      const absAmount = Math.abs(amount);
                      const maxAmount = Math.max(
                        ...Object.values(data.categorySpending).map(Math.abs)
                      );
                      const percentage = (absAmount / maxAmount) * 100;

                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center">
                              <span className="mr-2">{getCategoryIcon(category)}</span>
                              <span className="capitalize">{category.replace(/_/g, " ")}</span>
                            </span>
                            <span className="font-medium">{formatCurrency(absAmount)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>

              {/* Recent Transactions Preview */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="space-y-2">
                  {data.recentTransactions.slice(0, 5).map((txn) => (
                    <div
                      key={txn.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        txn.adviceInfluenced ? "bg-green-50 border border-green-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryIcon(txn.category)}</span>
                        <div>
                          <p className="font-medium text-sm">{txn.description}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(txn.date)} • {txn.merchantName || txn.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(txn.amount)}`}>
                          {formatCurrency(txn.amount)}
                        </p>
                        {txn.adviceInfluenced && (
                          <p className="text-xs text-green-600">Advice impact</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setSelectedView("transactions")}
                >
                  View All Transactions
                </Button>
              </Card>
            </div>
          )}

          {selectedView === "transactions" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <div className="space-y-2">
                {data.recentTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      txn.adviceInfluenced ? "bg-green-50 border border-green-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-2xl">{getCategoryIcon(txn.category)}</span>
                      <div className="flex-1">
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(txn.date)} • {txn.merchantName || txn.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${getTransactionColor(txn.amount)}`}>
                        {formatCurrency(txn.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatCurrency(txn.balanceAfter)}
                      </p>
                      {txn.adviceInfluenced && (
                        <p className="text-xs text-green-600 font-medium">✓ Your advice</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedView === "trends" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Monthly Financial Trends</h3>

              {/* Simple Bar Chart */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-4">Income vs Expenses</h4>
                <div className="space-y-4">
                  {data.monthlyTrend.slice().reverse().map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{formatMonth(month.month)}</span>
                        <span className={month.netSavings >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(month.netSavings)}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">Income</div>
                          <div className="w-full bg-gray-200 rounded-full h-6 relative">
                            <div
                              className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (month.income / Math.max(...data.monthlyTrend.map((m) => m.income))) * 100
                                )}%`,
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {formatCurrency(month.income)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">Expenses</div>
                          <div className="w-full bg-gray-200 rounded-full h-6 relative">
                            <div
                              className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (month.expenses / Math.max(...data.monthlyTrend.map((m) => m.expenses))) * 100
                                )}%`,
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {formatCurrency(month.expenses)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Balance Trend */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-4">Balance Over Time</h4>
                <div className="space-y-3">
                  {data.monthlyTrend.slice().reverse().map((month, index, arr) => {
                    const previousBalance = arr[index + 1]?.balance;
                    const change = previousBalance ? month.balance - previousBalance : 0;
                    const isPositive = change >= 0;

                    return (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatMonth(month.month)}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold">
                            {formatCurrency(month.balance)}
                          </span>
                          {previousBalance && (
                            <span className={`text-sm flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
                              {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                              {formatCurrency(Math.abs(change))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
