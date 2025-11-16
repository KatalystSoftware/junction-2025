import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { XCircle, RotateCcw, TrendingDown } from "lucide-react";

interface GameOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firingMessage?: {
    title: string;
    reason: string;
    finalMessage: string;
    stats: {
      totalSessions: number;
      clientsHelped: number;
      reputation: number;
      skillLevel: number;
    };
  };
  onRestart?: () => void;
}

export function GameOverModal({
  open,
  onOpenChange,
  firingMessage,
  onRestart,
}: GameOverModalProps) {
  if (!firingMessage) return null;

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      // Default restart: clear session and reload
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 flex flex-col gap-0"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--destructive)",
          borderWidth: "2px",
        }}
      >
        <DialogHeader
          className="px-6 py-5 border-b flex-shrink-0"
          style={{
            borderColor: "var(--destructive)",
            backgroundColor: "var(--destructive-foreground)",
          }}
        >
          <div className="flex items-center gap-3">
            <XCircle
              className="h-8 w-8"
              style={{ color: "var(--destructive)" }}
            />
            <DialogTitle
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--destructive)",
              }}
            >
              {firingMessage.title}
            </DialogTitle>
          </div>
          <DialogDescription style={{ display: "none" }}>
            Game Over - You have been fired
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Reason Section */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <TrendingDown
                className="h-5 w-5 mt-0.5"
                style={{ color: "var(--destructive)" }}
              />
              <div>
                <h3
                  className="font-semibold mb-2"
                  style={{
                    color: "var(--card-foreground)",
                    fontSize: "var(--text-base)",
                  }}
                >
                  Reason for Termination
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {firingMessage.reason}
                </p>
              </div>
            </div>
          </div>

          {/* Final Message */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "var(--muted)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-sm italic"
              style={{ color: "var(--card-foreground)" }}
            >
              "{firingMessage.finalMessage}"
            </p>
          </div>

          {/* Stats Summary */}
          <div className="space-y-3">
            <h3
              className="font-semibold"
              style={{
                color: "var(--card-foreground)",
                fontSize: "var(--text-base)",
              }}
            >
              Your Final Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Sessions Completed
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--card-foreground)" }}
                >
                  {firingMessage.stats.totalSessions}
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Clients Helped
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--card-foreground)" }}
                >
                  {firingMessage.stats.clientsHelped}
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Final Reputation
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--destructive)" }}
                >
                  {firingMessage.stats.reputation}
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Final Skill Level
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--card-foreground)" }}
                >
                  {firingMessage.stats.skillLevel.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Restart Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleRestart}
              size="lg"
              className="gap-2"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Start New Game
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
