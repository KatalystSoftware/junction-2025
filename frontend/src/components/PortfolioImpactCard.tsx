import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronRight,
} from "lucide-react";

interface PortfolioImpactCardProps {
  lifetimeSavings: number;
  lifetimeDebtCleared: number;
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
  recentImpact,
  animate,
  onClick,
}: PortfolioImpactCardProps) {
  const [displaySavings, setDisplaySavings] = useState(lifetimeSavings);
  const [displayDebt, setDisplayDebt] = useState(lifetimeDebtCleared);
  const [showRecentInline, setShowRecentInline] = useState(false);

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

  const totalImpact = displaySavings + displayDebt;
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
        {isPositive ? (
          <TrendingUp className="w-4 h-4" style={{ color: "var(--chart-1)" }} />
        ) : isNegative ? (
          <TrendingDown
            className="w-4 h-4"
            style={{ color: "var(--chart-2)" }}
          />
        ) : null}
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
        {displaySavings > 0 && (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <PiggyBank className="w-3 h-3" />
              <span>Saved</span>
            </div>
            <span className="font-semibold" style={{ color: "var(--chart-1)" }}>
              +{formatCurrency(displaySavings)}
            </span>
          </div>
        )}
        {displayDebt > 0 && (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <TrendingDown className="w-3 h-3" />
              <span>Debt cleared</span>
            </div>
            <span className="font-semibold" style={{ color: "var(--chart-1)" }}>
              -{formatCurrency(displayDebt)}
            </span>
          </div>
        )}
      </div>

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
