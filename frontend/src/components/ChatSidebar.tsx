import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import {
  Search,
  Pin,
  Star,
  TrendingUp,
  Briefcase,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Contact } from "./WhatsAppInterface";
import { useState, useEffect, useRef } from "react";
import logoImage from "figma:asset/28e39d27183eb9dbb848b6be8a7c7b00e841cd40.png";
import { PlayerStatsModal } from "./PlayerStatsModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { LevelUpModal } from "./LevelUpModal";
import { getPlayerAvatarUrl } from "../utils/avatarUtils";
import { useTranslation } from "../utils/translations";
import { FollowingEyes } from "./ui/FollowingEyes";
import { PortfolioImpactCard } from "./PortfolioImpactCard";
import { getSessionId } from "../services/sessionManager";

interface AdvisorState {
  advisorId: string;
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

interface ChatSidebarProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  showChat: boolean;
  bossContact: Contact;
  onLogoClick: () => void;
  advisorState?: AdvisorState;
  recentImpact?: {
    savings: number;
    debtReduction: number;
    characterName: string;
  };
  shouldAnimateImpact?: boolean;
  onOpenImpactDashboard?: () => void;
}

export function ChatSidebar({
  contacts,
  selectedContactId,
  onSelectContact,
  showChat,
  bossContact,
  onLogoClick,
  advisorState,
  recentImpact,
  shouldAnimateImpact,
  onOpenImpactDashboard,
}: ChatSidebarProps) {
  const t = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [playerName, setPlayerName] = useState("Player");
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState("");
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);

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
  }, []);

  // Calculate level from advisorState
  const skillLevel = advisorState?.skillLevel || 0;
  const level = Math.floor(skillLevel) + 1; // Convert 0-10 to 1-11
  // Level-up detection
  const previousLevelRef = useRef(level);
  useEffect(() => {
    if (level > previousLevelRef.current && previousLevelRef.current > 0) {
      // Level up detected!
      setNewLevel(level);
      setShowLevelUpModal(true);

      // Try to play sound if available
      try {
        const audio = new Audio("/sounds/level-up.mp3");
        audio.play().catch(() => {
          // Ignore if sound fails to play
        });
      } catch (e) {
        // Sound not available
      }
    }
    previousLevelRef.current = level;
  }, [level]);

  // Get advisor stats
  const reputation = advisorState?.reputation ?? 0;
  const totalSessions = advisorState?.totalSessions ?? 0;
  const lastReviewSession =
    advisorState?.sessionHistory?.[advisorState.sessionHistory.length - 1]
      ?.sessionNumber ?? 0;

  // Calculate boss review countdown
  const sessionsSinceLastReview = totalSessions - lastReviewSession;
  const sessionsUntilNext = 5 - sessionsSinceLastReview;
  const nextReviewIn = Math.max(0, Math.min(sessionsUntilNext, 5));

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={`w-full md:w-96 md:min-w-96 md:max-w-96 md:flex-shrink-0 md:border-r border-border flex flex-col h-screen ${
        showChat ? "hidden md:flex" : "flex"
      }`}
      style={{ backgroundColor: "var(--card)" }}
    >
      {/* Sidebar Header */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex justify-center mb-3">
          <img
            src={logoImage}
            alt="BROKE No more! Logo"
            className="cursor-pointer transition-transform duration-200 hover:scale-105"
            style={{
              height: "48px",
              width: "auto",
              objectFit: "contain",
            }}
            onClick={onLogoClick}
          />
        </div>

        {/* User Profile & Level System */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-3 cursor-pointer rounded-lg p-2 transition-all duration-200 hover:scale-[1.02] border flex-1"
              onClick={() => setShowStatsModal(true)}
              style={{
                backgroundColor: "transparent",
                borderColor: "transparent",
                borderRadius: "var(--radius-card)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div className="relative">
                <Avatar className="w-14 h-14">
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
                  className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full border-2"
                  style={{
                    backgroundColor: "var(--primary)",
                    borderColor: "var(--card)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {level}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col">
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {playerName}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        color: "var(--muted-foreground)",
                        fontWeight: "var(--font-weight-normal)",
                      }}
                    >
                      {t.chat.financialAdvisor}
                    </span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Reputation */}
                  <div className="flex items-center gap-1">
                    <Star
                      className="w-3 h-3"
                      style={{
                        color:
                          reputation >= 80
                            ? "var(--chart-1)"
                            : reputation >= 60
                              ? "var(--chart-4)"
                              : reputation >= 40
                                ? "var(--chart-3)"
                                : "var(--chart-2)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {reputation}
                    </span>
                  </div>

                  {/* Skill Level */}
                  <div className="flex items-center gap-1">
                    <TrendingUp
                      className="w-3 h-3"
                      style={{
                        color:
                          skillLevel >= 8
                            ? "var(--chart-1)"
                            : skillLevel >= 6
                              ? "var(--chart-4)"
                              : skillLevel >= 4
                                ? "var(--chart-3)"
                                : "var(--chart-2)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {skillLevel.toFixed(1)}
                    </span>
                  </div>

                  {/* Boss Review Countdown */}
                  <div className="flex items-center gap-1">
                    <Briefcase
                      className="w-3 h-3"
                      style={{ color: "var(--primary)" }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {nextReviewIn === 0 ? "Now!" : `${nextReviewIn}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chevron Button */}
            <button
              onClick={() => setIsProfileExpanded(!isProfileExpanded)}
              className="p-2 rounded transition-all duration-200 hover:bg-muted cursor-pointer"
              style={{
                color: "var(--muted-foreground)",
              }}
            >
              {isProfileExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Drawer */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: isProfileExpanded ? "500px" : "0",
            opacity: isProfileExpanded ? 1 : 0,
          }}
        >
          <div className="mt-2 space-y-3">
            {/* Portfolio Impact Card */}
            {advisorState && (
              <PortfolioImpactCard
                lifetimeSavings={advisorState.lifetimeSavingsGenerated}
                lifetimeDebtCleared={advisorState.lifetimeDebtCleared}
                sessionId={getSessionId() || undefined}
                recentImpact={recentImpact}
                animate={shouldAnimateImpact}
                onClick={onOpenImpactDashboard}
              />
            )}

            {/* Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="w-full px-3 py-2.5 flex items-center justify-center gap-2 rounded-lg border transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--muted)",
                borderColor: "var(--border)",
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary)";
                e.currentTarget.style.color = "var(--primary-foreground)";
                e.currentTarget.style.borderColor = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--muted)";
                e.currentTarget.style.color = "var(--foreground)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <Trophy className="w-4 h-4" />
              Global Leaderboard
            </button>
          </div>
        </div>

        {/* Stats Modal */}
        <PlayerStatsModal
          open={showStatsModal}
          onOpenChange={setShowStatsModal}
          contacts={contacts}
          advisorState={advisorState}
        />

        {/* Leaderboard Modal */}
        <LeaderboardModal
          open={showLeaderboardModal}
          onOpenChange={setShowLeaderboardModal}
          advisorId={advisorState?.advisorId}
        />

        {/* Level Up Celebration Modal */}
        <LevelUpModal
          open={showLevelUpModal}
          onOpenChange={setShowLevelUpModal}
          level={newLevel}
        />
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {/* Pinned Boss Contact */}
          <button
            key={bossContact.id}
            onClick={() => onSelectContact(bossContact.id)}
            className="w-full px-4 py-3 flex items-center gap-3 transition-colors"
            style={{
              backgroundColor:
                selectedContactId === bossContact.id
                  ? "var(--muted)"
                  : "transparent",
              minWidth: 0,
              borderLeft:
                bossContact.unreadCount > 0
                  ? "3px solid var(--primary)"
                  : "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (selectedContactId !== bossContact.id) {
                e.currentTarget.style.backgroundColor = "var(--muted)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedContactId !== bossContact.id) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <FollowingEyes
                eyeSize={6}
                pupilSize={3}
                eyeSpacing={0.7}
                eyeVerticalPosition={0.6}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={bossContact.avatarImage}
                      alt={bossContact.name}
                    />
                    <AvatarFallback
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        fontFamily: "Inter, sans-serif",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {bossContact.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {bossContact.online && (
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                      style={{
                        backgroundColor: "var(--chart-1)",
                        borderColor: "var(--card)",
                      }}
                    />
                  )}
                </div>
              </FollowingEyes>
            </div>

            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                width: 0,
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <Pin
                    className="w-3.5 h-3.5 rotate-45"
                    style={{
                      color: "var(--primary)",
                      fill: "var(--primary)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--card-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {bossContact.name}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-xs)",
                    color: "var(--muted-foreground)",
                    flexShrink: 0,
                  }}
                >
                  {bossContact.timestamp}
                </span>
              </div>

              {/* Player's Boss Tag */}
              <div className="mb-1">
                <span
                  className="inline-block px-2 py-0.5 rounded-full"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--primary-foreground)",
                    backgroundColor: "var(--primary)",
                  }}
                >
                  {t.chat.playersBoss}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  minWidth: 0,
                }}
              >
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color:
                      bossContact.unreadCount > 0
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    fontWeight:
                      bossContact.unreadCount > 0
                        ? "var(--font-weight-medium)"
                        : "var(--font-weight-normal)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {bossContact.lastMessage}
                </p>
                {bossContact.unreadCount > 0 && (
                  <div
                    className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full"
                    style={{
                      backgroundColor: "var(--primary)",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {bossContact.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>

          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors"
              style={{
                backgroundColor:
                  selectedContactId === contact.id
                    ? "var(--muted)"
                    : "transparent",
                minWidth: 0,
                borderLeft:
                  contact.status === "awaiting_response"
                    ? "3px solid var(--primary)"
                    : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (selectedContactId !== contact.id) {
                  e.currentTarget.style.backgroundColor = "var(--muted)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContactId !== contact.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div className="relative" style={{ flexShrink: 0 }}>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatarImage} alt={contact.name} />
                  <AvatarFallback
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                {contact.online && (
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: "var(--chart-1)",
                      borderColor: "var(--card)",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  width: 0,
                  textAlign: "left",
                  overflow: "hidden",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--card-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {contact.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-xs)",
                      color: "var(--muted-foreground)",
                      flexShrink: 0,
                    }}
                  >
                    {contact.timestamp}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "var(--text-sm)",
                      color:
                        contact.unreadCount > 0
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                      fontWeight:
                        contact.unreadCount > 0
                          ? "var(--font-weight-medium)"
                          : "var(--font-weight-normal)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {contact.lastMessage}
                  </p>
                  {contact.unreadCount > 0 && (
                    <div
                      className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full"
                      style={{
                        backgroundColor: "var(--primary)",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--primary-foreground)",
                        }}
                      >
                        {contact.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
