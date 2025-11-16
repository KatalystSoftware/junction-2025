import { Star, TrendingUp, Briefcase } from "lucide-react";

interface StatusBarProps {
  reputation: number;
  skillLevel: number;
  totalSessions: number;
  lastReviewSession: number;
  className?: string;
}

export function StatusBar({
  reputation,
  skillLevel,
  totalSessions,
  lastReviewSession,
  className = "",
}: StatusBarProps) {
  // Handle null/undefined values with defaults
  const safeReputation = reputation ?? 50;
  const safeSkillLevel = skillLevel ?? 1;
  const safeTotalSessions = totalSessions ?? 0;
  const safeLastReviewSession = lastReviewSession ?? 0;

  // Calculate boss review countdown (from CLI getBossReviewStatus logic)
  const sessionsSinceLastReview = safeTotalSessions - safeLastReviewSession;
  const sessionsUntilNext = 5 - sessionsSinceLastReview;
  const nextReviewIn = Math.max(0, Math.min(sessionsUntilNext, 5));

  const getRepColor = (rep: number) => {
    if (rep >= 80) return "var(--chart-1)"; // Green
    if (rep >= 60) return "var(--chart-4)"; // Blue
    if (rep >= 40) return "var(--chart-3)"; // Yellow
    return "var(--chart-2)"; // Red/Orange
  };

  const getSkillColor = (skill: number) => {
    if (skill >= 8) return "var(--chart-1)"; // Green
    if (skill >= 6) return "var(--chart-4)"; // Blue
    if (skill >= 4) return "var(--chart-3)"; // Yellow
    return "var(--chart-2)"; // Red/Orange
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-b ${className}`}
      style={{
        backgroundColor: "var(--muted)",
        borderColor: "var(--border)",
      }}
    >
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex items-center gap-4 flex-1">
        {/* Reputation */}
        <div className="flex items-center gap-2">
          <Star
            className="w-4 h-4"
            style={{ color: getRepColor(safeReputation) }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "var(--muted-foreground)",
            }}
          >
            Rep:
          </span>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: getRepColor(safeReputation),
            }}
          >
            {safeReputation}
          </span>
        </div>

        {/* Skill Level */}
        <div className="flex items-center gap-2">
          <TrendingUp
            className="w-4 h-4"
            style={{ color: getSkillColor(safeSkillLevel) }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "var(--muted-foreground)",
            }}
          >
            Skill:
          </span>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: getSkillColor(safeSkillLevel),
            }}
          >
            {safeSkillLevel.toFixed(1)}
          </span>
        </div>

        {/* Boss Review Countdown */}
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "var(--muted-foreground)",
            }}
          >
            Review in:
          </span>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--primary)",
            }}
          >
            {nextReviewIn === 0
              ? "Next session!"
              : `${nextReviewIn} session${nextReviewIn > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Mobile: Icon badges */}
      <div className="flex md:hidden items-center gap-3 flex-1 justify-around">
        {/* Reputation Badge */}
        <div className="flex flex-col items-center">
          <Star
            className="w-5 h-5 mb-1"
            style={{ color: getRepColor(safeReputation) }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: getRepColor(safeReputation),
            }}
          >
            {safeReputation}
          </span>
        </div>

        {/* Skill Badge */}
        <div className="flex flex-col items-center">
          <TrendingUp
            className="w-5 h-5 mb-1"
            style={{ color: getSkillColor(safeSkillLevel) }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: getSkillColor(safeSkillLevel),
            }}
          >
            {safeSkillLevel.toFixed(1)}
          </span>
        </div>

        {/* Boss Review Badge */}
        <div className="flex flex-col items-center">
          <Briefcase
            className="w-5 h-5 mb-1"
            style={{ color: "var(--primary)" }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--primary)",
            }}
          >
            {nextReviewIn === 0 ? "Now!" : nextReviewIn}
          </span>
        </div>
      </div>
    </div>
  );
}
