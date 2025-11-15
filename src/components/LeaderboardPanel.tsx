/**
 * Leaderboard UI Components
 * Display global rankings, challenges, and social features
 */

import React from "react";
import { Box, Text } from "ink";
import type {
  LeaderboardRanking,
  LeaderboardEntry,
  CommunityChallenge,
  ChallengeParticipation,
  CareerTier,
  AdvisorState,
} from "../mastra/types/game-types.ts";
import {
  formatRank,
  formatFinancialImpact,
  getTierDisplay,
  getProgressBar,
  calculatePercentile,
  getMotivationalMessage,
  getChallengeDifficultyColor,
} from "../mastra/game/leaderboard-calculator.ts";

interface LeaderboardPanelProps {
  leaderboard: LeaderboardRanking;
  currentAdvisorId: string;
  showSurrounding?: boolean;
}

export function LeaderboardPanel({
  leaderboard,
  currentAdvisorId,
  showSurrounding = false,
}: LeaderboardPanelProps) {
  const currentAdvisorEntry = leaderboard.entries.find(
    (e) => e.advisorId === currentAdvisorId
  );

  const entriesToShow = showSurrounding && currentAdvisorEntry
    ? getSurroundingEntries(leaderboard.entries, currentAdvisorId, 3)
    : leaderboard.entries.slice(0, 10);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">
        🏆 {getCategoryTitle(leaderboard.category)} Leaderboard
      </Text>
      <Text dimColor>
        {leaderboard.totalParticipants} participants • Updated{" "}
        {formatTimeAgo(leaderboard.lastUpdated)}
      </Text>
      <Box marginTop={1} />

      {currentAdvisorEntry && (
        <>
          <Box flexDirection="column" borderStyle="single" borderColor="yellow" padding={1}>
            <Text bold color="yellow">
              Your Rank: {formatRank(currentAdvisorEntry.globalRank || 0)}
            </Text>
            <Text dimColor>
              {getMotivationalMessage(
                currentAdvisorEntry.globalRank || 0,
                leaderboard.totalParticipants
              )}
            </Text>
            <Text dimColor>
              Top {calculatePercentile(currentAdvisorEntry.globalRank || 0, leaderboard.totalParticipants)}%
            </Text>
          </Box>
          <Box marginTop={1} />
        </>
      )}

      {entriesToShow.map((entry, index) => (
        <Box key={entry.advisorId}>
          <LeaderboardEntryRow
            entry={entry}
            category={leaderboard.category}
            isCurrentAdvisor={entry.advisorId === currentAdvisorId}
            displayRank={showSurrounding ? entry.globalRank : index + 1}
          />
        </Box>
      ))}
    </Box>
  );
}

interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  category: string;
  isCurrentAdvisor: boolean;
  displayRank?: number;
}

function LeaderboardEntryRow({
  entry,
  category,
  isCurrentAdvisor,
  displayRank,
}: LeaderboardEntryRowProps) {
  const rank = displayRank || entry.globalRank || 0;
  const tierDisplay = getTierDisplay(entry.careerTier);

  const primaryStat = getPrimaryStat(entry, category);

  return (
    <Box marginY={0}>
      <Box width={6}>
        <Text color={rank <= 3 ? "yellow" : "white"}>{formatRank(rank)}</Text>
      </Box>
      <Box width={3}>
        <Text>{tierDisplay.emoji}</Text>
      </Box>
      <Box width={25}>
        <Text bold={isCurrentAdvisor} color={isCurrentAdvisor ? "green" : "white"}>
          {entry.advisorName.substring(0, 23)}
          {isCurrentAdvisor && " (You)"}
        </Text>
      </Box>
      <Box width={20}>
        <Text color="cyan">{primaryStat}</Text>
      </Box>
    </Box>
  );
}

interface CareerProgressPanelProps {
  currentTier: CareerTier;
  nextTier: CareerTier | null;
  progress: {
    reputation: { current: number; required: number; percentage: number };
    skillLevel: { current: number; required: number; percentage: number };
    clients: { current: number; required: number; percentage: number };
    sessions: { current: number; required: number; percentage: number };
    achievements: { current: number; required: number; percentage: number };
    savingsImpact: { current: number; required: number; percentage: number };
  };
  overallProgress: number;
}

export function CareerProgressPanel({
  currentTier,
  nextTier,
  progress,
  overallProgress,
}: CareerProgressPanelProps) {
  const tierDisplay = getTierDisplay(currentTier.tierLevel);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      <Text bold color="magenta">
        {tierDisplay.emoji} Career Progress
      </Text>
      <Text>
        Current Tier: <Text bold>{currentTier.tierName}</Text>
      </Text>
      <Box marginTop={1} />

      {nextTier ? (
        <>
          <Text dimColor>
            Next: {getTierDisplay(nextTier.tierLevel).emoji} {nextTier.tierName}
          </Text>
          <Box marginTop={1} />

          <Text dimColor>Overall Progress:</Text>
          <Box>
            <Text>{getProgressBar(overallProgress, 100, 30)} </Text>
            <Text color="cyan">{overallProgress.toFixed(0)}%</Text>
          </Box>
          <Box marginTop={1} />

          <Text dimColor>Requirements:</Text>
          <ProgressRequirement
            label="Reputation"
            current={progress.reputation.current}
            required={progress.reputation.required}
            percentage={progress.reputation.percentage}
          />
          <ProgressRequirement
            label="Skill Level"
            current={progress.skillLevel.current}
            required={progress.skillLevel.required}
            percentage={progress.skillLevel.percentage}
          />
          <ProgressRequirement
            label="Clients"
            current={progress.clients.current}
            required={progress.clients.required}
            percentage={progress.clients.percentage}
          />
          <ProgressRequirement
            label="Sessions"
            current={progress.sessions.current}
            required={progress.sessions.required}
            percentage={progress.sessions.percentage}
          />
          <ProgressRequirement
            label="Achievements"
            current={progress.achievements.current}
            required={progress.achievements.required}
            percentage={progress.achievements.percentage}
          />
          <ProgressRequirement
            label="Impact"
            current={Math.round(progress.savingsImpact.current)}
            required={Math.round(progress.savingsImpact.required)}
            percentage={progress.savingsImpact.percentage}
            prefix="€"
          />
        </>
      ) : (
        <Text bold color="yellow">
          🎉 Maximum tier reached!
        </Text>
      )}
    </Box>
  );
}

