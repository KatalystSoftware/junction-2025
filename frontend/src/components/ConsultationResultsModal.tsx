import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  X,
  CheckSquare,
  XSquare,
  MinusSquare,
  Sparkles,
  Heart,
} from "lucide-react";

interface ExtractedAction {
  actionType: string;
  specificSubscription?: string;
  targetCategory?: string;
  reductionPercent?: number;
  confidence?: number;
}

interface FinancialProjection {
  monthlySavings: number;
  monthlyExpenseReduction: number;
  monthlyDebtPayment: number;
  totalSaved: number;
  totalDebtReduced: number;
  totalInterestSaved: number;
  monthsToGoal: number;
  projectionPeriodMonths: number;
  savingsRate: number;
  debtReductionRate: number;
  emergencyFundProgress: number;
  debtFreeProgress: number;
  categorySavings?: Record<string, number>;
}

interface Evaluation {
  qualityScore: number;
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  wasActionable: boolean;
  wasAccurate: boolean;
}

interface TierChangeNotification {
  characterName: string;
  oldTier: string;
  newTier: string;
  trustLevel: number;
}

interface ConsultationResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterName: string;
  adviceGiven?: string;
  extractedActions?: ExtractedAction[];
  characterResponse?: string;
  projection?: FinancialProjection;
  evaluation?: Evaluation;
  coinsEarned?: number;
  tierChange?: TierChangeNotification;
  recommendationMessage?: string;
}

const ACTION_ICONS: Record<string, string> = {
  cancel_subscription: "🚫",
  reduce_expenses: "📉",
  start_tracking: "📊",
  reduce_impulse: "🛑",
  increase_debt_payment: "💳",
  build_emergency_fund: "🏦",
  negotiate_rates: "💬",
  automate_savings: "⚙️",
};

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

const TRUST_TIER_ICONS: Record<string, string> = {
  stranger: "🤝",
  acquaintance: "👋",
  trusted: "😊",
  close: "❤️",
  best_friend: "💕",
};

const TRUST_TIER_LABELS: Record<string, string> = {
  stranger: "Stranger",
  acquaintance: "Acquaintance",
  trusted: "Trusted Advisor",
  close: "Close Friend",
  best_friend: "Best Friend",
};

