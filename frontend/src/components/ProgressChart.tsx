import { TrendingUp, Users, Sparkles } from "lucide-react";

interface SessionData {
  sessionId: string;
  timestamp: string;
  adviceQualityScore?: number;
}

interface ProgressChartProps {
  sessionHistory: SessionData[];
  totalSessions: number;
  totalClients: number;
  advisorCoins: number;
  skillLevel: number;
}

export function ProgressChart({
  sessionHistory,
  totalSessions,
  totalClients,
  advisorCoins,
  skillLevel,
}: ProgressChartProps) {
  // Get last 10 sessions for the trend
  const recentSessions = sessionHistory.slice(-10);

  // Calculate skill trend (simplified - using session quality as proxy)
  const skillTrend = recentSessions.map((session, idx) => {
    // Approximate skill level based on session index and quality
    const baseSkill = Math.max(
      0,
      skillLevel - (recentSessions.length - idx - 1) * 0.1,
    );
    return {
      session: totalSessions - recentSessions.length + idx + 1,
      skill: baseSkill,
      quality: session.adviceQualityScore || 0,
    };
  });

  // Calculate max skill for chart scaling
  const maxSkill = Math.max(skillLevel, 10);
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 20;
  const pointRadius = 4;

  // Calculate points for SVG path
  const points = skillTrend.map((data, idx) => {
    const x =
      padding + (idx / (skillTrend.length - 1)) * (chartWidth - 2 * padding);
    const y =
      chartHeight -
      padding -
      (data.skill / maxSkill) * (chartHeight - 2 * padding);
    return { x, y, ...data };
  });

  // Create SVG path
  const pathD = points.reduce((path, point, idx) => {
    if (idx === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${path} L ${point.x} ${point.y}`;
  }, "");

  // Create area path (for fill)
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5" style={{ color: "var(--primary)" }} />
        <h3
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--card-foreground)",
          }}
        >
          Progress Tracking
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--muted)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "var(--chart-4)" }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
              }}
            >
              Sessions
            </span>
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--card-foreground)",
            }}
          >
            {totalSessions}
          </p>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--muted)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4" style={{ color: "var(--chart-1)" }} />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
              }}
            >
              Clients
            </span>
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--card-foreground)",
            }}
          >
            {totalClients}
          </p>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--muted)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: "var(--primary)" }} />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
              }}
            >
              Coins
            </span>
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--card-foreground)",
            }}
          >
            {advisorCoins} 💎
          </p>
        </div>
      </div>

      {/* Skill Trend Chart */}
      {skillTrend.length > 0 && (
        <div>
          <h4
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--muted-foreground)",
              marginBottom: "var(--spacing-3)",
            }}
          >
            Skill Level Trend (Last {skillTrend.length} Sessions)
          </h4>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "var(--muted)",
              borderColor: "var(--border)",
            }}
          >
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            >
              {/* Grid lines */}
              {[0, 2.5, 5, 7.5, 10].map((value) => {
                const y =
                  chartHeight -
                  padding -
                  (value / maxSkill) * (chartHeight - 2 * padding);
                return (
                  <g key={value}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding - 5}
                      y={y + 4}
                      textAnchor="end"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "10px",
                        fill: "var(--muted-foreground)",
                      }}
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path d={areaPathD} fill="var(--primary)" opacity="0.1" />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {points.map((point, idx) => (
                <g key={idx}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={pointRadius}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {/* Session number label */}
                  <text
                    x={point.x}
                    y={chartHeight - padding + 15}
                    textAnchor="middle"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "9px",
                      fill: "var(--muted-foreground)",
                    }}
                  >
                    #{point.session}
                  </text>
                </g>
              ))}
            </svg>

            {/* Current Skill Level */}
            <div className="mt-4 text-center">
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                  marginBottom: "var(--spacing-1)",
                }}
              >
                Current Skill Level
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--primary)",
                }}
              >
                {skillLevel.toFixed(1)}
                <span
                  style={{
                    fontSize: "var(--text-lg)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  /10
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {skillTrend.length === 0 && (
        <div
          className="p-8 text-center rounded-lg border"
          style={{
            backgroundColor: "var(--muted)",
            borderColor: "var(--border)",
          }}
        >
          <TrendingUp
            className="w-12 h-12 mx-auto mb-3 opacity-50"
            style={{ color: "var(--muted-foreground)" }}
          />
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "var(--muted-foreground)",
            }}
          >
            Complete more consultations to see your progress trend
          </p>
        </div>
      )}
    </div>
  );
}
