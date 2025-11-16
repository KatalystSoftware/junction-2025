import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ActualOutcome {
  baselineExpenses: number;
  followUpExpenses?: number;
  baselineMonth: string;
  followUpMonth?: string;
  totalSaved?: number;
  categorySavings?: Record<string, number>;
}

interface ActualOutcomeBannerProps {
  outcome: ActualOutcome;
  characterName: string;
  onDismiss?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  coffee: "☕",
  dining: "🍔",
  shopping: "🛒",
  entertainment: "🎬",
  subscriptions: "📱",
  groceries: "🛍️",
  transportation: "🚗",
  utilities: "💡",
};

export function ActualOutcomeBanner({
  outcome,
  characterName,
  onDismiss,
}: ActualOutcomeBannerProps) {
  const savedAmount = outcome.totalSaved ?? 0;
  const isSuccess = savedAmount > 0;
  const isConcern = savedAmount < 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="mx-4 my-3 p-4 rounded-lg border-2 relative"
      style={{
        backgroundColor: isSuccess
          ? "rgba(34, 197, 94, 0.1)"
          : isConcern
            ? "rgba(239, 68, 68, 0.1)"
            : "var(--muted)",
        borderColor: isSuccess
          ? "var(--chart-1)"
          : isConcern
            ? "var(--chart-2)"
            : "var(--border)",
      }}
    >
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
          style={{
            color: "var(--muted-foreground)",
          }}
        >
          ×
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span style={{ fontSize: "1.5rem" }}>
          {isSuccess ? "🎉" : isConcern ? "😔" : "➡️"}
        </span>
        <div className="flex-1">
          <h3
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--card-foreground)",
              marginBottom: "var(--spacing-1)",
            }}
          >
            📈 ACTUAL FINANCIAL OUTCOME
          </h3>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "var(--muted-foreground)",
            }}
          >
            {characterName} returns with results since last visit
          </p>
        </div>
      </div>

      {/* Outcome Summary */}
      <div className="mb-3">
        {isSuccess && (
          <div
            className="flex items-center gap-2 p-2 rounded"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
          >
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "var(--chart-1)" }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--chart-1)",
              }}
            >
              ✅ SUCCESS: Client saved {formatCurrency(savedAmount)} total
            </span>
          </div>
        )}
        {isConcern && (
          <div
            className="flex items-center gap-2 p-2 rounded"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            <TrendingDown
              className="w-4 h-4"
              style={{ color: "var(--chart-2)" }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--chart-2)",
              }}
            >
              ⚠️ CONCERN: Spending increased by{" "}
              {formatCurrency(Math.abs(savedAmount))}
            </span>
          </div>
        )}
        {!isSuccess && !isConcern && (
          <div
            className="flex items-center gap-2 p-2 rounded"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <Minus
              className="w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--muted-foreground)",
              }}
            >
              ➡️ NEUTRAL: No significant change in spending
            </span>
          </div>
        )}
      </div>

      {/* Expenses Comparison */}
      <div
        className="grid grid-cols-2 gap-3 p-3 rounded mb-3"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xs)",
              color: "var(--muted-foreground)",
              marginBottom: "var(--spacing-1)",
            }}
          >
            Previous Expenses ({outcome.baselineMonth})
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-lg)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--card-foreground)",
            }}
          >
            {formatCurrency(outcome.baselineExpenses)}
          </p>
        </div>
        {outcome.followUpExpenses !== undefined && (
          <div>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
                marginBottom: "var(--spacing-1)",
              }}
            >
              Current Expenses ({outcome.followUpMonth || "now"})
            </p>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--font-weight-semibold)",
                color: isSuccess
                  ? "var(--chart-1)"
                  : isConcern
                    ? "var(--chart-2)"
                    : "var(--card-foreground)",
              }}
            >
              {formatCurrency(outcome.followUpExpenses)}
            </p>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {outcome.categorySavings &&
        Object.keys(outcome.categorySavings).length > 0 && (
          <div>
            <h4
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--muted-foreground)",
                marginBottom: "var(--spacing-2)",
              }}
            >
              📊 Category Changes:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(outcome.categorySavings)
                .filter(([_, amount]) => Math.abs(amount) > 1)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([category, amount]) => {
                  const icon = CATEGORY_ICONS[category] || "💰";
                  const sign = amount > 0 ? "-" : "+";
                  return (
                    <div
                      key={category}
                      className="flex items-center gap-2 p-2 rounded"
                      style={{
                        backgroundColor: "var(--muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: "1rem" }}>{icon}</span>
                      <div className="flex-1">
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                            textTransform: "capitalize",
                          }}
                        >
                          {category}
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            fontWeight: "var(--font-weight-semibold)",
                            color:
                              amount > 0 ? "var(--chart-1)" : "var(--chart-2)",
                          }}
                        >
                          {sign}
                          {formatCurrency(Math.abs(amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
    </div>
  );
}
