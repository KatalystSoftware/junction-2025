import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Award, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinReward?: number;
}

interface AchievementUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievements: Achievement[];
  totalCoins?: number;
}

export function AchievementUnlockModal({
  open,
  onOpenChange,
  achievements,
  totalCoins,
}: AchievementUnlockModalProps) {
  if (achievements.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-0 overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader
          className="px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6" style={{ color: "var(--primary)" }} />
            <DialogTitle
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              🏆 Achievement{achievements.length > 1 ? "s" : ""} Unlocked!
            </DialogTitle>
          </div>
          <DialogDescription style={{ display: "none" }}>
            You've unlocked new achievements
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="p-5 rounded-lg border"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--primary)",
                  borderWidth: "2px",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-full text-4xl flex-shrink-0"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "white",
                    }}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-lg)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                        }}
                      >
                        {achievement.name}
                      </h3>
                      {achievement.coinReward && (
                        <span
                          className="px-2 py-1 rounded-full"
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          +{achievement.coinReward} 💎
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                        lineHeight: "1.6",
                      }}
                    >
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {totalCoins !== undefined && totalCoins > 0 && (
              <div
                className="p-5 rounded-lg border text-center"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--primary)",
                  borderWidth: "2px",
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles
                    className="w-5 h-5"
                    style={{ color: "var(--primary)" }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--card-foreground)",
                    }}
                  >
                    Total Coins Earned
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-4xl)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--primary)",
                  }}
                >
                  +{totalCoins} 💎
                </p>
              </div>
            )}

            <div
              className="p-4 rounded-lg text-center"
              style={{
                backgroundColor: "var(--muted)",
              }}
            >
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                }}
              >
                Congratulations! Keep helping clients to unlock more
                achievements.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
