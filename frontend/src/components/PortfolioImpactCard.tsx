import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronRight,
  Target,
} from "lucide-react";

interface RealPortfolioImpact {
  totalRealSavings: number;
  totalRealDebtReduced: number;
  totalClientsHelped: number;
  avgImpactPerClient: number;
  projectedSavings: number;
  projectedDebtCleared: number;
}

interface PortfolioGrowthData {
  portfolioImpact: {
    savings: number;
    debtCleared: number;
    total: number;
  };
  growth: {
    perMinute: number;
    perHour: number;
    perDay: number;
    recentGrowth: number;
  };
  activeClients: number;
  stats: {
    totalSessions: number;
    totalClientsHelped: number;
    totalCoins: number;
    careerTier: number;
  };
  timestamp: number;
}

interface PortfolioImpactCardProps {
  lifetimeSavings: number;
  lifetimeDebtCleared: number;
  sessionId?: string;
  recentImpact?: {
    savings: number;
    debtReduction: number;
    characterName: string;
  };
  animate?: boolean;
  onClick?: () => void;
}

export function PortfolioImpactCard({
  lifetimeSavings,
  lifetimeDebtCleared,
  sessionId,
  recentImpact,
  animate,
  onClick,
}: PortfolioImpactCardProps) {
  const [displaySavings, setDisplaySavings] = useState(lifetimeSavings);
  const [displayDebt, setDisplayDebt] = useState(lifetimeDebtCleared);
  const [showRecentInline, setShowRecentInline] = useState(false);
  const [realImpact, setRealImpact] = useState<RealPortfolioImpact | null>(null);
  const [showRealData, setShowRealData] = useState(false);
  const [growthData, setGrowthData] = useState<PortfolioGrowthData | null>(null);

  // Fetch real portfolio impact data
  useEffect(() => {
    if (sessionId) {
      const fetchRealImpact = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
          const response = await fetch(`${API_URL}/real-portfolio-impact/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setRealImpact(data);
          }
        } catch (error) {
          console.error("Failed to fetch real portfolio impact:", error);
        }
      };

      fetchRealImpact();
      // Refresh every 30 seconds
      const interval = setInterval(fetchRealImpact, 30000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  // Fetch portfolio growth data (real-time updates)
  useEffect(() => {
    if (sessionId) {
      const fetchGrowthData = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
          const response = await fetch(`${API_URL}/portfolio-impact/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setGrowthData(data);
            // Update displayed values from server data for real-time sync
            if (!showRealData) {
              setDisplaySavings(data.portfolioImpact.savings);
              setDisplayDebt(data.portfolioImpact.debtCleared);
            }
          }
        } catch (error) {
          console.error("Failed to fetch portfolio growth data:", error);
        }
      };

      fetchGrowthData();
      // Refresh every 10 seconds for real-time feel
      const interval = setInterval(fetchGrowthData, 10000);
      return () => clearInterval(interval);
    }
  }, [sessionId, showRealData]);

  // Animate numbers when they change
  useEffect(() => {
    if (
      animate &&
      (displaySavings !== lifetimeSavings ||
        displayDebt !== lifetimeDebtCleared)
    ) {
      // Count up animation
      const duration = 1000; // 1 second
      const steps = 30;
      const interval = duration / steps;

      const savingsDiff = lifetimeSavings - displaySavings;
      const debtDiff = lifetimeDebtCleared - displayDebt;
      const savingsStep = savingsDiff / steps;
      const debtStep = debtDiff / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplaySavings(lifetimeSavings);
          setDisplayDebt(lifetimeDebtCleared);
          clearInterval(timer);
        } else {
          setDisplaySavings((prev) => prev + savingsStep);
          setDisplayDebt((prev) => prev + debtStep);
        }
      }, interval);

      return () => clearInterval(timer);
    } else {
      setDisplaySavings(lifetimeSavings);
      setDisplayDebt(lifetimeDebtCleared);
    }
  }, [lifetimeSavings, lifetimeDebtCleared, animate]);

  // Show recent impact inline
  useEffect(() => {
    if (
      recentImpact &&
      (recentImpact.savings > 0 || recentImpact.debtReduction > 0)
    ) {
      setShowRecentInline(true);
      const timer = setTimeout(() => setShowRecentInline(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [recentImpact]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  // Use real data if available and toggled on, otherwise use projected
  const activeSavings = showRealData && realImpact ? realImpact.totalRealSavings : displaySavings;
  const activeDebt = showRealData && realImpact ? realImpact.totalRealDebtReduced : displayDebt;
  const totalImpact = activeSavings + activeDebt;
  const isPositive = totalImpact > 0;
  const isNegative = totalImpact < 0;

  return (
    <div
      className="p-4 rounded-lg cursor-pointer transition-all hover:opacity-90"
      style={{
        backgroundColor: "var(--card)",
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Portfolio Impact
          </span>
        </div>
        <div className="flex items-center gap-2">
          {realImpact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRealData(!showRealData);
              }}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: showRealData ? "var(--primary)" : "var(--muted)",
                color: showRealData ? "white" : "var(--muted-foreground)",
              }}
              title="Toggle between projected and actual impact"
            >
              {showRealData ? "Actual" : "Projected"}
            </button>
          )}
          {isPositive ? (
            <TrendingUp className="w-4 h-4" style={{ color: "var(--chart-1)" }} />
          ) : isNegative ? (
            <TrendingDown
              className="w-4 h-4"
              style={{ color: "var(--chart-2)" }}
            />
          ) : null}
        </div>
      </div>

      {/* Recent Impact Notification (Inline) */}
      {showRecentInline && recentImpact && (
        <div
          className="mb-3 p-2 rounded text-sm animate-pulse"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderLeft: "3px solid var(--chart-1)",
          }}
        >
          <div className="flex items-center gap-1">
            <span>🎉</span>
            <span className="font-semibold" style={{ color: "var(--chart-1)" }}>
              +
              {formatCurrency(
                recentImpact.savings + recentImpact.debtReduction,
              )}
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            from {recentImpact.characterName}
          </div>
        </div>
      )}

      {/* Total Impact */}
      <div className="mb-3">
        <div
          className="text-3xl font-bold"
          style={{ color: isPositive ? "var(--chart-1)" : "var(--foreground)" }}
        >
          {formatCurrency(totalImpact)}
        </div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Total client improvement
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm mb-3">
        {activeSavings > 0 && (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <PiggyBank className="w-3 h-3" />
              <span>Saved</span>
            </div>
            <span className="font-semibold" style={{ color: "var(--chart-1)" }}>
              +{formatCurrency(activeSavings)}
            </span>
          </div>
        )}
        {activeDebt > 0 && (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <TrendingDown className="w-3 h-3" />
              <span>Debt cleared</span>
            </div>
            <span className="font-semibold" style={{ color: "var(--chart-1)" }}>
              -{formatCurrency(activeDebt)}
            </span>
          </div>
        )}
      </div>

      {/* Growth Rate Indicator */}
      {growthData && growthData.growth.perMinute !== 0 && (
        <div
          className="mb-3 p-2 rounded text-xs"
          style={{
            backgroundColor: growthData.growth.perMinute > 0
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            borderLeft: growthData.growth.perMinute > 0
              ? "3px solid var(--chart-1)"
              : "3px solid var(--chart-2)",
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>
              {growthData.growth.perMinute > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 inline mr-1" style={{ color: "var(--chart-1)" }} />
                  Growing:
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 inline mr-1" style={{ color: "var(--chart-2)" }} />
                  Declining:
                </>
              )}
            </span>
            <span
              className="font-semibold"
              style={{
                color: growthData.growth.perMinute > 0
                  ? "var(--chart-1)"
                  : "var(--chart-2)"
              }}
            >
              {growthData.growth.perMinute > 0 ? "+" : ""}
              {formatCurrency(Math.abs(growthData.growth.perMinute))}/min
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span style={{ color: "var(--muted-foreground)" }}>
              Projected daily:
            </span>
            <span
              className="font-medium"
              style={{
                color: growthData.growth.perMinute > 0
                  ? "var(--muted-foreground)"
                  : "var(--chart-2)"
              }}
            >
              {growthData.growth.perMinute > 0 ? "" : "-"}
              {formatCurrency(Math.abs(growthData.growth.perDay))}
            </span>
          </div>
          {growthData.growth.perMinute < 0 && (
            <div
              className="mt-2 pt-2 border-t text-xs"
              style={{
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "var(--chart-2)"
              }}
            >
              ⚠️ Poor advice is causing client losses
            </div>
          )}
        </div>
      )}

      {/* Accuracy Indicator - Show when real data exists */}
      {realImpact && !showRealData && (
        <div
          className="mb-3 p-2 rounded text-xs"
          style={{
            backgroundColor: "var(--muted)",
            borderLeft: "3px solid var(--primary)",
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>
              <Target className="w-3 h-3 inline mr-1" />
              Actual impact:
            </span>
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>
              {formatCurrency(realImpact.totalRealSavings + realImpact.totalRealDebtReduced)}
            </span>
          </div>
        </div>
      )}

      {/* Click hint */}
      <div
        className="flex items-center justify-center gap-1 text-xs pt-2 border-t"
        style={{
          color: "var(--muted-foreground)",
          borderColor: "var(--border)",
        }}
      >
        <span>View details</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}
