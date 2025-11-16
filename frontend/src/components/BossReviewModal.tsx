import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import {
  CheckCircle2,
  AlertCircle,
  BookOpen,
  TrendingUp,
  TrendingDown,
  HelpCircle,
} from "lucide-react";

interface LearningMaterial {
  materialId: string;
  title: string;
  description: string;
  topic: string;
  url?: string;
  type: "article" | "video" | "tool" | "calculator" | "quiz";
}

interface GodBossReview {
  overallScore: number; // 0-10
  strengthsIdentified: string[];
  areasForImprovement: string[];
  learningMaterials: LearningMaterial[];
  quiz?: any;
  encouragingMessage: string;
  reputationChange: number;
  skillLevelChange: number;
}

interface BossReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: GodBossReview;
  onStartQuiz?: () => void;
}

const MATERIAL_TYPE_ICONS: Record<string, any> = {
  article: BookOpen,
  video: "🎥",
  tool: "🔧",
  calculator: "🧮",
  quiz: HelpCircle,
};

export function BossReviewModal({
  open,
  onOpenChange,
  review,
  onStartQuiz,
}: BossReviewModalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "var(--chart-1)"; // Green
    if (score >= 6) return "var(--chart-4)"; // Blue
    if (score >= 4) return "var(--chart-3)"; // Yellow
    return "var(--chart-2)"; // Orange/Red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent Performance";
    if (score >= 6) return "Good Work";
    if (score >= 4) return "Satisfactory";
    return "Needs Improvement";
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
            👔 Boss Performance Review
          </DialogTitle>
          <DialogDescription style={{ display: "none" }}>
            Your boss's feedback on your recent performance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-6">
            {/* Overall Score */}
            <div
              className="p-5 rounded-lg border"
              style={{
                backgroundColor: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              <div className="text-center">
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                    marginBottom: "var(--spacing-2)",
                  }}
                >
                  Overall Score
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-5xl)",
                    fontWeight: "var(--font-weight-bold)",
                    color: getScoreColor(review.overallScore),
                  }}
                >
                  {review.overallScore.toFixed(1)}
                  <span
                    style={{
                      fontSize: "var(--text-2xl)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    /10
                  </span>
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-medium)",
                    color: getScoreColor(review.overallScore),
                    marginTop: "var(--spacing-2)",
                  }}
                >
                  {getScoreLabel(review.overallScore)}
                </p>
              </div>

              {/* Stat Changes */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: "var(--card)",
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {review.reputationChange >= 0 ? (
                      <TrendingUp
                        className="w-4 h-4"
                        style={{ color: "var(--chart-1)" }}
                      />
                    ) : (
                      <TrendingDown
                        className="w-4 h-4"
                        style={{ color: "var(--chart-2)" }}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Reputation
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color:
                        review.reputationChange >= 0
                          ? "var(--chart-1)"
                          : "var(--chart-2)",
                    }}
                  >
                    {review.reputationChange >= 0 ? "+" : ""}
                    {review.reputationChange}
                  </p>
                </div>

                <div
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: "var(--card)",
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {review.skillLevelChange >= 0 ? (
                      <TrendingUp
                        className="w-4 h-4"
                        style={{ color: "var(--chart-1)" }}
                      />
                    ) : (
                      <TrendingDown
                        className="w-4 h-4"
                        style={{ color: "var(--chart-2)" }}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Skill Level
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color:
                        review.skillLevelChange >= 0
                          ? "var(--chart-1)"
                          : "var(--chart-2)",
                    }}
                  >
                    {review.skillLevelChange >= 0 ? "+" : ""}
                    {review.skillLevelChange.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {review.strengthsIdentified.length > 0 && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--chart-1)",
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {review.strengthsIdentified.map((strength, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      style={{
                        backgroundColor: "var(--muted)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1rem",
                          marginTop: "2px",
                        }}
                      >
                        ✅
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          lineHeight: "1.6",
                        }}
                      >
                        {strength}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {review.areasForImprovement.length > 0 && (
              <div>
                <h3
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--chart-2)",
                  }}
                >
                  <AlertCircle className="w-5 h-5" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {review.areasForImprovement.map((area, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      style={{
                        backgroundColor: "var(--muted)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1rem",
                          marginTop: "2px",
                        }}
                      >
                        ⚠️
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--card-foreground)",
                          lineHeight: "1.6",
                        }}
                      >
                        {area}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Learning Materials */}
            {review.learningMaterials.length > 0 && (
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
                  <BookOpen className="w-5 h-5" />
                  Recommended Learning Materials
                </h3>
                <div className="space-y-3">
                  {review.learningMaterials.map((material) => {
                    const icon =
                      typeof MATERIAL_TYPE_ICONS[material.type] === "string"
                        ? MATERIAL_TYPE_ICONS[material.type]
                        : null;
                    const IconComponent =
                      typeof MATERIAL_TYPE_ICONS[material.type] !== "string"
                        ? MATERIAL_TYPE_ICONS[material.type]
                        : null;

                    return (
                      <div
                        key={material.materialId}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "var(--muted)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{
                              backgroundColor: "var(--primary)",
                              color: "white",
                            }}
                          >
                            {icon ? (
                              <span style={{ fontSize: "1.25rem" }}>
                                {icon}
                              </span>
                            ) : IconComponent ? (
                              <IconComponent className="w-5 h-5" />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <h4
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-base)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--card-foreground)",
                                marginBottom: "var(--spacing-1)",
                              }}
                            >
                              {material.title}
                            </h4>
                            <p
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-sm)",
                                color: "var(--muted-foreground)",
                                lineHeight: "1.6",
                                marginBottom: "var(--spacing-2)",
                              }}
                            >
                              {material.description}
                            </p>
                            {material.url && (
                              <a
                                href={material.url}
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
                                View Material →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quiz Notice */}
            {review.quiz && onStartQuiz && (
              <div
                className="p-5 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--primary)",
                  borderWidth: "2px",
                }}
                onClick={onStartQuiz}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle
                    className="w-6 h-6"
                    style={{ color: "var(--primary)" }}
                  />
                  <div className="flex-1">
                    <h4
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                        marginBottom: "var(--spacing-1)",
                      }}
                    >
                      Quiz Available
                    </h4>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Test your knowledge with a quiz on this topic. Click to
                      start!
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--primary)",
                    }}
                  >
                    Start →
                  </span>
                </div>
              </div>
            )}

            {/* Encouraging Message */}
            <div
              className="p-5 rounded-lg border"
              style={{
                backgroundColor: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ fontSize: "2rem" }}>💼</span>
                <div>
                  <h4
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                      marginBottom: "var(--spacing-2)",
                    }}
                  >
                    From Your Boss
                  </h4>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted-foreground)",
                      lineHeight: "1.6",
                      fontStyle: "italic",
                    }}
                  >
                    "{review.encouragingMessage}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
