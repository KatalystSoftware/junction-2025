import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Trophy, TrendingUp, Users, DollarSign, Award } from "lucide-react";

interface Milestone {
  type: "skill" | "reputation" | "clients" | "finance";
  title: string;
  message: string;
}

interface MilestoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
}

const MILESTONE_ICONS: Record<string, any> = {
  skill: TrendingUp,
  reputation: Award,
  clients: Users,
  finance: DollarSign,
};

const MILESTONE_COLORS: Record<string, string> = {
  skill: "var(--chart-4)", // Blue
  reputation: "var(--chart-1)", // Green
  clients: "var(--chart-3)", // Yellow
  finance: "var(--chart-1)", // Green
};

export function MilestoneModal({
  open,
  onOpenChange,
  milestones,
}: MilestoneModalProps) {
  if (milestones.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader
          className="px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color: "var(--primary)" }} />
            <DialogTitle
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              🎉 Milestones Achieved!
            </DialogTitle>
          </div>
          <DialogDescription style={{ display: "none" }}>
            You've reached new milestones in your career
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-4">
            {milestones.map((milestone, idx) => {
              const Icon = MILESTONE_ICONS[milestone.type] || Trophy;
              const color = MILESTONE_COLORS[milestone.type];
              const isFirstClientHelped = milestone.title.includes("First Client Helped");

              return (
                <div
                  key={idx}
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: isFirstClientHelped 
                      ? "rgba(127, 86, 217, 0.1)" 
                      : "var(--muted)",
                    borderColor: color,
                    borderWidth: "2px",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        color: "white",
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-lg)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: isFirstClientHelped ? "var(--foreground)" : "var(--card-foreground)",
                          marginBottom: "var(--spacing-2)",
                        }}
                      >
                        {milestone.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: isFirstClientHelped ? "var(--foreground)" : "var(--muted-foreground)",
                          lineHeight: "1.6",
                        }}
                      >
                        {milestone.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              className="p-4 rounded-lg text-center"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                border: "2px solid #22c55e",
              }}
            >
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--foreground)",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                Keep up the great work! Your clients are seeing real results
                from your advice.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
