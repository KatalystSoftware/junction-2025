interface TrustMeterProps {
  trust: number; // 0-100
  compact?: boolean;
}

export function TrustMeter({ trust, compact = false }: TrustMeterProps) {
  // Clamp trust between 0 and 100
  const clampedTrust = Math.max(0, Math.min(100, trust));

  // Get trust level label and emoji
  const getTrustLevel = (
    trust: number,
  ): { label: string; emoji: string; color: string } => {
    if (trust <= 20) {
      return { label: "Distrust", emoji: "😡", color: "var(--destructive)" };
    } else if (trust <= 40) {
      return { label: "Skeptical", emoji: "😕", color: "var(--chart-2)" };
    } else if (trust <= 60) {
      return { label: "Neutral", emoji: "🙂", color: "var(--chart-3)" };
    } else if (trust <= 80) {
      return { label: "Friendly", emoji: "🤝", color: "var(--chart-4)" };
    } else {
      return { label: "Full Trust", emoji: "❤️", color: "var(--chart-1)" };
    }
  };

  const trustLevel = getTrustLevel(clampedTrust);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "1.25rem" }}>{trustLevel.emoji}</span>
        <div className="flex-1">
          <div
            className="w-full h-2 relative overflow-hidden"
            style={{
              backgroundColor: "var(--muted)",
              borderRadius: "var(--radius-button)",
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${clampedTrust}%`,
                backgroundColor: trustLevel.color,
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--card-foreground)",
          }}
        >
          {clampedTrust}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trust Level Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1.5rem" }}>{trustLevel.emoji}</span>
          <div>
            <h5
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              Trust Level: {trustLevel.label}
            </h5>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
              }}
            >
              {clampedTrust}/100
            </p>
          </div>
        </div>
      </div>

      {/* Trust Bar */}
      <div
        className="w-full h-3 relative overflow-hidden"
        style={{
          backgroundColor: "var(--muted)",
          borderRadius: "var(--radius-button)",
        }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${clampedTrust}%`,
            backgroundColor: trustLevel.color,
          }}
        />
      </div>

      {/* Trust Scale Markers */}
      <div className="relative">
        <div className="flex justify-between">
          {[
            { value: 0, label: "0" },
            { value: 25, label: "25" },
            { value: 50, label: "50" },
            { value: 75, label: "75" },
            { value: 100, label: "100" },
          ].map((marker) => (
            <div key={marker.value} className="flex flex-col items-center">
              <div
                className="w-px h-2"
                style={{ backgroundColor: "var(--border)" }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                  marginTop: "4px",
                }}
              >
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Level Description */}
      <div
        className="p-3"
        style={{
          backgroundColor: "var(--muted)",
          borderRadius: "var(--radius-button)",
        }}
      >
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-xs)",
            color: "var(--muted-foreground)",
            lineHeight: 1.5,
          }}
        >
          {clampedTrust <= 20 &&
            "This contact is hostile and likely to ignore or reject your suggestions."}
          {clampedTrust > 20 &&
            clampedTrust <= 40 &&
            "This contact is skeptical and will challenge your advice."}
          {clampedTrust > 40 &&
            clampedTrust <= 60 &&
            "This contact has a neutral stance and is cooperative."}
          {clampedTrust > 60 &&
            clampedTrust <= 80 &&
            "This contact is friendly and receptive to your guidance."}
          {clampedTrust > 80 &&
            "This contact fully trusts you and actively seeks your advice."}
        </p>
      </div>
    </div>
  );
}
