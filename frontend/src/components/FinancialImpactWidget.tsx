import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";

interface FinancialImpactWidgetProps {
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

export function FinancialImpactWidget({
  lifetimeSavings,
  lifetimeDebtCleared,
  recentImpact,
  animate,
  onClick,
}: FinancialImpactWidgetProps) {
  const [displaySavings, setDisplaySavings] = useState(lifetimeSavings);
  const [displayDebt, setDisplayDebt] = useState(lifetimeDebtCleared);
  const [showRecent, setShowRecent] = useState(false);

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

  // Show recent impact notification
  useEffect(() => {
    if (
      recentImpact &&
      (recentImpact.savings > 0 || recentImpact.debtReduction > 0)
    ) {
      setShowRecent(true);
      const timer = setTimeout(() => setShowRecent(false), 4000);
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
    <div className="fixed top-4 right-4 z-50">
      {/* Recent impact notification */}
      {showRecent && recentImpact && (
        <div
          className="mb-2 p-3 rounded-lg shadow-lg border-2 animate-slide-down"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.95)",
            borderColor: "var(--chart-1)",
            color: "white",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <div className="text-sm">
              <div className="font-semibold">
                +
                {formatCurrency(
                  recentImpact.savings + recentImpact.debtReduction,
                )}
              </div>
              <div className="text-xs opacity-90">
                from {recentImpact.characterName}'s consultation
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main widget */}
      <div
        className="p-4 rounded-lg shadow-lg border-2 cursor-pointer hover:shadow-xl transition-all"
        style={{
          backgroundColor: "var(--background)",
          borderColor: isPositive
            ? "var(--chart-1)"
            : isNegative
              ? "var(--chart-2)"
              : "var(--border)",
          minWidth: "250px",
        }}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Portfolio Impact
          </span>
          {isPositive ? (
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "var(--chart-1)" }}
            />
          ) : isNegative ? (
            <TrendingDown
              className="w-4 h-4"
              style={{ color: "var(--chart-2)" }}
            />
          ) : (
            <DollarSign
              className="w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
            />
          )}
        </div>

        {/* Total impact */}
        <div className="mb-3">
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {formatCurrency(totalImpact)}
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Total client improvement
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          {displaySavings > 0 && (
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                <PiggyBank className="w-3 h-3" />
                <span>Saved</span>
              </div>
              <span
                className="font-semibold"
                style={{ color: "var(--chart-1)" }}
              >
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
              <span
                className="font-semibold"
                style={{ color: "var(--chart-1)" }}
              >
                -{formatCurrency(displayDebt)}
              </span>
            </div>
          )}
        </div>

        {/* Click hint */}
        <div
          className="mt-3 pt-2 text-xs text-center border-t"
          style={{
            color: "var(--muted-foreground)",
            borderColor: "var(--border)",
          }}
        >
          Click for details
        </div>
      </div>
    </div>
  );
}