interface ProgressRequirementProps {
  label: string;
  current: number;
  required: number;
  percentage: number;
  prefix?: string;
}

function ProgressRequirement({
  label,
  current,
  required,
  percentage,
  prefix = "",
}: ProgressRequirementProps) {
  const isComplete = percentage >= 100;
  const color = isComplete ? "green" : "yellow";

  return (
    <Box flexDirection="column" marginY={0}>
      <Box>
        <Box width={15}>
          <Text dimColor>{label}:</Text>
        </Box>
        <Text color={color}>
          {prefix}
          {Math.round(current)} / {prefix}
          {Math.round(required)}
        </Text>
      </Box>
      <Box>
        <Text>{getProgressBar(percentage, 100, 20)} </Text>
        <Text color={color}>{percentage.toFixed(0)}%</Text>
      </Box>
    </Box>
  );
}

interface ChallengesPanelProps {
  challenges: Array<{
    challenge: CommunityChallenge;
    participation: ChallengeParticipation | null;
    progressPercentage: number;
    isCompleted: boolean;
    timeRemaining: string;
  }>;
}

export function ChallengesPanel({ challenges }: ChallengesPanelProps) {
  const activeChallenges = challenges.filter((c) => !c.isCompleted);
  const completedChallenges = challenges.filter((c) => c.isCompleted);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text bold color="yellow">
        🎯 Community Challenges
      </Text>
      <Box marginTop={1} />

      {activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <Text dimColor>No active challenges</Text>
      )}

      {activeChallenges.map((item) => (
        <Box key={item.challenge.id}>
          <ChallengeRow {...item} />
        </Box>
      ))}

      {completedChallenges.length > 0 && (
        <>
          <Box marginTop={1} />
          <Text dimColor>✅ Completed:</Text>
          {completedChallenges.slice(0, 3).map((item) => (
            <Box key={item.challenge.id} marginY={0}>
              <Text color="green">
                ✓ {item.challenge.challengeName} - {item.challenge.badgeEmoji}
              </Text>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}

interface ChallengeRowProps {
  challenge: CommunityChallenge;
  participation: ChallengeParticipation | null;
  progressPercentage: number;
  isCompleted: boolean;
  timeRemaining: string;
}

function ChallengeRow({
  challenge,
  participation,
  progressPercentage,
  timeRemaining,
}: ChallengeRowProps) {
  const currentProgress = participation?.currentProgress || 0;

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text>
          {challenge.badgeEmoji} <Text bold>{challenge.challengeName}</Text>
        </Text>
      </Box>
      <Box>
        <Text dimColor>{challenge.challengeDescription}</Text>
      </Box>
      <Box marginTop={0}>
        <Text>{getProgressBar(progressPercentage, 100, 25)} </Text>
        <Text color="cyan">{progressPercentage.toFixed(0)}%</Text>
      </Box>
      <Box>
        <Box width={30}>
          <Text dimColor>
            {Math.round(currentProgress)} / {challenge.targetValue}
          </Text>
        </Box>
        <Box width={15}>
          <Text dimColor>⏱ {timeRemaining}</Text>
        </Box>
        <Text color="yellow">💰 {challenge.coinReward} coins</Text>
      </Box>
    </Box>
  );
}

// Helper functions

function getCategoryTitle(category: string): string {
  const titles: Record<string, string> = {
    global: "Global Rankings",
    reputation: "Reputation",
    impact: "Financial Impact",
    expertise: "Expertise",
    coins: "Advisor Coins",
    achievements: "Achievements",
  };
  return titles[category] || "Leaderboard";
}

function getPrimaryStat(entry: LeaderboardEntry, category: string): string {
  switch (category) {
    case "reputation":
      return `⭐ ${entry.reputation}`;
    case "impact":
      return formatFinancialImpact(
        entry.lifetimeSavingsGenerated + entry.lifetimeDebtCleared
      );
    case "expertise":
      return `📚 Skill ${entry.skillLevel} | Avg ${entry.averageAdviceScore.toFixed(1)}`;
    case "coins":
      return `💰 ${entry.advisorCoins}`;
    case "achievements":
      return `🏆 ${entry.achievementCount}`;
    default:
      return `⭐ ${entry.reputation} | 📚 ${entry.skillLevel}`;
  }
}

function getSurroundingEntries(
  entries: LeaderboardEntry[],
  advisorId: string,
  range: number
): LeaderboardEntry[] {
  const index = entries.findIndex((e) => e.advisorId === advisorId);
  if (index === -1) return entries.slice(0, 10);

  const start = Math.max(0, index - range);
  const end = Math.min(entries.length, index + range + 1);

  return entries.slice(start, end);
}

function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
