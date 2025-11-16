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
  PiggyBank,
  Users,
  Target,
} from "lucide-react";

interface FinancialImpactHistoryEntry {
  timestamp: string;
  sessionNumber: number;
  characterId: string;
  characterName: string;
  topic: string;
  projectedSavings: number;
  projectedDebtReduction: number;
  categorySavings?: Record<string, number>;
  actualSavings?: number;
  actualDebtReduction?: number;
  adviceQualityScore: number;
  wasFollowUp: boolean;
}

interface AdvisorState {
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  financialImpactHistory?: FinancialImpactHistoryEntry[];
  totalClientsHelped: number;
  totalSessions: number;
}

interface ImpactDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorState?: AdvisorState;
}

export function ImpactDashboardModal({
  open,
  onOpenChange,
  advisorState,
}: ImpactDashboardModalProps) {
  if (!advisorState) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalImpact =
    advisorState.lifetimeSavingsGenerated + advisorState.lifetimeDebtCleared;
  const avgImpactPerClient =
    advisorState.totalClientsHelped > 0
      ? totalImpact / advisorState.totalClientsHelped
      : 0;

  // Get top contributors from history
  const characterContributions = new Map<
    string,
    { name: string; total: number }
  >();
  advisorState.financialImpactHistory?.forEach((entry) => {
    const existing = characterContributions.get(entry.characterId) || {
      name: entry.characterName,
      total: 0,
    };
    existing.total += entry.projectedSavings + entry.projectedDebtReduction;
    characterContributions.set(entry.characterId, existing);
  });

  const topContributors = Array.from(characterContributions.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Get recent consultations
  const recentConsultations = (advisorState.financialImpactHistory || [])
    .slice(-10)
    .reverse();

  const milestones = [
    {
      amount: 1000,
      label: "€1,000",
      emoji: "🥉",
      achieved: totalImpact >= 1000,
    },
    {
      amount: 5000,
      label: "€5,000",
      emoji: "🥈",
      achieved: totalImpact >= 5000,
    },
    {
      amount: 10000,
      label: "€10,000",
      emoji: "🥇",
      achieved: totalImpact >= 10000,
    },
    {
      amount: 50000,
      label: "€50,000",
      emoji: "💎",
      achieved: totalImpact >= 50000,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp
              className="w-6 h-6"
              style={{ color: "var(--chart-1)" }}
            />
            Financial Impact Dashboard
          </DialogTitle>
          <DialogDescription>
            Track the cumulative financial improvement across all your clients
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank
                    className="w-4 h-4"
                    style={{ color: "var(--chart-1)" }}
                  />
                  <span className="text-sm font-semibold">Total Saved</span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatCurrency(advisorState.lifetimeSavingsGenerated)}
                </div>
              </div>

              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown
                    className="w-4 h-4"
                    style={{ color: "var(--chart-1)" }}
                  />
                  <span className="text-sm font-semibold">Debt Cleared</span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatCurrency(advisorState.lifetimeDebtCleared)}
                </div>
              </div>

              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target
                    className="w-4 h-4"
                    style={{ color: "var(--chart-1)" }}
                  />
                  <span className="text-sm font-semibold">Avg/Client</span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatCurrency(avgImpactPerClient)}
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Milestones</h3>
              <div className="grid grid-cols-4 gap-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.amount}
                    className="p-3 rounded-lg border text-center"
                    style={{
                      backgroundColor: milestone.achieved
                        ? "rgba(34, 197, 94, 0.1)"
                        : "var(--muted)",
                      borderColor: milestone.achieved
                        ? "var(--chart-1)"
                        : "var(--border)",
                      opacity: milestone.achieved ? 1 : 0.5,
                    }}
                  >
                    <div className="text-2xl mb-1">{milestone.emoji}</div>
                    <div className="text-sm font-semibold">
                      {milestone.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            {topContributors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Top Client Improvements
                </h3>
                <div className="space-y-2">
                  {topContributors.map((contributor, index) => (
                    <div
                      key={contributor.id}
                      className="p-3 rounded-lg border flex items-center justify-between"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0
                            ? "🥇"
                            : index === 1
                              ? "🥈"
                              : index === 2
                                ? "🥉"
                                : "👤"}
                        </span>
                        <span className="font-medium">{contributor.name}</span>
                      </div>
                      <span
                        className="font-bold"
                        style={{ color: "var(--chart-1)" }}
                      >
                        {formatCurrency(contributor.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Consultations */}
            {recentConsultations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Impact</h3>
                <div className="space-y-2">
                  {recentConsultations.map((entry, index) => {
                    const total =
                      entry.projectedSavings + entry.projectedDebtReduction;
                    return (
                      <div
                        key={`${entry.sessionNumber}-${index}`}
                        className="p-3 rounded-lg border flex items-center justify-between"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {entry.characterName}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Session #{entry.sessionNumber} • {entry.topic}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-bold"
                            style={{ color: "var(--chart-1)" }}
                          >
                            {formatCurrency(total)}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Quality: {entry.adviceQualityScore.toFixed(1)}/10
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
