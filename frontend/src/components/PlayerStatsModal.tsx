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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
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
import { RelationshipsPanel } from "./RelationshipsPanel";
import { ProgressChart } from "./ProgressChart";
import { useAnalytics } from "../hooks/useAnalytics";

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
    try {
      const userProfileStr = localStorage.getItem("userProfile");
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr);
        if (userProfile.name) {
          setPlayerName(userProfile.name);
        }
        if (userProfile.avatar) {
          setPlayerAvatarUrl(getPlayerAvatarUrl(userProfile.avatar));
        }
      }
    } catch (e) {
      console.warn("Failed to access localStorage or parse userProfile:", e);
      // Fallback to defaults (already set in useState)
    }
  }, [open]); // Reload when modal opens

  // Handle restart game
  const handleRestartGame = () => {
    if (
      confirm(
        "Are you sure you want to restart the game? All progress will be lost.",
      )
    ) {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn("Failed to clear localStorage:", e);
      }
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

  // Load analytics data
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();

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
        className="max-w-2xl max-h-[calc(100dvh-4rem)] p-0 overflow-hidden flex flex-col"
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
            Player Stats
          </DialogTitle>
          <DialogDescription style={{ display: "none" }}>
            View your player statistics, achievements, and progress
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <Tabs defaultValue="stats" className="px-6 py-4">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="space-y-6">
              {/* Player Profile Section */}
              <div
                className="flex flex-col items-center gap-4 pb-6 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={playerAvatarUrl} alt="Player Avatar" />
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
                  <Zap
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
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p style={{ color: "var(--muted-foreground)" }}>
                      Loading analytics...
                    </p>
                  </div>
                </div>
              ) : !analytics ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p style={{ color: "var(--muted-foreground)" }}>
                      Complete more sessions to view analytics
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Performance Overview */}
                  <div>
                    <h3
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                        marginBottom: "var(--spacing-4)",
                      }}
                    >
                      Performance Overview
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <p
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Success Rate
                        </p>
                        <p
                          style={{
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {analytics.performance.overallSuccessRate.toFixed(1)}%
                        </p>
                      </div>
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <p
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Avg Quality
                        </p>
                        <p
                          style={{
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {analytics.performance.averageQualityScore.toFixed(1)}
                          /10
                        </p>
                      </div>
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <p
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Trend
                        </p>
                        <p
                          style={{
                            fontSize: "var(--text-lg)",
                            fontWeight: "var(--font-weight-bold)",
                            color:
                              analytics.performance.qualityTrend === "improving"
                                ? "var(--chart-1)"
                                : analytics.performance.qualityTrend ===
                                    "declining"
                                  ? "var(--destructive)"
                                  : "var(--muted-foreground)",
                          }}
                        >
                          {analytics.performance.qualityTrend === "improving"
                            ? "↗ Improving"
                            : analytics.performance.qualityTrend === "declining"
                              ? "↘ Declining"
                              : "→ Stable"}
                          {analytics.performance.trendPercentage > 0 &&
                            ` (+${analytics.performance.trendPercentage.toFixed(1)}%)`}
                        </p>
                      </div>
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <p
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--muted-foreground)",
                            marginBottom: "var(--spacing-1)",
                          }}
                        >
                          Empathy Rate
                        </p>
                        <p
                          style={{
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {analytics.performance.empathyRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Topic Expertise */}
                  <div>
                    <h3
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                        marginBottom: "var(--spacing-4)",
                      }}
                    >
                      Topic Expertise
                    </h3>
                    <div className="space-y-3">
                      {analytics.topicExpertise.topics
                        .filter((t) => t.sessionCount > 0)
                        .sort((a, b) => b.expertiseLevel - a.expertiseLevel)
                        .slice(0, 5)
                        .map((topic) => (
                          <div
                            key={topic.topic}
                            className="flex items-center gap-3"
                          >
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span
                                  style={{
                                    fontSize: "var(--text-sm)",
                                    fontWeight: "var(--font-weight-medium)",
                                    color: "var(--card-foreground)",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {topic.topic.replace(/_/g, " ")}
                                </span>
                                <span
                                  style={{
                                    fontSize: "var(--text-sm)",
                                    color: "var(--muted-foreground)",
                                  }}
                                >
                                  {topic.expertiseLevel.toFixed(1)}/10
                                </span>
                              </div>
                              <div
                                className="w-full h-2 rounded-full"
                                style={{ backgroundColor: "var(--muted)" }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(topic.expertiseLevel / 10) * 100}%`,
                                    backgroundColor:
                                      topic.expertiseLevel >= 7
                                        ? "var(--chart-1)"
                                        : topic.expertiseLevel >= 5
                                          ? "var(--chart-3)"
                                          : "var(--chart-2)",
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {topic.sessionCount} sessions
                            </span>
                          </div>
                        ))}
                    </div>
                    {analytics.topicExpertise.topics.filter(
                      (t) => t.sessionCount > 0,
                    ).length === 0 && (
                      <p
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          textAlign: "center",
                          padding: "var(--spacing-8)",
                        }}
                      >
                        Complete more sessions to see topic expertise
                      </p>
                    )}
                  </div>

                  {/* Financial Impact by Topic */}
                  <div>
                    <h3
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                        marginBottom: "var(--spacing-4)",
                      }}
                    >
                      Financial Impact by Topic
                    </h3>
                    <div className="space-y-2">
                      {analytics.financialImpact.impactByTopic
                        .filter((t) => t.sessionCount > 0)
                        .sort(
                          (a, b) =>
                            b.totalSavings +
                            b.totalDebtCleared -
                            (a.totalSavings + a.totalDebtCleared),
                        )
                        .slice(0, 5)
                        .map((topic) => (
                          <div
                            key={topic.topic}
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: "var(--muted)" }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span
                                style={{
                                  fontSize: "var(--text-sm)",
                                  fontWeight: "var(--font-weight-medium)",
                                  color: "var(--card-foreground)",
                                  textTransform: "capitalize",
                                }}
                              >
                                {topic.topic.replace(/_/g, " ")}
                              </span>
                              <span
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--muted-foreground)",
                                }}
                              >
                                {topic.sessionCount} sessions
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span style={{ color: "var(--chart-1)" }}>
                                💰 €{topic.totalSavings.toLocaleString()} saved
                              </span>
                              {topic.totalDebtCleared > 0 && (
                                <span style={{ color: "var(--chart-2)" }}>
                                  ↓ €{topic.totalDebtCleared.toLocaleString()}{" "}
                                  debt cleared
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    {analytics.financialImpact.impactByTopic.filter(
                      (t) => t.sessionCount > 0,
                    ).length === 0 && (
                      <p
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          textAlign: "center)",
                          padding: "var(--spacing-8)",
                        }}
                      >
                        Complete more sessions to see financial impact
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="relationships">
              <RelationshipsPanel
                relationships={contacts.map((contact) => ({
                  characterId: contact.id,
                  characterName: contact.name,
                  trustLevel: contact.trust / 100,
                  trustTier:
                    contact.trust <= 20
                      ? "stranger"
                      : contact.trust <= 40
                        ? "acquaintance"
                        : contact.trust <= 60
                          ? "trusted"
                          : contact.trust <= 80
                            ? "close"
                            : "best_friend",
                  visitCount: 1, // TODO: Track visit count properly
                  wasRecommended: false, // TODO: Track recommendations
                  decayApplied: 0, // TODO: Track decay
                }))}
              />
            </TabsContent>

            <TabsContent value="progress">
              <ProgressChart
                sessionHistory={advisorState?.sessionHistory || []}
                totalSessions={totalSessions}
                totalClients={totalClients}
                advisorCoins={advisorState?.advisorCoins || 0}
                skillLevel={skillLevel}
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
