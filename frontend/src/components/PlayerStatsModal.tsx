import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import {
  Trophy,
  Clock,
  Target,
  Star,
  Award,
  Zap,
  TrendingUp,
  Heart,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Contact } from "./WhatsAppInterface";
import { getPlayerAvatarUrl } from "../utils/avatarUtils";
import { useTranslation } from "../utils/translations";

interface AdvisorState {
  advisorCoins: number;
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  reputation: number;
  skillLevel: number;
  totalClientsHelped: number;
  totalSessions: number;
  achievementsUnlocked: string[];
  sessionHistory: any[];
  currentStreak: number;
  careerTier: number;
}

interface PlayerStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  advisorState?: AdvisorState;
}

export function PlayerStatsModal({
  open,
  onOpenChange,
  contacts,
  advisorState,
}: PlayerStatsModalProps) {
  const t = useTranslation();
  const [playerName, setPlayerName] = useState("Player");
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState("");

  // Load player profile from localStorage
  useEffect(() => {
    const userProfileStr = localStorage.getItem("userProfile");
    if (userProfileStr) {
      try {
        const userProfile = JSON.parse(userProfileStr);
        if (userProfile.name) {
          setPlayerName(userProfile.name);
        }
        if (userProfile.avatar) {
          setPlayerAvatarUrl(getPlayerAvatarUrl(userProfile.avatar));
        }
      } catch (e) {
        console.error("Failed to parse userProfile:", e);
      }
    }
  }, [open]); // Reload when modal opens

  // Handle restart game
  const handleRestartGame = () => {
    if (confirm("Are you sure you want to restart the game? All progress will be lost.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Calculate average trust score across all contacts
  const averageTrust =
    contacts.length > 0
      ? Math.round(
          contacts.reduce((sum, contact) => sum + contact.trust, 0) /
            contacts.length,
        )
      : 0;

  // Get trust emoji based on average
  const getTrustEmoji = (trust: number) => {
    if (trust <= 20) return "😡";
    if (trust <= 40) return "😕";
    if (trust <= 60) return "🙂";
    if (trust <= 80) return "🤝";
    return "❤️";
  };

  // Get trust color
  const getTrustColor = (trust: number) => {
    if (trust <= 20) return "var(--destructive)";
    if (trust <= 40) return "var(--chart-2)";
    if (trust <= 60) return "var(--chart-3)";
    if (trust <= 80) return "var(--chart-4)";
    return "var(--chart-1)";
  };

  // Calculate real stats from advisorState
  const totalSessions = advisorState?.totalSessions || 0;
  const totalClients = advisorState?.totalClientsHelped || 0;
  const currentStreak = advisorState?.currentStreak || 0;

  // Calculate total messages sent from session history
  const totalMessages =
    advisorState?.sessionHistory?.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0) || 0;

  // Calculate level and XP from skillLevel (0-10 scale)
  const skillLevel = advisorState?.skillLevel || 0;
  const level = Math.floor(skillLevel) + 1; // Convert 0-10 to 1-11
  const xpProgress = Math.round((skillLevel % 1) * 100); // Get decimal part as percentage
  const xpForNextLevel = 100;
  const xpToNextLevel = xpForNextLevel - xpProgress;

  // Money saved
  const moneySaved = Math.round(advisorState?.lifetimeSavingsGenerated || 0);

  // Define all possible achievements
  const allAchievements = [
    {
      id: "first_consultation",
      name: "First Steps",
      description: "Complete your first consultation",
      icon: "💬",
      requiredSessions: 1,
    },
    {
      id: "conversation_starter",
      name: "Conversation Starter",
      description: "Complete 10 consultations",
      icon: "🎯",
      requiredSessions: 10,
    },
    {
      id: "social_butterfly",
      name: "Social Butterfly",
      description: "Help 20 different clients",
      icon: "🦋",
      requiredClients: 20,
    },
    {
      id: "money_saver",
      name: "Money Saver",
      description: "Help clients save €5,000",
      icon: "💰",
      requiredSavings: 5000,
    },
    {
      id: "expert_advisor",
      name: "Expert Advisor",
      description: "Reach skill level 8",
      icon: "⚡",
      requiredSkill: 8,
    },
    {
      id: "master_communicator",
      name: "Master Communicator",
      description: "Send 1000 messages",
      icon: "🏆",
      requiredMessages: 1000,
    },
  ];

  // Calculate which achievements are unlocked based on real data
  const achievements = allAchievements.map((achievement) => {
    let unlocked =
      advisorState?.achievementsUnlocked?.includes(achievement.id) || false;

    // Also check if they should be unlocked based on stats
    if (!unlocked) {
      if (
        achievement.requiredSessions &&
        totalSessions >= achievement.requiredSessions
      )
        unlocked = true;
      if (
        achievement.requiredClients &&
        totalClients >= achievement.requiredClients
      )
        unlocked = true;
      if (
        achievement.requiredSavings &&
        moneySaved >= achievement.requiredSavings
      )
        unlocked = true;
      if (achievement.requiredSkill && skillLevel >= achievement.requiredSkill)
        unlocked = true;
      if (
        achievement.requiredMessages &&
        totalMessages >= achievement.requiredMessages
      )
        unlocked = true;
    }

    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      unlocked,
    };
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const stats = [
    {
      label: "Coins Earned",
      value: (advisorState?.advisorCoins || 0).toLocaleString(),
      icon: Clock,
    },
    {
      label: "Messages Sent",
      value: totalMessages.toLocaleString(),
      icon: Target,
    },
    {
      label: "Consultations",
      value: totalSessions.toLocaleString(),
      icon: Star,
    },
    {
      label: "Win Streak",
      value:
        currentStreak > 0
          ? `${currentStreak} 🔥`
          : currentStreak < 0
            ? `${Math.abs(currentStreak)} ❄️`
            : "0",
      icon: TrendingUp,
    },
  ];

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
          <DialogTitle
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--card-foreground)",
            }}
          >
            Player Stats
          </DialogTitle>
          <DialogDescription style={{ display: "none" }}>
            View your player statistics, achievements, and progress
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="px-6 py-6 space-y-6">
            {/* Player Profile Section */}
            <div
              className="flex flex-col items-center gap-4 pb-6 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={playerAvatarUrl}
                    alt="Player Avatar"
                  />
                  <AvatarFallback
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {playerName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-2 -right-2 flex items-center justify-center w-10 h-10 rounded-full border-4"
                  style={{
                    backgroundColor: "var(--primary)",
                    borderColor: "var(--card)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {level}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <h2
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-2xl)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                    marginBottom: "var(--spacing-1)",
                  }}
                >
                  {playerName}
                </h2>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                    marginBottom: "var(--spacing-2)",
                  }}
                >
                  Financial Advisor
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Level {level} • {xpProgress}/{xpForNextLevel} XP
                </p>
              </div>

              {/* Level Progress Bar */}
              <div className="w-full max-w-md">
                <div className="flex justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Current Level
                  </span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--primary)",
                    }}
                  >
                    {xpToNextLevel} XP to Level {level + 1}
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: "var(--muted)",
                    filter: "brightness(0.7)",
                  }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${xpProgress}%`,
                      backgroundColor: "var(--primary)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" style={{ color: "var(--primary)" }} />
                <h3
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  Statistics
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: "var(--muted)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-xs)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {stat.label}
                          </p>
                          <p
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "var(--text-xl)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--card-foreground)",
                            }}
                          >
                            {stat.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall Trust Score & Money Saved */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart
                  className="w-5 h-5"
                  style={{ color: "var(--primary)" }}
                />
                <h3
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  Relationship Overview
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Overall Trust Score */}
                <div
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Overall Trust Score
                    </p>
                    <span style={{ fontSize: "1.5rem" }}>
                      {getTrustEmoji(averageTrust)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-4xl)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {averageTrust}
                    </p>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-lg)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      / 100
                    </p>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden mb-2"
                    style={{
                      backgroundColor: "var(--card)",
                    }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${averageTrust}%`,
                        backgroundColor: getTrustColor(averageTrust),
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Average across {contacts.length} contact
                    {contacts.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Money Saved */}
                <div
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Money Saved
                    </p>
                    <div
                      className="p-1.5 rounded-lg"
                      style={{
                        backgroundColor: "var(--chart-1)",
                      }}
                    >
                      <DollarSign
                        className="w-4 h-4"
                        style={{ color: "var(--primary-foreground)" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-4xl)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      ${moneySaved.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: "var(--chart-1)",
                    }}
                  >
                    <TrendingUp
                      className="w-3 h-3"
                      style={{ color: "var(--primary-foreground)" }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      From financial advice
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Trophy
                  className="w-5 h-5"
                  style={{ color: "var(--primary)" }}
                />
                <h3
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                  }}
                >
                  Achievements
                </h3>
                <span
                  className="ml-auto px-2 py-1 rounded-full"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-medium)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {unlockedCount}/{achievements.length}
                </span>
              </div>
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                    style={{
                      backgroundColor: achievement.unlocked
                        ? "var(--muted)"
                        : "transparent",
                      borderColor: "var(--border)",
                      opacity: achievement.unlocked ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-full text-2xl"
                      style={{
                        backgroundColor: achievement.unlocked
                          ? "var(--primary)"
                          : "var(--muted)",
                      }}
                    >
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {achievement.name}
                        </h4>
                        {achievement.unlocked && (
                          <Award
                            className="w-4 h-4"
                            style={{ color: "var(--primary)" }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Restart Game Button */}
            <div
              className="pt-6 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRestartGame}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t.stats.restartGame}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