export function ConsultationResultsModal({
  open,
  onOpenChange,
  characterName,
  adviceGiven,
  extractedActions,
  characterResponse,
  projection,
  evaluation,
  coinsEarned,
  tierChange,
  recommendationMessage,
}: ConsultationResultsModalProps) {
  const getQualityColor = (score: number) => {
    if (score >= 9) return "var(--chart-1)"; // Excellent - green
    if (score >= 7) return "var(--chart-4)"; // Good - blue
    if (score >= 5) return "var(--chart-3)"; // Average - yellow
    return "var(--chart-2)"; // Poor - orange/red
  };

  const getQualityLabel = (score: number) => {
    if (score >= 9) return "💎 Excellent";
    if (score >= 7) return "🌟 Good";
    if (score >= 5) return "💡 Average";
    return "⚠️ Needs Improvement";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCoinsMessage = (coins: number) => {
    if (coins >= 15)
      return "✅ Excellent! Great advice + strong financial impact!";
    if (coins >= 8) return "✓ Good advice with positive results";
    if (coins >= 5) return "~ Acceptable advice, room for improvement";
    if (coins > 0)
      return "⚠️ Marginal quality - advice barely met minimum standards";
    if (coins === 0)
      return "❌ Poor advice (quality < 5/10) - no payment earned";
    return "❌ Harmful advice - caused damage to client (penalty applied)";
  };

  const getCoinsColor = (coins: number) => {
    if (coins >= 8) return "var(--chart-1)"; // Green
    if (coins >= 5) return "var(--chart-3)"; // Yellow
    if (coins > 0) return "var(--chart-3)"; // Yellow
    return "var(--chart-2)"; // Red
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader
          className="px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <DialogTitle
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--card-foreground)",
            }}
          >
            Consultation Results: {characterName}
          </DialogTitle>
          <DialogDescription style={{ display: "none" }}>
            View detailed results from your consultation with {characterName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-4 space-y-5 pb-6">
            {/* Your Advice Section */}
            {adviceGiven && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  💬 Your Advice
                </h3>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                      lineHeight: "1.6",
                    }}
                  >
                    "{adviceGiven}"
                  </p>
                </div>
              </div>
            )}

            {/* Extracted Actions */}
            {extractedActions && extractedActions.length > 0 && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  ✅ Actionable Items
                </h3>
                <div className="space-y-2">
                  {extractedActions.length === 0 ? (
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                        textAlign: "center",
                        padding: "var(--spacing-8)",
                      }}
                    >
                      No specific actions identified. General financial guidance
                      provided.
                    </p>
                  ) : (
                    extractedActions.map((action, idx) => {
                      const icon = ACTION_ICONS[action.actionType] || "📝";
                      let description = action.actionType
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase());

                      if (action.specificSubscription) {
                        description += `: ${action.specificSubscription}`;
                      } else if (action.targetCategory) {
                        description += ` in ${action.targetCategory}`;
                      }

                      if (action.reductionPercent) {
                        description += ` by ${action.reductionPercent}%`;
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                          style={{
                            backgroundColor: "var(--muted)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              color: "var(--card-foreground)",
                            }}
                          >
                            {description}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Character's Response */}
            {characterResponse && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  💭 {characterName}'s Response
                </h3>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "var(--card-foreground)",
                      lineHeight: "1.6",
                    }}
                  >
                    {characterResponse}
                  </p>
                </div>
              </div>
            )}

            {/* Financial Impact Section */}
            {projection && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  💰 Financial Impact
                </h3>

                {/* "YOU HELPED SAVE" Summary Statement */}
                {projection.totalSaved > 0 && (
                  <div
                    className="p-4 rounded-lg border-2 mb-4"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      borderColor: "var(--chart-1)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xl)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--chart-1)",
                        marginBottom: "var(--spacing-2)",
                      }}
                    >
                      🎯 YOU HELPED SAVE:{" "}
                      {formatCurrency(projection.totalSaved)} over{" "}
                      {projection.projectionPeriodMonths} months
                    </p>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-base)",
                        color: "var(--chart-4)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      That's {formatCurrency(projection.monthlySavings)}/month
                      in their pocket!
                    </p>
                  </div>
                )}

                {/* Summary Card */}
                <div
                  className="p-5 rounded-lg border mb-4"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                          marginBottom: "var(--spacing-1)",
                        }}
                      >
                        Total Saved
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-3xl)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--chart-1)",
                        }}
                      >
                        {formatCurrency(projection.totalSaved)}
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        over {projection.projectionPeriodMonths} months
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                          marginBottom: "var(--spacing-1)",
                        }}
                      >
                        Monthly Savings Average
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-3xl)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--chart-1)",
                        }}
                      >
                        {formatCurrency(projection.monthlySavings)}
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        per month
                      </p>
                    </div>

                    {projection.totalDebtReduced > 0 && (
                      <div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Debt Reduced
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--chart-4)",
                          }}
                        >
                          {formatCurrency(projection.totalDebtReduced)}
                        </p>
                      </div>
                    )}

                    {projection.totalInterestSaved > 0 && (
                      <div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Interest Saved
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--chart-4)",
                          }}
                        >
                          {formatCurrency(projection.totalInterestSaved)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bars */}
                  {projection.emergencyFundProgress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Emergency Fund Progress
                        </span>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--primary)",
                          }}
                        >
                          {Math.round(projection.emergencyFundProgress * 100)}%
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--card)" }}
                      >
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(projection.emergencyFundProgress * 100, 100)}%`,
                            backgroundColor: "var(--chart-1)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {projection.debtFreeProgress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Debt-Free Progress
                        </span>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--primary)",
                          }}
                        >
                          {Math.round(projection.debtFreeProgress * 100)}%
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--card)" }}
                      >
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(projection.debtFreeProgress * 100, 100)}%`,
                            backgroundColor: "var(--chart-4)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Category Breakdown */}
                {projection.categorySavings &&
                  Object.keys(projection.categorySavings).length > 0 && (
                    <div>
                      <h4
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                          marginBottom: "var(--spacing-3)",
                        }}
                      >
                        💰 Savings by Category:
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(projection.categorySavings)
                          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                          .map(([category, amount]) => {
                            const icon = CATEGORY_ICONS[category] || "📊";
                            const monthlyAmount =
                              amount / (projection.projectionPeriodMonths || 1);
                            return (
                              <div
                                key={category}
                                className="p-3 rounded-lg border"
                                style={{
                                  backgroundColor: "var(--card)",
                                  borderColor: "var(--border)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span style={{ fontSize: "1rem" }}>
                                    {icon}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "Inter, sans-serif",
                                      fontSize: "var(--text-xs)",
                                      color: "var(--muted-foreground)",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {category}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    fontFamily: "Inter, sans-serif",
                                    fontSize: "var(--text-lg)",
                                    fontWeight: "var(--font-weight-semibold)",
                                    color:
                                      amount >= 0
                                        ? "var(--chart-1)"
                                        : "var(--chart-2)",
                                  }}
                                >
                                  {amount >= 0 ? "-" : "+"}
                                  {formatCurrency(Math.abs(amount))}
                                </p>
                                <p
                                  style={{
                                    fontFamily: "Inter, sans-serif",
                                    fontSize: "var(--text-xs)",
                                    color: "var(--muted-foreground)",
                                  }}
                                >
                                  ({formatCurrency(Math.abs(monthlyAmount))}
                                  /month)
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Advice Quality Section */}
            {evaluation && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  📊 Advice Quality
                </h3>

                {/* Quality Score */}
                <div
                  className="p-5 rounded-lg border mb-4"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          marginBottom: "var(--spacing-1)",
                        }}
                      >
                        Quality Score
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-4xl)",
                          fontWeight: "var(--font-weight-bold)",
                          color: getQualityColor(evaluation.qualityScore),
                        }}
                      >
                        {evaluation.qualityScore.toFixed(1)}
                        <span
                          style={{
                            fontSize: "var(--text-xl)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          /10
                        </span>
                      </p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: getQualityColor(
                          evaluation.qualityScore,
                        ),
                        color: "white",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {getQualityLabel(evaluation.qualityScore)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {evaluation.strengths.length > 0 && (
                  <div className="mb-4">
                    <h4
                      className="flex items-center gap-2 mb-2"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--chart-1)",
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.strengths.map((strength, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-lg"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <CheckSquare
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            style={{ color: "var(--chart-1)" }}
                          />
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              color: "var(--card-foreground)",
                            }}
                          >
                            {strength}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {evaluation.weaknesses.length > 0 && (
                  <div className="mb-4">
                    <h4
                      className="flex items-center gap-2 mb-2"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--chart-2)",
                      }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.weaknesses.map((weakness, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-lg"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <XSquare
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            style={{ color: "var(--chart-2)" }}
                          />
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-sm)",
                              color: "var(--card-foreground)",
                            }}
                          >
                            {weakness}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missed Opportunities */}
                {evaluation.missedOpportunities.length > 0 && (
                  <div>
                    <h4
                      className="flex items-center gap-2 mb-2"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--chart-3)",
                      }}
                    >
                      <Lightbulb className="w-4 h-4" />
                      Missed Opportunities
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.missedOpportunities.map(
                        (opportunity, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 p-3 rounded-lg"
                            style={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <MinusSquare
                              className="w-4 h-4 mt-0.5 flex-shrink-0"
                              style={{ color: "var(--chart-3)" }}
                            />
                            <span
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-sm)",
                                color: "var(--card-foreground)",
                              }}
                            >
                              {opportunity}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Research Insight */}
            {evaluation && evaluation.qualityScore >= 6 && (
              <div
                className="p-4 rounded-lg border-l-4"
                style={{
                  backgroundColor: "rgba(127, 86, 217, 0.05)",
                  borderColor: "var(--primary)",
                  borderLeft: "4px solid var(--primary)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: "1.5rem" }}>📚</span>
                  <div className="flex-1">
                    <h4
                      className="mb-2"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--primary)",
                      }}
                    >
                      Research Insight
                    </h4>
                    <p
                      className="mb-3"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                        lineHeight: "1.5",
                      }}
                    >
                      Your advice aligns with Finnish financial literacy
                      standards from the Bank of Finland and OECD-INFE
                      frameworks. Young adults who receive quality financial
                      guidance build emergency funds 3x faster than peers.
                    </p>
                    <a
                      href="https://www.suomenpankki.fi/en/financial-literacy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--primary)",
                        textDecoration: "underline",
                      }}
                    >
                      Learn more about Finnish financial literacy research →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Coins Earned */}
            {coinsEarned !== undefined && (
              <div
                className="p-5 rounded-lg border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: getCoinsColor(coinsEarned),
                  borderWidth: "2px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className="w-6 h-6"
                      style={{ color: getCoinsColor(coinsEarned) }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      💎 YOU EARNED
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-3xl)",
                      fontWeight: "var(--font-weight-bold)",
                      color: getCoinsColor(coinsEarned),
                    }}
                  >
                    {coinsEarned > 0 ? "+" : ""}
                    {coinsEarned} 💎
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--card-foreground)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  {getCoinsMessage(coinsEarned)}
                </p>
              </div>
            )}

            {/* Relationship Update */}
            {tierChange && (
              <div
                className="p-5 rounded-lg border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--chart-1)",
                  borderWidth: "2px",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Heart
                    className="w-6 h-6"
                    style={{ color: "var(--chart-1)" }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    Relationship Updated
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "1.5rem" }}>
                      {TRUST_TIER_ICONS[tierChange.oldTier]}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {TRUST_TIER_LABELS[tierChange.oldTier]}
                    </span>
                  </div>
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "var(--chart-1)" }}
                  />
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "1.5rem" }}>
                      {TRUST_TIER_ICONS[tierChange.newTier]}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--chart-1)",
                      }}
                    >
                      {TRUST_TIER_LABELS[tierChange.newTier]}
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                    marginTop: "var(--spacing-2)",
                  }}
                >
                  Trust Level: {Math.round(tierChange.trustLevel * 100)}%
                </p>
              </div>
            )}

            {/* Recommendation Notification */}
            {recommendationMessage && (
              <div
                className="p-5 rounded-lg border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--primary)",
                  borderWidth: "2px",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: "1.5rem" }}>🎉</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    New Client Unlocked!
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {recommendationMessage}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
