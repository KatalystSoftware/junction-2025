import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
} from "lucide-react";

interface CharacterRelationship {
  characterId: string;
  characterName: string;
  trustLevel: number; // 0-1
  trustTier: "stranger" | "acquaintance" | "trusted" | "close" | "best_friend";
  visitCount: number;
  lastOutcome?: "positive" | "negative" | "neutral" | "pending";
  wasRecommended: boolean;
  recentTrend?: "improving" | "declining" | "stable";
  decayApplied: number;
}

interface RelationshipsPanelProps {
  relationships: CharacterRelationship[];
}

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
  trusted: "Trusted",
  close: "Close Friend",
  best_friend: "Best Friend",
};

const TRUST_TIER_COLORS: Record<string, string> = {
  stranger: "var(--muted-foreground)",
  acquaintance: "var(--chart-3)",
  trusted: "var(--chart-4)",
  close: "var(--chart-1)",
  best_friend: "var(--chart-1)",
};

export function RelationshipsPanel({ relationships }: RelationshipsPanelProps) {
  if (relationships.length === 0) {
    return (
      <div
        className="p-8 text-center"
        style={{
          color: "var(--muted-foreground)",
        }}
      >
        <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-sm)",
          }}
        >
          No client relationships yet. Start your first consultation!
        </p>
      </div>
    );
  }

  // Sort by trust level descending
  const sortedRelationships = [...relationships].sort(
    (a, b) => b.trustLevel - a.trustLevel,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5" style={{ color: "var(--primary)" }} />
        <h3
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--card-foreground)",
          }}
        >
          Client Relationships
        </h3>
      </div>

      <div className="space-y-3">
        {sortedRelationships.map((relationship) => {
          const trustPercentage = Math.round(relationship.trustLevel * 100);
          const tierColor = TRUST_TIER_COLORS[relationship.trustTier];
          const tierIcon = TRUST_TIER_ICONS[relationship.trustTier];
          const tierLabel = TRUST_TIER_LABELS[relationship.trustTier];

          return (
            <div
              key={relationship.characterId}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "1.5rem" }}>{tierIcon}</span>
                  <div>
                    <h4
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {relationship.characterName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: tierColor,
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {tierLabel}
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        • v{relationship.visitCount}
                      </span>
                      {relationship.wasRecommended && (
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--chart-1)",
                          }}
                        >
                          • 🤝 Recommended
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trend Indicator */}
                {relationship.recentTrend && (
                  <div className="flex items-center gap-1">
                    {relationship.recentTrend === "improving" ? (
                      <TrendingUp
                        className="w-4 h-4"
                        style={{ color: "var(--chart-1)" }}
                      />
                    ) : relationship.recentTrend === "declining" ? (
                      <TrendingDown
                        className="w-4 h-4"
                        style={{ color: "var(--chart-2)" }}
                      />
                    ) : (
                      <Minus
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Trust Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Trust Level
                  </span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: tierColor,
                    }}
                  >
                    {trustPercentage}%
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${trustPercentage}%`,
                      backgroundColor: tierColor,
                    }}
                  />
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center gap-3">
                {/* Last Outcome */}
                {relationship.lastOutcome && (
                  <div className="flex items-center gap-1">
                    {relationship.lastOutcome === "positive" ? (
                      <>
                        <CheckCircle
                          className="w-3 h-3"
                          style={{ color: "var(--chart-1)" }}
                        />
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--chart-1)",
                          }}
                        >
                          Helped
                        </span>
                      </>
                    ) : relationship.lastOutcome === "negative" ? (
                      <>
                        <span style={{ fontSize: "0.75rem" }}>⚠️</span>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--chart-2)",
                          }}
                        >
                          Struggling
                        </span>
                      </>
                    ) : relationship.lastOutcome === "pending" ? (
                      <>
                        <span style={{ fontSize: "0.75rem" }}>❓</span>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Pending
                        </span>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Decay Warning */}
                {relationship.decayApplied > 0 && (
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: "0.75rem" }}>⚠️</span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--chart-2)",
                      }}
                    >
                      Trust decayed
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sortedRelationships.length > 4 && (
        <p
          className="text-center"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-xs)",
            color: "var(--muted-foreground)",
            fontStyle: "italic",
          }}
        >
          Showing all {sortedRelationships.length} client relationships
        </p>
      )}
    </div>
  );
}
