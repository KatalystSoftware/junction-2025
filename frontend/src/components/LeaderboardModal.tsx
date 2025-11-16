import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Award,
  Star,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";

interface LeaderboardEntry {
  advisorId: string;
  advisorName: string;
  reputation: number;
  skillLevel: number;
  totalSessions: number;
  totalClientsHelped: number;
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  advisorCoins: number;
  averageAdviceScore: number;
  achievementCount: number;
  globalRank?: number;
  globalScore: number;
  firstSessionDate: string;
  lastUpdated: string;
}

interface LeaderboardRanking {
  category: string;
  entries: LeaderboardEntry[];
  lastUpdated: string;
  totalParticipants: number;
}

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorId?: string;
}

export function LeaderboardModal({
  open,
  onOpenChange,
  advisorId,
}: LeaderboardModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("global");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRanking | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data when modal opens or category changes
  useEffect(() => {
    if (!open) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/game/leaderboard?category=${selectedCategory}&limit=100`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }

        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [open, selectedCategory]);

  // Get current user's rank
  const currentUserEntry = leaderboard?.entries.find(
    (entry) => entry.advisorId === advisorId,
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "global":
        return <Trophy className="w-4 h-4" />;
      case "reputation":
        return <Star className="w-4 h-4" />;
      case "impact":
        return <TrendingUp className="w-4 h-4" />;
      case "expertise":
        return <Sparkles className="w-4 h-4" />;
      case "coins":
        return <DollarSign className="w-4 h-4" />;
      case "achievements":
        return <Award className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getCategoryValue = (entry: LeaderboardEntry, category: string) => {
    switch (category) {
      case "global":
        return `${entry.globalScore.toFixed(0)} pts`;
      case "reputation":
        return entry.reputation;
      case "impact":
        return `€${(entry.lifetimeSavingsGenerated + entry.lifetimeDebtCleared).toFixed(0)}`;
      case "expertise":
        return entry.skillLevel.toFixed(1);
      case "coins":
        return `${entry.advisorCoins} 🪙`;
      case "achievements":
        return entry.achievementCount;
      default:
        return "";
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Global Leaderboard
          </DialogTitle>
          <DialogDescription>
            Compete with advisors worldwide
            {leaderboard && ` • ${leaderboard.totalParticipants} participants`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="flex-1 flex flex-col min-h-0 px-6"
        >
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
            <TabsTrigger value="global" className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="reputation" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span className="hidden sm:inline">Rep</span>
            </TabsTrigger>
            <TabsTrigger value="impact" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Impact</span>
            </TabsTrigger>
            <TabsTrigger value="expertise" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Expert</span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span className="hidden sm:inline">Coins</span>
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center gap-1"
            >
              <Award className="w-3 h-3" />
              <span className="hidden sm:inline">Awards</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">{error}</div>
              </div>
            )}

            {!loading && !error && leaderboard && (
              <ScrollArea className="h-full pr-4">
                {/* Current user's rank banner */}
                {currentUserEntry && (
                  <div className="mb-4 p-4 bg-primary/10 rounded-lg border-2 border-primary">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getRankBadge(currentUserEntry.globalRank || 0)}
                        </span>
                        <div>
                          <div className="font-bold">
                            {currentUserEntry.advisorName} (You)
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getCategoryValue(
                              currentUserEntry,
                              selectedCategory,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaderboard entries */}
                <div className="space-y-2">
                  {leaderboard.entries.map((entry, index) => {
                    const isCurrentUser = entry.advisorId === advisorId;
                    const rank = entry.globalRank || index + 1;

                    return (
                      <div
                        key={entry.advisorId}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isCurrentUser
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-12 text-center font-semibold text-lg">
                          {getRankBadge(rank)}
                        </div>

                        {/* Name & Stats */}
                        <div className="flex-1">
                          <div className="font-medium">
                            {entry.advisorName}
                            {isCurrentUser && " (You)"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.totalSessions} sessions •{" "}
                            {entry.totalClientsHelped} clients
                          </div>
                        </div>

                        {/* Category-specific value */}
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {getCategoryValue(entry, selectedCategory)}
                          </div>
                          {selectedCategory === "global" && (
                            <div className="text-xs text-muted-foreground">
                              Rep: {entry.reputation} • Skill:{" "}
                              {entry.skillLevel.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {leaderboard.entries.length === 0 && (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No rankings available yet
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center pt-2 pb-4 px-6 border-t flex-shrink-0">
          {leaderboard &&
            `Last updated: ${new Date(leaderboard.lastUpdated).toLocaleString()}`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
